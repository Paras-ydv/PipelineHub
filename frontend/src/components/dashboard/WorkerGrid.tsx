'use client';
import { usePipelineStore } from '@/store/pipeline.store';
import { cn, STATUS_DOT, LANGUAGE_ICONS } from '@/lib/utils';
import { Cpu, MemoryStick } from 'lucide-react';

export function WorkerGrid() {
  const { workers } = usePipelineStore();

  return (
    <div className="glass rounded-xl border border-white/[0.06]">
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold">Worker Nodes</h2>
        <p className="text-xs text-muted-foreground mt-0.5">4 simulated worker processes</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
        {workers.map((worker) => (
          <div key={worker.id} className={cn(
            'rounded-xl p-4 border transition-all',
            worker.status === 'BUSY' ? 'border-blue-500/30 bg-blue-500/5 glow-cyan' :
            worker.status === 'OFFLINE' ? 'border-white/[0.04] bg-black/20 opacity-60' :
            worker.status === 'ERROR' ? 'border-red-500/30 bg-red-500/5' :
            'border-white/[0.06] bg-white/[0.02]'
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{LANGUAGE_ICONS[worker.language] || '⚙️'}</span>
                <div>
                  <div className="text-xs font-semibold">{worker.name}</div>
                  <div className="text-[10px] text-muted-foreground">{worker.language}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full', STATUS_DOT[worker.status])} />
                <span className="text-[10px] text-muted-foreground">{worker.status}</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU</span>
                  <span className="font-mono">{worker.cpuUsage.toFixed(0)}%</span>
                </div>
                <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all duration-500',
                    worker.cpuUsage > 80 ? 'bg-red-400' : worker.cpuUsage > 50 ? 'bg-yellow-400' : 'bg-green-400'
                  )} style={{ width: `${worker.cpuUsage}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>MEM</span>
                  <span className="font-mono">{worker.memUsage.toFixed(0)}%</span>
                </div>
                <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-400 rounded-full transition-all duration-500"
                    style={{ width: `${worker.memUsage}%` }} />
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-3 pt-3 border-t border-white/[0.06] text-[10px] text-muted-foreground">
              <span>✓ {worker.jobsCompleted}</span>
              <span>✗ {worker.jobsFailed}</span>
            </div>
          </div>
        ))}
        {workers.length === 0 && (
          <div className="col-span-4 py-8 text-center text-muted-foreground text-sm">
            No workers registered. Run the seed script to initialize workers.
          </div>
        )}
      </div>
    </div>
  );
}
