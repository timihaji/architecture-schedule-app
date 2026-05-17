# Mobile Audit — Architecture Schedule App II

Generated: 2026-05-17  
Strategy: single CSS block appended to `index.html` (`<style id="mobile-fixes">`). All fixes are `max-width` overrides; desktop layouts unchanged.

## Routes / Views

| Status | View key | Component | Notes |
|--------|----------|-----------|-------|
| [x] | `library` (register) | `Library` + `LibraryRegister` | Toolbar wraps, search full-width, reg-col-popover repositioned |
| [x] | `library` (gallery) | `Library` + `LibraryLayoutC` | 4→3→2→1 col grid, filter-row stacks |
| [x] | `library` (table) | `Library` + `LibraryTable` | Horizontal-scroll wrapper on `.lt-table-scroll` |
| [x] | `library` (split) | `Library` + `LibraryLayoutC` | `.split` stacks list above detail |
| [x] | `projects` | `Projects` | 7-col grid reflows to 2-col stacked card; header wraps |
| [x] | `cost` (v2) | `CostScheduleV2` | `.cst-root` horizontal scroll; topbar wraps |
| [x] | `cost` (v1) | `CostSchedule` | Page-header wraps |
| [x] | `schedule` | `SchedulePage` | Page-header + toolbar wrap |
| [x] | `settings` | `SettingsPage` | Rail stacks above main; setting rows single-col |

## Shared / Overlay

| Status | Component | Fix |
|--------|-----------|-----|
| [x] | `Nav` | Already had 600/900px rules; added safe-area-inset-top |
| [x] | `MaterialEditor` drawer | Full-width on mobile; `.row-2/.row-3` → single col |
| [x] | `PickerDrawer` | Inherits `.drw-panel` full-width fix |
| [x] | `ProjectEditor` modal | `.ae-backdrop` → slides up from bottom on mobile |
| [x] | `KindPicker` | Uses `.ae-backdrop` — covered |
| [x] | `LabelFormatModal` | Slides up from bottom; tabs scroll horizontally |
| [x] | `FindDuplicatesPanel` | Full-width; `.fd-pair-cols` → single col |
| [x] | `RenumberModal` | `max-width: calc(100vw - 32px)` |
| [x] | `DupeMaterialModal` | `max-width: calc(100vw - 32px)` |
| [x] | `ImportSummaryBanner` | Wraps; anchored to sides |
| [x] | `AuthGate` | Card padding tightened |
| [x] | `RevisionBadge` | Safe-area bottom/left/right |
| [x] | `CloudToasts` | Safe-area bottom/right |

## Checklist (per route, all passing after fix)

- [x] Viewport meta `width=device-width, initial-scale=1` present
- [x] No fixed widths causing horizontal scroll at 320px
- [x] Interactive elements ≥ 44×44px (nav buttons, icon buttons, action buttons)
- [x] Body text ≥ 16px — overridden for all `input/select/textarea` on mobile
- [x] Desktop nav scrolls horizontally on mobile (already existed); safe-area added
- [x] Tables: horizontal scroll wrapper on `.cst-root`, `.lt-table-scroll`
- [x] Modals: full-screen / bottom-sheet on mobile; close button thumb-reachable
- [x] Images: `max-width: 100%; height: auto` added globally
- [x] Sticky nav respects `env(safe-area-inset-top)`
- [x] Fixed elements (`rev-badge`, toasts) respect `env(safe-area-inset-*)`
- [x] Forms single-column on mobile (`.row-2`, `.row-3`, `.st-setting-row`, `.edit-grid`)
- [x] Hover-only `.reg-actions` forced visible on mobile (`.proj-reg-action-btn`)
- [x] Padding/gaps scale down at 600px and 900px breakpoints

## Notes / Known limitations

- **Library Table inline widths**: column widths are set as inline `style` attributes in `LibraryTableRows.jsx`. They scroll correctly inside the wrapper but cannot be further narrowed without JSX changes.
- **Cost Schedule cell widths**: the v2 table renders cells with per-column pixel widths via inline styles. Horizontal scroll covers it; a future pass could introduce responsive column priorities.
- **Settings keyboard shortcuts section**: shown even on mobile where shortcuts aren't relevant — could be hidden with `display:none` if desired, not done here to preserve discoverability.
- **DesktopViewToggle**: the existing `Desktop view` toggle button repositioned from `top:16px right:16px` to avoid colliding with the sticky nav on narrow screens (addressed via the existing z-index layering).
