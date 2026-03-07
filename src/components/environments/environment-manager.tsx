/**
 * Full environment manager dialog: env list + variable table + globals.
 */

import { useState, useCallback, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { confirm } from '@tauri-apps/plugin-dialog';
import { Plus, Trash2 } from 'lucide-react';
import type { EnvVariable } from '../../types/models';
import { VariableTable } from './variable-table';
import { useEnvironmentStore } from '../../stores/environment-store';

interface EnvironmentManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SideSelection = { type: 'globals' } | { type: 'env'; id: string };

export function EnvironmentManager({ open, onOpenChange }: EnvironmentManagerProps) {
  const environments = useEnvironmentStore(s => s.environments);
  const globalVariables = useEnvironmentStore(s => s.globalVariables);
  const createEnvironment = useEnvironmentStore(s => s.createEnvironment);
  const deleteEnvironment = useEnvironmentStore(s => s.deleteEnvironment);
  const setEnvironmentVariables = useEnvironmentStore(s => s.setEnvironmentVariables);
  const setGlobalVariables = useEnvironmentStore(s => s.setGlobalVariables);
  const loadEnvironments = useEnvironmentStore(s => s.loadEnvironments);
  const loadGlobalVariables = useEnvironmentStore(s => s.loadGlobalVariables);

  const [selection, setSelection] = useState<SideSelection>({ type: 'globals' });
  const [newEnvName, setNewEnvName] = useState('');

  const selectedEnv = selection.type === 'env' ? environments.find(e => e.id === selection.id) : null;
  const variables = selection.type === 'globals' ? globalVariables : selectedEnv?.variables ?? [];

  const handleEnvCreate = useCallback(async () => {
    const name = newEnvName.trim() || 'New Environment';
    setNewEnvName('');
    const env = await createEnvironment(name);
    setSelection({ type: 'env', id: env.id });
  }, [newEnvName, createEnvironment]);

  const handleEnvDelete = useCallback(
    async (id: string) => {
      if (!await confirm('Delete this environment and its variables?')) return;
      await deleteEnvironment(id);
      if (selection.type === 'env' && selection.id === id) setSelection({ type: 'globals' });
    },
    [deleteEnvironment, selection]
  );

  const handleVariablesChange = useCallback(
    (next: EnvVariable[]) => {
      if (selection.type === 'globals') {
        setGlobalVariables(next);
      } else if (selection.type === 'env') {
        setEnvironmentVariables(selection.id, next);
      }
    },
    [selection, setGlobalVariables, setEnvironmentVariables]
  );

  const handleAddVariable = useCallback(() => {
    const newVar: EnvVariable = {
      id: crypto.randomUUID(),
      key: '',
      value: '',
      secret: false,
    };
    if (selection.type === 'globals') {
      setGlobalVariables([...globalVariables, newVar]);
    } else if (selection.type === 'env' && selectedEnv) {
      setEnvironmentVariables(selection.id, [...selectedEnv.variables, newVar]);
    }
  }, [selection, globalVariables, selectedEnv, setGlobalVariables, setEnvironmentVariables]);

  const handleRemoveVariable = useCallback(
    (variableId: string) => {
      if (selection.type === 'globals') {
        setGlobalVariables(globalVariables.filter(v => v.id !== variableId));
      } else if (selection.type === 'env' && selectedEnv) {
        setEnvironmentVariables(
          selection.id,
          selectedEnv.variables.filter(v => v.id !== variableId)
        );
      }
    },
    [selection, globalVariables, selectedEnv, setGlobalVariables, setEnvironmentVariables]
  );

  useEffect(() => {
    if (open) {
      loadEnvironments();
      loadGlobalVariables();
    }
  }, [open, loadEnvironments, loadGlobalVariables]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 flex h-[70vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] shadow-lg">
          <Dialog.Title className="border-b border-[var(--color-bg-tertiary)] px-4 py-3 text-sm font-medium">
            Manage environments
          </Dialog.Title>
          <div className="flex min-h-0 flex-1">
            <div className="w-52 shrink-0 border-r border-[var(--color-bg-tertiary)] p-2">
              <button
                type="button"
                onClick={() => setSelection({ type: 'globals' })}
                className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${
                  selection.type === 'globals'
                    ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                Globals
              </button>
              {environments.map(env => (
                <div
                  key={env.id}
                  className="group mb-1 flex items-center gap-1 rounded-lg hover:bg-white/5"
                >
                  <button
                    type="button"
                    onClick={() => setSelection({ type: 'env', id: env.id })}
                    className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm ${
                      selection.type === 'env' && selection.id === env.id
                        ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {env.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEnvDelete(env.id)}
                    className="rounded p-1.5 text-slate-500 opacity-0 hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                    aria-label={`Delete ${env.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="mt-2 flex gap-1">
                <input
                  type="text"
                  value={newEnvName}
                  onChange={e => setNewEnvName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEnvCreate()}
                  placeholder="New environment"
                  className="min-w-0 flex-1 rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] px-2 py-1.5 text-[13px] focus:border-[var(--color-accent)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleEnvCreate}
                  className="rounded-lg bg-[var(--color-accent)] p-1.5 text-white hover:bg-[var(--color-accent-hover)]"
                  aria-label="Create environment"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-w-0 flex-1 overflow-auto p-4">
              <h3 className="mb-3 text-xs font-medium text-slate-500">
                {selection.type === 'globals' ? 'Global variables' : selectedEnv?.name ?? 'Variables'}
              </h3>
              <VariableTable
                variables={variables}
                onChange={handleVariablesChange}
                onAdd={handleAddVariable}
                onRemove={handleRemoveVariable}
              />
            </div>
          </div>
          <div className="flex justify-end border-t border-[var(--color-bg-tertiary)] px-4 py-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg border border-[var(--color-bg-tertiary)] px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
