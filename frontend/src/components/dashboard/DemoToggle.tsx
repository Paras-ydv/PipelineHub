'use client';
import { useState, useEffect } from 'react';
import { demoApi } from '@/lib/api';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export function DemoToggle() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    demoApi.status().then((res: any) => setEnabled(res.demoEnabled)).catch(() => {});
  }, []);

  const toggle = async () => {
    setLoading(true);
    try {
      const res: any = await demoApi.toggle(!enabled);
      setEnabled(res.demoEnabled);
      toast.success(res.demoEnabled ? 'Demo mode enabled' : 'Demo mode disabled');
    } catch { toast.error('Failed to toggle demo mode'); }
    finally { setLoading(false); }
  };

  return (
    <button onClick={toggle} disabled={loading}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
        enabled
          ? 'bg-violet-600/20 border-violet-500/30 text-violet-300 hover:bg-violet-600/30'
          : 'bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:text-white'
      )}>
      <Zap className={cn('w-3.5 h-3.5', enabled && 'animate-pulse')} />
      Demo {enabled ? 'ON' : 'OFF'}
    </button>
  );
}
