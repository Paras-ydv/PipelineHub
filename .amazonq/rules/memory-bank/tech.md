# PipelineHub — Technology Stack

## Languages & Runtimes
- TypeScript 5.3+ (both frontend and backend)
- Node.js 20+

## Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.1.0 | App Router, SSR/CSR hybrid |
| React | 18.2 | UI framework |
| Tailwind CSS | 3.4 | Utility-first styling |
| Zustand | 4.5 | Client state management |
| Socket.IO Client | 4.6 | WebSocket real-time updates |
| Axios | 1.6 | HTTP API client |
| Radix UI | various | Headless accessible primitives |
| Framer Motion | 11 | Animations |
| Recharts | 2.10 | Queue/metrics charts |
| Lucide React | 0.312 | Icon library |
| date-fns | 3.2 | Date formatting |
| clsx + tailwind-merge | latest | Conditional class merging (`cn()`) |
| class-variance-authority | 0.7 | Component variant management |
| react-hot-toast | 2.4 | Toast notifications |

## Backend
| Technology | Version | Purpose |
|---|---|---|
| NestJS | 10.3 | Framework (modules, DI, decorators) |
| Prisma ORM | 5.8 | Database access + migrations |
| BullMQ | 5.1 | Job queue (pipeline processing) |
| Socket.IO | 4.6 | WebSocket server (gateway) |
| Passport + JWT | 10/10 | Authentication |
| @nestjs/swagger | 7.2 | OpenAPI docs at `/api/docs` |
| @nestjs/schedule | 4.0 | Cron jobs (demo mode, worker heartbeats) |
| @nestjs/throttler | 5.1 | Rate limiting |
| helmet | 7.1 | HTTP security headers |
| compression | 1.7 | Response compression |
| bcryptjs | 2.4 | Password hashing |
| uuid | 9.0 | ID generation |
| winston + nest-winston | 3.11/1.9 | Structured logging |
| ioredis | 5.3 | Redis client |
| axios | 1.6 | GitHub API calls |
| class-validator + class-transformer | 0.14/0.5 | DTO validation |

## Infrastructure
| Technology | Purpose |
|---|---|
| PostgreSQL 16 | Primary database |
| Redis 7 | BullMQ queue backend |
| Docker + Docker Compose | Local full-stack orchestration |
| Vercel | Frontend deployment (`rootDirectory: frontend`) |
| Railway | Backend deployment |
| Neon | Managed PostgreSQL (production) |
| Upstash | Managed Redis (production) |

## Database Models (Prisma)
- `User` — auth, roles (ADMIN / DEVELOPER / VIEWER)
- `Repository` — GitHub repo config, webhook settings, pipeline config (JSON)
- `WebhookEvent` — raw incoming webhook payloads
- `Pipeline` — pipeline definition with stages (JSON)
- `Job` — execution record with status, stages (JSON), timing, retry info
- `BuildLog` — per-stage log lines with level (DEBUG/INFO/WARN/ERROR)
- `Worker` — worker state, CPU/mem metrics, heartbeat
- `Deployment` — deployment record per environment
- `Event` — general event log
- `QueueMetric` — historical BullMQ snapshots

## Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://pipelinehub:pipelinehub_secret@localhost:5433/pipelinehub
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
JWT_SECRET=change-this-to-a-secure-random-string
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000
PORT=4000
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

## Development Commands

### Docker (recommended)
```bash
docker-compose up -d                    # Start all services
docker-compose up postgres redis -d     # Infrastructure only
docker-compose logs -f backend          # Tail backend logs
```

### Backend
```bash
cd backend
npm install
npx prisma migrate dev --name init      # Run migrations
npx ts-node prisma/seed.ts              # Seed initial data
npm run start:dev                       # Dev server with watch
npm run build                           # Production build
npm run prisma:studio                   # Prisma Studio GUI
```

### Frontend
```bash
cd frontend
npm install
npm run dev                             # Dev server (localhost:3000)
npm run build                           # Production build
npm run lint                            # ESLint
```

## Port Mapping
| Service | Local Dev | Docker Compose |
|---|---|---|
| Frontend | 3000 | 3001 |
| Backend | 4000 | 4001 |
| PostgreSQL | 5432 | 5433 |
| Redis | 6379 | 6380 |

## Build Configuration
- Backend: `nest-cli.json` controls NestJS build, `tsconfig.build.json` excludes test files
- Frontend: `next.config.js` — `reactStrictMode: true`, standalone output enabled via `NEXT_OUTPUT=standalone` env var for Docker
- Vercel: `vercel.json` sets `rootDirectory: frontend`
