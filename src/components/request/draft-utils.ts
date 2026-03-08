/**
 * Shared utilities for draft tab logic.
 */

import type { ApiRequest } from '../../types/models';

/** Check if a draft has meaningful content worth saving. */
export function hasMeaningfulContent(req: ApiRequest): boolean {
  return req.url.trim() !== '' ||
    req.params.some(p => p.key.trim() !== '') ||
    req.headers.some(h => h.key.trim() !== '') ||
    (req.body.type !== 'none') ||
    (req.auth.type !== 'none') ||
    (req.description?.trim() ?? '') !== '' ||
    (req.pre_script?.trim() ?? '') !== '' ||
    (req.post_script?.trim() ?? '') !== '';
}
