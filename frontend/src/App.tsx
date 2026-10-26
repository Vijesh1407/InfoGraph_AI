import { useEffect, useState } from 'react';
import { WorkspacePage } from './pages/WorkspacePage';
import { checkHealth } from './services/api';

export default function App() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [_provider, setProvider] = useState<string>('');

  useEffect(() => {
    checkHealth()
      .then((data) => {
        setBackendStatus('online');
        setProvider(data.llm_provider || '');
      })
      .catch(() => setBackendStatus('offline'));
  }, []);

  if (backendStatus === 'checking') {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Connecting to backend…</p>
        </div>
      </div>
    );
  }

  if (backendStatus === 'offline') {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-white mb-3">Backend Offline</h1>
          <p className="text-white/60 text-sm leading-relaxed mb-5">
            The InfoGraph AI backend is not running. Please start it with:
          </p>
          <pre className="bg-surface-700 rounded-xl p-4 text-xs text-green-400 text-left overflow-x-auto mb-4">
            cd backend{'\n'}
            uvicorn app.main:app --reload
          </pre>
          <p className="text-white/40 text-xs">
            Then refresh this page. Default URL: <code className="text-brand-400">http://localhost:8000</code>
          </p>
        </div>
      </div>
    );
  }

  return <WorkspacePage />;
}
