# PipelineHub — Development Guidelines

## Code Quality Standards

### TypeScript
- Strict TypeScript throughout — no `any` except at service boundaries (gateway emit payloads, BullMQ job data)
- Interfaces defined in the same file as the store/component that owns them (see `pipeline.store.ts`)
- Prisma-generated enums (`JobStatus`, `WorkerStatus`, `RepoLanguage`, `LogLevel`) imported directly from `@prisma/client` — never redefined
- DTOs defined in the controller file using `class-validator` decorators, not in separate files for small modules

### Naming Conventions
- Files: `kebab-case` for all backend files (`pipeline.processor.ts`, `jwt-auth.guard.ts`)
- Classes: `PascalCase` (`PipelineProcessor`, `AppGateway`)
- Variables/functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE` for module-level constants (`PIPELINE_STAGES`, `STAGE_LOGS`)
- Zustand stores: exported as `use{Name}Store` (`usePipelineStore`, `useAuthStore`)
- API namespaces: `{resource}Api` (`jobsApi`, `reposApi`, `demoApi`)

### Formatting
- Single-line object shorthand for simple Tailwind color tokens (see `tailwind.config.js`)
- Inline ternary for simple conditional class logic; `cn()` utility for complex merges
- Arrow functions for Zustand actions and socket listeners
- No semicolons omitted — all statements terminated

---

## Backend Patterns

### NestJS Module Structure
Every feature module follows this exact pattern:
```
modules/{feature}/
  {feature}.module.ts    → @Module({ controllers, providers, imports, exports })
  {feature}.controller.ts → @Controller('{feature}'), @UseGuards(JwtAuthGuard) on protected routes
  {feature}.service.ts   → @Injectable(), constructor DI, Prisma queries
```

### Controller Pattern
```typescript
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}  // short private injection name

  @Post('login')
  login(@Body() dto: LoginDto) {             // always use DTOs for body
    return this.auth.login(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)                   // guard before route decorator
  @Get('me')
  me(@Request() req) { return req.user; }
}
```

### DTO Pattern
DTOs are defined in the controller file for small modules using `class-validator`:
```typescript
export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}
```
Global `ValidationPipe({ whitelist: true, transform: true })` strips unknown fields automatically.

### Service Pattern
- Services inject `PrismaService` and `AppGateway` directly via constructor
- After mutating state, always emit a WebSocket event via `AppGateway`
- Use `async/await` throughout — no `.then()` chains

### BullMQ Processor Pattern
```typescript
@Injectable()
@Processor('pipeline')                        // queue name as string literal
export class PipelineProcessor extends WorkerHost {
  constructor(private prisma: PrismaService, ...) { super(); }

