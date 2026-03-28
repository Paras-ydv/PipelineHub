import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('pipelinehub-auth');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (r) => r.data,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('pipelinehub-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
  },
);

export default api;

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (email: string, username: string, password: string) => api.post('/auth/register', { email, username, password }),
  me: () => api.get('/auth/me'),
};

export const reposApi = {
  list: () => api.get('/repositories'),
  get: (id: string) => api.get(`/repositories/${id}`),
  create: (data: any) => api.post('/repositories', data),
  update: (id: string, data: any) => api.put(`/repositories/${id}`, data),
  delete: (id: string) => api.delete(`/repositories/${id}`),
  toggle: (id: string) => api.patch(`/repositories/${id}/toggle`),
  toggleDemo: (id: string) => api.patch(`/repositories/${id}/demo`),
  registerWebhook: (id: string, webhookUrl: string) => api.post(`/repositories/${id}/webhook/register`, { webhookUrl }),
};

export const jobsApi = {
  list: (params?: any) => api.get('/jobs', { params }),
  get: (id: string) => api.get(`/jobs/${id}`),
  stats: () => api.get('/jobs/stats'),
  cancel: (id: string) => api.post(`/jobs/${id}/cancel`),
  retry: (id: string) => api.post(`/jobs/${id}/retry`),
};

export const workersApi = {
  list: () => api.get('/workers'),
};

export const logsApi = {
  getByJob: (jobId: string) => api.get(`/logs/${jobId}`),
};

export const queueApi = {
  metrics: () => api.get('/queue/metrics'),
  history: () => api.get('/queue/history'),
};

export const deploymentsApi = {
  list: (repositoryId?: string) => api.get('/deployments', { params: { repositoryId } }),
};

export const demoApi = {
  status: () => api.get('/demo/status'),
  toggle: (enabled: boolean) => api.post('/demo/toggle', { enabled }),
  trigger: (repositoryId: string) => api.post(`/demo/trigger/${repositoryId}`),
};

export const webhooksApi = {
  simulate: (repositoryId: string, eventType: string, branch?: string) =>
    api.post('/webhooks/simulate', { repositoryId, eventType, branch }),
};
