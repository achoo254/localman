/**
 * Unit tests for resolveVariableSource — uses direct store state mutation,
 * bypassing DB layer (only write paths go through services).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useEnvironmentStore } from './environment-store';
import type { Environment, EnvVariable } from '../types/models';

function mkVar(key: string, value: string, secret = false): EnvVariable {
  return { id: `v-${key}`, key, value, secret };
}

function mkEnv(
  id: string,
  name: string,
  is_active: boolean,
  variables: EnvVariable[]
): Environment {
  return {
    id,
    name,
    variables,
    is_active,
    created_at: '',
    updated_at: '',
  };
}

describe('environment-store.resolveVariableSource', () => {
  beforeEach(() => {
    useEnvironmentStore.setState({ environments: [], globalVariables: [] });
  });

  it('resolves active environment variable', () => {
    useEnvironmentStore.setState({
      environments: [mkEnv('e1', 'Prod', true, [mkVar('baseUrl', 'https://api')])],
      globalVariables: [],
    });
    const r = useEnvironmentStore.getState().resolveVariableSource('baseUrl');
    expect(r.source.kind).toBe('environment');
    expect(r.value).toBe('https://api');
    if (r.source.kind === 'environment') {
      expect(r.source.envName).toBe('Prod');
      expect(r.source.secret).toBe(false);
    }
  });

  it('masks secret value by default', () => {
    useEnvironmentStore.setState({
      environments: [mkEnv('e1', 'Prod', true, [mkVar('token', 'supersecret', true)])],
      globalVariables: [],
    });
    const r = useEnvironmentStore.getState().resolveVariableSource('token');
    expect(r.value).toBeNull();
    if (r.source.kind === 'environment') expect(r.source.secret).toBe(true);
  });

  it('reveals secret when opted in', () => {
    useEnvironmentStore.setState({
      environments: [mkEnv('e1', 'Prod', true, [mkVar('token', 'supersecret', true)])],
      globalVariables: [],
    });
    const r = useEnvironmentStore
      .getState()
      .resolveVariableSource('token', { reveal: true });
    expect(r.value).toBe('supersecret');
  });

  it('falls through to global when not in active env', () => {
    useEnvironmentStore.setState({
      environments: [mkEnv('e1', 'Prod', true, [])],
      globalVariables: [mkVar('apiKey', 'global-key')],
    });
    const r = useEnvironmentStore.getState().resolveVariableSource('apiKey');
    expect(r.source.kind).toBe('global');
    expect(r.value).toBe('global-key');
  });

  it('resolves dynamic $guid as on-demand (value null)', () => {
    const r = useEnvironmentStore.getState().resolveVariableSource('$guid');
    expect(r.source.kind).toBe('dynamic');
    expect(r.value).toBeNull();
    if (r.source.kind === 'dynamic') {
      expect(r.source.description).toMatch(/guid/i);
    }
  });

  it('returns unresolved for missing name', () => {
    const r = useEnvironmentStore.getState().resolveVariableSource('nope');
    expect(r.source.kind).toBe('unresolved');
    expect(r.value).toBeNull();
  });

  it('normalizes missing secret flag to false', () => {
    const v: EnvVariable = { id: 'v1', key: 'x', value: 'hi' }; // no secret field
    useEnvironmentStore.setState({
      environments: [mkEnv('e1', 'Prod', true, [v])],
    });
    const r = useEnvironmentStore.getState().resolveVariableSource('x');
    expect(r.value).toBe('hi');
    if (r.source.kind === 'environment') expect(r.source.secret).toBe(false);
  });

  it('resolves dynamic value fresh each call', () => {
    const r1 = useEnvironmentStore.getState().resolveDynamicValue('$guid');
    const r2 = useEnvironmentStore.getState().resolveDynamicValue('$guid');
    expect(r1).toMatch(/^[0-9a-f-]{36}$/);
    expect(r2).toMatch(/^[0-9a-f-]{36}$/);
    expect(r1).not.toBe(r2);
  });
});

describe('environment-store.createVariable name validation', () => {
  beforeEach(() => {
    useEnvironmentStore.setState({ environments: [], globalVariables: [] });
  });

  it('rejects __proto__', async () => {
    await expect(
      useEnvironmentStore.getState().createVariable({ kind: 'global' }, '__proto__', 'x')
    ).rejects.toThrow(/Invalid variable name/);
  });

  it('rejects empty string', async () => {
    await expect(
      useEnvironmentStore.getState().createVariable({ kind: 'global' }, '', 'x')
    ).rejects.toThrow(/Invalid variable name/);
  });

  it('rejects name with spaces', async () => {
    await expect(
      useEnvironmentStore.getState().createVariable({ kind: 'global' }, 'my var', 'x')
    ).rejects.toThrow(/Invalid variable name/);
  });

  it('rejects constructor', async () => {
    await expect(
      useEnvironmentStore.getState().createVariable({ kind: 'global' }, 'constructor', 'x')
    ).rejects.toThrow(/Invalid variable name/);
  });
});
