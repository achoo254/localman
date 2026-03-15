import type { ErrorHandler } from "hono";
import { z } from "zod";
import { env } from "../env.js";

export const errorHandler: ErrorHandler = (err, c) => {
  console.error("[Error]", err.message);

  // Zod validation errors — return 400 with sanitized message
  if (err instanceof z.ZodError) {
    return c.json({ error: "Validation failed", details: err.issues.map((i) => i.message) }, 400);
  }

  const status = "status" in err ? (err as { status: number }).status : 500;
  const message =
    env.NODE_ENV === "production" && status === 500
      ? "Internal Server Error"
      : err.message || "Internal Server Error";
  return c.json({ error: message }, status as any);
};
