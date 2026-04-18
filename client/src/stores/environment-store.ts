/**
 * Zustand store for environments and variable interpolation context.
 */

import { create } from 'zustand';
import type { Environment, EnvVariable } from '../types/models';
import type { InterpolationContext } from '../services/interpolation-engine';
import * as environmentService from '../db/services/environment-service';
import * as settingsService from '../db/services/settings-service';
import {
  getDynamicVariableInfo,
  isDynamicVar,
  resolveDynamic,
} from '../services/dynamic-variables';

const GLOBAL_VARS_KEY = 'global_variables';

// [RED TEAM C3] Use null-prototype object to block prototype pollution via variable name.
function varsToRecord(vars: EnvVariable[]): Record<string, string> {
  const out: Record<string, string> = Object.create(null);
  for (const v of vars) {
    if (v.key?.trim()) out[v.key.trim()] = v.value ?? '';
  }
  return out;
}

// [RED TEAM H12 · VALIDATION S1-Q3] Postman-style strict name regex.
const VARIABLE_NAME_REGEX = /^[a-zA-Z0-9_$.-]+$/;
const FORBIDDEN_VARIABLE_NAMES = new Set(['__proto__', 'constructor', 'prototype', '']);

function assertValidVariableName(name: string): void {
  const n = name?.trim() ?? '';
  if (!n || FORBIDDEN_VARIABLE_NAMES.has(n)) {
    throw new Error(`Invalid variable name: "${name}"`);
  }
  if (!VARIABLE_NAME_REGEX.test(n)) {
    throw new Error(
      `Invalid variable name "${name}". Allowed: letters, digits, _ $ . -`
    );
  }
}

export type VariableSource =
  | { kind: 'environment'; envId: string; envName: string; variableId: string; secret: boolean }
  | { kind: 'global'; variableId: string; secret: boolean }
  | { kind: 'dynamic'; description: string }
  | { kind: 'unresolved' };

export interface ResolvedVariable {
  name: string;
  /**
   * null when source is secret env/global without reveal, dynamic (resolve on-demand),
   * or unresolved. Plain string only when non-secret env/global.
   * [RED TEAM C2] UI must not assume value is always populated.
   */
  value: string | null;
  source: VariableSource;
}

export type WriteTarget =
  | { kind: 'environment'; envId: string; variableId: string }
  | { kind: 'global'; variableId: string };

export type CreateTarget =
  | { kind: 'environment'; envId: string }
  | { kind: 'global' };

interface EnvironmentStore {
  environments: Environment[];
  globalVariables: EnvVariable[];
  isLoading: boolean;

  getInterpolationContext: () => InterpolationContext;
  getActiveEnvironment: () => Environment | null;

  // [RED TEAM C1 · VALIDATION S1-Q1] Resolver scans active env + global list + dynamic.
  // Secret values returned only when {reveal:true}; otherwise null to prevent fiber leak.
  resolveVariableSource: (
    name: string,
    options?: { reveal?: boolean }
  ) => ResolvedVariable;

  // [RED TEAM C1, C4] Target carries variableId captured at blur time — caller must snapshot
  // before debounce, not re-read from store.
  writeVariableValue: (target: WriteTarget, value: string) => Promise<void>;

  // [RED TEAM H12 · VALIDATION S1-Q3] Validates name strictly before persisting.
  createVariable: (target: CreateTarget, name: string, value: string) => Promise<void>;

  // [RED TEAM C2] Resolve dynamic value on-demand (fresh each call).
  resolveDynamicValue: (name: string) => string;

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
  /** Merge script-set variables (lm.variables.set) into active environment. */
  applyScriptVariables: (newVars: Record<string, string>) => Promise<void>;
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

