# Phase 3: WebSocket Real-Time Server + Client

## Context

- [Phase 1](./phase-01-backend-entity-storage-workspace.md) — entity storage + workspace RBAC
- [Phase 2](./phase-02-client-sync-engine-refactor.md) — entity sync engine
- [Backend app.ts](../../backend/src/app.ts) — current Hono setup
- [Backend package.json](../../backend/package.json) — current deps

## Overview

- **Priority:** P1
- **Status:** ✅ Complete
- **Effort:** 16h
- **Description:** Add WebSocket server to backend for real-time entity change broadcast per workspace. Build client WebSocket manager with auto-reconnection. Add presence tracking.

## Key Insights

- Hono has `hono/websocket` helper but it's limited on `@hono/node-server` — native Node `ws` library is more reliable
- Approach: run `ws` WebSocket server on same HTTP server (upgrade handler) — single port
- Channel model: one channel per workspace, users subscribe after auth
- Personal synced collections: user subscribes to a personal channel `user:{userId}`
- Start single-server with in-memory `Map<channel, Set<ws>>`; add Redis pub/sub when horizontal scaling needed
<!-- Updated: Validation — in-memory first, no Redis -->

## Requirements

### Functional
- F1: WebSocket server on same port as HTTP (upgrade handler)
- F2: Auth on WS connect — validate JWT token from query param or first message
- F3: Channel subscription per workspace + personal channel
- F4: Broadcast entity changes to all workspace members (except sender)
- F5: Presence tracking — who's online, who's editing which entity
- F6: Client auto-reconnection with exponential backoff
- F7: State reconciliation after reconnect (fetch changes missed during disconnect)

### Non-Functional
- NF1: <100ms broadcast latency (same server)
- NF2: Graceful handling of connection drops
- NF3: Memory-efficient — clean up channels when workspace has no connections
- NF4: Max 1000 concurrent connections per server (sufficient for MVP)

## Architecture

### Server-Side WebSocket

```
HTTP Server (Hono + @hono/node-server)
  │
  ├── HTTP routes (existing)
  │
  └── Upgrade handler → ws.WebSocketServer
        │
        ├── Auth: validate token from ?token=XXX query
        │
        ├── Channel Manager
        │   ├── workspace:{wsId} → Set<WebSocket>
        │   ├── user:{userId} → Set<WebSocket> (personal sync)
        │   └── cleanup on disconnect
        │
        ├── Message Router
        │   ├── subscribe/unsubscribe channels
        │   ├── entity:update → validate + broadcast
        │   ├── entity:create → validate + broadcast
        │   ├── entity:delete → validate + broadcast
        │   └── presence → broadcast to channel
        │
        └── Heartbeat (ping/pong every 30s)
```

### Client-Side WebSocket Manager

```
WebSocket Manager (singleton)
  │
  ├── Connection lifecycle
  │   ├── connect(serverUrl, token)
  │   ├── disconnect()
  │   └── reconnect (exponential backoff: 1s, 2s, 4s, 8s, max 30s)
  │
  ├── Channel management
  │   ├── subscribe(workspaceId)
  │   ├── unsubscribe(workspaceId)
  │   └── subscribePersonal()
  │
  ├── Event handlers
  │   ├── onEntityUpdated → apply to Dexie + update Zustand
  │   ├── onEntityCreated → insert into Dexie + update Zustand
  │   ├── onEntityDeleted → soft delete in Dexie + update Zustand
  │   ├── onPresence → update presence store
  │   └── onConflict → queue for Phase 4 resolution
  │
  └── State reconciliation
      └── onReconnect → GET /api/sync/changes?since=lastEventTime
```

### WebSocket Protocol Messages

