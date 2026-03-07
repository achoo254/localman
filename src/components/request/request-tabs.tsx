/**
 * Request tabs: Params, Headers, Body, Auth, Pre-Script, Post-Script.
 */

import * as Tabs from '@radix-ui/react-tabs';
import { ParamsTab } from './params-tab';
import { HeadersTab } from './headers-tab';
import { BodyTab } from './body-tab';
import { AuthTab } from './auth-tab';
import type { ApiRequest } from '../../types/models';

interface RequestTabsProps {
  request: ApiRequest;
  onUpdate: (partial: Partial<ApiRequest>) => void;
}

export function RequestTabs({ request, onUpdate }: RequestTabsProps) {
  const noBody = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);

  return (
    <Tabs.Root defaultValue="params" className="flex flex-col">
      <Tabs.List className="flex border-b border-[var(--color-bg-tertiary)] px-2">
        <Tabs.Trigger
          value="params"
          className="rounded-t px-3 py-2 text-sm text-gray-400 hover:text-[var(--foreground)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--foreground)]"
        >
          Params
        </Tabs.Trigger>
        <Tabs.Trigger
          value="headers"
          className="rounded-t px-3 py-2 text-sm text-gray-400 hover:text-[var(--foreground)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--foreground)]"
        >
          Headers
        </Tabs.Trigger>
        <Tabs.Trigger
          value="body"
          className="rounded-t px-3 py-2 text-sm text-gray-400 hover:text-[var(--foreground)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--foreground)]"
        >
          Body
        </Tabs.Trigger>
        <Tabs.Trigger
          value="auth"
          className="rounded-t px-3 py-2 text-sm text-gray-400 hover:text-[var(--foreground)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--foreground)]"
        >
          Auth
        </Tabs.Trigger>
        <Tabs.Trigger
          value="pre"
          className="rounded-t px-3 py-2 text-sm text-gray-400 hover:text-[var(--foreground)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--foreground)]"
        >
          Pre-Script
        </Tabs.Trigger>
        <Tabs.Trigger
          value="post"
          className="rounded-t px-3 py-2 text-sm text-gray-400 hover:text-[var(--foreground)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--foreground)]"
        >
          Post-Script
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="params" className="mt-0 flex-1 overflow-auto">
        <ParamsTab
          params={request.params}
          onChange={params => onUpdate({ params })}
        />
      </Tabs.Content>
      <Tabs.Content value="headers" className="mt-0 flex-1 overflow-auto">
        <HeadersTab
          headers={request.headers}
          onChange={headers => onUpdate({ headers })}
        />
      </Tabs.Content>
      <Tabs.Content value="body" className="mt-0 flex-1 overflow-auto">
        <BodyTab
          body={request.body}
          onChange={body => onUpdate({ body })}
          disabled={noBody}
        />
      </Tabs.Content>
      <Tabs.Content value="auth" className="mt-0 flex-1 overflow-auto">
        <AuthTab auth={request.auth} onChange={auth => onUpdate({ auth })} />
      </Tabs.Content>
      <Tabs.Content value="pre" className="mt-0 flex-1 overflow-auto p-4">
        <textarea
          value={request.pre_script ?? ''}
          onChange={e => onUpdate({ pre_script: e.target.value })}
          placeholder="Pre-request script (Phase 09)"
          className="min-h-[120px] w-full rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] p-3 font-mono text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          spellCheck={false}
        />
      </Tabs.Content>
      <Tabs.Content value="post" className="mt-0 flex-1 overflow-auto p-4">
        <textarea
          value={request.post_script ?? ''}
          onChange={e => onUpdate({ post_script: e.target.value })}
          placeholder="Post-response script (Phase 09)"
          className="min-h-[120px] w-full rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] p-3 font-mono text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          spellCheck={false}
        />
      </Tabs.Content>
    </Tabs.Root>
  );
}
