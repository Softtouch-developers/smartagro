"""
Product Management Service
Business logic for product operations
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc, func
from fastapi import HTTPException, status
from typing import Optional, Dict, Any, List, Tuple
import logging
from datetime import datetime

from models import Product, ProductStatus, User, UserType
from modules.products.schemas import CreateProductRequest, UpdateProductRequest, ProductFilterRequest

logger = logging.getLogger(__name__)


class ProductService:
    """Service for product management operations"""

    @staticmethod
    def create_product(
        db: Session,
        seller_id: int,
        product_data: CreateProductRequest
    ) -> Product:
        """
        Create a new product listing

        Args:
            db: Database session
            seller_id: ID of the seller (must be a farmer)
            product_data: Product creation data

        Returns:
            Created product
        """
        # Verify seller is a farmer
        seller = db.query(User).filter(User.id == seller_id).first()
        if not seller:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Seller not found"
            )

        if seller.user_type != UserType.FARMER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only farmers can create product listings"
            )

        # Create product
        product = Product(
            seller_id=seller_id,
            product_name=product_data.product_name,
            category=product_data.category,
            description=product_data.description,
            quantity_available=product_data.quantity_available,
            unit_of_measure=product_data.unit_of_measure,
            price_per_unit=product_data.price_per_unit,
            minimum_order_quantity=product_data.minimum_order_quantity,
            harvest_date=product_data.harvest_date,
            expected_shelf_life_days=product_data.expected_shelf_life_days,
            farm_location=product_data.farm_location,
            region=product_data.region,
            district=product_data.district,
            is_organic=product_data.is_organic,
            variety=product_data.variety,
            status=ProductStatus.AVAILABLE,
            is_active=True
        )

        db.add(product)
        db.commit()
        db.refresh(product)

        logger.info(f"Product {product.id} created by seller {seller_id}")
        return product

    @staticmethod
    def get_product_by_id(db: Session, product_id: int) -> Optional[Product]:
        """Get product by ID"""
        return db.query(Product).filter(Product.id == product_id).first()

    @staticmethod
    def get_product_with_seller(db: Session, product_id: int) -> Tuple[Optional[Product], Optional[Dict]]:
        """Get product with seller information"""
        product = db.query(Product).filter(Product.id == product_id).first()

        if not product:
            return None, None

        # Get seller info
        seller = db.query(User).filter(User.id == product.seller_id).first()
        seller_info = {
            "id": seller.id,
            "full_name": seller.full_name,
            "region": seller.region,
            "district": seller.district,
            "farm_name": seller.farm_name,
            "average_rating": float(seller.average_rating) if seller.average_rating else None,
            "total_reviews": seller.total_reviews,
            "years_farming": seller.years_farming,
            "profile_image_url": seller.profile_image_url
        } if seller else None

        return product, seller_info

    @staticmethod
    def update_product(
        db: Session,
        product_id: int,
        seller_id: int,
        update_data: UpdateProductRequest
    ) -> Product:
        """
        Update product

        Args:
            db: Database session
            product_id: Product ID
            seller_id: ID of the seller (must be product owner)
            update_data: Update data

        Returns:
            Updated product
        """
        product = ProductService.get_product_by_id(db, product_id)

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )

        # Verify ownership
        if product.seller_id != seller_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own products"
            )

        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            if hasattr(product, field):
                setattr(product, field, value)

        product.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(product)

        logger.info(f"Product {product_id} updated by seller {seller_id}")
        return product

    @staticmethod
    def delete_product(db: Session, product_id: int, seller_id: int) -> Dict[str, Any]:
        """
        Delete product (soft delete - mark as inactive)

        Args:
            db: Database session
            product_id: Product ID
            seller_id: ID of the seller (must be product owner)

        Returns:
            Success message
        """
        product = ProductService.get_product_by_id(db, product_id)

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )

        # Verify ownership
        if product.seller_id != seller_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own products"
            )

        # Soft delete
        product.is_active = False
        product.status = ProductStatus.OUT_OF_STOCK
        product.updated_at = datetime.utcnow()

        db.commit()

        logger.info(f"Product {product_id} deleted by seller {seller_id}")
        return {
            "success": True,
            "message": "Product deleted successfully"
        }

    @staticmethod
    def list_products(
        db: Session,
        filters: ProductFilterRequest
    ) -> Tuple[List[Product], int]:
        """
        List products with filters and pagination

        Args:
            db: Database session
            filters: Filter criteria

        Returns:
            Tuple of (products, total_count)
        """
        query = db.query(Product).filter(Product.is_active == True)

        # Apply filters
        if filters.category:
            query = query.filter(Product.category == filters.category)

        if filters.region:
            query = query.filter(Product.region == filters.region)

        if filters.district:
            query = query.filter(Product.district == filters.district)

        if filters.is_organic is not None:
            query = query.filter(Product.is_organic == filters.is_organic)

        if filters.min_price:
            query = query.filter(Product.price_per_unit >= filters.min_price)

        if filters.max_price:
            query = query.filter(Product.price_per_unit <= filters.max_price)

        if filters.status:
            query = query.filter(Product.status == filters.status)

        if filters.is_featured is not None:
            query = query.filter(Product.is_featured == filters.is_featured)

        if filters.seller_id:
            query = query.filter(Product.seller_id == filters.seller_id)

        # Full-text search
        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.filter(
                or_(
                    Product.product_name.ilike(search_term),
                    Product.description.ilike(search_term),
                    Product.variety.ilike(search_term)
                )
            )

        # Get total count before pagination
        total = query.count()

        # Sorting
        sort_column = getattr(Product, filters.sort_by)
        if filters.sort_order == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        # Pagination
        offset = (filters.page - 1) * filters.page_size
        products = query.offset(offset).limit(filters.page_size).all()

        return products, total

    @staticmethod
    def get_featured_products(db: Session, limit: int = 10) -> List[Product]:
        """Get featured products"""
        return db.query(Product).filter(
            and_(
                Product.is_featured == True,
                Product.is_active == True,
                Product.status == ProductStatus.AVAILABLE
            )
        ).order_by(desc(Product.created_at)).limit(limit).all()

    @staticmethod
    def search_products(db: Session, search_term: str, limit: int = 20) -> List[Product]:
        """Full-text search for products"""
        search_pattern = f"%{search_term}%"

        return db.query(Product).filter(
            and_(
                Product.is_active == True,
                Product.status == ProductStatus.AVAILABLE,
                or_(
                    Product.product_name.ilike(search_pattern),
                    Product.description.ilike(search_pattern),
                    Product.variety.ilike(search_pattern),
                    Product.category.cast(db.String).ilike(search_pattern)
                )
            )
        ).order_by(desc(Product.created_at)).limit(limit).all()

    @staticmethod
    def update_product_quantity(
        db: Session,
        product_id: int,
        quantity_sold: float
    ) -> Product:
        """
        Update product quantity after order

        Args:
            db: Database session
            product_id: Product ID
            quantity_sold: Quantity to deduct

        Returns:
            Updated product
        """
        product = ProductService.get_product_by_id(db, product_id)

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )

        if product.quantity_available < quantity_sold:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient quantity. Available: {product.quantity_available}, Requested: {quantity_sold}"
            )

        # Update quantity
        product.quantity_available -= quantity_sold
        product.total_quantity_sold += quantity_sold

        # Mark as out of stock if quantity is 0
        if product.quantity_available == 0:
            product.status = ProductStatus.OUT_OF_STOCK

        product.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(product)

        return product
