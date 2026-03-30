'use client';
import { useState, useEffect } from 'react';
import { demoApi, reposApi } from '@/lib/api';
import { Zap, Play, Square, Flame, BookOpen, GitCommit, GitPullRequest, Tag, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export function DemoToggle() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    demoApi.status().then((res: any) => setEnabled(res.demoEnabled)).catch(() => {});
    reposApi.list().then((data: any) => {
      setRepos(data);
      if (data.length) setSelectedRepo(data[0].id);
    }).catch(() => {});
  }, []);

  const run = async (key: string, fn: () => Promise<any>, msg: string) => {
    setLoading(key);
    try {
      await fn();
      toast.success(msg);
    } catch { toast.error('Failed'); }
    finally { setLoading(null); }
  };

  const toggle = () => run('toggle', async () => {
    const res: any = await demoApi.toggle(!enabled);
    setEnabled(res.demoEnabled);
  }, enabled ? 'Demo mode disabled' : 'Demo mode enabled');

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Main toggle row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-white transition-all"
        >
          <Zap className="w-3.5 h-3.5" />
          Controls
        </button>
        <button
          onClick={toggle}
          disabled={loading === 'toggle'}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
            enabled
              ? 'bg-violet-600/20 border-violet-500/30 text-violet-300 hover:bg-violet-600/30'
              : 'bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:text-white',
          )}
        >
          <Zap className={cn('w-3.5 h-3.5', enabled && 'animate-pulse')} />
          Demo {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Expanded controls */}
      {expanded && (
        <div className="glass rounded-xl border border-white/[0.08] p-4 w-80 space-y-3 animate-fade-in">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Demo Controls</div>

          {/* Repo selector */}
          {repos.length > 0 && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Target Repo</label>
              <select
                value={selectedRepo}
                onChange={e => setSelectedRepo(e.target.value)}
                className="mt-1 w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-violet-500"
              >
                {repos.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.fullName}</option>
                ))}
              </select>
            </div>
          )}

          {/* Event triggers */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Trigger Event</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: 'push', label: 'Push', icon: GitCommit, color: 'text-blue-400' },
                { key: 'pull_request', label: 'PR', icon: GitPullRequest, color: 'text-violet-400' },
                { key: 'release', label: 'Release', icon: Tag, color: 'text-green-400' },
              ].map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  disabled={!selectedRepo || loading === key}
                  onClick={() => run(key, () => demoApi.trigger(selectedRepo, key), `${label} event triggered`)}
                  className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all disabled:opacity-40"
                >
                  <Icon className={cn('w-3.5 h-3.5', color)} />
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Special modes */}
          <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
            <button
              disabled={loading === 'story'}
              onClick={() => run('story', () => demoApi.story(), 'Story mode started — watch the dashboard!')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-300 hover:bg-violet-600/20 transition-all text-xs font-medium disabled:opacity-40"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {loading === 'story' ? 'Running story...' : 'Run Story Mode (8 steps)'}
            </button>

            <button
              disabled={loading === 'highload'}
              onClick={() => run('highload', () => demoApi.highLoad(selectedRepo || undefined), 'High load simulation started!')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600/10 border border-red-500/20 text-red-300 hover:bg-red-600/20 transition-all text-xs font-medium disabled:opacity-40"
            >
              <Flame className="w-3.5 h-3.5" />
              {loading === 'highload' ? 'Generating load...' : 'Simulate High Load (10-20 jobs)'}
            </button>

            <button
              disabled={!selectedRepo || loading === 'failure'}
              onClick={() => run('failure', async () => {
                await demoApi.trigger(selectedRepo, 'push', 'feature/breaking-change');
              }, 'Failure scenario triggered')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-600/10 border border-orange-500/20 text-orange-300 hover:bg-orange-600/20 transition-all text-xs font-medium disabled:opacity-40"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Trigger Failure Scenario
            </button>
          </div>

          <div className="text-[10px] text-muted-foreground pt-1 border-t border-white/[0.06]">
            Auto-demo fires every 20s when ON. Story mode runs 8 sequential events across repos.
          </div>
        </div>
      )}
    </div>
  );
}
