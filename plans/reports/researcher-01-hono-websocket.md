# Research Report: WebSocket Real-Time Collaboration with Hono v4

**Date:** 2026-03-10
**Topic:** WebSocket implementation for team collaboration in Localman API client
**Framework:** Hono v4 + @hono/node-server (Node.js 18+)

---

## Summary

**Recommendation:** Use **@hono/node-ws** (Hono's native adapter) + custom channel management layer for MVP; migrate to Redis Pub/Sub when scaling to multi-server.

Hono's WebSocket support is production-ready but requires separate npm package. The architecture is simpler than running a separate ws server and shares the same HTTP port via HTTP upgrade protocol.

---

## 1. Hono WebSocket Support Analysis

### Native Support Status
- **Hono Core:** Provides `upgradeWebSocket()` helper function (web-standard API)
- **Node.js Adapter:** `@hono/node-ws` package required (separate from @hono/node-server)
- **Maturity:** Production-ready; same API across Cloudflare Workers, Deno, Bun, Node.js
- **Limitation:** No built-in room/channel management; must implement manually

### Installation
```bash
npm install @hono/node-ws
```

### Basic Setup (Node.js)
```typescript
import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'
import { Hono } from 'hono'

const app = new Hono()

// Create WebSocket handler
app.get('/ws', upgradeWebSocket((c) => ({
  onOpen: async (_, ws) => {
    ws.send(JSON.stringify({ type: 'connected', id: Date.now() }))
  },
  onMessage: async (event, ws) => {
    const data = JSON.parse(event.data)
    console.log('Received:', data)
    ws.send(JSON.stringify({ type: 'echo', data }))
  },
  onClose: () => {
    console.log('Client disconnected')
  },
  onError: (_, ws) => {
    console.error('WebSocket error')
  }
})))

// Inject WebSocket support into Node.js server
const nodeWebSocket = createNodeWebSocket()
const server = serve({
  fetch: app.fetch,
  port: 3001,
}, (info) => {
  console.log(`Server running on port ${info.port}`)
})

nodeWebSocket.injectWebSocket(server)
```

### Key Limitations
- No native room/channel broadcast (Socket.IO equivalent)
- No built-in state recovery after disconnect
- Scaling to multiple servers requires external message broker (Redis)

---

## 2. Channel & Room Management Pattern

### Recommended Architecture: In-Memory Registry (Single Server) + Redis (Multi-Server)

#### MVP Implementation (Single Server)
```typescript
import { WebSocketHelper } from 'hono/helper/websocket'

// Track connections per room/workspace
const rooms = new Map<string, Set<WebSocket>>()
const clientRoom = new Map<WebSocket, string>()

app.get('/ws/:workspaceId', upgradeWebSocket((c) => {
  const workspaceId = c.req.param('workspaceId')

  return {
    onOpen: async (_, ws) => {
      // Join room
      if (!rooms.has(workspaceId)) {
        rooms.set(workspaceId, new Set())
      }
      rooms.get(workspaceId)!.add(ws)
      clientRoom.set(ws, workspaceId)

      // Notify others
      broadcastToRoom(workspaceId, {
        type: 'user_joined',
        count: rooms.get(workspaceId)!.size
      }, ws) // exclude sender
    },

    onMessage: async (event, ws) => {
      const message = JSON.parse(event.data)
      const room = clientRoom.get(ws)!

      // Broadcast change to all clients in workspace
      broadcastToRoom(room, {
        type: 'collection_updated',
        payload: message
      })
    },

    onClose: () => {
      const room = clientRoom.get(ws)
      if (room) {
        rooms.get(room)?.delete(ws)
        clientRoom.delete(ws)
        broadcastToRoom(room, {
          type: 'user_left',
          count: rooms.get(room)?.size || 0
        })
      }
    }
  }
}))

// Broadcast helper
function broadcastToRoom(
  roomId: string,
  message: any,
  excludeWs?: WebSocket
) {
  const room = rooms.get(roomId)
  if (!room) return

  const payload = JSON.stringify(message)
  room.forEach(ws => {
    if (ws !== excludeWs) {
      ws.send(payload)
    }
  })
}
```

#### Multi-Server Scaling: Add Redis Pub/Sub
```typescript
import Redis from 'ioredis'

const redisPub = new Redis()
const redisSub = new Redis()

// Subscribe to room channels
const activeRooms = new Set<string>()

function subscribeToRoom(roomId: string) {
  if (activeRooms.has(roomId)) return

  const channel = `workspace:${roomId}`
  redisSub.subscribe(channel, (err) => {
    if (!err) activeRooms.add(roomId)
  })
}

// In onMessage handler:
onMessage: async (event, ws) => {
  const message = JSON.parse(event.data)
  const room = clientRoom.get(ws)!

  // Publish to Redis (all servers subscribed will broadcast to local clients)
  await redisPub.publish(`workspace:${room}`, JSON.stringify({
    type: message.type,
    payload: message
  }))

  // Also broadcast locally
  broadcastToRoom(room, message)
}

// Listen for Redis messages
redisSub.on('message', (channel, message) => {
  const roomId = channel.replace('workspace:', '')
  const data = JSON.parse(message)
  broadcastToRoom(roomId, data)
})
```

### Key Insight
For **Localman MVP:** In-memory rooms are sufficient. Single-server design supports concurrent requests via Tauri + browser clients. Add Redis only when scaling to 10K+ concurrent users or multi-region deployment.

---

## 3. Client-Side Reconnection Strategy

### Recommended Pattern: Exponential Backoff + State Queue

```typescript
// Client reconnection with exponential backoff
class RealtimeCollaborationClient {
  private ws: WebSocket | null = null
  private reconnectAttempt = 0
  private maxReconnectAttempts = 10
  private baseDelay = 1000 // 1 second
  private maxDelay = 30000 // 30 seconds
  private pendingMessages: any[] = []
  private connected = false

  connect(workspaceId: string) {
    const wsUrl = `ws://localhost:3001/ws/${workspaceId}`

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.connected = true
        this.reconnectAttempt = 0
        console.log('[WS] Connected')

        // Flush pending messages
        this.flushPending()
      }

      this.ws.onmessage = (event) => {
        this.handleServerMessage(event.data)
      }

      this.ws.onerror = () => {
        console.error('[WS] Error')
      }

      this.ws.onclose = () => {
        this.connected = false
        this.scheduleReconnect(workspaceId)
      }
    } catch (error) {
      console.error('[WS] Connection failed:', error)
      this.scheduleReconnect(workspaceId)
    }
  }

  private scheduleReconnect(workspaceId: string) {
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      console.warn('[WS] Max reconnection attempts reached')
      return
    }

    // Exponential backoff: base * 2^attempt + jitter
    const jitter = Math.random() * 0.1 * this.baseDelay
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempt) + jitter,
      this.maxDelay
    )

    console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempt + 1})`)
    this.reconnectAttempt++

    setTimeout(() => this.connect(workspaceId), delay)
  }

  send(message: any) {
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      // Queue for later delivery
      this.pendingMessages.push(message)
    }
  }

  private flushPending() {
    while (this.pendingMessages.length > 0) {
      const msg = this.pendingMessages.shift()
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg))
      }
    }
  }

  private handleServerMessage(rawData: string) {
    try {
      const data = JSON.parse(rawData)

      // Dispatch to app state/store
      switch (data.type) {
        case 'collection_updated':
          this.updateCollection(data.payload)
          break
        case 'user_joined':
          console.log(`User joined. Active: ${data.count}`)
          break
        case 'user_left':
          console.log(`User left. Active: ${data.count}`)
          break
      }
    } catch (error) {
      console.error('[WS] Parse error:', error)
    }
  }

  private updateCollection(payload: any) {
    // Emit event to Zustand store or React context
    // Last-Write-Wins conflict resolution if needed
  }
}

// Usage
const wsClient = new RealtimeCollaborationClient()
wsClient.connect('workspace-123')

// Send updates
const sendCollectionUpdate = (update: any) => {
  wsClient.send({
    type: 'collection_updated',
    payload: update
  })
}
```

