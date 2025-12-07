# backend/mongo_models.py
from pymongo import MongoClient, ASCENDING, DESCENDING, IndexModel, TEXT
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from bson import ObjectId
import os

# ==================== PYDANTIC MODELS (for validation) ====================

class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic v2"""
    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type, _handler):
        from pydantic_core import core_schema

        def validate(value):
            if not ObjectId.is_valid(value):
                raise ValueError("Invalid ObjectId")
            return ObjectId(value)

        return core_schema.no_info_plain_validator_function(
            validate,
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            )
        )


# ==================== BUYER-SELLER CHAT MESSAGES ====================

class ChatAttachment(BaseModel):
    """Attachment in a chat message"""
    type: str  # 'IMAGE', 'VOICE', 'DOCUMENT'
    url: str
    filename: Optional[str] = None
    size_bytes: Optional[int] = None
    mime_type: Optional[str] = None

class VoiceNote(BaseModel):
    """Voice note details"""
    url: str
    duration_seconds: int
    transcription: Optional[str] = None  # Auto-transcribed text
    language: Optional[str] = "en"
    transcription_confidence: Optional[float] = None

class MessageReaction(BaseModel):
    """Emoji reaction to a message"""
    user_id: int
    emoji: str  # '👍', '❤️', '😊', etc.
    timestamp: datetime

class ChatMessage(BaseModel):
    """Individual chat message between buyer and seller"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    
    # Conversation identification
    conversation_id: str  # Format: "buyer_{buyer_id}_seller_{seller_id}"
    
    # Participants
    sender_id: int
    receiver_id: int
    sender_type: str  # 'BUYER' or 'FARMER'
    
    # Message content
    message_type: str  # 'TEXT', 'IMAGE', 'VOICE', 'SYSTEM'
    text: Optional[str] = None
    
    # Rich content
    voice_note: Optional[VoiceNote] = None
    attachments: Optional[List[ChatAttachment]] = []
    
    # Related entities (for context)
    related_product_id: Optional[int] = None
    related_order_id: Optional[int] = None
    
    # Message status
    is_read: bool = False
    read_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    
    # Reactions & interactions
    reactions: Optional[List[MessageReaction]] = []
    
    # System messages (automated)
    is_system_message: bool = False
    system_event_type: Optional[str] = None  # 'ORDER_CREATED', 'PAYMENT_RECEIVED', etc.
    
    # Translation (if multi-language support)
    original_language: Optional[str] = "en"
    translations: Optional[Dict[str, str]] = {}  # {'tw': 'translated text', 'en': 'original'}
    
    # Metadata
    sent_from_device: Optional[str] = None  # 'web', 'mobile', 'pwa'
    ip_address: Optional[str] = None
    
    # Timestamps
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    edited_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    is_deleted: bool = False
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Conversation(BaseModel):
    """Conversation metadata between buyer and seller"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    
    conversation_id: str  # Same format as in messages
    
    # Participants
    buyer_id: int
    seller_id: int
    
    # Related context
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    order_id: Optional[int] = None
    
    # Conversation state
    status: str = "ACTIVE"  # 'ACTIVE', 'ARCHIVED', 'BLOCKED'
    is_archived_by_buyer: bool = False
    is_archived_by_seller: bool = False
    
    # Last message info (for quick display)
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    last_message_sender_id: Optional[int] = None
    
    # Unread counts
    unread_count_buyer: int = 0
    unread_count_seller: int = 0
    
    # Message count
    total_messages: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# ==================== AI AGENT CONVERSATIONS ====================

class ToolCall(BaseModel):
    """Tool called by the AI agent"""
    tool_name: str  # 'get_weather', 'search_crop_knowledge', 'calculate_planting_date'
    arguments: Dict[str, Any]
    result: Optional[Any] = None
    execution_time_ms: Optional[int] = None
    success: bool = True
    error_message: Optional[str] = None

class AgentMessage(BaseModel):
    """Message in agent conversation"""
    role: str  # 'user', 'assistant', 'system', 'tool'
    content: str
    tool_calls: Optional[List[ToolCall]] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class AgentConversation(BaseModel):
    """Complete conversation with farming AI assistant"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    
    # Farmer identification
    farmer_id: int
    farmer_name: Optional[str] = None
    farmer_region: Optional[str] = None
    
    # Conversation metadata
    conversation_title: Optional[str] = None  # Auto-generated from first message
    session_id: str  # Unique session identifier
    
    # Messages in conversation
    messages: List[AgentMessage] = []
    
    # Context tracking
    current_topic: Optional[str] = None  # 'weather', 'pest_control', 'planting', etc.
    detected_crops: Optional[List[str]] = []  # Crops mentioned in conversation
    detected_issues: Optional[List[str]] = []  # Problems farmer mentioned
    
    # Conversation state
    status: str = "ACTIVE"  # 'ACTIVE', 'COMPLETED', 'ARCHIVED'
    is_resolved: bool = False
    resolution_summary: Optional[str] = None
    
    # Statistics
    total_messages: int = 0
    total_tool_calls: int = 0
    average_response_time_ms: Optional[int] = None
    
    # Feedback
    farmer_rating: Optional[int] = None  # 1-5 stars
    farmer_feedback: Optional[str] = None
    
    # Agent configuration used
    model_used: Optional[str] = "gpt-4"
    temperature: Optional[float] = 0.7
    
    # Timestamps
    started_at: datetime = Field(default_factory=datetime.utcnow)
    last_interaction_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# ==================== PRODUCT FLEXIBLE ATTRIBUTES ====================

