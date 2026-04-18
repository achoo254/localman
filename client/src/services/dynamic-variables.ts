/**
 * Dynamic variable resolvers for {{$name}} — fresh value per invocation.
 */

const dynamicResolvers: Record<string, () => string> = {
  $guid: () => crypto.randomUUID(),
  $timestamp: () => Math.floor(Date.now() / 1000).toString(),
  $isoTimestamp: () => new Date().toISOString(),
  $randomInt: () => Math.floor(Math.random() * 1000).toString(),
  $randomEmail: () => `user${Date.now()}@example.com`,
  $randomColor: () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
};

export interface DynamicVariableInfo {
  name: string;
  description: string;
}

const DESCRIPTIONS: Record<string, string> = {
  $guid: 'A v4 style guid',
  $timestamp: 'Current unix timestamp (seconds)',
  $isoTimestamp: 'Current ISO 8601 timestamp',
  $randomInt: 'Random integer 0-1000',
  $randomEmail: 'Random email address',
  $randomColor: 'Random hex color',
};

// [VALIDATION S1-Q4] Auto-derive từ resolvers → tránh drift khi thêm resolver mới.
const DYNAMIC_REGISTRY: DynamicVariableInfo[] = Object.keys(dynamicResolvers).map(name => ({
  name,
  description: DESCRIPTIONS[name] ?? name,
}));

export const DYNAMIC_VAR_NAMES = Object.keys(dynamicResolvers);

export function resolveDynamic(varName: string): string {
  const trimmed = varName.trim();
  const fn = dynamicResolvers[trimmed];
  return fn ? fn() : '';
}

export function isDynamicVar(varName: string): boolean {
  const trimmed = varName.trim();
  return trimmed.startsWith('$') && trimmed in dynamicResolvers;
}

export function listDynamicVariables(): DynamicVariableInfo[] {
  return DYNAMIC_REGISTRY;
}

export function getDynamicVariableInfo(name: string): DynamicVariableInfo | null {
  const n = name.startsWith('$') ? name : `$${name}`;
  return DYNAMIC_REGISTRY.find(d => d.name === n) ?? null;
}
