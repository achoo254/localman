# Agent Execution Workflow Protocol

> **MANDATORY READ** before starting any phase.
> This document defines how an AI Agent executes the Localman MVP plan end-to-end: code → review → test → commit → push → GitLab.

## CRITICAL CONSTRAINT: One Phase at a Time

**max concurrent agent tasks = 1**

Phases execute strictly sequentially. NEVER start a new phase until the current one is fully committed, pushed, and plan.md updated. No parallel phase execution under any circumstance.

---

## Prerequisites (One-Time Human Setup)

Before the agent starts, a human must run these once:

```bash
# 1. Install glab CLI (GitLab CLI)
#    Windows: winget install --id GitLab.GitLabCLI
#    macOS:   brew install glab

# 2. Authenticate with the private GitLab instance
glab auth login --hostname gitlabs.inet.vn

# 3. Verify repo remote is set
git remote -v
# Should show: origin https://gitlabs.inet.vn/dattqh/localman.git

# 4. Verify glab works
glab project view --hostname gitlabs.inet.vn
```

---

## Phase 0: GitLab Bootstrap (runs ONCE before any code phase)

Agent runs this before starting Phase 00 code work:

### Create all milestones

```bash
# Run for each phase — replace title/description as needed
glab milestone create "Phase 00 — Bootstrap & Toolchain" \
  --description "Canonical toolchain decisions, full dep list, testing setup" \
  --hostname gitlabs.inet.vn

glab milestone create "Phase 01 — Project Setup" \
  --description "Scaffold Tauri v2 + React + TypeScript, base layout" \
  --hostname gitlabs.inet.vn

glab milestone create "Phase 02 — Database Layer" \
  --description "Dexie.js IndexedDB schema, models, service layer" \
  --hostname gitlabs.inet.vn

glab milestone create "Phase 03 — Request Builder" \
  --description "URL bar, method selector, params/headers/body/auth tabs" \
  --hostname gitlabs.inet.vn

glab milestone create "Phase 04 — HTTP Client & Response" \
  --description "Tauri HTTP plugin, response viewer, JSON highlight" \
  --hostname gitlabs.inet.vn

glab milestone create "Phase 05 — Collections & Sidebar" \
  --description "Collection tree, drag-and-drop, search, context menus" \
  --hostname gitlabs.inet.vn

glab milestone create "Phase 06 — Environments" \
  --description "Variable interpolation, env manager, secret variables" \
  --hostname gitlabs.inet.vn

glab milestone create "Phase 07 — History" \
  --description "Auto-log requests, history sidebar, filters, re-run" \
  --hostname gitlabs.inet.vn

glab milestone create "Phase 08 — Import/Export" \
  --description "cURL parser, Postman v2.1 importer/exporter, file dialogs" \
  --hostname gitlabs.inet.vn

glab milestone create "Phase 09 — Scripts Sandbox" \
  --description "QuickJS WASM, lm API, pre/post script editor, test results" \
  --hostname gitlabs.inet.vn

glab milestone create "Phase 10 — Packaging & Polish" \
  --description "Cross-platform builds, auto-updater, settings UI, CI/CD" \
  --hostname gitlabs.inet.vn

glab milestone create "Phase 11 — Cloud Sync" \
  --description "Generic HTTP sync, Postman JSON format, LWW conflict resolution" \
  --hostname gitlabs.inet.vn
```

### Create GitLab labels (once, before any issues)

```bash
# Create all required labels — skip if already exist (error is non-fatal)
for PHASE in 00 01 02 03 04 05 06 07 08 09 10 11; do
  glab label create "phase-$PHASE" --color "#428BCA" --hostname gitlabs.inet.vn 2>/dev/null || true
done
glab label create "status::in-progress" --color "#F0AD4E" --hostname gitlabs.inet.vn 2>/dev/null || true
glab label create "status::done"        --color "#5CB85C" --hostname gitlabs.inet.vn 2>/dev/null || true
```

### Create issues for a phase

Parse the `## Todo List` section of the phase file. Each `- [ ] item` → one issue.
Use milestone title directly (no `jq` required):

```bash
# Example for Phase 01 — use milestone title string, not ID
glab issue create \
  --title "Scaffold Tauri v2 + React + TypeScript" \
  --description "Phase 01 todo: scaffold Tauri v2 + React + TS using create-tauri-app" \
  --label "phase-01" \
  --milestone "Phase 01 — Project Setup" \
  --hostname gitlabs.inet.vn
# ... repeat for each todo item in the phase's Todo List
```

**Label convention:** `phase-XX` per phase, `status::in-progress` while working, `status::done` on close.

---

## Per-Phase Execution Loop

For each phase (Phase 00 through Phase 11), the agent follows this exact sequence:

```
READ phase file
  → CREATE GitLab issues (from todo list)
  → IMPLEMENT each todo item
      → code
      → self-review
      → run checks
      → commit (refs issue)
  → FULL test suite
  → PUSH to main
  → CLOSE issues
  → UPDATE plan.md phase status
```

### Step 1: Read phase file

Read the phase markdown file completely. Understand:
- All requirements
- Architecture decisions
- File list (create/modify)
- Implementation steps
- Success criteria

### Step 2: Create GitLab issues

Parse the `## Todo List` section. Create one issue per `- [ ] item` under the phase's milestone. Note down the issue IDs.

### Step 3: Implement each todo item

