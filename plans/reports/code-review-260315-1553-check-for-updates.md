# Code Review: Check for Updates Feature

**Reviewer:** code-reviewer | **Date:** 2026-03-15 | **Scope:** 10 files (new + modified)

## Scope

- `src/services/update-checker-service.ts` (NEW, 56 LOC)
- `src/stores/update-store.ts` (NEW, 70 LOC)
- `src/hooks/use-update-checker.ts` (NEW, 20 LOC)
- `src/components/settings/update-dialog.tsx` (NEW, 107 LOC)
- `src/components/settings/about-section.tsx` (MODIFIED)
- `src/App.tsx` (MODIFIED)
- `src-tauri/tauri.conf.json` (MODIFIED)
- `src-tauri/Cargo.toml` (MODIFIED)
- `src-tauri/src/lib.rs` (MODIFIED)
- `.github/workflows/release.yml` (NEW, 80 LOC)
- `scripts/bump-version.sh` (NEW, 28 LOC)

## Overall Assessment

Clean, well-structured implementation following existing codebase patterns. Service/store/hook separation is idiomatic. However, there are two critical issues (missing capabilities + empty pubkey) that will cause runtime failures, and several medium-priority items around edge cases.

---

## Critical Issues

### 1. Missing Tauri capabilities for `updater` and `process` plugins

**File:** `src-tauri/capabilities/default.json`

The updater and process plugins are registered in `lib.rs` and their JS bindings are called, but **no permissions are declared** in `default.json`. Tauri v2 requires explicit capability grants -- without them, `check()` and `relaunch()` will throw permission-denied errors at runtime.

**Fix:**
```json
"permissions": [
  // ... existing permissions ...
  "updater:default",
  "process:allow-restart"
]
```

### 2. Empty `pubkey` in updater config

**File:** `src-tauri/tauri.conf.json` (line 29)

`"pubkey": ""` -- Tauri v2 updater requires a valid Ed25519 public key to verify update signatures. With an empty key, the updater will either refuse to check or fail signature verification. The plan (`phase-01-signing-and-config-setup.md`) shows this was checked off but the actual key was never inserted.

**Fix:** Generate key with `tauri signer generate` and set `pubkey` to the `.key.pub` contents. Store private key as GitHub secret `TAURI_SIGNING_PRIVATE_KEY` (already referenced in workflow).

---

## High Priority

### 3. No `isTauri()` guard -- crashes in browser dev mode

**Files:** `update-checker-service.ts`, `use-update-checker.ts`

When running `pnpm dev` (Vite only, no Tauri window), `@tauri-apps/plugin-updater` and `@tauri-apps/plugin-process` imports will throw because the Tauri IPC bridge doesn't exist. The existing codebase uses `isTauri()` checks in other services (e.g., `http-client.ts`).

The `catch` block in `checkForUpdates()` may swallow this error silently, but `relaunch()` in `downloadAndInstall()` has no try/catch and will crash.

**Fix:** Add early guard in both functions:
```ts
import { isTauri } from '../utils/tauri-helpers'

export async function checkForUpdates() {
  if (!isTauri()) return null
  // ...existing logic
}

export async function downloadAndInstall(update, onProgress) {
  if (!isTauri()) return
  // ...existing logic
}
```

### 4. Progress tracking loses `total` after `Started` event

**File:** `update-checker-service.ts` (line 50)

In the `Progress` event handler, `total` is hardcoded to `null`:
```ts
onProgress?.({ downloaded, total: null })
```

The `total` from the `Started` event's `contentLength` is never carried forward. This means the progress bar in the dialog falls back to the indeterminate 50% width for the entire download.

**Fix:** Capture `total` from `Started` and pass it through:
```ts
let downloaded = 0
let total: number | null = null
await update.downloadAndInstall((event) => {
  if (event.event === 'Started') {
    total = event.data.contentLength ?? null
    onProgress?.({ downloaded: 0, total })
  } else if (event.event === 'Progress') {
    downloaded += event.data.chunkLength
    onProgress?.({ downloaded, total })
  } else if (event.event === 'Finished') {
    onProgress?.({ downloaded, total: downloaded })
  }
})
```

### 5. Dialog can be closed during active download

**File:** `update-dialog.tsx`

The dialog overlay and close button remain active while `status === 'downloading'`. Closing the dialog mid-download won't cancel the download (it continues in background), but the user loses all progress visibility and can't see errors. The "Later" button is also not disabled during download.

**Fix:** Prevent closing during download:
```tsx
<Dialog.Root
  open={dialogOpen}
  onOpenChange={(open) => { if (!isDownloading) setDialogOpen(open) }}
>
```
And disable the "Later" button:
```tsx
<button ... disabled={isDownloading}>Later</button>
```

---

## Medium Priority

### 6. `relaunch()` called immediately after install -- no user confirmation

**File:** `update-checker-service.ts` (line 55)

`relaunch()` is called automatically after `downloadAndInstall` completes. The user gets no warning that the app is about to restart. If they have unsaved work in the request builder (drafts not yet auto-saved), they could lose data.

**Recommendation:** Move `relaunch()` out of the service into the store/UI layer. Show a "Restart now" button after install completes instead of auto-relaunching.

### 7. Store actions swallow errors silently in `performCheck`

**File:** `update-store.ts` (line 43-56)

