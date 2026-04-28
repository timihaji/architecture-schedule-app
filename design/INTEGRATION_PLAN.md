# Design integration plan — v1.1

> **v1.1 amendment (2026-04-28)** — incorporates the v2 design package now in [handoff/v2/](handoff/v2/). The v2 README's component inventory and the canonical HTMLs (`Library.html`, `Schedule Cards.html`) supersede this plan **for chrome/layout/animation/CSS/atom contracts**. The feature-preservation tables in this plan (find duplicates, paintable + painted-with, label templates, kind picker, swatch generators, Cmd+K, cheatsheet, image upload + crop, cell clipboard, drag-and-drop reorder, bulk operations behaviour, compare mode, save status, cloud toasts, auth gate, allowlist, firm glyphs, restore seed, schema migration history) remain **canonical and unchanged** — they describe what flows survive. The merge principle: **v2 chrome wraps v1 features**. Each new sub-phase below carries an explicit "preserves:" pointer when it touches an existing feature.

## Context

Claude Design returned a hi-fi design system (`design/handoff/`) — Library, Library Switcher, Library Header Options, Add Product, Assembly Editor, Schedule Cards. A second-pass package (`design/handoff/v2/`) followed on 2026-04-28 with pixel-level component contracts and two new surfaces (Library Layout C Split/Detail, redesigned Schedule Cards). Tokens lift cleanly onto the existing app's palette (paper/ink/rule/accent identical) plus a sage `--good` accent and `--paper-3` for the second domain.

**v1.0 ships** the design across the existing app **with the new taxonomy data shape but without Types/Assemblies as a UI surface**. Schedule (IV — taxonomy v3 architecture) and Cost Schedule (III — same data, projected on cost) read from the same per-project schedule rows. The Library is a single Products view (no tabs in v1). Types/Assemblies stay in the data layer (taxonomy templates seed) but are not exposed in any v1 UI; they light up in v2.

Decisions locked (this session, 2026-04-27):

| Decision | Choice |
|---|---|
| Masthead variant | **Inline-disclosure** — page title doubles as switcher trigger with chevron (~50px) |
| Item code style | **Mono clean** — JetBrains Mono in accent colour. README's "signature device" (serif italic) deferred to v2 as a per-library setting |
| Assemblies tab in Library | **Hidden in v1** — Library has no tabs at all; single Products register + gallery |
| Schedule (IV) | **Taxonomy-v3 SchedulePage ships in v1**, with Type-related UI hidden. Element + Room + State + SpecMode all surface |
| Cost Schedule (III) | **Re-pointed to read the same schedule rows** as the Schedule view — single source of truth, two projections |
| Data migration | **Hard cut**: rename `materials` → `products`, drop `kind` / `category` / `componentType`, add `productType` + extras. One-shot cloud migration with snapshot |
| Schedule row entry | **Per-row** — Room dropdown + Element picker (200-item) + Product picker (filtered by Element) |
| Phase order | **A → B → C → D → E with master push per phase** |

---

## Phase A — Tokens, atoms, data migration (foundation)

Foundation work. Three sub-phases that should land together as a single phase but committed individually.

### A1 — Tokens

| Task | File | Notes |
|---|---|---|
| Lift design's full `:root` table | [index.html](../index.html) | Add `--paper-3` (#ddd6c5), full `--good` family (`--good`, `--good-ink`, `--good-soft`, `--good-soft-bd`), `--accent-soft`. Sage stays defined even though v1 doesn't use it — preserves it for v2 without a future migration. |
| Add Newsreader 300/300i + Inter Tight 300/600 | [index.html](../index.html) `<link>` | Mono Clean code style doesn't strictly need 300i, but the load is cheap and keeps the door open. |
| Strip `border-radius` and `box-shadow` from inline styles | grep `src/` | Design is square. Audit and remove. |

### A2 — Atoms

Create a thin `src/atoms.jsx` (or extend [src/primitives.jsx](../src/primitives.jsx)) with a small set of reusable components based on the design's CSS classes. Each atom is a thin wrapper that takes content + variant and renders the design's exact styles.

| Atom | Replaces | Notes |
|---|---|---|
| `Eyebrow` (already exists) | scattered inline styles | Already in primitives.jsx. Verify spec matches design (10px, 0.14em, weight 500, ink-3). |
| `MetaMono` | scattered inline styles | Mono 10px, 0.1em tracking, ink-4, uppercase. Used for `LIB-02`, `46 PRODUCTS`, etc. |
| `CodeChip` | scattered inline styles | **v1: Mono clean variant**. Mono 11px (register) / 13px (gallery), accent-ink colour. Future variants (serif/pill/box/stamp) live in same component for v2 per-library override. |
| `SectionHeading` | inline section dividers | Serif 13px weight 500 ink-3 with rule-bottom; right-aligned mono numeral. |
| `PrimaryButton` (`.btn-add.product` / `.btn-pri`) | inline ink-fill buttons | Filled ink, paper text, 11px sans 0.1em uppercase 500. Hover opacity 0.85. |
| `GhostButton` (`.btn-ghost` / `.btn-sec`) | inline outline buttons | Transparent, rule-2 border, ink-4 text, hover → ink-3 / ink-2. |
| `Input` / `Select` / `Textarea` (`.inp` / `.sel` / `.tarea`) | inline form fields | 1px rule-2 border, paper bg, no radius. Focus → ink-3. Textarea uses serif. |
| `LibTabs` + `Tab` | none yet | For Schedule view-toggle (Room/Element/Trade) and Add Product mode-tabs. |
| `Plate` | none yet | Reserved for v2 (Library Switcher overlay rows). Define now, don't render in v1. |
| `Modal` (already partial) | inline modal chrome | Adopt design's `.ae` frame: 1px ink border, paper bg, no radius, no shadow. Header eyebrow + serif title + close. Footer rule-top with primary + secondary. |
| `Toolbar` | inline toolbar markup | Search + filter selects + ghost buttons + count, with `.vbar` separators. |

Atoms are referenced by every later phase. Get them right; the rest snaps in.

### A3 — Data migration (hard cut)

The riskiest single piece of work in v1. Migrate cloud + localStorage from the legacy `materials` shape to the new `products` shape and ensure existing per-project schedules pick up the new fields with sensible defaults.

#### Schema change

