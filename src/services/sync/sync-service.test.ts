/**
 * Unit tests: reconcile logic and Postman roundtrip (x-localman-updated-at, _postman_id).
 */

import { describe, it, expect } from 'vitest';
import { reconcile } from './sync-service';
import { exportToPostman } from '../exporters/postman-exporter';
import { importPostmanCollection } from '../importers/postman-importer';
import type { Collection } from '../../types/models';

describe('Postman sync roundtrip', () => {
  it('export includes x-localman-updated-at and _postman_id', () => {
    const collection: Collection = {
      id: 'col-uuid-1',
      name: 'Test',
      sort_order: 0,
      created_at: '2026-03-07T10:00:00.000Z',
      updated_at: '2026-03-07T12:00:00.000Z',
    };
    const postman = exportToPostman(collection, [], []);
    expect(postman.info._postman_id).toBe('col-uuid-1');
    expect(postman.info['x-localman-updated-at']).toBe('2026-03-07T12:00:00.000Z');
  });

  it('import preserves collection id and updated_at from Postman JSON', () => {
    const collection: Collection = {
      id: 'col-uuid-2',
      name: 'Roundtrip',
      sort_order: 0,
      created_at: '2026-03-07T09:00:00.000Z',
      updated_at: '2026-03-07T11:00:00.000Z',
    };
    const postman = exportToPostman(collection, [], []);
    const json = JSON.parse(JSON.stringify(postman));
    const result = importPostmanCollection(json);
    expect(result.collection.id).toBe('col-uuid-2');
    expect(result.collection.updated_at).toBe('2026-03-07T11:00:00.000Z');
    expect(result.collection.created_at).toBe('2026-03-07T11:00:00.000Z');
  });
});

describe('reconcile', () => {
  it('returns upload when server has no updated_at', () => {
    expect(reconcile('2026-03-07T10:00:00.000Z', undefined)).toBe('upload');
  });

  it('returns upload when local is newer', () => {
    expect(reconcile('2026-03-07T12:00:00.000Z', '2026-03-07T10:00:00.000Z')).toBe('upload');
  });

  it('returns download when server is newer', () => {
    expect(reconcile('2026-03-07T10:00:00.000Z', '2026-03-07T12:00:00.000Z')).toBe('download');
  });

  it('returns skip when equal', () => {
    const ts = '2026-03-07T11:00:00.000Z';
    expect(reconcile(ts, ts)).toBe('skip');
  });
});