`performCheck` calls `checkForUpdates()` which catches all errors and returns `null`. If the check fails due to a network error, the store resets to `idle` (same as "up to date"). In manual mode, the user sees "You're up to date" which is misleading -- they're actually offline or the check failed.

**Fix:** Differentiate between "no update" and "check failed":
```ts
// In update-checker-service.ts, throw on actual errors
// Return null only for "up to date"
// In store, catch and set status: 'error' for manual checks
```

### 8. `sed -i` in bump script not portable to macOS

**File:** `scripts/bump-version.sh` (line 26)

`sed -i` behaves differently on macOS (BSD sed requires `sed -i ''`). Since contributors may run this on macOS:

**Fix:** Use `sed -i.bak` and remove the backup, or use the node approach consistently for all three files.

### 9. `react-markdown` is a new dependency for one small use

**File:** `package.json`, `update-dialog.tsx`

`react-markdown` (+ its transitive deps like `remark-parse`, `unified`) is added for rendering release notes in the update dialog. However, it's already used in 2 other components (`docs-request-card.tsx`, `request-description-editor.tsx`), so the dependency cost is already paid. No action needed, just noting the dependency is justified.

### 10. GitHub Actions workflow uses `tauri-action@v1`

**File:** `.github/workflows/release.yml` (line 62)

`tauri-apps/tauri-action@v1` is for Tauri v1. For Tauri v2, use `tauri-apps/tauri-action@v0` with `tauriScript: "pnpm tauri"` or the newer `@v2` if available. The v1 action may not correctly generate the `latest.json` manifest for v2's updater format.

**Fix:**
```yaml
- uses: tauri-apps/tauri-action@v0
  with:
    tauriScript: pnpm tauri
    releaseId: ${{ needs.create-release.outputs.release_id }}
```

---

## Low Priority

### 11. `useRef<ReturnType<typeof setInterval>>(undefined)` -- minor type cleanup

**File:** `use-update-checker.ts` (line 13)

Works fine, but `useRef<ReturnType<typeof setInterval> | undefined>(undefined)` or `useRef<NodeJS.Timeout>(undefined)` is slightly more explicit.

### 12. Date formatting in update dialog

**File:** `update-dialog.tsx` (line 51)

`updateInfo.date` is rendered raw (ISO 8601 from GitHub). The app already uses `date-fns` -- format it for readability:
```tsx
import { format } from 'date-fns'
// ...
<span>{format(new Date(updateInfo.date), 'MMM d, yyyy')}</span>
```

---

## Edge Cases Found by Scout

| Edge Case | Status | Notes |
|-----------|--------|-------|
| Browser dev mode (no Tauri) | NOT HANDLED | Will throw on plugin import/call |
| Offline at startup | OK | `check()` error caught, returns null |
| No endpoint configured | OK | Same catch path |
| Download interrupted (network drop) | PARTIAL | Error caught in store, but dialog can be closed |
| Multiple rapid manual checks | NOT HANDLED | Can fire concurrent `performCheck` calls |
| App closed during download | OK | OS handles cleanup |
| Version rollback detection | N/A | Tauri updater only offers newer versions |
| `pubkey` empty | BROKEN | Signature verification will fail |

**Concurrent check race:** If user clicks "Check for updates" rapidly, multiple `performCheck` calls run concurrently. Add a guard:
```ts
performCheck: async (manual) => {
  if (get().status === 'checking') return
  // ...
}
```

---

## Positive Observations

- Clean service/store/hook separation follows existing codebase patterns
- Zustand store design is idiomatic -- actions in store, not in hooks
- Dialog UI follows existing Radix Dialog patterns (overlay, header/body/footer, close button)
- CSS uses design system variables (`--color-bg-secondary`, `--color-accent`, etc.)
- Indeterminate progress bar fallback (50% width) is good UX when total is unknown
- Version bump script covers all 3 version locations (package.json, tauri.conf.json, Cargo.toml)
- CI workflow properly separates create/build/publish stages with draft release pattern
- File naming follows kebab-case convention

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Add `updater:default` and `process:allow-restart` to `src-tauri/capabilities/default.json`
2. **[CRITICAL]** Generate signing keypair and set `pubkey` in `tauri.conf.json` (store private key as GitHub secret)
3. **[HIGH]** Add `isTauri()` guards in `update-checker-service.ts`
4. **[HIGH]** Fix progress `total` tracking in download callback
5. **[HIGH]** Prevent dialog close during download
6. **[MEDIUM]** Verify `tauri-action` version compatibility with Tauri v2
7. **[MEDIUM]** Add concurrent check guard in store
8. **[MEDIUM]** Separate `relaunch()` from `downloadAndInstall` -- let user confirm restart
9. **[LOW]** Fix `sed -i` portability in bump script
10. **[LOW]** Format date with `date-fns`

---

## Metrics

- Type Coverage: Good -- all interfaces typed, no `any` usage
- Test Coverage: None (no tests for update feature)
- Linting Issues: Not run (Tauri plugin imports may fail without Tauri context)
- New Dependencies: `@tauri-apps/plugin-updater`, `@tauri-apps/plugin-process`, `react-markdown` (already used elsewhere)

## Unresolved Questions

1. Has the signing keypair been generated? The plan shows the task checked off but `pubkey` is empty in config.
2. Is `tauri-apps/tauri-action@v1` confirmed to work with Tauri v2's updater manifest format?
3. Should the update check be skipped in dev builds to avoid noise? (e.g., check `import.meta.env.DEV`)
