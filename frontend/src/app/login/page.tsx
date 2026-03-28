'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@pipelinehub.dev');
  const [password, setPassword] = useState('admin123');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res: any = tab === 'login'
        ? await authApi.login(email, password)
        : await authApi.register(email, username, password);
      setAuth(res.token, res.user);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(124,58,237,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="fixed inset-0 bg-gradient-to-br from-violet-950/20 via-transparent to-cyan-950/20" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-bold gradient-text">PipelineHub</span>
          </div>
          <p className="text-muted-foreground text-sm">Enterprise CI/CD Platform</p>
        </div>

        <div className="glass rounded-2xl p-8 glow-purple">
          <div className="flex gap-1 mb-6 p-1 bg-black/30 rounded-lg">
            {(['login', 'register'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === t ? 'bg-violet-600 text-white' : 'text-muted-foreground hover:text-white'}`}>
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="mt-1.5 w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            {tab === 'register' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
                  className="mt-1.5 w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="mt-1.5 w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-medium rounded-lg transition-all disabled:opacity-50 mt-2">
              {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {tab === 'login' && (
            <div className="mt-4 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
              <p className="text-xs text-violet-300 text-center">
                Demo: <span className="font-mono">admin@pipelinehub.dev</span> / <span className="font-mono">admin123</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
