import { createMiddleware } from "hono/factory";
import type { AppVariables } from "../types/context.js";
import { auth } from "../auth.js";

/** Extracts session — does NOT block unauthenticated requests */
export const sessionMiddleware = createMiddleware<{
  Variables: AppVariables;
}>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

/** Blocks unauthenticated requests with 401 */
export const requireAuth = createMiddleware<{
  Variables: AppVariables;
}>(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  await next();
});
