import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env.js";
import * as userSchema from "./user-schema.js";
import * as schema from "./schema.js";
import * as workspaceSchema from "./workspace-schema.js";
import * as entitySchema from "./entity-schema.js";

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, {
  schema: { ...userSchema, ...schema, ...workspaceSchema, ...entitySchema },
});
