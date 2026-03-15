# Design Guidelines — Localman

> Dark-first desktop API client. Offline-first, Tauri + React + TypeScript.

## Prerequisites — READ BEFORE IMPLEMENTING

**Before creating or modifying any UI component:**
1. Read this entire document for design tokens, patterns, and conventions
2. Open `localman-design-system.pen` in Pencil app to see visual reference (36 components + 26 screens)
3. Check existing components in `src/components/` — reuse before creating new

**Design file:** `localman-design-system.pen` — Contains:
- Design Tokens (colors, HTTP methods, spacing swatches)
- Reusable Components (buttons, inputs, tabs, badges, toggles, toasts, cards, modal)
- App Layout (full 1440×900 main screen)
- Context Menus (collection, folder, request) + Dropdown Menus
- Selectors (auth type, body type, sidebar icon tabs, response actions)
- Request Tab States (Params, Auth, Headers, Body with content variants)
- Settings Pages (General, Editor, Proxy, Data, Account & Workspaces, About)
- Modals (Name Input, Save Request, Import, Export, Keyboard Shortcuts, Environment Manager, Conflict Resolution)

## Color System

### Core Backgrounds
| Token | Value | Usage |
|---|---|---|
| `--color-bg-primary` | `#0B1120` | Page background, main canvas |
| `--color-bg-secondary` | `#0F172A` | Surface panels (sidebar, titlebar, status bar) |
| `--color-bg-tertiary` | `#1E293B` | Elevated surfaces, hover states, borders |
| `--color-accent` | `#3B82F6` | Primary actions, active states, links |
| `--color-accent-hover` | `#60A5FA` | Accent hover state |

### Text Colors
| Token | Value | Usage |
|---|---|---|
| `--foreground` | `#F8FAFC` | Primary text (slate-50) |
| `--muted` | `#94A3B8` | Secondary text, descriptions (slate-400) |
| Tailwind `text-slate-500` | `#64748B` | Muted labels, placeholders |
| Tailwind `text-slate-600` | `#475569` | Disabled, inactive text |

### HTTP Method Colors
| Method | Token | Value | Tailwind |
|---|---|---|---|
| GET | `--color-method-get` | `#10B981` | `text-emerald-500` |
| POST | `--color-method-post` | `#3B82F6` | `text-blue-500` |
| PUT | `--color-method-put` | `#F59E0B` | `text-amber-500` |
| DELETE | `--color-method-delete` | `#EF4444` | `text-red-500` |
| PATCH | `--color-method-patch` | `#8B5CF6` | `text-violet-500` |

### Status Colors
| Status | Color | Usage |
|---|---|---|
| Success | `#10B981` (emerald-500) | 2xx responses, connected, ready |
| Warning | `#F59E0B` (amber-500) | 3xx, slow responses |
| Error | `#EF4444` (red-500) | 4xx/5xx, connection failed |
| Info | `#38BDF8` (sky-400) | Informational badges |

## Typography

### Font Families
| Token | Font | Usage |
|---|---|---|
| `--font-sans` | Inter | UI text, labels, buttons, headings |
| `--font-mono` | JetBrains Mono | URLs, code, JSON, method badges, status codes, timestamps |

### Type Scale
| Size | Weight | Usage |
|---|---|---|
| 16px | 600 | Modal titles, section headings |
| 14px | 500-600 | Tab labels, sidebar items, button text |
| 13px | 400-500 | Body text, input values, descriptions |
| 12px | 500 | Request tab names, environment labels |
| 11px | 600-700 | Method badges, status badges, mono labels |
| 10px | 400 | Status bar text, metadata |

### Font Weight Convention
- **700**: HTTP method badges, hero metrics
- **600**: Section headers, active tabs, badge text
- **500**: Button labels, sidebar items, input labels
- **400**: Body text, descriptions, placeholders

## Spacing & Layout

### Base Unit
4px grid system. All spacing is multiples of 4px.

### Spacing Scale (Tailwind)
| Token | Value | Usage |
|---|---|---|
| `--spacing-1` | 4px (1) | Micro gaps (icon-to-text in small badges) |
| `--spacing-2` | 8px (2) | Small gaps (between form elements, padding-sm) |
| `--spacing-3` | 12px (3) | Medium gaps (sidebar item padding, card gap) |
| `--spacing-4` | 16px (4) | Standard gaps (section padding, content areas) |
| 20px (5) | | Card padding |
| 24px (6) | | Large section gaps |
| 32px (8) | | Page-level padding |