class ProductDetails(BaseModel):
    """Flexible product attributes that vary by product type"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    
    # Link to PostgreSQL product
    product_id: int
    product_name: str
    category: str
    
    # Flexible attributes (varies by product type)
    attributes: Dict[str, Any] = {}
    # Examples:
    # For tomatoes: {'variety': 'Pectomech', 'ripeness': 'Half-ripe', 'size': 'Medium'}
    # For yams: {'tuber_type': 'Yellow yam', 'size_category': 'Large', 'soil_type': 'Loamy'}
    # For maize: {'grain_type': 'White', 'moisture_content': '13%', 'grade': 'Grade 1'}
    
    # Long-form descriptions
    description: Optional[str] = None
    farming_practices: Optional[str] = None
    storage_instructions: Optional[str] = None
    cooking_suggestions: Optional[str] = None
    
    # Multiple images with metadata
    image_gallery: List[Dict[str, Any]] = []
    # Example: [
    #   {'url': 'https://...', 'caption': 'Tomatoes in crate', 'is_primary': True},
    #   {'url': 'https://...', 'caption': 'Close-up view', 'is_primary': False}
    # ]
    
    # Tags for search (generated from attributes + manual)
    tags: List[str] = []
    search_keywords: List[str] = []
    
    # SEO & Discoverability
    seo_description: Optional[str] = None
    
    # Quality indicators
    quality_badges: List[str] = []  # ['organic', 'pesticide-free', 'locally-grown']
    certifications: List[Dict[str, str]] = []
    # Example: [{'name': 'Organic Certified', 'issuer': 'Ghana Organic Board', 'valid_until': '2026-12-31'}]
    
    # Seasonal information
    best_season: Optional[str] = None
    harvest_season: Optional[str] = None
    
    # Nutritional info (optional)
    nutritional_info: Optional[Dict[str, Any]] = None
    # Example: {'calories': '18 per 100g', 'vitamin_c': 'High', 'fiber': 'Medium'}
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# ==================== USER ACTIVITY LOGS ====================

class DeviceInfo(BaseModel):
    """Device information"""
    type: str  # 'mobile', 'tablet', 'desktop'
    os: Optional[str] = None  # 'Android', 'iOS', 'Windows'
    browser: Optional[str] = None  # 'Chrome', 'Safari', 'Firefox'
    app_version: Optional[str] = None
    is_pwa: bool = False

class LocationInfo(BaseModel):
    """Location information"""
    region: Optional[str] = None
    district: Optional[str] = None
    ip_address: Optional[str] = None
    coordinates: Optional[Dict[str, float]] = None  # {'lat': 6.6666, 'lng': -1.6163}

class ActivityLog(BaseModel):
    """User activity tracking"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    
    # User identification
    user_id: int
    user_type: str  # 'FARMER', 'BUYER', 'ADMIN'
    session_id: Optional[str] = None
    
    # Event details
    event_type: str  # See event types below
    event_category: str  # 'NAVIGATION', 'INTERACTION', 'TRANSACTION', 'ERROR'
    
    # Event data (flexible JSON)
    event_data: Dict[str, Any] = {}
    # Examples:
    # PRODUCT_VIEW: {'product_id': 123, 'view_duration_seconds': 45, 'came_from': 'search'}
    # SEARCH: {'query': 'tomatoes', 'results_count': 15, 'filters': {'region': 'Ashanti'}}
    # ORDER_CREATED: {'order_id': 456, 'amount': 150.00, 'product_count': 3}
    
    # Page/screen context
    page_url: Optional[str] = None
    page_title: Optional[str] = None
    referrer: Optional[str] = None
    
    # Device & location
    device: Optional[DeviceInfo] = None
    location: Optional[LocationInfo] = None
    
    # Performance metrics
    page_load_time_ms: Optional[int] = None
    api_response_time_ms: Optional[int] = None
    
    # Error tracking (if event_category is ERROR)
    error_message: Optional[str] = None
    error_stack: Optional[str] = None
    
    # Timestamp
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# ==================== SEARCH HISTORY ====================

