export function Sidebar() {
  return (
    <aside
      className="flex w-60 shrink-0 flex-col"
      style={{
        background: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-bg-tertiary)',
      }}
    >
      <div className="p-2">
        <div className="text-xs font-medium uppercase tracking-wider opacity-60">
          Collections
        </div>
        <p className="mt-2 text-sm opacity-50">No collections yet</p>
      </div>
    </aside>
  );
}
