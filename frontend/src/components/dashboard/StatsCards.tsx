'use client';
import { usePipelineStore } from '@/store/pipeline.store';
import { CheckCircle2, XCircle, Clock, Zap, GitCommit, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatsCards() {
  const { stats, queueMetrics } = usePipelineStore();

  const cards = [
    {
      label: 'Total Builds',
      value: stats.total,
      icon: GitCommit,
      color: 'text-violet-400',
      bg: 'bg-violet-400/10',
      border: 'border-violet-400/20',
    },
    {
      label: 'Running',
      value: stats.running,
      icon: Zap,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/20',
      pulse: stats.running > 0,
    },
    {
      label: 'Queued',
      value: queueMetrics.waiting,
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
      border: 'border-yellow-400/20',
    },
    {
      label: 'Successful',
      value: stats.success,
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
      border: 'border-green-400/20',
    },
    {
      label: 'Failed',
      value: stats.failed,
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      border: 'border-red-400/20',
    },
    {
      label: 'Success Rate',
      value: stats.total > 0 ? `${Math.round((stats.success / stats.total) * 100)}%` : '—',
      icon: TrendingUp,
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
      border: 'border-cyan-400/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg, border, pulse }) => (
        <div key={label} className={cn('glass rounded-xl p-4 border', border)}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', bg)}>
              <Icon className={cn('w-3.5 h-3.5', color, pulse && 'animate-pulse')} />
            </div>
          </div>
          <div className={cn('text-2xl font-bold tabular-nums', color)}>{value}</div>
        </div>
      ))}
    </div>
  );
}
