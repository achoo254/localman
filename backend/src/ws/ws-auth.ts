/**
 * WebSocket connection authentication — validate JWT token on upgrade request.
 * Extracts token from ?token= query param and validates via Better Auth.
 */

import type { IncomingMessage } from "node:http";
import { auth } from "../auth.js";

export interface WsUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Authenticate WebSocket upgrade request by extracting token from query param
 * and validating it through Better Auth session API.
 * Returns user info on success, null on failure.
 */
export async function authenticateWsConnection(
  req: IncomingMessage,
): Promise<WsUser | null> {
  try {
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    if (!token) return null;

    // Validate token via Better Auth — build a fake request with Authorization header
    const session = await auth.api.getSession({
      headers: new Headers({ Authorization: `Bearer ${token}` }),
    });

    if (!session?.user) return null;

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    };
  } catch {
    return null;
  }
}
