"""
Seed database with test data for development
"""
from sqlalchemy.orm import Session
from models import (
    User, UserType, AccountStatus, Product, ProductCategory,
    ProductStatus, UnitOfMeasure, SystemConfiguration, CropKnowledge
)
from utils.security import hash_password
from datetime import datetime, timedelta
from decimal import Decimal
import logging
import shutil
import os

logger = logging.getLogger(__name__)

# Product images mapping (source files in frontend/productimages/)
PRODUCT_IMAGES = {
    "tomato": "tomato.jfif",
    "pepper": "pepper.jfif",
    "cabbage": "cabbage.jfif",
    "okro": "okro.jfif",
    "onion": "onion.jfif",
    "carrot": "carrot.jfif",
    "squash": "squash.jfif",
    "banana": "banana.jfif",
    "mango": "mango.jfif",
    "orange": "orange.jfif",
    "plantain": "plantain.jfif",
    "maize": "white maize.jfif",
    "yam": "yam.jfif",
    "cassava": "cassava.jfif",
    "sweet_potato": "sweet potato.jfif",
    "cashew": "cashew.jfif",
}


def copy_product_images():
    """Copy product images from frontend to uploads folder"""
    source_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "productimages")
    dest_dir = os.path.join(os.path.dirname(__file__), "uploads", "products")

    # Create destination directory if it doesn't exist
    os.makedirs(dest_dir, exist_ok=True)

    copied_images = {}
    for key, filename in PRODUCT_IMAGES.items():
        source_path = os.path.join(source_dir, filename)
        if os.path.exists(source_path):
            dest_filename = filename.replace(" ", "_").lower()
            dest_path = os.path.join(dest_dir, dest_filename)
            shutil.copy2(source_path, dest_path)
            # Return URL path for database
            copied_images[key] = f"/uploads/products/{dest_filename}"
            logger.info(f"  Copied {filename} -> {dest_filename}")
        else:
            logger.warning(f"  Image not found: {source_path}")
            copied_images[key] = None

    return copied_images


