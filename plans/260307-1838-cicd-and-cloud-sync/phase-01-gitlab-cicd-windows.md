# Phase 01 — GitLab CI/CD (Windows)

## Context
- [plan.md](plan.md) — overview
- [workflow-agent-execution-protocol.md](../260306-1134-localman-desktop-mvp/workflow-agent-execution-protocol.md) — execution conventions
- GitLab: `https://gitlabs.inet.vn/dattqh/localman` (Project ID: 296)

## Overview
- **Priority:** P1
- **Status:** pending
- **Estimate:** 1 day
- **Description:** Set up `.gitlab-ci.yml` for automated lint+test on every push, and Windows Tauri `.msi` build on git tags.

---

## Architecture

### Pipeline Stages

```
push to main / MR:
  stage: verify
    job: lint-and-test     (windows-latest runner)
      → pnpm install
      → pnpm lint
      → pnpm type-check
      → pnpm test --run

push tag v*:
  stage: verify (same as above)
  stage: build
    job: build-windows     (windows-latest runner)
      → pnpm install
      → pnpm tauri build
      → upload artifact: src-tauri/target/release/bundle/msi/*.msi
      → upload artifact: src-tauri/target/release/bundle/nsis/*.exe
```

### Cache Strategy
- Cache `node_modules/` by `pnpm-lock.yaml` hash
- Cache Cargo registry + target by `Cargo.lock` hash
- Separate caches for `verify` and `build` jobs (different sizes)

---

## Related Code Files

### Create
- `.gitlab-ci.yml` — CI pipeline definition (root of repo)

### No modifications needed to existing code

---

## Implementation Steps

### 1. Check available GitLab runners

Before writing CI, verify the runner tags available on `gitlabs.inet.vn`:
- Check at: `https://gitlabs.inet.vn/dattqh/localman/-/settings/ci_cd` → Runners section
- Note the runner tags (e.g., `windows`, `shared`, `localman`) — use the correct tag in `tags:` field

### 2. Write `.gitlab-ci.yml`

```yaml
# .gitlab-ci.yml
stages:
  - verify
  - build

variables:
  CARGO_HOME: "$CI_PROJECT_DIR/.cargo"
  # pnpm cache dir (Windows path)
  PNPM_HOME: "$CI_PROJECT_DIR/.pnpm-store"

# Cache node_modules per pnpm-lock.yaml
.node-cache: &node-cache
  cache:
    key:
      files:
        - pnpm-lock.yaml
    paths:
      - node_modules/
      - .pnpm-store/

# Cache Cargo per Cargo.lock
.cargo-cache: &cargo-cache
  cache:
    key:
      files:
        - src-tauri/Cargo.lock
    paths:
      - .cargo/registry/
      - src-tauri/target/

lint-and-test:
  stage: verify
  tags:
    - windows          # REPLACE with actual runner tag
  <<: *node-cache
  script:
    - corepack enable
    - pnpm install --frozen-lockfile
    - pnpm lint
    - pnpm type-check
    - pnpm test --run
  rules:
    - if: '$CI_PIPELINE_SOURCE == "push"'
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'

build-windows:
  stage: build
  tags:
    - windows          # REPLACE with actual runner tag
  cache:
    - key:
        files:
          - pnpm-lock.yaml
      paths:
        - node_modules/
        - .pnpm-store/
    - key:
        files:
          - src-tauri/Cargo.lock
      paths:
        - .cargo/registry/
        - src-tauri/target/
  script:
    - corepack enable
    - pnpm install --frozen-lockfile
    - pnpm tauri build
  artifacts:
    name: "localman-windows-$CI_COMMIT_TAG"
    paths:
      - src-tauri/target/release/bundle/msi/*.msi
      - src-tauri/target/release/bundle/nsis/*.exe
    expire_in: 90 days
  rules:
    - if: '$CI_COMMIT_TAG =~ /^v/'
```

**IMPORTANT:** Replace `windows` in `tags:` with the actual runner tag from Step 1.

### 3. Check `pnpm type-check` script exists

Verify `package.json` has a `type-check` script:
```bash
cat package.json | grep type-check
```
If missing, add to `package.json`:
```json
"type-check": "tsc --noEmit"
```

### 4. Verify Tauri build prerequisites on runner

If the Windows runner doesn't have Rust/WebView2 pre-installed, add setup steps:
```yaml
before_script:
  - rustup update stable
  - rustup default stable
```
Only add this if the runner needs it — check runner environment first.

### 5. Commit and push

```bash
git add .gitlab-ci.yml package.json
git commit -m "chore(ci): add GitLab CI pipeline for Windows lint/test/build"
git push origin main
```

### 6. Verify pipeline runs

- Go to: `https://gitlabs.inet.vn/dattqh/localman/-/pipelines`
- Confirm `lint-and-test` job passes
- If it fails: read job log, fix, commit `fix(ci): <description>`, push

### 7. Test tag-based build trigger

```bash
git tag v0.1.0-test
git push origin v0.1.0-test
```
- Verify `build-windows` job runs and produces `.msi`/`.exe` artifacts
- Download and test the artifact locally
- Delete test tag if desired: `git tag -d v0.1.0-test && git push origin :refs/tags/v0.1.0-test`

---

## Todo List

- [ ] Check available runner tags in GitLab settings
- [ ] Verify `pnpm type-check` script in `package.json`
- [ ] Write `.gitlab-ci.yml` with correct runner tag
- [ ] Commit and push
- [ ] Verify `lint-and-test` pipeline passes
- [ ] Test tag trigger → confirm `.msi`/`.exe` artifact produced
- [ ] Update plan.md phase status to `completed`

---

## Success Criteria

- Every push to `main` triggers lint + test pipeline and passes
- `git push tag v*` triggers Windows build, produces downloadable `.msi` artifact
- Pipeline runs without manual intervention
- No CI-specific hacks (no `--no-verify`, no skipped tests)

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Runner tag unknown | Check Settings → Runners before writing YAML |
| Rust not on runner | Add `rustup update stable` to `before_script` if needed |
| WebView2 missing on runner | May need to install or use a pre-configured runner image |
| pnpm not on runner | Use `corepack enable && corepack prepare pnpm@latest --activate` |
| Cargo cache too large | Set `cache: when: always` and use `expire_in: 1 week` |

---

## Next Steps

After this phase: implement Phase 02 (Cloud Sync) — see `phase-11-cloud-sync.md` in existing plan.
