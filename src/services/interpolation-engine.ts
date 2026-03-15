/**
 * Variable interpolation: {{varName}} and {{$dynamic}}.
 * Single-pass; unresolved placeholders left as-is.
 */

import { resolveDynamic } from './dynamic-variables';

export interface InterpolationContext {
  envVars: Record<string, string>;
  globalVars: Record<string, string>;
}

const VAR_PATTERN = /\{\{([^}]+)\}\}/g;

export interface InterpolationResult {
  value: string;
  unresolved: string[];
}

export function interpolate(
  template: string,
  context: InterpolationContext
): InterpolationResult {
  const unresolved: string[] = [];
  const value = template.replace(VAR_PATTERN, (match, varName: string) => {
    const trimmed = varName.trim();

    if (trimmed.startsWith('$')) {
      const resolved = resolveDynamic(trimmed);
      return resolved ? resolved : match;
    }

    // Use hasOwnProperty check so empty-string values ("") are treated as resolved,
    // not as missing. Falsy coercion would incorrectly leave {{varName}} in output.
    const hasOwn = (obj: Record<string, string>, key: string) =>
      Object.prototype.hasOwnProperty.call(obj, key);
    const resolved = hasOwn(context.envVars, trimmed)
      ? context.envVars[trimmed]
      : hasOwn(context.globalVars, trimmed)
        ? context.globalVars[trimmed]
        : undefined;
    if (resolved === undefined) {
      unresolved.push(trimmed);
      return match;
    }
    return resolved;
  });
  return { value, unresolved: [...new Set(unresolved)] };
}

/** Resolve to string only (for request preparer). */
export function interpolateString(
  template: string,
  context: InterpolationContext
): string {
  return interpolate(template, context).value;
}
