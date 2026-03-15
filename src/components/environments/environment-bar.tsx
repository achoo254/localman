/**
 * Environment bar: selector + manage link. Renders below titlebar.
 */

import { useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import { EnvironmentSelector } from './environment-selector';
import { useEnvironmentStore } from '../../stores/environment-store';

interface EnvironmentBarProps {
  onOpenManager?: () => void;
}

export function EnvironmentBar({ onOpenManager }: EnvironmentBarProps) {
  const environments = useEnvironmentStore(s => s.environments);
  const loadEnvironments = useEnvironmentStore(s => s.loadEnvironments);
  const loadGlobalVariables = useEnvironmentStore(s => s.loadGlobalVariables);
  const setActiveEnvironment = useEnvironmentStore(s => s.setActiveEnvironment);
  const activeEnv = useEnvironmentStore(s => s.getActiveEnvironment());
  const activeId = activeEnv?.id ?? null;

  useEffect(() => {
    loadEnvironments();
    loadGlobalVariables();
  }, [loadEnvironments, loadGlobalVariables]);

  return (
    <div
      className="flex items-center gap-3 border-b border-[var(--color-bg-tertiary)] px-4 py-2"
      style={{ background: 'var(--color-bg-secondary)' }}
    >
      <span className="text-xs font-medium text-slate-500">Environment</span>
      <EnvironmentSelector
        environments={environments}
        activeId={activeId}
        onSelect={setActiveEnvironment}
      />
      {onOpenManager && (
        <button
          type="button"
          onClick={onOpenManager}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
          title="Manage environments"
        >
          <Settings2 className="h-4 w-4" />
          Manage
        </button>
      )}
    </div>
  );
}
