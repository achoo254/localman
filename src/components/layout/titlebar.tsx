import { getCurrentWindow } from '@tauri-apps/api/window';

export function Titlebar() {
  async function minimize() {
    await getCurrentWindow().minimize();
  }
  async function toggleMaximize() {
    await getCurrentWindow().toggleMaximize();
  }
  async function close() {
    await getCurrentWindow().close();
  }

  return (
    <header
      className="flex h-10 shrink-0 items-center justify-between px-3"
      style={{
        background: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-bg-tertiary)',
      }}
    >
      <div
        className="flex flex-1 items-center gap-2"
        data-tauri-drag-region
      >
        <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
          Localman
        </span>
      </div>
      <div className="flex items-center gap-0.5" data-tauri-drag-region={false}>
        <button
          type="button"
          aria-label="Minimize"
          onClick={minimize}
          className="h-8 w-10 rounded-none hover:bg-white/10"
        />
        <button
          type="button"
          aria-label="Maximize"
          onClick={toggleMaximize}
          className="h-8 w-10 rounded-none hover:bg-white/10"
        />
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="h-8 w-10 rounded-none hover:bg-red-500/80"
        />
      </div>
    </header>
  );
}
