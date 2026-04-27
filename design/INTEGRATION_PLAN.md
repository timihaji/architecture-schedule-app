# Design integration plan — v1.0

## Context

Claude Design returned a hi-fi design system (`design/handoff/`) — Library, Library Switcher, Library Header Options, Add Product, Assembly Editor, Schedule Cards. Tokens lift cleanly onto the existing app's palette (paper/ink/rule/accent identical) plus a sage `--good` accent and `--paper-3` for the second domain.

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

Design's `.gallery` block (Library.html lines 209–310). 4-column grid with 1px rule between cards. Each card: swatch (1.3 aspect), large mono code (11px), serif name (15px), sans brand (11px). Hover → background paper-2 + name underline. Selected → ink outline (in v1 — sage in v2 when Types are live).

| Task | File | Notes |
|---|---|---|
| Replace LibraryGallery JSX | [src/Library.jsx](../src/Library.jsx) | Preserve all existing handlers: filter/sort/group, sidebar (replaced by switcher), search, hover-reveal compare checkbox + ⋯ menu + chevron toggle, inline expand panel on click. |
| Map existing swatch types to design's swatch background | [src/swatches.jsx](../src/swatches.jsx) | Solid → `style={{background: tone}}`. Woodgrain/marble → existing SVG generator. Image → `<img>`. None → procedural pattern from Library.html (brick / wood / tapware / tile / paint / hatching) keyed off `productType`. |
| Type-corner badge | [src/Library.jsx](../src/Library.jsx) | Small mono badge top-right of swatch with productType (`tapware`, `paint`, etc.). NEW in design. |
| Group headers | [src/Library.jsx](../src/Library.jsx) | Replace existing § markers with design's `.reg-section` (italic serif title + rule + count). |

### B4 — Table mode (register)

Design's `.reg-row` block. Each row: drag-handle gutter (left, hover-reveal), checkbox (left, multi-select), 36×36 thumb, code (Mono Clean accent-ink), name (serif 14), brand (sans 11), productType (mono 10 ink-3), supplier (sans 11 ink-3), price (mono 11 right-aligned), hover action area (Edit / Duplicate / Remove).

| Task | File | Notes |
|---|---|---|
| Replace LibraryTable.jsx row markup | [src/LibraryTable.jsx](../src/LibraryTable.jsx) | Preserve: search, sort by clicking column headers, multi-select (Shift/Ctrl/Cmd+click), bulk operations bar, command palette (Cmd+K), inline edit (`.reg-edit-row`), keyboard navigation. |
| Column-chooser popover | port `.col-popover` from design | Replaces existing column-visibility menu. Tokenise. |
| Density selector | toolbar | Existing density tokens map to row padding. |
| Cmd+K command palette | preserve + tokenise | Keep existing logic; popover chrome adopts `.ae` aesthetic (1px ink, paper bg). |
| Cheatsheet (`?` overlay) | preserve + tokenise | Keep existing modal; tokenise. |
| Find duplicates entry | preserve + tokenise | Stays as a Cmd+K command and a Settings → Codes & Duplicates entry. Modal chrome retokenised. |

### B5 — Sidebar removal

The existing Library has a left sidebar listing libraries. With the inline-disclosure masthead the switcher takes over that role. The sidebar is removed in v1.

| Task | File | Notes |
|---|---|---|
| Remove sidebar from Library.jsx | [src/Library.jsx](../src/Library.jsx) | Cmd+\ shortcut now toggles a different surface (deferred — perhaps the column chooser, or just unbind for v1 with a CHANGELOG note). |

### B6 — Functionality preservation checklist

Same table as the previous version of the plan — every existing Library feature mapped to preserved/retokenised/replaced/deferred. No regressions in scope.

---

## Phase C — Add Product editor

Replace existing `KindPicker → ProductEditor` flow with `design/handoff/designs/Add Product.html`.

### C1 — Mode-tab strip

Tabs: Manual (active) · Duplicate · URL (greyed, "v2") · PDF (greyed, "v2") · CSV (greyed, "v2"). Disabled tabs render but cannot be selected; tooltip explains "Available in v2".

### C2 — Manual mode

Five sections separated by `.section-h` with mono numerals (01, 02, 03, 04, 05).

