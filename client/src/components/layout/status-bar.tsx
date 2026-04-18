import { useState, useEffect } from 'react';
import packageJson from '../../../package.json';

const APP_VERSION = `v${packageJson.version}`;

export function StatusBar() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
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
      className="flex h-7 shrink-0 items-center gap-4 border-t border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-4 text-xs text-[var(--foreground)] opacity-80"
    >
      <span style={{ color: 'var(--color-accent)', opacity: 0.7 }}>Localman {APP_VERSION}</span>
      <span className="ml-auto opacity-50 flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-500'}`} />
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </footer>
  );
}
