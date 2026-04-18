#!/usr/bin/env bash
# Fails commit if forbidden design-token patterns reappear in staged files.
# Run by lint-staged on client/src/**/*.{ts,tsx} files.
set -e

FORBIDDEN=(
  '#0B1120'
  '#0F172A'
  '#1E293B'
  '\btext-white\b'
  '\btext-gray-'
  '\bbg-red-950\b'
  '\bbg-emerald-950\b'
  'color-text-inverse'
  'text-\[1[0-8]px\]'
)

FAIL=0
for p in "${FORBIDDEN[@]}"; do
  MATCHES=$(grep -rnE "$p" client/src/components/ --include='*.tsx' \
    | grep -v 'html-preview.tsx' \
    | grep -v 'hover:text-white' || true)
  if [ -n "$MATCHES" ]; then
    echo "Forbidden design-token pattern: $p"
    echo "$MATCHES"
    FAIL=1
  fi
done

if [ "$FAIL" -eq 1 ]; then
  echo "Design token check failed. Fix violations before committing."
  exit 1
fi