class SearchQuery(BaseModel):
    """User search history"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    
    user_id: int
    
    # Search details
    query_text: str
    search_type: str  # 'PRODUCT', 'FARMER', 'LOCATION'
    
    # Filters applied
    filters: Optional[Dict[str, Any]] = {}
    # Example: {'category': 'VEGETABLES', 'region': 'Ashanti', 'price_max': 100}
    
    # Results
    results_count: int = 0
    results_clicked: List[int] = []  # Product IDs clicked
    first_result_clicked_position: Optional[int] = None
    
    # Search quality
    search_duration_ms: Optional[int] = None
    did_refine_search: bool = False
    refinement_query: Optional[str] = None
    
    # Conversion
    led_to_order: bool = False
    order_id: Optional[int] = None
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# ==================== KNOWLEDGE BASE DOCUMENTS ====================

class DocumentChunk(BaseModel):
    """A chunk of a knowledge document with embedding reference"""
    chunk_id: str  # Unique ID for this chunk
    chunk_index: int  # Position in document
    text: str  # Chunk content
    section_title: Optional[str] = None  # Section heading if detected
    topics: List[str] = []  # Topics covered in this chunk
    embedding_id: Optional[int] = None  # Reference to pgvector embedding ID
    char_start: int = 0
    char_end: int = 0


class DocumentMetadata(BaseModel):
    """Flexible metadata for knowledge documents"""
    language: str = "en"
    regions: List[str] = []  # Applicable regions (Ghana, Ashanti, etc.)
    seasons: List[str] = []  # Applicable seasons
    difficulty_level: Optional[str] = None  # beginner, intermediate, advanced
    last_reviewed: Optional[datetime] = None
    reviewer: Optional[str] = None
    version: str = "1.0"
    custom_fields: Dict[str, Any] = {}  # Any additional metadata


class KnowledgeDocument(BaseModel):
    """
    Full knowledge document stored in MongoDB
    Supports any content type - crop guides, general practices, FAQs, etc.
    """
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

    # Document identification
    document_id: str  # Unique document identifier (e.g., "maize_guide_v1")
    title: str  # Document title
    description: Optional[str] = None  # Brief summary

    # Document classification
    document_type: str  # CROP_GUIDE, GENERAL_GUIDE, PEST_REFERENCE, FAQ, POLICY, EQUIPMENT, MARKET_INFO
    topics: List[str] = []  # Main topics: ["maize", "planting", "pest_control"]
    crops: List[str] = []  # Related crops (empty for general guides)
    categories: List[str] = []  # Content categories: ["PLANTING", "HARVESTING", "STORAGE"]

    # Source information
    source_file: str  # Original filename
    source_url: Optional[str] = None  # DO Spaces URL for original file
    file_type: str = "markdown"  # markdown, pdf, txt
    file_size_bytes: Optional[int] = None

    # Full content
    raw_content: str  # Original full text
    processed_content: Optional[str] = None  # Cleaned/processed text

    # Chunks for retrieval
    chunks: List[DocumentChunk] = []
    total_chunks: int = 0

    # Searchability
    search_keywords: List[str] = []  # Extracted keywords
    search_text: Optional[str] = None  # Concatenated searchable text

    # Metadata
    metadata: DocumentMetadata = DocumentMetadata()

    # Status
    status: str = "ACTIVE"  # ACTIVE, ARCHIVED, DRAFT, PROCESSING
    is_indexed: bool = False  # Whether embeddings are created
    indexing_error: Optional[str] = None

    # Usage tracking
    view_count: int = 0
    citation_count: int = 0  # Times referenced in agent responses
    helpful_votes: int = 0
    last_accessed: Optional[datetime] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    indexed_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ChunkEmbedding(BaseModel):
    """
    Lightweight reference stored in PostgreSQL with embedding
    Links to MongoDB document for full content
    """
    # This is the structure that maps to the PostgreSQL table
    # embedding_id: auto-generated
    # document_id: str - links to MongoDB KnowledgeDocument
    # chunk_id: str - links to specific chunk
    # embedding: vector - the actual embedding
    # topics: list - for filtering
    # document_type: str - for filtering
    pass


# ==================== MONGODB CONNECTION & SETUP ====================

class MongoDB:
    """MongoDB connection manager"""
    
    def __init__(self):
        self.client = None
        self.db = None
        self.collections = {}
    
    def connect(self, connection_string: str = None, database_name: str = "smartagro"):
        """Connect to MongoDB"""
        if connection_string is None:
            connection_string = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
        
        self.client = MongoClient(connection_string)
        self.db = self.client[database_name]
        
        # Initialize collections
        self.collections = {
            'chat_messages': self.db['chat_messages'],
            'conversations': self.db['conversations'],
            'agent_conversations': self.db['agent_conversations'],
            'product_details': self.db['product_details'],
            'activity_logs': self.db['activity_logs'],
            'search_queries': self.db['search_queries'],
            'knowledge_documents': self.db['knowledge_documents'],
        }
        
        print(f"✅ Connected to MongoDB: {database_name}")
    
    def create_indexes(self):
        """Create all indexes for optimal performance"""
        
        # ========== CHAT MESSAGES INDEXES ==========
        self.collections['chat_messages'].create_indexes([
            IndexModel([("conversation_id", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("sender_id", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("receiver_id", ASCENDING), ("is_read", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("related_product_id", ASCENDING)]),
            IndexModel([("related_order_id", ASCENDING)]),
            IndexModel([("timestamp", DESCENDING)]),
            IndexModel([("text", TEXT)]),  # Full-text search
        ])
        
        # ========== CONVERSATIONS INDEXES ==========
        self.collections['conversations'].create_indexes([
            IndexModel([("conversation_id", ASCENDING)], unique=True),
            IndexModel([("buyer_id", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("seller_id", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("last_message_at", DESCENDING)]),
            IndexModel([("product_id", ASCENDING)]),
            IndexModel([("order_id", ASCENDING)]),
        ])
        
        # ========== AGENT CONVERSATIONS INDEXES ==========
        self.collections['agent_conversations'].create_indexes([
            IndexModel([("farmer_id", ASCENDING), ("started_at", DESCENDING)]),
            IndexModel([("session_id", ASCENDING)], unique=True),
            IndexModel([("status", ASCENDING), ("started_at", DESCENDING)]),
            IndexModel([("current_topic", ASCENDING)]),
            IndexModel([("last_interaction_at", DESCENDING)]),
            IndexModel([("detected_crops", ASCENDING)]),
        ])
        
        # ========== PRODUCT DETAILS INDEXES ==========
        self.collections['product_details'].create_indexes([
            IndexModel([("product_id", ASCENDING)], unique=True),
            IndexModel([("category", ASCENDING)]),
            IndexModel([("tags", ASCENDING)]),
            IndexModel([("search_keywords", ASCENDING)]),
            IndexModel([("description", TEXT), ("farming_practices", TEXT)]),  # Full-text
        ])
        
        # ========== ACTIVITY LOGS INDEXES ==========
        self.collections['activity_logs'].create_indexes([
            IndexModel([("user_id", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("event_type", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("event_category", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("session_id", ASCENDING)]),
            IndexModel([("timestamp", DESCENDING)]),
        ])
        
        # ========== SEARCH QUERIES INDEXES ==========
        self.collections['search_queries'].create_indexes([
            IndexModel([("user_id", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("query_text", TEXT)]),
            IndexModel([("timestamp", DESCENDING)]),
        ])

        # ========== KNOWLEDGE DOCUMENTS INDEXES ==========
        self.collections['knowledge_documents'].create_indexes([
            IndexModel([("document_id", ASCENDING)], unique=True),
            IndexModel([("document_type", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("topics", ASCENDING)]),
            IndexModel([("crops", ASCENDING)]),
            IndexModel([("categories", ASCENDING)]),
            IndexModel([("status", ASCENDING), ("is_indexed", ASCENDING)]),
            IndexModel([("source_file", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
            IndexModel([("updated_at", DESCENDING)]),
            IndexModel([
                ("title", TEXT),
                ("description", TEXT),
                ("search_text", TEXT),
                ("search_keywords", TEXT)
            ], name="knowledge_text_search"),
        ])

        print("✅ All MongoDB indexes created successfully!")
    
    def get_collection(self, name: str):
        """Get a collection by name"""
        return self.collections.get(name)
    
    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            print("✅ MongoDB connection closed")


# ==================== HELPER FUNCTIONS ====================

# Initialize MongoDB connection (singleton pattern)
mongo_db = MongoDB()

def init_mongodb(connection_string: str = None, database_name: str = "smartagro"):
    """Initialize MongoDB connection and indexes"""
    mongo_db.connect(connection_string, database_name)
    mongo_db.create_indexes()


def get_mongo_collection(name: str):
    """Get MongoDB collection"""
    return mongo_db.get_collection(name)


# ==================== CRUD HELPERS ====================

class ChatService:
    """Service for chat operations"""
    
    @staticmethod
    def create_conversation(buyer_id: int, seller_id: int, product_id: int = None) -> str:
        """Create or get existing conversation"""
        conversation_id = f"buyer_{buyer_id}_seller_{seller_id}"
        
        conversations = get_mongo_collection('conversations')
        
        existing = conversations.find_one({"conversation_id": conversation_id})
        if existing:
            return conversation_id
        
        conversation = Conversation(
            conversation_id=conversation_id,
            buyer_id=buyer_id,
            seller_id=seller_id,
            product_id=product_id
        )
        
        conversations.insert_one(conversation.dict(by_alias=True, exclude={'id'}))
        return conversation_id
    
    @staticmethod
    def send_message(
        conversation_id: str,
        sender_id: int,
        receiver_id: int,
        sender_type: str,
        text: str = None,
        message_type: str = "TEXT",
        **kwargs
    ) -> str:
        """Send a chat message"""
        messages = get_mongo_collection('chat_messages')
        conversations = get_mongo_collection('conversations')
        
        message = ChatMessage(
            conversation_id=conversation_id,
            sender_id=sender_id,
            receiver_id=receiver_id,
            sender_type=sender_type,
            text=text,
            message_type=message_type,
            **kwargs
        )
        
        result = messages.insert_one(message.dict(by_alias=True, exclude={'id'}))
        
        # Update conversation metadata
        conversations.update_one(
            {"conversation_id": conversation_id},
            {
                "$set": {
                    "last_message": text[:100] if text else None,
                    "last_message_at": datetime.utcnow(),
                    "last_message_sender_id": sender_id,
                    "updated_at": datetime.utcnow()
                },
                "$inc": {
                    "total_messages": 1,
                    "unread_count_buyer" if sender_type == "FARMER" else "unread_count_seller": 1
                }
            }
        )
        
        return str(result.inserted_id)
    
    @staticmethod
    def get_conversation_messages(conversation_id: str, limit: int = 50, skip: int = 0) -> List[Dict]:
        """Get messages in a conversation"""
        messages = get_mongo_collection('chat_messages')
        
        cursor = messages.find(
            {"conversation_id": conversation_id, "is_deleted": False}
        ).sort("timestamp", DESCENDING).skip(skip).limit(limit)
        
        return list(cursor)
    
    @staticmethod
    def mark_messages_read(conversation_id: str, user_id: int):
        """Mark all messages as read for a user"""
        messages = get_mongo_collection('chat_messages')
        conversations = get_mongo_collection('conversations')
        
        messages.update_many(
            {
                "conversation_id": conversation_id,
                "receiver_id": user_id,
                "is_read": False
            },
            {
                "$set": {
                    "is_read": True,
                    "read_at": datetime.utcnow()
                }
            }
        )
        
        # Reset unread count
        user_type = "buyer" if user_id else "seller"  # Determine from conversation
        conversations.update_one(
            {"conversation_id": conversation_id},
            {"$set": {f"unread_count_{user_type}": 0}}
        )


class AgentService:
    """Service for AI agent operations"""
    
    @staticmethod
    def create_conversation(farmer_id: int, session_id: str = None) -> str:
        """Create new agent conversation"""
        import uuid
        
        if session_id is None:
            session_id = str(uuid.uuid4())
        
        conversation = AgentConversation(
            farmer_id=farmer_id,
            session_id=session_id
        )
        
        agent_conversations = get_mongo_collection('agent_conversations')
        result = agent_conversations.insert_one(
            conversation.dict(by_alias=True, exclude={'id'})
        )
        
        return session_id
    
    @staticmethod
    def add_message(
        session_id: str,
        role: str,
        content: str,
        tool_calls: List[Dict] = None
    ):
        """Add message to agent conversation"""
        agent_conversations = get_mongo_collection('agent_conversations')
        
        message = AgentMessage(
            role=role,
            content=content,
            tool_calls=[ToolCall(**tc) for tc in tool_calls] if tool_calls else []
        )
        
        agent_conversations.update_one(
            {"session_id": session_id},
            {
                "$push": {"messages": message.dict()},
                "$set": {"last_interaction_at": datetime.utcnow()},
                "$inc": {
                    "total_messages": 1,
                    "total_tool_calls": len(tool_calls) if tool_calls else 0
                }
            }
        )
    
    @staticmethod
    def get_conversation_history(session_id: str) -> List[Dict]:
        """Get conversation history"""
        agent_conversations = get_mongo_collection('agent_conversations')
        
        conversation = agent_conversations.find_one({"session_id": session_id})
        return conversation['messages'] if conversation else []


class ProductDetailsService:
    """Service for product details operations"""
    
    @staticmethod
    def create_or_update(product_id: int, data: Dict):
        """Create or update product details"""
        product_details = get_mongo_collection('product_details')
        
        details = ProductDetails(
            product_id=product_id,
            **data
        )
        
        product_details.update_one(
            {"product_id": product_id},
            {"$set": details.dict(by_alias=True, exclude={'id'})},
            upsert=True
        )
    
    @staticmethod
    def get_by_product_id(product_id: int) -> Optional[Dict]:
        """Get product details"""
        product_details = get_mongo_collection('product_details')
        return product_details.find_one({"product_id": product_id})


class ActivityLogService:
    """Service for activity logging"""
    
    @staticmethod
    def log_event(
        user_id: int,
        event_type: str,
        event_category: str,
        event_data: Dict,
        **kwargs
    ):
        """Log user activity"""
        activity_logs = get_mongo_collection('activity_logs')
        
        log = ActivityLog(
            user_id=user_id,
            event_type=event_type,
            event_category=event_category,
            event_data=event_data,
            **kwargs
        )
        
        activity_logs.insert_one(log.dict(by_alias=True, exclude={'id'}))


# ==================== EVENT TYPES REFERENCE ====================

class EventTypes:
    """Reference for activity log event types"""
    
    # Navigation events
    PAGE_VIEW = "PAGE_VIEW"
    PRODUCT_VIEW = "PRODUCT_VIEW"
    PROFILE_VIEW = "PROFILE_VIEW"
    
    # Search events
    SEARCH = "SEARCH"
    FILTER_APPLIED = "FILTER_APPLIED"
    
    # Interaction events
    PRODUCT_CLICK = "PRODUCT_CLICK"
    CHAT_OPENED = "CHAT_OPENED"
    MESSAGE_SENT = "MESSAGE_SENT"
    ADD_TO_CART = "ADD_TO_CART"
    REMOVE_FROM_CART = "REMOVE_FROM_CART"
    
    # Transaction events
    ORDER_CREATED = "ORDER_CREATED"
    PAYMENT_INITIATED = "PAYMENT_INITIATED"
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED"
    ORDER_CANCELLED = "ORDER_CANCELLED"
    
    # Agent events
    AGENT_QUERY = "AGENT_QUERY"
    AGENT_TOOL_CALLED = "AGENT_TOOL_CALLED"
    
    # Error events
    ERROR_OCCURRED = "ERROR_OCCURRED"
    API_ERROR = "API_ERROR"
    PAYMENT_FAILED = "PAYMENT_FAILED"


# ==================== USAGE EXAMPLES ====================

if __name__ == "__main__":
    # Initialize MongoDB
    init_mongodb()
    
    # Example: Create conversation and send message
    conversation_id = ChatService.create_conversation(
        buyer_id=1,
        seller_id=2,
        product_id=100
    )
    
    ChatService.send_message(
        conversation_id=conversation_id,
        sender_id=1,
        receiver_id=2,
        sender_type="BUYER",
        text="Hello, is this product still available?",
        related_product_id=100
    )
    
    # Example: Create agent conversation
    session_id = AgentService.create_conversation(farmer_id=2)
    
    AgentService.add_message(
        session_id=session_id,
        role="user",
        content="What's the weather forecast for this week?"
    )
    
    AgentService.add_message(
        session_id=session_id,
        role="assistant",
        content="Let me check the weather for you.",
        tool_calls=[{
            "tool_name": "get_weather",
            "arguments": {"location": "Techiman", "days": 7},
            "result": {"temp": "28°C", "condition": "Partly cloudy"},
            "success": True
        }]
    )
    
    # Example: Add product details
    ProductDetailsService.create_or_update(
        product_id=100,
        data={
            "product_name": "Fresh Tomatoes",
            "category": "VEGETABLES",
            "attributes": {
                "variety": "Pectomech",
                "ripeness_level": "Half-ripe",
                "size": "Medium"
            },
            "description": "Fresh tomatoes from Techiman",
            "tags": ["fresh", "organic", "local"],
            "image_gallery": [
                {"url": "https://...", "caption": "Crate of tomatoes", "is_primary": True}
            ]
        }
    )
    
    # Example: Log activity
    ActivityLogService.log_event(
        user_id=1,
        event_type=EventTypes.PRODUCT_VIEW,
        event_category="INTERACTION",
        event_data={
            "product_id": 100,
            "view_duration_seconds": 45,
            "came_from": "search"
        },
        page_url="/products/100",
        device={"type": "mobile", "os": "Android"}
    )
    
    print("✅ MongoDB schemas initialized and examples executed!")