# v2.0 backlog (parked from v1)

Decisions during the v1 planning session on 2026-04-27 narrowed what's actually parked. The taxonomy-v3 SchedulePage and the new data shape (`products` / `rooms` / `schedules` per project / `taxonomies` singleton) **ship in v1**. Only the Type/Assembly axis as a UI surface, plus a handful of polish features, are deferred.

## 1. Type / Assembly axis as a UI surface

The data layer ships in v1: `taxonomies.typeTemplates` is seeded; the schedule row shape supports `specRef.kind === 'type'`; the helper functions (`applicableTypeTemplates`, `deriveTrade` for Type rows) all exist. v1 hides the UI behind a `window.SHOW_TYPES` flag (off in v1, on in v2 + accessible during dev).

**What hides in v1:**
- Schedule's Type-row card variant (the green dashed code badge in place of the swatch)
- ItemPickerDrawer's Types section (green pill rows above Products)
- ItemPickerDrawer's `+ Add new Type` footer button
- Library: no Types tab in v1; Library is a single Products view
- TypeEditor.jsx (modal not invoked)
- Sage `--good` accent: defined in tokens, not used by any v1 UI

**What's needed to ship in v2:**
1. Flip `window.SHOW_TYPES = true` (or move from window flag to `appState.settings.featureFlags.types`).
2. Reintroduce Library tabs (Products + Types) on the Library page. The TabBar atom already exists; just needs wiring.
3. Resurrect the parked [src/LibraryTabs.jsx](../src/LibraryTabs.jsx) — but rebuild on top of v1's atoms (tokens already match; the markup needs adaptation).
4. **Build the Assembly Editor properly.** The current [src/TypeEditor.jsx](../src/TypeEditor.jsx) is functional but doesn't match the design — pick a layout from `design/handoff/designs/Assembly Editor Options.html`:
   - **Dense ledger** (recommended per design notes) — spreadsheet-style slot table with horizontal stack visualisation strip on top
   - **Sidecar split** — 60/40 with detail pane on right
   - **Stacked card** — vertical, mobile-friendly
5. **Stack visualisation atom** — horizontal coloured bands proportioned to each slot's `thicknessMm`. New atom; only used by Assembly Editor.
6. Light up sage selection states (Library row selection, picker Types pill, code badge).

## 2. Library Switcher: per-library palette swatches

The design's switcher (`design/handoff/designs/Library Switcher.html`) shows each library with a 4–5-swatch palette strip as visual identity. v1 ships the switcher as a dropdown without palette — just code, name, product count.

**What's needed in v2:**
- A `getLibraryPalette(libraryId, products)` helper that returns 4–5 hex tones representing the library
- Caching: derive on library save, not every render
- Optional user override: pin specific tones to a library

## 3. Add Product ingestion modes

The design's Add Product editor has a 5-tab mode strip: **Manual / URL / PDF / CSV / Duplicate**. v1 ships **Manual + Duplicate** active; URL / PDF / CSV are visible-but-greyed tabs labelled "Available in v2".

**What's needed in v2:**
- **URL mode** — fetch product page, parse Open Graph / structured data / page title for name/brand/image, prefill form. Probably needs a server-side proxy to avoid CORS (or run via a Supabase Edge Function).
- **PDF mode** — drop a supplier PDF, extract fields. Needs an LLM call (Claude API in extract mode is a good fit) or `pdf-parse` + heuristics.
- **CSV mode** — bulk import. Probably easiest to ship — parse rows, map columns, create N products in one transaction. Surface a per-row preview before commit.

## 4. Per-library code-style override

The design shows 5 code styles (serif italic / mono / pill / box / stamp). v1 ships **Mono Clean** globally. README marks serif italic as the "signature device" — the user picked legibility over signature, but the call could be a per-library setting in v2.

**What's needed in v2:**
- `library.codeStyle: 'mono' | 'serif-italic' | 'pill' | 'box' | 'stamp'` — default to global setting
- Surface in Library Defaults settings + per-library editor
- CodeChip atom is already structured to switch (variants exist; one is unlocked in v1)

## 5. Library masthead variant override

v1 ships **Inline-disclosure** for compactness. Other variants (Plate / Rule / Meta-line switch) live in the design and could be per-library settings.

**What's needed in v2:**
- `library.mastheadVariant` setting
- LibraryMasthead atom needs to render all four variants

## 6. Per-room canvas / spreadsheet entry for Schedule

v1 ships **per-row** schedule entry: pick Room, pick Element, pick Product. Other entry modes explored:
- **Per-room canvas** — pick a room, see a palette of common elements, click to add. Faster for typical rooms; less flexible.
- **Spreadsheet-style** — paste rows from a spreadsheet. Power-user mode for bulk import.

Both deferred to v2.

## 7. Smaller polish items

- **Density auto-detection** — design sticks to one density. v1 keeps the existing compact / regular / spacious toggle. v2 could detect viewport.
- **Sage accent in selection states** — v1 uses ink for row selection. v2 lights up sage on selection (matches design intent).
- **Type-corner badge on Library cards** — v1 shows productType in a small mono badge. v2 could let users hide it per library.
- **Cmd+\\ rebinding** — v1 unbinds (sidebar removed). v2 might bind it to opening the Library Switcher.

## 8. Resurrected files (already-built work waiting on v2)

These files were built during the parked POC and continue to exist in the branch. They're either fully shipped in v1 or hidden behind feature flags. v2 turns them all on:

| File | v1 status | v2 needed |
|---|---|---|
| [src/SchedulePage.jsx](../src/SchedulePage.jsx) | **Ships** with Types hidden | Light up sage code badges; show Types section in picker |
| [src/ItemPickerDrawer.jsx](../src/ItemPickerDrawer.jsx) | **Ships** with Types hidden | Show Types section + Add new Type button |
| [src/TypeEditor.jsx](../src/TypeEditor.jsx) | Parked | Rebuild around design's chosen Assembly Editor layout |
| [src/LibraryTabs.jsx](../src/LibraryTabs.jsx) | Parked | Reintroduce or rebuild on v1 atoms |
| [src/StateAndModeChips.jsx](../src/StateAndModeChips.jsx) | **Ships** | No change |
| [src/ProductFieldBlocks.jsx](../src/ProductFieldBlocks.jsx) | **Ships** | No change |
| [src/taxonomy-defaults.jsx](../src/taxonomy-defaults.jsx) | **Ships** (Element + ProductType) | No change — Type templates already seeded |
| [src/taxonomy-helpers.jsx](../src/taxonomy-helpers.jsx) | **Ships** | No change |
| [src/seed-poc.jsx](../src/seed-poc.jsx) | Demo seed only | Keep — demos taxonomy v3 in `?demo=1` mode |
| [src/DemoProvider.jsx](../src/DemoProvider.jsx) | **Ships** as `?demo=1` | No change |
| [src/DemoRequiredNotice.jsx](../src/DemoRequiredNotice.jsx) | Removed in v1 (no notice — bare URL works) | No change |
| [src/demo-mode.jsx](../src/demo-mode.jsx) | **Ships** | No change |
