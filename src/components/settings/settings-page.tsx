/**
 * Settings full-page: left nav (General, Editor, Proxy, Data, About), right content.
 */

import { useState, useEffect } from 'react';
import { Settings, Sliders, Code, Globe, Database, Users, Info, ArrowLeft } from 'lucide-react';
import { GeneralSettings } from './general-settings';
import { EditorSettings } from './editor-settings';
import { ProxySettings } from './proxy-settings';
import { DataSettings } from './data-settings';
import { AccountWorkspacesSettings } from './account-workspaces-settings';
import { AboutSection } from './about-section';
import { useSettingsStore } from '../../stores/settings-store';

type SectionId = 'general' | 'editor' | 'proxy' | 'data' | 'account' | 'about';

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Sliders className="h-4 w-4" /> },
  { id: 'editor', label: 'Editor', icon: <Code className="h-4 w-4" /> },
  { id: 'proxy', label: 'Proxy', icon: <Globe className="h-4 w-4" /> },
  { id: 'data', label: 'Data', icon: <Database className="h-4 w-4" /> },
  { id: 'account', label: 'Account & Workspaces', icon: <Users className="h-4 w-4" /> },
  { id: 'about', label: 'About', icon: <Info className="h-4 w-4" /> },
];

interface SettingsPageProps {
  onClose: () => void;
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  const [section, setSection] = useState<SectionId>('general');
  const load = useSettingsStore(s => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      <div className="flex items-center gap-2 border-b border-[var(--color-bg-tertiary)] px-4 py-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-slate-400 hover:bg-white/10 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <Settings className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-300">Settings</span>
      </div>
      <div className="flex flex-1 min-h-0">
        <nav className="w-48 shrink-0 border-r border-[var(--color-bg-tertiary)] p-2 flex flex-col gap-0.5">
          {SECTIONS.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              aria-current={section === id ? 'true' : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                section === id
                  ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </nav>
        <main className="flex-1 overflow-auto">
          {section === 'general' && <GeneralSettings />}
          {section === 'editor' && <EditorSettings />}
          {section === 'proxy' && <ProxySettings />}
          {section === 'data' && <DataSettings />}
          {section === 'account' && <AccountWorkspacesSettings />}
          {section === 'about' && <AboutSection />}
        </main>
      </div>
    </div>
  );
}
