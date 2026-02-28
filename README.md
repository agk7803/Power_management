# ⚡ Campus Power Management System

A full-stack IoT-driven energy management platform for educational campuses. Monitor real-time power consumption, detect anomalies with AI, forecast energy demand using ML, and gamify energy savings across classrooms.

---

## 📁 Project Structure

```
Power_management/
├── frontend/          → React 19 SPA (port 3000)
├── backend/           → Express 5 REST API (port 5001)
├── ml/                → XGBoost ML microservice (port 5050)
├── package.json       → Root scripts to run frontend & backend
└── smart_grid_dataset*.csv → Training data for ML model
```

---

## 🧩 Features

| Module | Features |
|--------|----------|
| **Dashboard** | Real-time campus power, energy stats, active classrooms, CSV report export (daily/weekly/monthly) |
| **Classrooms** | Per-classroom energy monitoring, live power, voltage, current readings |
| **Analytics** | Energy trends, peak load analysis, AI anomaly detection, idle energy waste detection |
| **AI Insights** | XGBoost power forecasting, 7-day peak prediction, actual vs predicted charts, feature importance |
| **AI Explain** | OpenRouter LLM (Gemini 2.5 Flash) powered anomaly explanation & optimization tips |
| **Cost Analysis** | Hourly cost breakdown, daily/monthly projections |
| **Carbon Tracker** | CO₂ emissions tracking based on energy consumption |
| **Leaderboard** | Classroom efficiency rankings with normalized scoring |
| **Alerts** | Real-time energy anomaly alerts |
| **Automation** | Automation rules for energy control |
| **Admin** | User management, classroom/device configuration, data seeding |

---

## 🔧 Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Python** ≥ 3.9
- **MongoDB Atlas** account (or local MongoDB)

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

Create a `.env` file in the `backend/` directory:

```env
PORT=5001
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=<appName>
JWT_SECRET=<your-jwt-secret>
OPENROUTER_API_KEY=<your-openrouter-api-key>    # Optional — for AI-powered anomaly explanations
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Backend server port (default: `5001`) |
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Secret key for JWT authentication tokens. Generate with: `openssl rand -hex 64` |
| `OPENROUTER_API_KEY` | Optional | API key from [openrouter.ai](https://openrouter.ai) for AI-powered anomaly explanations (Gemini 2.5 Flash) |

> **Note:** The frontend runs on port `3000` by default (Create React App). No separate `.env` is needed for the frontend.

---

## 🚀 Installation & Setup

### Step 1: Clone the repository

```bash
git clone https://github.com/agk7803/Power_management.git
cd Power_management
```

### Step 2: Install dependencies

```bash
# Root dependencies (Google Generative AI)
npm install

# Backend dependencies
cd backend && npm install && cd ..

# Frontend dependencies
cd frontend && npm install && cd ..
```

### Step 3: Set up Python ML environment

```bash
cd ml
python3 -m venv venv
source venv/bin/activate           # macOS/Linux
# venv\Scripts\activate            # Windows

pip install flask flask-cors pandas numpy scikit-learn xgboost joblib
deactivate
cd ..
```

### Step 4: Train the ML model (first time only)

```bash
cd ml
source venv/bin/activate
python train_forecast_model.py     # Generates forecast_model.pkl
deactivate
cd ..
```

### Step 5: Configure environment variables

```bash
cp backend/.env\ example backend/.env
# Edit backend/.env and fill in your MongoDB URI, JWT secret, and optional API keys
```

---

## ▶️ Running the Application

You need **3 terminals** running simultaneously:

### Terminal 1 — Backend (Express API)

```bash
cd Power_management
npm run backend
```

> Starts Express server on **http://localhost:5001**

### Terminal 2 — Frontend (React)

```bash
cd Power_management
npm run frontend
```

> Starts React dev server on **http://localhost:3000**

### Terminal 3 — ML Microservice (Flask)

```bash
cd Power_management/ml
source venv/bin/activate
python serve_model.py
```

> Starts Flask ML server on **http://localhost:5050**

---

## 🌐 API Overview

| Route Group | Base Path | Description |
|-------------|-----------|-------------|
| Auth | `/api/auth` | Login, register, JWT authentication |
| Dashboard | `/api/dashboard` | Summary stats, hourly trends, report data |
| Classrooms | `/api/classrooms` | CRUD for classrooms |
| Energy | `/api/energy` | Energy readings history |
| Analytics | `/api/analytics` | Trends, peak, anomalies, idle detection |
| AI | `/api/ai` | ML forecast proxy, AI explain (OpenRouter) |
| Alerts | `/api/alerts` | Energy anomaly alerts |
| Devices | `/api/devices` | Device management |
| Automation | `/api/automation` | Automation rules |
| Campus | `/api/campus` | Campus-level aggregation |
| Departments | `/api/departments` | Department management |
| Floors | `/api/floors` | Floor management |
| Timetable | `/api/timetable` | Class schedules |
| Sensors | `/api/sensors` | Sensor data ingestion |

### ML Microservice Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/forecast` | GET | 24h actual vs predicted power, model stats, feature importance, 7-day peak forecast |
| `/peak` | GET | Daily peak load (30-day window) |
| `/health` | GET | Health check |

---

## 🧪 Data Simulator

Seed classrooms, devices, and historical energy data for testing:

```bash
cd backend

# Seed classrooms, floors, devices
node simulator/seed.js

# Seed historical energy data
node simulator/seedHistory.js

# Run live simulator (generates real-time readings)
npm run simulator
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, React Router 7, Vanilla CSS |
| **Backend** | Node.js, Express 5, Mongoose 9 |
| **Database** | MongoDB Atlas |
| **Auth** | JWT + bcrypt, cookie-based sessions |
| **ML** | Python, XGBoost, scikit-learn, Flask |
| **AI** | OpenRouter API (Gemini 2.5 Flash) |
| **IoT Sim** | Node.js simulator with realistic power patterns |

---

## 👥 User Roles

| Role | Access |
|------|--------|
| **Admin** | Full access — all pages + admin panel |
| **Faculty** | All pages except admin panel |
| **Student** | Dashboard, Classrooms, Leaderboard, Carbon |

---

## 📝 License

This project is for educational/academic purposes, designed by Team-Shers on 27-28 february 2026 at Code Automata 2.1.