```
materials  → products
  kind          → DROP (subsumed by productType)
  category      → DROP (subsumed by productType)
  componentType → DROP (replaced by element on schedule rows)
  trade         → KEEP as fallback (until taxonomies derive it)
  + productType : NEW (string, references taxonomies.productTypes[].id)
  + extras      : NEW (object, keyed by productType.extraFields)

schedules.{projectId}.rows → unchanged shape, new optional fields
  + element  : NEW (string, references taxonomies.elements[].id; nullable for legacy rows)
  + roomId   : NEW (references rooms[].id; nullable; legacy rows infer from row.rooms[] tag list)
  + state    : NEW (default 'new')
  + specMode : NEW (default 'proprietary')
  + isInstance : NEW (default false)
  specRef    : RESHAPE — was { materialId } → now { kind: 'product', id: <materialId> }

specs.{projectId}.* → DROP entirely. Spec is now Schedule.

projects[]
  + roomIds  : NEW (refs into rooms collection)
  + archetype: NEW (string)

rooms : NEW collection
  Migrated from existing per-spec row.rooms[] tag arrays — each unique room name in a project becomes a Room record.

taxonomies : NEW singleton in appState.taxonomies
  Seeded from window.DEFAULT_TAXONOMIES.
```

#### Migration plan

1. **Snapshot before any write.** Export full Supabase state to a JSON file in cloud Storage; export `localStorage` to a downloadable backup before any client touches the new schema.
2. **Migration script** runs once per workspace at LoadingGate boot, gated by `appState.schemaVersion < 4`. Migration:
   - For each material: derive `productType` from old `kind` + `category` via a lookup table; copy `extras` from kind-specific fields; rename `materials` table to `products`.
   - For each project: derive a unique room list from `spec[projectId].rows[*].rooms[]` and write to `rooms` collection. Set `project.roomIds`.
   - For each schedule row: keep as-is, but reshape `materialId` into `specRef`. Default `state='new'`, `specMode='proprietary'`. Best-effort `roomId` from row tag.
   - For each spec row: convert into a schedule row (state='new'/'existing'/etc. derived from row.status). Then drop spec table.
   - Bump `appState.schemaVersion` to 4.
3. **One-way migration. No fallback.** If the migration fails mid-way, the snapshot from step 1 lets the user roll back manually. Migration is idempotent — re-running it is safe.
4. **Local-storage demo mode** (`?demo=1`) follows the same migration path on first load if its blob is at an older `schemaVersion`. The seed-poc.jsx is already at v4 — no migration needed for fresh demos.

| Task | File | Notes |
|---|---|---|
| Add `migrate-v4.jsx` to run inside LoadingGate before app boot | new file | Reads existing data, applies migration, writes new shape, bumps schemaVersion. Logs each table's row counts. |
| Add Settings → Data → "Schema migration history" panel | [src/SettingsPage.jsx](../src/SettingsPage.jsx) | Shows what migrations ran when. Surfaces snapshot-download button. |
| Backfill `taxonomies` singleton from window.DEFAULT_TAXONOMIES if missing | LoadingGate | Same pattern as the existing seed_version backfill. |

This phase requires user review of the migration script before it runs against production data. Test against a Supabase staging clone first.

---

## Phase B — Library page

Replace [src/Library.jsx](../src/Library.jsx), [src/LibraryTable.jsx](../src/LibraryTable.jsx), and supporting files with the design's Library page (`design/handoff/designs/Library.html`). Both Gallery and Table modes preserved; Library Switcher integrated as the inline-disclosure masthead.

### B1 — Inline-disclosure masthead + Library Switcher

The page title is itself a button — clicking it toggles a dropdown that shows the libraries list. Affordance: chevron next to the title; hover state highlights the chevron in ink. Open state rotates the chevron 180°.

| Task | File | Notes |
|---|---|---|
| Replace existing Library page header | new file [src/LibraryMasthead.jsx](../src/LibraryMasthead.jsx) | Eyebrow `LIBRARY` + serif title (current library name) + `▾` chevron. Title click toggles switcher. Right side: `+ Add Product` filled black. |
| Build `<LibrarySwitcher>` overlay | new file [src/LibrarySwitcher.jsx](../src/LibrarySwitcher.jsx) | Variant: **dropdown** (pinned to title, ~280px wide). Each row = library code (mono), name (serif), product count (mono), inline actions (rename / duplicate / delete on hover). Add new library button at footer. |
| Active-library indicator | switcher row | Active library row gets ink left-rule + slightly heavier text. |
| Persist active library to `appState.ui.activeLibraryId` | wire | Existing slot, just rebind. |
| Add/rename/duplicate/delete library actions | switcher | Move from existing Library sidebar into switcher. Same handlers (`cs.setLibraries`). |
| Per-library palette swatches | **DEFERRED to v2** | Stub the row to leave space for them; in v1 just show counts. |

### B2 — Mode toggle (Gallery / Table)

Same toggle as today, retokenised. Wire to `cs.ui.libraryMode`. Compact / Regular / Spacious density tokens unchanged.

### B3 — Gallery mode

**v1.1: shipped — v2 README explicitly says "Layout B already implemented, skip".** No further work needed.

Original spec (kept for reference): Design's `.gallery` block (Library.html lines 209–310). 4-column grid with 1px rule between cards. Each card: swatch (1.3 aspect), large mono code (11px), serif name (15px), sans brand (11px). Hover → background paper-2 + name underline. Selected → ink outline (in v1 — sage in v2 when Types are live).

| Task | File | Notes |
|---|---|---|
| Replace LibraryGallery JSX | [src/Library.jsx](../src/Library.jsx) | Preserve all existing handlers: filter/sort/group, sidebar (replaced by switcher), search, hover-reveal compare checkbox + ⋯ menu + chevron toggle, inline expand panel on click. |
| Map existing swatch types to design's swatch background | [src/swatches.jsx](../src/swatches.jsx) | Solid → `style={{background: tone}}`. Woodgrain/marble → existing SVG generator. Image → `<img>`. None → procedural pattern from Library.html (brick / wood / tapware / tile / paint / hatching) keyed off `productType`. |
| Type-corner badge | [src/Library.jsx](../src/Library.jsx) | Small mono badge top-right of swatch with productType (`tapware`, `paint`, etc.). NEW in design. |
| Group headers | [src/Library.jsx](../src/Library.jsx) | Replace existing § markers with design's `.reg-section` (italic serif title + rule + count). |

