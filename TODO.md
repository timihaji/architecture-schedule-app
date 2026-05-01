# TODO — single source of truth

_Last consolidated 2026-05-01 from old TODO.md, FEATURE REQUESTS.md, design/V2_BACKLOG.md, and CLOUD_SYNC_PLAN.md._

Cloud sync is fully shipped. Library Field System v5 (Phases 1–5), Cost Schedule v2, and Codes refactor (Phases 1–2) are shipped.

---

## Now / Near-term

### Project Spec (IV)
- [ ] **Dedupe warning when re-adding** — picking a material that's already in the spec should offer Replace / Add second row / Cancel instead of silently duplicating.
- [ ] **Tag chip input on rows** — inline editor per row, with `STARTER_TAGS` autocomplete. Filter pills exist; the attaching UI doesn't.
- [ ] **Click row → Library item overlay** — read-only side panel showing the full Library record (spec, lead time, finish, linked paint).
- [ ] **Cost Schedule bridge** — top-bar "Send all to Cost Schedule" + per-row "Promote to Cost Schedule" menu item.
- [ ] **Drag-reorder trade sections + rows within a section** — reuse `CostScheduleDnD` if compatible.
- [ ] **Brunswick seed fix** — current seed looks items up by code fragments that don't match real library codes; pick real ids from `data.jsx`.
- [ ] **Supplier roll-up / export** — group rows by supplier; copy-to-clipboard or CSV.

### Library Tags (Phase 4 — partial)
- [ ] **Tag chip input in Library editor** — inline chip input with `STARTER_TAGS` autocomplete.
- [ ] **Tag filter bar in Library top chrome** — `STARTER_TAGS` defined but not yet wired as a filter control.

### Cost Schedule — Table mode polish
- [ ] **Saved views as tabs** — Library has them; Schedule Table doesn't.
- [ ] **Bulk action: Delete rows** — missing from bulk bar.
- [ ] **Grouped mode: empty cells click-to-pick** — verify it opens the picker.
- [ ] **Grouped mode: long material labels** — needs ellipsis + tooltip with full name on hover.

### DnD polish (Cost Schedule v2)
- [ ] **Fix grip cursor** — I-beam bleeds over drag handle in some browsers.
- [ ] **Pickup micro-animation** when grip is pressed (small scale-down or pop).
- [ ] **Ghost rotation + growing shadow** as drag moves further from origin.

### Kinds & Subtypes (Phase 2 polish)
- [ ] **KindPicker shows subtype tiles** after a kind is chosen (step 2 of new-item creation).
- [ ] **Editor exposes a subtype picker** so users can change subtype post-creation.

### Cloud / storage
- [ ] **Move swatch photos and spec PDFs to Supabase Storage** — currently embedded as base64 in JSONB blobs; moving them out shrinks records and unlocks CDN delivery.

---

## Bigger features (need planning)

### PDF export of the Schedule
For sending to clients/contractors. Requirements:
- A4 / A3, portrait / landscape
- Customisable: choose what info shows
- **Version control** — store revisions; show what's changed between versions on the schedule.

### Default SVG icons for prefilled defaults
e.g. each appliance category has a representative icon.

### Auto-rename / format codes
Already partially shipped (Renumber buttons in Cost III + Schedule IV per Codes refactor Phase 2). What's left:
- Configurable code format in Settings — pick `TM01` vs `TM-01` vs `TIM-01` vs custom.
- Per-library override of the format (see V2 backlog item below).

### Custom categories + good defaults
Already shipped via Field Manager (Settings → Library fields). What's left to round out:
- Better default seed list of categories (sensible starting taxonomy).
- A way to import/export taxonomies between projects.

### Studio / firm details
- Add the architect or firm's name in header and footer (driven from Settings).
- Later: upload a logo image.

---

## V2 backlog (parked from v1)

### Types / Assemblies UI surface
Data layer ships in v1; UI hidden behind `window.SHOW_TYPES`. To turn on:
1. Flip the flag (or move to `appState.settings.featureFlags.types`).
2. Reintroduce Library tabs (Products + Types).
3. Rebuild the Assembly Editor on top of v1 atoms — pick a layout from `design/handoff/designs/Assembly Editor Options.html` (dense ledger recommended).
4. Build a Stack visualisation atom — horizontal coloured bands proportioned to each slot's `thicknessMm`.
5. Light up sage selection states on Library row selection, picker Types pill, code badge.

### Library Switcher: palette swatches
Show each library with a 4–5-swatch palette strip as visual identity.
- `getLibraryPalette(libraryId, products)` helper, derived on save (cached).
- Optional: pin specific tones per library.

### Add Product ingestion modes
The editor currently has a 5-tab strip; only Manual + Duplicate active. To wire up:
- **URL** — fetch product page, parse Open Graph / structured data / title; needs server-side proxy or Supabase Edge Function (CORS).
- **PDF** — drop a supplier PDF, extract fields. Claude API in extract mode is a good fit.
- **CSV** — bulk import; per-row preview before commit.

### Per-library code-style override
v1 ships Mono Clean globally. Allow per-library setting: `mono | serif-italic | pill | box | stamp`.

### Per-library masthead variant
v1 ships Inline-disclosure. Other variants (Plate / Rule / Meta-line switch) live in design and could be per-library.

### Schedule entry modes
v1 ships per-row entry. Other modes:
- **Per-room canvas** — pick a room, click element tiles to add. Faster for typical rooms.
- **Spreadsheet-style** — paste rows from a spreadsheet for bulk import.

### Misc V2 polish
- Density auto-detection by viewport.
- Sage accent in selection states.
- Per-library hide of type-corner badge on Library cards.
- `Cmd+\` rebind to open Library Switcher.
- Draggable / resizable action bar + side panel.

---

## Tiny / unsorted

These came from old `FEATURE REQUESTS.md` and aren't fully scoped:

- **No gradients in materials** — confirm and remove if any remain.
- **Sort the "assign to component" picker** — make it sortable.
- **Entry title should be the full rendered name.**
- **Replace dropdown with expandable, sortable, categorised picker** — context unclear; revisit.
- **Settings polish:**
  - Sans-serif title option.
  - Custom user-defined stages.
  - One more stage between studio and full width.
  - "What does IV mean on the settings button?" → revisit; roman numerals were already removed elsewhere.
  - Settings icon looks like a sun, should be a gear.

---

## Recently shipped (for reference)

- Cloud sync — all 6 phases of `CLOUD_SYNC_PLAN.md`. Materials, projects, libraries, schedules, specs, settings, taxonomies all live in Supabase.
- Library Field System v5 — schema-driven categories, fields, group-by axis, full Field Manager in Settings.
- Cost Schedule v2 — Gallery + Table modes, grouped + flat row shapes, side panel, row actions, keyboard nav, supplier roll-up, filter chips.
- Codes refactor — Phases 1 & 2 (Cost III + Schedule IV both read/write `row.code`; picker preview + Renumber buttons).
- Library Register as default view; column picker expanded.
- Configurable theme toggle.
- Custom Group-by dropdown on every Library view + Cost Schedule.
