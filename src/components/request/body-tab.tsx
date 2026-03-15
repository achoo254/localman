/**
 * Body tab: mode switcher (none, JSON, form, form-data, raw, XML, binary).
 */

import type { RequestBody } from '../../types/common';
import type { BodyType } from '../../types/enums';
import { BodyJsonEditor } from './body-json-editor';
import { BodyRawEditor } from './body-raw-editor';
import { BodyFormEditor } from './body-form-editor';
import { BodyBinaryPicker } from './body-binary-picker';

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'form', label: 'Form (urlencoded)' },
  { value: 'form-data', label: 'Form (multipart)' },
  { value: 'raw', label: 'Raw' },
  { value: 'xml', label: 'XML' },
  { value: 'binary', label: 'Binary' },
];

interface BodyTabProps {
  body: RequestBody;
  onChange: (body: RequestBody) => void;
  disabled?: boolean;
}

export function BodyTab({ body, onChange, disabled }: BodyTabProps) {
  const setType = (type: BodyType) => onChange({ ...body, type });
  const setRaw = (raw: string) => onChange({ ...body, raw });
  const setForm = (form: RequestBody['form']) => onChange({ ...body, form: form ?? [] });
  const setFormData = (formData: RequestBody['formData']) => onChange({ ...body, formData: formData ?? [] });

  return (
    <div className="flex flex-col">
      <div className="flex gap-1 border-b border-[var(--color-bg-tertiary)] p-2 bg-[#0B1120] overflow-x-auto scrollbar-none">
        {BODY_TYPES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            disabled={disabled}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
              body.type === value
                ? 'bg-[var(--color-bg-primary)] text-[var(--color-accent)] shadow-sm'
                : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-[200px]">
        {body.type === 'none' && (
          <p className="p-4 text-sm text-slate-500 flex items-center gap-2">              
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            No body for this request.
          </p>
        )}
        {body.type === 'json' && (
          <>
            <p className="text-xs text-slate-500 mb-1 px-2">Use {'{{varName}}'} for environment variables.</p>
            <BodyJsonEditor
              value={body.raw ?? '{\n  \n}'}
              onChange={setRaw}
            />
          </>
        )}
        {body.type === 'form' && (
          <BodyFormEditor
            pairs={body.form ?? []}
            onChange={setForm}
          />
        )}
        {body.type === 'form-data' && (
          <BodyFormEditor
            pairs={body.formData ?? []}
            onChange={setFormData}
          />
        )}
        {body.type === 'raw' && (
          <>
            <p className="text-xs text-slate-500 mb-1 px-2">Use {'{{varName}}'} for environment variables.</p>
            <BodyRawEditor
              value={body.raw ?? ''}
              onChange={setRaw}
              language="plain"
            />
          </>
        )}
        {body.type === 'xml' && (
          <>
            <p className="text-xs text-slate-500 mb-1 px-2">Use {'{{varName}}'} for environment variables.</p>
            <BodyRawEditor
              value={body.raw ?? ''}
              onChange={setRaw}
              language="xml"
            />
          </>
        )}
        {body.type === 'binary' && (
          <BodyBinaryPicker
            filePath={body.raw ?? null}
            onSelect={path => setRaw(path ?? '')}
          />
        )}
      </div>
    </div>
  );
}