### B4 — Table mode (register)

**v1.1: shipped in commit `badcc0b`. v2 README adds these details — open as a small follow-up patch (or fold into B6 work):**

- **Master checkbox states:** unchecked → indeterminate (`background: --ink-3; border-color: --ink-3` + horizontal-dash SVG when `someChecked && !allChecked`) → fully checked (`.cb.checked` + tick SVG). Click cycles: `allChecked` → `onClearSel()`; otherwise → `onSelectAllVisible()`.
- **Hover row treatment:** left accent bar `inset 2px 0 0 var(--ink-3)`; selected → `inset 2px 0 0 var(--good)`. Hover removes hairline divider above (`box-shadow: none` on `+ .reg-row` — CSS-only).
- **Actions column:** `opacity: 0` until `.reg-row:hover`, then `opacity: 1`. Edit + × buttons both `e.stopPropagation()`.
- **Add row per group:** `.lib-add-row` rendered after each group when `groupByType` is on; single add row when ungrouped.
- **Inline edit row (`.reg-edit-row`):** 2-col grid expanding below the row in editing state. Fields: Name (full-width spans 2 cols), Brand, Supplier, SKU, Price. Save/Cancel buttons below.

Original task list (kept):

| Task | File | Notes |
|---|---|---|
| Replace LibraryTable.jsx row markup | [src/LibraryTable.jsx](../src/LibraryTable.jsx) | Preserve: search, sort by clicking column headers, multi-select (Shift/Ctrl/Cmd+click), bulk operations bar, command palette (Cmd+K), inline edit (`.reg-edit-row`), keyboard navigation. |
| Column-chooser popover | port `.col-popover` from design | Replaces existing column-visibility menu. Tokenise. Locked columns greyed and unclickable in chooser. |
| Density selector | toolbar | Existing density tokens map to row padding. |
| Cmd+K command palette | preserve + tokenise | Keep existing logic; popover chrome adopts `.ae` aesthetic (1px ink, paper bg). |
| Cheatsheet (`?` overlay) | preserve + tokenise | Keep existing modal; tokenise. |
| Find duplicates entry | preserve + tokenise | Stays as a Cmd+K command and a Settings → Codes & Duplicates entry. Modal chrome retokenised. |

**Preserves:** search · sort · multi-select · bulk operations · Cmd+K · cheatsheet · find duplicates · inline edit · keyboard nav · density tokens.

### B5 — Sidebar removal

**v1.1: shipped in commit `e382150`.**

The existing Library has a left sidebar listing libraries. With the inline-disclosure masthead the switcher takes over that role. The sidebar is removed in v1.

| Task | File | Notes |
|---|---|---|
| Remove sidebar from Library.jsx | [src/Library.jsx](../src/Library.jsx) | Cmd+\ shortcut now toggles a different surface (deferred — perhaps the column chooser, or just unbind for v1 with a CHANGELOG note). |

### B6 — Layout C: Split / Detail (NEW in v1.1)

A third Library layout introduced by v2 README. 340px left list + right detail panel with edit-in-place. Adds a third option to the existing layout toggle (Register / Gallery / Split).

**Spec:** v2 README "Layout C — Split / Detail" + Library.html `/* ── LAYOUT C: SPLIT ── */` CSS block.

| Task | File | Notes |
|---|---|---|
| Add `LayoutC` component | new file [src/LibraryLayoutC.jsx](../src/LibraryLayoutC.jsx) | `.split` 2-col grid (340px + 1fr). Left = `.split-list` (overflow auto, max-height 700px, sticky group labels). Right = `.split-detail`. |
| Wire third layout option to toolbar toggle | [src/Library.jsx](../src/Library.jsx) | `cs.ui.libraryMode` extends from `'gallery' \| 'table'` to `'gallery' \| 'table' \| 'split'`. Toggle preserves selection / search / filter state across switches. |
| Active item accent | `.split-item.active.p` (terracotta border + tint) for products; `.active` (sage) for types. Type styling stays dormant in v1 (`window.SHOW_TYPES` flag off). |
| Read-mode detail panel | swatch (full width × 140px), header with `<Code large />` + serif name + brand · supplier, `.detail-fields` 2-col grid. |
| Edit-mode detail panel | "Edit all fields" toggle → grid of `.edit-input` / `.edit-input.mono`. Cancel discards. Selecting a different list item while editing discards silently. |
| Empty state | Centred serif italic "Select an item to see details." + mono "N items in list" hint. |
| Remove → next-item selection | "Remove" danger button deletes item, resets `activeId` to next available item. |

**Preserves:** all existing Library data flow (filter / sort / group / search) · selection state across layouts · hover-reveal compare checkbox + ⋯ menu (where applicable) · paintable + painted-with link surfacing in detail (when a paintable product is active) · swatch generators (procedural patterns + woodgrain/marble) feed `.detail-fields` swatch.

### B7 — Bulk Action Bar (detail back-patch)

v1 plan said "preserve + retokenise". v2 spec is explicit:

| Task | File | Notes |
|---|---|---|
| `.bulk-bar` chrome | wherever the existing bulk bar lives | Fixed at viewport bottom when `selectedIds.size > 0`. `barUp` keyframe (`from { transform: translateY(100%); } to { translateY(0); }`, 0.18s ease). **Unmount** (not just hide) when count → 0 so the slide-out is natural. |
| Buttons | `.bulk-act` "Add to Schedule", `.bulk-act.danger` "Remove", `.bulk-clear` "Clear" → `onClearSel`. |
| Count label | `.bulk-count` "{N} selected". |

**Preserves:** existing bulk operation handlers (Remove, Add to Schedule) — only the chrome and animation are tokenised.

### B8 — Functionality preservation checklist

Same table as the previous version of the plan — every existing Library feature mapped to preserved/retokenised/replaced/deferred. No regressions in scope.

---

## Phase C — Add Product editor

Replace existing `KindPicker → ProductEditor` flow with the v2 `AddDrawer` (v2 README "Add / Edit Drawer" + Library.html `/* ── ADD PRODUCT DRAWER ── */` CSS block). The v1.1 amendment splits the original C2 ("Manual mode" as one phase) into C2–C8 to match the v2 README's per-section spec, plus a new C9 for Duplicate.

### C1 — Mode-tab strip

