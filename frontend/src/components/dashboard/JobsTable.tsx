'use client';
import { usePipelineStore, Job } from '@/store/pipeline.store';
import { jobsApi } from '@/lib/api';
import { cn, STATUS_COLORS, STATUS_DOT, LANGUAGE_ICONS, timeAgo, formatDuration } from '@/lib/utils';
import { RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const STAGE_LABELS: Record<string, string> = {
  checkout: 'Checkout',
  install: 'Install',
  build: 'Build',
  test: 'Test',
  security_scan: 'Security',
  package: 'Package',
  deploy: 'Deploy',
  notify: 'Notify',
};

export function JobsTable() {
  const { jobs, upsertJob } = usePipelineStore();

  const handleCancel = async (id: string) => {
    try {
      const updated: any = await jobsApi.cancel(id);
      upsertJob(updated);
      toast.success('Job cancelled');
    } catch { toast.error('Failed to cancel'); }
  };

  const handleRetry = async (id: string) => {
    try {
      await jobsApi.retry(id);
      toast.success('Job queued for retry');
    } catch { toast.error('Failed to retry'); }
  };

  return (
    <div className="glass rounded-xl border border-white/[0.06]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div>
          <h2 className="text-sm font-semibold">Recent Jobs</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{jobs.length} jobs loaded</p>
        </div>
        <Link href="/dashboard/pipelines" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
          View all →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04]">
              {['Job', 'Status', 'Stage', 'Worker', 'Duration', 'Triggered', ''].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.slice(0, 15).map((job) => (
              <tr key={job.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{LANGUAGE_ICONS[job.language] || '⚙️'}</span>
                    <div>
                      <Link href={`/dashboard/logs?jobId=${job.id}`}
                        className="font-medium text-xs hover:text-violet-400 transition-colors truncate max-w-[140px] block">
                        {job.repository?.name || job.name}
                      </Link>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {job.branch} · {job.commitHash?.slice(0, 7) || '—'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium', STATUS_COLORS[job.status])}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[job.status])} />
                    {job.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs text-muted-foreground font-mono">
                    {job.currentStage ? STAGE_LABELS[job.currentStage] || job.currentStage : '—'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs text-muted-foreground">{job.worker?.name?.replace('worker-', '') || '—'}</span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs font-mono text-muted-foreground">{formatDuration(job.duration)}</span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs text-muted-foreground">{timeAgo(job.createdAt)}</span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {job.status === 'RUNNING' && (
                      <button onClick={() => handleCancel(job.id)}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {job.status === 'FAILED' && (
                      <button onClick={() => handleRetry(job.id)}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-violet-400 hover:bg-violet-400/10 transition-all">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm">
                  No jobs yet. Enable demo mode or trigger a webhook to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
