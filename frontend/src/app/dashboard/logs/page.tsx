'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { jobsApi, logsApi } from '@/lib/api';
import { usePipelineStore } from '@/store/pipeline.store';
import { getSocket } from '@/lib/socket';
import { cn, STATUS_COLORS, STATUS_DOT, LANGUAGE_ICONS, timeAgo, formatDuration } from '@/lib/utils';
import { Terminal, Search, GitCommit, User, GitBranch, Clock, ChevronRight, Download, RefreshCw } from 'lucide-react';

const LOG_COLORS: Record<string, string> = {
  INFO:  'text-gray-300',
  WARN:  'text-yellow-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-blue-400',
  SUCCESS: 'text-green-400',
};

const LOG_BG: Record<string, string> = {
  ERROR: 'bg-red-500/5 border-l-2 border-red-500/40',
  WARN:  'bg-yellow-500/5 border-l-2 border-yellow-500/40',
};

const STAGE_ICONS: Record<string, string> = {
  checkout: '📥', install: '📦', build: '🔨', test: '🧪',
  security_scan: '🔒', package: '🐳', deploy: '🚀', notify: '🔔',
};

function LogsPageInner() {
  const searchParams = useSearchParams();
  const { jobs } = usePipelineStore();
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(searchParams.get('jobId') || '');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [stageFilter, setStageFilter] = useState('ALL');
  const [showDetails, setShowDetails] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load jobs from API on mount
  useEffect(() => {
    jobsApi.list({ limit: 50 }).then((data: any) => setAllJobs(data)).catch(() => {});
  }, []);

  // Merge store jobs with API jobs
  const mergedJobs = [...jobs, ...allJobs.filter(j => !jobs.find(s => s.id === j.id))];

  useEffect(() => {
    if (!selectedJobId) return;
    setLogs([]);
    logsApi.getByJob(selectedJobId).then((data: any) => setLogs(data)).catch(() => {});
    jobsApi.get(selectedJobId).then((data: any) => setSelectedJob(data)).catch(() => {});

    const socket = getSocket();
    const handler = (log: any) => setLogs(prev => [...prev, log]);
    socket.on(`log:${selectedJobId}`, handler);
    return () => { socket.off(`log:${selectedJobId}`, handler); };
  }, [selectedJobId]);

  useEffect(() => {
    if (autoScroll) logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, autoScroll]);

  const stages = ['ALL', ...Array.from(new Set(logs.map(l => l.stage)))];
  const filteredLogs = logs.filter(l => {
    const matchSearch = !search || l.message.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === 'ALL' || l.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const downloadLogs = () => {
    const text = filteredLogs.map(l => `[${l.stage}] [${l.level}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `job-${selectedJobId?.slice(0, 8)}-logs.txt`; a.click();
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)] gap-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold">Log Viewer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time build logs with live streaming</p>
        </div>
        {selectedJobId && (
          <button onClick={() => { setLogs([]); logsApi.getByJob(selectedJobId).then((d: any) => setLogs(d)).catch(() => {}); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-white transition-all">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        )}
      </div>

      <div className="flex gap-3 flex-1 min-h-0">
        {/* Job list — hidden on mobile, shown on md+ */}
        <div className="hidden md:flex w-56 lg:w-64 flex-shrink-0 glass rounded-xl border border-white/[0.06] flex-col">
          <div className="px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Jobs ({mergedJobs.length})
            </span>
          </div>
          <div className="overflow-y-auto flex-1">
            {mergedJobs.slice(0, 50).map(job => (
              <button key={job.id} onClick={() => { setSelectedJobId(job.id); setStageFilter('ALL'); }}
                className={cn('w-full text-left px-3 py-2.5 border-b border-white/[0.03] transition-colors hover:bg-white/[0.03]',
                  selectedJobId === job.id && 'bg-violet-600/10 border-l-2 border-l-violet-500')}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{LANGUAGE_ICONS[job.language] || '⚙️'}</span>
                  <span className="text-xs font-medium truncate">{job.repository?.name || job.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium', STATUS_COLORS[job.status])}>{job.status}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{job.commitHash?.slice(0, 7) || '—'}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(job.createdAt)}</div>
              </button>
            ))}
            {mergedJobs.length === 0 && (
              <div className="p-4 text-xs text-muted-foreground text-center">No jobs yet</div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
          {/* Mobile job selector */}
          <div className="md:hidden">
            <select value={selectedJobId} onChange={e => { setSelectedJobId(e.target.value); setStageFilter('ALL'); }}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500">
              <option value="">Select a job...</option>
              {mergedJobs.slice(0, 50).map(job => (
                <option key={job.id} value={job.id}>
                  {job.repository?.name || job.name} — {job.status} — {job.commitHash?.slice(0, 7) || '—'}
                </option>
              ))}
            </select>
          </div>

          {/* Job details bar */}
          {selectedJob && (
            <div className="glass rounded-xl border border-white/[0.06] p-3 flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0">{LANGUAGE_ICONS[selectedJob.language] || '⚙️'}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{selectedJob.repository?.name || selectedJob.name}</span>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1', STATUS_COLORS[selectedJob.status])}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[selectedJob.status])} />
                        {selectedJob.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <GitCommit className="w-3 h-3" />
                        <span className="font-mono">{selectedJob.commitHash?.slice(0, 7) || '—'}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <GitBranch className="w-3 h-3" />{selectedJob.branch}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <User className="w-3 h-3" />{selectedJob.author || 'unknown'}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" />{formatDuration(selectedJob.duration)}
                      </span>
                    </div>
                    {selectedJob.commitMsg && (
                      <p className="text-[11px] text-muted-foreground mt-1 truncate italic">"{selectedJob.commitMsg}"</p>
                    )}
                  </div>
                </div>
                {/* Stage progress */}
                <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
                  {['checkout','install','build','test','security_scan','package','deploy','notify'].map(stage => {
                    const result = selectedJob.stages?.[stage];
                    const isCurrent = selectedJob.currentStage === stage && selectedJob.status === 'RUNNING';
                    return (
                      <div key={stage} title={stage}
                        className={cn('w-6 h-6 rounded flex items-center justify-center text-[10px]',
                          result === 'success' ? 'bg-green-500/20 text-green-400' :
                          result === 'failed' ? 'bg-red-500/20 text-red-400' :
                          isCurrent ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                          'bg-white/[0.04] text-muted-foreground/40')}>
                        {STAGE_ICONS[stage] || '●'}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Terminal */}
          <div className="flex-1 glass rounded-xl border border-white/[0.06] flex flex-col overflow-hidden min-h-0">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] flex-shrink-0 flex-wrap gap-y-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Terminal className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-xs font-semibold truncate">
                  {selectedJobId ? `job-${selectedJobId.slice(0, 8)}` : 'No job selected'}
                </span>
                {logs.length > 0 && <span className="text-[10px] text-muted-foreground flex-shrink-0">({filteredLogs.length}/{logs.length} lines)</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Stage filter */}
                {stages.length > 1 && (
                  <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-violet-500">
                    {stages.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All stages' : `${STAGE_ICONS[s] || ''} ${s}`}</option>)}
                  </select>
                )}
                {/* Search */}
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                    className="pl-6 pr-2 py-1 bg-black/30 border border-white/10 rounded-lg text-[11px] focus:outline-none focus:border-violet-500 w-28 sm:w-36" />
                </div>
                <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer whitespace-nowrap">
                  <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="w-3 h-3 accent-violet-500" />
                  Auto-scroll
                </label>
                {logs.length > 0 && (
                  <button onClick={downloadLogs} title="Download logs"
                    className="p-1 rounded text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-all">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Log lines */}
            <div className="flex-1 overflow-y-auto font-mono text-xs p-3 space-y-0.5 bg-black/20">
              {!selectedJobId && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Terminal className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm">Select a job to view logs</p>
                </div>
              )}
              {selectedJobId && filteredLogs.length === 0 && (
                <div className="text-muted-foreground p-4">
                  {logs.length === 0 ? 'Waiting for logs...' : 'No logs match your filter'}
                </div>
              )}
              {filteredLogs.map((log, i) => (
                <div key={log.id || i} className={cn('flex gap-2 py-0.5 px-1 rounded group hover:bg-white/[0.02]', LOG_BG[log.level] || '')}>
                  <span className="text-muted-foreground/30 select-none w-5 text-right flex-shrink-0 text-[10px] pt-px">{i + 1}</span>
                  <span className="text-muted-foreground/50 flex-shrink-0 w-14 text-[10px] pt-px">
                    {new Date(log.timestamp).toLocaleTimeString('en', { hour12: false })}
                  </span>
                  <span className={cn('flex-shrink-0 w-8 font-bold text-[10px] pt-px', LOG_COLORS[log.level] || 'text-gray-400')}>
                    {log.level?.slice(0, 4)}
                  </span>
                  <span className="flex-shrink-0 text-violet-400/60 text-[10px] pt-px hidden sm:block">
                    [{log.stage}]
                  </span>
                  <span className={cn('flex-1 break-all', LOG_COLORS[log.level] || 'text-gray-300')}>{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LogsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <LogsPageInner />
    </Suspense>
  );
}
