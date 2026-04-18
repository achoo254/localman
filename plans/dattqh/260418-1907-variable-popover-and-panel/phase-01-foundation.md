# Phase 01 — Foundation

**Status:** planned · **Priority:** P0 · **Effort:** S

## Goal

Setup dependencies và shared APIs dùng xuyên suốt phase 02–04.

## Key Insights

- `interpolation-engine.ts:13` `VAR_PATTERN = /\{\{([^}]+)\}\}/g` — reuse, không duplicate
- `environment-store.ts:52-58` đã có `getInterpolationContext()` → envVars/globalVars record. Thiếu per-variable source resolver.
- `dynamic-variables.ts` resolve `$guid`/`$timestamp` — cần expose danh sách known dynamic names cho UI badge

## Requirements

1. Thêm dep `@radix-ui/react-popover` vào `client/package.json`
2. Mở rộng `environment-store` với 2 API: `resolveVariableSource(name)` + `writeVariable(target, name, value)`
3. Tạo `services/request-variable-extractor.ts` — extract used vars từ `ApiRequest`
4. Tạo `services/dynamic-variables.ts` export `getDynamicVariableInfo(name)` + `listDynamicVariables()`
5. Unit test cho extractor và resolver

## Architecture

### Store API additions

```ts
// client/src/stores/environment-store.ts

export type VariableSource =
  | { kind: 'environment'; envId: string; envName: string; variableId: string; secret: boolean }
  | { kind: 'global'; variableId: string; secret: boolean }
  | { kind: 'dynamic'; description: string }
  | { kind: 'unresolved' };

export interface ResolvedVariable {
  name: string;
  /**
   * null khi source là secret env/global và chưa reveal; dynamic trả về null (resolve on-demand qua `resolveDynamicValue`);
   * unresolved trả về null. Plain string chỉ khi non-secret env/global.
   * [RED TEAM C2] UI không được assume value luôn populated.
   */
  value: string | null;
  source: VariableSource;
}

// Added to EnvironmentStore interface:
// [RED TEAM C1] Resolver scan trực tiếp active.variables + globalVariables (không reuse getInterpolationContext flat).
// Trả variableId để writeVariableValue không phải lookup lại. Duplicate key → lấy first match + console.warn.
// [VALIDATION S1-Q1] Optional `reveal` opt-in để fetch plaintext secret. Default false → secret value = null.
resolveVariableSource: (name: string, options?: { reveal?: boolean }) => ResolvedVariable;

// [RED TEAM C1, C4] Target luôn có variableId. Caller snapshot target tại blur, không đọc từ store sau debounce.
writeVariableValue: (
  target: { kind: 'environment'; envId: string; variableId: string } | { kind: 'global'; variableId: string },
  value: string
) => Promise<void>;

// [RED TEAM H12] Validate `name`: non-empty, regex ^[a-zA-Z0-9_$.-]+$,
// reject ∈ {__proto__, constructor, prototype, ''}. Throw trước khi ghi store.
createVariable: (
  target: { kind: 'environment'; envId: string } | { kind: 'global' },
  name: string,
  value: string
) => Promise<void>;

// [RED TEAM C2] Dynamic vars resolve on-demand (guid/timestamp re-generate mỗi read).
// UI gọi khi cần hiển thị preview, không cache vào ResolvedVariable.value.
resolveDynamicValue: (name: string) => string;
```

Resolve order: environment (active) → global → dynamic → unresolved.

### Extractor service

```ts
// client/src/services/request-variable-extractor.ts
import type { ApiRequest } from '../types/models';

const VAR_PATTERN = /\{\{([^}]+)\}\}/g;

// [RED TEAM H9] Size guard — skip body > 100KB để tránh block main thread.
const MAX_BODY_SCAN_BYTES = 100_000;

// [RED TEAM M13] Whitelist auth fields per type thay vì Object.values() blind scan.
// Tránh scan field `type`, non-var values, và nested object bị bỏ sót.
const AUTH_VAR_FIELDS: Record<string, string[]> = {
  bearer: ['token'],
  basic: ['username', 'password'],
  'api-key': ['key', 'value'],
  oauth2: ['accessToken', 'clientId', 'clientSecret', 'tokenUrl'],
};

/** Extract unique {{var}} names used trong request. Preserves order of first appearance. */
export function extractUsedVariables(req: ApiRequest | null): string[] {
  if (!req) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const scan = (s: string | undefined | null) => {
    if (!s) return;
    if (s.length > MAX_BODY_SCAN_BYTES) {
      console.warn(`[extractor] Skipping scan on ${s.length} byte string (limit ${MAX_BODY_SCAN_BYTES})`);
      return;
    }
    let m: RegExpExecArray | null;
    const re = new RegExp(VAR_PATTERN.source, 'g');
    while ((m = re.exec(s)) !== null) {
      const name = m[1].trim();
      if (!name) continue; // [RED TEAM H12] skip empty {{}}
      if (!seen.has(name)) {
        seen.add(name);
        out.push(name);
      }
    }
  };
  scan(req.url);
  req.params?.forEach(p => { scan(p.key); scan(p.value); });
  req.headers?.forEach(h => { scan(h.key); scan(h.value); });
  if (req.body?.type === 'json' || req.body?.type === 'raw') scan(req.body.content);
  if (req.body?.type === 'form-data' || req.body?.type === 'x-www-form-urlencoded') {
    req.body.pairs?.forEach(p => { scan(p.key); scan(p.value); });
  }
  // [RED TEAM M13] Auth: whitelist per type thay vì Object.values blind.
  if (req.auth && req.auth.type !== 'none') {
    const fields = AUTH_VAR_FIELDS[req.auth.type] ?? [];
    for (const f of fields) {
      const v = (req.auth as Record<string, unknown>)[f];
      if (typeof v === 'string') scan(v);
    }
  }
  return out;
}
```

