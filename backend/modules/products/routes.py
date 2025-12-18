"""
Product Management Routes
API endpoints for product operations
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
import logging
import math

from database import get_db
from models import User
from modules.auth.dependencies import get_current_verified_user, get_current_farmer
from modules.products.service import ProductService
from modules.products.schemas import (
    CreateProductRequest,
    UpdateProductRequest,
    ProductFilterRequest,
    ProductResponse,
    ProductListResponse,
    ProductDetailResponse,
    MessageResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: CreateProductRequest,
    current_user: User = Depends(get_current_farmer),
    db: Session = Depends(get_db)
):
    """
    Create a new product listing

    **Requires farmer authentication**

    - **product_name**: Name of the product
    - **category**: Product category (VEGETABLES, FRUITS, GRAINS, etc.)
    - **description**: Detailed description
    - **quantity_available**: Available quantity
    - **unit_of_measure**: Unit (KG, BAGS, PIECES, etc.)
    - **price_per_unit**: Price per unit in GHS
    - **region**: Product location region
    - **district**: Product location district
    """
    try:
        product = ProductService.create_product(
            db=db,
            seller_id=current_user.id,
            product_data=product_data
        )

        return ProductResponse.from_orm(product)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create product error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create product"
        )


@router.get("", response_model=ProductListResponse)
async def list_products(
    category: Optional[str] = None,
    region: Optional[str] = None,
    district: Optional[str] = None,
    is_organic: Optional[bool] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    search: Optional[str] = None,
    product_status: Optional[str] = Query("AVAILABLE", alias="status"),
    is_featured: Optional[bool] = None,
    seller_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at", pattern="^(created_at|price_per_unit|product_name|quantity_available)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    """
    List products with filtering, search, and pagination

    **Public endpoint** - No authentication required

    Query parameters:
    - **category**: Filter by category
    - **region**: Filter by region
    - **district**: Filter by district
    - **is_organic**: Filter organic products
    - **min_price/max_price**: Price range filter
    - **search**: Full-text search
    - **status**: Product status (default: AVAILABLE)
    - **is_featured**: Show only featured products
    - **seller_id**: Filter by seller
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **sort_by**: Sort field (created_at, price_per_unit, product_name, quantity_available)
    - **sort_order**: Sort direction (asc, desc)
    """
    try:
        # Build filter request
        filters = ProductFilterRequest(
            category=category,
            region=region,
            district=district,
            is_organic=is_organic,
            min_price=min_price,
            max_price=max_price,
            search=search,
            status=product_status,
            is_featured=is_featured,
            seller_id=seller_id,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order
        )

        products, total = ProductService.list_products(db, filters)

        # Calculate total pages
        total_pages = math.ceil(total / page_size) if total > 0 else 1

        # Convert to response models
        product_responses = [ProductResponse.from_orm(p) for p in products]

        return ProductListResponse(
            success=True,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            products=product_responses
        )

    except Exception as e:
        logger.error(f"List products error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve products"
        )


@router.get("/featured", response_model=ProductListResponse)
async def get_featured_products(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Get featured products

    **Public endpoint** - No authentication required

    Returns up to `limit` featured products
    """
    try:
        products = ProductService.get_featured_products(db, limit=limit)

        product_responses = [ProductResponse.from_orm(p) for p in products]

        return ProductListResponse(
            success=True,
            total=len(products),
            page=1,
            page_size=limit,
            total_pages=1,
            products=product_responses
        )

    except Exception as e:
        logger.error(f"Get featured products error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve featured products"
        )


@router.get("/search", response_model=ProductListResponse)
async def search_products(
    q: str = Query(..., min_length=2, max_length=255, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Search products by name, description, or variety

    **Public endpoint** - No authentication required

    - **q**: Search query (min 2 characters)
    - **limit**: Max results (default: 20)
    """
    try:
        products = ProductService.search_products(db, search_term=q, limit=limit)

        product_responses = [ProductResponse.from_orm(p) for p in products]

        return ProductListResponse(
            success=True,
            total=len(products),
            page=1,
            page_size=limit,
            total_pages=1,
            products=product_responses
        )

    except Exception as e:
        logger.error(f"Search products error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search products"
        )


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    """
    Get product details by ID

    **Public endpoint** - No authentication required

    Returns product details along with seller information
    """
    try:
        product, seller_info = ProductService.get_product_with_seller(db, product_id)

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )

        return ProductDetailResponse(
            success=True,
            product=ProductResponse.from_orm(product),
            seller=seller_info
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get product error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve product"
        )


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    update_data: UpdateProductRequest,
    current_user: User = Depends(get_current_farmer),
    db: Session = Depends(get_db)
):
    """
    Update product

    **Requires farmer authentication and ownership**

    Only the product owner can update the product
    """
    try:
        product = ProductService.update_product(
            db=db,
            product_id=product_id,
            seller_id=current_user.id,
            update_data=update_data
        )

        return ProductResponse.from_orm(product)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update product error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update product"
        )


@router.delete("/{product_id}", response_model=MessageResponse)
async def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_farmer),
    db: Session = Depends(get_db)
):
    """
    Delete product (soft delete)

    **Requires farmer authentication and ownership**

    Only the product owner can delete the product.
    This performs a soft delete - marks the product as inactive.
    """
    try:
        result = ProductService.delete_product(
            db=db,
            product_id=product_id,
            seller_id=current_user.id
        )

        return MessageResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete product error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete product"
        )