def seed_users(db: Session):
    """Create test users"""
    logger.info("Seeding users...")

    # Admin user
    admin = db.query(User).filter(User.email == "admin@smartagro.com").first()
    if not admin:
        admin = User(
            email="admin@smartagro.com",
            phone_number="+233200000001",
            password_hash=hash_password("Admin123!"),
            full_name="Admin User",
            user_type=UserType.ADMIN,
            email_verified=True,
            phone_verified=True,
            is_verified=True,
            account_status=AccountStatus.ACTIVE,
            region="Greater Accra",
            district="Accra Metro",
            can_buy=False
        )
        db.add(admin)
        logger.info("  Created Admin user")
    else:
        logger.info("  Admin user already exists")

    # Farmer 1 - Kwame (Vegetables specialist in Techiman)
    farmer1 = db.query(User).filter(User.email == "kwame@example.com").first()
    if not farmer1:
        farmer1 = User(
            email="kwame@example.com",
            phone_number="+233241111111",
            password_hash=hash_password("Farmer123!"),
            full_name="Opanyin Kwame Mensah",
            user_type=UserType.FARMER,
            email_verified=True,
            phone_verified=True,
            is_verified=True,
            account_status=AccountStatus.ACTIVE,
            region="Bono East",
            district="Techiman Municipal",
            town_city="Techiman",
            farm_name="Kwame's Fresh Farm",
            farm_size_acres=Decimal("5.5"),
            years_farming=15,
            average_rating=Decimal("4.8"),
            total_reviews=23,
            total_sales=156,
            bank_name="GCB Bank",
            bank_code="040",
            account_number="1234567890",
            account_name="Kwame Mensah",
            can_buy=True,
            current_mode="FARMER"
        )
        db.add(farmer1)
        logger.info("  Created Farmer 1")
    else:
        logger.info("  Farmer 1 already exists")

    # Farmer 2 - Ama (Tubers and Grains in Kumasi)
    farmer2 = db.query(User).filter(User.email == "ama@example.com").first()
    if not farmer2:
        farmer2 = User(
            email="ama@example.com",
            phone_number="+233242222222",
            password_hash=hash_password("Farmer123!"),
            full_name="Maame Ama Serwaa",
            user_type=UserType.FARMER,
            email_verified=True,
            phone_verified=True,
            is_verified=True,
            account_status=AccountStatus.ACTIVE,
            region="Ashanti",
            district="Kumasi Metropolitan",
            town_city="Kumasi",
            farm_name="Serwaa's Organic Farm",
            farm_size_acres=Decimal("8.0"),
            years_farming=10,
            average_rating=Decimal("4.5"),
            total_reviews=18,
            total_sales=89,
            bank_name="Ecobank",
            bank_code="130",
            account_number="0987654321",
            account_name="Ama Serwaa",
            can_buy=True,
            current_mode="FARMER"
        )
        db.add(farmer2)
        logger.info("  Created Farmer 2")
    else:
        logger.info("  Farmer 2 already exists")

    # Farmer 3 - Abena (Fruits specialist in Eastern Region) - No email (phone only)
    farmer3 = db.query(User).filter(User.phone_number == "+233244444444").first()
    if not farmer3:
        farmer3 = User(
            email=None,  # No email - demonstrates optional email for farmers
            phone_number="+233244444444",
            password_hash=hash_password("Farmer123!"),
            full_name="Abena Pokua",
            user_type=UserType.FARMER,
            email_verified=False,
            phone_verified=True,
            is_verified=True,
            account_status=AccountStatus.ACTIVE,
            region="Eastern",
            district="Kwahu South",
            town_city="Nkawkaw",
            farm_name="Pokua Fruits & More",
            farm_size_acres=Decimal("3.5"),
            years_farming=7,
            average_rating=Decimal("4.7"),
            total_reviews=12,
            total_sales=67,
            bank_name="MTN Mobile Money",
            bank_code="MTN",
            account_number="0244444444",
            account_name="Abena Pokua",
            can_buy=True,
            current_mode="FARMER"
        )
        db.add(farmer3)
        logger.info("  Created Farmer 3")
    else:
        logger.info("  Farmer 3 already exists")

    # Farmer 4 - Yaw (Mixed farming in Northern Region)
    farmer4 = db.query(User).filter(User.email == "yaw@example.com").first()
    if not farmer4:
        farmer4 = User(
            email="yaw@example.com",
            phone_number="+233245555555",
            password_hash=hash_password("Farmer123!"),
            full_name="Yaw Boateng",
            user_type=UserType.FARMER,
            email_verified=True,
            phone_verified=True,
            is_verified=True,
            account_status=AccountStatus.ACTIVE,
            region="Northern",
            district="Tamale Metropolitan",
            town_city="Tamale",
            farm_name="Boateng Agro Farm",
            farm_size_acres=Decimal("12.0"),
            years_farming=20,
            average_rating=Decimal("4.6"),
            total_reviews=31,
            total_sales=203,
            bank_name="ADB Bank",
            bank_code="080",
            account_number="5555555555",
            account_name="Yaw Boateng",
            can_buy=True,
            current_mode="FARMER"
        )
        db.add(farmer4)
        logger.info("  Created Farmer 4")
    else:
        logger.info("  Farmer 4 already exists")

    # Buyer 1 - Esi (Restaurant owner in Accra)
    buyer = db.query(User).filter(User.email == "esi@example.com").first()
    if not buyer:
        buyer = User(
            email="esi@example.com",
            phone_number="+233243333333",
            password_hash=hash_password("Buyer123!"),
            full_name="Auntie Esi",
            user_type=UserType.BUYER,
            email_verified=True,
            phone_verified=True,
            is_verified=True,
            account_status=AccountStatus.ACTIVE,
            region="Greater Accra",
            district="Accra Metropolitan",
            town_city="Accra",
            wallet_balance=Decimal("500.00"),
            can_buy=True
        )
        db.add(buyer)
        logger.info("  Created Buyer 1")
    else:
        logger.info("  Buyer 1 already exists")

    # Buyer 2 - Kofi (Market trader in Tema)
    buyer2 = db.query(User).filter(User.email == "kofi@example.com").first()
    if not buyer2:
        buyer2 = User(
            email="kofi@example.com",
            phone_number="+233246666666",
            password_hash=hash_password("Buyer123!"),
            full_name="Kofi Asante",
            user_type=UserType.BUYER,
            email_verified=True,
            phone_verified=True,
            is_verified=True,
            account_status=AccountStatus.ACTIVE,
            region="Greater Accra",
            district="Tema Metropolitan",
            town_city="Tema",
            wallet_balance=Decimal("250.00"),
            can_buy=True
        )
        db.add(buyer2)
        logger.info("  Created Buyer 2")
    else:
        logger.info("  Buyer 2 already exists")

    db.commit()
    logger.info("✅ Users seeded")
    return {
        "farmer1": farmer1,
        "farmer2": farmer2,
        "farmer3": farmer3,
        "farmer4": farmer4,
        "buyer": buyer,
        "buyer2": buyer2,
        "admin": admin
    }


