# Code Review: Phase 3 — WebSocket Real-Time

**Date:** 2026-03-12
**Reviewer:** code-reviewer
**Scope:** 10 files, ~700 LOC (5 backend ws/, 2 frontend sync/, 1 store, 2 modified)

---

## Overall Assessment

Solid architecture with clean separation: auth, channels, presence, routing, and server setup are well-isolated. Reconnection logic on the client is correct with exponential backoff. However, there are **critical security gaps** (no rate limiting, no message size limits, no channel name validation) and several **high-priority correctness bugs** (stale listener leak, reconnect event logic, entity type mismatch).

---

## Critical Issues

### C1. Token in WebSocket URL Query Parameter (Security)
**File:** `backend/src/ws/ws-auth.ts:25`, `src/services/sync/websocket-manager.ts:120`

Token is passed via `?token=` query param. This is logged in server access logs, proxy logs, browser history, and any intermediary. Standard WS auth pattern.

**Mitigation:** Accept this as a known tradeoff (WS has no header support on upgrade from browser). Ensure:
- Server access logs are scrubbed or do not log query params for `/ws` path
- Tokens are short-lived (verify JWT expiry is < 15min)
- Add a comment documenting the security tradeoff

### C2. No Message Size Limit (DoS Vector)
**File:** `backend/src/ws/websocket-server.ts:19`

`WebSocketServer` is created with default config — no `maxPayload`. A malicious client can send arbitrarily large messages to exhaust server memory.

**Fix:**
```ts
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 }); // 64KB
```

### C3. No Per-Connection Rate Limiting (DoS Vector)
**File:** `backend/src/ws/message-router.ts`

No rate limiting on incoming messages. A single client can flood the server with subscribe/entity/presence messages, causing DB query spam (RBAC checks in `subscribe()`) and broadcast storms.

**Fix:** Add a simple sliding-window counter per client:
```ts
// In channel-manager.ts WsClient interface, add:
messageCount: number;
windowStart: number;
// In routeMessage(), check: if (client.messageCount > 100 per 10s) → close connection
```

### C4. No Channel Name Validation / Injection (Security)
**File:** `backend/src/ws/channel-manager.ts:46-66`

Channel names are accepted as-is. Only `workspace:` and `user:` prefixes are checked for RBAC but any arbitrary string (e.g., `admin:`, `internal:`, empty string) is accepted and creates a channel. This allows:
- Memory pollution with unlimited channel creation
- Potential cross-channel data leakage if new prefixes are added later

**Fix:** Whitelist channel format:
```ts
const VALID_CHANNEL = /^(workspace|user):[a-zA-Z0-9_-]+$/;
if (!VALID_CHANNEL.test(channel)) return false;
```

---

## High Priority

### H1. `onStateChange` Listener Leak (Memory Leak)
**File:** `src/stores/sync-store.ts:74`

`connectWs()` calls `wsManager.onStateChange()` every time it's invoked (login, loadConfig, register) but never stores or cleans up the returned unsubscribe function. After repeated login/logout cycles, stale listeners accumulate.

**Fix:** Store the cleanup fn and call it in `connectWs()` before adding a new one, or in `logout()`:
```ts
let wsStateCleanup: (() => void) | null = null;

function connectWs(config: CloudSyncConfig): void {
  wsStateCleanup?.();
  // ...
  wsStateCleanup = wsManager.onStateChange((wsState) => {
    useSyncStore.setState({ wsState });
  });
}
```

### H2. Reconnect Event Never Fires "reconnected" (Bug)
**File:** `src/services/sync/websocket-manager.ts:125-137`

In `onopen`, `reconnectAttempt` is reset to 0 on line 126 **before** the check on line 133. So `this.reconnectAttempt === 0` is **always true**, meaning `"reconnected"` is never emitted and `"connected"` fires every time. State reconciliation in `ws-event-handler.ts:87` relies on `"reconnected"` and will never trigger.

**Fix:**
```ts
this.ws.onopen = () => {
  const wasReconnect = this.reconnectAttempt > 0;
  this.reconnectAttempt = 0;
  this.setState("connected");
  for (const channel of this.subscribedChannels) {
    this.send({ type: "subscribe", channel });
  }
  this.emit(wasReconnect ? "reconnected" : "connected", {});
};
```

### H3. Entity Type Mismatch: Server Sends vs Client Listens
**File:** `backend/src/ws/message-router.ts:47-49` vs `src/services/sync/ws-event-handler.ts:29,50,68`

Server broadcasts types: `entity:update`, `entity:create`, `entity:delete`
Client listens for: `entity:updated`, `entity:created`, `entity:deleted`

These don't match. Client will never receive entity mutations via WS.

**Fix:** Align naming. Either change server to past tense or client to present tense. Recommend server sends past-tense (event already happened):
```ts
// message-router.ts line 123-124
const serverMsg = {
  type: type === "entity:update" ? "entity:updated"
      : type === "entity:create" ? "entity:created"
      : "entity:deleted",
  ...
};
```

### H4. Entity Mutation Bypass — No Server-Side RBAC on WS Broadcast
**File:** `backend/src/ws/message-router.ts:102-142`

`handleEntityMutation` only checks `client.channels.has(channel)` (subscription check) but does NOT verify the user's **role** allows mutations. A `viewer` role member subscribed to a workspace channel can broadcast fake entity:create/update/delete events to all other clients.

