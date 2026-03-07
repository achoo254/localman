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
      <div className="flex gap-1 border-b border-[var(--color-bg-tertiary)] p-2">
        {BODY_TYPES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            disabled={disabled}
            className={`rounded px-3 py-1.5 text-sm ${
              body.type === value
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-secondary)] text-gray-400 hover:bg-[var(--color-bg-tertiary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-[200px]">
        {body.type === 'none' && (
          <p className="p-4 text-sm text-gray-500">No body for this request.</p>
        )}
        {body.type === 'json' && (
          <BodyJsonEditor
            value={body.raw ?? '{\n  \n}'}
            onChange={setRaw}
          />
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
          <BodyRawEditor
            value={body.raw ?? ''}
            onChange={setRaw}
            language="plain"
          />
        )}
        {body.type === 'xml' && (
          <BodyRawEditor
            value={body.raw ?? ''}
            onChange={setRaw}
            language="xml"
          />
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
