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

  // Always get fresh store state inside handlers — never use stale closure
  s.on('job:created', (job) => {
    const store = usePipelineStore.getState();
    store.upsertJob(job);
    store.addEvent({ type: 'job_created', message: `New job: ${job.repository?.name || job.name}` });
  });

  s.on('job:update', (job) => {
    usePipelineStore.getState().upsertJob(job);
  });

  s.on('worker:update', (worker) => {
    usePipelineStore.getState().upsertWorker(worker);
  });

  s.on('queue:update', (metrics) => {
    usePipelineStore.getState().setQueueMetrics(metrics);
  });

  s.on('webhook:received', (data) => {
    const githubUrl = data.sha
      ? `https://github.com/${data.repo}/compare/${data.sha}~1...${data.sha}`
      : `https://github.com/${data.repo}`;
    usePipelineStore.getState().addEvent({
      type: 'webhook',
      message: `${data.event} on ${data.repo}${data.sha ? ` · ${data.sha.slice(0, 7)}` : ''}`,
      githubUrl,
    });
  });

  s.on('deployment:update', (data) => {
    usePipelineStore.getState().addEvent({
      type: 'deployment',
      message: `Deployed ${data.version} to ${data.environment}`,
    });
  });

  s.on('demo:story_started', (data) => {
    usePipelineStore.getState().addEvent({ type: 'webhook', message: `Story mode started — ${data.steps} steps` });
  });

  s.on('demo:story_step', (data) => {
    usePipelineStore.getState().addEvent({
      type: 'webhook',
      message: `Story step ${data.step}/${data.total}: ${data.eventType} on ${data.repo}`,
    });
  });

  s.on('demo:story_completed', () => {
    usePipelineStore.getState().addEvent({ type: 'deployment', message: 'Story mode completed ✓' });
  });

  s.on('demo:real_push', (data) => {
    usePipelineStore.getState().addEvent({
      type: 'push',
      message: `Pushed ${data.sha} to ${data.repo}: ${data.message}`,
      githubUrl: `https://github.com/${data.repo}/commit/${data.sha}`,
    });
  });

  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
