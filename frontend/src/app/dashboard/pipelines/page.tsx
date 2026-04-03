'use client';
import { useEffect, useState } from 'react';
import { jobsApi } from '@/lib/api';
import { cn, STATUS_COLORS, STATUS_DOT, LANGUAGE_ICONS, timeAgo, formatDuration, githubCompareUrl, githubRepoUrl } from '@/lib/utils';
import { usePipelineStore } from '@/store/pipeline.store';
import { RotateCcw, XCircle, Filter, ExternalLink, GitCommit, GitBranch, User, Clock, Zap, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const STATUSES = ['ALL', 'QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'];
const STAGE_LABELS: Record<string, string> = {
  checkout: 'Checkout', install: 'Install', build: 'Build', test: 'Test',
  security_scan: 'Security', package: 'Package', deploy: 'Deploy', notify: 'Notify',
};
const STAGE_ICONS: Record<string, string> = {
  checkout: '📥', install: '📦', build: '🔨', test: '🧪',
  security_scan: '🔒', package: '🐳', deploy: '🚀', notify: '🔔',
};
const PIPELINE_STAGES = ['checkout', 'install', 'build', 'test', 'security_scan', 'package', 'deploy', 'notify'];

export default function PipelinesPage() {
  const { jobs, setJobs, upsertJob } = usePipelineStore();
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const load = async () => {
    try { setJobs((await jobsApi.list({ limit: 100 })) as any); }
    catch { toast.error('Failed to load jobs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Keep selected job in sync with store updates
  useEffect(() => {
    if (selected) {
      const updated = jobs.find(j => j.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [jobs]);

  const filtered = filter === 'ALL' ? jobs : jobs.filter(j => j.status === filter);

  const handleCancel = async (id: string) => {
    try { upsertJob((await jobsApi.cancel(id)) as any); toast.success('Cancelled'); }
    catch { toast.error('Failed'); }
  };

  const handleRetry = async (id: string) => {
    try { await jobsApi.retry(id); toast.success('Retrying...'); }
    catch { toast.error('Failed'); }
  };

  const compareUrl = selected?.repository?.owner && selected?.commitHash
    ? githubCompareUrl(selected.repository.owner, selected.repository.name, selected.commitHash)
    : null;

  const repoUrl = selected?.repository?.owner
    ? githubRepoUrl(selected.repository.owner, selected.repository.name)
    : null;

  return (
    <div className="space-y-4 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pipelines</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} pipeline executions</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-white transition-all">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Filter tabs — scrollable on mobile */}
      <div className="flex items-center gap-1 p-1 bg-black/30 rounded-lg w-fit overflow-x-auto max-w-full">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
              filter === s ? 'bg-violet-600 text-white' : 'text-muted-foreground hover:text-white')}>
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Jobs list */}
        <div className="xl:col-span-3 glass rounded-xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <span className="text-sm font-semibold">{filtered.length} jobs</span>
          </div>
          <div className="overflow-y-auto max-h-[70vh]">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">No jobs found</div>
            ) : filtered.map(job => {
              const sha = job.commitHash;
              const owner = job.repository?.owner;
              const repo = job.repository?.name;
              const cUrl = owner && repo && sha ? githubCompareUrl(owner, repo, sha) : null;

              return (
                <div key={job.id} onClick={() => setSelected(job)}
                  className={cn('flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] cursor-pointer transition-colors hover:bg-white/[0.02]',
                    selected?.id === job.id && 'bg-violet-600/10 border-l-2 border-l-violet-500')}>
                  <span className="text-lg flex-shrink-0">{LANGUAGE_ICONS[job.language] || '⚙️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{job.repository?.name || job.name}</span>
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap', STATUS_COLORS[job.status])}>
                        {job.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                        <GitBranch className="w-2.5 h-2.5" />{job.branch}
                      </span>
                      {cUrl ? (
                        <a href={cUrl} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-[11px] text-violet-400 hover:text-violet-300 font-mono flex items-center gap-0.5 transition-colors">
                          {sha?.slice(0, 7)}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-mono">{sha?.slice(0, 7) || '—'}</span>
                      )}
                      {job.author && <span className="text-[11px] text-muted-foreground">{job.author}</span>}
                    </div>
                    {job.commitMsg && (
                      <div className="text-[10px] text-muted-foreground/70 truncate mt-0.5 italic">{job.commitMsg}</div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-mono text-muted-foreground">{formatDuration(job.duration)}</div>
                    <div className="text-[10px] text-muted-foreground">{timeAgo(job.createdAt)}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
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
              );
            })}
          </div>
        </div>

        {/* Pipeline detail */}
        <div className="xl:col-span-2">
          {selected ? (
            <div className="glass rounded-xl border border-white/[0.06] p-5 space-y-4 sticky top-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl flex-shrink-0">{LANGUAGE_ICONS[selected.language]}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {repoUrl ? (
                        <a href={repoUrl} target="_blank" rel="noopener noreferrer"
                          className="font-semibold text-sm hover:text-violet-400 transition-colors flex items-center gap-1">
                          {selected.repository?.owner}/{selected.repository?.name}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="font-semibold text-sm">{selected.repository?.name || selected.name}</span>
                      )}
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1', STATUS_COLORS[selected.status])}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[selected.status])} />
                        {selected.status}
                      </span>
                    </div>
                    {selected.commitMsg && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">"{selected.commitMsg}"</p>
                    )}
                  </div>
                </div>
                <Link href={`/dashboard/logs?jobId=${selected.id}`}
                  className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-all whitespace-nowrap">
                  View Logs →
                </Link>
              </div>

              {/* Commit info */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-black/20 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <GitCommit className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  {compareUrl ? (
                    <a href={compareUrl} target="_blank" rel="noopener noreferrer"
                      className="font-mono text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
                      {selected.commitHash?.slice(0, 7)}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground">{selected.commitHash?.slice(0, 7) || '—'}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">{selected.branch}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">{selected.author || 'unknown'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">{formatDuration(selected.duration)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">{selected.eventType}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Worker: {selected.worker?.name?.replace('worker-', '') || '—'}</span>
                </div>
              </div>

              {/* GitHub compare link */}
              {compareUrl && (
                <a href={compareUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-gray-800/60 border border-white/[0.08] text-xs text-muted-foreground hover:text-white hover:border-white/20 transition-all">
                  <ExternalLink className="w-3.5 h-3.5" />
                  View diff on GitHub → {selected.repository?.owner}/{selected.repository?.name}/compare/{selected.commitHash?.slice(0, 7)}
                </a>
              )}

              {/* Stage visualization */}
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Pipeline Stages</div>
                <div className="space-y-1.5">
                  {PIPELINE_STAGES.map((stage, i) => {
                    const stageData = selected.stages?.[stage];
                    const isCurrent = selected.currentStage === stage && selected.status === 'RUNNING';
                    const isDone = stageData === 'success';
                    const isFailed = stageData === 'failed';

                    return (
                      <div key={stage} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                        isCurrent ? 'bg-blue-500/10 border border-blue-500/20' :
                        isDone ? 'bg-green-500/5 border border-green-500/10' :
                        isFailed ? 'bg-red-500/5 border border-red-500/10' :
                        'bg-white/[0.02] border border-transparent')}>
                        <span className="text-base flex-shrink-0">{STAGE_ICONS[stage]}</span>
                        <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                          isCurrent ? 'bg-blue-500 text-white animate-pulse' :
                          isDone ? 'bg-green-500 text-white' :
                          isFailed ? 'bg-red-500 text-white' :
                          'bg-white/[0.08] text-muted-foreground')}>
                          {isDone ? '✓' : isFailed ? '✗' : isCurrent ? '▶' : i + 1}
                        </div>
                        <span className={cn('text-xs font-medium flex-1',
                          isCurrent ? 'text-blue-300' : isDone ? 'text-green-300' : isFailed ? 'text-red-300' : 'text-muted-foreground')}>
                          {STAGE_LABELS[stage] || stage}
                        </span>
                        {isCurrent && <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />}
                        {isDone && <span className="text-[10px] text-green-400">done</span>}
                        {isFailed && <span className="text-[10px] text-red-400">failed</span>}
                      </div>
                    );
                  })}
                </div>
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