| Section | Fields | Notes |
|---|---|---|
| **01 Identity** | code (Mono Clean input) · name · productType · supplier · sub-supplier | productType select opens the existing two-column kind-picker modal — affordance preserved, just relocated. |
| **02 Visual** | swatch picker — three sub-tabs (Colour / Material library / Image) | Colour = 8-col preset grid → solid hex swatch. Material library = 4-col grid of named patterns → opens woodgrain/marble generators or the procedural patterns. Image = `.dd` drag-drop → existing image upload + crop. |
| **03 Specs** | dimensions (W × D × H) · finish · weight · leadTime · per-productType extras | Per-productType extras dispatched via [src/ProductFieldBlocks.jsx](../src/ProductFieldBlocks.jsx). Existing per-kind fields map cleanly. |
| **04 Commercial** | price · currency · trade discount chips · supplier url · supplier contact · warranty | Trade discount chips: NEW. Wire to a new `tradeDiscounts: string[]` field on Product. |
| **05 Notes** | spec / install notes · general notes | Single serif Newsreader textarea, italic. |

### C3 — Duplicate mode

Opens an inline picker of products in the active library; selecting one prefills all fields except `code` (auto-suggested as next in series via existing `autoAssignCode`). Behaviourally identical to existing "Duplicate material" action.

### C4 — Save / cancel

Footer matches design's `.ae-foot`: primary `Save`, secondary `Save & add another`, tertiary `Cancel`. Wires to `cs.setProducts` (renamed from `setMaterials` post-migration).

### C5 — Functionality preservation

| Feature | Treatment |
|---|---|
| Kind picker (two-column modal) | Preserved — invoked from productType select |
| Auto-code assignment | Preserved — runs on save based on `appState.settings.dupePolicy` |
| Per-kind extras dispatch | Preserved — rendered inside Specs section |
| Label-template-driven display name | Preserved — entry point moves to Settings → Library Defaults → Display rules |
| Paint-specific fields (brand / colourCode / sheen / system) | Preserved — appear in Identity + Specs via ProductFieldBlocks when productType=paint |
| Swatch types (solid / woodgrain / marble / image / inherited) | Preserved — Visual section's three tabs (Colour / Material library / Image) plus the **inherit-from-paint** path lit up when paintable+paintedWithId set |
| **Paintable flag** (NEW location, existing behaviour) | `paintable: bool` becomes an extras field on lining / render_mat / joinery_body / joinery_door productTypes via [taxonomy-defaults.jsx](../src/taxonomy-defaults.jsx). Surfaces in Specs as a checkbox |
| **Painted-with link** (NEW location, existing behaviour) | When `paintable=true`, Specs shows a "Painted with" picker filtered to productType=paint. Stores `extras.paintedWithId`. Library row swatch + detail panel "Painted with: …" link preserved verbatim from existing [src/Library.jsx](../src/Library.jsx) logic |
| `swatch.inheritTone` behaviour | Preserved — Library swatch reads from linked paint's tone when set |

---

## Phase D — Schedule (IV), Cost Schedule (III), Projects, Settings

The largest phase by surface area but smallest in conceptual change. Apply atoms + tokens; preserve every existing flow.

### D1 — Schedule (IV) — taxonomy-v3 page

Ship the existing [src/SchedulePage.jsx](../src/SchedulePage.jsx) (forked from ProjectSpecV2) with Type-related UI hidden behind a `window.SHOW_TYPES` flag (off in v1, on in v2).

| Task | File | Notes |
|---|---|---|
| Hide Type-row card variant when SHOW_TYPES=false | [src/SchedulePage.jsx](../src/SchedulePage.jsx) | Currently switches on `row.specRef.kind === 'type'`. Wrap in flag check. |
| Hide green Types section in picker drawer | [src/ItemPickerDrawer.jsx](../src/ItemPickerDrawer.jsx) | Currently always rendered. Wrap in flag. |
| Hide `+ Add new Type` footer button | [src/ItemPickerDrawer.jsx](../src/ItemPickerDrawer.jsx) | Wrap in flag. |
| Adopt Mono Clean code style | apply CodeChip atom | Replaces serif italic in current SchedulePage. |
| Adopt design's `.sec-head` (2px ink, serif 18) | retokenise | |
| State + SpecMode chips | preserve | Already match design's chip vocabulary. |

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

| Phase | Model | Effort | Why |
|---|---|---|---|
| A1 Tokens | Haiku 4.5 | default | Mechanical edits + grep audit |
| A2 Atoms | Opus 4.7 | high | Component API design — affects every downstream phase |
| A3 Data migration | Opus 4.7 | max | Single highest-stakes piece |
| B Library | Opus 4.7 | max | Biggest phase, most preservation surface |
| C Add Product | Opus 4.7 | high | Form + per-kind dispatch + paintable wiring + label-template integration |
| D1 Schedule | Sonnet 4.6 | high | Existing file, tokenise + Types flag |
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
  ├── B1-B6 (Library)     ← commit per sub-phase
  ├── C1-C5 (Add Product) ← commit per sub-phase
  ├── D1-D5               ← commit per sub-phase
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