### Message Buffering Behavior
- **While disconnected:** Queue messages in memory (configurable max queue size to prevent memory leak)
- **On reconnect:** Flush queue in order
- **After reconnect:** Request full state from server (version sync) to handle missed updates

### Reconnection Metrics
- Attempt 1: 1 + jitter ~= 1s
- Attempt 2: 2 + jitter ~= 2s
- Attempt 3: 4 + jitter ~= 4s
- Attempt 4: 8 + jitter ~= 8s
- Attempt 5+: capped at 30s + jitter

---

## 4. Scaling Considerations

### MVP Phase (Single Server, <1K concurrent users)
- **Architecture:** In-memory rooms (Map of Sets)
- **Message broadcast:** Direct ws.send() to room members
- **State:** Live-in-server, no persistence required
- **Deployment:** Single Node.js instance on port 3001

### Growth Phase (Multi-Server, 1K-10K concurrent)
- **Architecture:** Add Redis Pub/Sub layer
- **Change:** Publish all messages to Redis; subscribe to workspace channels
- **New files to create:**
  - `src/services/redis-broker.ts` — Redis client initialization + subscriptions
  - `src/services/collaboration-server.ts` — Move room management to dedicated service
- **Message flow:**
  1. Client A (Server 1) sends update → publish to Redis
  2. Redis broadcasts to all subscribed servers
  3. Server 1 & Server 2 broadcast locally to their clients
  4. No direct server-to-server communication needed

