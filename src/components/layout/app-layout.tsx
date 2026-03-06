import { Titlebar } from './titlebar';
import { Sidebar } from './sidebar';
import { StatusBar } from './status-bar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      style={{ background: 'var(--color-bg-primary)' }}
    >
      <Titlebar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-auto" style={{ background: 'var(--color-bg-primary)' }}>
          {children}
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
