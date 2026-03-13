# Environment & CI/CD Configuration Guide

Guide for Localman project environment setup, GitLab CI/CD, and release workflow.

---

## Project Info

| Key | Value |
|-----|-------|
| GitLab instance | `gitlabs.inet.vn` |
| Project path | `dattqh/localman` |
| Project ID | `296` |
| Auth file | `gitlab-authen.txt` (git-ignored) |
| CI config | `.gitlab-ci.yml` |

---

## Environment Variables

### Frontend (Vite — build-time, `VITE_` prefix required)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase API key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `localman-36eac.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `localman-36eac` |

### GitLab CI/CD

| Variable | Description | Scope |
|----------|-------------|-------|
| `GITLABS_USERNAME` | GitLab bot username | CI |
| `GITLABS_EMAIL` | GitLab bot email | CI |

---

## GitLab Access Token

**Type:** Project Access Token (NOT Personal/User token).

### Setup

1. Go to **GitLab → dattqh/localman → Settings → Access Tokens**
2. Create token with scopes: `api`, `read_api`, `read_repository`, `write_repository`
3. Save token to `gitlab-authen.txt` (git-ignored):
   ```
   Token name: AI_Agent
   access token: glpat-REDACTED
   ```
4. Git remote uses token in URL:
   ```
   https://<TOKEN_NAME>:<TOKEN>@gitlabs.inet.vn/dattqh/localman.git
   ```

### Token Capabilities

| Operation | Required Scope |
|-----------|---------------|
| Push code / tags | `write_repository` |
| Read pipeline status | `read_api` |
| Create releases | `api` |
| Read job logs | `api` |
| Trigger pipelines | `api` |

### Troubleshooting Token Issues

- **404 on pipeline jobs API** → token missing `api` scope (only has `read_api`)
- **403 on push** → token missing `write_repository` scope
- **401 on any call** → token expired or revoked, recreate in Settings

---

## CI/CD Pipeline

### Architecture

```
.gitlab-ci.yml
├── verify (every push/MR)
│   └── lint-and-test: pnpm lint + type-check + test
└── build (tags matching v*)
    └── build-windows: pnpm tauri build → MSI + EXE artifacts
```

### Runners

- **Tag:** `windows` — requires a Windows GitLab runner with:
  - Node.js + corepack (pnpm)
  - Rust toolchain (for Tauri build)
  - Visual Studio Build Tools (C++ workload)
  - WebView2 runtime

### Pipeline Triggers

| Trigger | Jobs |
|---------|------|
| Push to any branch | `lint-and-test` |
| Merge request | `lint-and-test` |
| Tag push (`v*`) | `lint-and-test` + `build-windows` |

### Build Artifacts

- **MSI installer:** `src-tauri/target/release/bundle/msi/*.msi`
- **NSIS installer:** `src-tauri/target/release/bundle/nsis/*.exe`
- **Retention:** 90 days

### Common Pipeline Failures

| Error | Cause | Fix |
|-------|-------|-----|
| `pnpm: command not found` | corepack not enabled | Ensure runner has `corepack enable` |
| `cargo: command not found` | Rust not installed on runner | Install rustup + stable toolchain |
| `error: linker not found` | Missing MSVC Build Tools | Install VS Build Tools C++ workload |
| Frozen lockfile mismatch | `pnpm-lock.yaml` outdated | Run `pnpm install` locally, commit lockfile |
| Tauri build fail | Missing WebView2 | Install WebView2 Evergreen Runtime on runner |

---

## Release Workflow

### 1. Pre-release Checklist

```bash
pnpm lint          # 0 errors
pnpm type-check    # 0 errors
pnpm test --run    # all pass
```

### 2. Create Tag + Push

```bash
git tag -a v0.X.Y -m "Release v0.X.Y — description"
git push origin v0.X.Y
```

### 3. Create GitLab Release

```bash
TOKEN=$(grep "access token" gitlab-authen.txt | cut -d: -f2 | tr -d ' ')
PID=296

curl -s -X POST \
  --header "PRIVATE-TOKEN: $TOKEN" \
  --header "Content-Type: application/json" \
  "https://gitlabs.inet.vn/api/v4/projects/$PID/releases" \
  -d '{
    "tag_name": "v0.X.Y",
    "name": "v0.X.Y - Release Title",
    "description": "Release notes here"
  }'
```

### 4. Monitor Pipeline

```bash
# List recent pipelines
curl -s --header "PRIVATE-TOKEN: $TOKEN" \
  "https://gitlabs.inet.vn/api/v4/projects/$PID/pipelines?ref=v0.X.Y"

# Get pipeline jobs (requires api scope)
curl -s --header "PRIVATE-TOKEN: $TOKEN" \
  "https://gitlabs.inet.vn/api/v4/projects/$PID/pipelines/<PIPELINE_ID>/jobs"

# Read job log
curl -s --header "PRIVATE-TOKEN: $TOKEN" \
  "https://gitlabs.inet.vn/api/v4/projects/$PID/jobs/<JOB_ID>/trace"
```

### 5. Download Artifacts

```bash
# Download build artifacts from latest tag pipeline
curl -s -L --header "PRIVATE-TOKEN: $TOKEN" \
  "https://gitlabs.inet.vn/api/v4/projects/$PID/jobs/<JOB_ID>/artifacts" \
  -o localman-windows.zip
```

---

## Security Rules

1. **NEVER** commit `.env` or `gitlab-authen.txt` to git
2. **NEVER** log tokens in CI output or responses
3. Firebase keys are public (client-side), but still keep in `.env` for flexibility
4. Project Access Tokens are scoped to this project only — no cross-project access
5. Rotate tokens periodically in GitLab Settings → Access Tokens

---

## File Reference

| File | Purpose | Git |
|------|---------|-----|
| `.env` | Firebase config + GitLab credentials | ignored |
| `gitlab-authen.txt` | Project Access Token | ignored |
| `.gitlab-ci.yml` | CI/CD pipeline definition | tracked |
| `src-tauri/tauri.conf.json` | Tauri build config (version, bundler) | tracked |
