# SmartAgro Backend API

A digital marketplace platform connecting Ghanaian farmers directly with buyers to reduce post-harvest losses.

## 🎯 Project Overview

**Timeline:** 3-week capstone project (Dec 4-17, 2025)  
**Institution:** Ashesi University - ICS 530 Software Engineering Essentials  
**Team:** Soft Touch (Sam, Nicole, Mohammed, Michael)

## 🏗️ Architecture

- **Pattern:** Modular Monolithic Architecture
- **Backend:** FastAPI (Python 3.11+)
- **Databases:** 
  - PostgreSQL 15 (structured data + pgvector)
  - MongoDB Atlas (flexible documents)
  - Redis (sessions, cache)
- **Storage:** DigitalOcean Spaces
- **Deployment:** DigitalOcean App Platform

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Docker & Docker Compose (for local databases)
- Git

**Note:** PostgreSQL 15, MongoDB 7, and Redis 7 are provided via Docker Compose. No need to install them separately.

### Local Setup
```bash
# 1. Clone repository
git clone https://github.com/nanayeb34/smartagro.git
cd smartagro/backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.example .env
# Edit .env with your API keys (Paystack, mNotify, OpenRouter, OpenWeather)
# Database URLs are pre-configured for docker-compose

# 5. Start databases with Docker
docker-compose up -d
# This starts PostgreSQL (port 5433), MongoDB (port 27017), and Redis (port 6379)
# Wait ~10 seconds for services to initialize

# 6. Run database migrations
alembic upgrade head

# 7. (Optional) Seed test data
# Set SEED_DATABASE=True in .env, then restart server

# 8. Start development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Visit http://localhost:8000/docs for API documentation.

### Verify Setup
```bash
# Check all services are running
docker-compose ps

# Test health endpoint
curl http://localhost:8000/health

# Check database connections
docker-compose logs postgres
docker-compose logs mongodb
```

### Stopping Services
```bash
# Stop all containers
docker-compose down

# Stop and remove volumes (reset databases)
docker-compose down -v
```

## 📁 Project Structure
```
backend/
├── main.py                 # FastAPI application
├── config.py               # Configuration
├── database.py             # Database connections
├── models.py              # PostgreSQL models
├── mongo_models.py         # MongoDB schemas
├── requirements.txt        # Dependencies
│
├── modules/                # Feature modules
│   ├── auth/              # Authentication
│   ├── products/          # Product management
│   ├── orders/            # Order processing
│   ├── escrow/            # Payment & escrow
│   ├── chat/              # Messaging
│   ├── agent/             # AI assistant
│   ├── notifications/     # Notifications
│   └── admin/             # Admin panel
│
├── integrations/          # External APIs
│   ├── paystack.py
│   ├── mnotify.py
│   ├── openrouter.py
│   └── weather.py
│
└── tests/                 # Test suite
```

## 🔑 Key Features

### For Farmers
- List products with flexible attributes
- Track orders and inventory
- Chat with buyers
- AI farming assistant (weather, crop advice)
- Receive payments via escrow

### For Buyers
- Browse and search products
- Place orders with escrow protection
- Chat with farmers
- Track deliveries
- Raise disputes if needed

### For Admins
- Resolve disputes
- Manage users
- Platform analytics
- Audit logs

## 🔌 API Endpoints
See [API endpoints](backend/API_ENDPOINTS.md) for detailed breakdown of all endpoints and full API docs at `/docs`

## 🧪 Testing
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=modules --cov-report=html

# Run specific test file
pytest tests/test_auth.py
```

## 🗄️ Database Migrations
```bash
# Create migration
alembic revision --autogenerate -m "Add new table"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1

# View history
alembic history
```

## 🔐 Environment Variables

See `.env.example` for all required variables.


## 🚀 Deployment

### DigitalOcean App Platform

Deployment is automatic on push to `main` branch.

**Build command:**
```bash
pip install -r requirements.txt && alembic upgrade head
```

**Run command:**
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Health check:** `/health`

### Manual Deployment
```bash
# 1. Push to main
git push origin main

# 2. Verify deployment in DO dashboard
# 3. Check logs for errors
# 4. Test production endpoints
```

## 📊 Monitoring

- **Health Check:** `GET /health`
- **Metrics:** Available in DO dashboard
- **Logs:** `tail -f app.log` or DO console

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready

# Check connection string
echo $DATABASE_URL
```

### Migration Errors
```bash
# Reset database (DEV ONLY)
alembic downgrade base
alembic upgrade head

# Check migration history
alembic history
```

### Import Errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --upgrade
```

## 📚 Documentation

- [API Documentation](http://localhost:8000/docs) - Swagger UI
- [Architecture Diagrams](./diagrams/) - PlantUML diagrams
- [CLAUDE.md](./CLAUDE.md) - Detailed implementation guide
- [Database Schema](./models.py) - SQLAlchemy models

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Implement feature with tests
3. Run tests: `pytest`
4. Commit: `git commit -m "Add feature"`
5. Push: `git push origin feature/name`
6. Create Pull Request

## 📝 License

This project is part of an academic capstone and is not licensed for commercial use.

## 👥 Team

- **Nana Sam Yeboah** - Backend
- **Nicole Nanka-Bruce** - Frontend
- **Mohammed Jalloh** - Backend
- **Michael Kwabena Sylvester** - Design

## 📞 Support

For questions or issues, create an issue in the repository.

---

**Built with ❤️ for Ghanaian farmers**