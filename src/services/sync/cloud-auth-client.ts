/**
 * Better Auth client for Tauri desktop — sign in/up/out via HTTP.
 */

import { getHttpClient } from "../../utils/tauri-http-client";

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; name: string };
}

export async function signIn(
  serverUrl: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const f = await getHttpClient();
  const res = await f(`${serverUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message || `Login failed: ${res.status}`
    );
  }
  return res.json() as Promise<AuthResponse>;
}

export async function signUp(
  serverUrl: string,
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const f = await getHttpClient();
  const res = await f(`${serverUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ||
        `Registration failed: ${res.status}`
    );
  }
  return res.json() as Promise<AuthResponse>;
}

export async function signOut(
  serverUrl: string,
  token: string
): Promise<void> {
  const f = await getHttpClient();
  await f(`${serverUrl}/api/auth/sign-out`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Fetch workspaces the authenticated user belongs to */
export async function listWorkspaces(
  serverUrl: string,
  token: string,
): Promise<Array<{ id: string; name: string; role: string }>> {
  const f = await getHttpClient();
  const res = await f(`${serverUrl}/api/workspaces`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Failed to list workspaces: ${res.status}`);
  }
  return res.json() as Promise<Array<{ id: string; name: string; role: string }>>;
}
