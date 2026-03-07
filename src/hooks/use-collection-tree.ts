/**
 * Live tree data: useLiveQuery for collections/folders/requests + buildTree.
 */

import { useMemo } from 'react';
import { useLiveQuery } from '../hooks/use-live-query';
import { db } from '../db/database';
import { buildTree } from '../utils/tree-builder';
import { useCollectionsStore } from '../stores/collections-store';

export function useCollectionTree() {
  const collections = useLiveQuery(() => db.collections.orderBy('sort_order').toArray(), []);
  const folders = useLiveQuery(() => db.folders.toArray(), []);
  const requests = useLiveQuery(() => db.requests.toArray(), []);
  const searchQuery = useCollectionsStore(s => s.searchQuery);

  const tree = useMemo(() => {
    const c = collections ?? [];
    const f = folders ?? [];
    const r = requests ?? [];
    return buildTree(c, f, r, searchQuery);
  }, [collections, folders, requests, searchQuery]);

  return { tree, isLoading: collections === undefined };
}
