import { useState, useEffect, useRef, useCallback } from 'react';
import { Titlebar } from './titlebar';
import { useSyncStore } from '../../stores/sync-store';
import { Sidebar } from './sidebar';
import { StatusBar } from './status-bar';
import { EnvironmentBar } from '../environments/environment-bar';
import { EnvironmentManager } from '../environments/environment-manager';
import { ImportDialog } from '../import-export/import-dialog';
import { SettingsPage } from '../settings/settings-page';
import { KeyboardShortcutsModal } from '../common/keyboard-shortcuts-modal';
import { useRequestStore } from '../../stores/request-store';

const SIDEBAR_WIDTH_MIN = 200;
const SIDEBAR_WIDTH_MAX = 480;
const SIDEBAR_WIDTH_DEFAULT = 260;
const STORAGE_KEY = 'localman_sidebar_width';

function clampSidebarWidth(value: number): number {
  return Math.max(SIDEBAR_WIDTH_MIN, Math.min(SIDEBAR_WIDTH_MAX, value));
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [managerOpen, setManagerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_WIDTH_DEFAULT);
  const [resizing, setResizing] = useState(false);
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);
  const lastWidthRef = useRef<number>(SIDEBAR_WIDTH_DEFAULT);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      setSidebarWidth(clampSidebarWidth(parsed));
    }
  }, []);

  const onResizeStart = useCallback((startX: number, startWidth: number) => {
    resizeStartRef.current = { x: startX, width: startWidth };
    lastWidthRef.current = startWidth;
    setResizing(true);
  }, []);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const start = resizeStartRef.current;
      if (!start) return;
      const delta = e.clientX - start.x;
      const next = clampSidebarWidth(start.width + delta);
      lastWidthRef.current = next;
      setSidebarWidth(next);
    };
    const onUp = () => {
      localStorage.setItem(STORAGE_KEY, String(lastWidthRef.current));
      resizeStartRef.current = null;
      setResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShortcutsOpen(o => !o);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        useRequestStore.getState().createDraftTab();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const loadSyncConfig = useSyncStore(s => s.loadConfig);
  const syncAll = useSyncStore(s => s.syncAll);
  useEffect(() => {
    void loadSyncConfig().then(() => {
      const config = useSyncStore.getState().config;
      if (config?.enabled && config?.endpoints?.list) {
        void syncAll().catch(() => {});
      }
    });
  }, [loadSyncConfig, syncAll]);

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      style={{ background: 'var(--color-bg-primary)' }}
    >
      <Titlebar
        onImportClick={() => setImportOpen(true)}
        onSettingsClick={() => setSettingsOpen(true)}
        onOpenSyncSettings={() => setSettingsOpen(true)}
      />
      {settingsOpen ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <SettingsPage onClose={() => setSettingsOpen(false)} />
        </div>
      ) : (
        <>
          <EnvironmentBar onOpenManager={() => setManagerOpen(true)} />
          <div className="flex min-h-0 flex-1">
            <Sidebar
              collapsed={sidebarCollapsed}
              width={sidebarCollapsed ? undefined : sidebarWidth}
              onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
              onOpenEnvironmentManager={() => setManagerOpen(true)}
            />
            {!sidebarCollapsed && (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize sidebar"
                className="w-1.5 shrink-0 cursor-col-resize select-none transition-colors hover:bg-[var(--color-accent)]/20 group"
                style={resizing ? { backgroundColor: 'var(--color-accent)' } : undefined}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onResizeStart(e.clientX, sidebarWidth);
                }}
              />
            )}
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