**Fix:** Either:
1. (Preferred) Remove entity mutation from WS entirely — let HTTP API handle mutations and have the HTTP route trigger WS broadcast server-side
2. Or add role check: query `workspaceMembers` for `role !== 'viewer'` before broadcasting

### H5. No Max Subscriptions Per Client
**File:** `backend/src/ws/channel-manager.ts`

A client can subscribe to unlimited channels. Combined with C4, this is a memory exhaustion vector.

**Fix:** Cap at a reasonable limit (e.g., 50 channels per client).

---

## Medium Priority

### M1. Module-Level Mutable State (Testability)
**Files:** `channel-manager.ts:20-23`, `presence-tracker.ts:17`

`channels`, `clientMap`, `presenceMap` are module-level `Map`s. This makes unit testing difficult (no way to reset state) and prevents running multiple server instances.

**Recommendation:** Wrap in a factory function or class for testability. Not urgent but limits test coverage.

### M2. No Validation on `msg.changes` / `msg.data` Passthrough
**File:** `backend/src/ws/message-router.ts:132,135`

`msg.changes` and `msg.data` are passed directly to broadcast without any sanitization or schema validation. Combined with H4, a malicious client could broadcast arbitrary data to all workspace members.

**Note:** HTTP entity-sync-routes has `sanitizeData()` — WS path bypasses it entirely.

### M3. Presence Cleanup Race Condition
**File:** `backend/src/ws/presence-tracker.ts:82-97`

`cleanupStalePresence()` iterates and deletes from the same `Map` during iteration. While JS Maps support deletion during `for...of`, the broadcast inside the loop could trigger re-entrant modifications if a handler calls `updatePresence`. Low probability but worth noting.

### M4. `lastEventTime` Is Module-Level Singleton
**File:** `src/services/sync/ws-event-handler.ts:15`

If the user switches accounts without page reload, `lastEventTime` persists from the previous session. Reconciliation on reconnect could pull stale data from a different user's timeline.

**Fix:** Reset `lastEventTime = null` in `disposeWsEventHandlers()`.

### M5. Presence Store Uses Non-Serializable `Map`
**File:** `src/stores/presence-store.ts:19`

Zustand's default equality check and devtools don't handle `Map` well. State changes may not trigger re-renders in some edge cases. Consider using a plain object `Record<string, Record<string, UserPresence>>` instead.

---

## Low Priority

### L1. Dead Code in `message-router.ts:124`
```ts
type: type.replace("entity:", "entity:") , // keep same type
```
This replace is a no-op. Remove and use `type` directly.

### L2. Heartbeat Interval Not Cleared on Error
**File:** `backend/src/ws/websocket-server.ts:55-58`

The `error` handler calls `cleanup()` but the heartbeat interval in `setupHeartbeat` only clears on `close`. Since `close` fires after `error`, this is fine in practice, but the error handler should not call `cleanup()` directly — let `close` handle it to avoid double cleanup.

### L3. Missing TypeScript Strict Types
**File:** `backend/src/ws/message-router.ts`

Heavy use of `Record<string, unknown>` with `as string` casts. Consider defining message schemas (Zod or TypeScript discriminated unions) for type safety and implicit validation.

---

## Positive Observations

1. **Clean separation of concerns** — auth, channels, presence, routing, server are well-isolated modules under 130 lines each
2. **Proper cleanup on disconnect** — `cleanup()` removes from all channels, `removeUserPresence()` broadcasts offline status
3. **Exponential backoff** with capped delays in client reconnection
4. **Intentional close flag** prevents reconnection on explicit logout
5. **Stale presence cleanup** with 60s interval catches zombie connections
6. **Re-subscription on reconnect** preserves channel state across reconnections

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Fix H3 (entity type mismatch) — WS events are completely broken without this
2. **[CRITICAL]** Fix H2 (reconnect event bug) — state reconciliation is dead code currently
3. **[CRITICAL]** Add C2 (maxPayload) and C4 (channel validation) — 2-line fixes each
4. **[HIGH]** Fix H1 (listener leak) — causes degradation over time
5. **[HIGH]** Address H4 (RBAC on mutations) — security hole allowing viewers to broadcast fake events
6. **[HIGH]** Add C3 (rate limiting) — even a simple counter prevents abuse
7. **[MEDIUM]** Fix M4 (reset lastEventTime) — 1-line fix, prevents cross-account data bleed
8. **[MEDIUM]** Address M2 (validate WS message payloads) — reuse existing sanitizeData

---

## Metrics

| Metric | Value |
|--------|-------|
| Files reviewed | 10 |
| LOC | ~700 |
| Critical issues | 4 |
| High issues | 5 |
| Medium issues | 5 |
| Low issues | 3 |
| Test coverage | 0% (no WS tests found) |

---

## Unresolved Questions

1. Is the JWT token used for WS auth short-lived? If it's the same long-lived token from IndexedDB, token rotation on WS connections needs to be addressed (connection could outlive token expiry).
2. Should entity mutations go through WS at all, or should the HTTP API trigger server-side WS broadcasts? The latter is more secure and consistent with the "dumb JSON store" pattern noted in sync architecture.
3. Are server access logs configured to exclude query params on the `/ws` path?
