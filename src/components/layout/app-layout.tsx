import { useState, useEffect } from 'react';
import { Titlebar } from './titlebar';
import { Sidebar } from './sidebar';
import { StatusBar } from './status-bar';
import { EnvironmentBar } from '../environments/environment-bar';
import { EnvironmentManager } from '../environments/environment-manager';
import { ImportDialog } from '../import-export/import-dialog';
import { SettingsPage } from '../settings/settings-page';
import { KeyboardShortcutsModal } from '../common/keyboard-shortcuts-modal';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [managerOpen, setManagerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShortcutsOpen(o => !o);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      style={{ background: 'var(--color-bg-primary)' }}
    >
      <Titlebar
        onImportClick={() => setImportOpen(true)}
        onSettingsClick={() => setSettingsOpen(true)}
      />
      {settingsOpen ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <SettingsPage onClose={() => setSettingsOpen(false)} />
        </div>
      ) : (
        <>
          <EnvironmentBar onOpenManager={() => setManagerOpen(true)} />
          <div className="flex min-h-0 flex-1">
            <Sidebar onOpenEnvironmentManager={() => setManagerOpen(true)} />
            <main className="min-w-0 flex-1 overflow-auto" style={{ background: 'var(--color-bg-primary)' }}>
              {children}
            </main>
          </div>
        </>
      )}
      {!settingsOpen && <StatusBar />}
      <EnvironmentManager open={managerOpen} onOpenChange={setManagerOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
