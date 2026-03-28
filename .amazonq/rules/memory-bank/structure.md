# PipelineHub — Project Structure

## Repository Layout

```
PipelineHub/
├── backend/                  # NestJS API server
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema (all models)
│   │   └── seed.ts           # Initial data seeding
│   ├── src/
│   │   ├── main.ts           # Bootstrap, CORS, Swagger, global pipes
│   │   ├── app.module.ts     # Root module, imports all feature modules
│   │   ├── common/           # Cross-cutting concerns
│   │   │   ├── decorators/   # Custom param decorators (e.g. @CurrentUser)
│   │   │   ├── filters/      # Global exception filters
│   │   │   ├── guards/       # Auth guards
│   │   │   ├── interceptors/ # Logging, transform interceptors
│   │   │   └── pipes/        # Validation pipes
│   │   ├── config/
│   │   │   ├── prisma.module.ts   # Global Prisma module
│   │   │   └── prisma.service.ts  # PrismaClient wrapper with onModuleInit
│   │   └── modules/          # Feature modules (NestJS standard layout)
│   │       ├── auth/         # JWT auth: login, register, strategy, guard
│   │       ├── repositories/ # GitHub repo CRUD + webhook registration
│   │       ├── webhooks/     # GitHub webhook receiver + event simulation
│   │       ├── pipelines/    # Pipeline execution engine + BullMQ processor
│   │       ├── jobs/         # Job CRUD, cancel, retry, stats
│   │       ├── workers/      # Worker simulation, heartbeats, status
│   │       ├── logs/         # Build log streaming per job
│   │       ├── deployments/  # Deployment record tracking
│   │       ├── queue/        # BullMQ metrics + history snapshots
│   │       ├── demo/         # Auto demo event generation (cron)
│   │       ├── events/       # Event log (webhook events received)
│   │       ├── scheduler/    # @nestjs/schedule cron wiring
│   │       └── gateway/      # Socket.IO WebSocket gateway
│   ├── .env.example
│   ├── Dockerfile
│   ├── nest-cli.json
│   └── package.json
│
├── frontend/                 # Next.js 14 App Router
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   │   ├── layout.tsx    # Root layout with providers
│   │   │   ├── page.tsx      # Root redirect to /dashboard
│   │   │   ├── login/        # Login page
│   │   │   └── dashboard/    # Protected dashboard area
│   │   │       ├── layout.tsx         # Dashboard shell (Sidebar + TopBar)
│   │   │       ├── page.tsx           # Main dashboard overview
│   │   │       ├── repositories/      # Repo management UI
│   │   │       ├── pipelines/         # Pipeline viewer
│   │   │       ├── queue/             # Queue monitor
│   │   │       ├── workers/           # Worker monitor
│   │   │       ├── logs/              # Log viewer
│   │   │       ├── deployments/       # Deployment history
│   │   │       └── settings/          # Webhook testing
│   │   ├── components/
│   │   │   ├── dashboard/    # Dashboard widgets (StatsCards, JobsTable, etc.)
│   │   │   ├── pipeline/     # Pipeline stage visualization components
│   │   │   ├── shared/       # Sidebar, TopBar (layout chrome)
│   │   │   ├── ui/           # Primitive UI components (shadcn-style)
│   │   │   ├── workers/      # Worker-specific components
│   │   │   └── providers.tsx # React context providers (auth, socket, toast)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/
│   │   │   ├── api.ts        # Axios instance + typed API functions
│   │   │   ├── socket.ts     # Socket.IO client singleton + event helpers
│   │   │   └── utils.ts      # Shared utility functions (cn, formatters)
│   │   ├── store/
│   │   │   ├── auth.store.ts     # Zustand auth state (user, token, login/logout)
│   │   │   └── pipeline.store.ts # Zustand pipeline/job/worker state
│   │   └── types/            # Shared TypeScript type definitions
│   ├── tailwind.config.js
│   ├── next.config.js
│   ├── Dockerfile
│   └── package.json
│
├── infrastructure/
│   ├── docker/               # Docker helper configs
│   └── nginx/                # Nginx reverse proxy config
├── workers/src/              # Standalone worker process (optional)
├── docker-compose.yml        # Full stack: postgres, redis, backend, frontend
├── vercel.json               # Vercel deploy config (rootDirectory: frontend)
└── README.md
```

## Core Architectural Patterns

### Backend: NestJS Feature Module Pattern
Each feature follows the same structure: `module.ts → controller.ts → service.ts`. The module registers the controller and service, imports dependencies (Prisma, BullMQ queues, Gateway), and is imported into `app.module.ts`.

```
module.ts   → declares providers, imports, exports
controller.ts → HTTP route handlers, uses @UseGuards(JwtAuthGuard)
service.ts  → business logic, Prisma queries, Gateway emissions
```

### Backend: BullMQ Pipeline Processing
- `webhooks.service.ts` enqueues jobs onto the `pipeline` BullMQ queue
- `pipeline.processor.ts` (`@Processor('pipeline')`) consumes jobs, runs 8 stages sequentially
- Each stage emits real-time updates via `AppGateway`

### Backend: WebSocket Gateway
- Single `AppGateway` (`app.gateway.ts`) handles all Socket.IO events
- Services inject `AppGateway` to emit events to connected clients
- Events: `job:created`, `job:update`, `worker:update`, `queue:update`, `webhook:received`, `deployment:update`, `log:{jobId}`

### Frontend: Zustand + Socket.IO State Pattern
- Zustand stores hold server state (jobs, workers, queue metrics)
- `socket.ts` singleton connects to backend WebSocket
- Socket event listeners update Zustand store slices in real time
- Components subscribe to store slices via hooks

### Frontend: Next.js App Router
- All dashboard routes are under `app/dashboard/` with a shared layout
- Route segments map 1:1 to dashboard sections
- `providers.tsx` wraps the app with auth context, socket initialization, and toast provider

## Key Data Flow

```
GitHub Webhook / Demo Cron
        ↓
WebhooksService.processEvent()
        ↓
BullMQ Queue (pipeline queue)
        ↓
PipelineProcessor.process() — 8 stages
        ↓
AppGateway.emit() → Socket.IO → Frontend Zustand Store → UI
        ↓
Prisma → PostgreSQL (persisted job/log/deployment records)
```