### Enterprise Phase (10K+ concurrent, multiple regions)
- **Architecture:** Add Kafka or NATS for higher throughput
- **Load balancing:** Sticky sessions or Redis-backed session store for failover
- **Client state:** Add version numbers to detect conflicts

### Single vs. Separate Ports Decision

| Approach | Pros | Cons |
|----------|------|------|
| **Same port (HTTP upgrade)** | Simpler deployment, single TLS cert, firewall-friendly | Requires HTTP upgrade protocol |
| **Separate port** | Cleaner separation of concerns | Extra firewall rules, more complex deploy |

**Decision:** Stick with **single port (HTTP upgrade)** using @hono/node-ws. Hono handles the upgrade automatically.

---

## 5. Implementation Roadmap

### Phase 1: WebSocket Server (Week 1)
- [ ] Install @hono/node-ws
- [ ] Create `src/routes/collaboration.ts` with WebSocket handler
- [ ] Implement in-memory room registry
- [ ] Test with Tauri + browser client

### Phase 2: Client Reconnection (Week 1-2)
- [ ] Create `src/services/realtime-client.ts` with RealtimeCollaborationClient class
- [ ] Implement exponential backoff reconnection
- [ ] Add message queue for offline support
- [ ] Integrate with Zustand store

### Phase 3: Message Types & Conflicts (Week 2)
- [ ] Define protocol: `collection_updated`, `user_joined`, `user_left`, etc.
- [ ] Implement Last-Write-Wins (LWW) conflict resolution by `updated_at`
- [ ] Add version tracking to detect out-of-sync state
- [ ] Seed test data with concurrent edits

### Phase 4: Redis Scaling (Week 3, optional for MVP)
- [ ] Add Redis dependency (ioredis)
- [ ] Refactor room management to use Redis Pub/Sub
- [ ] Deploy multi-instance on Kubernetes/Docker
- [ ] Load test with 5K concurrent connections

---

## 6. Code Snippets Summary

### Server Setup
```typescript
// Import required packages
import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'
import { Hono, upgradeWebSocket } from 'hono'

// Initialize Hono app and WebSocket
const app = new Hono()
const nodeWebSocket = createNodeWebSocket()

// Add WebSocket route
app.get('/ws/:workspaceId', upgradeWebSocket((c) => ({
  onOpen, onMessage, onClose, onError
})))

// Start server with WebSocket injection
const server = serve({ fetch: app.fetch, port: 3001 })
nodeWebSocket.injectWebSocket(server)
```

### Client Reconnection Core
```typescript
const delay = Math.min(
  baseDelay * Math.pow(2, attempt) + jitter,
  maxDelay
)
setTimeout(() => reconnect(), delay)
```

### Room Broadcast (Single Server)
```typescript
rooms.forEach(ws => {
  if (ws !== excludeWs) {
    ws.send(JSON.stringify(message))
  }
})
```

### Room Broadcast (Redis)
```typescript
await redisPub.publish(`workspace:${roomId}`, JSON.stringify(message))
```

---

## 7. Known Limitations & Workarounds

| Issue | Workaround |
|-------|-----------|
| No built-in acknowledgments | App-level protocol (await client response) |
| No automatic reconnection state recovery | Request full collection state after reconnect |
| Header conflicts with CORS middleware | Apply @hono/node-ws before CORS middleware |
| No pub/sub in single adapter | Implement manual broadcast + Redis later |

---

## 8. Alternative: Separate ws Library

**Why NOT recommended for Localman:**
- Running separate ws library on different port complicates deployment
- Hono's native @hono/node-ws is well-maintained and production-tested
- Socket.IO adds 10x overhead vs. raw WebSocket (unnecessary for MVP)

**Only consider if:**
- Need real-time features not supported by Hono (e.g., binary frames, compression)
- Migrating existing Socket.IO codebase

---

## References

- [Hono WebSocket Helper](https://hono.dev/docs/helpers/websocket)
- [@hono/node-ws npm](https://www.npmjs.com/package/@hono/node-ws)
- [Node.js Server Adapter](https://hono.dev/docs/getting-started/nodejs)
- [WebSocket Reconnection Strategies](https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1)
- [Redis Pub/Sub for Scaling WebSockets](https://dev.to/hexshift/scaling-websocket-connections-with-redis-pubsub-for-multi-instance-nodejs-applications-3pib)
- [WebSocket Scaling Patterns](https://ably.com/blog/scaling-pub-sub-with-websockets-and-redis)

---

## Unresolved Questions

1. **Conflict resolution:** Should we use Last-Write-Wins (LWW) or Operational Transformation (OT)? LWW is simpler but may lose concurrent edits. OT adds complexity.
2. **Message ordering:** Should we add sequence numbers to detect dropped messages?
3. **Offline merge:** When client reconnects after being offline for 10+ minutes, how to merge local changes with remote changes?
4. **Broadcast scope:** Should workspace updates broadcast to all workspaces or only subscribed ones?
