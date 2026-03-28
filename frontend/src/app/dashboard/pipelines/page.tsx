'use client';
import { useEffect, useState } from 'react';
import { jobsApi, webhooksApi, reposApi } from '@/lib/api';
import { cn, STATUS_COLORS, STATUS_DOT, LANGUAGE_ICONS, timeAgo, formatDuration } from '@/lib/utils';
import { usePipelineStore } from '@/store/pipeline.store';
import { RotateCcw, XCircle, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUSES = ['ALL', 'QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'];
const STAGE_LABELS: Record<string, string> = {
  checkout: 'Checkout', install: 'Install', build: 'Build', test: 'Test',
  security_scan: 'Security', package: 'Package', deploy: 'Deploy', notify: 'Notify',
};

const PIPELINE_STAGES = ['checkout', 'install', 'build', 'test', 'security_scan', 'package', 'deploy', 'notify'];

export default function PipelinesPage() {
  const { jobs, setJobs, upsertJob } = usePipelineStore();
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try { setJobs((await jobsApi.list({ limit: 100 })) as any); }
      catch { toast.error('Failed to load jobs'); }
      finally { setLoading(false); }
    };
    load();
  }, [setJobs]);

  const filtered = filter === 'ALL' ? jobs : jobs.filter(j => j.status === filter);

  const handleCancel = async (id: string) => {
    try { upsertJob((await jobsApi.cancel(id)) as any); toast.success('Cancelled'); }
    catch { toast.error('Failed'); }
  };

  const handleRetry = async (id: string) => {
    try { await jobsApi.retry(id); toast.success('Retrying...'); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-semibold">Pipelines</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All pipeline executions</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 bg-black/30 rounded-lg w-fit">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              filter === s ? 'bg-violet-600 text-white' : 'text-muted-foreground hover:text-white')}>
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Jobs list */}
        <div className="xl:col-span-3 glass rounded-xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <span className="text-sm font-semibold">{filtered.length} jobs</span>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">No jobs found</div>
            ) : filtered.map(job => (
              <div key={job.id} onClick={() => setSelected(job)}
                className={cn('flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.03] cursor-pointer transition-colors hover:bg-white/[0.02]',
                  selected?.id === job.id && 'bg-violet-600/10 border-l-2 border-l-violet-500')}>
                <span className="text-lg flex-shrink-0">{LANGUAGE_ICONS[job.language] || '⚙️'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{job.repository?.name || job.name}</span>
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_COLORS[job.status])}>
                      {job.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">
                    {job.branch} · {job.commitHash?.slice(0, 7) || '—'} · {job.author || 'unknown'}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-mono text-muted-foreground">{formatDuration(job.duration)}</div>
                  <div className="text-[10px] text-muted-foreground">{timeAgo(job.createdAt)}</div>
                </div>
                <div className="flex gap-1">
                  {job.status === 'RUNNING' && (
                    <button onClick={e => { e.stopPropagation(); handleCancel(job.id); }}
                      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all">
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {job.status === 'FAILED' && (
                    <button onClick={e => { e.stopPropagation(); handleRetry(job.id); }}
                      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-violet-400 hover:bg-violet-400/10 transition-all">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline detail */}
        <div className="xl:col-span-2">
          {selected ? (
            <div className="glass rounded-xl border border-white/[0.06] p-5 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{LANGUAGE_ICONS[selected.language]}</span>
                  <h3 className="font-semibold text-sm">{selected.repository?.name || selected.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{selected.commitMsg || 'No message'}</p>
              </div>

              {/* Stage visualization */}
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Pipeline Stages</div>
                <div className="space-y-2">
                  {PIPELINE_STAGES.map((stage, i) => {
                    const stageData = selected.stages?.[stage];
                    const isCurrent = selected.currentStage === stage && selected.status === 'RUNNING';
                    const isDone = stageData === 'success';
                    const isFailed = stageData === 'failed';
                    const isPending = !stageData && !isCurrent;

                    return (
                      <div key={stage} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                        isCurrent ? 'bg-blue-500/10 border border-blue-500/20' :
                        isDone ? 'bg-green-500/5' : 'bg-white/[0.02]')}>
                        <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                          isCurrent ? 'bg-blue-500 text-white animate-pulse' :
                          isDone ? 'bg-green-500 text-white' :
                          isFailed ? 'bg-red-500 text-white' :
                          'bg-white/[0.08] text-muted-foreground')}>
                          {isDone ? '✓' : isFailed ? '✗' : isCurrent ? '▶' : i + 1}
                        </div>
                        <span className={cn('text-xs font-medium',
                          isCurrent ? 'text-blue-300' : isDone ? 'text-green-300' : isFailed ? 'text-red-300' : 'text-muted-foreground')}>
                          {STAGE_LABELS[stage] || stage}
                        </span>
                        {isCurrent && <div className="ml-auto w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06]">
                {[
                  { label: 'Status', value: selected.status },
                  { label: 'Duration', value: formatDuration(selected.duration) },
                  { label: 'Worker', value: selected.worker?.name?.replace('worker-', '') || '—' },
                  { label: 'Priority', value: selected.priority },
                  { label: 'Retries', value: selected.retryCount },
                  { label: 'Event', value: selected.eventType },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
                    <div className="text-xs font-medium mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass rounded-xl border border-white/[0.06] p-8 text-center">
              <Filter className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select a job to view pipeline details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
