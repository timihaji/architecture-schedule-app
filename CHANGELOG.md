# Changelog

All notable changes to the Architecture Schedule App, with enough detail for a future developer (human or AI) to understand what shipped, why, and where to look.

---

## Known Difficulties & Gotchas

These are recurring problems that have come up before. Read this before debugging.

### 1. DataTable overflow clips cell-level popups
`DataTable`'s scroll container uses `overflow: auto`. Any element with `position: absolute` inside a cell will be clipped. **Fix: always use `position: fixed` + `getBoundingClientRect()`** to position dropdowns, pickers, or menus that open from within a table cell. Pattern in `CstRowMenu`.

### 2. "+ Add component" button invisible — DataTable fills viewport height
DataTable renders at `height: calc(100vh - 48px - 48px)`, filling the remaining viewport. Any sibling element placed *below* DataTable in the DOM will be scrolled off-screen. **Fix: place action buttons inside the always-visible `CstTableTopBar`, not after the DataTable.** This was the bug that made "+ Add component" invisible for weeks.

### 3. Column render fns go stale if handlers not in useMemo deps
Column objects are built in a `useMemo`. If a render fn closes over a handler (e.g. `removeComponent`) that changes identity on re-render, it will hold a stale reference. **Fix: use `actionsRef.current` pattern** — a `useRef` populated on every render that column render fns read at call time, not at memo time. Avoids rebuilding columns on every schedule change.

