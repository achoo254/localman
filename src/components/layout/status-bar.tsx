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
      <span>DB: ready</span>
    </footer>
  );
}
