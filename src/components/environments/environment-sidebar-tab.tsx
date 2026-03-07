/**
 * Sidebar tab content: list environments, quick switch, link to manager.
 */

import { useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import { useEnvironmentStore } from '../../stores/environment-store';

interface EnvironmentSidebarTabProps {
  onOpenManager: () => void;
}

export function EnvironmentSidebarTab({ onOpenManager }: EnvironmentSidebarTabProps) {
  const environments = useEnvironmentStore(s => s.environments);
  const loadEnvironments = useEnvironmentStore(s => s.loadEnvironments);
  const setActiveEnvironment = useEnvironmentStore(s => s.setActiveEnvironment);
  const activeEnv = useEnvironmentStore(s => s.getActiveEnvironment());
  const activeId = activeEnv?.id ?? null;

  useEffect(() => {
    loadEnvironments();
  }, [loadEnvironments]);

  return (
    <div className="flex flex-1 flex-col overflow-auto p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">Environments</span>
        <button
          type="button"
          onClick={onOpenManager}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200"
          title="Manage environments"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Manage
        </button>
      </div>
      {environments.length === 0 ? (
        <p className="text-xs text-slate-500">No environments. Create one in Manage.</p>
      ) : (
        <ul className="space-y-0.5">
          <li>
            <button
              type="button"
              onClick={() => setActiveEnvironment(null)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                activeId === null
                  ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              No Environment
            </button>
          </li>
          {environments.map(env => (
            <li key={env.id}>
              <button
                type="button"
                onClick={() => setActiveEnvironment(env.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  activeId === env.id
                    ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {env.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
