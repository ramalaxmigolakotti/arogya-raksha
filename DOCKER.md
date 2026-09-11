# 🐳 Dockerization Guide — Arogya Raksha

This repository includes full containerization support for running both the **Backend** (Node/Express/Socket.io) and **Frontend** (Next.js 16 Standalone) with an optional local **Redis** service via Docker Compose.

---

## 📁 Architecture Overview

| Service | Image / Base | Internal Port | Exposed Port | Purpose |
|:---|:---|:---:|:---:|:---|
| **backend** | `node:20-alpine` | `5000` | `5000` | Express API, Socket.io, CSV datasets & ML models |
| **frontend** | `node:20-alpine` (multi-stage) | `3000` | `3000` | Next.js 16 Standalone Web Application |
| **redis** | `redis:7-alpine` | `6379` | `6379` | Local caching for OPD queue & sessions |

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** installed and running on your machine.

### 2. Environment Variables
Verify your environment files exist:
- `backend/.env` (Supabase, Clerk, Groq, Twilio, Razorpay credentials)
- `frontend/.env.local` (Clerk Publishable Key, Supabase URL/Anon Key, etc.)

### 3. Build & Run Everything
From the project root:

```bash
docker compose up --build
```

To run in the background (detached mode):
```bash
docker compose up --build -d
```

### 4. Access the Application
- 🌐 **Frontend**: [http://localhost:3000](http://localhost:3000)
- 🔌 **Backend API**: [http://localhost:5000](http://localhost:5000)
- 🩺 **Backend Healthcheck**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🛠️ Common Docker Commands

### Stop Containers
```bash
docker compose down
```

### Stop Containers and Remove Volumes
```bash
docker compose down -v
```

### View Live Logs
```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Frontend only
docker compose logs -f frontend
```

### Restart a Specific Service
```bash
docker compose restart backend
docker compose restart frontend
```

### Rebuild a Single Service (After Code Changes)
```bash
docker compose up --build -d backend
# or
docker compose up --build -d frontend
```

---

## 📦 Standalone Container Builds

If you want to build and test containers independently without `docker-compose`:

### Backend:
```bash
cd backend
docker build -t arogya-backend .
docker run -p 5000:5000 --env-file .env arogya-backend
```

### Frontend:
```bash
cd frontend
docker build -t arogya-frontend .
docker run -p 3000:3000 --env-file .env.local arogya-frontend
```

---

## ☁️ Production Cloud Deployment

The created Dockerfiles are optimized for container platforms:
- **AWS ECS / Fargate**: Deploy both images with ECR.
- **Google Cloud Run**: Standalone serverless containers (Frontend & Backend).
- **Render / Railway / DigitalOcean App Platform**: Connect your GitHub repo and select Dockerfile deployment.