def seed_products(db: Session, users: dict, images: dict):
    """Create test products with images"""
    logger.info("Seeding products...")

    farmer1 = users["farmer1"]
    farmer2 = users["farmer2"]
    farmer3 = users["farmer3"]
    farmer4 = users["farmer4"]

    products_data = [
        # ========== FARMER 1 (Kwame) - Vegetables ==========
        {
            "seller_id": farmer1.id,
            "product_name": "Fresh Tomatoes",
            "category": ProductCategory.VEGETABLES,
            "description": "Fresh, organic tomatoes harvested daily from our farm in Techiman. Perfect for stews, salads, and jollof rice. These tomatoes are grown without pesticides and are hand-picked for quality.",
            "quantity_available": Decimal("150.00"),
            "unit_of_measure": UnitOfMeasure.KG,
            "price_per_unit": Decimal("8.50"),
            "minimum_order_quantity": Decimal("5.00"),
            "harvest_date": datetime.now().date() - timedelta(days=1),
            "expected_shelf_life_days": 7,
            "farm_location": "Techiman Valley",
            "region": "Bono East",
            "district": "Techiman Municipal",
            "is_organic": True,
            "status": ProductStatus.AVAILABLE,
            "is_featured": True,
            "primary_image_url": images.get("tomato"),
            "view_count": 234,
            "order_count": 45,
        },
        {
            "seller_id": farmer1.id,
            "product_name": "Green Pepper",
            "category": ProductCategory.VEGETABLES,
            "description": "Crisp, fresh green peppers. Excellent for cooking, salads, and garnishing. These peppers add a mild, sweet flavor to any dish.",
            "quantity_available": Decimal("80.00"),
            "unit_of_measure": UnitOfMeasure.KG,
            "price_per_unit": Decimal("12.00"),
            "minimum_order_quantity": Decimal("3.00"),
            "harvest_date": datetime.now().date() - timedelta(days=2),
            "expected_shelf_life_days": 10,
            "farm_location": "Techiman Valley",
            "region": "Bono East",
            "district": "Techiman Municipal",
            "is_organic": True,
            "status": ProductStatus.AVAILABLE,
            "is_featured": False,
            "primary_image_url": images.get("pepper"),
            "view_count": 156,
            "order_count": 28,
        },
        {
            "seller_id": farmer1.id,
            "product_name": "Fresh Cabbage",
            "category": ProductCategory.VEGETABLES,
            "description": "Large, fresh cabbage heads. Perfect for coleslaw, stir-fry, or traditional Ghanaian dishes. Grown in rich soil for maximum crunch and flavor.",
            "quantity_available": Decimal("60.00"),
            "unit_of_measure": UnitOfMeasure.PIECES,
            "price_per_unit": Decimal("6.00"),
            "minimum_order_quantity": Decimal("5.00"),
            "harvest_date": datetime.now().date() - timedelta(days=1),
            "expected_shelf_life_days": 14,
            "farm_location": "Techiman Valley",
            "region": "Bono East",
            "district": "Techiman Municipal",
            "is_organic": False,
            "status": ProductStatus.AVAILABLE,
            "is_featured": False,
            "primary_image_url": images.get("cabbage"),
            "view_count": 89,
            "order_count": 15,
        },
        {
            "seller_id": farmer1.id,
            "product_name": "Fresh Okro",
            "category": ProductCategory.VEGETABLES,
            "description": "Tender, fresh okro perfect for soups and stews. Hand-picked at the right size for optimal texture. Great for making traditional okro soup or palava sauce.",
            "quantity_available": Decimal("45.00"),
            "unit_of_measure": UnitOfMeasure.KG,
            "price_per_unit": Decimal("15.00"),
            "minimum_order_quantity": Decimal("2.00"),
            "harvest_date": datetime.now().date(),
            "expected_shelf_life_days": 5,
            "farm_location": "Techiman Valley",
            "region": "Bono East",
            "district": "Techiman Municipal",
            "is_organic": True,
            "status": ProductStatus.AVAILABLE,
            "is_featured": True,
            "primary_image_url": images.get("okro"),
            "view_count": 178,
            "order_count": 38,
        },

        # ========== FARMER 2 (Ama) - Tubers & Grains ==========
        {
            "seller_id": farmer2.id,
            "product_name": "Yellow Yam",
            "category": ProductCategory.TUBERS,
            "description": "Premium yellow yams from Ashanti region. Perfect for fufu, boiling, or frying. These yams are known for their smooth texture and rich flavor.",
            "quantity_available": Decimal("200.00"),
            "unit_of_measure": UnitOfMeasure.KG,
            "price_per_unit": Decimal("5.00"),
            "minimum_order_quantity": Decimal("10.00"),
            "harvest_date": datetime.now().date() - timedelta(days=5),
            "expected_shelf_life_days": 30,
            "farm_location": "Kumasi Outskirts",
            "region": "Ashanti",
            "district": "Kumasi Metropolitan",
            "is_organic": False,
            "status": ProductStatus.AVAILABLE,
            "is_featured": True,
            "primary_image_url": images.get("yam"),
            "view_count": 312,
            "order_count": 67,
        },
        {
            "seller_id": farmer2.id,
            "product_name": "Fresh Cassava",
            "category": ProductCategory.TUBERS,
            "description": "Fresh cassava tubers, perfect for making fufu, gari, or kokonte. Harvested at peak maturity for the best starch content.",
            "quantity_available": Decimal("300.00"),
            "unit_of_measure": UnitOfMeasure.KG,
            "price_per_unit": Decimal("3.50"),
            "minimum_order_quantity": Decimal("20.00"),
            "harvest_date": datetime.now().date() - timedelta(days=3),
            "expected_shelf_life_days": 7,
            "farm_location": "Kumasi Outskirts",
            "region": "Ashanti",
            "district": "Kumasi Metropolitan",
            "is_organic": False,
            "status": ProductStatus.AVAILABLE,
            "is_featured": False,
            "primary_image_url": images.get("cassava"),
            "view_count": 198,
            "order_count": 42,
        },
        {
            "seller_id": farmer2.id,
            "product_name": "White Maize",
            "category": ProductCategory.GRAINS,
            "description": "Premium white maize, properly dried and ready for milling. Ideal for making kenkey, banku, or animal feed. Moisture content below 13%.",
            "quantity_available": Decimal("500.00"),
            "unit_of_measure": UnitOfMeasure.KG,
            "price_per_unit": Decimal("3.50"),
            "minimum_order_quantity": Decimal("50.00"),
            "harvest_date": datetime.now().date() - timedelta(days=15),
            "expected_shelf_life_days": 180,
            "farm_location": "Kumasi Outskirts",
            "region": "Ashanti",
            "district": "Kumasi Metropolitan",
            "is_organic": False,
            "status": ProductStatus.AVAILABLE,
            "is_featured": True,
            "primary_image_url": images.get("maize"),
            "view_count": 267,
            "order_count": 58,
        },
        {
            "seller_id": farmer2.id,
            "product_name": "Sweet Potatoes",
            "category": ProductCategory.TUBERS,
            "description": "Sweet, orange-fleshed sweet potatoes. Rich in vitamins and perfect for boiling, frying, or making chips. Kids love them!",
            "quantity_available": Decimal("120.00"),
            "unit_of_measure": UnitOfMeasure.KG,
            "price_per_unit": Decimal("4.50"),
            "minimum_order_quantity": Decimal("10.00"),
            "harvest_date": datetime.now().date() - timedelta(days=4),
            "expected_shelf_life_days": 21,
            "farm_location": "Kumasi Outskirts",
            "region": "Ashanti",
            "district": "Kumasi Metropolitan",
            "is_organic": True,
            "status": ProductStatus.AVAILABLE,
            "is_featured": False,
            "primary_image_url": images.get("sweet_potato"),
            "view_count": 145,
            "order_count": 31,
        },

        # ========== FARMER 3 (Abena) - Fruits ==========
        {
            "seller_id": farmer3.id,
            "product_name": "Fresh Bananas",
            "category": ProductCategory.FRUITS,
            "description": "Sweet, ripe bananas from the Eastern Region. Perfect for eating fresh, making smoothies, or baking. Sold in bunches.",
            "quantity_available": Decimal("100.00"),
            "unit_of_measure": UnitOfMeasure.BUNCHES,
            "price_per_unit": Decimal("8.00"),
            "minimum_order_quantity": Decimal("3.00"),
            "harvest_date": datetime.now().date() - timedelta(days=2),
            "expected_shelf_life_days": 7,
            "farm_location": "Nkawkaw Hills",
            "region": "Eastern",
            "district": "Kwahu South",
            "is_organic": True,
            "status": ProductStatus.AVAILABLE,
            "is_featured": True,
            "primary_image_url": images.get("banana"),
            "view_count": 289,
            "order_count": 56,
        },
        {
            "seller_id": farmer3.id,
            "product_name": "Fresh Mangoes",
            "category": ProductCategory.FRUITS,
            "description": "Juicy, sweet mangoes - the king of fruits! Perfect for eating fresh, making juice, or desserts. Available seasonally.",
            "quantity_available": Decimal("75.00"),
            "unit_of_measure": UnitOfMeasure.KG,
            "price_per_unit": Decimal("10.00"),
            "minimum_order_quantity": Decimal("5.00"),
            "harvest_date": datetime.now().date() - timedelta(days=1),
            "expected_shelf_life_days": 10,
            "farm_location": "Nkawkaw Hills",
            "region": "Eastern",
            "district": "Kwahu South",
            "is_organic": False,
            "status": ProductStatus.AVAILABLE,
            "is_featured": True,
            "primary_image_url": images.get("mango"),
            "view_count": 356,
            "order_count": 72,
        },
        {
            "seller_id": farmer3.id,
            "product_name": "Fresh Oranges",
            "category": ProductCategory.FRUITS,
            "description": "Sweet and tangy oranges, freshly picked. Great for juicing or eating fresh. Rich in Vitamin C.",
            "quantity_available": Decimal("90.00"),
            "unit_of_measure": UnitOfMeasure.KG,
            "price_per_unit": Decimal("6.00"),
            "minimum_order_quantity": Decimal("5.00"),
            "harvest_date": datetime.now().date() - timedelta(days=2),
            "expected_shelf_life_days": 14,
            "farm_location": "Nkawkaw Hills",
            "region": "Eastern",
            "district": "Kwahu South",
            "is_organic": False,
            "status": ProductStatus.AVAILABLE,
            "is_featured": False,
            "primary_image_url": images.get("orange"),
            "view_count": 178,
            "order_count": 34,
        },
        {
            "seller_id": farmer3.id,
            "product_name": "Ripe Plantain",
            "category": ProductCategory.FRUITS,
            "description": "Ripe, sweet plantains perfect for frying (kelewele), roasting, or making plantain chips. Yellow with some black spots - peak ripeness!",
            "quantity_available": Decimal("80.00"),
            "unit_of_measure": UnitOfMeasure.BUNCHES,
            "price_per_unit": Decimal("12.00"),
            "minimum_order_quantity": Decimal("2.00"),
            "harvest_date": datetime.now().date() - timedelta(days=3),
            "expected_shelf_life_days": 5,
            "farm_location": "Nkawkaw Hills",
            "region": "Eastern",
            "district": "Kwahu South",
            "is_organic": True,
            "status": ProductStatus.AVAILABLE,
            "is_featured": False,
            "primary_image_url": images.get("plantain"),
            "view_count": 234,
            "order_count": 48,
        },

        # ========== FARMER 4 (Yaw) - Mixed Farming ==========
        {
            "seller_id": farmer4.id,
            "product_name": "Fresh Onions",
            "category": ProductCategory.VEGETABLES,
            "description": "Large, firm onions from the Northern Region. Essential for any kitchen. Long shelf life and strong flavor.",
            "quantity_available": Decimal("200.00"),
            "unit_of_measure": UnitOfMeasure.KG,
            "price_per_unit": Decimal("7.00"),
            "minimum_order_quantity": Decimal("10.00"),
            "harvest_date": datetime.now().date() - timedelta(days=7),
            "expected_shelf_life_days": 30,
            "farm_location": "Tamale Plains",
            "region": "Northern",
            "district": "Tamale Metropolitan",
            "is_organic": False,
            "status": ProductStatus.AVAILABLE,
            "is_featured": True,
            "primary_image_url": images.get("onion"),
            "view_count": 445,
            "order_count": 89,
        },
        {
            "seller_id": farmer4.id,
            "product_name": "Fresh Carrots",
            "category": ProductCategory.VEGETABLES,
            "description": "Fresh, crunchy carrots. Great for salads, cooking, or juicing. Rich in beta-carotene and vitamins.",
            "quantity_available": Decimal("70.00"),
            "unit_of_measure": UnitOfMeasure.KG,
            "price_per_unit": Decimal("9.00"),
            "minimum_order_quantity": Decimal("5.00"),
            "harvest_date": datetime.now().date() - timedelta(days=2),
            "expected_shelf_life_days": 21,
            "farm_location": "Tamale Plains",
            "region": "Northern",
            "district": "Tamale Metropolitan",
            "is_organic": True,
            "status": ProductStatus.AVAILABLE,
            "is_featured": False,
            "primary_image_url": images.get("carrot"),
            "view_count": 167,
            "order_count": 29,
        },
        {
            "seller_id": farmer4.id,
            "product_name": "Raw Cashew Nuts",
            "category": ProductCategory.OTHER,
            "description": "Premium raw cashew nuts from Northern Ghana. Can be roasted or processed. High demand for export quality.",
            "quantity_available": Decimal("150.00"),
            "unit_of_measure": UnitOfMeasure.KG,
            "price_per_unit": Decimal("25.00"),
            "minimum_order_quantity": Decimal("10.00"),
            "harvest_date": datetime.now().date() - timedelta(days=10),
            "expected_shelf_life_days": 90,
            "farm_location": "Tamale Plains",
            "region": "Northern",
            "district": "Tamale Metropolitan",
            "is_organic": False,
            "status": ProductStatus.AVAILABLE,
            "is_featured": True,
            "primary_image_url": images.get("cashew"),
            "view_count": 312,
            "order_count": 45,
        },
        {
            "seller_id": farmer4.id,
            "product_name": "Fresh Squash",
            "category": ProductCategory.VEGETABLES,
            "description": "Fresh garden squash, versatile for soups, stews, and roasting. Mild, slightly sweet flavor.",
            "quantity_available": Decimal("50.00"),
            "unit_of_measure": UnitOfMeasure.KG,
            "price_per_unit": Decimal("8.00"),
            "minimum_order_quantity": Decimal("5.00"),
            "harvest_date": datetime.now().date() - timedelta(days=3),
            "expected_shelf_life_days": 14,
            "farm_location": "Tamale Plains",
            "region": "Northern",
            "district": "Tamale Metropolitan",
            "is_organic": True,
            "status": ProductStatus.AVAILABLE,
            "is_featured": False,
            "primary_image_url": images.get("squash"),
            "view_count": 98,
            "order_count": 18,
        },
    ]

    for data in products_data:
        existing = db.query(Product).filter(
            Product.product_name == data["product_name"],
            Product.seller_id == data["seller_id"]
        ).first()
        
        if not existing:
            product = Product(**data)
            db.add(product)
            logger.info(f"  Created product: {data['product_name']}")
        else:
            logger.info(f"  Product already exists: {data['product_name']}")

    db.commit()
    logger.info(f"✅ {len(products_data)} products seeded")


