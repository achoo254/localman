/**
 * DB layer helpers — IDs and timestamps.
 */

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
