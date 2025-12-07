"""
AI Agent Tools
Tools available to the farming AI assistant for:
- Knowledge base search
- Weather information
- Farmer platform data access (products, orders, payouts)
- Planting calculations
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from database import get_db
from models import (
    User, Product, Order, OrderStatus, EscrowTransaction, EscrowStatus,
    ProductStatus, Review
)
from modules.agent.knowledge_service import KnowledgeService
from integrations.weather import get_weather_forecast

logger = logging.getLogger(__name__)


# ==================== TOOL DEFINITIONS FOR LLM ====================

AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_knowledge",
            "description": "Search the agricultural knowledge base for information about crops, farming practices, pest control, post-harvest handling, soil management, and more. Use this when the farmer asks questions about how to grow crops, handle pests, store produce, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query describing what information is needed"
                    },
                    "crop": {
                        "type": "string",
                        "description": "Optional: specific crop to filter results (e.g., 'maize', 'tomato')"
                    },
                    "topic": {
                        "type": "string",
                        "description": "Optional: topic to filter (planting, harvesting, pest_control, storage, fertilization)",
                        "enum": ["planting", "harvesting", "pest_control", "disease_control", "fertilization", "storage", "soil_preparation", "weed_control"]
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get weather forecast for a location in Ghana. Use this when the farmer asks about weather, planting conditions, or needs to plan farming activities based on weather.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City or town name in Ghana (e.g., 'Kumasi', 'Tamale', 'Accra')"
                    },
                    "days": {
                        "type": "integer",
                        "description": "Number of days for forecast (1-7)",
                        "default": 3
                    }
                },
                "required": ["location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_farmer_products",
            "description": "Get the farmer's current product listings on the platform. Use this when the farmer asks about their products, listings, or inventory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "description": "Filter by product status",
                        "enum": ["all", "available", "sold", "reserved"]
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_farmer_orders",
            "description": "Get the farmer's orders (sales). Use this when the farmer asks about their orders, sales, or customer purchases.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "description": "Filter by order status",
                        "enum": ["all", "pending", "paid", "shipped", "delivered", "completed"]
                    },
                    "days": {
                        "type": "integer",
                        "description": "Get orders from the last N days",
                        "default": 30
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_farmer_earnings",
            "description": "Get the farmer's earnings and payout information. Use this when the farmer asks about their income, payments, payouts, or escrow balance.",
            "parameters": {
                "type": "object",
                "properties": {
                    "period": {
                        "type": "string",
                        "description": "Time period for earnings",
                        "enum": ["week", "month", "year", "all"],
                        "default": "month"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_buyer_enquiries",
            "description": "Get messages/enquiries from buyers about the farmer's products. Use this when the farmer asks about customer messages, enquiries, or conversations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "unread_only": {
                        "type": "boolean",
                        "description": "Only get unread messages",
                        "default": False
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_planting_date",
            "description": "Calculate the optimal planting date to achieve harvest by a target date. Use this when the farmer wants to plan planting for a specific harvest time.",
            "parameters": {
                "type": "object",
                "properties": {
                    "crop": {
                        "type": "string",
                        "description": "Crop name (e.g., 'maize', 'tomato')"
                    },
                    "target_harvest_date": {
                        "type": "string",
                        "description": "Target harvest date in YYYY-MM-DD format"
                    },
                    "variety": {
                        "type": "string",
                        "description": "Optional: specific variety (e.g., 'Obatanpa' for maize)"
                    }
                },
                "required": ["crop", "target_harvest_date"]
            }
        }
    }
]


# ==================== TOOL IMPLEMENTATIONS ====================

class AgentTools:
    """Implementation of agent tools"""

    def __init__(self, farmer_id: int, db: Session):
        """
        Initialize tools with farmer context

        Args:
            farmer_id: ID of the farmer using the agent
            db: Database session
        """
        self.farmer_id = farmer_id
        self.db = db

    def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a tool by name with given arguments

        Args:
            tool_name: Name of the tool to execute
            arguments: Tool arguments

        Returns:
            Tool result
        """
        tool_map = {
            "search_knowledge": self.search_knowledge,
            "get_weather": self.get_weather,
            "get_farmer_products": self.get_farmer_products,
            "get_farmer_orders": self.get_farmer_orders,
            "get_farmer_earnings": self.get_farmer_earnings,
            "get_buyer_enquiries": self.get_buyer_enquiries,
            "calculate_planting_date": self.calculate_planting_date
        }

        if tool_name not in tool_map:
            return {"error": f"Unknown tool: {tool_name}"}

        try:
            result = tool_map[tool_name](**arguments)
            return result
        except Exception as e:
            logger.error(f"Tool {tool_name} execution failed: {e}", exc_info=True)
            return {"error": str(e)}

    def search_knowledge(
        self,
        query: str,
        crop: Optional[str] = None,
        topic: Optional[str] = None
    ) -> Dict[str, Any]:
        """Search agricultural knowledge base"""
        try:
            # Convert topic to list if provided
            topics = [topic] if topic else None
            crops = [crop] if crop else None

            results = KnowledgeService.hybrid_search(
                query=query,
                db=self.db,
                crops=crops,
                topics=topics,
                limit=5
            )

            if not results:
                return {
                    "found": False,
                    "message": "No relevant information found in the knowledge base."
                }

            # Format results for the LLM
            formatted_results = []
            for r in results:
                formatted_results.append({
                    "content": r["content"],
                    "topic": r.get("section_title") or ", ".join(r.get("topics", [])),
                    "source_type": r["document_type"],
                    "relevance_score": round(r["combined_score"], 2)
                })

            return {
                "found": True,
                "results": formatted_results,
                "total_results": len(formatted_results)
            }

        except Exception as e:
            logger.error(f"Knowledge search failed: {e}")
            return {"error": str(e)}

    def get_weather(
        self,
        location: str,
        days: int = 3
    ) -> Dict[str, Any]:
        """Get weather forecast for a location"""
        try:
            # Append Ghana if not already included
            if "ghana" not in location.lower():
                location = f"{location}, Ghana"

            forecast = get_weather_forecast(location, days)
            return forecast

        except Exception as e:
            logger.error(f"Weather fetch failed: {e}")
            return {"error": f"Could not get weather for {location}: {str(e)}"}

    def get_farmer_products(
        self,
        status: str = "all"
    ) -> Dict[str, Any]:
        """Get farmer's product listings"""
        try:
            query = self.db.query(Product).filter(Product.seller_id == self.farmer_id)

            if status != "all":
                status_map = {
                    "available": ProductStatus.AVAILABLE,
                    "sold": ProductStatus.SOLD,
                    "reserved": ProductStatus.RESERVED
                }
                if status in status_map:
                    query = query.filter(Product.status == status_map[status])

            products = query.order_by(Product.created_at.desc()).limit(20).all()

            if not products:
                return {
                    "total_products": 0,
                    "message": "You don't have any products listed yet."
                }

            product_list = []
            for p in products:
                product_list.append({
                    "id": p.id,
                    "name": p.product_name,
                    "category": p.category.value if p.category else None,
                    "price": float(p.price_per_unit),
                    "unit": p.unit_of_measure.value if p.unit_of_measure else None,
                    "quantity_available": float(p.quantity_available),
                    "status": p.status.value,
                    "views": p.view_count or 0,
                    "created": p.created_at.strftime("%Y-%m-%d")
                })

            # Summary stats
            total_value = sum(p["price"] * p["quantity_available"] for p in product_list)
            available_count = len([p for p in product_list if p["status"] == "AVAILABLE"])

            return {
                "total_products": len(product_list),
                "available_products": available_count,
                "total_inventory_value": round(total_value, 2),
                "products": product_list
            }

        except Exception as e:
            logger.error(f"Get farmer products failed: {e}")
            return {"error": str(e)}

    def get_farmer_orders(
        self,
        status: str = "all",
        days: int = 30
    ) -> Dict[str, Any]:
        """Get farmer's orders (sales)"""
        try:
            # Get products owned by farmer
            farmer_products = self.db.query(Product.id).filter(
                Product.seller_id == self.farmer_id
            ).subquery()

            # Get orders for farmer's products
            query = self.db.query(Order).filter(
                Order.product_id.in_(farmer_products)
            )

            # Filter by date
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            query = query.filter(Order.created_at >= cutoff_date)

            # Filter by status
            if status != "all":
                status_map = {
                    "pending": OrderStatus.PENDING,
                    "paid": OrderStatus.PAID,
                    "shipped": OrderStatus.SHIPPED,
                    "delivered": OrderStatus.DELIVERED,
                    "completed": OrderStatus.COMPLETED
                }
                if status in status_map:
                    query = query.filter(Order.status == status_map[status])

            orders = query.order_by(Order.created_at.desc()).limit(50).all()

            if not orders:
                return {
                    "total_orders": 0,
                    "message": f"No orders found in the last {days} days."
                }

            order_list = []
            for o in orders:
                order_list.append({
                    "order_number": o.order_number,
                    "product": o.product.product_name if o.product else "Unknown",
                    "quantity": float(o.quantity),
                    "total_amount": float(o.total_amount),
                    "status": o.status.value,
                    "buyer": o.buyer.full_name if o.buyer else "Unknown",
                    "created": o.created_at.strftime("%Y-%m-%d"),
                    "delivery_method": o.delivery_method
                })

            # Summary stats
            total_sales = sum(o["total_amount"] for o in order_list)
            pending_orders = len([o for o in order_list if o["status"] in ["PENDING", "PAID"]])
            completed_orders = len([o for o in order_list if o["status"] == "COMPLETED"])

            return {
                "total_orders": len(order_list),
                "total_sales_value": round(total_sales, 2),
                "pending_orders": pending_orders,
                "completed_orders": completed_orders,
                "period_days": days,
                "orders": order_list[:10]  # Return only first 10 for brevity
            }

        except Exception as e:
            logger.error(f"Get farmer orders failed: {e}")
            return {"error": str(e)}

    def get_farmer_earnings(
        self,
        period: str = "month"
    ) -> Dict[str, Any]:
        """Get farmer's earnings and payout information"""
        try:
            # Determine date range
            now = datetime.utcnow()
            if period == "week":
                start_date = now - timedelta(days=7)
            elif period == "month":
                start_date = now - timedelta(days=30)
            elif period == "year":
                start_date = now - timedelta(days=365)
            else:
                start_date = None

            # Get farmer's products
            farmer_products = self.db.query(Product.id).filter(
                Product.seller_id == self.farmer_id
            ).subquery()

            # Get orders for farmer's products
            orders_query = self.db.query(Order.id).filter(
                Order.product_id.in_(farmer_products)
            )

            # Get escrow transactions
            escrow_query = self.db.query(EscrowTransaction).filter(
                EscrowTransaction.order_id.in_(orders_query)
            )

            if start_date:
                escrow_query = escrow_query.filter(EscrowTransaction.created_at >= start_date)

            escrows = escrow_query.all()

            if not escrows:
                return {
                    "period": period,
                    "total_earnings": 0,
                    "message": f"No earnings found for this {period}."
                }

            # Calculate totals
            total_earnings = Decimal('0')
            pending_payout = Decimal('0')
            released_payout = Decimal('0')
            platform_fees = Decimal('0')

            for e in escrows:
                if e.status == EscrowStatus.RELEASED:
                    released_payout += e.seller_payout or Decimal('0')
                elif e.status == EscrowStatus.HELD:
                    pending_payout += e.seller_payout or Decimal('0')

                platform_fees += e.platform_fee or Decimal('0')
                total_earnings += e.amount or Decimal('0')

            return {
                "period": period,
                "total_transaction_value": float(total_earnings),
                "released_to_you": float(released_payout),
                "pending_release": float(pending_payout),
                "platform_fees_paid": float(platform_fees),
                "total_transactions": len(escrows),
                "currency": "GHS"
            }

        except Exception as e:
            logger.error(f"Get farmer earnings failed: {e}")
            return {"error": str(e)}

    def get_buyer_enquiries(
        self,
        unread_only: bool = False
    ) -> Dict[str, Any]:
        """Get buyer enquiries/messages"""
        try:
            from database import get_mongo_db

            mongo_db = get_mongo_db()
            conversations = mongo_db['conversations']

            # Get conversations where farmer is the seller
            query = {"seller_id": self.farmer_id}

            convs = conversations.find(query).sort("last_message_at", -1).limit(10)
            conv_list = list(convs)

            if not conv_list:
                return {
                    "total_enquiries": 0,
                    "message": "No buyer enquiries yet."
                }

            enquiries = []
            total_unread = 0

            for c in conv_list:
                unread = c.get("unread_count_seller", 0)
                total_unread += unread

                if unread_only and unread == 0:
                    continue

                enquiries.append({
                    "buyer_id": c["buyer_id"],
                    "last_message": c.get("last_message", "")[:100],
                    "last_message_at": c.get("last_message_at").strftime("%Y-%m-%d %H:%M") if c.get("last_message_at") else None,
                    "unread_count": unread,
                    "product_id": c.get("product_id")
                })

            return {
                "total_enquiries": len(enquiries),
                "total_unread": total_unread,
                "enquiries": enquiries
            }

        except Exception as e:
            logger.error(f"Get buyer enquiries failed: {e}")
            return {"error": str(e)}

    def calculate_planting_date(
        self,
        crop: str,
        target_harvest_date: str,
        variety: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculate optimal planting date for target harvest"""
        try:
            # Crop growth periods (days to maturity)
            growth_periods = {
                "maize": {"min": 90, "max": 120, "varieties": {"obatanpa": 110, "abontem": 90, "omankwa": 110}},
                "tomato": {"min": 60, "max": 90, "varieties": {}},
                "pepper": {"min": 90, "max": 120, "varieties": {}},
                "onion": {"min": 90, "max": 150, "varieties": {}},
                "cabbage": {"min": 70, "max": 100, "varieties": {}},
                "lettuce": {"min": 45, "max": 60, "varieties": {}},
                "cucumber": {"min": 50, "max": 70, "varieties": {}},
                "groundnut": {"min": 90, "max": 120, "varieties": {}},
                "cowpea": {"min": 60, "max": 90, "varieties": {}},
                "rice": {"min": 100, "max": 150, "varieties": {}},
                "cassava": {"min": 270, "max": 365, "varieties": {}},
                "yam": {"min": 240, "max": 300, "varieties": {}}
            }

            crop_lower = crop.lower()
            if crop_lower not in growth_periods:
                return {
                    "error": f"Growth period data not available for {crop}. Common crops: maize, tomato, pepper, onion, cabbage, rice."
                }

            # Parse target date
            try:
                harvest_date = datetime.strptime(target_harvest_date, "%Y-%m-%d")
            except ValueError:
                return {"error": "Invalid date format. Use YYYY-MM-DD"}

            # Get growth period
            crop_data = growth_periods[crop_lower]
            if variety and variety.lower() in crop_data["varieties"]:
                growth_days = crop_data["varieties"][variety.lower()]
            else:
                growth_days = (crop_data["min"] + crop_data["max"]) // 2

            # Calculate planting date
            planting_date = harvest_date - timedelta(days=growth_days)
            days_until_planting = (planting_date - datetime.now()).days

            # Determine Ghana planting season
            planting_month = planting_date.month
            if planting_month in [3, 4, 5]:
                season = "Major Season (March-May)"
                recommendation = "Good timing for major season planting"
            elif planting_month in [7, 8, 9]:
                season = "Minor Season (July-September)"
                recommendation = "Good timing for minor season planting"
            else:
                season = "Off-season"
                recommendation = "Consider irrigation as rainfall may be limited"

            return {
                "crop": crop.title(),
                "variety": variety.title() if variety else "Standard",
                "target_harvest_date": target_harvest_date,
                "recommended_planting_date": planting_date.strftime("%Y-%m-%d"),
                "growth_period_days": growth_days,
                "days_until_planting": days_until_planting,
                "planting_season": season,
                "recommendation": recommendation
            }

        except Exception as e:
            logger.error(f"Calculate planting date failed: {e}")
            return {"error": str(e)}