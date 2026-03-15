/**
 * Assertion helpers for lm.expect() — used when building the injected API.
 * Actual assertions run inside QuickJS; these types document the API.
 */

export interface ExpectAssertions {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toContain(expected: string): void;
  toHaveProperty(key: string): void;
  toBeGreaterThan(n: number): void;
  toBeLessThan(n: number): void;
}