  async process(bullJob: BullJob) {
    const { jobId } = bullJob.data;           // destructure from bullJob.data
    // ... implementation
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
```

### WebSocket Gateway Usage
Inject `AppGateway` into services and use typed emitter methods — never call `gateway.emit()` directly:
```typescript
this.gateway.jobUpdate(jobData);        // ✓ use typed emitters
this.gateway.workerUpdate(workerData);
this.gateway.logAppend(jobId, logData);
this.gateway.deploymentUpdate(data);
// NOT: this.gateway.emit('job:update', data)  ✗
```

### Authentication
- All routes except `POST /auth/login` and `POST /auth/register` require `@UseGuards(JwtAuthGuard)`
- JWT token read from `Authorization: Bearer <token>` header via Passport JWT strategy
- Passwords hashed with `bcryptjs`

### Error Handling
- BullMQ processor uses `try/catch/finally`: catch logs ERROR to `BuildLog`, sets job `FAILED`; finally always releases worker to IDLE
- Services throw NestJS `NotFoundException`, `UnauthorizedException` etc. — caught by global exception filter

---

## Frontend Patterns

### Zustand Store Pattern
```typescript
// 1. Define interfaces at top of store file
export interface Job { id: string; status: string; ... }

// 2. Define state interface
interface PipelineState {
  jobs: Job[];
  upsertJob: (job: Job) => void;
}

// 3. Create store with create<StateType>()
export const usePipelineStore = create<PipelineState>((set) => ({
  jobs: [],
  upsertJob: (job) =>
    set((state) => {
      const idx = state.jobs.findIndex((j) => j.id === job.id);
      if (idx >= 0) {
        const jobs = [...state.jobs];
        jobs[idx] = job;
        return { jobs };
      }
      return { jobs: [job, ...state.jobs].slice(0, 100) };  // cap list size
    }),
}));
```
- Upsert pattern (find by id → replace or prepend) used for jobs and workers
- Lists are capped: jobs at 100, recentEvents at 50
- Store state is persisted to `localStorage` under key `pipelinehub-auth` (auth store only)

### API Client Pattern
All API calls go through the central `api` Axios instance in `lib/api.ts`:
```typescript
// Grouped by resource as plain objects
export const jobsApi = {
  list: (params?: any) => api.get('/jobs', { params }),
  cancel: (id: string) => api.post(`/jobs/${id}/cancel`),
};
```
- Interceptor auto-attaches JWT from `localStorage` (`pipelinehub-auth` key → `state.token`)
- 401 responses auto-redirect to `/login` and clear storage
- Response interceptor returns `r.data` directly — callers receive unwrapped data

### Socket.IO Pattern
```typescript
// Singleton socket in lib/socket.ts
export function getSocket(): Socket { ... }

// Initialize listeners once (called from providers.tsx)
export function initSocketListeners() {
  const s = getSocket();
  const store = usePipelineStore.getState();  // access store outside React

  s.on('job:update', (job) => store.upsertJob(job));
  s.on('worker:update', (worker) => store.upsertWorker(worker));
}
```
- Socket is a module-level singleton (`let socket: Socket | null = null`)
- Listeners call Zustand store methods directly via `getState()` — no React hooks needed
- `disconnectSocket()` nulls the singleton for cleanup

### Tailwind Styling
- All colors use CSS custom properties via HSL: `hsl(var(--primary))` — never hardcoded hex
- Dark mode via `darkMode: ['class']` — toggled by adding `dark` class to root
- Custom fonts: `font-sans` → Inter, `font-mono` → JetBrains Mono
- Custom animations: `animate-pulse-slow`, `animate-slide-in`, `animate-fade-in`
- Border radius tokens: `rounded-lg`, `rounded-md`, `rounded-sm` map to CSS vars
- Use `cn()` (clsx + tailwind-merge) for all conditional class composition

### Component Organization
- `components/ui/` — primitive, reusable, unstyled-base components (shadcn-style)
- `components/dashboard/` — dashboard-specific widgets (StatsCards, JobsTable, WorkerGrid, QueueChart, EventStream, DemoToggle)
- `components/shared/` — layout chrome (Sidebar, TopBar)
- `components/pipeline/` — pipeline stage visualization
- `providers.tsx` — single file wrapping all React context providers

---

## Data Patterns

### Job Status Flow
```
QUEUED → RUNNING → SUCCESS
                 → FAILED → RETRYING → RUNNING (up to maxRetries: 3)
       → CANCELLED
       → TIMEOUT
```

### Pipeline Stage Execution
- Stages defined in `PIPELINE_STAGES` constant or overridden per-repo via `pipelineConfig.stages` (JSON field)
- Each stage has template log lines in `STAGE_LOGS` with `{branch}`, `{commitHash}`, `{coverage}` placeholders
- Sleep between log lines: `200 + Math.random() * 400` ms
- Failure simulation: 8% chance per stage (except `checkout`)

### Worker Assignment
```
job.language === PYTHON  → worker-python  (fallback: worker-general)
job.language === NODE    → worker-node    (fallback: worker-general)
job.language === JAVA    → worker-java    (fallback: worker-general)
job.language === GENERAL → worker-general
```

### WebSocket Event Naming
All events use `noun:verb` format:
- `job:created`, `job:update`
- `worker:update`
- `queue:update`
- `webhook:received`
- `deployment:update`
- `log:{jobId}` — dynamic channel per job
- `metrics:update`

---

## Infrastructure Patterns

### Docker Compose
- Backend waits for `postgres` and `redis` health checks before starting
- Backend startup command: `prisma db push → seed → start`
- Frontend build-time env vars passed as Docker `args` (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`)
- Port offsets in Docker: all services shift +1 (3000→3001, 4000→4001, 5432→5433, 6379→6380)

### Security
- `helmet` with `crossOriginEmbedderPolicy: false` (required for Socket.IO)
- `compression` middleware on all responses
- CORS restricted to `FRONTEND_URL` env var
- Global prefix `/api` on all routes
- Rate limiting via `@nestjs/throttler`
- Webhook signature validation: HMAC-SHA256 against `X-Hub-Signature-256` header
