'use client';
import { useEffect, useState } from 'react';
import { queueApi } from '@/lib/api';
import { usePipelineStore } from '@/store/pipeline.store';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ListOrdered, Clock, Zap, CheckCircle2, XCircle, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';

export default function QueuePage() {
  const { queueMetrics } = usePipelineStore();
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    queueApi.history().then((data: any) => {
      setHistory([...data].reverse().slice(-30));
    }).catch(() => {});
  }, []);

  const metrics = [
    { label: 'Waiting', value: queueMetrics.waiting, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
    { label: 'Active', value: queueMetrics.active, icon: Zap, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    { label: 'Completed', value: queueMetrics.completed, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
    { label: 'Failed', value: queueMetrics.failed, icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
    { label: 'Delayed', value: queueMetrics.delayed, icon: Timer, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass rounded-lg p-3 border border-white/[0.08] text-xs">
        <p className="text-muted-foreground mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium">{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-semibold">Queue Monitor</h1>
        <p className="text-sm text-muted-foreground mt-0.5">BullMQ pipeline queue status</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {metrics.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={cn('glass rounded-xl p-4 border', border)}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{label}</span>
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', bg)}>
                <Icon className={cn('w-3.5 h-3.5', color)} />
              </div>
            </div>
            <div className={cn('text-3xl font-bold tabular-nums', color)}>{value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass rounded-xl border border-white/[0.06] p-5">
        <h2 className="text-sm font-semibold mb-5">Queue History (last 30 snapshots)</h2>
        {history.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {[
                  { id: 'waiting', color: '#eab308' },
                  { id: 'active', color: '#3b82f6' },
                  { id: 'completed', color: '#22c55e' },
                  { id: 'failed', color: '#ef4444' },
                ].map(({ id, color }) => (
                  <linearGradient key={id} id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="timestamp" tickFormatter={(v) => formatDate(v).split(',')[0]}
                tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              {[
                { key: 'waiting', color: '#eab308' },
                { key: 'active', color: '#3b82f6' },
                { key: 'completed', color: '#22c55e' },
                { key: 'failed', color: '#ef4444' },
              ].map(({ key, color }) => (
                <Area key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={1.5}
                  fill={`url(#grad-${key})`} name={key} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
            No history data yet. Queue metrics are captured every 30 seconds.
          </div>
        )}
      </div>

      {/* Queue info */}
      <div className="glass rounded-xl border border-white/[0.06] p-5">
        <h2 className="text-sm font-semibold mb-4">Queue Configuration</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Queue Name', value: 'pipeline' },
            { label: 'Backend', value: 'BullMQ + Redis' },
            { label: 'Max Retries', value: '3' },
            { label: 'Backoff', value: 'Exponential (5s)' },
            { label: 'Priority Levels', value: '1–10' },
            { label: 'Concurrency', value: '4 workers' },
            { label: 'Snapshot Interval', value: '30s' },
            { label: 'Job TTL', value: '7 days' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
              <div className="font-mono text-xs text-violet-300">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
