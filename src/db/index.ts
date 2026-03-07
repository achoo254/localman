/**
 * DB layer public API.
 * Import services from ./services/<name>-service for CRUD.
 */

export { db, LocalmanDB } from './database';
export { CURRENT_SCHEMA_VERSION, SCHEMA_VERSION_HISTORY } from './migrations';
