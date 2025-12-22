# 🌱 SmartAgro

**A digital marketplace connecting Ghanaian farmers directly with buyers**

[![Live Demo](https://img.shields.io/badge/Frontend-Live-green)](https://smartagro-frontend-925054869230.us-central1.run.app)
[![API](https://img.shields.io/badge/API-Live-blue)](https://smartagro-backend-925054869230.us-central1.run.app)
[![Docs](https://img.shields.io/badge/API%20Docs-Swagger-orange)](https://smartagro-backend-925054869230.us-central1.run.app/docs)

<p align="center">
  <img src="documentation/diagrams/images/logo.png" alt="SmartAgro Logo" width="200"/>
</p>

## 🔗 Live Deployment

| Service | URL |
|---------|-----|
| **Frontend (PWA)** | https://smartagro-frontend-925054869230.us-central1.run.app |
| **Backend API** | https://smartagro-backend-925054869230.us-central1.run.app |
| **API Documentation** | https://smartagro-backend-925054869230.us-central1.run.app/docs |

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Frontend Guide](#-frontend-guide)
- [Database Schema](#-database-schema)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Team](#-team)
- [License](#-license)

---

## 🌍 Overview

SmartAgro is a comprehensive agricultural marketplace platform designed specifically for the Ghanaian market. It bridges the gap between local farmers and buyers by providing:

- **Direct farmer-to-buyer transactions** eliminating middlemen
- **Secure escrow-based payments** via Paystack integration
- **AI-powered farming assistant** with localized agricultural knowledge
- **Real-time communication** between farmers and buyers
- **Mobile-first PWA** accessible on any device

The associated research paper can be found [here](https://github.com/Ashesi-Org/Team-SoftTouch/documentation/research paper/SmartAgro_ACM_Research_Paper.pdf)

### The Problem We Solve

Ghanaian farmers face challenges reaching urban buyers, while consumers lack access to fresh, farm-direct produce. Traditional markets involve multiple middlemen, reducing farmer profits and increasing consumer prices.

### Our Solution

SmartAgro creates a digital marketplace where farmers can list products, buyers can browse and purchase, and all transactions are secured through escrow until delivery confirmation.

**Timeline:** Ashesi University Capstone Project (Dec 2024 - 2025)  
**Institution:** ICS 530 Software Engineering Essentials  
**Team:** Soft Touch (Sam, Nicole, Mohammed, Michael)

---

## ✨ Features

### 👨‍🌾 For Farmers

| Feature | Description |
|---------|-------------|
| **Product Management** | List, edit, and manage agricultural products with images |
| **Order Dashboard** | Track orders, manage shipments, view earnings |
| **AI Farming Assistant** | Get expert advice on crops, pests, weather, and best practices |
| **Earnings Tracking** | Monitor sales, pending payments, and withdrawal history |
| **Direct Chat** | Communicate directly with buyers |
| **Mode Switching** | Switch between Farmer and Buyer modes seamlessly |

### 🛒 For Buyers

| Feature | Description |
|---------|-------------|
| **Product Discovery** | Search, filter, and browse products by category/region |
| **Shopping Cart** | Multi-item cart from single farmer with 8-hour expiry |
| **Secure Checkout** | Escrow-protected payments via Paystack |
| **Order Tracking** | Real-time order status updates |
| **Wishlist** | Save products for later |
| **Chat with Farmers** | Ask questions before purchasing |

### 👑 For Administrators

| Feature | Description |
|---------|-------------|
| **Dashboard Analytics** | Platform-wide statistics and metrics |
| **User Management** | Verify, suspend, or activate users |
| **Dispute Resolution** | Handle buyer-seller disputes with evidence |
| **Product Moderation** | Review and manage listings |
| **System Configuration** | Manage platform fees, messages, AI prompts |
| **Audit Logs** | Track all administrative actions |

### 🤖 AI Farming Agent

The intelligent assistant powered by **Gemini 2.5 Flash** helps farmers with:

- **Crop Cultivation** - Planting, irrigation, fertilization guides
- **Pest & Disease Control** - Identification and treatment recommendations
- **Weather Insights** - Location-based forecasts for Ghana regions
- **Harvest Planning** - Optimal timing calculations
- **Post-Harvest Handling** - Storage and preservation tips
- **Market Insights** - Access to platform data (orders, earnings, buyers)
- **Multimodal Support** - Analyze images of crops/pests, process voice notes

**Knowledge Base Covers:**
- Tomato, Maize, Rice, Pepper, Onions, Cabbage, Carrot, Cucumber, Lettuce
- Compost & Soil Nutrients
- Post-Harvest Practices

---

## 🛠 Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.115+ | High-performance Python web framework |
| **PostgreSQL** | 15 | Primary relational database |
| **pgvector** | - | Vector similarity search for AI embeddings |
| **MongoDB Atlas** | 7+ | Chat messages and agent sessions |
| **Redis** | 7+ | Caching, sessions, rate limiting |
| **SQLAlchemy** | 2.0+ | ORM for database operations |
| **Alembic** | - | Database migrations |
| **Pydantic** | 2.0+ | Data validation and settings |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19 | UI component library |
| **TypeScript** | 5.6+ | Type-safe JavaScript |
| **Vite** | 7 | Fast build tool and dev server |
| **TailwindCSS** | 4+ | Utility-first CSS framework |
| **React Router** | 7 | Client-side routing |
| **Zustand** | - | Lightweight state management |
| **Axios** | - | HTTP client |
| **PWA (Vite Plugin)** | - | Installable, offline-capable app |

### External Services

| Service | Purpose |
|---------|---------|
| **Paystack** | Payment processing (Ghana Mobile Money, Cards) |
| **OpenRouter** | AI model access (Gemini 2.5 Flash) |
| **OpenWeather** | Weather forecasts for Ghana |
| **mNotify** | SMS notifications (Ghana networks) |
| **DigitalOcean Spaces** | File/image storage (production) |
| **GCP Cloud Run** | Container hosting |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SMARTAGRO PLATFORM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Frontend   │    │   Backend    │    │  AI Agent    │       │
│  │  React PWA   │◄──►│   FastAPI    │◄──►│  Gemini 2.5  │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         │                   ▼                   │                │
│         │         ┌─────────────────┐           │                │
│         │         │   PostgreSQL    │           │                │
│         │         │  + pgvector     │◄──────────┘                │
│         │         └─────────────────┘                            │
│         │                   │                                    │
│         ▼                   ▼                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Paystack   │    │   MongoDB    │    │    Redis     │       │
│  │  (Payments)  │    │   (Chat)     │    │  (Cache)     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Module Structure

```
backend/
├── main.py              # FastAPI application entry
├── config.py            # Environment configuration
├── database.py          # Database connections
├── models.py            # SQLAlchemy ORM models
├── mongo_models.py      # MongoDB document models
│
├── modules/
│   ├── admin/           # Admin dashboard, user mgmt, disputes
│   ├── agent/           # AI farming assistant with RAG
│   ├── auth/            # Authentication, JWT, OTP verification
│   ├── cart/            # Shopping cart management
│   ├── chat/            # Real-time messaging
│   ├── escrow/          # Payment processing, escrow logic
│   ├── notifications/   # Push & SMS notifications
│   ├── orders/          # Order lifecycle management
│   ├── products/        # Product CRUD, search, filtering
│   ├── storage/         # File upload handling
│   └── users/           # User profiles, settings
│
├── integrations/        # External API wrappers
│   ├── paystack.py      # Payment gateway
│   ├── mnotify.py       # SMS service
│   ├── openrouter.py    # AI models
│   └── weather.py       # Weather API
│
├── middleware/          # Request processing
│   ├── rate_limiter.py  # API rate limiting
│   └── error_handler.py # Global error handling
│
├── knowledgebase/       # Agricultural knowledge documents
│   ├── tomato.md
│   ├── maize.md
│   └── ...
│
├── utils/               # Shared utilities
│   ├── security.py      # Password hashing, JWT
│   ├── otp_generator.py # OTP creation
│   └── background_jobs.py
│
└── alembic/             # Database migrations
```

### Frontend Structure

```
frontend/
├── src/
│   ├── App.tsx          # Root component with routing
│   ├── main.tsx         # Application entry
│   │
│   ├── pages/
│   │   ├── WelcomePage.tsx    # Landing page
│   │   ├── auth/              # Login, signup, verification
│   │   ├── buyer/             # Buyer-specific pages
│   │   │   ├── HomePage.tsx
│   │   │   ├── SearchPage.tsx
│   │   │   ├── CartPage.tsx
│   │   │   ├── CheckoutPage.tsx
│   │   │   └── OrdersPage.tsx
│   │   ├── farmer/            # Farmer-specific pages
│   │   │   ├── FarmerDashboard.tsx
│   │   │   ├── FarmerProductsPage.tsx
│   │   │   ├── AddProductPage.tsx
│   │   │   └── FarmerOrdersPage.tsx
│   │   ├── admin/             # Admin panel
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminUsersPage.tsx
│   │   │   └── AdminDisputesPage.tsx
│   │   └── shared/            # Shared pages
│   │
│   ├── components/      # Reusable UI components
│   ├── services/        # API service layer
│   ├── stores/          # Zustand state stores
│   ├── types/           # TypeScript interfaces
│   └── utils/           # Helper functions
│
├── public/              # Static assets
└── index.html           # HTML entry point
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** (LTS recommended)
- **Docker & Docker Compose** (for local databases)
- **Git**

### Backend Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/Team-SoftTouch.git
cd Team-SoftTouch/backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# 5. Start databases with Docker
docker-compose up -d

# 6. Run database migrations
alembic upgrade head

# 7. Seed initial data (optional)
python seed_data.py

# 8. Start the development server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`  
Swagger docs at `http://localhost:8000/docs`

### Frontend Setup

```bash
# 1. Navigate to frontend
cd Team-SoftTouch/frontend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local:
# VITE_API_URL=http://localhost:8000

# 4. Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

#### Backend `.env`

```env
# Application
ENVIRONMENT=development
SECRET_KEY=your-super-secret-key-min-32-chars
DEBUG=true

# Database
DATABASE_URL=postgresql://smartagro:smartagro123@localhost:5432/smartagro
MONGODB_URI=mongodb://localhost:27017/smartagro
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET_KEY=your-jwt-secret-key

# Paystack (Ghana payments)
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx

# SMS (mNotify Ghana)
MNOTIFY_API_KEY=your-mnotify-key

# AI (OpenRouter)
OPENROUTER_API_KEY=sk-or-xxxxx

# Weather
OPENWEATHER_API_KEY=your-openweather-key

# Storage
STORAGE_TYPE=local  # Use "spaces" for DigitalOcean Spaces in production
```

#### Frontend `.env.local`

```env
VITE_API_URL=http://localhost:8000
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
```

---

## 📚 API Documentation

### Interactive Documentation

Access the auto-generated API documentation:

- **Swagger UI**: https://smartagro-backend-925054869230.us-central1.run.app/docs
- **ReDoc**: https://smartagro-backend-925054869230.us-central1.run.app/redoc

### Key API Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new user (farmer/buyer) |
| POST | `/auth/verify-otp` | Verify phone number |
| POST | `/auth/login` | Authenticate user |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Get current user |
| POST | `/auth/switch-mode` | Switch between FARMER/BUYER mode |

#### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products` | List products (with filters) |
| POST | `/api/v1/products` | Create product (farmers only) |
| GET | `/api/v1/products/featured` | Get featured products |
| GET | `/api/v1/products/search` | Search products |
| GET | `/api/v1/products/{id}` | Get product details |

#### Cart & Checkout
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/cart` | Get active cart |
| POST | `/api/v1/cart/items` | Add item to cart |
| POST | `/api/v1/cart/checkout` | Checkout and create order |

#### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/orders` | List my orders |
| GET | `/api/v1/orders/{id}` | Get order details |
| PUT | `/api/v1/orders/{id}/ship` | Mark as shipped (seller) |
| PUT | `/api/v1/orders/{id}/deliver` | Confirm delivery (buyer) |

#### AI Agent
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/agent/chat` | Send message (non-streaming) |
| POST | `/api/v1/agent/chat/stream` | Send message (SSE streaming) |
| POST | `/api/v1/agent/chat/upload` | Send with file attachment |
| GET | `/api/v1/agent/sessions` | List chat sessions |

#### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/escrow/initialize` | Initialize payment |
| GET | `/api/v1/escrow/{id}` | Get escrow details |

See [API_ENDPOINTS.md](backend/API_ENDPOINTS.md) for complete documentation.

---

## 🎨 Frontend Guide

### Design System

| Element | Value |
|---------|-------|
| **Primary Color** | `#16A34A` (Green-600) |
| **Secondary** | `#F59E0B` (Amber-500) |
| **Accent** | `#059669` (Emerald-600) |
| **Error** | `#DC2626` (Red-600) |
| **Font Family** | Inter |
| **Border Radius** | 8px (buttons), 12px (cards) |
| **Spacing Base** | 4px |

### Color Palette

```css
/* Primary - Agricultural Green */
--primary-50:  #F0FDF4;
--primary-500: #22C55E;
--primary-600: #16A34A;
--primary-700: #15803D;

/* Secondary - Harvest Gold */
--secondary-500: #F59E0B;
--secondary-600: #D97706;
```

### User Flows

#### Buyer Journey
1. Browse products on Home/Search
2. View product details
3. Add to cart
4. Checkout with delivery info
5. Pay via Paystack
6. Track order status
7. Confirm delivery

#### Farmer Journey
1. Sign up with farm details
2. List products with images
3. Receive orders
4. Mark orders as shipped
5. Track earnings
6. Use AI assistant for farming advice

### PWA Features

SmartAgro is a Progressive Web App:
- ✅ **Installable** on mobile and desktop
- ✅ **Offline-capable** with service worker
- ✅ **Push notifications** ready
- ✅ **Responsive** mobile-first design
- ✅ **Fast** optimized bundle with Vite

---

## 🗄 Database Schema

### Core Tables (PostgreSQL)

| Table | Description |
|-------|-------------|
| `users` | User accounts (farmers, buyers, admins) |
| `products` | Product listings with images |
| `orders` | Order headers |
| `order_items` | Individual items in orders |
| `carts` | Active shopping carts (8hr expiry) |
| `cart_items` | Items in shopping carts |
| `escrow_transactions` | Payment escrow records |
| `notifications` | User notifications |
| `disputes` | Order disputes |
| `reviews` | User and product reviews |
| `knowledge_chunks` | AI knowledge base embeddings |

### MongoDB Collections

| Collection | Description |
|------------|-------------|
| `conversations` | Chat thread metadata |
| `messages` | Individual chat messages |
| `agent_sessions` | AI agent conversation history |

### Key Enums

```python
class UserType(Enum):
    FARMER = "FARMER"
    BUYER = "BUYER"
    ADMIN = "ADMIN"

class OrderStatus(Enum):
    PENDING_PAYMENT = "PENDING_PAYMENT"
    PAID = "PAID"
    PROCESSING = "PROCESSING"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    DISPUTED = "DISPUTED"

class ProductCategory(Enum):
    VEGETABLES = "VEGETABLES"
    FRUITS = "FRUITS"
    GRAINS = "GRAINS"
    LEGUMES = "LEGUMES"
    TUBERS = "TUBERS"
    SPICES = "SPICES"
    OTHERS = "OTHERS"

class PaymentStatus(Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"

class DeliveryMethod(Enum):
    PICKUP = "PICKUP"
    DELIVERY = "DELIVERY"
```

---

## 🚢 Deployment

### Current Production Infrastructure

| Component | Service | Region |
|-----------|---------|--------|
| Frontend | GCP Cloud Run | us-central1 (Iowa) |
| Backend | GCP Cloud Run | us-central1 (Iowa) |
| PostgreSQL | Cloud SQL | us-central1 |
| MongoDB | Atlas | AWS (shared) |
| Redis | Upstash | Global |
| File Storage | DO Spaces | SGP1 |

### Docker Build

#### Backend
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build and run
docker build -t smartagro-backend .
docker run -p 8000:8000 --env-file .env smartagro-backend
```

#### Frontend
```bash
# Build for production
npm run build

# Serve with nginx or any static server
npx serve -s dist -l 3000
```

### Cloud Run Deployment

```bash
# Backend
gcloud run deploy smartagro-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "ENVIRONMENT=production"

# Frontend
gcloud run deploy smartagro-frontend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 🧪 Testing

### Load Testing with Locust

We use Locust for performance and reliability testing:

```bash
cd backend

# Install Locust
pip install locust

# Run headless load test
locust -f locustfile.py \
  --host=https://smartagro-backend-925054869230.us-central1.run.app \
  --users 50 \
  --spawn-rate 5 \
  --run-time 1h \
  --headless \
  --csv=results/load_test

# Run with Web UI
locust -f locustfile.py --host=https://smartagro-backend-925054869230.us-central1.run.app
# Open http://localhost:8089
```

See [LOAD_TESTING.md](backend/LOAD_TESTING.md) for detailed testing guide.

### Test Types

| Test | Duration | Users | Purpose |
|------|----------|-------|---------|
| Smoke | 1 min | 5 | Basic sanity check |
| Load | 30 min | 50 | Normal load simulation |
| Stress | 1 hr | 100+ | Find breaking points |
| Endurance | 8 hr | 30 | Long-term stability |

### Unit Tests

```bash
# Backend
cd backend
pytest tests/ -v --cov=modules

# Frontend
cd frontend
npm run test
```

---

## 📊 Performance Metrics

From recent load testing (1-hour run, 50 users):

| Metric | Value |
|--------|-------|
| Total Requests | 28,433 |
| Availability | 42.3% (needs improvement) |
| Median Response | 250ms |
| p95 Response | 860ms |
| Throughput | ~8 req/sec |

**Known Issues:**
- Product search endpoint needs optimization
- Database connection pooling under load

---

## 👥 Team

**Team Soft Touch** - Ashesi University Capstone Project

| Member | Role | Contribution |
|--------|------|--------------|
| **Sam** | Full Stack Lead | Backend architecture, AI agent |
| **Nicole** | Frontend Developer | React components, UI/UX |
| **Mohammed** | Backend Developer | API endpoints, payments |
| **Michael** | UI/UX Designer | Design system, frontend |

---

## 📄 License

This project is developed as part of the Ashesi University Computer Science Capstone program (ICS 530).

© 2024-2025 Team Soft Touch. All rights reserved.

---

## 🙏 Acknowledgments

- **Ashesi University** - Faculty guidance and support
- **Ghanaian Farmers** - User research and feedback
- **Open Source Community** - Amazing tools and libraries

---

## 📬 Contact

For questions or feedback:
- **Project Repository**: [GitHub](https://github.com/your-org/Team-SoftTouch)
- **API Issues**: Create an issue in the repository

---

<p align="center">
  <strong>Made with ❤️ for Ghanaian Agriculture</strong>
  <br/>
  <em>Connecting farmers to markets, one click at a time</em>
</p>
