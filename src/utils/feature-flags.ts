/**
 * Feature flags for gating unreleased functionality.
 * Toggle CLOUD_SYNC to true when backend is deployed (Phase 2).
 */

export const FEATURES = {
  CLOUD_SYNC: false,
} as const;
