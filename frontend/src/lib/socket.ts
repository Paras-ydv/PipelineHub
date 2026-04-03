import { io, Socket } from 'socket.io-client';
import { usePipelineStore } from '@/store/pipeline.store';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function initSocketListeners() {
  const s = getSocket();
  const store = usePipelineStore.getState();

  s.on('job:created', (job) => {
    store.upsertJob(job);
    store.addEvent({ type: 'job_created', message: `New job: ${job.name}` });
  });

  s.on('job:update', (job) => {
    store.upsertJob(job);
  });

  s.on('worker:update', (worker) => {
    store.upsertWorker(worker);
  });

  s.on('queue:update', (metrics) => {
    store.setQueueMetrics(metrics);
  });

  s.on('webhook:received', (data) => {
    const githubUrl = data.sha
      ? `https://github.com/${data.repo}/compare/${data.sha}~1...${data.sha}`
      : `https://github.com/${data.repo}`;
    store.addEvent({ type: 'webhook', message: `${data.event} on ${data.repo}${data.sha ? ` · ${data.sha.slice(0,7)}` : ''}`, githubUrl });
  });

  s.on('deployment:update', (data) => {
    store.addEvent({ type: 'deployment', message: `Deployed ${data.version} to ${data.environment}` });
  });

  s.on('demo:story_started', (data) => {
    store.addEvent({ type: 'webhook', message: `Story mode started — ${data.steps} steps` });
  });

  s.on('demo:story_step', (data) => {
    store.addEvent({ type: 'webhook', message: `Story step ${data.step}/${data.total}: ${data.eventType} on ${data.repo}` });
  });

  s.on('demo:story_completed', () => {
    store.addEvent({ type: 'deployment', message: 'Story mode completed ✓' });
  });

  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
