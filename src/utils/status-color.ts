/** Returns a CSS color string for an HTTP status code. */
export function statusColor(status: number): string {
  if (status >= 200 && status < 300) return 'var(--color-method-get)';
  if (status >= 300 && status < 400) return '#3b82f6';
  if (status >= 400 && status < 500) return 'var(--color-method-post)';
  if (status >= 500) return 'var(--color-method-delete)';
  return 'var(--foreground)';
}
