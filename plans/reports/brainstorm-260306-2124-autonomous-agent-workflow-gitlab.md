# Brainstorm Report: Autonomous Agent Workflow + GitLab Integration

**Date:** 2026-03-06
**Context:** Localman MVP — define how AI Agent executes plan end-to-end and pushes to GitLab

---

## Problem Statement

The entire MVP will be implemented by an AI Agent with zero human intervention during execution. Need a workflow protocol that covers: coding, self-review, testing, committing, and GitLab milestone/issue management — all autonomous.

---

## Decisions (confirmed via Q&A)

| Decision | Choice | Rationale |
|---|---|---|
| Human oversight | Zero — agent runs until done | User reviews on GitLab after each phase |
| Branch strategy | Push straight to `main` | Simplest; no MR overhead for single-agent work |
| Milestones | 1 per phase (12 total) | Maps directly to plan structure |
| Issues | 1 per todo item in phase files | Fine-grained tracking, auto-close on completion |
| GitLab host | `gitlabs.inet.vn` | Private instance, use `glab --hostname` |

---

## Final Architecture

### Per-Phase Execution Loop

```
READ phase file
  ↓
CREATE GitLab issues (1 per todo item, under phase milestone)
  ↓
FOR EACH todo item:
  mark issue in-progress → code → self-review → pnpm lint+type-check+test → commit (Refs #id) → close issue
  ↓
FULL test suite (all pass required)
  ↓
git push origin main
  ↓
UPDATE plan.md phase status = completed
  ↓
NEXT phase
```

### Self-Review Checklist (mandatory before each commit)
- `pnpm type-check` — zero TS errors
- `pnpm lint` — zero lint errors
- No file > 200 lines
- No `any`, no `ts-ignore`, no `eslint-disable`
- No unused code, no over-engineering
- Follows phase file architecture

### Commit Convention
```
feat(phase-NN): imperative description

- bullet details for non-trivial changes

Refs #issue_id   (in progress)
Closes #issue_id (final commit for issue)
```

### Error Handling Rules
- TypeScript/lint errors → fix source code (never suppress)
- Test failures → fix implementation (never mock/skip to pass)
- Build failure → fix, never bypass with flags
- Git push failure → `git pull --rebase`, resolve conflicts, push again
- Never `git push --force` on main
- Unrecoverable error → stop and report clearly

---

## One-Time GitLab Bootstrap

Before Phase 00 code work:
1. `glab auth login --hostname gitlabs.inet.vn`
2. Create all 12 milestones via `glab milestone create`
3. Verify repo remote points to `gitlabs.inet.vn/dattqh/localman.git`

Issue creation: parse `## Todo List` from each phase file → `- [ ] item` = 1 issue.

---

## What Was Created

| File | Action |
|---|---|
| `workflow-agent-execution-protocol.md` | **Created** — full autonomous workflow reference |
| `CLAUDE.md` | Added "Agent Execution Protocol" section at top, referencing the workflow file |
| `plan.md` | Added agent workflow summary at top |

---

## Implementation Considerations

- `glab` CLI must be available in agent environment (Windows: `winget install GitLab.GitLabCLI`)
- `jq` needed for parsing milestone ID from `glab milestone list --output json`
- CI/CD pipeline (Phase 10) runs on every push to main — agent must handle CI failures
- GitLab Release creation (end of Phase 10) attaches build artifacts for Windows/macOS/Linux

---

## Risks

| Risk | Mitigation |
|---|---|
| Agent breaks main with bad commit | Full lint+type+test must pass before every push |
| `glab` not available in agent env | Protocol includes install instructions; fallback to GitLab API via `curl` |
| CI failure after push | Agent reads CI log, fixes, pushes fix commit |
| Issue creation fails (API error) | Non-blocking — log and continue; issues can be created manually |

---

## Unresolved Questions

- Does the GitLab instance have `jq` available in CI runners? (needed for milestone ID parsing)
- Should agent create a GitLab Release tag (e.g., `v0.1.0-mvp`) after Phase 10 completes?
- `glab` label management: pre-create `phase-XX` and `status::in-progress` / `status::done` labels, or create on-the-fly?
