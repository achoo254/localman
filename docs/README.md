# Documentation

Key project documentation:

| Doc | Description |
|-----|--------------|
| [cross-platform-testing.md](./cross-platform-testing.md) | Manual testing checklist for Windows, macOS, and Linux builds; includes performance checks. |
| [gitlab-workflow-guide.md](./gitlab-workflow-guide.md) | GitLab workflow (curl API patterns, issue/milestone usage). |

**CI:** Pipelines run on GitLab (gitlabs.inet.vn): lint and tests on every push; Windows `.msi`/`.exe` build on tags `v*`. Full pipeline definition and details: [Phase 01 — GitLab CI/CD (Windows)](../plans/260307-1838-cicd-and-cloud-sync/phase-01-gitlab-cicd-windows.md).
