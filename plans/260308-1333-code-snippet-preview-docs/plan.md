---
title: "Code Snippet, Preview & API Docs"
description: "Add code snippet generation (15+ langs), request preview via cURL, API docs with inline editor + viewer + export"
status: complete
priority: P2
effort: 16h
branch: main
tags: [feature, frontend, dx]
created: 2026-03-08
completed: 2026-03-08
---

# Phase 11 — Code Snippet, Preview & API Docs

## Overview

Add 3 DX features inspired by Postman:
1. **Code Snippet** — generate request as cURL, JS, Python, etc. (16 languages)
2. **Request Preview** — merged into Code Snippet (cURL = natural preview)
3. **API Docs** — description fields, docs viewer, HTML/Markdown export

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Snippet generator engine + core languages | Complete | 4h | [phase-01](./phase-01-snippet-engine-core-generators.md) |
| 2 | Additional language generators | Complete | 3h | [phase-02-additional-snippet-generators.md](./phase-02-additional-snippet-generators.md) |
| 3 | Code Snippet UI panel | Complete | 3h | [phase-03](./phase-03-snippet-ui-panel.md) |
| 4 | API Docs — data model + description editor | Complete | 3h | [phase-04](./phase-04-docs-model-description-editor.md) |
| 5 | API Docs — viewer + export | Complete | 3h | [phase-05](./phase-05-docs-viewer-export.md) |

## Dependencies

- Phase 1 → Phase 2 (engine must exist before more generators)
- Phase 1 → Phase 3 (UI needs generators)
- Phase 4 → Phase 5 (viewer needs description data)
- Phase 2 & Phase 4 can run in parallel after Phase 1

## Key Architecture

```
PreparedRequest → snippetGenerator(prepared, lang) → string
```

- Plugin pattern: each language = 1 generator file
- Reuse existing `prepareRequest()` with `InterpolationContext`
- UI: Sidebar panel toggle via `</>` icon button
- Docs: `description` field on `ApiRequest` + `Collection` (Collection already has it)

## Brainstorm Report

[brainstorm-260308-1333-code-snippet-preview-docs.md](../reports/brainstorm-260308-1333-code-snippet-preview-docs.md)
