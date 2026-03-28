'use client';
import { usePipelineStore } from '@/store/pipeline.store';
import { cn, STATUS_DOT, LANGUAGE_ICONS, timeAgo } from '@/lib/utils';
import { Cpu, Activity, CheckCircle2, XCircle } from 'lucide-react';

export default function WorkersPage() {
  const { workers } = usePipelineStore();

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-semibold">Worker Nodes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">4 simulated worker processes with language specialization</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Workers', value: workers.length, color: 'text-violet-400' },
          { label: 'Idle', value: workers.filter(w => w.status === 'IDLE').length, color: 'text-green-400' },
          { label: 'Busy', value: workers.filter(w => w.status === 'BUSY').length, color: 'text-blue-400' },
          { label: 'Offline', value: workers.filter(w => w.status === 'OFFLINE').length, color: 'text-gray-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-xl border border-white/[0.06] p-4">
            <div className="text-xs text-muted-foreground mb-2">{label}</div>
            <div className={cn('text-3xl font-bold', color)}>{value}</div>
          </div>
        ))}
      </div>

      {/* Worker cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {workers.map((worker) => (
          <div key={worker.id} className={cn(
            'glass rounded-xl border p-6 transition-all',
            worker.status === 'BUSY' ? 'border-blue-500/30 glow-cyan' :
            worker.status === 'OFFLINE' ? 'border-white/[0.04] opacity-60' :
            worker.status === 'ERROR' ? 'border-red-500/30' :
            'border-white/[0.08]'
          )}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
                  worker.status === 'BUSY' ? 'bg-blue-500/20' : 'bg-white/[0.05]')}>
                  {LANGUAGE_ICONS[worker.language] || '⚙️'}
                </div>
                <div>
                  <div className="font-semibold">{worker.name}</div>
                  <div className="text-xs text-muted-foreground">{worker.language} specialist</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('w-2.5 h-2.5 rounded-full', STATUS_DOT[worker.status])} />
                <span className="text-sm font-medium">{worker.status}</span>
              </div>
            </div>

            {/* CPU/MEM bars */}
            <div className="space-y-3 mb-5">
              {[
                { label: 'CPU', value: worker.cpuUsage, color: worker.cpuUsage > 80 ? 'bg-red-400' : worker.cpuUsage > 50 ? 'bg-yellow-400' : 'bg-green-400' },
                { label: 'Memory', value: worker.memUsage, color: 'bg-violet-400' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span className="flex items-center gap-1.5"><Cpu className="w-3 h-3" />{label}</span>
                    <span className="font-mono font-medium">{value.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all duration-700', color)}
                      style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.06]">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-sm font-bold">{worker.jobsCompleted}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
                  <XCircle className="w-3.5 h-3.5" />
                  <span className="text-sm font-bold">{worker.jobsFailed}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span className="text-sm font-bold">
                    {worker.jobsCompleted + worker.jobsFailed > 0
                      ? `${Math.round((worker.jobsCompleted / (worker.jobsCompleted + worker.jobsFailed)) * 100)}%`
                      : '—'}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">Success</div>
              </div>
            </div>

            {worker.currentJobId && (
              <div className="mt-3 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-[10px] text-blue-300 font-mono truncate">
                  Processing: {worker.currentJobId.slice(0, 20)}...
                </div>
              </div>
            )}

            <div className="mt-3 text-[10px] text-muted-foreground">
              Last heartbeat: {timeAgo(worker.lastHeartbeat)}
            </div>
          </div>
        ))}
      </div>

      {/* Architecture info */}
      <div className="glass rounded-xl border border-white/[0.06] p-5">
        <h2 className="text-sm font-semibold mb-4">Worker Assignment Rules</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { worker: 'worker-python', icon: '🐍', rule: 'Python repositories → Python worker', fallback: 'Falls back to general' },
            { worker: 'worker-node', icon: '⬢', rule: 'Node.js repositories → Node worker', fallback: 'Falls back to general' },
            { worker: 'worker-java', icon: '☕', rule: 'Java repositories → Java worker', fallback: 'Falls back to general' },
            { worker: 'worker-general', icon: '⚙️', rule: 'All other languages', fallback: 'Handles overflow jobs' },
          ].map(({ worker, icon, rule, fallback }) => (
            <div key={worker} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-xs font-medium font-mono text-violet-300 mb-1">{worker}</div>
              <div className="text-[10px] text-muted-foreground">{rule}</div>
              <div className="text-[10px] text-muted-foreground/60 mt-1">{fallback}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
