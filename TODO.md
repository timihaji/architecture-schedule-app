# Architecture Schedule App — Plan & Remaining Work

---

# Plan: Shared DataTable across Library + Cost Schedule + Spec

## Why

The Library Table is the most considered view in the app — sticky header, reorderable/resizable/toggleable columns, keyboard nav (j/k/o/e/x/g/G/Esc/?/⌘K), bulk-select with shift-range, inline cell editing, side panel, command palette, cheatsheet, density toggle. We want Cost Schedule and Spec to get all of that, without forking the code.

Currently all that logic lives directly inside `LibraryTable`, `LibraryTableChrome`, `LibraryTableRows`, and `LibraryTableOverlays`, hardwired to the Library domain:

- Columns are a module-level constant `LT_COLUMNS` (materials-only fields).
- Filter/sort/selection state lives in `LibraryTable`.
- `onSaveCell` writes to `window.saveMaterialCell`.
- Row click opens `LTSidePanel`, which is material-specific.
- Cell renderers read fields directly off a material record.
- Filters, kind tabs, library sidebar, and bulk bar all assume materials.

To host a Cost Schedule or Spec table we need to pull the table *mechanics* out from the Library *domain knowledge*.

---

## Shape of the Refactor

Rename the mechanics `DataTable` and pass the domain in as props/config. One shared component powers three views.

### New file: `src/DataTable.jsx`

```
<DataTable
  rows={...}               // array of row records (any shape)
  getRowId={r => r.id}

  columns={[...]}           // full column catalogue — see below
  colStorageKey="lt-columns"// where to persist visible/order/widths
  defaultVisible={[...]}    // column ids to show if no saved pref
  defaultOrder={[...]}      // column ids in initial order

  query={q}                 // controlled from parent so search stays in topbar
  setQuery={setQ}
  filters={...} setFilters={...}
  sort={...} setSort={...}
  selected={...} setSelected={...}   // Set of row ids
  cursorId={...} setCursorId={...}
  openId={...} setOpenId={...}
  editingCell={...} setEditingCell={...}
  density="regular"

  onSaveCell={(id, field, value) => ...}
  onOpenRow={id => ...}     // keyboard 'o' / Enter
  onEditRow={id => ...}     // keyboard 'e'
  onAdd={() => ...}         // keyboard 'c'

  // slots — domain-specific chrome lives in the host, not the table
  topBar={<...>}
  kindTabs={<...>}          // optional
  filtersBar={<...>}        // optional
  bulkBar={<...>}           // rendered only when selected.size > 0
  sidePanel={<...>}         // rendered to the right when openId !== null
/>
```

### Column Definition

```js
{
  id: 'supplier',
  label: 'Supplier',
  width: 140, minWidth: 90,
  align: 'left',             // 'left' | 'right' | 'center'
  mono: false, serif: false, // typography hint for the generic renderer
  sortable: true,            // default true
  editable: true,            // enables inline edit
  get:  (r) => r.supplier,   // value used for sort/filter/inline edit
  render: (r, ctx) => <span>…</span>,   // optional custom render
  searchText: (r) => r.supplier,        // optional, for query matching
}
```

Keep the existing `LT_COLUMNS` definitions but move render logic into per-column `render` fns so the generic renderer doesn't need to know about swatches, paint inheritance, etc.

### Keyboard + Selection

Move the full keyboard handler and selection logic from `LibraryTable` into `DataTable`. The parent provides `onOpenRow` / `onEditRow` / `onAdd` — `DataTable` doesn't care what those do. Shift-click range select (already in `LibraryTable.selectRange`) extracts into `DataTable` so every host gets it automatically.

### Column Prefs

Generalize `loadColPref` / `saveColPref` to take a storage key prop. Storage keys per host: `aml-lt-cols`, `aml-cs-cols`, `aml-spec-cols`.

### Side Panel Slot

`LTSidePanel` is material-specific — keep it as-is but move its mounting to the host. `DataTable` just renders the slot and controls the open/close state it's given.

---

## Wiring Each Host

### I · Library (current)

`Library.jsx` / `LibraryTable.jsx` becomes a thin wrapper that:
- Defines the material column catalogue (existing `LT_COLUMNS` with `render` fns lifted from `LibraryTableRows`).
- Renders its existing `LTTopBar`, `LTKindTabs`, `LTFiltersBar`, `LTBulkBar`, `LTSidePanel` as slot children.
- Passes `onSaveCell={window.saveMaterialCell}`.
- Storage key `aml-lt-cols`.

No visible change. Test: open Library, verify everything still works.

### III · Cost Schedule — new table mode

