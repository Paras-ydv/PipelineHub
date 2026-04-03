import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'MMM d, HH:mm:ss');
}

export function formatDuration(seconds?: number) {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export const STATUS_COLORS: Record<string, string> = {
  QUEUED: 'text-yellow-400 bg-yellow-400/10',
  RUNNING: 'text-blue-400 bg-blue-400/10',
  SUCCESS: 'text-green-400 bg-green-400/10',
  FAILED: 'text-red-400 bg-red-400/10',
  CANCELLED: 'text-gray-400 bg-gray-400/10',
  TIMEOUT: 'text-orange-400 bg-orange-400/10',
  RETRYING: 'text-purple-400 bg-purple-400/10',
};

export const STATUS_DOT: Record<string, string> = {
  QUEUED: 'bg-yellow-400',
  RUNNING: 'bg-blue-400 animate-pulse',
  SUCCESS: 'bg-green-400',
  FAILED: 'bg-red-400',
  CANCELLED: 'bg-gray-400',
  TIMEOUT: 'bg-orange-400',
  RETRYING: 'bg-purple-400 animate-pulse',
  IDLE: 'bg-green-400',
  BUSY: 'bg-blue-400 animate-pulse',
  OFFLINE: 'bg-gray-600',
  ERROR: 'bg-red-400',
};

export const LANGUAGE_COLORS: Record<string, string> = {
  PYTHON: 'text-yellow-300 bg-yellow-300/10',
  NODE: 'text-green-300 bg-green-300/10',
  JAVA: 'text-orange-300 bg-orange-300/10',
  GENERAL: 'text-blue-300 bg-blue-300/10',
};

export const LANGUAGE_ICONS: Record<string, string> = {
  PYTHON: '🐍',
  NODE: '⬢',
  JAVA: '☕',
  GENERAL: '⚙️',
};

export const EVENT_ICONS: Record<string, string> = {
  push: '⬆',
  pull_request: '⤵',
  release: '🏷',
  workflow_dispatch: '▶',
  job_created: '🔨',
  webhook: '🔗',
  deployment: '🚀',
};

export function githubCommitUrl(owner: string, repo: string, sha: string) {
  return `https://github.com/${owner}/${repo}/commit/${sha}`;
}

export function githubCompareUrl(owner: string, repo: string, sha: string) {
  return `https://github.com/${owner}/${repo}/compare/${sha}~1...${sha}`;
}

export function githubRepoUrl(owner: string, repo: string) {
  return `https://github.com/${owner}/${repo}`;
}
