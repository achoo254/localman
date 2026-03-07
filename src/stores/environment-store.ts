/**
 * Zustand store for environments and variable interpolation context.
 */

import { create } from 'zustand';
import type { Environment, EnvVariable } from '../types/models';
import type { InterpolationContext } from '../services/interpolation-engine';
import * as environmentService from '../db/services/environment-service';
import * as settingsService from '../db/services/settings-service';

const GLOBAL_VARS_KEY = 'global_variables';

function varsToRecord(vars: EnvVariable[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of vars) {
    if (v.key?.trim()) out[v.key.trim()] = v.value ?? '';
  }
  return out;
}

interface EnvironmentStore {
  environments: Environment[];
  globalVariables: EnvVariable[];
  isLoading: boolean;

  getInterpolationContext: () => InterpolationContext;
  getActiveEnvironment: () => Environment | null;

  loadEnvironments: () => Promise<void>;
  loadGlobalVariables: () => Promise<void>;
  setActiveEnvironment: (id: string | null) => Promise<void>;
  createEnvironment: (name: string) => Promise<Environment>;
  updateEnvironment: (id: string, data: Partial<Pick<Environment, 'name'>>) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
  updateVariable: (envId: string, variable: EnvVariable) => Promise<void>;
  setEnvironmentVariables: (envId: string, variables: EnvVariable[]) => Promise<void>;
  addVariable: (envId: string, variable: Omit<EnvVariable, 'id'>) => Promise<void>;
  removeVariable: (envId: string, variableId: string) => Promise<void>;
  setGlobalVariables: (vars: EnvVariable[]) => Promise<void>;
  addGlobalVariable: (variable: Omit<EnvVariable, 'id'>) => Promise<void>;
  updateGlobalVariable: (variable: EnvVariable) => Promise<void>;
  removeGlobalVariable: (variableId: string) => Promise<void>;
}

export const useEnvironmentStore = create<EnvironmentStore>((set, get) => ({
  environments: [],
  globalVariables: [],
  isLoading: false,

  getInterpolationContext(): InterpolationContext {
    const { environments, globalVariables } = get();
    const active = environments.find(e => e.is_active) ?? null;
    const envVars = active ? varsToRecord(active.variables) : {};
    const globalVars = varsToRecord(globalVariables);
    return { envVars, globalVars };
  },

  getActiveEnvironment(): Environment | null {
    return get().environments.find(e => e.is_active) ?? null;
  },

  async loadEnvironments() {
    set({ isLoading: true });
    try {
      const environments = await environmentService.getAll();
      set({ environments });
    } finally {
      set({ isLoading: false });
    }
  },

  async loadGlobalVariables() {
    const value = await settingsService.get<EnvVariable[]>(GLOBAL_VARS_KEY);
    set({ globalVariables: value ?? [] });
  },

  async setActiveEnvironment(id: string | null) {
    if (id === null) {
      const all = await environmentService.getAll();
      const active = all.find(e => e.is_active);
      if (active) await environmentService.update(active.id, { is_active: false });
      const updated = await environmentService.getAll();
      set({ environments: updated });
      return;
    }
    await environmentService.setActive(id);
    const environments = await environmentService.getAll();
    set({ environments });
  },

  async createEnvironment(name: string) {
    const env = await environmentService.create({ name, variables: [], is_active: false });
    const environments = await environmentService.getAll();
    set({ environments });
    return env;
  },

  async updateEnvironment(id: string, data: Partial<Pick<Environment, 'name'>>) {
    await environmentService.update(id, data);
    const environments = await environmentService.getAll();
    set({ environments });
  },

  async deleteEnvironment(id: string) {
    await environmentService.remove(id);
    set(s => ({ environments: s.environments.filter(e => e.id !== id) }));
  },

  async updateVariable(envId: string, variable: EnvVariable) {
    const env = await environmentService.getById(envId);
    if (!env) return;
    const variables = env.variables.map(v => (v.id === variable.id ? variable : v));
    await environmentService.update(envId, { variables });
    const environments = await environmentService.getAll();
    set({ environments });
  },

  async setEnvironmentVariables(envId: string, variables: EnvVariable[]) {
    await environmentService.update(envId, { variables });
    const environments = await environmentService.getAll();
    set({ environments });
  },

  async addVariable(envId: string, variable: Omit<EnvVariable, 'id'>) {
    const env = await environmentService.getById(envId);
    if (!env) return;
    const newVar: EnvVariable = { ...variable, id: crypto.randomUUID() };
    const variables = [...env.variables, newVar];
    await environmentService.update(envId, { variables });
    const environments = await environmentService.getAll();
    set({ environments });
  },

  async removeVariable(envId: string, variableId: string) {
    const env = await environmentService.getById(envId);
    if (!env) return;
    const variables = env.variables.filter(v => v.id !== variableId);
    await environmentService.update(envId, { variables });
    const environments = await environmentService.getAll();
    set({ environments });
  },

  async setGlobalVariables(vars: EnvVariable[]) {
    await settingsService.set(GLOBAL_VARS_KEY, vars);
    set({ globalVariables: vars });
  },

  async addGlobalVariable(variable: Omit<EnvVariable, 'id'>) {
    const { globalVariables } = get();
    const newVar: EnvVariable = { ...variable, id: crypto.randomUUID() };
    const next = [...globalVariables, newVar];
    await settingsService.set(GLOBAL_VARS_KEY, next);
    set({ globalVariables: next });
  },

  async updateGlobalVariable(variable: EnvVariable) {
    const { globalVariables } = get();
    const next = globalVariables.map(v => (v.id === variable.id ? variable : v));
    await settingsService.set(GLOBAL_VARS_KEY, next);
    set({ globalVariables: next });
  },

  async removeGlobalVariable(variableId: string) {
    const { globalVariables } = get();
    const next = globalVariables.filter(v => v.id !== variableId);
    await settingsService.set(GLOBAL_VARS_KEY, next);
    set({ globalVariables: next });
  },
}));
