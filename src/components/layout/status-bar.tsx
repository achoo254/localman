export function StatusBar() {
  return (
    <footer
      className="flex h-7 shrink-0 items-center gap-4 px-3 text-xs"
      style={{
        background: 'var(--color-bg-secondary)',
        borderTop: '1px solid var(--color-bg-tertiary)',
        color: 'var(--foreground)',
        opacity: 0.8,
      }}
    >
      <span style={{ color: 'var(--color-accent)', opacity: 0.7 }}>Localman v0.1.0</span>
      <span className="ml-auto opacity-50">Offline</span>
    </footer>
  );
}
