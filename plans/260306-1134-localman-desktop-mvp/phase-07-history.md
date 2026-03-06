# Phase 07 — History

## Context
- [requirement.md Section 4.5](../../requirement.md) — History
- Depends on: Phase 02, Phase 04

## Overview
- **Priority:** P2
- **Status:** pending
- **Estimate:** 2 days
- **Description:** Auto-log all sent requests with response metadata, sidebar history tab with filters, re-run from history.

## Key Insights
- History auto-logs on every `executeRequest` — no user action needed
- Store request snapshot (not reference) — so history entry is self-contained even if original request changes
- Limit history entries (default 1000, configurable in settings)
- Group by date in sidebar view
- Response body storage optional (can be large) — store first 100KB, truncate rest

## Requirements

### Functional
- Auto-log every sent request with: method, URL, status, time, size, timestamp
- Sidebar history tab grouped by date (Today, Yesterday, Last 7 days, Older)
- Filter by: method, status code range, URL pattern
- Click history entry -> view request + response snapshot
- Re-run: clone history entry into new request tab
- Clear history (all or by date range)
- History entry stores request snapshot (method, URL, headers, body)

### Non-Functional
- History write < 50ms (non-blocking, don't delay response display)
- Sidebar loads last 100 entries, lazy-load older

## Architecture

### Auto-logging Integration
```
executeRequest() -> response received -> historyService.log({
  request_id, method, url, status_code, response_time, response_size,
  request_snapshot: { method, url, headers, body, auth },
  response_body: truncate(body, 100KB),
  response_headers,
  timestamp: new Date().toISOString()
})
```

### Zustand Store — `history-store.ts`
```typescript
interface HistoryStore {
  entries: HistoryEntry[];
  filters: { method?: HttpMethod; statusRange?: string; urlPattern?: string };

  logEntry: (entry: Omit<HistoryEntry, 'id'>) => Promise<void>;
  loadMore: (offset: number) => Promise<void>;
  clearHistory: () => Promise<void>;
  setFilter: (filters: Partial<HistoryFilters>) => void;
  rerunEntry: (entry: HistoryEntry) => void;
}
```

## Related Code Files

### Create
- `src/stores/history-store.ts` — Zustand store
- `src/components/history/history-sidebar-tab.tsx` — Sidebar history list
- `src/components/history/history-entry-item.tsx` — Single history entry row
- `src/components/history/history-filters.tsx` — Filter controls
- `src/components/history/history-date-group.tsx` — Date group header

### Modify
- `src/stores/response-store.ts` — Add auto-log after response
- `src/components/collections/sidebar-tabs.tsx` — Wire history tab

## Implementation Steps

1. **Create history Zustand store**
   - Log action (write to DB, prepend to state)
   - Load with pagination (100 entries at a time)
   - Filter actions (method, status, URL)
   - Clear action with confirmation
   - Rerun action (open request snapshot in new tab)

2. **Integrate auto-logging**
   - In `response-store.executeRequest()`, after response: call `historyStore.logEntry()`
   - Fire-and-forget (don't await, don't block UI)
   - Truncate response body to 100KB

3. **Build history sidebar tab**
   - Group entries by date (Today, Yesterday, Last 7 days, Older)
   - Each entry shows: method badge, URL (truncated), status badge, time ago
   - Click -> open in response viewer (read-only mode)
   - Infinite scroll for older entries

4. **Build history filters**
   - Method dropdown (multi-select)
   - Status range: 2xx, 3xx, 4xx, 5xx checkboxes
   - URL search input (debounced)

5. **History management**
   - Clear All button (with confirmation dialog)
   - Auto-prune: delete entries older than setting (default: keep last 1000)

## Todo List
- [ ] Create history Zustand store
- [ ] Integrate auto-logging into response store
- [ ] Build history sidebar tab (grouped by date)
- [ ] Build history entry item component
- [ ] Build history filter controls
- [ ] Implement re-run from history
- [ ] Implement clear history
- [ ] Auto-prune old entries

## Success Criteria
- Every sent request auto-logged
- History sidebar shows entries grouped by date
- Filters work (method, status, URL)
- Re-run opens request in new tab
- Performance: logging doesn't delay response display

## Risk Assessment
- Large history (10K+ entries) — paginate, index `timestamp` in Dexie
- Response body storage bloat — truncate to 100KB, offer "don't store bodies" setting

## Next Steps
- Phase 08: Import/Export
