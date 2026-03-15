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
