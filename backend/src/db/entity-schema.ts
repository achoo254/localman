import {
  pgTable,
  varchar,
  uuid,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  text,
} from "drizzle-orm/pg-core";
import { users } from "./user-schema.js";
import { workspaces } from "./workspace-schema.js";

// Collections — normalized (replaces blob in userFiles)
export const collections = pgTable(
  "collections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").default(0),
    isSynced: boolean("is_synced").default(false),
    version: integer("version").default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("collections_workspace_idx").on(table.workspaceId),
    index("collections_user_idx").on(table.userId),
    index("collections_ws_deleted_idx").on(table.workspaceId, table.deletedAt),
  ]
);

// Folders — nested inside collections
export const folders = pgTable(
  "folders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    name: varchar("name", { length: 255 }).notNull(),
    sortOrder: integer("sort_order").default(0),
    version: integer("version").default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("folders_collection_idx").on(table.collectionId),
    index("folders_collection_parent_idx").on(
      table.collectionId,
      table.parentId
    ),
  ]
);

// Requests — individual API requests within collections
export const requests = pgTable(
  "requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    method: varchar("method", { length: 10 }).notNull().default("GET"),
    url: text("url").default(""),
    params: jsonb("params").default([]),
    headers: jsonb("headers").default([]),
    body: jsonb("body").default({}),
    auth: jsonb("auth").default({}),
    description: text("description"),
    preScript: text("pre_script"),
    postScript: text("post_script"),
    sortOrder: integer("sort_order").default(0),
    version: integer("version").default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("requests_collection_idx").on(table.collectionId),
    index("requests_collection_folder_idx").on(
      table.collectionId,
      table.folderId
    ),
  ]
);

// Environments — variable sets (workspace or personal)
export const environments = pgTable(
  "environments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    variables: jsonb("variables").default([]),
    isActive: boolean("is_active").default(false),
    isSynced: boolean("is_synced").default(false),
    version: integer("version").default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("environments_workspace_idx").on(table.workspaceId),
    index("environments_user_idx").on(table.userId),
  ]
);

// Change log — tracks field-level changes for delta sync (Phase 4)
export const changeLog = pgTable(
  "change_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: varchar("entity_type", { length: 20 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    workspaceId: uuid("workspace_id"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    fieldChanges: jsonb("field_changes").notNull(),
    fromVersion: integer("from_version").notNull(),
    toVersion: integer("to_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("change_log_entity_version_idx").on(
      table.entityType,
      table.entityId,
      table.fromVersion
    ),
    index("change_log_ws_created_idx").on(table.workspaceId, table.createdAt),
  ]
);
