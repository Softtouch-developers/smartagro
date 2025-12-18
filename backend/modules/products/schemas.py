"""
Product Management Schemas
Pydantic models for product request/response validation
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime, date
from models import ProductCategory, ProductStatus, UnitOfMeasure


# ==================== REQUEST SCHEMAS ====================

class CreateProductRequest(BaseModel):
    """Create product request"""
    product_name: str = Field(..., min_length=3, max_length=255)
    category: ProductCategory
    description: str = Field(..., min_length=10, max_length=2000)
    quantity_available: float = Field(..., gt=0)
    unit_of_measure: UnitOfMeasure
    price_per_unit: float = Field(..., gt=0)
    minimum_order_quantity: Optional[float] = Field(None, gt=0)

    # Harvest information
    harvest_date: Optional[date] = None
    expected_shelf_life_days: Optional[int] = Field(None, gt=0)

    # Location
    farm_location: Optional[str] = Field(None, max_length=255)
    region: str = Field(..., max_length=50)
    district: str = Field(..., max_length=100)

    # Optional attributes
    is_organic: bool = False
    variety: Optional[str] = Field(None, max_length=100)

    class Config:
        json_schema_extra = {
            "example": {
                "product_name": "Fresh Tomatoes",
                "category": "VEGETABLES",
                "description": "Fresh, organic tomatoes harvested daily from our farm in Techiman. Perfect for cooking and salads.",
                "quantity_available": 150.0,
                "unit_of_measure": "KG",
                "price_per_unit": 8.50,
                "minimum_order_quantity": 10.0,
                "harvest_date": "2025-12-06",
                "expected_shelf_life_days": 7,
                "farm_location": "Techiman Valley",
                "region": "Brong-Ahafo",
                "district": "Techiman",
                "is_organic": True,
                "variety": "Roma Tomatoes"
            }
        }


class UpdateProductRequest(BaseModel):
    """Update product request"""
    product_name: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = Field(None, min_length=10, max_length=2000)
    quantity_available: Optional[float] = Field(None, gt=0)
    price_per_unit: Optional[float] = Field(None, gt=0)
    minimum_order_quantity: Optional[float] = Field(None, gt=0)
    status: Optional[ProductStatus] = None
    is_featured: Optional[bool] = None
    is_organic: Optional[bool] = None
    variety: Optional[str] = Field(None, max_length=100)
    expected_shelf_life_days: Optional[int] = Field(None, gt=0)

    class Config:
        json_schema_extra = {
            "example": {
                "quantity_available": 120.0,
                "price_per_unit": 9.00,
                "status": "AVAILABLE"
            }
        }


class ProductFilterRequest(BaseModel):
    """Product filter/search request"""
    category: Optional[ProductCategory] = None
    region: Optional[str] = None
    district: Optional[str] = None
    is_organic: Optional[bool] = None
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    search: Optional[str] = Field(None, max_length=255)  # Full-text search
    status: Optional[ProductStatus] = ProductStatus.AVAILABLE
    is_featured: Optional[bool] = None
    seller_id: Optional[int] = None

    # Pagination
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)

    # Sorting
    sort_by: str = Field("created_at", pattern="^(created_at|price_per_unit|product_name|quantity_available)$")
    sort_order: str = Field("desc", pattern="^(asc|desc)$")

    @validator('max_price')
    def validate_price_range(cls, v, values):
        if v and 'min_price' in values and values['min_price'] and v < values['min_price']:
            raise ValueError('max_price must be greater than min_price')
        return v


# ==================== RESPONSE SCHEMAS ====================

class ProductResponse(BaseModel):
    """Product response model"""
    id: int
    seller_id: int
    product_name: str
    category: str
    description: str
    quantity_available: float
    unit_of_measure: str
    price_per_unit: float
    minimum_order_quantity: Optional[float]

    # Harvest info
    harvest_date: Optional[date]
    expected_shelf_life_days: Optional[int]

    # Location
    farm_location: Optional[str]
    region: str
    district: str

    # Images
    primary_image_url: Optional[str]
    image_urls: List[str] = []

    # Attributes
    is_organic: bool
    variety: Optional[str] = None
    status: str
    is_featured: bool

    # Statistics
    total_orders: int = 0
    total_quantity_sold: float = 0
    average_rating: Optional[float] = None
    total_reviews: int = 0

    # Seller info (embedded)
    seller_name: Optional[str] = None
    seller_region: Optional[str] = None
    seller_rating: Optional[float] = None

    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    """Paginated product list response"""
    success: bool = True
    total: int
    page: int
    page_size: int
    total_pages: int
    products: List[ProductResponse]


class ProductDetailResponse(BaseModel):
    """Detailed product response with seller info"""
    success: bool = True
    product: ProductResponse
    seller: dict  # Seller profile info


class MessageResponse(BaseModel):
    """Generic message response"""
    success: bool
    message: str
