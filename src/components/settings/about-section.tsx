/**
 * About: app version, check for updates (placeholder for Phase 10).
 */

const APP_VERSION = '0.1.0';

export function AboutSection() {
  function handleCheckUpdates() {
    // Phase 10: wire to Tauri updater when plugin is added
    alert('Check for updates will be available after auto-updater is configured.');
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold text-slate-200">About</h2>
      <p className="text-sm text-slate-400">
        Localman <span className="text-slate-300 font-mono">v{APP_VERSION}</span>
      </p>
      <p className="text-xs text-slate-500">
        Offline-first API client. Data stays on your machine.
      </p>
      <button
        type="button"
        onClick={handleCheckUpdates}
        className="rounded bg-[var(--color-bg-tertiary)] px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 w-fit"
      >
        Check for updates
      </button>
    </div>
  );
}
