# Architecture Material Library — Backlog

_Last updated: 2026-04-23_

## ✅ Shipped

- **P1 Foundation** — KINDS vocabulary, trades, `tags[]`, `inferKind` / `inferTrade`, item migration, `readableInk` helper
- **P2 Library kind tabs** — `LTKindTabs` live; kind-aware swatch column (tone + glyph); New-item flow via `KindPicker`
- **P3 Editor blocks** — per-kind PanelKV blocks in `LibraryTableOverlays` (material / appliance+fitting / light / ffe-\* branches)
- **Subtype system** — `SUBTYPES` vocabulary, `subtypeGlyph` helper, tone-tinted swatch cell

## ⚠️ Partial

### P4 Tags
- ✅ Tag chips render on list rows (`tags` column in `LibraryTableRows`)
- ❌ No tag input / autocomplete in the editor (chip input with `STARTER_TAGS` suggestions)
- ❌ No tag filter bar in the Library top chrome (`STARTER_TAGS` defined but unused as a filter control)

### Subtype pickers
- ✅ Helpers exist; glyphs render on table rows + overlay cards
- ❌ **KindPicker step 2** — subtype tiles after picking a kind (old todo 91)
- ❌ **Editor subtype picker** — inline subtype switcher in the item overlay (old todo 92)

## ❌ Not started

### P5 Project Spec view — _in progress_
- New project sub-view, sibling to Cost Schedule
- Flat list of all items spec'd for this project, grouped by trade (collapsible)
- Row: thumbnail/swatch · label · supplier · quantity · tags chips · cost
- Add-item flow: full library picker with kind tabs (not just material)
- "Send winning option from Cost Schedule → Project Spec" action
- Row count per trade in section headers
- No rooms, no options, no export in v1

### Drag polish trio
- Fix grip cursor (I-beam still bleeding through the drag handle)
- Pickup micro-animation on grip press (squish / lift)
- Ghost rotation + growing shadow during drag

## Recommended order

1. **P5 Project Spec view** — biggest remaining v1 piece _(starting now)_
2. Finish P4 tags (editor chip input + top-bar filter)
3. Subtype pickers (KindPicker step 2 + editor picker)
4. Drag polish — pure nice-to-have, last

## Notes / context

- Data model: items have `kind`, `trade`, `tags[]`, optionally `subtype` and `swatch.tone`
- Project Spec lives alongside Cost Schedule in the project nav (not replacing it)
- Cost Schedule stays option-comparison focused; Project Spec is the spec'd/final list
- "Send winning option" is the only bridge between the two surfaces in v1