  resolveVariableSource(name, options) {
    const trimmed = name.trim();
    const reveal = options?.reveal ?? false;
    const { environments, globalVariables } = get();

    // 1. Active environment — first match (warn on duplicate keys).
    const active = environments.find(e => e.is_active);
    if (active) {
      const matches = active.variables.filter(v => v.key?.trim() === trimmed);
      if (matches.length > 1) {
        console.warn(
          `[env-store] Duplicate variable "${trimmed}" in env "${active.name}" — using first.`
        );
      }
      const hit = matches[0];
      if (hit) {
        const secret = hit.secret ?? false; // [RED TEAM H5] normalize optional flag
        return {
          name: trimmed,
          value: secret && !reveal ? null : hit.value ?? '',
          source: {
            kind: 'environment',
            envId: active.id,
            envName: active.name,
            variableId: hit.id,
            secret,
          },
        };
      }
    }

    // 2. Global variables — first match.
    const globalMatches = globalVariables.filter(v => v.key?.trim() === trimmed);
    if (globalMatches.length > 1) {
      console.warn(`[env-store] Duplicate global variable "${trimmed}" — using first.`);
    }
    const globalHit = globalMatches[0];
    if (globalHit) {
      const secret = globalHit.secret ?? false;
      return {
        name: trimmed,
        value: secret && !reveal ? null : globalHit.value ?? '',
        source: { kind: 'global', variableId: globalHit.id, secret },
      };
    }

    // 3. Dynamic — resolve on-demand via resolveDynamicValue, metadata only here.
    if (isDynamicVar(trimmed)) {
      const info = getDynamicVariableInfo(trimmed);
      return {
        name: trimmed,
        value: null,
        source: { kind: 'dynamic', description: info?.description ?? trimmed },
      };
    }

    // 4. Unresolved.
    return { name: trimmed, value: null, source: { kind: 'unresolved' } };
  },

  async writeVariableValue(target, value) {
    if (target.kind === 'environment') {
      const env = await environmentService.getById(target.envId);
      if (!env) {
        console.warn(`[env-store] Write aborted: env ${target.envId} not found`);
        return;
      }
      const existing = env.variables.find(v => v.id === target.variableId);
      if (!existing) {
        console.warn(
          `[env-store] Write aborted: variable ${target.variableId} not in env ${target.envId}`
        );
        return;
      }
      const variables = env.variables.map(v =>
        v.id === target.variableId ? { ...v, value } : v
      );
      await environmentService.update(target.envId, { variables });
      const environments = await environmentService.getAll();
      set({ environments });
      return;
    }
    // global
    const { globalVariables } = get();
    if (!globalVariables.some(v => v.id === target.variableId)) {
      console.warn(`[env-store] Write aborted: global variable ${target.variableId} not found`);
      return;
    }
    const next = globalVariables.map(v =>
      v.id === target.variableId ? { ...v, value } : v
    );
    await settingsService.set(GLOBAL_VARS_KEY, next);
    set({ globalVariables: next });
  },

  async createVariable(target, name, value) {
    assertValidVariableName(name);
    const trimmed = name.trim();
    if (target.kind === 'environment') {
      const env = await environmentService.getById(target.envId);
      if (!env) throw new Error(`Environment ${target.envId} not found`);
      const newVar: EnvVariable = {
        id: crypto.randomUUID(),
        key: trimmed,
        value,
        secret: false,
      };
      const variables = [...env.variables, newVar];
      await environmentService.update(target.envId, { variables });
      const environments = await environmentService.getAll();
      set({ environments });
      return;
    }
    const { globalVariables } = get();
    const newVar: EnvVariable = {
      id: crypto.randomUUID(),
      key: trimmed,
      value,
      secret: false,
    };
    const next = [...globalVariables, newVar];
    await settingsService.set(GLOBAL_VARS_KEY, next);
    set({ globalVariables: next });
  },

  resolveDynamicValue(name) {
    return resolveDynamic(name);
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

  async applyScriptVariables(newVars: Record<string, string>) {
    if (Object.keys(newVars).length === 0) return;
    const active = get().environments.find(e => e.is_active);
    if (!active) return;
    const byKey = new Map(active.variables.map(v => [v.key.trim(), v]));
    for (const [key, value] of Object.entries(newVars)) {
      const k = key.trim();
      if (!k) continue;
      const existing = byKey.get(k);
      if (existing) {
        byKey.set(k, { ...existing, value });
      } else {
        byKey.set(k, { id: crypto.randomUUID(), key: k, value });
      }
    }
    const updatedVars = Array.from(byKey.values());
    await environmentService.update(active.id, { variables: updatedVars });
    const environments = await environmentService.getAll();
    set({ environments });
  },
}));
