# Documentation

Key project documentation:

| Doc | Description |
|-----|--------------|
| [development-roadmap.md](./development-roadmap.md) | Phase overview (00–11), completion status, upcoming features. |
| [codebase-summary.md](./codebase-summary.md) | Directory structure, key modules, architecture patterns, data flow. |
| [project-changelog.md](./project-changelog.md) | Detailed changelog by phase with features, files created/modified. |
| [cross-platform-testing.md](./cross-platform-testing.md) | Manual testing checklist for Windows, macOS, and Linux builds; includes performance checks. |
| [workflow-guide.md](./workflow-guide.md) | Development workflow, architecture, release process, and keyboard shortcuts. |

**CI:** GitHub Actions workflows run on every push (lint, type-check, tests) and on tags `v*` (Windows `.msi`/`.exe` build). Configuration: [GitHub Actions workflow files](.github/workflows/).
