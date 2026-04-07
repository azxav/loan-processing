# Loan Processing Automation

Loan Processing Automation is a full-stack demo application for managing loan applications, uploaded documents, analytics, and AI-assisted staff workflows.

## What’s included

- **Backend**: FastAPI + MongoDB API for loans, documents, analytics, and agent actions/chat.
- **Frontend**: React + TypeScript + Vite UI for:
  - Staff Copilot (`/staff-copilot`)
  - Application Status dashboard (`/status`)
  - Staff Dashboard process view (`/staff-dashboard`)
- **AI orchestration layer**: Agent orchestration modules under `ai_agents/` and backend services.
- **Docker setup**: `docker/docker-compose.yml` for backend, frontend, and MongoDB.

## Repository structure

- `/backend` – FastAPI app, API routes, services, tests, and seed script
- `/frontend` – React/Vite application
- `/ai_agents` – agent orchestration and tool declaration modules
- `/docker` – Dockerfiles and compose stack
- `/input` – sample JSON payloads used by seeding/testing flows

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm
- MongoDB (local) or Docker

## Environment configuration

1. Copy root environment template:

```bash
cp env.example .env
```

2. Copy frontend template (optional for local frontend-only overrides):

```bash
cp frontend/env.example frontend/.env
```

3. If using AI features, set `GOOGLE_API_KEY` in `.env`.

## Run with Docker (recommended)

```bash
cd docker
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Backend OpenAPI docs: `http://localhost:8000/docs`
- MongoDB: `mongodb://localhost:27017`

## Run locally (without Docker)

### 1) Backend

```bash
python -m pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server is available at `http://localhost:5173` by default.

## Seed sample data

```bash
python -m backend.seed_mongo
```

This seeds sample loan applications and related documents from `/input`.

## Key API endpoints

Base path: `/api/v1`

- `POST /loans/` – create loan application
- `GET /loans/` – list loan applications
- `GET /loans/{application_id}` – get loan application details
- `POST /documents/upload` – upload a document for an application
- `GET /documents/{document_id}` – fetch a document record
- `GET /analytics/loan-requests` – totals, status counts, and trend for a date window
- `POST /agent/chat` – copilot chat
- `POST /agent/plan` – safe action planning from prompt
- `POST /agent/execute` – plan + execute allowed action
- `POST /agent/actions` and `GET /agent/actions/{task_id}` – async task orchestration/status

## Development commands

### Frontend

```bash
cd frontend
npm run lint
npm run build
npm run test -- --run
```

### Backend

```bash
python -m pytest -q backend/tests
```

## Notes

- The frontend currently includes scaffold/demo-oriented areas and simulated data views.
- Agent/chat capabilities are configuration-dependent and may require API keys.
