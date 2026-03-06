# Agent Execution Workflow Protocol

> **MANDATORY READ** before starting any phase.
> This document defines how an AI Agent executes the Localman MVP plan end-to-end: code → review → test → commit → push → GitLab.

---

## CRITICAL CONSTRAINT: One Phase at a Time

**max concurrent agent tasks = 1**

Phases execute strictly sequentially. NEVER start a new phase until the current one is fully committed, pushed, and plan.md updated. No parallel phase execution under any circumstance.

---

## GitLab Access Configuration

```
Host:       gitlabs.inet.vn
Project ID: 296
Repo URL:   https://gitlabs.inet.vn/dattqh/localman.git
Token file: D:\CONG VIEC\localman\gitlab-authen.txt  (in .gitignore — never commit)
```

### Read token (Python)

```python
# Read token from local file — use this pattern in all GitLab API calls
def _read_token():
    with open(r'D:\CONG VIEC\localman\gitlab-authen.txt') as f:
        for line in f:
            if 'access token:' in line:
                return line.split(':', 1)[1].strip()
```

### GitLab API helper (Python — use inline in agent scripts)

```python
import urllib.request, json

GITLAB_HOST = 'https://gitlabs.inet.vn'
PROJECT_ID  = 296

def gitlab(method, path, data=None):
    """Call GitLab REST API. method = GET/POST/PUT/DELETE."""
    token = open(r'D:\CONG VIEC\localman\gitlab-authen.txt').readlines()[1].split(': ')[1].strip()
    url   = f'{GITLAB_HOST}/api/v4/projects/{PROJECT_ID}{path}'
    body  = json.dumps(data).encode() if data else None
    req   = urllib.request.Request(url, data=body, method=method,
                headers={'PRIVATE-TOKEN': token, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())
```

### Git push authentication

Git remote is already configured with the token embedded:
```
https://AI_Agent:<token>@gitlabs.inet.vn/dattqh/localman.git
```
`git push origin main` works without additional setup.

---

## GitLab Bootstrap Status

> **ALREADY COMPLETED** — Do NOT re-run these steps.

| Item | Status |
|---|---|
| 12 Milestones (Phase 00–11) | ✅ Created |
| 14 Labels (phase-00..11 + status::*) | ✅ Created |
| 119 Issues (from all phase todo lists) | ✅ Created |

---

## Per-Phase Execution Loop

For each phase (Phase 00 through Phase 11):

```
READ phase file
  → GET issue IDs for this phase from GitLab
  → IMPLEMENT each todo item (in order):
      → mark issue in-progress (API)
      → code the feature
      → self-review checklist
      → pnpm lint && pnpm type-check && pnpm test --run
      → commit (Refs #id)
      → mark issue done (API)
  → FULL test suite pass
  → git push origin main
  → UPDATE plan.md phase status = completed
  → NEXT phase
```

---

### Step 1: Read phase file

Read the phase markdown file completely. Understand all requirements, architecture, files to create/modify, implementation steps, and success criteria.

---

### Step 2: Get issue IDs for this phase

```python
import urllib.request, json

GITLAB_HOST = 'https://gitlabs.inet.vn'
PROJECT_ID  = 296

def gitlab(method, path, data=None):
    token = open(r'D:\CONG VIEC\localman\gitlab-authen.txt').readlines()[1].split(': ')[1].strip()
    url   = f'{GITLAB_HOST}/api/v4/projects/{PROJECT_ID}{path}'
    body  = json.dumps(data).encode() if data else None
    req   = urllib.request.Request(url, data=body, method=method,
                headers={'PRIVATE-TOKEN': token, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

# Get issues for current phase — replace PHASE_LABEL with e.g. "phase-01"
PHASE_LABEL = 'phase-01'
issues = gitlab('GET', f'/issues?labels={PHASE_LABEL}&state=opened&per_page=50')
# issues is a list of {id, iid, title, ...}
# Use issue['iid'] (project-level number) for git commit references
issue_map = {i['title']: i['iid'] for i in issues}
print(issue_map)
```

---

### Step 3: Implement each todo item

For each todo item (in order from phase file):

**3a. Mark issue in-progress**

```python
ISSUE_IID = issue_map['todo title here']
gitlab('PUT', f'/issues/{ISSUE_IID}', {'add_labels': 'status::in-progress'})
```

**3b. Code the feature**
- Follow implementation steps in the phase file exactly
- Keep files under 200 lines — split if exceeded (see CLAUDE.md modularization rules)
- Use kebab-case filenames for JS/TS/Python
- Write self-documenting code; comments only for non-obvious logic
- YAGNI/KISS/DRY — no over-engineering, no unused code

**3c. Self-review checklist (must ALL pass before committing)**
- [ ] `pnpm type-check` — zero TypeScript errors
- [ ] `pnpm lint` — zero lint errors
- [ ] No file exceeds 200 lines of code
- [ ] No `any` types (warn acceptable, errors not)
- [ ] No unused imports or dead code
- [ ] No hardcoded secrets or tokens in source
- [ ] Logic follows phase file architecture (not improvised)

**3d. Run tests**

```bash
pnpm test --run
```

