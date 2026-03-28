# PipelineHub — Product Overview

## Purpose
PipelineHub is a production-grade simulated CI/CD platform that replicates Jenkins/GitHub Actions-style pipeline orchestration. It provides real-time pipeline visualization, multi-worker job execution, GitHub webhook integration, and a modern monitoring dashboard.

## Value Proposition
- Demonstrates enterprise CI/CD patterns without requiring real build infrastructure
- Simulates realistic pipeline execution with configurable failure rates and timing
- Provides full observability: live logs, worker metrics, queue depth, deployment history
- Supports real GitHub webhook integration via HMAC-SHA256 signature validation

## Key Features

### Pipeline Execution
- 8-stage pipeline: `checkout → install → build → test → security_scan → package → deploy → notify`
- Per-stage configurable execution with 8% failure probability simulation
- Stages customizable per repository via `pipelineConfig.stages`

### Multi-Worker Orchestration
- 4 language-specialized workers: `worker-python`, `worker-node`, `worker-java`, `worker-general`
- Worker assignment by job language with fallback to `worker-general`
- Workers simulate CPU/memory fluctuation, 2% random offline probability with auto-recovery

### GitHub Integration
- Register unlimited repositories with token, branch, and event filters
- Real webhook receiver with HMAC-SHA256 signature validation (`X-Hub-Signature-256`)
- Auto-register webhooks via GitHub API
- Supported events: `push`, `pull_request`, `release`, `workflow_dispatch`

### Queue System
- BullMQ-backed job queue with priority, retry, delayed, and cron job support
- Real-time queue metrics and historical snapshots

### Demo Mode
- Auto-generates fake push/PR/release events every 20 seconds
- Selects repos with `autoDemo: true`, creates realistic commit messages and authors
- Full 8-stage pipeline simulation end-to-end

### Real-Time Dashboard
- WebSocket-powered live updates for jobs, workers, queue, logs, and deployments
- Deployment history tracking per environment

## Target Users
- Developers learning CI/CD concepts and pipeline architecture
- Teams demoing DevOps tooling without live infrastructure
- Engineers building or evaluating CI/CD platform UIs

## Access
- Default login: `admin@pipelinehub.dev` / `admin123`
- Frontend: `http://localhost:3000` (Docker: `3001`)
- Backend API: `http://localhost:4000` (Docker: `4001`)
- Swagger docs: `http://localhost:4000/api/docs`
