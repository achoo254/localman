/**
 * Debounced search across requests (name, URL). 150ms debounce.
 */

import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { useCollectionsStore } from '../../stores/collections-store';

const DEBOUNCE_MS = 150;

export function CollectionSearch() {
  const [local, setLocal] = useState('');
  const setSearch = useCollectionsStore(s => s.setSearch);

  useEffect(() => {
    const t = setTimeout(() => setSearch(local), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [local, setSearch]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocal(e.target.value);
  }, []);

  return (
    <div className="relative px-2 py-1.5">
      <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      <input
        type="text"
        value={local}
        onChange={handleChange}
        placeholder="Search requests..."
        className="w-full rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] py-1.5 pl-8 pr-2 text-sm placeholder:text-gray-500 focus:border-[var(--color-accent)] focus:outline-none"
      />
    </div>
  );
}