### 4. Browser cache hides pushed changes
The app loads `.jsx` files as `<script>` tags. The browser aggressively caches these. After pushing a change, users must hard refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`) to pick it up. This has caused "I don't see the change" reports even after confirmed pushes.

### 5. `handleFlatOpenRow` / `handleGroupedOpenRow` were nulling `openId`
Originally both row-open handlers called `onOpenPicker` and set `openId = null`, which prevented the side panel from ever rendering. The fix (2026-04-23) changed both to simply `setOpenId(rowId)`. If side panel stops appearing, check these handlers first.

### 6. Components are shared across options (schedule data model)
`schedule.components` is a flat array shared across all options. `schedule.cells` is a map keyed `"optionId:componentId"` → `{ materialId }`. Count/size/unit live on the component, not the cell — editing them changes the value for all options simultaneously. This is intentional but surprises people who expect per-option quantities.

---

## Shipped

---

### 2026-04-23 — CS Table: Option rename + reorder

**Files changed:** `src/CostScheduleTable.jsx`, `src/CostScheduleV2.jsx`

An "Options" bar now appears below the search row in `CstTableTopBar` whenever options + rename handler are provided. Each option chip shows `OPT·01 Name` — click the name to edit inline (input auto-selects, Enter/blur commits, Esc cancels). ← / → arrows reorder. × removes (disabled when only one option remains).

`reorderOption(id, dir)` added to `CostScheduleV2` — swaps the option at `idx` with `idx + dir` in `schedule.options`. `renameOption` and `removeOption` already existed; just needed to be passed through to `CostScheduleTable`.

New component: `CstOptionChip` — self-contained, manages its own `editing` + `draft` state. Width of the rename input tracks `draft.length * 7.5px` to avoid layout jumps.

Props added to `CostScheduleTable`: `renameOption`, `reorderOption`, `removeOption`. All three are now passed from `CostScheduleV2`.

---

### 2026-04-23 — CS Table: Row actions menu (⋯)

**Files changed:** `src/CostScheduleTable.jsx`

Each row in CS Table mode now has a `···` button (far-right `rowActions` column) that opens a dropdown with single-row actions.

**Flat mode items:**
- Change material… (calls `onOpenPicker` for the specific option×component cell)
- Copy to [option] — one item per other option; copies material assignment without clearing source
- *separator*
- Change category… (prompt; calls `setComp(id, 'category', value)`)
- Duplicate component
- Delete component (danger-coloured; confirms before calling `removeComponent`)

**Grouped mode items:**
- Change category… / Duplicate component / Delete component (no copy-to-option since grouped rows span all options)

**Architecture note — why `actionsRef`:**
The `rowActions` column render fn needs live access to `removeComponent`, `duplicateComponent`, `setComp`, `setCellMaterial`, and `schedule`. Adding these to the `buildCstFlatColumns` signature would add them to the `useMemo` deps, causing column objects to rebuild on every cell edit (since `schedule` changes on every `setCellMaterial`). Instead, a `React.useRef` "actions bag" (`actionsRef`) is populated on every render and passed to the column builders — the ref is stable (same object identity), so no extra deps, but render fns always read fresh values via `actionsRef.current`.

**Architecture note — dropdown positioning:**
The DataTable scroll container has `overflow: auto` which clips `position: absolute` dropdowns. The `CstRowMenu` dropdown uses `position: fixed` and measures the trigger button's `getBoundingClientRect()` on open to calculate `top` / `left`. This is reliable and avoids any clipping. The menu closes on `document.mousedown` outside the trigger.

**Known difficulty — overflow clipping in DataTable cells:**
Any popup/dropdown rendered inside a DataTable cell will be clipped by the table's `overflow: auto` scroll container. Always use `position: fixed` + `getBoundingClientRect()` for cell-level dropdowns. Do NOT use `position: absolute` — it will be invisible past the cell boundary.

---

### 2026-04-23 — CS Table: Row side panel

**Files changed:** `src/CostScheduleTable.jsx`

Clicking any row in CS Table mode now opens a right-side drawer panel (the `sidePanel` slot in DataTable).

**Flat mode** (rowId = `"optId:compId"`):
- Header shows component name + category + option badge (OPT·01 etc)
- Swatch tone block (aspect 3:2), material name in serif, then KV rows: Code, Supplier, Finish, Lead time, Unit cost
- "Assign material…" / "Change material…" button at bottom calls `onOpenPicker`
- "No material assigned" empty state when cell is unset

**Grouped mode** (rowId = componentId):
- Header shows component name + category
- Option list: each option row shows OPT badge, swatch dot, material name (or "unassigned"), and a `+` / `↻` button to open the picker for that specific (option, component) pair

Both modes show a **Schedule section** at the bottom with editable Count / Size / Unit fields (click to edit inline, Enter or blur to commit via `setComp`).

Previously `handleFlatOpenRow` and `handleGroupedOpenRow` both called `onOpenPicker` directly and set `openId = null`, which prevented the side panel from ever opening. These are now one line each: `setOpenId(rowId)`.

New components added to `CostScheduleTable.jsx`:
- `CstSidePanel` — main panel, handles both flat and grouped modes
- `CstKV` — key/value row (label + value, returns null if value is empty)
- `CstFieldRow` — editable field row with click-to-edit inline input

---

### 2026-04-23 — CS Table Mode — must-have tier complete

**Files changed:** `src/CostScheduleTable.jsx`, `src/CostScheduleV2.jsx`

All six must-have items for CS Table mode (equal footing with Gallery) are now shipped:

- **+ Add component** — button in `CstTableTopBar` (`onAddComponent` prop). `window.prompt` collects trade/category; calls `appendComponentToCategory` from `CostScheduleV2`. Initially placed as a sibling div below DataTable (invisible — DataTable fills viewport height); fixed by moving into the always-visible top bar.
- **Delete rows** — "Delete rows" button in `CstBulkBar`. Extracts component IDs from the selection (flat: parse `optId:compId`; grouped: use directly), confirms, calls `removeComponent` for each. Bulk bar `deleteRows()` fn at ~line 706.
- **Totals in Grouped mode** — `CstGroupedTotalsFooter` component renders below DataTable in grouped mode. Per-option subtotals; lowest column highlighted in green; other columns show delta vs lowest.
- **Reorder components** — `reorder` column (↑↓ buttons) injected into grouped-mode column catalogue by `buildCstGroupedColumns`. `onMoveUp` / `onMoveDown` props flow from `CostScheduleV2` → `CostScheduleTable` → column builder.
- **Add option** — already worked via `ToolbarV2` (always rendered above table in both modes).
- **Schedule-wide actions** — header + `ToolbarV2` always render in both modes; no changes needed.

---

### 2026-04-23 — P5 · Project Spec — first pass

**Files changed:** `src/ProjectSpec.jsx` (new), `src/App.jsx`, nav wiring

Skeleton shipped:
- Nav item, header + project switcher
- Trade sections (collapsible) with row renderer
- Right-side drawer picker for adding library items
- Empty state
- Subtotals + grand total

Remaining work tracked in `TODO.md` under "P5 · Project Spec".

---

### P3 · Editor blocks

**Files changed:** `src/LibraryTableOverlays.jsx`

Per-kind `PanelKV` blocks in `LibraryTableOverlays` — material / appliance+fitting / light / ffe-* branches render different KV fields in `LTSidePanel`.

---

### Subtype system

**Files changed:** `src/kinds.js` (or inline in data), `src/LibraryTableRows.jsx`, `src/LibraryTableOverlays.jsx`

- `SUBTYPES` vocabulary, `subtypeGlyph` helper, tone-tinted swatch cell
- Subtype glyphs render on table rows + overlay cards

---

### P2 · Library kind tabs

**Files changed:** `src/LibraryTable.jsx`, `src/LTKindTabs.jsx` (or inline)

- `LTKindTabs` live — tabs filter by material kind
- Kind-aware swatch column (tone + glyph)
- New-item flow via `KindPicker`

---

### P1 · Foundation

**Files changed:** `src/data.jsx`, `src/kinds.js`, `src/Library.jsx`

- `KINDS` vocabulary, trades, `tags[]`
- `inferKind` / `inferTrade`
- Item migration
- `readableInk` helper

---

### P4 · Tags (partial)

**Files changed:** `src/LibraryTableRows.jsx`

Tag chips render on Library list rows (`tags` column). Chip input for editing and filter bar not yet wired.
