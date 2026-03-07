import { useState } from 'react';
import { Titlebar } from './titlebar';
import { Sidebar } from './sidebar';
import { StatusBar } from './status-bar';
import { EnvironmentBar } from '../environments/environment-bar';
import { EnvironmentManager } from '../environments/environment-manager';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [managerOpen, setManagerOpen] = useState(false);

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      style={{ background: 'var(--color-bg-primary)' }}
    >
      <Titlebar />
      <EnvironmentBar onOpenManager={() => setManagerOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <Sidebar onOpenEnvironmentManager={() => setManagerOpen(true)} />
        <main className="min-w-0 flex-1 overflow-auto" style={{ background: 'var(--color-bg-primary)' }}>
          {children}
        </main>
      </div>
      <StatusBar />
      <EnvironmentManager open={managerOpen} onOpenChange={setManagerOpen} />
    </div>
  );
}
