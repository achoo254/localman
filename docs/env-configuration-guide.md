# Environment & CI/CD Configuration Guide

Guide for Localman project environment setup, GitHub workflow, and release process.

---

## Project Info

| Key | Value |
|-----|-------|
| Repo host | GitHub |
| CLI tool | `gh` |
| CI config | `.github/workflows/` |

---

## Environment Variables

### Frontend (`client/.env` — Vite, `VITE_` prefix required at build time)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase API key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `localman-36eac.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `localman-36eac` |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | `1:123:web:abc` |
| `VITE_PROXY_URL` | Backend proxy base URL | `http://localhost:3001/proxy` |

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|---------|
| `PORT` | Port to listen on | no (default `3001`) |
| `ALLOWED_ORIGINS` | Comma-separated FE origins | yes |
| `REQUIRE_AUTH` | `true` or `false` — skip Firebase if `false` | yes |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Service account JSON string | if `REQUIRE_AUTH=true` |

---

## CI/CD Pipeline

### Architecture

GitHub Actions workflow under `.github/workflows/`:

```
verify (every push / PR)
└── lint-and-test: node:22-alpine
    ├── client: pnpm --filter client lint + type-check + test
    └── backend: pnpm --filter backend build + test
```

### Pipeline Triggers

| Trigger | Jobs |
|---------|------|
| Push to any branch | `lint-and-test` |
| Pull request | `lint-and-test` |

### Common Pipeline Failures

| Error | Cause | Fix |
|-------|-------|-----|
| `pnpm: command not found` | corepack not enabled | Add `corepack enable` step or use `pnpm/action-setup` |
| Frozen lockfile mismatch | `pnpm-lock.yaml` outdated | Run `pnpm install` locally, commit lockfile |
| Backend build fail | Missing `backend/.env` | CI does not need `.env` for build — check `tsconfig.json` |

---

## Release Workflow

### 1. Pre-release Checklist

```bash
pnpm --filter client lint            # 0 errors
pnpm --filter client type-check      # 0 errors
pnpm --filter client test --run      # all pass
pnpm --filter backend build          # compiles clean
pnpm --filter backend test           # all pass
pnpm --filter client build           # client/dist produced
```

### 2. Create Tag + Push

```bash
git tag -a v0.X.Y -m "Release v0.X.Y — description"
git push origin v0.X.Y
```

### 3. Create GitHub Release

```bash
gh release create v0.X.Y \
  --title "v0.X.Y - Release Title" \
  --notes "Release notes here"
```

### 4. Monitor Pipeline

```bash
gh run list --limit 5                # recent workflow runs
gh run view <run-id>                 # job summary
gh run view <run-id> --log           # full log
```

---

## Security Rules

1. **NEVER** commit `client/.env`, `backend/.env`, or any service account JSON to git
2. **NEVER** log tokens in CI output or responses
3. Firebase client keys (`VITE_FIREBASE_*`) are public (client-side) — still keep in `.env` for flexibility
4. `FIREBASE_SERVICE_ACCOUNT_JSON` is secret — never commit; use GitHub Secrets or Docker secrets at deploy time
5. Use a dedicated `GITHUB_TOKEN` (default in Actions) or fine-grained PAT for cross-repo access; rotate periodically

---

## File Reference

| File | Purpose | Git |
|------|---------|-----|
| `client/.env` | Frontend Firebase config + proxy URL | ignored |
| `backend/.env` | Backend runtime config | ignored |
| `.github/workflows/` | CI/CD pipeline definitions | tracked |
| `pnpm-workspace.yaml` | pnpm monorepo config | tracked |
