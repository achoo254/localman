import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "./src/db/auth-schema.ts",
    "./src/db/schema.ts",
    "./src/db/workspace-schema.ts",
    "./src/db/entity-schema.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
