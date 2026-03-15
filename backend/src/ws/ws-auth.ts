/**
 * WebSocket connection authentication — validate Firebase ID token on upgrade request.
 * Extracts token from ?token= query param and validates via Firebase Admin SDK.
 */

import type { IncomingMessage } from "node:http";
import { firebaseAuth } from "../firebase.js";
import { db } from "../db/client.js";
import { users } from "../db/user-schema.js";
import { eq } from "drizzle-orm";

export interface WsUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Authenticate WebSocket upgrade request by extracting token from query param
 * and validating it through Firebase Admin SDK.
 * Returns user info on success, null on failure.
 */
export async function authenticateWsConnection(
  req: IncomingMessage,
): Promise<WsUser | null> {
  try {
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    if (!token) return null;

    const decoded = await firebaseAuth.verifyIdToken(token);

    // Look up our internal user record by firebase UID
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.firebaseUid, decoded.uid))
      .limit(1);

    if (!user) return null;

    return { id: user.id, name: user.name, email: user.email };
  } catch {
    return null;
  }
}
