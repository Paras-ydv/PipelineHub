'use client';
import { useEffect, useState } from 'react';
import { reposApi, demoApi } from '@/lib/api';
import { cn, LANGUAGE_COLORS, LANGUAGE_ICONS, timeAgo } from '@/lib/utils';
import { Plus, GitBranch, Play, Power, Zap, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Repo {
  id: string; name: string; owner: string; fullName: string;
  branch: string; language: string; isActive: boolean; autoDemo: boolean;
  eventTypes: string[]; environment: string; createdAt: string;
  _count?: { jobs: number };
}

const LANGUAGES = ['NODE', 'PYTHON', 'JAVA', 'GENERAL'];
const EVENTS = ['push', 'pull_request', 'release', 'workflow_dispatch'];

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    owner: '', name: '', branch: 'main', language: 'NODE',
    githubToken: '', environment: 'production', eventTypes: ['push'],
  });

  const load = async () => {
    try { setRepos((await reposApi.list()) as any); }
    catch { toast.error('Failed to load repositories'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reposApi.create(form);
      toast.success('Repository added');
      setShowForm(false);
      setForm({ owner: '', name: '', branch: 'main', language: 'NODE', githubToken: '', environment: 'production', eventTypes: ['push'] });
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to add repository'); }
  };

  const toggleEvent = (evt: string) =>
    setForm(f => ({ ...f, eventTypes: f.eventTypes.includes(evt) ? f.eventTypes.filter(e => e !== evt) : [...f.eventTypes, evt] }));

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Repositories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{repos.length} repositories connected</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Repository
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-xl border border-violet-500/20 p-6 glow-purple">
          <h3 className="text-sm font-semibold mb-4">Connect Repository</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Owner / Org', key: 'owner', placeholder: 'e.g. my-org' },
              { label: 'Repository Name', key: 'name', placeholder: 'e.g. api-service' },
              { label: 'Branch', key: 'branch', placeholder: 'main' },
              { label: 'GitHub Token (optional)', key: 'githubToken', placeholder: 'ghp_...' },
              { label: 'Environment', key: 'environment', placeholder: 'production' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</label>
                <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="mt-1.5 w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Language</label>
              <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                className="mt-1.5 w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors">
                {LANGUAGES.map(l => <option key={l} value={l}>{LANGUAGE_ICONS[l]} {l}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Event Triggers</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {EVENTS.map(evt => (
                  <button key={evt} type="button" onClick={() => toggleEvent(evt)}
                    className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-all',
                      form.eventTypes.includes(evt)
                        ? 'bg-violet-600/30 border-violet-500/40 text-violet-300'
                        : 'border-white/10 text-muted-foreground hover:border-white/20')}>
                    {evt}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
              <button type="submit" className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
                Connect Repository
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-sm rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {repos.map((repo) => (
            <div key={repo.id} className={cn('glass rounded-xl border p-5 transition-all', repo.isActive ? 'border-white/[0.08]' : 'border-white/[0.04] opacity-60')}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{LANGUAGE_ICONS[repo.language]}</span>
                  <div>
                    <div className="font-semibold text-sm">{repo.fullName}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <GitBranch className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-mono">{repo.branch}</span>
                    </div>
                  </div>
                </div>
                <span className={cn('w-2 h-2 rounded-full mt-1', repo.isActive ? 'bg-green-400' : 'bg-gray-600')} />
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', LANGUAGE_COLORS[repo.language])}>{repo.language}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-muted-foreground">{repo.environment}</span>
                {repo.eventTypes.map(e => (
                  <span key={e} className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-muted-foreground">{e}</span>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                <span>{repo._count?.jobs || 0} builds</span>
                <span>{timeAgo(repo.createdAt)}</span>
              </div>

              <div className="flex items-center gap-1.5 pt-3 border-t border-white/[0.06]">
                <button onClick={() => demoApi.trigger(repo.id).then(() => toast.success('Event triggered!')).catch(() => toast.error('Failed'))}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/20 transition-all">
                  <Play className="w-3 h-3" /> Trigger
                </button>
                <button onClick={() => reposApi.toggleDemo(repo.id).then(() => load())}
                  className={cn('flex items-center justify-center w-8 h-8 rounded-lg border transition-all',
                    repo.autoDemo ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300' : 'bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:text-white')}>
                  <Zap className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => reposApi.toggle(repo.id).then(() => load())}
                  className={cn('flex items-center justify-center w-8 h-8 rounded-lg border transition-all',
                    repo.isActive ? 'bg-green-500/20 border-green-500/30 text-green-300' : 'bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:text-white')}>
                  <Power className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { if (confirm('Delete?')) reposApi.delete(repo.id).then(() => { load(); toast.success('Deleted'); }); }}
                  className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/[0.08] text-muted-foreground hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/10 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {repos.length === 0 && (
            <div className="col-span-3 py-16 text-center">
              <GitBranch className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No repositories yet. Add one to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
