/**
 * Schema version history for Localman DB.
 * Used by backup/import to validate compatibility.
 */

export const CURRENT_SCHEMA_VERSION = 1;

export const SCHEMA_VERSION_HISTORY: Record<number, string> = {
  1: 'Initial schema: collections, folders, requests, environments, history, settings',
};
