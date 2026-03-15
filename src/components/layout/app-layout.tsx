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
import { ConflictResolutionDialog } from '../sync/conflict-resolution-dialog';
import { ErrorBoundary } from '../common/error-boundary';
import { FEATURES } from '../../utils/feature-flags';
import { checkDbHealth } from '../../db/database';
import { useSettingsStore } from '../../stores/settings-store';
import { useHistoryStore } from '../../stores/history-store';
import { toast } from '../common/toast-provider';

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
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return SIDEBAR_WIDTH_DEFAULT;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? clampSidebarWidth(parsed) : SIDEBAR_WIDTH_DEFAULT;
  });
  const [resizing, setResizing] = useState(false);
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);
  const lastWidthRef = useRef<number>(SIDEBAR_WIDTH_DEFAULT);
  const activeTabId = useRequestStore(s => s.activeTabId);

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

  const restoreDrafts = useRequestStore(s => s.restoreDrafts);
  const loadSyncConfig = useSyncStore(s => s.loadConfig);
  const syncAll = useSyncStore(s => s.syncAll);
  useEffect(() => {
    // Restore persisted drafts on app startup
    void restoreDrafts();
    // DB health check
    void checkDbHealth().then(ok => {
      if (!ok) toast('Database may be corrupted', { description: 'Export your data and reset if issues persist.', variant: 'error' });
    });
    // History auto-cleanup based on retention setting
    void useSettingsStore.getState().load().then(() => {
      const days = useSettingsStore.getState().general.historyRetentionDays;
      if (days > 0) void useHistoryStore.getState().cleanupOldHistory(days);
    });
    // Skip cloud sync init when feature is disabled (Phase 1 release)
    if (FEATURES.CLOUD_SYNC) {
      void loadSyncConfig().then(() => {
        const { config } = useSyncStore.getState();
        if (config.enabled && config.userEmail) {
          void syncAll().catch(() => {});
        }
      });
    }
  }, [restoreDrafts, loadSyncConfig, syncAll]);

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
            <ErrorBoundary fallbackSize="panel" resetKey={sidebarCollapsed}>
              <Sidebar
                collapsed={sidebarCollapsed}
                width={sidebarCollapsed ? undefined : sidebarWidth}
                onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
                onOpenEnvironmentManager={() => setManagerOpen(true)}
              />
            </ErrorBoundary>
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
            <ErrorBoundary fallbackSize="panel" resetKey={activeTabId}>
              <main className="min-w-0 flex-1 overflow-auto" style={{ background: 'var(--color-bg-primary)' }}>
                {children}
              </main>
            </ErrorBoundary>
          </div>
        </>
      )}
      {!settingsOpen && <StatusBar />}
      <EnvironmentManager open={managerOpen} onOpenChange={setManagerOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <ConflictResolutionDialog />
    </div>
  );
}
