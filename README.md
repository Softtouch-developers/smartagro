# SmartAgro

A digital marketplace platform connecting Ghanaian farmers directly with buyers to reduce post-harvest losses.

## 🎯 Project Overview

**Timeline:** 3-week capstone project (Dec 4-17, 2025)  
**Institution:** Ashesi University - ICS 530 Software Engineering Essentials  
**Team:** Soft Touch (Sam, Nicole, Mohammed, Michael)

## 🏗️ Architecture

### Frontend
- **Framework:** React 19 (via Vite)
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **State Management:** Zustand, React Query
- **UI Components:** Radix UI, Lucide React

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Databases:** 
  - PostgreSQL 15 (structured data + pgvector)
  - MongoDB Atlas (flexible documents)
  - Redis (sessions, cache)
- **Storage:** GCP Storage
- **Deployment:** GCP Cloud Run

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js & npm
- Docker & Docker Compose (for local databases)
- Git

### 1. Backend Setup

The backend handles the API, database connections, and business logic.

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start databases with Docker
docker-compose up -d

# Run database migrations
alembic upgrade head

# Start development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend API will be available at `http://localhost:8000`.  
API Documentation: `http://localhost:8000/docs`.

### 2. Frontend Setup

The frontend provides the user interface for Farmers, Buyers, and Admins.

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`.

## 📁 Project Structure

```
smartagro/
├── backend/                # FastAPI application
│   ├── main.py            # Entry point
│   ├── modules/           # Feature modules (auth, products, etc.)
│   └── ...
├── frontend/               # React application
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   └── ...
└── README.md              # Project documentation
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

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Implement feature with tests
3. Commit: `git commit -m "Add feature"`
4. Push: `git push origin feature/name`
5. Create Pull Request

## 📝 License

This project is part of an academic capstone and is not licensed for commercial use.

## 👥 Team

- **Nana Sam Yeboah** - Backend
- **Nicole Nanka-Bruce** - Frontend
- **Mohammed Jalloh** - Backend
- **Michael Kwabena Sylvester** - Design
