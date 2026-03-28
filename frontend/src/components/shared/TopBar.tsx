'use client';
import { useAuthStore } from '@/store/auth.store';
import { usePipelineStore } from '@/store/pipeline.store';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, User, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TopBar() {
  const { user, logout } = useAuthStore();
  const { stats } = usePipelineStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06] bg-black/10 flex-shrink-0">
      {/* Live stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
        <div className="flex items-center gap-3">
          {[
            { label: 'Running', value: stats.running, color: 'text-blue-400' },
            { label: 'Queued', value: stats.queued, color: 'text-yellow-400' },
            { label: 'Failed', value: stats.failed, color: 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs">
              <span className={cn('font-semibold tabular-nums', color)}>{value}</span>
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-all">
          <Bell className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-white/[0.06]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-medium">{user?.username}</div>
            <div className="text-[10px] text-muted-foreground">{user?.role}</div>
          </div>
          <button onClick={handleLogout}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all ml-1">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
