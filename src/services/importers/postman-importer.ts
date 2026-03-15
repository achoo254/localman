/**
 * Import Postman Collection v2.1 JSON into Localman models.
 * Returns collection, folders, requests ready for DB insert (IDs and timestamps generated).
 */

import type { Collection, Folder, ApiRequest } from '../../types/models';
import type { KeyValuePair, RequestBody, AuthConfig } from '../../types/common';
import type { HttpMethod } from '../../types/enums';
import type {
  PostmanCollection,
  PostmanItem,
  PostmanRequest,
  PostmanUrl,
  PostmanHeader,
  PostmanBody,
  PostmanAuth,
  PostmanAuthAttribute,
} from './postman-types';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

function newId(): string {
  return globalThis.crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function kv(key: string, value: string, enabled = true): KeyValuePair {
  return { id: newId(), key, value, enabled };
}

function authAttr(arr: PostmanAuthAttribute[] | undefined, key: string): string {
  const found = arr?.find(a => (a.key || '').toLowerCase() === key.toLowerCase());
  return found?.value != null ? String(found.value) : '';
}

function resolveUrl(url: PostmanRequest['url']): string {
  if (!url) return '';
  if (typeof url === 'string') return url;
  return (url as PostmanUrl).raw ?? '';
}

function resolveHeaders(header: PostmanRequest['header']): KeyValuePair[] {
  if (!header) return [];
  if (typeof header === 'string') return [];
  return (header as PostmanHeader[])
    .filter(h => h && h.key != null)
    .map(h => kv(h.key, h.value ?? '', !h.disabled));
}

function mapBody(body: PostmanBody | null | undefined): RequestBody {
  if (!body || body.disabled) return { type: 'none' };
  const mode = body.mode ?? 'raw';
  if (mode === 'raw' && body.raw != null) return { type: 'raw', raw: body.raw };
  if (mode === 'urlencoded' && body.urlencoded?.length) {
    const form = body.urlencoded.map(p => kv(p.key, p.value ?? '', !p.disabled));
    return { type: 'form', form };
  }
  if (mode === 'formdata' && body.formdata?.length) {
    const formData = body.formdata
      .filter(p => p.type !== 'file')
      .map(p => kv(p.key, p.value ?? '', !p.disabled));
    return { type: 'form-data', formData };
  }
  if (body.raw != null) return { type: 'raw', raw: body.raw };
  return { type: 'none' };
}

function mapAuth(auth: PostmanAuth | null | undefined): AuthConfig {
  if (!auth || auth.type === 'noauth') return { type: 'none' };
  if (auth.type === 'bearer') {
    const token = authAttr(auth.bearer ?? [], 'token');
    return { type: 'bearer', bearerToken: token };
  }
  if (auth.type === 'basic') {
    return {
      type: 'basic',
      username: authAttr(auth.basic ?? [], 'username'),
      password: authAttr(auth.basic ?? [], 'password'),
    };
  }
  if (auth.type === 'apikey') {
    const key = authAttr(auth.apikey ?? [], 'key');
    const value = authAttr(auth.apikey ?? [], 'value');
    return {
      type: 'api-key',
      apiKeyHeader: key || 'X-Api-Key',
      apiKeyValue: value,
    };
  }
  return { type: 'none' };
}

function toMethod(m: string | undefined): HttpMethod {
  const upper = (m ?? 'GET').toUpperCase();
  return HTTP_METHODS.includes(upper as HttpMethod) ? (upper as HttpMethod) : 'GET';
}

export interface ImportPostmanResult {
  collection: Collection;
  folders: Folder[];
  requests: ApiRequest[];
}

/**
 * Import a Postman Collection v2.1 JSON object into Localman collection, folders, and requests.
 * All IDs are regenerated; sort_order preserved from item order.
 */
export function importPostmanCollection(json: PostmanCollection): ImportPostmanResult {
  const info = json.info ?? {};
  const postmanId = info._postman_id;
  const syncUpdatedAt = info['x-localman-updated-at'];
  const ts = now();
  const collectionId = typeof postmanId === 'string' && postmanId.length > 0 ? postmanId : newId();
  const collection: Collection = {
    id: collectionId,
    name: info.name ?? 'Imported Collection',
    description:
      typeof info.description === 'string'
        ? info.description
        : (info.description as { content?: string })?.content,
    sort_order: 0,
    created_at: syncUpdatedAt ?? ts,
    updated_at: syncUpdatedAt ?? ts,
  };

  const folders: Folder[] = [];
  const requests: ApiRequest[] = [];

  let folderSort = 0;
  let requestSort = 0;

  function processItem(
    item: PostmanItem,
    collectionId: string,
    parentFolderId: string | null,
    collectionAuth: PostmanAuth | null | undefined
  ): void {
    if (!item) return;
    if (item.request != null && typeof item.request !== 'string') {
      const req = item.request as PostmanRequest;
      const method = toMethod(req.method);
      const url = resolveUrl(req.url);
      const headers = resolveHeaders(req.header);
      const body = mapBody(req.body ?? undefined);
      const auth = mapAuth(req.auth ?? collectionAuth ?? null);
      const reqId = newId();
      requests.push({
        id: reqId,
        collection_id: collectionId,
        folder_id: parentFolderId,
        name: (item.name ?? url) || 'Unnamed',
        method,
        url,
        params: [],
        headers,
        body,
        auth,
        sort_order: requestSort++,
        created_at: ts,
        updated_at: ts,
      });
      return;
    }
    if (Array.isArray(item.item) && item.item.length > 0) {
      const folderId = newId();
      folders.push({
        id: folderId,
        collection_id: collectionId,
        parent_id: parentFolderId,
        name: item.name ?? 'Folder',
        sort_order: folderSort++,
        created_at: ts,
        updated_at: ts,
      });
      const itemAuth = item.auth ?? collectionAuth;
      for (const child of item.item) {
        processItem(child, collectionId, folderId, itemAuth ?? null);
      }
      return;
    }
    if (item.request != null && typeof item.request === 'string') {
      const url = item.request;
      requests.push({
        id: newId(),
        collection_id: collectionId,
        folder_id: parentFolderId,
        name: item.name ?? url,
        method: 'GET',
        url,
        params: [],
        headers: [],
        body: { type: 'none' },
        auth: { type: 'none' },
        sort_order: requestSort++,
        created_at: ts,
        updated_at: ts,
      });
    }
  }

  const topAuth = json.auth ?? null;
  for (const item of json.item ?? []) {
    processItem(item, collectionId, null, topAuth);
  }

  return { collection, folders, requests };
}
