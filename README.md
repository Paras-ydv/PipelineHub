# PipelineHub — Enterprise CI/CD Platform

A production-grade simulated Jenkins/CI-CD platform with real-time pipeline visualization, multi-worker orchestration, GitHub webhook integration, and a modern dashboard UI.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        PipelineHub                          │
├──────────────┬──────────────────────────┬───────────────────┤
│   Frontend   │        Backend           │   Infrastructure  │
│  Next.js 14  │  NestJS + TypeScript     │  PostgreSQL       │
│  Tailwind    │  REST API + WebSocket    │  Redis (BullMQ)   │
│  Zustand     │  BullMQ Queue            │  Docker           │
│  Socket.IO   │  Prisma ORM              │                   │
└──────────────┴──────────────────────────┴───────────────────┘
                         │
              ┌──────────┴──────────┐
              │   Worker Nodes      │
              │  worker-python 🐍   │
              │  worker-node   ⬢   │
              │  worker-java   ☕   │
              │  worker-general ⚙️  │
              └─────────────────────┘
```

## Features

- **Multi-repo GitHub integration** — Register unlimited repos with token, branch, event filters
- **Real GitHub webhooks** — Signature validation, auto-registration via GitHub API
- **Event-driven job triggering** — push, pull_request, release, workflow_dispatch
- **BullMQ queue** — Priority, retry, delayed, cron jobs
- **4 simulated workers** — Language-specialized (Python/Node/Java/General)
- **8-stage pipeline engine** — checkout → install → build → test → security_scan → package → deploy → notify
- **Real-time dashboard** — WebSocket-powered live updates
- **Demo automation** — Auto-generates fake events every 20s
- **Deployment tracking** — Full deployment history per environment

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- (Optional) ngrok for real GitHub webhooks

### Option 1: Docker Compose (Recommended)

```bash
git clone <repo>
cd PipelineHub-1

# Start all services
docker-compose up -d

# The app will be available at:
# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
# API Docs: http://localhost:4000/api/docs
```

### Option 2: Local Development

**1. Start infrastructure**
```bash
docker-compose up postgres redis -d
```

**2. Backend setup**
```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
npm run start:dev
```

**3. Frontend setup**
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

**4. Login**
- URL: http://localhost:3000
- Email: `admin@pipelinehub.dev`
- Password: `admin123`

---

## Project Structure

```
PipelineHub-1/
├── backend/
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── config/
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   └── modules/
│   │       ├── auth/          # JWT authentication
│   │       ├── repositories/  # GitHub repo management
│   │       ├── webhooks/      # Webhook handling + simulation
│   │       ├── pipelines/     # Pipeline execution engine
│   │       ├── jobs/          # Job management
│   │       ├── workers/       # Worker simulation + heartbeats
│   │       ├── logs/          # Build log streaming
│   │       ├── deployments/   # Deployment tracking
│   │       ├── queue/         # BullMQ metrics
│   │       ├── demo/          # Auto demo event generation
│   │       ├── events/        # Event log
│   │       └── gateway/       # WebSocket gateway
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/
│   │   │   └── dashboard/
│   │   │       ├── page.tsx           # Main dashboard
│   │   │       ├── repositories/      # Repo management
│   │   │       ├── pipelines/         # Pipeline viewer
│   │   │       ├── queue/             # Queue monitor
│   │   │       ├── workers/           # Worker monitor
│   │   │       ├── logs/              # Log viewer
│   │   │       ├── deployments/       # Deployment history
│   │   │       └── settings/          # Webhook testing
│   │   ├── components/
│   │   │   ├── dashboard/             # Dashboard widgets
│   │   │   └── shared/                # Sidebar, TopBar
│   │   ├── store/                     # Zustand stores
│   │   └── lib/                       # API client, Socket.IO, utils
│   └── Dockerfile
└── docker-compose.yml
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| GET | `/api/auth/me` | Current user |

