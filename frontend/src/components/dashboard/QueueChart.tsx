'use client';
import { usePipelineStore } from '@/store/pipeline.store';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart2 } from 'lucide-react';

export function QueueChart() {
  const { queueMetrics } = usePipelineStore();

  const data = [
    { name: 'Waiting', value: queueMetrics.waiting, fill: '#eab308' },
    { name: 'Active', value: queueMetrics.active, fill: '#3b82f6' },
    { name: 'Completed', value: queueMetrics.completed, fill: '#22c55e' },
    { name: 'Failed', value: queueMetrics.failed, fill: '#ef4444' },
    { name: 'Delayed', value: queueMetrics.delayed, fill: '#a855f7' },
  ];

  return (
    <div className="glass rounded-xl border border-white/[0.06]">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
        <BarChart2 className="w-3.5 h-3.5 text-violet-400" />
        <h2 className="text-sm font-semibold">Queue Status</h2>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-5 gap-2">
          {data.map(({ name, value, fill }) => (
            <div key={name} className="text-center">
              <div className="text-lg font-bold tabular-nums" style={{ color: fill }}>{value}</div>
              <div className="text-[10px] text-muted-foreground">{name}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-1 h-2 rounded-full overflow-hidden">
          {data.map(({ name, value, fill }) => {
            const total = data.reduce((s, d) => s + d.value, 0) || 1;
            return (
              <div key={name} className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(value / total) * 100}%`, backgroundColor: fill }} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