Add a gallery/table toggle to the Schedule header, mirroring Library's.

Flat layout (one row per component × option):

| Component | Trade | Option | Material | Code | Supplier | Qty | Unit | Unit cost | Line total | Status |

Columns: component, trade, option · swatch, label, code, supplier, finish · qty, unit, unitCost, lineTotal · kind, category, leadTime · notes

Default visible: component, option, label, qty, unit, lineTotal.

`onSaveCell`: qty/notes writes to schedule's cells map; supplier/finish/cost edits live in the side panel (writes back to Library material, would affect other projects).

Bulk bar: "Duplicate to option…" / "Move to option…" / "Clear assignment" / "Set common qty" / "Copy as supplier list".

Side panel: reuse Library's material panel with a small row-scoped header (qty, notes, which option/trade).

Note: both flat and grouped layouts are available (togglable inside Table mode). Flat is default; Grouped (row per component, options as columns) is alt.

Storage key `aml-cs-cols`.

### IV · Spec — new table mode

Add the same toggle to Spec header. Spec is already 1D so the table maps cleanly:

| Swatch | Trade | Material | Code | Supplier | Note | Qty | Unit | Unit cost | Line total | Tags |

Default visible: Swatch · Trade · Material · Supplier · Note · Qty · Unit · Line total · Tags. Code, unit cost, lead time, kind, finish are toggleable.

`onSaveCell` updates `spec.rows[id]`.

Bulk bar: "Move to trade…" / "Add tag" / "Remove from spec" / "Promote to Cost Schedule" / "Copy as supplier list".

Storage key `aml-spec-cols`.

---

## Migration Plan (Ordered Commits)

1. **Extract** — rename `LibraryTable.jsx` internals to a generic `DataTable.jsx`. Keep `LibraryTable.jsx` as a wrapper composing `DataTable` with material columns + existing slots. Verify Library still works.
2. **Columns-as-render-fns** — move per-cell rendering out of `LTRow` into column `render` fns. Delete the big switch in `LibraryTableRows`. Verify.
3. **Cost Schedule table mode** — add gallery/table toggle to Schedule header. Build the materials-on-schedule column catalogue. Wire `onSaveCell`. Ship behind the v2 toggle. Verify.
4. **Spec table mode** — same pattern for Spec. Verify.

Each step is independently shippable and keeps the Library table working.

---

---

# Remaining Work

_Last updated by Claude after P5 first pass landed._

## P5 · Project Spec (IV) — in progress

The skeleton shipped (nav item, header + project switcher, trade sections, row renderer, right-side drawer picker, empty state, subtotals + grand total). Remaining:

- [ ] **Dedupe warn dialog** — when picking a material already in the spec, offer *Replace existing row / Add a second row / Cancel* instead of silently adding a duplicate.
- [ ] **Tags on rows** — inline editor (chip input) per row, using `STARTER_TAGS` for suggestions. Filter pills at top are wired but there's no UI to attach tags yet.
- [ ] **Row click → Library item overlay** — open a read-only side panel showing the full Library record (spec, lead time, finish, linked paint, etc.) so you don't have to leave Spec to check details.
- [ ] **CS bridge**
  - Top-bar bulk action: "Send all to Cost Schedule" (creates one Option with every row as a component).
  - Per-row "Promote to Cost Schedule" menu item.
- [ ] **Drag-reorder trade sections** and rows within a section (reuse `CostScheduleDnD` if compatible).
- [ ] **Seed fix for p-brunswick** — current seed looks items up by code fragment (`TIM`, `VEN`, etc.) but those don't match the actual library codes, so it falls back to empty. Pick real ids from `data.jsx` so new Brunswick sessions ship with a populated spec.
- [ ] **Supplier roll-up / export** — group rows by supplier for a "send this list to each trade" view; copy-to-clipboard or CSV export.

## P4 · Tags (Library) — partial

- [ ] **Tag chip input in Library editor** — inline chip input with `STARTER_TAGS` autocomplete suggestions when editing an item.
- [ ] **Tag filter bar in Library top chrome** — `STARTER_TAGS` is defined but not yet wired as a filter control.

## P2 · Kinds & Subtypes — optional polish

- [ ] **KindPicker shows subtype tiles** after a kind is chosen (step 2 of new-item creation).
- [ ] **Editor exposes a subtype picker** so users can change subtype post-creation.

## DnD Polish (Cost Schedule v2)

- [ ] **Fix grip cursor** — I-beam bleeds over drag handle in some browsers.
- [ ] **Pickup micro-animation** when the grip is pressed (small scale-down or pop).
- [ ] **Ghost rotation + growing shadow** as the drag moves further from origin.

