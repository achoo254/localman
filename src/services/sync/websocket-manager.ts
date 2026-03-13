/**
 * WebSocket connection manager — singleton that handles connection lifecycle,
 * auto-reconnection with exponential backoff, channel subscriptions, and heartbeat.
 */

import { getWsBaseUrl } from "../../utils/api-base-url";
import { getIdToken } from "./firebase-auth-client";

type MessageHandler = (msg: Record<string, unknown>) => void;

/** Connection states exposed to UI */
export type WsConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]; // max 30s

class WebSocketManager {
  private ws: WebSocket | null = null;
  private token = "";
  private state: WsConnectionState = "disconnected";
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private subscribedChannels = new Set<string>();
  private handlers = new Map<string, Set<MessageHandler>>();
  private stateListeners = new Set<(state: WsConnectionState) => void>();
  private intentionalClose = false;

  /** Get current connection state */
  getState(): WsConnectionState {
    return this.state;
  }

  /** Subscribe to connection state changes */
  onStateChange(listener: (state: WsConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private setState(state: WsConnectionState): void {
    this.state = state;
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }

  /** Connect to WebSocket server */
  connect(token: string): void {
    if (this.ws && this.state === "connected") {
      this.disconnect();
    }

    this.token = token;
    this.intentionalClose = false;
    void this.doConnect();
  }

  /** Disconnect and stop reconnecting */
  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
    this.subscribedChannels.clear();
    this.setState("disconnected");
  }

  /** Subscribe to a workspace or personal channel */
  subscribe(channel: string): void {
    this.subscribedChannels.add(channel);
    if (this.ws && this.state === "connected") {
      this.send({ type: "subscribe", channel });
    }
  }

  /** Unsubscribe from a channel */
  unsubscribe(channel: string): void {
    this.subscribedChannels.delete(channel);
    if (this.ws && this.state === "connected") {
      this.send({ type: "unsubscribe", channel });
    }
  }

  /** Subscribe to personal sync channel */
  subscribePersonal(userId: string): void {
    this.subscribe(`user:${userId}`);
  }

  /** Send a JSON message */
  send(data: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /** Register a handler for a specific message type */
  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  /** Get all currently subscribed channels */
  getSubscribedChannels(): string[] {
    return [...this.subscribedChannels];
  }

  // --- Internal ---

  private async doConnect(): Promise<void> {
    try {
      // On reconnect attempts, get a fresh token to avoid using an expired one
      if (this.reconnectAttempt > 0) {
        const freshToken = await getIdToken()
        if (freshToken) {
          this.token = freshToken
        }
      }
      const url = `${getWsBaseUrl()}/ws?token=${encodeURIComponent(this.token)}`;

      this.setState(this.reconnectAttempt > 0 ? "reconnecting" : "connecting");
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        const wasReconnect = this.reconnectAttempt > 0;
        this.reconnectAttempt = 0;
        this.setState("connected");
        // Re-subscribe to all channels
        for (const channel of this.subscribedChannels) {
          this.send({ type: "subscribe", channel });
        }
        // Emit reconnect event for state reconciliation
        this.emit(wasReconnect ? "reconnected" : "connected", {});
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as Record<string, unknown>;
          // Handle server ping with pong
          if (msg.type === "ping") {
            this.send({ type: "pong" });
            return;
          }
          this.emit(msg.type as string, msg);
        } catch {
          // Ignore unparseable messages
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (!this.intentionalClose) {
          this.scheduleReconnect();
        } else {
          this.setState("disconnected");
        }
      };

      this.ws.onerror = () => {
        // onclose will fire after onerror — reconnect handled there
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) return;

    const delay = RECONNECT_DELAYS[
      Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)
    ];
    this.reconnectAttempt++;
    this.setState("reconnecting");

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.doConnect();
    }, delay);
  }

  private emit(type: string, msg: Record<string, unknown>): void {
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try {
          handler(msg);
        } catch (err) {
          console.error(`[WS] Handler error for ${type}:`, err);
        }
      }
    }

    // Also emit to wildcard handlers
    const wildcardHandlers = this.handlers.get("*");
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          handler(msg);
        } catch {
          // Ignore wildcard handler errors
        }
      }
    }
  }
}

/** Singleton WebSocket manager instance */
export const wsManager = new WebSocketManager();