- If tests fail: analyze root cause, fix the implementation code. Never skip, mock away, or comment out failing tests.
- If no tests exist yet for this feature: write at minimum 1 unit test for the core logic.

**3e. Commit with issue reference**

```bash
git add src/path/to/changed-file.ts src/path/to/other-file.ts
git commit -m "feat(phase-NN): brief imperative description

- detail about what changed
- another detail

Refs #ISSUE_IID"
```

Commit format rules:
- Type prefix: `feat` / `fix` / `refactor` / `test` / `chore` / `docs`
- Scope: `phase-NN` (e.g., `phase-01`, `phase-03`)
- Subject: imperative, lowercase, no trailing period
- Footer: `Refs #IID` (in-progress), `Closes #IID` (final commit for that issue)
- **Never `git add -A` or `git add .`** — always stage specific files

**3f. Mark issue done**

```python
gitlab('PUT', f'/issues/{ISSUE_IID}', {
    'state_event': 'close',
    'add_labels': 'status::done',
    'remove_labels': 'status::in-progress'
})
```

---

### Step 4: Full test suite

After all todos implemented:

```bash
pnpm lint && pnpm type-check && pnpm test --run
```

All commands must exit 0. Fix any failures before pushing — never bypass.

---

### Step 5: Push to main

```bash
git push origin main
```

If push rejected:
```bash
git pull --rebase origin main
# resolve any conflicts
git push origin main
```

**Never use `git push --force` on main.**

---

### Step 5b: Create GitLab Release (Phase 10 ONLY)

After Phase 10 pushed and CI passes:

```bash
# Create and push version tag
git tag v0.1.0-mvp
git push origin v0.1.0-mvp
```

```python
# Create GitLab Release via API
gitlab('POST', '/releases', {
    'name': 'Localman v0.1.0 MVP (Beta)',
    'tag_name': 'v0.1.0-mvp',
    'description': (
        'First MVP release — offline-first Postman alternative built with Tauri.\n\n'
        '**Note:** macOS build is unsigned. Gatekeeper warning is expected for beta.'
    ),
})
print('Release created at https://gitlabs.inet.vn/dattqh/localman/-/releases')
```

---

### Step 6: Update plan.md

Change phase status from `pending` → `completed` in `plan.md`:

```
| NN | [Phase Name](...) | Xd | pending |
                                 ↓
| NN | [Phase Name](...) | Xd | completed |
```

Commit this update:
```bash
git add plans/260306-1134-localman-desktop-mvp/plan.md
git commit -m "chore(plan): mark Phase NN as completed"
git push origin main
```

---

### Step 7: Proceed to next phase

Read the next phase file and return to Step 1.

---

## Error Handling

| Error type | Action |
|---|---|
| TypeScript error | Fix source code — never add `// @ts-ignore` |
| Lint error | Fix the violation — never add `// eslint-disable` |
| Test failure | Fix root cause in implementation — never mock/skip to pass |
| Build failure | Fix compilation errors — never bypass with flags |
| Git conflict | Resolve conflict properly, commit resolution |
| GitLab API error | Retry once; if persists, log and continue (non-blocking) |
| `git push` rejected | `git pull --rebase`, fix conflicts, push again |
| Unrecoverable error | Stop, document the blocker in a comment, report to user |

**Forbidden actions:**
- `git push --force`
- `git commit --no-verify`
- `// @ts-ignore` or `/* eslint-disable */`
- Mocking real implementations to make tests pass
- Skipping or deleting failing tests

---

## Commit Size Guidelines

- One commit per logical unit (one component, one service, one config file)
- Not too small (one typo), not too large (entire phase in one commit)
- Every commit must leave the codebase compilable and lint-passing
- Aim: 3–8 commits per phase

---

## CI/CD Handling (Phase 10 onwards)

GitLab CI runs on every push to main. If CI fails after push:
1. Read the CI job log from GitLab
2. Fix locally
3. Commit: `fix(ci): description of fix`
4. Push again

---

## Quick Reference

```bash
# Dev commands
pnpm lint              # ESLint
pnpm type-check        # tsc --noEmit
pnpm test --run        # Vitest (once, no watch)
pnpm tauri dev         # dev mode

# Git
git add src/specific/file.ts    # stage specific files only
git commit -m "type(scope): msg"
git push origin main
git pull --rebase origin main   # if push rejected

# GitLab API (Python one-liners)
# Get phase issues:
#   python -c "exec(open('...').read()); print(gitlab('GET', '/issues?labels=phase-01&state=opened'))"
# Close issue #42:
#   python -c "exec(...); gitlab('PUT', '/issues/42', {'state_event': 'close'})"
```

---

## GitLab URLs

| Resource | URL |
|---|---|
| Repository | https://gitlabs.inet.vn/dattqh/localman |
| Issues | https://gitlabs.inet.vn/dattqh/localman/-/issues |
| Milestones | https://gitlabs.inet.vn/dattqh/localman/-/milestones |
| Releases | https://gitlabs.inet.vn/dattqh/localman/-/releases |
| CI/CD Pipelines | https://gitlabs.inet.vn/dattqh/localman/-/pipelines |
