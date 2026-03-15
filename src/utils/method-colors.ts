/** Canonical HTTP method → CSS color variable mapping. */
export const METHOD_COLORS: Record<string, string> = {
  GET: 'var(--color-method-get)',
  POST: 'var(--color-method-post)',
  PUT: 'var(--color-method-put)',
  PATCH: 'var(--color-method-patch)',
  DELETE: 'var(--color-method-delete)',
  HEAD: 'var(--color-method-get)',
  OPTIONS: 'var(--color-method-get)',
};

/** HTTP method → Tailwind text+bg class pairs (for badges). */
export const METHOD_BADGE_CLASSES: Record<string, string> = {
  GET: 'text-green-400 bg-green-400/10',
  POST: 'text-orange-400 bg-orange-400/10',
  PUT: 'text-yellow-400 bg-yellow-400/10',
  PATCH: 'text-purple-400 bg-purple-400/10',
  DELETE: 'text-red-400 bg-red-400/10',
  HEAD: 'text-slate-400 bg-slate-400/10',
  OPTIONS: 'text-slate-400 bg-slate-400/10',
};

/** HTTP method → Tailwind text-only class (for compact labels). */
export const METHOD_TEXT_CLASSES: Record<string, string> = {
  GET: 'text-green-400',
  POST: 'text-orange-400',
  PUT: 'text-yellow-400',
  PATCH: 'text-purple-400',
  DELETE: 'text-red-400',
};