### Border Radius
| Value | Usage |
|---|---|
| `4px` (rounded) | Small elements: checkboxes, code blocks |
| `6px` (rounded-md) | Buttons, inputs, badges, sidebar items |
| `8px` / `--radius-default` | Cards, panels, dropdown menus |
| `12px` / `--radius-lg` | Modals, large containers |
| `100px` (rounded-full) | Pills, status badges, toggle knobs |

## Component Patterns

### Buttons
```
Primary:    bg-accent text-white rounded-md px-4 py-2 font-medium
Secondary:  bg-tertiary border-border text-primary rounded-md px-4 py-2
Ghost:      text-muted hover:bg-tertiary rounded-md px-4 py-2
Destructive: bg-red-500 text-white rounded-md px-4 py-2
Icon:       p-2 rounded-md text-muted hover:bg-tertiary
```

### Inputs
```
Default: bg-bg-primary border border-tertiary rounded-md px-3 py-2.5 text-sm
         placeholder:text-slate-500 focus:border-accent
Search:  Same + search icon left + keyboard shortcut badge right
Select:  Same + chevron-down icon right
```

### Tabs
```
Active:   border-b-2 border-accent text-foreground font-medium px-4 py-2
Default:  text-muted hover:text-foreground px-4 py-2
```

### Badges
```
Status:  px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono
         bg-{color}/20 text-{color}
Method:  px-2 py-0.5 rounded text-[11px] font-bold font-mono
         text-method-{method}
```

### Cards
```
Container: bg-secondary border border-tertiary rounded-lg p-5 space-y-3
Title:     text-[15px] font-semibold text-foreground
Desc:      text-sm text-muted
```

### Modal
```
Overlay:  fixed inset-0 bg-black/60 backdrop-blur-sm
Container: bg-secondary border border-tertiary rounded-xl shadow-2xl max-w-md
Header:   px-5 py-4 border-b border-tertiary flex justify-between items-center
Body:     p-5
Footer:   px-5 py-3 border-t border-tertiary flex justify-end gap-2
```

### Toast
```
Container: bg-tertiary border border-tertiary rounded-lg shadow-xl px-4 py-3
           flex items-center gap-2.5
Icon:      status color (success=emerald, error=red)
Message:   text-sm text-foreground
Close:     text-muted hover:text-foreground
```

## App Layout Structure

```
+----------------------------------------------------------+
| Titlebar: Logo | Request Tabs | Sync Status              | h:40px
+----------------------------------------------------------+
| Env Bar: Selector | Variable preview                     | h:36px
+------+-----------+---------------------------------------+
|      | Method|URL|Send                                   |
| Side | Req Tabs: Params|Auth|Headers|Body|Scripts|Tests   |
| bar  +-----------+---------------------------------------+
| 260  | Request   | Response                              |
| px   | Content   | Status: 200 OK  245ms  1.2 KB         |
|      |           | Tabs: Body|Headers|Cookies|Tests       |
|      |           | JSON viewer                            |
+------+-----------+---------------------------------------+
| Status: DB status | Request count | Last sync            | h:24px
+----------------------------------------------------------+
```

### Sidebar
- Width: 260px, bg-secondary, border-right
- Search bar at top
- Section headers: uppercase, 11px, semibold, tracking-wider, text-muted
- Collection items: folder icon + name, 13px
- Tree items: indented with chevron-right + file icon
- Active item: bg-accent/20 + text-accent icon

### Request Bar
- Method selector: bg-tertiary, JetBrains Mono, bold, method-colored
- URL input: fill remaining width, font-mono for URL display
- Send button: bg-accent, "Send" label

### Status Bar
- Height: 24px, bg-secondary, border-top
- Left: DB status (green dot) + request count
- Right: Last sync timestamp
- All text: JetBrains Mono, 10px, text-muted

## Tailwind CSS Usage Convention

### Use CSS variables via arbitrary values
```tsx
className="bg-[var(--color-bg-primary)]"
className="text-[var(--color-accent)]"
className="border-[var(--color-bg-tertiary)]"
```

### Use Tailwind slate palette for grays
```tsx
text-slate-200  // bright text
text-slate-400  // secondary text (matches --muted)
text-slate-500  // muted labels
text-slate-600  // disabled
bg-slate-800    // subtle backgrounds
```

### Transitions
All interactive elements: `transition-colors duration-200` or `transition-all duration-200`.

## Icon System

**Library:** Lucide React (`lucide-react`)
**Default size:** 16px (w-4 h-4) for inline, 18px for standalone
**Stroke:** Default (1.5px)