def seed_system_config(db: Session):
    """Seed system configuration"""
    logger.info("Seeding system configuration...")

    # Check if config already exists
    existing_config = db.query(SystemConfiguration).filter(SystemConfiguration.key == "AGENT_SYSTEM_PROMPT").first()
    if existing_config:
        logger.info("System configuration already exists, skipping config seeding")
        return

    # Agent system prompt
    agent_prompt = SystemConfiguration(
        key="AGENT_SYSTEM_PROMPT",
        value="""You are SmartAgro AI, an intelligent farming assistant for Ghanaian farmers using the SmartAgro marketplace platform.

Your capabilities:
1. **Agricultural Knowledge**: Answer questions about crop cultivation, pest control, harvesting, post-harvest handling, soil management, and best farming practices specific to Ghana's climate and conditions.

2. **Platform Assistance**: Help farmers understand their platform activities - products listed, orders received, earnings, buyer enquiries, and payouts.

3. **Weather Guidance**: Provide weather forecasts and advice on how weather affects farming activities.

4. **Planning Tools**: Help calculate planting dates, estimate yields, and plan farming activities.

Available Tools:
- search_knowledge: Search agricultural knowledge base for crop guides, pest control, post-harvest practices
- get_weather: Get weather forecast for any location in Ghana
- get_farmer_products: View farmer's product listings on the platform
- get_farmer_orders: View farmer's sales and orders
- get_farmer_earnings: View earnings, payouts, and escrow balance
- get_buyer_enquiries: View messages from potential buyers
- calculate_planting_date: Calculate optimal planting date for target harvest

Context:
- User is in Ghana (tropical climate with two rainy seasons)
- Common crops: maize, tomatoes, pepper, onions, cabbage, yams, cassava, plantain, rice
- Major rainy season: March-July
- Minor rainy season: August-October
- Dry season: November-February
- All currency is in Ghana Cedis (GHS)

Guidelines:
1. Be friendly, helpful, and concise in your responses
2. Use simple language that farmers can easily understand
3. When giving advice, consider Ghana's climate, seasons, and local conditions
4. Reference the knowledge base for accurate agricultural information
5. If unsure about something, say so rather than guessing
6. Mention relevant local crop varieties and practices when applicable
7. Provide specific, actionable recommendations with numbers (dates, quantities)
8. Warn about common pests and diseases relevant to Ghana
9. Suggest organic/affordable solutions when possible

When farmers ask about their platform data (products, orders, earnings), use the appropriate tools to fetch accurate information.

Remember: You're helping real farmers make better decisions for their livelihoods. Be accurate and practical.""",
        description="System prompt for AI farming assistant"
    )
    db.add(agent_prompt)
    
    # Welcome message configuration
    welcome_config = SystemConfiguration(
        key="WELCOME_MESSAGE",
        value="Welcome to SmartAgro! Connect directly with farmers for fresh produce.",
        description="Welcome message shown on homepage"
    )
    db.add(welcome_config)
    
    # Platform fee configuration
    fee_config = SystemConfiguration(
        key="PLATFORM_FEE_PERCENTAGE",
        value="5.0",
        description="Platform commission percentage"
    )
    db.add(fee_config)
    
    db.commit()
    logger.info("✅ System configuration seeded")


