import { create } from 'zustand';

export interface Job {
  id: string;
  name: string;
  status: string;
  branch: string;
  commitHash?: string;
  commitMsg?: string;
  author?: string;
  eventType: string;
  language: string;
  currentStage?: string;
  duration?: number;
  priority: number;
  retryCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  repository?: { name: string; owner: string; language: string };
  worker?: { name: string };
}

export interface Worker {
  id: string;
  name: string;
  language: string;
  status: string;
  currentJobId?: string;
  jobsCompleted: number;
  jobsFailed: number;
  cpuUsage: number;
  memUsage: number;
  lastHeartbeat: string;
}

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface PipelineState {
  jobs: Job[];
  workers: Worker[];
  queueMetrics: QueueMetrics;
  stats: { total: number; queued: number; running: number; success: number; failed: number };
  recentEvents: Array<{ id: string; type: string; message: string; timestamp: string }>;
  setJobs: (jobs: Job[]) => void;
  upsertJob: (job: Job) => void;
  setWorkers: (workers: Worker[]) => void;
  upsertWorker: (worker: Worker) => void;
  setQueueMetrics: (metrics: QueueMetrics) => void;
  setStats: (stats: any) => void;
  addEvent: (event: any) => void;
}

export const usePipelineStore = create<PipelineState>((set) => ({
  jobs: [],
  workers: [],
  queueMetrics: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
  stats: { total: 0, queued: 0, running: 0, success: 0, failed: 0 },
  recentEvents: [],

  setJobs: (jobs) => set({ jobs }),
  upsertJob: (job) =>
    set((state) => {
      const idx = state.jobs.findIndex((j) => j.id === job.id);
      if (idx >= 0) {
        const jobs = [...state.jobs];
        jobs[idx] = job;
        return { jobs };
      }
      return { jobs: [job, ...state.jobs].slice(0, 100) };
    }),
  setWorkers: (workers) => set({ workers }),
  upsertWorker: (worker) =>
    set((state) => {
      const idx = state.workers.findIndex((w) => w.id === worker.id);
      if (idx >= 0) {
        const workers = [...state.workers];
        workers[idx] = worker;
        return { workers };
      }
      return { workers: [...state.workers, worker] };
    }),
  setQueueMetrics: (queueMetrics) => set({ queueMetrics }),
  setStats: (stats) => set({ stats }),
  addEvent: (event) =>
    set((state) => ({
      recentEvents: [
        { id: Date.now().toString(), ...event, timestamp: new Date().toISOString() },
        ...state.recentEvents,
      ].slice(0, 50),
    })),
}));
