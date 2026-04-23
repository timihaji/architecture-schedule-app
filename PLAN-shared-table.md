# Plan: shared DataTable across Library + Cost Schedule (+ Spec)

## Why

The Library Table is the most considered view in the app — sticky header, reorderable/resizable/toggleable columns, keyboard nav (j/k/o/e/x/g/G/Esc/?/⌘K), bulk-select with shift-range, inline cell editing, side panel, command palette, cheatsheet, density toggle. We want Cost Schedule and Spec to get all of that, without forking the code.

Currently all that logic lives directly inside `LibraryTable`, `LibraryTableChrome`, `LibraryTableRows`, and `LibraryTableOverlays`, and is hardwired to the Library domain:

- Columns are a module-level constant `LT_COLUMNS` (materials-only fields).
- Filter/sort/selection state lives in `LibraryTable`.
- `onSaveCell` writes to `window.saveMaterialCell`.
- Row click opens `LTSidePanel`, which is material-specific.
- Cell renderers read fields directly off a material record.
- Filters, kind tabs, library sidebar, and bulk bar all assume materials.

To host a Cost Schedule or Spec table we need to pull the table *mechanics* out from the Library *domain knowledge*.

---

## Shape of the refactor

Rename the mechanics `DataTable` and pass the domain in as props/config. One shared component powers three views.

### New file: `src/DataTable.jsx`

Exports a single component:

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

  // slots — the domain-specific chrome lives in the host, not the table
  topBar={<...>}
  kindTabs={<...>}          // optional
  filtersBar={<...>}        // optional
  bulkBar={<...>}           // rendered only when selected.size > 0
  sidePanel={<...>}         // rendered to the right when openId !== null
/>
```

### Column definition

```js
{
  id: 'supplier',
  label: 'Supplier',
  width: 140, minWidth: 90,
  align: 'left',             // 'left' | 'right' | 'center'
  mono: false, serif: false, // typography hint for the generic renderer
  sortable: true,            // default true
  editable: true,            // enables inline edit
  // Field reads — all optional; fall back to r[col.id]
  get:  (r) => r.supplier,              // value used for sort/filter/inline edit
  // Custom rendering — optional
  render: (r, ctx) => <span>…</span>,
  // Search text — optional, for query matching
  searchText: (r) => r.supplier,
}
```

Keep the existing `LT_COLUMNS` definitions but move the render logic into per-column `render` fns so the generic renderer doesn't need to know about swatches, paint inheritance, etc. Anything domain-specific goes in the column definition, not the table.

### Keyboard + selection

Move the full keyboard handler and selection logic from `LibraryTable` into `DataTable`. The parent provides `onOpenRow` / `onEditRow` / `onAdd` — `DataTable` doesn't care what those do.

### Column prefs

Generalize `loadColPref` / `saveColPref` to take a storage key prop. Each host picks its own (`aml-table-cols`, `aml-cs-cols`, `aml-spec-cols`) so the three tables remember their own layouts.

### Side panel slot

`LTSidePanel` is material-specific. Keep it as-is but move its mounting to the host; `DataTable` just renders the slot and controls the open/close state it's given.

---

## Wiring each host

### I · Library (current)

`Library.jsx` / `LibraryTable.jsx` becomes a thin wrapper that:

- Defines the material column catalogue (existing `LT_COLUMNS` with `render` fns lifted from `LibraryTableRows`).
- Renders its existing `LTTopBar`, `LTKindTabs`, `LTFiltersBar`, `LTBulkBar`, `LTSidePanel` as slot children.
- Passes `onSaveCell={window.saveMaterialCell}`.
- Storage key `aml-lt-cols`.

No visible change. The test: open Library, verify everything still works.

### III · Cost Schedule — new table mode

Add a gallery/table toggle to the Schedule header, mirroring Library's.

Schedule is inherently 2D (components × options), so the flat table needs a shape. The most useful version flattens to **one row per (component × option)**:

| Component | Trade | Option | Material | Code | Supplier | Qty | Unit | Unit cost | Line total | Status |
|---|---|---|---|---|---|---|---|---|---|---|

Columns catalogue:
- component, trade, option (three context cols)
- swatch, label, code, supplier, finish (material cols)
- qty, unit, unitCost, lineTotal (numeric)
- kind, category, leadTime
- notes

`onSaveCell` for qty/notes writes back to the schedule's cells map; for supplier/finish/cost edits (if allowed) writes back to the underlying material.

Default visible: component, option, label, qty, unit, lineTotal.

Bulk bar: "Duplicate to option…" / "Move to option…" / "Clear assignment".

Storage key `aml-cs-cols`.

### IV · Spec — new table mode

Add the same toggle to Spec header. Spec is already 1D so the table maps cleanly:

| Swatch | Trade | Material | Code | Supplier | Note | Qty | Unit | Unit cost | Line total | Tags |

`onSaveCell` updates `spec.rows[id]`.

Bulk bar: "Move to trade…" / "Remove from spec" / "Promote to Cost Schedule".

Storage key `aml-spec-cols`.

---

## Open questions — answered

- **Cost Schedule row shape** — **both**, togglable inside Table mode. Flat (row per component × option) is the default because it unlocks sort/filter/keyboard nav; Grouped (row per component, options as columns) is an alt for users who prefer the grid mental model.
- **Editable cells in CS table** — qty + notes on the schedule row only. Supplier / finish / unit cost / lead time would write back to the underlying Library material and affect other projects, so they live in the side panel where there's context, not in the table.
- **Side panel** — reuse Library's material panel for speed; prepend a small row-scoped header showing qty, notes, and which option(s)/trade this instance lives in. One panel, both views.
- **Spec default columns** — Swatch · Trade · Material · Supplier · Note · Qty · Unit · Line total · Tags. Code, unit cost, lead time, kind, finish toggleable.
- **CS default columns** — flat: Component · Option · Material · Qty · Unit · Line total. Grouped: Component · Trade · Qty · Unit + one column per option (line total per cell).
- **CS bulk actions** — Clear assignment, Duplicate to option…, Move to option…, Set common qty, Copy as supplier list.
- **Spec bulk actions** — Move to trade…, Add tag, Remove from spec, Promote to Cost Schedule, Copy as supplier list.
- **Shift-click for range select** — already in `LibraryTable.selectRange`; extracts into `DataTable` so every host gets it automatically. Mentioned here so it isn't lost during the refactor.
- **Ship order** — refactor first (DataTable under Library, zero visible change), then CS table, then Spec table.

---

## Migration plan (ordered commits)

1. **Extract** — rename `LibraryTable.jsx` internals to a generic `DataTable.jsx`. Keep `LibraryTable.jsx` as a wrapper that composes `DataTable` with the material columns + existing slots. Verify Library still works.
2. **Columns-as-render-fns** — move per-cell rendering out of `LTRow` into column `render` fns. Delete the big switch in `LibraryTableRows`. Verify.
3. **Cost Schedule table mode** — add a gallery/table toggle to Schedule header. Build the materials-on-schedule column catalogue. Wire `onSaveCell`. Ship behind the v2 toggle (users can keep using the grid). Verify.
4. **Spec table mode** — same pattern for Spec. Verify.

Each step is independently shippable and keeps the Library table working.

---

## Open questions for Shaun

*(answered — see the Open questions — answered section above.)*
