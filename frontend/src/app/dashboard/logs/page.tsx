'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { jobsApi, logsApi } from '@/lib/api';
import { usePipelineStore } from '@/store/pipeline.store';
import { getSocket } from '@/lib/socket';
import { cn, STATUS_COLORS, LANGUAGE_ICONS, timeAgo } from '@/lib/utils';
import { Terminal, Search } from 'lucide-react';

const LOG_COLORS: Record<string, string> = {
  INFO: 'text-gray-300',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-blue-400',
};

export default function LogsPage() {
  const searchParams = useSearchParams();
  const { jobs } = usePipelineStore();
  const [selectedJobId, setSelectedJobId] = useState<string>(searchParams.get('jobId') || '');
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedJobId) {
      logsApi.getByJob(selectedJobId).then((data: any) => setLogs(data)).catch(() => {});
      const socket = getSocket();
      const handler = (log: any) => setLogs(prev => [...prev, log]);
      socket.on(`log:${selectedJobId}`, handler);
      return () => { socket.off(`log:${selectedJobId}`, handler); };
    }
  }, [selectedJobId]);

  useEffect(() => {
    if (autoScroll) logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, autoScroll]);

  const filteredLogs = search ? logs.filter(l => l.message.toLowerCase().includes(search.toLowerCase())) : logs;

  return (
    <div className="space-y-4 max-w-[1400px] h-full flex flex-col">
      <div>
        <h1 className="text-xl font-semibold">Log Viewer</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Real-time build logs with live streaming</p>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Job selector */}
        <div className="w-64 flex-shrink-0 glass rounded-xl border border-white/[0.06] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jobs</span>
          </div>
          <div className="overflow-y-auto flex-1">
            {jobs.slice(0, 30).map(job => (
              <button key={job.id} onClick={() => { setSelectedJobId(job.id); setLogs([]); }}
                className={cn('w-full text-left px-4 py-3 border-b border-white/[0.03] transition-colors hover:bg-white/[0.03]',
                  selectedJobId === job.id && 'bg-violet-600/10 border-l-2 border-l-violet-500')}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{LANGUAGE_ICONS[job.language]}</span>
                  <span className="text-xs font-medium truncate">{job.repository?.name || job.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium', STATUS_COLORS[job.status])}>{job.status}</span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(job.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Log terminal */}
        <div className="flex-1 glass rounded-xl border border-white/[0.06] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-green-400" />
              <span className="text-xs font-semibold">
                {selectedJobId ? `Job: ${selectedJobId.slice(0, 8)}...` : 'Select a job'}
              </span>
              {selectedJobId && <span className="text-[10px] text-muted-foreground">({filteredLogs.length} lines)</span>}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..."
                  className="pl-8 pr-3 py-1.5 bg-black/30 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-violet-500 w-48" />
              </div>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)}
                  className="w-3 h-3 accent-violet-500" />
                Auto-scroll
              </label>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto terminal p-4 font-mono text-xs">
            {!selectedJobId && (
              <div className="text-muted-foreground text-center py-12">
                <Terminal className="w-8 h-8 mx-auto mb-3 opacity-30" />
                Select a job from the left panel to view logs
              </div>
            )}
            {selectedJobId && filteredLogs.length === 0 && (
              <div className="text-muted-foreground">Waiting for logs...</div>
            )}
            {filteredLogs.map((log, i) => (
              <div key={log.id || i} className="flex gap-3 py-0.5 hover:bg-white/[0.02] rounded px-1 group">
                <span className="text-muted-foreground/50 select-none w-6 text-right flex-shrink-0">{i + 1}</span>
                <span className="text-muted-foreground/60 flex-shrink-0 w-16">
                  {new Date(log.timestamp).toLocaleTimeString('en', { hour12: false })}
                </span>
                <span className={cn('flex-shrink-0 w-10 font-bold text-[10px]', LOG_COLORS[log.level] || 'text-gray-400')}>
                  {log.level}
                </span>
                <span className="text-muted-foreground/50 flex-shrink-0 w-20 truncate">[{log.stage}]</span>
                <span className={cn('flex-1', LOG_COLORS[log.level] || 'text-gray-300')}>{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
