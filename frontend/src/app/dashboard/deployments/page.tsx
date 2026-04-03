'use client';
import { useEffect, useState } from 'react';
import { deploymentsApi } from '@/lib/api';
import { cn, timeAgo, githubCompareUrl, githubRepoUrl } from '@/lib/utils';
import { Rocket, CheckCircle2, XCircle, Clock, ExternalLink, GitCommit, RefreshCw } from 'lucide-react';

interface Deployment {
  id: string; environment: string; version: string; status: string;
  url?: string; commitHash?: string; deployedBy?: string;
  createdAt: string; completedAt?: string;
  repository?: { name: string; owner: string };
}

const STATUS_STYLES: Record<string, string> = {
  SUCCESS:     'text-green-400 bg-green-400/10 border-green-400/20',
  FAILED:      'text-red-400 bg-red-400/10 border-red-400/20',
  PENDING:     'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  RUNNING:     'text-blue-400 bg-blue-400/10 border-blue-400/20',
  ROLLED_BACK: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
};

const ENV_COLORS: Record<string, string> = {
  production:  'text-red-300 bg-red-300/10 border-red-300/20',
  staging:     'text-yellow-300 bg-yellow-300/10 border-yellow-300/20',
  development: 'text-green-300 bg-green-300/10 border-green-300/20',
};

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    deploymentsApi.list().then((data: any) => setDeployments(data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const stats = {
    total: deployments.length,
    success: deployments.filter(d => d.status === 'SUCCESS').length,
    failed: deployments.filter(d => d.status === 'FAILED').length,
    rate: deployments.length > 0 ? Math.round((deployments.filter(d => d.status === 'SUCCESS').length / deployments.length) * 100) : 0,
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Deployments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Deployment history across all environments</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-white transition-all">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-violet-400' },
          { label: 'Successful', value: stats.success, color: 'text-green-400' },
          { label: 'Failed', value: stats.failed, color: 'text-red-400' },
          { label: 'Success Rate', value: `${stats.rate}%`, color: 'text-cyan-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-xl border border-white/[0.06] p-4">
            <div className="text-xs text-muted-foreground mb-2">{label}</div>
            <div className={cn('text-3xl font-bold', color)}>{value}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold">Deployment History</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Repository', 'Commit', 'Version', 'Environment', 'Status', 'Deployed', 'Links'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deployments.map(dep => {
                  const owner = dep.repository?.owner;
                  const repo = dep.repository?.name;
                  const sha = dep.commitHash;
                  const cUrl = owner && repo && sha ? githubCompareUrl(owner, repo, sha) : null;
                  const rUrl = owner && repo ? githubRepoUrl(owner, repo) : null;

                  return (
                    <tr key={dep.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        {rUrl ? (
                          <a href={rUrl} target="_blank" rel="noopener noreferrer"
                            className="font-medium text-xs hover:text-violet-400 transition-colors flex items-center gap-1">
                            {dep.repository?.owner}/{dep.repository?.name}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <div className="font-medium text-xs">{dep.repository?.name || '—'}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {cUrl ? (
                          <a href={cUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 font-mono text-xs text-violet-400 hover:text-violet-300 transition-colors">
                            <GitCommit className="w-3 h-3" />
                            {sha?.slice(0, 7)}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">{sha?.slice(0, 7) || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-violet-300">{dep.version}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border', ENV_COLORS[dep.environment] || 'text-muted-foreground bg-white/[0.06] border-white/10')}>
                          {dep.environment}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border', STATUS_STYLES[dep.status] || '')}>
                          {dep.status === 'SUCCESS' ? <CheckCircle2 className="w-3 h-3" /> :
                           dep.status === 'FAILED' ? <XCircle className="w-3 h-3" /> :
                           <Clock className="w-3 h-3" />}
                          {dep.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(dep.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {cUrl && (
                            <a href={cUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors whitespace-nowrap">
                              <ExternalLink className="w-3 h-3" /> Diff
                            </a>
                          )}
                          {dep.url && dep.url.startsWith('http') && !dep.url.includes('pipelinehub.dev') && (
                            <a href={dep.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors whitespace-nowrap">
                              <ExternalLink className="w-3 h-3" /> App
                            </a>
                          )}
                          {!cUrl && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {deployments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <Rocket className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">No deployments yet</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
