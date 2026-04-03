'use client';
import { usePipelineStore, Job } from '@/store/pipeline.store';
import { jobsApi } from '@/lib/api';
import { cn, STATUS_COLORS, STATUS_DOT, LANGUAGE_ICONS, timeAgo, formatDuration, githubCompareUrl } from '@/lib/utils';
import { RotateCcw, XCircle, ExternalLink, GitCommit } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const STAGE_LABELS: Record<string, string> = {
  checkout: 'Checkout', install: 'Install', build: 'Build', test: 'Test',
  security_scan: 'Security', package: 'Package', deploy: 'Deploy', notify: 'Notify',
};

export function JobsTable() {
  const { jobs, upsertJob } = usePipelineStore();

  const handleCancel = async (id: string) => {
    try { upsertJob((await jobsApi.cancel(id)) as any); toast.success('Job cancelled'); }
    catch { toast.error('Failed to cancel'); }
  };

  const handleRetry = async (id: string) => {
    try { await jobsApi.retry(id); toast.success('Job queued for retry'); }
    catch { toast.error('Failed to retry'); }
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
              {['Job', 'Commit', 'Status', 'Stage', 'Worker', 'Duration', 'Triggered', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.slice(0, 15).map((job) => {
              const owner = job.repository?.owner;
              const repo = job.repository?.name;
              const sha = job.commitHash;
              const compareUrl = owner && repo && sha ? githubCompareUrl(owner, repo, sha) : null;

              return (
                <tr key={job.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{LANGUAGE_ICONS[job.language] || '⚙️'}</span>
                      <div>
                        <Link href={`/dashboard/logs?jobId=${job.id}`}
                          className="font-medium text-xs hover:text-violet-400 transition-colors truncate max-w-[120px] block">
                          {job.repository?.name || job.name}
                        </Link>
                        <div className="text-[10px] text-muted-foreground font-mono">{job.branch}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <GitCommit className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      {compareUrl ? (
                        <a href={compareUrl} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-[11px] text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
                          {sha?.slice(0, 7) || '—'}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="font-mono text-[11px] text-muted-foreground">{sha?.slice(0, 7) || '—'}</span>
                      )}
                    </div>
                    {job.commitMsg && (
                      <div className="text-[10px] text-muted-foreground truncate max-w-[120px] mt-0.5 italic">
                        {job.commitMsg}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap', STATUS_COLORS[job.status])}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[job.status])} />
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {job.currentStage ? STAGE_LABELS[job.currentStage] || job.currentStage : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{job.worker?.name?.replace('worker-', '') || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">{formatDuration(job.duration)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(job.createdAt)}</div>
                    {job.author && <div className="text-[10px] text-muted-foreground/60">{job.author}</div>}
                  </td>
                  <td className="px-4 py-3">
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
              );
            })}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground text-sm">
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