### Common Icons
| Action | Icon | Context |
|---|---|---|
| Add | `Plus` | New request, new collection |
| Delete | `Trash2` | Remove items |
| Search | `Search` | Search bars |
| Settings | `Settings` | Settings page |
| Folder | `Folder`, `FolderOpen` | Collections |
| File | `FileText` | Request items |
| Send | `Send` | Send request |
| Copy | `Copy` | Copy to clipboard |
| Close | `X` | Close tabs, dismiss |
| Chevron | `ChevronDown`, `ChevronRight` | Dropdowns, tree expand |
| Globe | `Globe` | Environment indicator |

## Accessibility

- Focus rings: `focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary`
- Min touch target: 32px for interactive elements
- Color contrast: all text meets WCAG AA on dark backgrounds
- Keyboard nav: `Ctrl+Enter`=Send, `Ctrl+T`=New tab, `Ctrl+Z`=Undo

## Radix UI Primitives

All overlays use Radix UI: `@radix-ui/react-dialog`, `@radix-ui/react-context-menu`, `@radix-ui/react-select`, `@radix-ui/react-dropdown-menu`.

## Modal/Dialog Pattern

### Base Template (Radix Dialog)
```
Overlay:   fixed inset-0 bg-black/50 z-40
Content:   fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
           w-full max-w-sm rounded-lg
           border border-[var(--color-bg-tertiary)]
           bg-[var(--color-bg-secondary)] p-4 shadow-lg z-50
Title:     text-sm font-medium (or font-semibold for larger modals)
```

### Input Field (inside modals)
```
rounded border border-[var(--color-bg-tertiary)]
bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-slate-200
placeholder:text-slate-600
focus:border-[var(--color-accent)] focus:outline-none
```

### Modal Buttons
```
Submit:  rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white
         hover:opacity-90 disabled:opacity-50
Cancel:  rounded px-3 py-1.5 text-sm text-gray-400 hover:text-[var(--foreground)]
Danger:  text-red-400 hover:bg-red-500/10 hover:text-red-300
```

### Modal Catalog

| Dialog | Max Width | Trigger | Content |
|---|---|---|---|
| Name Input (base) | `max-w-sm` | Create/rename actions | Single text input + Cancel/Confirm |
| Create Collection | `max-w-sm` | Right-click → New Collection | Wraps NameInputDialog |
| Create Folder | `max-w-sm` | Right-click → New Folder | Wraps NameInputDialog |
| Move Request | `max-w-md` | Right-click → Move | Collection + folder dropdowns |
| Save Request | `max-w-md` | Ctrl+S on draft | Name input + collection/folder selects |
| Import | `max-w-md` | Menu → Import | Tabs: File (drag-drop) / cURL (textarea) |
| Export | `max-w-md` | Right-click → Export | Radio: Postman v2.1 / Localman JSON |
| Keyboard Shortcuts | `max-w-sm` | Ctrl+/ | Categorized shortcut list with `<kbd>` |
| Environment Manager | `max-w-3xl` | Settings → Environments | Split: sidebar (env list) + main (variable table), `h-[70vh]` |
| Conflict Resolution | `max-w-lg` | Auto on sync conflict | Warning title, per-field diffs, bulk accept buttons, `max-h-[80vh]`, overlay `bg-black/60` |
| Workspace Members | `max-w-md` | Settings → Members | Scrollable member list + role dropdowns, `max-h-[80vh]` |
| Workspace Invite | `max-w-sm` | Members → Invite | Email input + role selector |

### Import Dialog — Special Elements
```
Tab buttons:
  Active:   bg-[var(--color-bg-tertiary)] text-[var(--color-accent)]
  Inactive: text-gray-400 hover:text-slate-200

File drop zone:
  rounded-lg border border-dashed border-slate-600 py-8 px-4
  hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]

cURL textarea:
  min-h-[100px] w-full font-mono text-sm
  (same input styling as above)
```

### Environment Manager — Split Layout
```
Container: flex h-[70vh] w-full max-w-3xl flex-col rounded-lg shadow-lg

Sidebar (w-52):
  border-r border-[var(--color-bg-tertiary)] p-2

  Active env:  bg-[var(--color-accent)]/20 text-[var(--color-accent)]
  Default env: text-slate-400 hover:bg-white/5 hover:text-slate-200
  Delete btn:  opacity-0 group-hover:opacity-100
               hover:bg-red-500/10 hover:text-red-500

Main: min-w-0 flex-1 overflow-auto p-4
Footer: border-t px-4 py-2 flex justify-end
```

### Conflict Resolution — Special Elements
```
Overlay: bg-black/60 (darker than standard)
Title:   text-yellow-400 (warning color)
Auto-merged: text-[10px] text-green-400

Bulk buttons:
  px-2 py-1 text-[10px] text-gray-400
  Server: hover:bg-green-500/10 hover:text-green-400
  Mine:   hover:bg-blue-500/10 hover:text-blue-400
```

