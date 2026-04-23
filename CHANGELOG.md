# Changelog

All notable changes to the Architecture Schedule App.

---

## Shipped

### P5 · Project Spec — first pass
- Nav item, header + project switcher
- Trade sections (collapsible) with row renderer
- Right-side drawer picker for adding library items
- Empty state
- Subtotals + grand total

### Cost Schedule Table Mode — first pass
- Gallery/Table toggle in Schedule header (persisted)
- Flat mode — one row per (component × option): Component, Trade, Option, Swatch, Material, Code, Supplier, #, Size, Unit, Unit cost, Line total
- Grouped mode — one row per component; each option becomes a column with inline swatch + material label
- Row-shape toggle (Flat / Grouped), persisted separately from Library's
- Inline editing for Count / Size / Unit
- Click material cell → opens material picker
- Search, sort, column show/hide/reorder/resize (shared DataTable)
- Bulk bar: Duplicate to option, Move to option, Set size, Copy as supplier list, Clear assignment

### P3 · Editor blocks
- Per-kind PanelKV blocks in `LibraryTableOverlays` (material / appliance+fitting / light / ffe-* branches)

### Subtype system
- `SUBTYPES` vocabulary, `subtypeGlyph` helper, tone-tinted swatch cell
- Subtype glyphs render on table rows + overlay cards

### P2 · Library kind tabs
- `LTKindTabs` live
- Kind-aware swatch column (tone + glyph)
- New-item flow via `KindPicker`

### P1 · Foundation
- KINDS vocabulary, trades, `tags[]`
- `inferKind` / `inferTrade`
- Item migration
- `readableInk` helper

### P4 · Tags (partial)
- Tag chips render on Library list rows (`tags` column in `LibraryTableRows`)
