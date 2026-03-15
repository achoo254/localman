import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';

export function StatusBar() {
  const [version, setVersion] = useState('v0.1.0');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    getVersion()
      .then(v => setVersion(`v${v}`))
      .catch(() => {/* keep fallback */});

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleNetworkSuccess = () => setIsOnline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('app:network-success', handleNetworkSuccess);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('app:network-success', handleNetworkSuccess);
    };
  }, []);

  return (
    <footer
      className="flex h-7 shrink-0 items-center gap-4 px-4 text-xs"
      style={{
        background: 'var(--color-bg-secondary)',
        borderTop: '1px solid var(--color-bg-tertiary)',
        color: 'var(--foreground)',
        opacity: 0.8,
      }}
    >
      <span style={{ color: 'var(--color-accent)', opacity: 0.7 }}>Localman {version}</span>
      <span className="ml-auto opacity-50 flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-500'}`} />
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </footer>
  );
}
