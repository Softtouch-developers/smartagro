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
import logging

logger = logging.getLogger(__name__)


def seed_users(db: Session):
    """Create test users"""
    logger.info("Seeding users...")

    # Check if users already exist
    existing_admin = db.query(User).filter(User.email == "admin@smartagro.com").first()
    if existing_admin:
        logger.info("Users already exist, skipping user seeding")
        farmer1 = db.query(User).filter(User.email == "kwame@example.com").first()
        farmer2 = db.query(User).filter(User.email == "ama@example.com").first()
        buyer = db.query(User).filter(User.email == "esi@example.com").first()
        return farmer1, farmer2, buyer, existing_admin

    # Admin user
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
        district="Accra Metro"
    )
    db.add(admin)
    
    # Farmer 1 (Tomato farmer in Techiman)
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
        region="Brong-Ahafo",
        district="Techiman",
        town_city="Techiman",
        farm_name="Kwame's Fresh Farm",
        farm_size_acres=5.5,
        years_farming=15,
        bank_name="GCB Bank",
        bank_code="040",
        account_number="1234567890",
        account_name="Kwame Mensah"
    )
    db.add(farmer1)
    
    # Farmer 2 (Yam farmer in Kumasi)
    farmer2 = User(
        email="ama@example.com",
        phone_number="+233242222222",
        password_hash=hash_password("Farmer123!"),
        full_name="Ama Serwaa",
        user_type=UserType.FARMER,
        email_verified=True,
        phone_verified=True,
        is_verified=True,
        account_status=AccountStatus.ACTIVE,
        region="Ashanti",
        district="Kumasi Metro",
        town_city="Kumasi",
        farm_name="Serwaa's Organic Farm",
        farm_size_acres=8.0,
        years_farming=10,
        bank_name="Ecobank",
        bank_code="130",
        account_number="0987654321",
        account_name="Ama Serwaa"
    )
    db.add(farmer2)
    
    # Buyer (Restaurant owner in Accra)
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
        district="Accra Metro",
        town_city="Accra",
        wallet_balance=500.00
    )
    db.add(buyer)
    
    db.commit()
    logger.info("✅ Users seeded")
    return farmer1, farmer2, buyer, admin


def seed_products(db: Session, farmer1: User, farmer2: User):
    """Create test products"""
    logger.info("Seeding products...")

    # Check if products already exist
    existing_product = db.query(Product).filter(Product.product_name == "Fresh Tomatoes").first()
    if existing_product:
        logger.info("Products already exist, skipping product seeding")
        return

    # Farmer 1's tomatoes
    tomatoes = Product(
        seller_id=farmer1.id,
        product_name="Fresh Tomatoes",
        category=ProductCategory.VEGETABLES,
        description="Fresh, organic tomatoes harvested daily from our farm in Techiman",
        quantity_available=150.00,
        unit_of_measure=UnitOfMeasure.KG,
        price_per_unit=8.50,
        minimum_order_quantity=10.00,
        harvest_date=datetime.now().date() - timedelta(days=1),
        expected_shelf_life_days=7,
        farm_location="Techiman Valley",
        region="Brong-Ahafo",
        district="Techiman",
        is_organic=True,
        status=ProductStatus.AVAILABLE,
        is_featured=True
    )
    db.add(tomatoes)
    
    # Farmer 2's yams
    yams = Product(
        seller_id=farmer2.id,
        product_name="Yellow Yam",
        category=ProductCategory.TUBERS,
        description="High-quality yellow yams, perfect for fufu or boiling",
        quantity_available=200.00,
        unit_of_measure=UnitOfMeasure.KG,
        price_per_unit=5.00,
        minimum_order_quantity=25.00,
        harvest_date=datetime.now().date() - timedelta(days=5),
        expected_shelf_life_days=30,
        farm_location="Kumasi Outskirts",
        region="Ashanti",
        district="Kumasi Metro",
        is_organic=False,
        status=ProductStatus.AVAILABLE,
        is_featured=True
    )
    db.add(yams)
    
    # More products
    maize = Product(
        seller_id=farmer1.id,
        product_name="White Maize",
        category=ProductCategory.GRAINS,
        description="Premium white maize, dry and ready for milling",
        quantity_available=500.00,
        unit_of_measure=UnitOfMeasure.KG,
        price_per_unit=3.50,
        minimum_order_quantity=50.00,
        harvest_date=datetime.now().date() - timedelta(days=10),
        expected_shelf_life_days=180,
        farm_location="Techiman Valley",
        region="Brong-Ahafo",
        district="Techiman",
        status=ProductStatus.AVAILABLE
    )
    db.add(maize)
    
    db.commit()
    logger.info("✅ Products seeded")


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
        farmer1, farmer2, buyer, admin = seed_users(db)
        seed_products(db, farmer1, farmer2)
        seed_system_config(db)
        seed_crop_knowledge(db)
        
        logger.info("✅ All seed data created successfully!")
        logger.info("\n" + "="*50)
        logger.info("Test Accounts:")
        logger.info("="*50)
        logger.info("Admin:")
        logger.info("  Email: admin@smartagro.com")
        logger.info("  Password: Admin123!")
        logger.info("\nFarmer 1 (Tomatoes):")
        logger.info("  Email: kwame@example.com")
        logger.info("  Password: Farmer123!")
        logger.info("\nFarmer 2 (Yams):")
        logger.info("  Email: ama@example.com")
        logger.info("  Password: Farmer123!")
        logger.info("\nBuyer:")
        logger.info("  Email: esi@example.com")
        logger.info("  Password: Buyer123!")
        logger.info("="*50 + "\n")
        
    except Exception as e:
        logger.error(f"❌ Seeding failed: {e}", exc_info=True)
        db.rollback()
        raise


if __name__ == "__main__":
    from database import SessionLocal
    
    db = SessionLocal()
    seed_all(db)
    db.close()