## Context Menu Pattern

### Base Template (Radix ContextMenu)
```
Content:   min-w-[180px] rounded-lg py-1 shadow-lg z-50
           border border-[var(--color-bg-tertiary)]
           bg-[var(--color-bg-secondary)]
Item:      px-3 py-1.5 text-sm outline-none cursor-pointer
           hover:bg-[var(--color-bg-tertiary)]
Separator: h-px bg-[var(--color-bg-tertiary)] my-1
Danger:    text-red-400 (for Delete items)
Submenu:   SubTrigger has ChevronRight icon, SubContent same styling
```

### Context Menu by Node Type

| Node | Menu Items |
|---|---|
| Collection | New Request, New Folder, ----, Rename, Export, Toggle Sync, Move to… (submenu), ----, Delete |
| Folder | New Request, New Sub-folder, ----, Rename, ----, Delete |
| Request | Copy as cURL, Duplicate, Move, Rename, ----, Delete |

### Collection Tree Item Styling
```
Row: flex items-center gap-1 py-1 px-2 rounded cursor-pointer min-h-8
     hover:bg-[var(--color-bg-tertiary)]
     paddingLeft: 8 + depth * 16  (hierarchical indent)

Collection: folder icon text-[var(--color-accent)], count badge text-xs text-gray-500
Folder:     FolderOpen icon text-gray-500
Request:    method badge (bg-{color}20 text-{color}, w-12 text-xs font-medium rounded px-1.5 py-0.5)
```

## Dropdown/Select Pattern

### Base Template (Radix Select)
```
Trigger: flex items-center justify-between
         rounded border border-[var(--color-bg-tertiary)]
         bg-[var(--color-bg-secondary)] px-3 py-2 text-sm
         hover:bg-[var(--color-bg-tertiary)]
         focus:ring-1 focus:ring-[var(--color-accent)]

Content: overflow-hidden rounded-lg shadow-lg z-50
         border border-[var(--color-bg-tertiary)]
         bg-[var(--color-bg-secondary)]
         position="popper" sideOffset={4}

Item:    px-3 py-1.5 text-sm cursor-pointer outline-none
         hover:bg-[var(--color-bg-tertiary)]
```

### Dropdown Catalog

| Selector | Min Width | Special Styling |
|---|---|---|
| HTTP Method | `min-w-[100px]` | `font-mono font-medium`, color per method via inline style |
| Environment | `min-w-[140px]` | `rounded-lg`, globe icon, text-left |
| Workspace Switcher | `min-w-[200px]` | DropdownMenu (not Select), checkmark for active, role badges |
| Role (Members) | auto | `text-xs`, compact `px-2 py-1` |
| Role (Invite) | auto | Standard `px-3 py-2 text-sm` |

### Workspace Switcher — Special Elements
```
Trigger: flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-sm
         text-slate-200 hover:bg-[var(--color-bg-tertiary)]

Role badges: text-[10px] font-medium uppercase
  owner:  text-yellow-400
  admin:  text-blue-400
  editor: text-green-400
  viewer: text-slate-400

Checkmark: h-3.5 w-3.5 text-[var(--color-accent)]
```

## Request Tab Bar

```
Container: flex border-b border-[var(--color-bg-tertiary)] bg-[#0B1120] h-[37px]

Tab (active):
  min-w-[120px] max-w-[200px] rounded-t-lg
  border-t border-x border-[var(--color-bg-tertiary)]
  bg-[var(--color-bg-secondary)] text-[var(--foreground)]
  px-3 py-2 text-sm

Tab (inactive):
  border-transparent text-slate-400
  hover:bg-[var(--color-bg-tertiary)] hover:text-slate-200

Method badge: font-mono font-medium, inline style color per method
Dirty dot:    h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]
Close btn:    opacity-0 group-hover/tab:opacity-100
New tab btn:  p-1.5 text-slate-500 hover:text-slate-200 hover:bg-white/5
```

## Response Actions
```
Container: flex gap-2 border-b border-[var(--color-bg-tertiary)] px-3 py-2 bg-[#0B1120]
Buttons:   flex items-center gap-1.5 rounded-lg px-3 py-1.5
           text-xs font-medium text-slate-400
           hover:bg-slate-800/50 hover:text-slate-200
```

## Anti-Patterns (Do NOT)

- No hardcoded hex colors — always use CSS variables or Tailwind slate palette
- No `text-white` for body text — use `text-slate-200` or `text-[var(--foreground)]`
- No manual save buttons — auto-save on every change
- No modals for minor feedback — use toast notifications only
- No browser fetch for API calls — use Tauri HTTP plugin only
- No mixing density modes — keep consistent spacing within screens
