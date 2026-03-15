/**
 * React hook for Dexie liveQuery — reactive UI updates when DB changes.
 * Re-exports useLiveQuery from dexie-react-hooks.
 *
 * This indirection is intentional: it provides a stable local import path
 * so that tests can vi.mock('../hooks/use-live-query') in one place instead
 * of mocking the dexie-react-hooks package directly.
 */

import { useLiveQuery } from 'dexie-react-hooks';

export { useLiveQuery };
