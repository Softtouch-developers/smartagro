# backend/models.py
from sqlalchemy import (
    Column, Integer, String, Text, DECIMAL, DateTime, Boolean, 
    Date, ForeignKey, Enum as SQLEnum, ARRAY, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Session
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime, timedelta
import enum

Base = declarative_base()

# ==================== ENUMS ====================

class UserType(enum.Enum):
    FARMER = "FARMER"
    BUYER = "BUYER"
    ADMIN = "ADMIN"

class AccountStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    DELETED = "DELETED"

class OTPType(enum.Enum):
    EMAIL_VERIFICATION = "EMAIL_VERIFICATION"
    PHONE_VERIFICATION = "PHONE_VERIFICATION"
    PASSWORD_RESET = "PASSWORD_RESET"
    TRANSACTION_CONFIRM = "TRANSACTION_CONFIRM"

class ProductCategory(enum.Enum):
    VEGETABLES = "VEGETABLES"
    FRUITS = "FRUITS"
    TUBERS = "TUBERS"
    GRAINS = "GRAINS"
    CEREALS = "CEREALS"
    LEGUMES = "LEGUMES"
    LIVESTOCK = "LIVESTOCK"
    DAIRY = "DAIRY"
    OTHER = "OTHER"

class ProductStatus(enum.Enum):
    AVAILABLE = "AVAILABLE"
    SOLD = "SOLD"
    RESERVED = "RESERVED"
    EXPIRED = "EXPIRED"
    DELETED = "DELETED"

class UnitOfMeasure(enum.Enum):
    KG = "KG"
    GRAMS = "GRAMS"
    BAGS = "BAGS"
    CRATES = "CRATES"
    PIECES = "PIECES"
    BUNCHES = "BUNCHES"
    LITERS = "LITERS"

class OrderStatus(enum.Enum):
    PENDING = "PENDING"
    PAYMENT_INITIATED = "PAYMENT_INITIATED"
    PAID = "PAID"
    CONFIRMED = "CONFIRMED"
    SHIPPED = "SHIPPED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    DISPUTED = "DISPUTED"
    REFUNDED = "REFUNDED"

class EscrowStatus(enum.Enum):
    PENDING = "PENDING"
    PAYMENT_INITIATED = "PAYMENT_INITIATED"
    HELD = "HELD"
    RELEASED = "RELEASED"
    REFUNDED = "REFUNDED"
    DISPUTED = "DISPUTED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"

class DisputeStatus(enum.Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

class DisputeResolution(enum.Enum):
    REFUND = "REFUND"
    RELEASE_TO_SELLER = "RELEASE_TO_SELLER"
    PARTIAL_REFUND = "PARTIAL_REFUND"
    NO_ACTION = "NO_ACTION"

class NotificationType(enum.Enum):
    ORDER_CREATED = "ORDER_CREATED"
    ORDER_PAID = "ORDER_PAID"
    ORDER_SHIPPED = "ORDER_SHIPPED"
    ORDER_DELIVERED = "ORDER_DELIVERED"
    ORDER_COMPLETED = "ORDER_COMPLETED"
    ORDER_CANCELLED = "ORDER_CANCELLED"
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED"
    PAYMENT_RELEASED = "PAYMENT_RELEASED"
    NEW_CHAT_MESSAGE = "NEW_CHAT_MESSAGE"
    BUYER_INTERESTED = "BUYER_INTERESTED"
    DISPUTE_CREATED = "DISPUTE_CREATED"
    DISPUTE_RESOLVED = "DISPUTE_RESOLVED"
    ACCOUNT_VERIFIED = "ACCOUNT_VERIFIED"
    LOW_STOCK = "LOW_STOCK"
    PRODUCT_EXPIRING = "PRODUCT_EXPIRING"

class AdminActionType(enum.Enum):
    RESOLVE_DISPUTE = "RESOLVE_DISPUTE"
    SUSPEND_USER = "SUSPEND_USER"
    ACTIVATE_USER = "ACTIVATE_USER"
    DELETE_PRODUCT = "DELETE_PRODUCT"
    VERIFY_USER = "VERIFY_USER"
    REFUND_PAYMENT = "REFUND_PAYMENT"
    RELEASE_PAYMENT = "RELEASE_PAYMENT"
    UPDATE_USER = "UPDATE_USER"
    SYSTEM_CONFIG_UPDATED = "SYSTEM_CONFIG_UPDATED"
    KNOWLEDGE_BASE_INDEXED = "KNOWLEDGE_BASE_INDEXED"

# ==================== MODELS ====================

class User(Base):
    __tablename__ = "users"
    
    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Authentication & Contact
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone_number = Column(String(20), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    
    # Personal Information
    full_name = Column(String(255), nullable=False)
    user_type = Column(SQLEnum(UserType), nullable=False, index=True)
    profile_image_url = Column(Text, nullable=True)
    
    # Verification Status
    email_verified = Column(Boolean, default=False, nullable=False)
    phone_verified = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)  # Overall verification
    verification_method = Column(String(20), nullable=True)  # 'PHONE', 'ID_CARD', 'NONE'
    verification_document_url = Column(Text, nullable=True)  # ID card image if verified
    
    # Location Data (for Ghana)
    region = Column(String(50), nullable=True)  # e.g., 'Ashanti', 'Greater Accra'
    district = Column(String(100), nullable=True)
    town_city = Column(String(100), nullable=True)
    gps_address = Column(String(50), nullable=True)  # Ghana PostGPS: AK-039-5832
    detailed_address = Column(Text, nullable=True)
    latitude = Column(DECIMAL(10, 8), nullable=True)
    longitude = Column(DECIMAL(11, 8), nullable=True)
    
    # Financial Information
    wallet_balance = Column(DECIMAL(12, 2), default=0.00, nullable=False)
    bank_name = Column(String(100), nullable=True)
    bank_code = Column(String(10), nullable=True)  # Ghana bank codes
    account_number = Column(String(20), nullable=True)
    account_name = Column(String(255), nullable=True)
    
    # Paystack Integration
    paystack_recipient_code = Column(String(255), unique=True, nullable=True)
    paystack_subaccount_code = Column(String(255), unique=True, nullable=True)
    
    # Account Status & Settings
    account_status = Column(SQLEnum(AccountStatus), default=AccountStatus.PENDING_VERIFICATION, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    language_preference = Column(String(10), default='en', nullable=False)  # 'en', 'tw' (Twi)
    notification_enabled = Column(Boolean, default=True, nullable=False)
    sms_notification_enabled = Column(Boolean, default=True, nullable=False)
    
    # Farmer-specific fields
    farm_name = Column(String(255), nullable=True)
    farm_size_acres = Column(DECIMAL(10, 2), nullable=True)
    years_farming = Column(Integer, nullable=True)
    
    # Rating & Statistics
    average_rating = Column(DECIMAL(3, 2), default=0.00, nullable=True)  # 0.00 to 5.00
    total_reviews = Column(Integer, default=0, nullable=False)
    total_sales = Column(Integer, default=0, nullable=False)
    total_purchases = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    last_active_at = Column(DateTime, nullable=True)
    
    # Relationships
    products = relationship("Product", back_populates="seller", foreign_keys="Product.seller_id")
    orders_as_buyer = relationship("Order", back_populates="buyer", foreign_keys="Order.buyer_id")
    orders_as_seller = relationship("Order", back_populates="seller", foreign_keys="Order.seller_id")
    notifications = relationship("Notification", back_populates="user", foreign_keys="Notification.user_id")
    disputes_raised = relationship("Dispute", back_populates="raised_by", foreign_keys="Dispute.raised_by_user_id")
    disputes_resolved = relationship("Dispute", back_populates="resolved_by", foreign_keys="Dispute.resolved_by_admin_id")
    admin_actions = relationship("AdminAction", back_populates="admin")
    reviews_given = relationship("Review", back_populates="reviewer", foreign_keys="Review.reviewer_id")
    reviews_received = relationship("Review", back_populates="reviewed_user", foreign_keys="Review.reviewed_user_id")
    
    # Indexes
    __table_args__ = (
        Index('idx_user_type_status', 'user_type', 'account_status'),
        Index('idx_user_location', 'region', 'district'),
        Index('idx_user_verified', 'is_verified', 'user_type'),
    )


class OTPVerification(Base):
    __tablename__ = "otp_verifications"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # OTP Details
    otp_code = Column(String(6), nullable=False)  # 6-digit code
    otp_type = Column(SQLEnum(OTPType), nullable=False)
    
    # Contact info (stored at time of OTP generation)
    email = Column(String(255), nullable=True)
    phone_number = Column(String(20), nullable=True)
    
    # Status & Expiry
    is_used = Column(Boolean, default=False, nullable=False)
    is_expired = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime, nullable=False)  # Usually 10 minutes from creation
    
    # Verification tracking
    verified_at = Column(DateTime, nullable=True)
    attempts = Column(Integer, default=0, nullable=False)  # Track failed attempts
    max_attempts = Column(Integer, default=3, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Indexes
    __table_args__ = (
        Index('idx_otp_user_type', 'user_id', 'otp_type', 'is_used'),
        Index('idx_otp_expiry', 'expires_at', 'is_used'),
    )


class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    seller_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Basic Information
    product_name = Column(String(255), nullable=False)
    category = Column(SQLEnum(ProductCategory), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Quantity & Pricing
    quantity_available = Column(DECIMAL(10, 2), nullable=False)
    unit_of_measure = Column(SQLEnum(UnitOfMeasure), nullable=False)
    price_per_unit = Column(DECIMAL(10, 2), nullable=False)
    minimum_order_quantity = Column(DECIMAL(10, 2), default=1.00, nullable=False)
    
    # Harvest Information
    harvest_date = Column(Date, nullable=True)
    expected_shelf_life_days = Column(Integer, nullable=True)
    expiry_alert_days = Column(Integer, default=3, nullable=False)  # Alert when X days before expiry
    
    # Location (Farm location, may differ from seller's address)
    farm_location = Column(String(255), nullable=True)
    region = Column(String(50), nullable=True)
    district = Column(String(100), nullable=True)
    gps_coordinates = Column(String(100), nullable=True)
    
    # Images (stored in DO Spaces)
    primary_image_url = Column(Text, nullable=True)
    additional_images = Column(ARRAY(Text), nullable=True)  # Array of image URLs
    
    # Quality & Certification
    is_organic = Column(Boolean, default=False, nullable=False)
    certification_details = Column(Text, nullable=True)
    
    # Status & Availability
    status = Column(SQLEnum(ProductStatus), default=ProductStatus.AVAILABLE, nullable=False, index=True)
    is_featured = Column(Boolean, default=False, nullable=False)
    is_negotiable = Column(Boolean, default=False, nullable=False)
    
    # Statistics
    view_count = Column(Integer, default=0, nullable=False)
    order_count = Column(Integer, default=0, nullable=False)
    total_sold = Column(DECIMAL(10, 2), default=0.00, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    seller = relationship("User", back_populates="products", foreign_keys=[seller_id])
    orders = relationship("Order", back_populates="product")
    
    # Indexes
    __table_args__ = (
        Index('idx_product_category_status', 'category', 'status'),
        Index('idx_product_seller_status', 'seller_id', 'status'),
        Index('idx_product_created', 'created_at'),
    )


class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Parties involved
    buyer_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    seller_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey('products.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Order Details
    quantity_ordered = Column(DECIMAL(10, 2), nullable=False)
    unit_price = Column(DECIMAL(10, 2), nullable=False)  # Price at time of order
    subtotal = Column(DECIMAL(10, 2), nullable=False)
    platform_fee = Column(DECIMAL(10, 2), default=0.00, nullable=False)
    delivery_fee = Column(DECIMAL(10, 2), default=0.00, nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    
    # Delivery Information
    delivery_address = Column(Text, nullable=False)
    delivery_region = Column(String(50), nullable=True)
    delivery_district = Column(String(100), nullable=True)
    delivery_gps = Column(String(50), nullable=True)
    delivery_phone = Column(String(20), nullable=True)
    delivery_notes = Column(Text, nullable=True)
    
    # Delivery Tracking
    expected_delivery_date = Column(Date, nullable=True)
    actual_delivery_date = Column(Date, nullable=True)
    shipped_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    
    # Tracking & Notes
    tracking_number = Column(String(100), nullable=True)
    tracking_notes = Column(Text, nullable=True)
    buyer_notes = Column(Text, nullable=True)
    seller_notes = Column(Text, nullable=True)
    
    # Status
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False, index=True)
    
    # Payment Reference
    payment_reference = Column(String(255), unique=True, nullable=True)
    payment_method = Column(String(50), default='PAYSTACK', nullable=False)
    
    # Cancellation
    cancelled_reason = Column(Text, nullable=True)
    cancelled_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    buyer = relationship("User", back_populates="orders_as_buyer", foreign_keys=[buyer_id])
    seller = relationship("User", back_populates="orders_as_seller", foreign_keys=[seller_id])
    product = relationship("Product", back_populates="orders")
    escrow = relationship("EscrowTransaction", back_populates="order", uselist=False)
    
    # Indexes
    __table_args__ = (
        Index('idx_order_buyer_status', 'buyer_id', 'status'),
        Index('idx_order_seller_status', 'seller_id', 'status'),
        Index('idx_order_status_created', 'status', 'created_at'),
    )


class EscrowTransaction(Base):
    __tablename__ = "escrow_transactions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey('orders.id', ondelete='CASCADE'), unique=True, nullable=False, index=True)
    
    # Parties
    buyer_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    seller_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Financial Details
    amount = Column(DECIMAL(12, 2), nullable=False)
    currency = Column(String(3), default='GHS', nullable=False)
    platform_fee = Column(DECIMAL(10, 2), default=0.00, nullable=False)
    seller_payout = Column(DECIMAL(12, 2), nullable=False)  # Amount seller receives
    
    # Paystack Integration
    paystack_reference = Column(String(255), unique=True, nullable=True, index=True)
    paystack_status = Column(String(50), nullable=True)
    paystack_transfer_code = Column(String(255), nullable=True)
    paystack_paid_at = Column(DateTime, nullable=True)
    
    # Escrow Status
    status = Column(SQLEnum(EscrowStatus), default=EscrowStatus.PENDING, nullable=False, index=True)
    
    # Auto-action Timeouts
    auto_release_date = Column(DateTime, nullable=True)  # Auto-release after 7 days
    dispute_deadline = Column(DateTime, nullable=True)   # Buyer can dispute within X days
    
    # Resolution Details
    released_at = Column(DateTime, nullable=True)
    released_to_user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    refunded_at = Column(DateTime, nullable=True)
    refund_amount = Column(DECIMAL(12, 2), nullable=True)
    partial_refund_amount = Column(DECIMAL(12, 2), nullable=True)
    
    # Admin notes
    admin_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    order = relationship("Order", back_populates="escrow")
    dispute = relationship("Dispute", back_populates="escrow", uselist=False)
    
    # Indexes
    __table_args__ = (
        Index('idx_escrow_status', 'status'),
        Index('idx_escrow_auto_release', 'auto_release_date', 'status'),
        Index('idx_escrow_buyer', 'buyer_id', 'status'),
        Index('idx_escrow_seller', 'seller_id', 'status'),
    )


class Dispute(Base):
    __tablename__ = "disputes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    escrow_id = Column(Integer, ForeignKey('escrow_transactions.id', ondelete='CASCADE'), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey('orders.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Parties
    raised_by_user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Dispute Details
    reason = Column(Text, nullable=False)
    evidence_description = Column(Text, nullable=True)
    evidence_image_urls = Column(ARRAY(Text), nullable=True)  # Photos of damaged goods, etc.
    
    # Seller Response
    seller_response = Column(Text, nullable=True)
    seller_evidence_urls = Column(ARRAY(Text), nullable=True)
    seller_response_at = Column(DateTime, nullable=True)
    
    # Status & Resolution
    status = Column(SQLEnum(DisputeStatus), default=DisputeStatus.OPEN, nullable=False, index=True)
    resolution = Column(SQLEnum(DisputeResolution), nullable=True)
    resolution_amount = Column(DECIMAL(10, 2), nullable=True)  # For partial refunds
    resolution_notes = Column(Text, nullable=True)
    
    # Admin Review
    resolved_by_admin_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    # Auto-action
    auto_refund_date = Column(DateTime, nullable=True)  # Auto-refund if no admin action
    
    # Priority
    priority = Column(String(20), default='MEDIUM', nullable=False)  # LOW, MEDIUM, HIGH, URGENT
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    escrow = relationship("EscrowTransaction", back_populates="dispute")
    order = relationship("Order")
    raised_by = relationship("User", foreign_keys=[raised_by_user_id], back_populates="disputes_raised")
    resolved_by = relationship("User", foreign_keys=[resolved_by_admin_id], back_populates="disputes_resolved")
    
    # Indexes
    __table_args__ = (
        Index('idx_dispute_status', 'status'),
        Index('idx_dispute_priority_status', 'priority', 'status'),
    )


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Notification Content
    type = Column(SQLEnum(NotificationType), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Additional Data (JSON for flexibility)
    data = Column(JSONB, nullable=True)  # e.g., {"order_id": 123, "product_name": "Tomatoes"}
    
    # Related Entities (optional foreign keys for quick lookup)
    related_order_id = Column(Integer, ForeignKey('orders.id', ondelete='SET NULL'), nullable=True)
    related_user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    # Deep link / Action
    action_url = Column(String(500), nullable=True)  # e.g., "/orders/123"
    
    # Status
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime, nullable=True)
    
    # SMS Status (if SMS was sent)
    sms_sent = Column(Boolean, default=False, nullable=False)
    sms_sent_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="notifications", foreign_keys=[user_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_notification_user_read', 'user_id', 'is_read', 'created_at'),
        Index('idx_notification_type', 'type', 'created_at'),
    )


class CropKnowledge(Base):
    __tablename__ = "crop_knowledge"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Crop Information
    crop_name = Column(String(100), nullable=False, index=True)
    category = Column(String(50), nullable=True)  # Vegetable, Fruit, Grain, etc.
    local_name_twi = Column(String(100), nullable=True)
    local_name_ga = Column(String(100), nullable=True)
    
    # Content
    content = Column(Text, nullable=False)
    content_type = Column(String(50), nullable=False)  # 'PLANTING', 'PEST_CONTROL', 'HARVEST', 'STORAGE'
    
    # Vector Embedding (for semantic search)
    embedding = Column(Text, nullable=True)  # Will be VECTOR(1536) after pgvector extension
    
    # Metadata
    source = Column(String(255), nullable=True)
    source_url = Column(Text, nullable=True)
    reliability_score = Column(DECIMAL(3, 2), default=0.00, nullable=True)  # 0.00 to 1.00
    
    # Tags for search
    tags = Column(ARRAY(String), nullable=True)
    
    # Season & Region
    applicable_regions = Column(ARRAY(String), nullable=True)  # ['Ashanti', 'Brong-Ahafo']
    planting_season = Column(String(50), nullable=True)
    
    # Language
    language = Column(String(10), default='en', nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Indexes
    __table_args__ = (
        Index('idx_crop_name', 'crop_name'),
        Index('idx_crop_category', 'category'),
    )


class KnowledgeEmbedding(Base):
    """
    Chunk embeddings for knowledge base retrieval
    Links to MongoDB KnowledgeDocument for full content
    Optimized for pgvector similarity search
    """
    __tablename__ = "knowledge_embeddings"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Links to MongoDB document
    document_id = Column(String(100), nullable=False, index=True)  # MongoDB document_id
    chunk_id = Column(String(100), nullable=False, unique=True)  # Unique chunk identifier

    # Chunk content (stored here for quick retrieval without MongoDB lookup)
    chunk_text = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)  # Position in document

    # Vector embedding - stored as text, cast to vector in queries
    # Will be VECTOR(1536) after pgvector extension
    embedding = Column(Text, nullable=True)

    # Classification for filtering
    document_type = Column(String(50), nullable=False, index=True)  # CROP_GUIDE, GENERAL_GUIDE, etc.
    topics = Column(ARRAY(String), nullable=True)  # Topics covered
    crops = Column(ARRAY(String), nullable=True)  # Related crops (if any)

    # Section info
    section_title = Column(String(255), nullable=True)

    # Search optimization
    search_text = Column(Text, nullable=True)  # Preprocessed text for full-text search

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index('idx_ke_document_id', 'document_id'),
        Index('idx_ke_document_type', 'document_type'),
        Index('idx_ke_topics', 'topics', postgresql_using='gin'),
        Index('idx_ke_crops', 'crops', postgresql_using='gin'),
    )


class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey('orders.id', ondelete='CASCADE'), unique=True, nullable=False, index=True)
    
    # Reviewer & Reviewed
    reviewer_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    reviewed_user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Rating & Review
    rating = Column(Integer, nullable=False)  # 1 to 5 stars
    review_text = Column(Text, nullable=True)
    
    # Categories (for detailed feedback)
    quality_rating = Column(Integer, nullable=True)  # 1-5
    communication_rating = Column(Integer, nullable=True)  # 1-5
    delivery_rating = Column(Integer, nullable=True)  # 1-5
    
    # Response from reviewed user
    response = Column(Text, nullable=True)
    response_at = Column(DateTime, nullable=True)
    
    # Status
    is_verified_purchase = Column(Boolean, default=True, nullable=False)
    is_flagged = Column(Boolean, default=False, nullable=False)
    flagged_reason = Column(Text, nullable=True)
    
    # Helpful votes
    helpful_count = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    order = relationship("Order")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviews_given")
    reviewed_user = relationship("User", foreign_keys=[reviewed_user_id], back_populates="reviews_received")
    
    # Indexes
    __table_args__ = (
        Index('idx_review_reviewed_user', 'reviewed_user_id', 'created_at'),
        Index('idx_review_rating', 'rating'),
    )

class SystemConfiguration(Base):
    __tablename__ = "system_configuration"
    
    id = Column(Integer, primary_key=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by_admin_id = Column(Integer, ForeignKey('users.id'), nullable=True)

class AdminAction(Base):
    __tablename__ = "admin_actions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    admin_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Action Details
    action_type = Column(SQLEnum(AdminActionType), nullable=False, index=True)
    target_type = Column(String(50), nullable=False)  # 'USER', 'ORDER', 'DISPUTE', 'PRODUCT'
    target_id = Column(Integer, nullable=False)
    
    # Details & Reasoning
    details = Column(JSONB, nullable=True)
    reason = Column(Text, nullable=True)
    
    # Impact
    before_state = Column(JSONB, nullable=True)  # State before action
    after_state = Column(JSONB, nullable=True)   # State after action
    
    # Timestamps
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    admin = relationship("User", back_populates="admin_actions")
    
    # Indexes
    __table_args__ = (
        Index('idx_admin_action_type_time', 'action_type', 'timestamp'),
        Index('idx_admin_action_target', 'target_type', 'target_id'),
    )


# ==================== HELPER FUNCTION ====================

def init_db(engine):
    """
    Initialize database - create all tables
    
    Usage:
        from sqlalchemy import create_engine
        from models import init_db
        
        engine = create_engine(DATABASE_URL)
        init_db(engine)
    """
    Base.metadata.create_all(engine)
    print("✅ All tables created successfully!")


def drop_all_tables(engine):
    """
    Drop all tables - USE WITH CAUTION!
    Only for development/testing
    """
    Base.metadata.drop_all(engine)
    print("⚠️  All tables dropped!")

def seed_system_config(db: Session):
    config = SystemConfiguration(
        key="AGENT_SYSTEM_PROMPT",
        value="""You are an AI farming assistant for SmartAgro, helping Ghanaian farmers.

Your capabilities:
- Weather forecasts (use get_weather tool)
- Crop knowledge (use search_crop_knowledge tool)
- Planting advice (use calculate_planting_date tool)

Context:
- User is in Ghana (tropical climate)
- Focus on local crops: tomatoes, yams, maize, cassava, plantain
- Provide practical, actionable advice
- Use simple language (some farmers have limited education)
- Consider rainy season (April-July, Sept-Nov)

Always:
- Ask for location if not provided
- Consider current season
- Provide specific numbers (dates, amounts, distances)
- Warn about common pests and diseases""",
        description="System prompt for AI farming assistant"
    )
    db.add(config)
    db.commit()