def seed_crop_knowledge(db: Session):
    """Seed agricultural knowledge base"""
    logger.info("Seeding crop knowledge...")

    # Check if crop knowledge already exists
    existing_crop = db.query(CropKnowledge).filter(CropKnowledge.crop_name == "Tomato").first()
    if existing_crop:
        logger.info("Crop knowledge already exists, skipping crop knowledge seeding")
        return

    crops_data = [
        {
            "crop_name": "Tomato",
            "category": "VEGETABLES",
            "local_name_twi": "Ntɔsi",
            "content": "Tomatoes grow best in well-drained, fertile soil with pH 6.0-6.8. Plant spacing: 60cm between rows, 45cm between plants. Water regularly, especially during flowering. Common pests: whiteflies, aphids. Use neem oil spray for organic control.",
            "content_type": "PLANTING",
            "applicable_regions": ["Brong-Ahafo", "Ashanti", "Eastern"],
            "planting_season": "March-April",
            "tags": ["vegetables", "high-value", "pest-prone"]
        },
        {
            "crop_name": "Yam",
            "category": "TUBERS",
            "local_name_twi": "Bayerɛ",
            "content": "Yams require deep, loose soil. Plant at start of rains (March-April). Mound height: 1 meter. Spacing: 1m x 1m. Harvest after 8-10 months when leaves turn yellow. Store in cool, dry place.",
            "content_type": "PLANTING",
            "applicable_regions": ["Ashanti", "Brong-Ahafo", "Northern"],
            "planting_season": "March-April",
            "tags": ["tubers", "long-season", "storage-crop"]
        },
        {
            "crop_name": "Maize",
            "category": "GRAINS",
            "local_name_twi": "Aburo",
            "content": "Maize grows in most Ghanaian soils. Plant at onset of rains. Spacing: 75cm x 25cm. Apply fertilizer 2-3 weeks after planting. Harvest when kernels are hard (3-4 months). Dry to 13% moisture for storage.",
            "content_type": "PLANTING",
            "applicable_regions": ["All regions"],
            "planting_season": "March-May, September",
            "tags": ["grains", "staple", "versatile"]
        },
    ]
    
    for data in crops_data:
        crop = CropKnowledge(**data)
        db.add(crop)
    
    db.commit()
    logger.info("✅ Crop knowledge seeded")