### Dynamic variables metadata

```ts
// client/src/services/dynamic-variables.ts (extend existing file)

export interface DynamicVariableInfo {
  name: string;       // e.g. "$guid"
  description: string; // e.g. "A v4 style guid"
}

// [VALIDATION S1-Q4] Auto-derive từ `dynamicResolvers` — tránh drift khi thêm resolver mới.
// DESCRIPTIONS là optional lookup; thiếu entry → fallback name. Single source = `dynamicResolvers` keys.
const DESCRIPTIONS: Record<string, string> = {
  $guid: 'A v4 style guid',
  $timestamp: 'Current unix timestamp (seconds)',
  $isoTimestamp: 'Current ISO 8601 timestamp',
  $randomInt: 'Random integer 0–1000',
  $randomEmail: 'Random email address',
  $randomColor: 'Random hex color',
};

const DYNAMIC_REGISTRY: DynamicVariableInfo[] = Object.keys(dynamicResolvers).map(name => ({
  name,
  description: DESCRIPTIONS[name] ?? name,
}));

export function listDynamicVariables(): DynamicVariableInfo[] {
  return DYNAMIC_REGISTRY;
}

export function getDynamicVariableInfo(name: string): DynamicVariableInfo | null {
  const n = name.startsWith('$') ? name : `$${name}`;
  return DYNAMIC_REGISTRY.find(d => d.name === n) ?? null;
}
```

## Implementation Steps

1. `pnpm --filter client add @radix-ui/react-popover`
2. Read current `dynamic-variables.ts` — migrate resolver logic to use `DYNAMIC_REGISTRY`, export `listDynamicVariables`, `getDynamicVariableInfo`
3. Extend `environment-store.ts`:
   - Implement `resolveVariableSource` using `getInterpolationContext` + scan active env + global list
   - Implement `writeVariableValue` — update env variable or global variable via existing `updateVariable` / `updateGlobalVariable`
   - Implement `createVariable` — delegate to `addVariable` / `addGlobalVariable`
4. Create `services/request-variable-extractor.ts` per spec
5. Unit tests:
   - `request-variable-extractor.test.ts` — URL only, body JSON, headers, form-data, auth basic/bearer, no vars, duplicate vars
   - `environment-store.test.ts` (or new) — resolve env vs global vs dynamic vs unresolved, secret flag propagation
6. Run `pnpm --filter client type-check` + `pnpm --filter client test`

## Todo List

- [ ] Add `@radix-ui/react-popover` dep
- [ ] Extend `dynamic-variables.ts` với registry + metadata APIs
- [ ] Add `VariableSource`, `ResolvedVariable` types
- [ ] Implement `resolveVariableSource` in environment-store
- [ ] Implement `writeVariableValue` + `createVariable`
- [ ] Create `request-variable-extractor.ts`
- [ ] Write unit tests cho extractor
- [ ] Write unit tests cho resolver
- [ ] Type-check pass, tests green

## Success Criteria

- `resolveVariableSource('foo')` trả về đúng source cho 4 cases (env/global/dynamic/unresolved)
- Extractor 100% pass test với request phức tạp (URL + all body types + auth + headers)
- Không break existing `interpolate()` behavior
- Dep đã add vào lockfile

## Related Code Files

- `client/package.json`
- `client/src/stores/environment-store.ts`
- `client/src/services/dynamic-variables.ts`
- `client/src/services/request-variable-extractor.ts` (new)
- `client/src/services/interpolation-engine.ts` (reference)
- `client/src/types/models.ts` (ApiRequest shape)

## Security Considerations

- **[RED TEAM C2]** `ResolvedVariable.value` là `string | null`. Khi `secret && !revealed` → `value = null`. Loại bỏ nguồn leak qua React fiber/DevTools khi UI quên check flag.
- **[RED TEAM H5]** `EnvVariable.secret` trong `models.ts` là optional (`secret?: boolean`). Resolver phải normalize: `secret: variable.secret ?? false`.
- **[RED TEAM C3]** `varsToRecord` dùng `Object.create(null)` thay cho plain `{}` để chặn prototype pollution qua tên biến.
- **[RED TEAM H12 · VALIDATION S1-Q3]** `createVariable` validate name: regex `^[a-zA-Z0-9_$.-]+$` (Postman style, no space/Unicode), reject `__proto__|constructor|prototype|''`. Throw lỗi rõ ràng để UI hiển thị.
- **Trust boundary:** `writeVariableValue` / `createVariable` là trusted in-app API. KHÔNG expose ra `window` global. QuickJS sandbox đã có riêng `applyScriptVariables` path — không cross-wire.
- Dynamic vars resolve on-demand (không cache plaintext trong struct).