**v1.1: shipped in commit `bf75a58`. Two small deltas to fold into C2's commit (NOT a separate commit):**

1. **Tab order:** v2 README is `Manual | URL | PDF | CSV | Duplicate` (Duplicate last). Currently shipped as `Manual | Duplicate | URL | PDF | CSV`.
2. **Visibility gate:** v2 README says "Mode tabs only shown when CREATING (`!editItem`)". Currently the strip renders for both create and edit.

Original spec (kept): Tabs: Manual (active) · Duplicate · URL (greyed, "v2") · PDF (greyed, "v2") · CSV (greyed, "v2"). Disabled tabs render but cannot be selected; tooltip explains "Available in v2".

### C2 — Drawer shell + animations (NEW in v1.1)

Replace the modal `.ae` frame currently hosting the editor with the v2 right-sliding drawer.

| Task | File | Notes |
|---|---|---|
| Drawer backdrop `.drw-bg` | [src/App.jsx](../src/App.jsx) | `position: fixed; inset: 0; background: rgba(20,20,20,0.32); z-index: 100`. `animation: fadeIn 0.18s ease-out`. Click → `onClose()`. |
| Drawer panel `.drw-panel` | same | `position: fixed; top: 0; right: 0; bottom: 0; width: 540px; border-left: 1px solid --ink`. `animation: slideIn 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)`. `display: flex; flex-direction: column`. |
| Mount/unmount semantics | same | Conditional render — only in DOM when `open === true` (gives the on-mount animation for free). |
| `Escape` key close | `useEffect` with `keydown` listener | Clean up on unmount. |
| Header `.drw-head` | new render | Eyebrow ("New Product" / "Edit Product"), serif 22px title, `×` close button right-aligned. Mode tab strip `.modes` from C1 mounted here, with `margin: 0 -22px; padding: 0 22px` so its underline spans panel edge to edge. |
| Body `.drw-body` | new render | `flex: 1; overflow: auto; padding: 0 22px 18px`. Hosts C3–C7 sections. |
| Footer `.drw-foot` | C8 below | Sticky bottom — see C8. |
| Required-field asterisks | `.req` span | `color: var(--accent)` next to Code + Name labels. |
| Save disabled when required fields empty | inert state on `.btn-pri-d` | `:disabled` styling — no opacity collapse, but greyed text. |

**Preserves:** outer modal close behaviour (Escape, click-outside) — same as today's `.ae` modal · the `kind` + `draft.name` state model that the editor currently consumes.

### C3 — Section 01 Identity (NEW in v1.1)

| Row | Fields | Class |
|---|---|---|
| Section header | `.section-h` mono "01" + serif "Identity" | |
| Row 1 | Code (`.inp-d.mono`, required) + Name (required, full width — spans 2 cols) | `.field-grid` |
| Row 2 | Type select + Subtype select | `.field-grid` 2-col |
| Row 3 | Supplier + Trade | `.field-grid` 2-col |

**Preserves:** **kind picker (two-column modal)** opens from the Type select — affordance unchanged, only relocation · auto-code assignment runs on save (per `appState.settings.dupePolicy`) · label-template-driven display name (entry point moves to Settings → Library Defaults → Display rules — see D4) · paint-specific fields (brand / colourCode / sheen / system) surface here via [src/ProductFieldBlocks.jsx](../src/ProductFieldBlocks.jsx) when `productType=paint`.

### C4 — Section 02 Visual (NEW in v1.1)

Three sub-tabs via `.sw-tabs` (Colour / Material / Image).

| Sub-tab | Spec | Notes |
|---|---|---|
| **Colour** | `.color-grid` 8-col. Each `.color-cell` `aspect-ratio: 1; border: 1px solid --rule-2`. Selected: `border: 2px solid --ink`. Hover: `transform: scale(1.08)`. | Wire to existing solid-tone swatch type. |
| **Material** | `.mat-grid` 4-col. Each `.mat-card`: square swatch `.mat-sw` + mono 8.5px name. Selected: `outline: 2px solid --ink; outline-offset: 2px`. Hover: `transform: translateY(-1px)`. | Wire to existing woodgrain / marble generators + procedural patterns (brick, tile, paint, hatching, tapware) keyed off `productType`. |
| **Image** | `.dd` drag-drop. `border: 1px dashed --rule-2`. Hover: `border-color: --ink-3; background: --tint-2`. | Wire to existing image upload + crop. |