def seed_all(db: Session):
    """Run all seed functions"""
    logger.info("🌱 Starting database seeding...")

    try:
        # Copy product images first
        logger.info("📷 Copying product images...")
        images = copy_product_images()

        # Seed users
        users = seed_users(db)

        # Seed products with images
        seed_products(db, users, images)

        # Seed system config and knowledge
        seed_system_config(db)
        seed_crop_knowledge(db)

        logger.info("✅ All seed data created successfully!")
        logger.info("\n" + "="*60)
        logger.info("TEST ACCOUNTS")
        logger.info("="*60)
        logger.info("\n👨‍💼 ADMIN:")
        logger.info("  Email: admin@smartagro.com")
        logger.info("  Password: Admin123!")
        logger.info("\n🧑‍🌾 FARMER 1 (Kwame - Vegetables):")
        logger.info("  Email: kwame@example.com")
        logger.info("  Phone: +233241111111")
        logger.info("  Password: Farmer123!")
        logger.info("  Farm: Kwame's Fresh Farm (Techiman)")
        logger.info("\n🧑‍🌾 FARMER 2 (Ama - Tubers & Grains):")
        logger.info("  Email: ama@example.com")
        logger.info("  Phone: +233242222222")
        logger.info("  Password: Farmer123!")
        logger.info("  Farm: Serwaa's Organic Farm (Kumasi)")
        logger.info("\n🧑‍🌾 FARMER 3 (Abena - Fruits) [NO EMAIL]:")
        logger.info("  Phone: +233244444444")
        logger.info("  Password: Farmer123!")
        logger.info("  Farm: Pokua Fruits & More (Nkawkaw)")
        logger.info("\n🧑‍🌾 FARMER 4 (Yaw - Mixed):")
        logger.info("  Email: yaw@example.com")
        logger.info("  Phone: +233245555555")
        logger.info("  Password: Farmer123!")
        logger.info("  Farm: Boateng Agro Farm (Tamale)")
        logger.info("\n🛒 BUYER 1 (Esi - Restaurant):")
        logger.info("  Email: esi@example.com")
        logger.info("  Phone: +233243333333")
        logger.info("  Password: Buyer123!")
        logger.info("\n🛒 BUYER 2 (Kofi - Market Trader):")
        logger.info("  Email: kofi@example.com")
        logger.info("  Phone: +233246666666")
        logger.info("  Password: Buyer123!")
        logger.info("="*60 + "\n")

    except Exception as e:
        logger.error(f"❌ Seeding failed: {e}", exc_info=True)
        db.rollback()
        raise


if __name__ == "__main__":
    from database import SessionLocal
    
    db = SessionLocal()
    seed_all(db)
    db.close()