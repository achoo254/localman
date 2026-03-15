import {
  pgTable,
  text,
  varchar,
  jsonb,
  uuid,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./user-schema.js";

export const userFiles = pgTable(
  "user_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    filename: varchar("filename", { length: 255 }).notNull(),
    entityType: varchar("entity_type", { length: 20 }).notNull(),
    content: jsonb("content").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_files_user_filename_idx").on(table.userId, table.filename),
    index("user_files_user_id_idx").on(table.userId),
    index("user_files_user_entity_idx").on(table.userId, table.entityType),
  ]
);

// Re-export user schema for drizzle-kit
export { users } from "./user-schema.js";