## III · Cost Schedule Table Mode

### Already shipped
- Gallery/Table toggle in Schedule header (persisted)
- Flat mode — one row per (component × option): Component, Trade, Option, Swatch, Material, Code, Supplier, #, Size, Unit, Unit cost, Line total
- Grouped mode — one row per component; each option becomes a column with inline swatch + material label
- Row-shape toggle (Flat / Grouped) in table top bar, persisted separately from Library's
- Inline editing for Count / Size / Unit
- Click material cell → opens material picker
- Search, sort, column show/hide/reorder/resize (from shared DataTable)
- Bulk bar: Duplicate to option, Move to option, Set size, Copy as supplier list, Clear assignment

### Must-have to ship Table mode as equal footing with Gallery
- [x] **Add a component** — "+ Add component" button in table top bar, prompts for trade/category.
- [x] **Delete a component** — "Delete rows" in bulk bar removes components and all their assignments.
- [x] **Totals in Grouped mode** — per-option subtotals footer with lowest highlighted and deltas.
- [x] **Add an option** — already worked via ToolbarV2 (always rendered above table).
- [x] **Reorder components** — ↑↓ buttons in reorder column (grouped mode).
- [x] **Schedule-wide actions accessible from Table mode** — Header + ToolbarV2 always render in both modes.

### Quality-of-life next
- [x] **Row side panel** — click a row to see full material details / edit component in a side drawer (mirrors Library Table).
- [x] **Row actions menu (⋯ on hover)** — delete, duplicate, move-to-option, change-category as single-row affordances.
- [x] **Option rename** — no UI in Table mode.
- [x] **Option reorder** — no UI in Table mode.
- [x] **Per-trade subtotals** — group rows under collapsible Trade headers with subtotals.
- [x] **Change component category/trade** — category is read-only in Table mode.

### Nice-to-have
- [ ] **Filter chips** — Library Table has "+ Add filter"; Schedule Table doesn't.
- [ ] **Saved views as tabs** — Library has them; Schedule Table doesn't.
- [ ] **Bulk action: Delete rows** — missing from bulk bar.
- [ ] **Supplier list format audit** — verify "Copy as supplier list" output is grouped by supplier with quantities rolled up, not a flat dump.
- [ ] **Duplicate a single component** — bulk bar requires selection; no single-row shortcut.

### Grouped mode specifics
- [ ] **"Assign…" empty cells** — empty option cells should be click-to-open-picker (may already work; needs verification).
- [ ] **Material label truncation** — long names are harsh in Grouped mode; needs tooltip or ellipsis with full name on hover.

### Keyboard shortcuts (inherit from DataTable — need validation in CS context)
- [x] Validate J/K navigation, E (edit), D (delete), ⌘-click row select all work correctly in CS table.

---

## Supabase Migration

localStorage is prototype-only. Project data (materials, schedules, specs) is vulnerable to browser wipes, unavailable across devices, and has no audit trail. The synchronous save + indicator fix is a band-aid for now — not the real fix.

### Now (band-aid)
- [ ] **Synchronous save + save indicator** — reduces the race window so data isn't lost while iterating on the UI.

### Next milestone — migrate to Supabase

Schema:

| Table | What it stores |
|---|---|
| `materials` | library entries (currently `aml-materials`) |
| `libraries` | library definitions + membership |
| `projects` | project records |
| `cost_schedules` | one row per (project, option, component) — currently `aml-schedule-*` |
| `spec_rows` | project spec line items — currently `aml-spec-*` |
| `label_templates` | per-studio label format config |

Auth via Supabase Auth (`users` + `studios` + `memberships`). Swatch photos and spec PDFs go to Supabase Storage. UI keeps a TanStack Query cache so it still feels instant.

- [ ] **Schema design** — define all tables, relationships, RLS policies.
- [ ] **Auth flow** — wire up Supabase Auth (users, studios, memberships).
- [ ] **Data migration** — migrate existing localStorage data into Supabase on first login.
- [ ] **Replace localStorage reads/writes** — swap every `useState` / `useEffect(setItem)` pair with TanStack Query + mutations for: `materials`, `libraries`, `projects`, `cost_schedules`, `spec_rows`, `label_templates`.
- [ ] **Supabase Storage** — swatch photos and spec PDFs.

### Keep in localStorage forever (UI prefs only)
`aml-settings`, `aml-view`, `aml-library-mode`, `aml-cs-mode`, `aml-cs-rowshape`, all column pref keys, `aml-active-library`, `aml-active-project`.