```typescript
// Client → Server
type ClientMessage =
  | { type: 'subscribe'; channel: string }
  | { type: 'unsubscribe'; channel: string }
  | { type: 'entity:update'; entity_type: string; entity_id: string;
      base_version: number; changes: Record<string, unknown> }
  | { type: 'entity:create'; entity_type: string; data: Record<string, unknown>;
      parent_id?: string; collection_id?: string }
  | { type: 'entity:delete'; entity_type: string; entity_id: string }
  | { type: 'presence'; status: 'active' | 'editing' | 'idle';
      entity_id?: string; workspace_id: string }
  | { type: 'pong' }

// Server → Client
type ServerMessage =
  | { type: 'entity:updated'; entity_type: string; entity_id: string;
      version: number; changes: Record<string, unknown>; user_id: string }
  | { type: 'entity:created'; entity_type: string; entity: Record<string, unknown>;
      user_id: string }
  | { type: 'entity:deleted'; entity_type: string; entity_id: string;
      user_id: string }
  | { type: 'conflict'; entity_type: string; entity_id: string;
      server_version: number; server_data: Record<string, unknown> }
  | { type: 'presence'; user_id: string; user_name: string;
      status: string; entity_id?: string; workspace_id: string }
  | { type: 'error'; code: string; message: string }
  | { type: 'subscribed'; channel: string }
  | { type: 'ping' }
```

## Related Code Files

### Files to Create (Backend)
- `backend/src/ws/websocket-server.ts` — WebSocket server setup + upgrade handler
- `backend/src/ws/channel-manager.ts` — per-workspace channel management
- `backend/src/ws/message-router.ts` — message type routing + validation
- `backend/src/ws/presence-tracker.ts` — who's online/editing in each workspace
- `backend/src/ws/ws-auth.ts` — WebSocket connection authentication

### Files to Create (Frontend)
- `src/services/sync/websocket-manager.ts` — WS connection lifecycle + reconnection
- `src/services/sync/ws-event-handler.ts` — process incoming WS messages → Dexie + Zustand
- `src/stores/presence-store.ts` — Zustand store for online users + editing status

### Files to Modify
- `backend/src/index.ts` — pass HTTP server to WS setup
- `backend/package.json` — add `ws` dependency
- `src/stores/sync-store.ts` — integrate WebSocket manager (connect on login, disconnect on logout)
- `src/services/sync/entity-sync-service.ts` — hook into WS events for real-time sync

## Implementation Steps

### Backend

1. **Install `ws` package**
   ```bash
   cd backend && pnpm add ws && pnpm add -D @types/ws
   ```

2. **Create `ws-auth.ts`**
   - Extract token from `?token=` query param on upgrade request
   - Validate token via Better Auth session lookup
   - Return user object or reject connection

3. **Create `channel-manager.ts`**
   - `Map<string, Set<WebSocket>>` — channel → connections
   - `subscribe(ws, channel)` — add to set, check RBAC (is user member of workspace?)
   - `unsubscribe(ws, channel)` — remove from set
   - `broadcast(channel, message, excludeWs?)` — send to all in channel except sender
   - `cleanup(ws)` — remove from all channels on disconnect
   - Lazy cleanup: delete channel when set is empty

4. **Create `presence-tracker.ts`**
   - Track: `{ userId, userName, status, entityId?, lastSeen }`
   - On presence message: update tracker, broadcast to channel
   - On disconnect: remove user from all channels, broadcast leave
   - Periodic cleanup of stale entries (>60s no heartbeat)

5. **Create `message-router.ts`**
   - Parse incoming JSON message
   - Route by `type` field to appropriate handler
   - For entity mutations: validate RBAC, apply to DB, broadcast result
   - For subscribe/unsubscribe: delegate to channel manager
   - For presence: delegate to presence tracker
   - Error handling: send error message back to sender

6. **Create `websocket-server.ts`**
   - Create `ws.WebSocketServer({ noServer: true })`
   - Handle HTTP upgrade event from Node server
   - Auth check → accept or reject upgrade
   - Wire up message/close/error handlers
   - Heartbeat: ping every 30s, terminate if no pong in 10s

7. **Update `backend/src/index.ts`**
   - Get HTTP server instance from `@hono/node-server`
   - Pass to `setupWebSocket(server)` after Hono app created
   - ```typescript
     import { serve } from '@hono/node-server';
     const server = serve({ fetch: app.fetch, port: env.PORT });
     setupWebSocket(server);
     ```

### Frontend

