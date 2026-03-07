/**
 * Response tabs: Body, Headers, Cookies.
 */

import * as Tabs from '@radix-ui/react-tabs';
import { ResponseBodyViewer } from './response-body-viewer';
import { ResponseHeadersTable } from './response-headers-table';
import { ResponseCookiesTable } from './response-cookies-table';
import type { ResponseData } from '../../types/response';

interface ResponseTabsProps {
  data: ResponseData;
}

export function ResponseTabs({ data }: ResponseTabsProps) {
  return (
    <Tabs.Root defaultValue="body" className="flex flex-col min-h-0 flex-1">
      <Tabs.List className="flex border-b border-[var(--color-bg-tertiary)] px-3 pt-2 gap-1 shrink-0 bg-[#0B1120]">
        <Tabs.Trigger
          value="body"
          className="rounded-t-lg px-4 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200 data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:text-[var(--color-accent)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] select-none"
        >
          Body
        </Tabs.Trigger>
        <Tabs.Trigger
          value="headers"
          className="rounded-t-lg px-4 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200 data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:text-[var(--color-accent)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] select-none"
        >
          Headers
        </Tabs.Trigger>
        <Tabs.Trigger
          value="cookies"
          className="rounded-t-lg px-4 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200 data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:text-[var(--color-accent)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] select-none"
        >
          Cookies
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="body" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden">
        <ResponseBodyViewer body={data.body} contentType={data.contentType} />
      </Tabs.Content>
      <Tabs.Content value="headers" className="mt-0 flex-1 overflow-auto data-[state=inactive]:hidden">
        <ResponseHeadersTable headers={data.headers} />
      </Tabs.Content>
      <Tabs.Content value="cookies" className="mt-0 flex-1 overflow-auto data-[state=inactive]:hidden">
        <ResponseCookiesTable cookies={data.cookies} />
      </Tabs.Content>
    </Tabs.Root>
  );
}
