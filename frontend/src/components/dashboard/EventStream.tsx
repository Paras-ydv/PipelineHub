'use client';
import { usePipelineStore } from '@/store/pipeline.store';
import { EVENT_ICONS } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';
import { Radio } from 'lucide-react';

export function EventStream() {
  const { recentEvents } = usePipelineStore();

  return (
    <div className="glass rounded-xl border border-white/[0.06]">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
        <Radio className="w-3.5 h-3.5 text-green-400 animate-pulse" />
        <h2 className="text-sm font-semibold">Live Event Stream</h2>
      </div>
      <div className="p-3 space-y-1 max-h-64 overflow-y-auto">
        {recentEvents.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Waiting for events...</p>
        )}
        {recentEvents.map((event) => (
          <div key={event.id} className="flex items-start gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors">
            <span className="text-sm mt-0.5 flex-shrink-0">{EVENT_ICONS[event.type] || '●'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground/80 truncate">{event.message}</p>
              <p className="text-[10px] text-muted-foreground">{timeAgo(event.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
