# GitLab Workflow Guide — Localman

**GitLab instance:** `gitlabs.inet.vn`
**Project:** `dattqh/localman`
**Auth file:** `gitlab-authen.txt` (token: AI_Agent / `glpat-REDACTED`)

> **Security:** Never commit `gitlab-authen.txt` to the repo. It is git-ignored.

---

## 1. Setup (one-time)

### Git remote with token embedded
```bash
git remote set-url origin https://AI_Agent:glpat-REDACTED@gitlabs.inet.vn/dattqh/localman.git
```

### Install glab (GitLab CLI)
```bash
# Windows (winget)
winget install glab

# After install, authenticate
glab auth login --hostname gitlabs.inet.vn --token glpat-REDACTED
```

---

## 2. Commit & Push

```bash
# Standard commit + push (token already in remote URL)
git add <files>
git commit -m "feat(scope): description"
git push origin main

# If remote not yet configured:
git push https://AI_Agent:glpat-REDACTED@gitlabs.inet.vn/dattqh/localman.git main
```

---

## 3. Issues (via GitLab API — no glab needed)

```bash
TOKEN="glpat-REDACTED"
API="https://gitlabs.inet.vn/api/v4/projects/dattqh%2Flocalman"

# Create issue
curl -s -X POST "$API/issues" \
  -H "PRIVATE-TOKEN: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Issue title","description":"Details","labels":"bug"}'

# List open issues
curl -s "$API/issues?state=opened" -H "PRIVATE-TOKEN: $TOKEN" | \
  python3 -c "import sys,json; [print(i['iid'], i['title']) for i in json.load(sys.stdin)]"

# Close issue
curl -s -X PUT "$API/issues/123" \
  -H "PRIVATE-TOKEN: $TOKEN" \
  -d "state_event=close"
```

---

## 4. Milestones (via API)

```bash
TOKEN="glpat-REDACTED"
API="https://gitlabs.inet.vn/api/v4/projects/dattqh%2Flocalman"

# Create milestone
curl -s -X POST "$API/milestones" \
  -H "PRIVATE-TOKEN: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"v0.2.0","description":"UX fixes","due_date":"2026-03-31"}'

# List milestones
curl -s "$API/milestones" -H "PRIVATE-TOKEN: $TOKEN" | \
  python3 -c "import sys,json; [print(m['id'], m['title']) for m in json.load(sys.stdin)]"

# Assign issue to milestone (use milestone id from above)
curl -s -X PUT "$API/issues/123" \
  -H "PRIVATE-TOKEN: $TOKEN" \
  -d "milestone_id=<milestone_id>"
```

---

## 5. glab CLI (when installed)

```bash
# All commands must include --hostname flag
glab auth login --hostname gitlabs.inet.vn --token glpat-REDACTED

# Issues
glab issue list --hostname gitlabs.inet.vn
glab issue create --hostname gitlabs.inet.vn --title "Title" --label "bug"
glab issue close 123 --hostname gitlabs.inet.vn

# MR (merge request)
glab mr create --hostname gitlabs.inet.vn --fill

# View project
glab project view --hostname gitlabs.inet.vn
```

---

## 6. Labels used in this project

| Label | Purpose |
|-------|---------|
| `bug` | Functional bugs |
| `enhancement` | New features / improvements |
| `ux` | UX consistency issues |
| `accessibility` | a11y issues |
| `ui-polish` | Visual polish |

---

## 7. Reading token from file (for scripts)

```bash
# Read token from gitlab-authen.txt
TOKEN=$(grep "access token:" gitlab-authen.txt | awk '{print $NF}')
API="https://gitlabs.inet.vn/api/v4/projects/dattqh%2Flocalman"
```

---

## Plan → Issue workflow (AI agents)

When Claude creates a plan in `plans/`, it uses the API directly:
```bash
# Same curl pattern as section 3 above
# Token sourced from git remote or gitlab-authen.txt
# Project path always: dattqh%2Flocalman
```