**Preserves:** **all swatch types** (solid / woodgrain / marble / image / inherited) and the procedural pattern generators · subtype glyph overlay still composes on top of the swatch · existing image upload + crop tool unchanged · the **inherit-from-paint** path remains lit up when `paintable + paintedWithId` are set (logic surfaces in C5 Specs, render is in this section's preview).

### C5 — Section 03 Specs (NEW in v1.1)

| Row | Fields | Class |
|---|---|---|
| Section header | `.section-h` mono "03" + serif "Specs" | |
| Row 1 | Width / Depth / Height (all `.inp-d.mono`) | `.field-grid` 3-col |
| Row 2 | Finish text input + Unit text input | `.field-grid` 2-col |
| Per-productType extras | dispatched via [src/ProductFieldBlocks.jsx](../src/ProductFieldBlocks.jsx) | Existing per-kind fields map cleanly. |

**Preserves:** **per-productType extras dispatch** unchanged · **Paintable flag** surfaces here as a checkbox (extras field on lining / render_mat / joinery_body / joinery_door productTypes via [taxonomy-defaults.jsx](../src/taxonomy-defaults.jsx)) · **Painted-with link** surfaces here as a picker filtered to `productType=paint` when `paintable=true` (stores `extras.paintedWithId`) · `swatch.inheritTone` behaviour unchanged.

### C6 — Section 04 Commercial (NEW in v1.1)

| Row | Fields | Class |
|---|---|---|
| Section header | `.section-h` mono "04" + serif "Commercial" | |
| Row 1 | Price (`.inp-d.mono`) + Currency select | `.field-grid` 2-col |
| Row 2 | Trade discount chips (`.chip-trade`) inline + "Add" ghost button | `.field-grid` |

**New field:** `tradeDiscounts: string[]` on Product (NEW — wire into A3 migration as default-empty for migrated rows; no migration backfill needed).

### C7 — Section 05 Notes (NEW in v1.1)

| Row | Fields | Class |
|---|---|---|
| Section header | `.section-h` mono "05" + serif "Notes" | |
| Notes | `.tarea-d` (serif Newsreader textarea, `resize: vertical; line-height: 1.5`). Placeholder: "Add specification notes…" | full-width |

This is the smallest sub-phase — likely a single Edit + atom export. Sonnet 4.6 default is sufficient.

### C8 — Footer (NEW in v1.1)

`.drw-foot` sticky at bottom of `.drw-panel`.

| Button | Class | Behaviour |
|---|---|---|
| Save | `.btn-pri-d` (primary) | Wires to `cs.setProducts` (renamed from `setMaterials` post-migration). Closes drawer on success. |
| Save & add another | `.btn-sec-d` (secondary) | Saves, **resets form without closing drawer** — keeps mode tab on Manual. |
| Cancel | `.btn-sec-d` tertiary | `onClose()`. |

**Preserves:** existing save flow (validation, autoAssignCode, dupePolicy enforcement) — only the button chrome changes.

### C9 — Duplicate mode body (was v1's C3)

Triggered when `mode === 'duplicate'`. Replaces the deferred-to-C3 placeholder C1 currently renders.

Inline picker of products in the active library; selecting one prefills all fields except `code` (auto-suggested as next in series via existing `autoAssignCode`). Behaviourally identical to existing "Duplicate material" action.

| Task | File | Notes |
|---|---|---|
| Picker UI inside drawer body | new component or inline in [src/App.jsx](../src/App.jsx) | List of products in active library, search filter at top, click to confirm. |
| On confirm | wire to existing `duplicateProduct` handler | Switches mode back to `manual`, drawer body re-renders with prefilled form. |
| Cancel-only footer | C8 footer with Save buttons hidden when `mode === 'duplicate' && !pickedSource` | Matches what C1 currently ships. |

**Preserves:** existing duplicate-material flow logic verbatim.

### C-PRESERVE — Phase-wide functionality preservation

Reference table — same content as v1's C5, kept here at the end of Phase C as the canonical merge contract.

| Feature | Treatment |
|---|---|
| Kind picker (two-column modal) | Preserved — invoked from productType select (C3) |
| Auto-code assignment | Preserved — runs on save (C8) based on `appState.settings.dupePolicy` |
| Per-kind extras dispatch | Preserved — rendered inside Specs section (C5) |
| Label-template-driven display name | Preserved — entry point moves to Settings → Library Defaults → Display rules (D4) |
| Paint-specific fields (brand / colourCode / sheen / system) | Preserved — appear in Identity + Specs via ProductFieldBlocks when productType=paint |
| Swatch types (solid / woodgrain / marble / image / inherited) | Preserved — Visual section's three tabs (C4) plus the **inherit-from-paint** path lit up when paintable+paintedWithId set |
| **Paintable flag** (NEW location, existing behaviour) | `paintable: bool` becomes an extras field on lining / render_mat / joinery_body / joinery_door productTypes via [taxonomy-defaults.jsx](../src/taxonomy-defaults.jsx). Surfaces in Specs (C5) as a checkbox |
| **Painted-with link** (NEW location, existing behaviour) | When `paintable=true`, Specs (C5) shows a "Painted with" picker filtered to productType=paint. Stores `extras.paintedWithId`. Library row swatch + detail panel "Painted with: …" link preserved verbatim from existing [src/Library.jsx](../src/Library.jsx) logic |
| `swatch.inheritTone` behaviour | Preserved — Library swatch reads from linked paint's tone when set |
| Image upload + crop | Preserved — Visual section's Image tab (C4) |
| Drawer Escape + click-outside close | Preserved — same semantics as today's `.ae` modal |

---

## Phase D — Schedule (IV), Cost Schedule (III), Projects, Settings

The largest phase by surface area but smallest in conceptual change. Apply atoms + tokens; preserve every existing flow.

### D1 — Schedule (IV) — Schedule Cards redesign (rewritten in v1.1)

**Replaced.** v1's plan was "tokenise existing SchedulePage". v2 README provides a full card-based redesign (`Schedule Cards.html`). The existing parked [src/SchedulePage.jsx](../src/SchedulePage.jsx) is salvageable for **state and data plumbing** (the `useProjectSchedule` hook, row CRUD, `window.SHOW_TYPES` flag); the **visual layer is replaced** by `CardVariantD` + `Chip` + `PickerDrawer`.

Spec source: v2 README "Component inventory — Schedule Cards.html" + the canonical HTML's `/* CHIP BASE */`, `/* PICKER DRAWER */`, `/* EDIT inputs */`, `/* Hidden tray */` CSS blocks.

### D1a — Schedule page shell

| Task | File | Notes |
|---|---|---|
| Page header (eyebrow + serif title + Add button) | [src/SchedulePage.jsx](../src/SchedulePage.jsx) | Same `Nav` + page header + toolbar pattern as Library. |
| Section grouping select | toolbar | "By Room" / "By Trade" / "By Type". Wires to existing grouping state. |
| "Fields" button | toolbar | Toggles a column-chooser-style popover for visible card fields. |
| View toggle | toolbar | Add "Specification" option alongside whatever the existing schedule view is called. Local state — no route change. |
| Section markup | `<div className="sec">` per group | Section header `.sec-head`: `display: flex; gap: 12px; padding: 12px 0 9px; border-bottom: 2px solid --ink`. Title serif 18px 500 + subtitle (area, e.g. "18 m²") mono 10px `--ink-4` + count mono 9px `--ink-4`. |

**Preserves:** existing room / element / trade / type grouping logic · `useProjectSchedule(projectId)` hook unchanged · `window.SHOW_TYPES` flag (Type-related UI hidden in v1).

### D1b — `CardVariantD` (canonical card)

Card layout: `display: grid; grid-template-columns: 178px 1fr`. No border-radius, no shadow.

| Region | Spec |
|---|---|
| **Left swatch column (178px)** | Product → solid colour block (`swatchColor`), height 168px standard density, brand watermark bottom-left (mono 7.5px `rgba(255,255,255,0.35)`). Type → sage-tinted block + serif italic 44px code in `--good-ink` + "— N layers —" mono. Empty → `--paper-2` bg + centred `+` SVG. |
| Click swatch | `onSwatchClick()` → opens `PickerDrawer` (D1d). |
| **Right content column** | `padding: 15px 28px` standard density. Top line: element label (sans 8.5px uppercase, coloured by kind: `--accent-ink` product, `--good-ink` type, `--ink-4` empty). |
| Name row | flex space-between. Left: serif 18px name + inline mono 11px type code (if type). Below: SKU mono 9.5px `--ink-4` · supplier sans 11.5px `--ink-3` · trade sans 9px uppercase `--ink-4` (or chips when `q5trade === 'chips'`). Right (read mode only): state chip + mode chip side-by-side, no labels. |
| **Field grid `.fgrid-d`** | `display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 16px`. Visible only for fields not in `card.hiddenFields`. Each cell: `.detail-label` + value (read) or input (edit). |
| Hover state | `onMouseEnter` / `onMouseLeave` on root → `hovered` controls Edit-button visibility, field-hide button visibility, left accent bar. |

**Edit mode:** `isEditing` prop. Status/mode chips become `<select className="edit-select">`, same colours via inline `style={{ color: f.color }}`. Text fields → `<input className="edit-input">` or `.edit-input.mono`. Notes → `<textarea className="edit-input" rows={2}>`. Edit tray animates with `slideDown` keyframe (0.18s ease). Save button top-right → `onSave()`. Card bg `rgba(20,20,20,0.012)` while editing.

**Preserves:** existing row CRUD operations · row-level state model (state + specMode + hiddenFields + notes) · `q5trade` setting (chips vs label) · A/B/C card variants are NOT implemented (v2 says CardVariantD is canonical — the others are exploration).

### D1c — `Chip` cycle-on-click

Clicking a state or mode chip **cycles to the next value** in the list (`STATES` or `MODES`). NOT a dropdown. This is the primary way to change state/mode without opening edit mode.

| Task | File | Notes |
|---|---|---|
| `Chip({ type, value, onChange, showDot })` atom | [src/atoms.jsx](../src/atoms.jsx) | CSS classes `chip s-{value}` (state) or `chip m-{value}` (mode). Each variant has its own text/bg/dot colour — lift verbatim from `/* CHIP BASE */` block. |
| Cycle handler | inline | `onChange(STATES[(i+1) % STATES.length])`. |
| Edit-mode select | inside `CardVariantD` (D1b) | In edit mode only, chip becomes `<select>`. Read mode stays as cycle-button. |

**Preserves:** existing state + specMode vocabulary (`new` / `existing` / `repair` / `match` / `demolish`; `prop` / `perf` / `open` / `pc` / `tba`) — chips already match the design.

### D1d — `PickerDrawer`

Replaces the existing [src/ItemPickerDrawer.jsx](../src/ItemPickerDrawer.jsx) chrome (the existing data/wiring stays; only the rendering changes).

| Region | Spec |
|---|---|
| Backdrop | `position: fixed; inset: 0; background: rgba(20,20,20,0.32); z-index: 200; display: flex; justify-content: flex-end`. |
| Drawer | `width: 560px; height: 100vh; border-left: 1px solid --ink`. `animation: drawerIn 0.22s ease` (`from { transform: translateX(40px); opacity: 0; }` → `to { transform: translateX(0); opacity: 1; }`). Note: translate+fade, slightly different from C2's pure translateX. |
| Header | Serif 22px title (context-dependent: "Add to Kitchen", etc.) + italic 11.5px subtitle + `.drawer-search` `border: 1px solid --rule-2` (focus → ink-3). |
| **Types section** `.dsec-head.types` | `position: sticky; top: 0; z-index: 2; background: rgba(107,142,78,0.07)`. Eyebrow "Assemblies" in `--good-ink`. Each `.prow-type` row: 64px sage badge + serif italic 18px code + body (name + slot colour strip + slots/trades) + 40px checkmark column. Selected: sage-tinted bg. **Hidden in v1 behind `window.SHOW_TYPES`.** |
| **Products section** `.dsec-head.products` | `background: rgba(184,92,58,0.05)`. Eyebrow "Products" in `--accent-ink`. Each `.prow-product`: 40×40 swatch + serif 14px name + meta + checkmark. |
| Footer `.drawer-foot` | `background: --paper-2; border-top: 1px solid --ink`. "Add Product" outlined terracotta + "Add Assembly" outlined sage (sage hidden in v1) + `margin-left: auto` filled "Add N Items" → `onConfirm(selectedIds)`. |

**Preserves:** Element-pre-set behaviour (Cost Schedule "Add component to category" opens drawer with Element pre-set) · multi-select in picker · "Add new Type" footer button hidden in v1 (per existing flag).

### D1e — Field hide / show

| Region | Spec |
|---|---|
| Hide button `.fcell-hide` | Hovering a field cell in read mode reveals a `×`. Click → `hideField(key)` → adds key to `card.hiddenFields`. |
| Hidden tray `.hidden-tray` | At bottom of card. `background: --paper-2; border-top: 1px dashed --rule-2`. Each hidden field is a ghost button — click → `showField(key)` removes from `hiddenFields`. |

**New field on row:** `hiddenFields: string[]` — wire into A3 migration as default `[]` for migrated rows.

### D2 — Cost Schedule (III) — re-pointed to schedule rows

Currently [src/CostScheduleV2.jsx](../src/CostScheduleV2.jsx) reads from `window.useProjectSchedule(projectId)` returning rows with materialId. Post-migration it reads the same hook returning rows with `specRef.id` + `element` + `roomId`. Cost Schedule projects on:

- Group by category (derived from `productType.group`) instead of explicit `category` field
- Display columns: code (mono), name, productType, qty × cost, subtotal
- Cell clipboard (C / V) preserved
- Drag-and-drop row reorder preserved
- Per-category subtotals + grand total preserved
- Click-cell-to-pick-material → invokes existing material picker drawer (now ItemPickerDrawer with Types hidden)

| Task | File | Notes |
|---|---|---|
| Re-point row reads to new schedule shape | [src/CostScheduleV2.jsx](../src/CostScheduleV2.jsx), [src/CostScheduleV2Rows.jsx](../src/CostScheduleV2Rows.jsx) | Fields rename: `materialId` → `specRef.id` (when kind='product'). `category` → derive from product's `productType.group`. |
| Adopt design's `.sec` / `.sec-head` | retokenise | |
| Adopt design's `.field-grid` | retokenise | |
| State / SpecMode chips | optional in v1 | If user wants them, ship; otherwise omit. |
| ItemPickerDrawer integration | preserve | Cost Schedule's "+ Add component to category" opens the same drawer with Element pre-set. |

### D3 — Projects

Apply atoms + tokens to [src/Projects.jsx](../src/Projects.jsx). Project rows become `.reg-row` style.

| Task | File | Notes |
|---|---|---|
| Apply page-header (eyebrow + serif title + Add button) | [src/Projects.jsx](../src/Projects.jsx) | |
| Apply `.reg-row` to project rows | | Stage chip, code, name, client/location, budget, material thumbs, edit/delete actions |
| Apply `.ae` modal to project editor | | Existing fields preserved; chrome tokenised |
| Per-project rooms editor | NEW UI | Surface the rooms collection now that it's first-class. Add/rename/reorder rooms inside the project editor. |

### D4 — Settings

Section-by-section retokenise of [src/SettingsPage.jsx](../src/SettingsPage.jsx). All 12 sections (Firm / Appearance / Typography / Density / Layout / Library Defaults / Codes & Duplicates / Project Defaults / Cloud / Data / Keyboard / About) preserved structurally.

| Task | File | Notes |
|---|---|---|
| Move Label Templates UI under Library Defaults → Display rules | [src/SettingsPage.jsx](../src/SettingsPage.jsx) + [src/LabelFormat.jsx](../src/LabelFormat.jsx) | Visual chip composer + JSON edit preserved; tokenise. |
| Move Find Duplicates entry to Codes & Duplicates → Find duplicates now button | [src/SettingsPage.jsx](../src/SettingsPage.jsx) | Existing modal preserved; tokenise. |
| Dupe policy preset picker | preserve | Tokenise radio group. |
| Firm logo glyph picker (FirmGlyphs.jsx) | preserve | Tokenise grid. |
| Restore seed | preserve | Tokenise confirmation modal. |
| Schema migration history (NEW) | A3 above | Shows when each migration ran + snapshot download. |

### D5 — Nav + chrome

| Task | File | Notes |
|---|---|---|
| Adopt design's `.nav` exactly | [src/App.jsx](../src/App.jsx) | Tabs: I LIBRARY · II PROJECTS · III COST SCHEDULE · IV SCHEDULE. |
| SaveStatusIndicator | [src/SaveStatusIndicator.jsx](../src/SaveStatusIndicator.jsx) | Sits between last tab and gear; tokenise dot/pulse. |
| CloudToasts | [src/CloudToasts.jsx](../src/CloudToasts.jsx) | Tokenise. |
| AuthGate sign-in form | [src/AuthGate.jsx](../src/AuthGate.jsx) | Apply `.ae` modal frame + atom inputs. |

---

## Phase E — Polish + ship

| Task | Notes |
|---|---|
| Audit `border-radius` and `box-shadow` across `src/` | Replace any survivors with tokens |
| Visual regression sweep | Side-by-side against design HTMLs at 1280, 1024, 768px |
| Focus accessibility | Add `:focus-visible` rings — `1px solid ink` on inputs/buttons. Design intentionally has no focus rings; this is the agreed escape hatch. |
| Update [CLAUDE.md](../CLAUDE.md) | New token + atom vocabulary so future work stays consistent |
| Performance | Profile Library render with 500 products; ensure no regressions |
| Push to master per phase | Per memory note |

---

## Per-phase model + effort

Updated for v1.1 — new sub-phases (B6, B7, C2–C9, D1a–D1e) inherit their parent's tier unless noted.

| Phase | Model | Effort | Why |
|---|---|---|---|
| A1 Tokens | Haiku 4.5 | default | Mechanical edits + grep audit |
| A2 Atoms | Opus 4.7 | high | Component API design — affects every downstream phase |
| A3 Data migration | Opus 4.7 | max | Single highest-stakes piece |
| B1–B5 Library (shipped) | Opus 4.7 | max / high | Already complete |
| **B6 Layout C Split/Detail** (NEW) | Opus 4.7 | high | New layout, edit-in-place, accent system — judgment-heavy |
| **B7 Bulk Action Bar** (back-patch) | Sonnet 4.6 | default | Chrome only — keyframes + classes |
| C1 Mode-tab strip (shipped) | Opus 4.7 | high | Already complete |
| **C2 Drawer shell + animations** (NEW split) | Opus 4.7 | high | slideIn cubic-bezier, Escape, click-outside, mount/unmount semantics |
| **C3 Section 01 Identity** (NEW split) | Opus 4.7 | high | Kind-picker re-wiring is the trickiest bit |
| **C4 Section 02 Visual** (NEW split) | Opus 4.7 | high | Colour grid + material grid + image dd, swatch type wiring |
| **C5 Section 03 Specs** (NEW split) | Opus 4.7 | high | Per-productType extras dispatch + paintable + painted-with picker |
| **C6 Section 04 Commercial** (NEW split) | Sonnet 4.6 | high | Trade discount chips are NEW field |
| **C7 Section 05 Notes** (NEW split) | Sonnet 4.6 | default | Single textarea atom |
| **C8 Footer** (NEW split) | Sonnet 4.6 | default | Three buttons + save & add another reset behaviour |
| **C9 Duplicate mode body** (NEW) | Sonnet 4.6 | high | Picker UI inside drawer; existing duplicate handler |
| **D1a Schedule shell** (NEW split) | Sonnet 4.6 | high | Page header + toolbar + section markup |
| **D1b CardVariantD** (NEW) | Opus 4.7 | high | Canonical card — most complex Schedule component |
| **D1c Chip cycle-on-click** (NEW) | Sonnet 4.6 | high | Atom + cycle handler |
| **D1d PickerDrawer** (NEW) | Opus 4.7 | high | Translate+fade drawer + sticky sections + multi-select |
| **D1e Field hide/show** (NEW) | Sonnet 4.6 | default | × on hover + hidden tray |
| D2 Cost Schedule | Opus 4.7 | high | Re-pointing data layer is delicate |
| D3 Projects | Sonnet 4.6 | default | Layout retokenise + small rooms editor |
| D4 Settings | Sonnet 4.6 | default | Retokenise 12 sections |
| D5 Nav + chrome | Sonnet 4.6 | default | Token + atom swap |
| E Polish | Sonnet 4.6 | default | Audit + visual sweep (bump to Opus on tricky bugs) |

## Per-phase commit cadence

**v1 work continues on the existing `poc/schedule-taxonomy` branch.** Decided 2026-04-27. The branch holds the parked POC and now grows the v1 design integration on top. Merge to master happens once at the end of Phase E (or earlier as a partial drop if the user prefers).

Commit per logical chunk inside a phase. Branch flow:

```
poc/schedule-taxonomy (current branch)
  ├── A1 (tokens)         ← commit
  ├── A2 (atoms)          ← commit
  ├── A3 (data migration) ← commit (after staging dry-run + user sign-off)
  ├── B1-B5 (Library)     ← committed
  ├── B6-B7 (Layout C + Bulk bar — v1.1)  ← commit per sub-phase
  ├── C1 (mode-tab strip) ← committed
  ├── C2-C9 (Add Product drawer — v1.1)   ← commit per sub-phase
  ├── D1a-D1e (Schedule Cards — v1.1)     ← commit per sub-phase
  ├── D2-D5               ← commit per sub-phase
  └── E                   ← commit
                          → merge to master (or fast-forward) at ship time
```

The parked-POC files (`SchedulePage`, `ItemPickerDrawer`, `TypeEditor`, `LibraryTabs`, etc.) stay accessible behind `?demo=1` throughout. v1 work re-uses what it can (most of them ship in v1 with Type-related UI hidden — see V2_BACKLOG.md for the per-file breakdown).

## Chat handoff at end of each phase

Per saved feedback rule, the assistant working a phase must end its final turn with an explicit chat-reset + model recommendation, e.g.:

> "Phase A1 complete. Start a new chat with Opus 4.7 at high effort for Phase A2 — the atoms phase needs more design judgment than tokens did."

If the next step is small enough to keep going in the same chat, the assistant says so explicitly.

---

## Existing-app features map: where each one lives in v1

(Same table as previous plan, with corrections for the now-locked decisions.)

| Feature | v1 treatment |
|---|---|
| Library Gallery + Table modes | Retokenise + replace markup |
| Library sidebar (libraries list) | **Removed** — replaced by inline-disclosure switcher |
| Add/rename/duplicate/delete library | Moved into LibrarySwitcher overlay |
| Material/Product editor | Replaced by Add Product (Manual + Duplicate) |
| Kind picker (two-column modal) | Preserved — invoked from productType select |
| Find duplicates flow | Preserved + retokenise — entry via Settings + Cmd+K |
| Label templates / name builder | Preserved + retokenise — under Settings → Library Defaults |
| Procedural swatch generators (woodgrain/marble) | Preserved verbatim — design's CSS-only patterns are fallbacks for products with no custom swatch |
| Image upload + crop | Preserved — Visual section's Image tab |
| Paintable flag + Painted-with link | **Preserved** — see C5 above; `paintable` becomes an extras field on lining/render/joinery productTypes; `paintedWithId` references a paint product. Library swatch inherits the linked paint's tone. |
| `swatch.inheritTone` behaviour on paintable products | **Preserved** — Library row + detail panel render with paint's tone when set |
| Subtype glyph overlay on swatches | **Preserved** — existing `subtypeGlyph(productType, subtype)` overlay in Gallery cards + register thumbs |
| Firm glyph picker (30+ presets + image upload) | **Preserved** — Settings → Firm; renders top-left of nav |
| Compare mode | Preserved + retokenise — selection state ink (sage in v2) |
| Bulk operations | Preserved + retokenise |
| Inline cell editing (table mode) | Preserved — `.reg-edit-row` |
| Cell clipboard (C/V) | Preserved (Cost Schedule) |
| Drag-and-drop row reorder | Preserved (Cost Schedule) |
| Cmd+K command palette | Preserved + retokenise |
| `?` cheatsheet | Preserved + retokenise |
| Save status indicator | Preserved + retokenise |
| Cloud toasts | Preserved + retokenise |
| Auth gate | Preserved + retokenise |
| Allowed emails (allowlist) | Preserved as-is |
| Settings page (12 sections) | Preserved + retokenise |
| Firm glyphs | Preserved as-is |
| Tweaks panel | Preserved as dev-only |
| Restore seed | Preserved + retokenise |
| Cost Schedule V2 | Preserved + re-pointed to new schedule shape |
| Schedule (taxonomy-v3) | **Ships in v1** with Types hidden behind feature flag |
| Per-project rooms | **First-class collection** — new UI in Project editor |
| Element axis on schedule rows | **Ships in v1** |
| Product type axis (replaces Kind+Category) | **Ships in v1** via hard-cut migration |
| **Type / Assembly axis** | **Deferred to v2.0** — data layer present, no UI |
| **Library Switcher palette signature** | **Deferred to v2.0** |
| **Add Product URL / PDF / CSV ingestion** | **Deferred to v2.0** |
| **Assembly Editor** | **Deferred to v2.0** |
| **Per-library code-style override (serif italic etc.)** | **Deferred to v2.0** |
| **Per-room canvas / spreadsheet bulk schedule entry** | **Deferred to v2.0** |

---

## Risks

- **Hard-cut migration is high-stakes.** Snapshot first, dry-run against staging clone, run once. The migration script is the single most fragile piece of v1.
- **Category derivation in Cost Schedule.** Today's Cost Schedule groups by `category`. Post-migration, `category` is gone — Cost Schedule must derive groups from `product.productType.group`. Some products may not have a productType set at migration time (corrupt data) — the migration must default them to `'other'` and the UI must surface those for fixup.
- **Existing per-project specs are dropped.** The migration converts spec rows into schedule rows. Status field maps roughly (`'specified'` → state `'new'`, `'installed'` → state `'existing'`, etc.) but it's lossy. Document this in the changelog.
- **Inline-disclosure masthead has a discoverability problem.** First-time users may not realise the title is clickable. Mitigation: hover state on chevron is strong (turns ink), and the chevron is always visible.
- **Cmd+\\ unbound.** Was the sidebar toggle. Library sidebar is removed in v1 (replaced by inline-disclosure switcher). Decided 2026-04-27: unbind entirely. Remove from cheatsheet. Listener removed in [src/Library.jsx](../src/Library.jsx).
- **Mono Clean code style trades editorial signature for legibility.** The README marks serif italic as the signature device; we picked legibility. v2 can let users opt in per library.
