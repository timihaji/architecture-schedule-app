# Changelog

All notable changes to the Architecture Schedule App, with enough detail for a future developer (human or AI) to understand what shipped, why, and where to look.

---

## Shipped

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