8. **Create `websocket-manager.ts`**
   - Singleton class `WebSocketManager`
   - `connect(serverUrl, token)` — open WS with token in query
   - `disconnect()` — clean close
   - `send(message)` — JSON stringify + send
   - `subscribe(channel)` / `unsubscribe(channel)`
   - Auto-reconnect: exponential backoff (1s → 2s → 4s → 8s → max 30s)
   - On reconnect: re-subscribe all channels, trigger state reconciliation
   - Heartbeat: respond to ping with pong
   - Event emitter pattern for incoming messages

9. **Create `ws-event-handler.ts`**
   - Listen to WebSocket manager events
   - `entity:updated` → update entity in Dexie, trigger Zustand store refresh
   - `entity:created` → insert into Dexie, refresh store
   - `entity:deleted` → soft delete in Dexie, refresh store
   - `conflict` → store in conflict queue (Phase 4 handles resolution)
   - `presence` → update presence store
   - On reconnect: call `entitySyncService.pullChanges(since=lastEventTime)`

10. **Create `presence-store.ts`**
    - Zustand store: `Map<workspaceId, UserPresence[]>`
    - `UserPresence: { userId, userName, status, entityId?, lastSeen }`
    - Actions: `updatePresence`, `removeUser`, `getWorkspacePresence`
    - Send own presence on entity focus/blur

11. **Integrate into sync-store.ts**
    - On login success: `wsManager.connect(serverUrl, token)`
    - On logout: `wsManager.disconnect()`
    - On workspace change: subscribe/unsubscribe channels
    - Expose `isConnected` state from WS manager

12. **Hook entity sync service**
    - When WS connected: entity mutations send via WS instead of HTTP push
    - Fallback to HTTP if WS disconnected (offline mode)
    - On WS reconnect: reconcile state via HTTP delta sync

## Todo List

- [x] Install `ws` + `@types/ws` in backend
- [x] Implement `ws-auth.ts` — token validation on upgrade
- [x] Implement `channel-manager.ts` — subscribe/unsubscribe/broadcast
- [x] Implement `presence-tracker.ts` — online/editing tracking
- [x] Implement `message-router.ts` — message type routing
- [x] Implement `websocket-server.ts` — server setup + heartbeat
- [x] Update `backend/src/index.ts` — wire WS to HTTP server
- [x] Implement `websocket-manager.ts` — client connection + reconnection
- [x] Implement `ws-event-handler.ts` — apply incoming events to Dexie/Zustand
- [x] Create `presence-store.ts` — Zustand presence tracking
- [x] Integrate WS into `sync-store.ts` — connect on login, disconnect on logout
- [x] Hook entity sync service to use WS for mutations when connected
- [x] Test: connect, subscribe workspace, broadcast entity change
- [x] Test: disconnect, reconnect, state reconciliation
- [x] Test: presence — editing indicator, online status
- [x] Test: heartbeat keeps connection alive

## Success Criteria

- WS server starts on same port as HTTP
- Auth required — unauthenticated upgrade requests rejected
- Entity changes broadcast to workspace members within 100ms
- Client auto-reconnects after disconnect (exponential backoff)
- State reconciliation after reconnect — no missed changes
- Presence shows online users and who's editing what
- Graceful degradation: app works normally if WS unavailable (falls back to HTTP sync)

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| `ws` upgrade conflicts with Hono | Medium | Use `noServer: true` mode, handle upgrade manually |
| Memory leak from abandoned connections | Medium | Heartbeat + timeout terminates dead connections |
| Message ordering issues | Low | Single-server = ordered; add sequence numbers if needed |
| Token expiry during long WS session | Medium | Re-auth on 401 error message, reconnect with new token |

## Security Considerations

- WS auth: validate token on every connection upgrade
- Channel subscription: verify workspace membership before allowing subscribe
- Rate limit incoming messages per connection (prevent flooding)
- Sanitize all incoming message data before broadcast
- Don't include sensitive env variables in broadcast messages

## Next Steps

- Phase 4: conflict messages from WS trigger merge UI
- Phase 5: presence avatars in UI use presence-store