For each todo item (in order):

**3a. Mark issue in-progress**
```bash
glab issue update {issue_id} --label "status::in-progress" --hostname gitlabs.inet.vn
```

**3b. Code the feature**
- Follow implementation steps in the phase file exactly
- Keep files under 200 lines (split if exceeded — see CLAUDE.md)
- Use kebab-case filenames
- Write self-documenting code; add comments only for non-obvious logic
- YAGNI/KISS/DRY — no over-engineering

**3c. Self-review checklist (must pass before committing)**
- [ ] `pnpm type-check` — zero TypeScript errors
- [ ] `pnpm lint` — zero lint errors
- [ ] No file exceeds 200 lines of code
- [ ] No `any` types introduced (warn is acceptable, not errors)
- [ ] No unused imports or variables
- [ ] No hardcoded secrets or tokens
- [ ] Logic follows phase file architecture (not improvised)

**3d. Run tests**
```bash
pnpm test --run     # Vitest (no watch mode)
```
- **If tests fail:** analyze root cause, fix the code (not the test). Never skip, mock away, or comment out failing tests.
- **If no tests exist yet for this feature:** write at minimum 1 unit test for the core logic.

**3e. Commit with issue reference**

```bash
git add <specific files only — never git add -A>
git commit -m "feat(phase-NN): brief description

- detail 1
- detail 2

Refs #issue_id"
```

Commit message format:
- Type: `feat` / `fix` / `refactor` / `test` / `chore` / `docs`
- Scope: `phase-NN` (e.g., `phase-01`, `phase-03`)
- Subject: imperative, lowercase, no period
- Body: bullet points for non-trivial changes
- Footer: `Refs #ID` (while in progress), `Closes #ID` (final commit for issue)

**3f. Close issue on completion**
```bash
glab issue close {issue_id} --hostname gitlabs.inet.vn
```

### Step 4: Full test suite

After all todos implemented:
```bash
pnpm lint && pnpm type-check && pnpm test --run
```

All must pass. Fix any failures before proceeding.

### Step 5: Push to main

```bash
git push origin main
```

If push rejected:
```bash
git pull --rebase origin main
# fix any conflicts
git push origin main
```
**Never use `--force` on main.**

### Step 5b: Create GitLab Release (Phase 10 only)

After Phase 10 is pushed and CI passes:

```bash
# Tag the release
git tag v0.1.0-mvp
git push origin v0.1.0-mvp

# Create GitLab Release linked to the tag
glab release create v0.1.0-mvp \
  --name "Localman v0.1.0 MVP (Beta)" \
  --notes "First MVP release. macOS build is unsigned — Gatekeeper warning expected." \
  --hostname gitlabs.inet.vn
# Attach build artifacts (Windows .msi, macOS .dmg, Linux .AppImage) as release assets
```

### Step 6: Update plan.md

Update the phase status from `pending` to `completed`:
```bash
# Edit plan.md: change "| NN | [Phase Name](...) | Xd | pending |"
#                                                       ↓
#                                                  "| NN | [Phase Name](...) | Xd | completed |"
```

### Step 7: Proceed to next phase

Read the next phase file and start Step 1.

---

## Error Handling

| Error type | Action |
|---|---|
| TypeScript error | Fix source code, not by adding `// @ts-ignore` |
| Lint error | Fix the code violation, not by disabling rule |
| Test failure | Fix root cause in implementation code |
| Build failure | Fix compilation errors, never bypass with flags |
| Git conflict | Resolve conflict, commit resolution |
| GitLab API error | Retry once; if persists, log error and continue (non-blocking) |
| Unrecoverable error | Stop, document the blocker clearly, report to user |

**Never use:**
- `git push --force`
- `// @ts-ignore` or `// eslint-disable`
- `vi.mock()` to hide real implementation failures
- `--no-verify` flag on commits

---

## Commit Size Guidelines

- **One commit per logical unit** (one component, one service, one config)
- Not too small (one typo fix) nor too large (entire phase in one commit)
- Every commit must leave the codebase in a compilable, passing-lint state
- Aim: 3-8 commits per phase

---

## GitLab CI/CD

The GitHub Actions workflow created in Phase 10 will run on every `git push origin main`. If CI fails:
1. Read the failure log
2. Fix the issue locally
3. Commit fix: `fix(ci): description`
4. Push again

---

## Completion Criteria (Full Project)

The project is done when:
- [ ] All 12 phases status = `completed` in `plan.md`
- [ ] All GitLab milestones = 100% closed issues
- [ ] `pnpm tauri build` succeeds on the CI runner
- [ ] Cross-platform builds (Windows/macOS/Linux) attached to a GitLab Release
- [ ] All tests pass on CI

---

## Quick Reference

```bash
# Daily agent commands
pnpm lint                           # lint check
pnpm type-check                     # TypeScript check
pnpm test --run                     # run tests once
pnpm tauri dev                      # dev mode

# Git
git add src/path/to/file.ts         # stage specific files
git commit -m "feat(phase-NN): ..." # commit
git push origin main                # push

# glab (GitLab)
glab milestone list --hostname gitlabs.inet.vn
glab issue create --title "..." --milestone "ID" --hostname gitlabs.inet.vn
glab issue close {id} --hostname gitlabs.inet.vn
glab issue list --milestone "Phase 01" --hostname gitlabs.inet.vn
```
