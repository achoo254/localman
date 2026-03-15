/**
 * Request tabs: Params, Headers, Body, Auth, Pre-Script, Post-Script.
 * BodyTab and ScriptEditor are lazy-loaded (CodeMirror) to reduce initial bundle.
 */

import { lazy, Suspense } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { ParamsTab } from './params-tab';
import { HeadersTab } from './headers-tab';
import { AuthTab } from './auth-tab';
import type { ApiRequest } from '../../types/models';

const BodyTab = lazy(() => import('./body-tab').then((m) => ({ default: m.BodyTab })));
const ScriptEditor = lazy(() => import('./script-editor').then((m) => ({ default: m.ScriptEditor })));

const EditorFallback = () => (
  <div className="min-h-[140px] w-full rounded border border-[var(--color-bg-tertiary)] flex items-center justify-center text-slate-500 text-sm">
    Loading editor…
  </div>
);

interface RequestTabsProps {
  request: ApiRequest;
  onUpdate: (partial: Partial<ApiRequest>) => void;
}

export function RequestTabs({ request, onUpdate }: RequestTabsProps) {
  const noBody = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);

  return (
    <Tabs.Root defaultValue="params" className="flex flex-col">
      <Tabs.List className="flex border-b border-[var(--color-bg-tertiary)] px-3 pt-2 gap-1 bg-[#0B1120] overflow-x-auto scrollbar-none shrink-0 w-full">
        <Tabs.Trigger
          value="params"
          className="rounded-t-lg px-4 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200 data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:text-[var(--color-accent)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] select-none"
        >
          Params
        </Tabs.Trigger>
        <Tabs.Trigger
          value="headers"
          className="rounded-t-lg px-4 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200 data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:text-[var(--color-accent)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] select-none"
        >
          Headers
        </Tabs.Trigger>
        <Tabs.Trigger
          value="body"
          className="rounded-t-lg px-4 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200 data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:text-[var(--color-accent)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] select-none"
        >
          Body
        </Tabs.Trigger>
        <Tabs.Trigger
          value="auth"
          className="rounded-t-lg px-4 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200 data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:text-[var(--color-accent)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] select-none"
        >
          Auth
        </Tabs.Trigger>
        <Tabs.Trigger
          value="pre"
          className="rounded-t-lg px-4 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200 data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:text-[var(--color-accent)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] select-none"
        >
          Pre-Script
        </Tabs.Trigger>
        <Tabs.Trigger
          value="post"
          className="rounded-t-lg px-4 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200 data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:text-[var(--color-accent)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] select-none"
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
        <Suspense fallback={<EditorFallback />}>
          <BodyTab
            body={request.body}
            onChange={body => onUpdate({ body })}
            disabled={noBody}
          />
        </Suspense>
      </Tabs.Content>
      <Tabs.Content value="auth" className="mt-0 flex-1 overflow-auto">
        <AuthTab auth={request.auth} onChange={auth => onUpdate({ auth })} />
      </Tabs.Content>
      <Tabs.Content value="pre" className="mt-0 flex-1 overflow-auto p-4">
        <p className="text-xs text-slate-500 mb-2">Environment variables: lm.variables.get('varName'), lm.variables.set('key', 'value')</p>
        <Suspense fallback={<EditorFallback />}>
          <ScriptEditor
            value={request.pre_script ?? ''}
            onChange={v => onUpdate({ pre_script: v })}
          />
        </Suspense>
      </Tabs.Content>
      <Tabs.Content value="post" className="mt-0 flex-1 overflow-auto p-4">
        <p className="text-xs text-slate-500 mb-2">Environment variables: lm.variables.get('varName'), lm.variables.set('key', 'value')</p>
        <Suspense fallback={<EditorFallback />}>
          <ScriptEditor
            value={request.post_script ?? ''}
            onChange={v => onUpdate({ post_script: v })}
          />
        </Suspense>
      </Tabs.Content>
    </Tabs.Root>
  );
}
