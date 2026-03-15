/**
 * Export Localman collection to Postman Collection v2.1 JSON.
 */

import type { Collection, Folder, ApiRequest } from '../../types/models';
import type {
  PostmanCollection,
  PostmanItem,
  PostmanRequest,
  PostmanUrl,
  PostmanHeader,
  PostmanBody,
  PostmanAuth,
  PostmanInfo,
} from '../importers/postman-types';

const SCHEMA_URL = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

function newId(): string {
  return globalThis.crypto.randomUUID();
}

function mapAuthToPostman(auth: ApiRequest['auth']): PostmanAuth | null {
  if (!auth || auth.type === 'none') return { type: 'noauth' };
  if (auth.type === 'bearer') {
    return {
      type: 'bearer',
      bearer: [{ key: 'token', value: auth.bearerToken ?? '' }],
    };
  }
  if (auth.type === 'basic') {
    return {
      type: 'basic',
      basic: [
        { key: 'username', value: auth.username ?? '' },
        { key: 'password', value: auth.password ?? '' },
      ],
    };
  }
  if (auth.type === 'api-key') {
    return {
      type: 'apikey',
      apikey: [
        { key: 'key', value: auth.apiKeyHeader ?? 'X-Api-Key' },
        { key: 'value', value: auth.apiKeyValue ?? '' },
      ],
    };
  }
  return { type: 'noauth' };
}

function mapBodyToPostman(body: ApiRequest['body']): PostmanBody | null {
  if (!body || body.type === 'none') return null;
  if (body.type === 'raw' && body.raw != null) {
    return { mode: 'raw', raw: body.raw };
  }
  if (body.type === 'form' && body.form?.length) {
    return {
      mode: 'urlencoded',
      urlencoded: body.form.map(p => ({ key: p.key, value: p.value, disabled: !p.enabled })),
    };
  }
  if (body.type === 'form-data' && body.formData?.length) {
    return {
      mode: 'formdata',
      formdata: body.formData.map(p => ({
        key: p.key,
        value: p.value,
        type: 'text' as const,
        disabled: !p.enabled,
      })),
    };
  }
  if (body.raw != null) return { mode: 'raw', raw: body.raw };
  return null;
}

function requestToPostmanItem(req: ApiRequest): PostmanItem {
  const headers: PostmanHeader[] = (req.headers ?? []).map(h => ({
    key: h.key,
    value: h.value,
    disabled: !h.enabled,
  }));
  const body = mapBodyToPostman(req.body);
  const auth = mapAuthToPostman(req.auth);
  const url: PostmanUrl = { raw: req.url };
  const postmanRequest: PostmanRequest = {
    method: req.method,
    url,
    header: headers,
    body: body ?? undefined,
    auth: auth ?? undefined,
  };
  return {
    id: newId(),
    name: req.name,
    request: postmanRequest,
  };
}

function buildNestedItems(
  _collectionId: string,
  folders: Folder[],
  requests: ApiRequest[],
  parentFolderId: string | null
): PostmanItem[] {
  const childFolders = folders.filter(f => f.parent_id === parentFolderId);
  const childRequests = requests.filter(r => r.folder_id === parentFolderId);
  type Node = { sortOrder: number; folder?: Folder; request?: ApiRequest };
  const nodes: Node[] = [
    ...childFolders.map(f => ({ sortOrder: f.sort_order, folder: f })),
    ...childRequests.map(r => ({ sortOrder: r.sort_order, request: r })),
  ].sort((a, b) => a.sortOrder - b.sortOrder);

  const result: PostmanItem[] = [];
  for (const node of nodes) {
    if (node.request) {
      result.push(requestToPostmanItem(node.request));
    } else if (node.folder) {
      const children = buildNestedItems(_collectionId, folders, requests, node.folder.id);
      result.push({
        id: newId(),
        name: node.folder.name,
        item: children,
      });
    }
  }
  return result;
}

/**
 * Export a single collection (with folders and requests) to Postman v2.1 format.
 */
export function exportToPostman(
  collection: Collection,
  folders: Folder[],
  requests: ApiRequest[]
): PostmanCollection {
  const items = buildNestedItems(collection.id, folders, requests, null);
  const info: PostmanInfo = {
    name: collection.name,
    schema: SCHEMA_URL,
    _postman_id: collection.id,
    description: collection.description,
    'x-localman-updated-at': collection.updated_at,
  };
  return {
    info,
    item: items,
  };
}
