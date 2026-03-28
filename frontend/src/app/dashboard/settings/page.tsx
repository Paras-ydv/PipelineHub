'use client';
import { useState } from 'react';
import { webhooksApi, reposApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Settings, Webhook, Copy, Check } from 'lucide-react';

export default function SettingsPage() {
  const [repoId, setRepoId] = useState('');
  const [eventType, setEventType] = useState('push');
  const [branch, setBranch] = useState('main');
  const [copied, setCopied] = useState('');

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await webhooksApi.simulate(repoId, eventType, branch);
      toast.success('Webhook event simulated!');
    } catch (err: any) { toast.error(err.message || 'Failed'); }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/api/webhooks/github`;

  return (
    <div className="space-y-6 max-w-[900px]">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform configuration and webhook testing</p>
      </div>

      {/* Webhook simulator */}
      <div className="glass rounded-xl border border-white/[0.06] p-6">
        <div className="flex items-center gap-2 mb-5">
          <Webhook className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold">Webhook Simulator</h2>
        </div>
        <form onSubmit={handleSimulate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Repository ID</label>
            <input value={repoId} onChange={e => setRepoId(e.target.value)} placeholder="UUID of repository" required
              className="mt-1.5 w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Event Type</label>
            <select value={eventType} onChange={e => setEventType(e.target.value)}
              className="mt-1.5 w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors">
              {['push', 'pull_request', 'release', 'workflow_dispatch'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Branch</label>
            <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="main"
              className="mt-1.5 w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
              Simulate Webhook Event
            </button>
          </div>
        </form>
      </div>

      {/* Webhook URL */}
      <div className="glass rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold mb-4">Webhook Endpoint</h2>
        <div className="space-y-3">
          {[
            { label: 'GitHub Webhook URL', value: webhookUrl, key: 'webhook' },
            { label: 'Simulate Endpoint', value: `${process.env.NEXT_PUBLIC_API_URL}/webhooks/simulate`, key: 'simulate' },
          ].map(({ label, value, key }) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</label>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-violet-300 truncate">
                  {value}
                </code>
                <button onClick={() => copyToClipboard(value, key)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-all flex-shrink-0">
                  {copied === key ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform info */}
      <div className="glass rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold mb-4">Platform Information</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Platform', value: 'PipelineHub v1.0' },
            { label: 'Backend', value: 'NestJS + TypeScript' },
            { label: 'Frontend', value: 'Next.js 14 App Router' },
            { label: 'Queue', value: 'BullMQ + Redis' },
            { label: 'Database', value: 'PostgreSQL + Prisma' },
            { label: 'Real-time', value: 'Socket.IO' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
              <div className="text-xs font-medium text-violet-300">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