### Repositories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/repositories` | List all repos |
| POST | `/api/repositories` | Add repository |
| PUT | `/api/repositories/:id` | Update repo |
| DELETE | `/api/repositories/:id` | Delete repo |
| PATCH | `/api/repositories/:id/toggle` | Enable/disable |
| PATCH | `/api/repositories/:id/demo` | Toggle auto-demo |
| POST | `/api/repositories/:id/webhook/register` | Register GitHub webhook |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/github` | Real GitHub webhook receiver |
| POST | `/api/webhooks/simulate` | Simulate webhook event |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List jobs (filter by status/repo) |
| GET | `/api/jobs/stats` | Job statistics |
| GET | `/api/jobs/:id` | Job details + logs |
| POST | `/api/jobs/:id/cancel` | Cancel job |
| POST | `/api/jobs/:id/retry` | Retry job |

### Workers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workers` | List all workers |

### Queue
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/queue/metrics` | Current queue metrics |
| GET | `/api/queue/history` | Historical snapshots |

### Demo
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/demo/status` | Demo mode status |
| POST | `/api/demo/toggle` | Enable/disable demo |
| POST | `/api/demo/trigger/:repoId` | Trigger single event |

---

## WebSocket Events

Connect to `ws://localhost:4000`

| Event | Description |
|-------|-------------|
| `job:created` | New job queued |
| `job:update` | Job status/stage changed |
| `worker:update` | Worker status/metrics changed |
| `queue:update` | Queue metrics snapshot |
| `webhook:received` | Webhook event received |
| `deployment:update` | New deployment created |
| `log:{jobId}` | Real-time log line for job |

---

## GitHub Webhook Setup

### With ngrok (local testing)

```bash
# Install ngrok
brew install ngrok

# Expose backend
ngrok http 4000

# Copy the HTTPS URL, e.g. https://abc123.ngrok.io

# Register webhook via API
curl -X POST http://localhost:4000/api/repositories/{repoId}/webhook/register \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://abc123.ngrok.io/api/webhooks/github"}'
```

### Webhook payload validation
All incoming webhooks are validated using HMAC-SHA256 signature (`X-Hub-Signature-256` header).

---

## Demo Mode

Enable "Demo Mode" from the dashboard toggle or via API:

```bash
curl -X POST http://localhost:4000/api/demo/toggle \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

When enabled, the system automatically:
- Triggers fake push/PR/release events every 20 seconds
- Selects random repositories with `autoDemo: true`
- Creates realistic commit messages and authors
- Runs full 8-stage pipeline simulation

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
vercel --prod

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_API_URL = https://your-backend.railway.app/api
# NEXT_PUBLIC_WS_URL  = https://your-backend.railway.app
```

### Backend → Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

cd backend
railway login
railway init
railway up

# Set environment variables in Railway dashboard:
# DATABASE_URL  = (from Neon/Supabase)
# REDIS_HOST    = (from Upstash)
# REDIS_PORT    = 6379
# REDIS_PASSWORD = (from Upstash)
# JWT_SECRET    = (random secure string)
# FRONTEND_URL  = https://your-app.vercel.app
```

### Database → Neon (PostgreSQL)

1. Create project at https://neon.tech
2. Copy connection string
3. Set as `DATABASE_URL` in Railway

### Redis → Upstash

1. Create database at https://upstash.com
2. Copy host, port, password
3. Set `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` in Railway

---

## Pipeline Stages

Each job runs through up to 8 stages:

| Stage | Description |
|-------|-------------|
| `checkout` | Clone repository, checkout branch |
| `install` | Install dependencies |
| `build` | Compile/bundle source code |
| `test` | Run unit + integration tests |
| `security_scan` | SAST + dependency CVE scan |
| `package` | Create deployment artifact |
| `deploy` | Deploy to target environment |
| `notify` | Send notifications, update commit status |

Stages can be customized per repository via `pipelineConfig.stages`.

---

## Worker Assignment

```
Job Language → Worker Assignment
─────────────────────────────────
PYTHON  → worker-python  (fallback: worker-general)
NODE    → worker-node    (fallback: worker-general)
JAVA    → worker-java    (fallback: worker-general)
GENERAL → worker-general
```

Workers simulate:
- Random execution time (200–600ms per log line)
- 8% failure probability per stage
- CPU/memory fluctuation
- 2% random offline probability (recovers automatically)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Zustand, Socket.IO |
| Backend | NestJS, TypeScript, Passport JWT |
| Queue | BullMQ, Redis |
| Database | PostgreSQL, Prisma ORM |
| Real-time | Socket.IO (WebSocket) |
| Scheduling | @nestjs/schedule (cron) |
| Deployment | Docker, Vercel, Railway |
