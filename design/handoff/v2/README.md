# Handoff v2: Hollis & Arne — Register, Detail & Schedule
## For Claude Code

---

## ⚠️ Read this first — how to use this package

**Do not improvise. Do not summarise. Port.**

The `designs/` folder contains the working prototype as React/JSX. Every interaction, animation, state transition, layout, and visual detail is already implemented there. Your job is to **lift the components from the prototype and re-implement them in the host codebase** — adapting only what is necessary for the host's framework, routing, and data layer.

**Workflow:**
1. Open `designs/Library.html` and `designs/Schedule Cards.html` in a browser. Click around. This is what the finished feature must look and feel like — exactly.
2. Read the source of each file. Find the component listed in the inventory below. Read its JSX and CSS.
3. Re-implement that component in the host codebase. Match the logic, the state, the animation, the CSS values, the copy — everything.
4. Wire to the host data layer. This is the only part you invent.

If anything in this README conflicts with the source HTML files, **the source files win.** This document is an index and a guide; the HTML is the spec.

---

## Context

The host app has already implemented the Library gallery view (Layout B from `Library.html`). The following are not yet built:

- **Layout A — Register** (the dense table/list)
- **Layout C — Split/Detail** (340px list + right detail panel)
- **Add/Edit Drawer** (right-sliding panel for creating and editing items)
- **Schedule view** (the card-based specification schedule in `Schedule Cards.html`)

The layout toggle (Register / Gallery / Split) already exists in the toolbar. Switching layouts must preserve selection state, search state, and filter state.

**Canonical tweak values** — these are the settings selected in the prototype; implement these as defaults:
- Default layout: `"A"` (Register)
- Code chip style: `"mono"`
- Type thumbnail style: `"strip"` (horizontal colour bands)

---

## CSS

Every CSS rule needed is in the `<style>` block at the top of each HTML file. **Lift it verbatim** into the host app's stylesheet or CSS modules. Do not rewrite it. The token layer (`:root` custom properties) is already in the host app — do not duplicate it.

Key CSS sections by comment header (search the file):
- `/* ── LAYOUT A: REGISTER ── */` — register row, header, section label, inline edit row, add row
- `/* ── LAYOUT B: GALLERY ── */` — already implemented, skip
- `/* ── LAYOUT C: SPLIT ── */` — split container, list items, detail panel, detail fields, actions
- `/* BULK ACTION BAR */` — fixed bottom bar, animations
- `/* ── LIBRARY SWITCHER ── */` — dropdown, lib rows, lib row actions
- `/* ── LIBRARY MODAL ── */` — add/edit/delete confirm modals
- `/* ── ADD PRODUCT DRAWER ── */` — drawer backdrop, panel, head, body, foot, all form atoms

For `Schedule Cards.html`, key sections:
- `/* CHIP BASE */` — status and mode chips with all colour variants
- `/* PICKER DRAWER */` — right-side picker drawer shell and rows
- `/* EDIT inputs */` — inline edit field styles
- `/* Hidden tray */` — the show/hide field tray

---

## Component inventory — Library.html

Find each component by searching for its `function` declaration.

### Shared atoms

#### `function Code({ code, kind, style, large })`
Renders an item code (`P-001`, `T-04`) as a styled chip.
- `kind`: `'p'` (product) or `'t'` (type)
- `style`: `'mono'` (canonical) — renders as `.code-mono.p` or `.code-mono.t`
- `large`: boolean — bumps font size (used in Split detail header)
- Other style values (`serif`, `pill`, `box`, `stamp`) exist in CSS — implement only `mono` unless the host app exposes a setting.

#### `function TypeThumb({ code, colors, q6thumb, width, height })`
Renders a type's colour palette.
- `q6thumb === 'strip'` (canonical): horizontal flex of colour bands, each `flex: 1`, contained in a `width × height` div with `border: 1px solid --rule`, `overflow: hidden`.
- Used in register rows (36×36), split list items (32×32), split detail (full width × 140px), gallery cards.

---

### Layout A — Register

#### `function LayoutA({ items, tab, selectedIds, onToggleSelect, onDelete, q6thumb, groupByType, onSelectAllVisible, onClearSel, onEditItem, codeStyle, visibleColIds, onAddNew })`

**Column system:**
The component receives `visibleColIds` (a `Set<string>`) and builds the grid from the active column definitions. Both `PRODUCT_COLS` and `TYPE_COLS` arrays are defined near the top of the script — lift them verbatim. Each column has `{ id, label, width, defaultOn, locked }`. The grid `gridTemplateColumns` string is `visibleCols.map(c => c.width).join(' ')`, applied to both the header div and every row div.

**Rendering order:**
1. Header row (`.reg-head`) — one cell per visible column, rendered by `headCell(c)`.
2. For each group (when `groupByType` is true): group label row (`.reg-section`), then item rows, then add row (`.lib-add-row`).
3. When not grouped: all item rows, then single add row.
4. Empty state (`.empty-state`) when `items.length === 0`.

**Master checkbox logic (header `check` column):**
- `allChecked` = all visible item ids are in `selectedIds`
- `someChecked` = at least one visible item id is in `selectedIds`
- Indeterminate state: `someChecked && !allChecked` → `.cb` gets `background: --ink-3; border-color: --ink-3` + horizontal dash SVG
- Fully checked: `.cb.checked` + tick SVG
- Click: if `allChecked` → `onClearSel()`; else → `onSelectAllVisible()`

**Row state classes:**
- `.selected`: `selectedIds.has(item.id)`
- `.editing`: item is currently in inline-edit mode
- Hover removes the hairline divider above (via `box-shadow: none` on `+ .reg-row`) — this is CSS-only, no JS needed.
- Left accent bar on hover: `box-shadow: inset 2px 0 0 var(--ink-3)`. On selected: `inset 2px 0 0 var(--good)`.

**Actions column:** hidden (`opacity: 0`) until `.reg-row:hover`, then `opacity: 1`. Contains "Edit" button → `onEditItem(item)`, and "×" button → `onDelete(item.id)`. Both stop event propagation.

**Inline edit row (`.reg-edit-row`):**
When a row is in editing state, an edit form expands below it (`.reg-edit-row`). It uses a 2-column grid with `.edit-label` + `.edit-input` fields for Name, Brand, Supplier, SKU, Price. Full-width Name field spans 2 columns. Save/Cancel buttons below.

---

### Layout C — Split / Detail

#### `function LayoutC({ items, tab, selectedIds, onToggleSelect, onDelete, q6thumb, groupByType, codeStyle })`

**Container:** `.split` — `display: grid; grid-template-columns: 340px 1fr`.

**Left list (`.split-list`):**
- `overflow-y: auto; max-height: 700px; border-right: 1px solid --rule`.
- When `groupByType` is on: sticky group label rows (sans 8.5px uppercase `--ink-4`, `border-bottom: 1px solid --rule`, `padding: 10px 12px 4px`).
- Each item: `.split-item`. Click → `selectItem(id)` which sets `activeId` and `setEditing(false)`.
- Active product: `.active.p` → terracotta right border + tinted bg.
- Active type: `.active` → sage right border + tinted bg.
- Checkbox (`.cb`): opacity 0.35 when unchecked, 1 when checked. `e.stopPropagation()` so clicking checkbox doesn't also select the item.

**Right detail (`.split-detail`):**
Controlled by local state: `activeId` (string | null), `editing` (boolean), `editState` (object copy of active item).

**Empty state:** renders when `!active`. Centred column, serif italic "Select an item to see details." + mono hint "N items in list".

**Loaded state — read mode (`!editing`):**
1. Swatch (full width, `height: 140px`): product = solid colour div; type = `<TypeThumb width={800} height={140} />`.
2. Header flex row: left = (type only) mono template label in `--good-ink` above title; title = `<Code large />` inline + serif 22px name; below = sans 13px brand · supplier. Right = "Save" button (only visible when `editing`).
3. `.detail-fields` grid (`1fr 1fr`): product fields = Type, Trade, SKU (mono), Price (mono), Supplier. Type fields = Template, Slots (mono), Trades (spans 2 cols).
4. For types: `.detail-slots` section — each slot row: index number (mono 10px `--ink-4`), 20×20 colour swatch, italic "Slot N — pick a product" placeholder.
5. `.detail-actions` row: "Edit all fields" ghost button (left); "Remove" danger button (right, `margin-left: auto`).

**Edit mode toggle:**
- "Edit all fields" button click: `setEditing(true); setEditState({...active})`.
- "Cancel" (same button relabelled): `setEditing(false)`.
- "Save" (header button): `setEditing(false)` (wire to host save call).
- Navigating to a different list item while editing: `selectItem(id)` calls `setEditing(false)` — discards unsaved edits silently (add a confirm dialog if your UX requires it).

**Loaded state — edit mode (`editing`):**
- `.detail-fields` replaced by edit grid (`1fr 1fr`, `gap: 8px 14px`): Name (spans 2 cols), Brand, Supplier, SKU (mono input), Price (mono input).
- Each field: `.edit-label` + `.edit-input` (or `.edit-input.mono`).
- "Remove" danger button in actions row: deletes item, resets `activeId` to the next available item.

---

### Add / Edit Drawer

#### `function AddDrawer({ open, onClose, tab, editItem, onSave, types })`
(Search for the function that renders `.drw-bg` + `.drw-panel`)

**Mount behaviour:** conditionally rendered — only in the DOM when `open === true`. This gives the CSS animation on mount for free.

**Backdrop (`.drw-bg`):**
- `position: fixed; inset: 0; background: rgba(20,20,20,0.32); z-index: 100`.
- `animation: fadeIn 0.18s ease-out`.
- Click on backdrop → `onClose()`.

**Panel (`.drw-panel`):**
- `position: fixed; top: 0; right: 0; bottom: 0; width: 540px`.
- `border-left: 1px solid --ink`.
- `animation: slideIn 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)`.
- `display: flex; flex-direction: column`.
- `Escape` key → `onClose()` (add `useEffect` with `keydown` listener, clean up on unmount).

**Header (`.drw-head`):**
- Eyebrow: "New Product" / "Edit Product" / "New Assembly" / "Edit Assembly" depending on `tab` and whether `editItem` is set.
- Serif 22px title: item name when editing, "New Product" / "New Assembly" when creating.
- `×` close button right-aligned.
- Mode tabs (`.modes`) — only shown when creating (`!editItem`): Manual | URL | PDF | CSV | Duplicate. Negative horizontal margin (`margin: 0 -22px; padding: 0 22px`) so tab underline spans panel edge to edge.

**Body (`.drw-body`):**
`flex: 1; overflow: auto; padding: 0 22px 18px`.

Sections (each preceded by `.section-h` with serif label and mono numeral):

**01 Identity:**
- Code (`.inp-d.mono`, required asterisk), Name (required, full width).
- Row-2: Type select + Subtype select.
- Row-2: Supplier + Trade.

**02 Visual:**
Tab bar (`.sw-tabs`): Colour / Material / Image.
- **Colour tab:** 8-col grid (`.color-grid`). Each cell (`.color-cell`): `aspect-ratio: 1; border: 1px solid --rule-2`. Selected: `border: 2px solid --ink`. Hover: `transform: scale(1.08)`.
- **Material tab:** 4-col grid (`.mat-grid`). Each card (`.mat-card`): square swatch (`.mat-sw`) + mono 8.5px name. Selected: `outline: 2px solid --ink; outline-offset: 2px`. Hover: `transform: translateY(-1px)`.
- **Image tab:** drag-drop area (`.dd`). `border: 1px dashed --rule-2`. Hover: `border-color: --ink-3; background: --tint-2`.

**03 Specs:**
- Row-3: Width / Depth / Height (all `.inp-d.mono`).
- Row-2: Finish text input + Unit text input.

**04 Commercial:**
- Row-2: Price (`.inp-d.mono`) + Currency select.
- Trade discount chips (`.chip-trade`): existing chips listed inline with an "Add" ghost button.

**05 Notes:**
- `.tarea-d` (serif textarea, `resize: vertical; line-height: 1.5`). Placeholder: "Add specification notes…"

**Footer (`.drw-foot`):**
- Primary "Save" button (`.btn-pri-d`).
- "Save & add another" secondary (`.btn-sec-d`) — saves and resets form without closing.
- "Cancel" secondary — `onClose()`.

---

### Library Switcher

#### `function LibrarySwitcher({ libraries, activeId, onSwitch, onAdd, onEdit, onDelete, variant, productCount, typeCount })`

`variant === 'inline'` is the canonical variant. Renders:
- Eyebrow `"I · Library"`.
- `<button className="mh-inline-title">` — serif 26px library name + `▾` caret. Click → `setOpen(o => !o)`.
- Meta line below: `{productCount} Products · {typeCount} Assemblies · {libraries.length} libraries · {description}`.
- Caret rotates 180° when open (CSS class `.open` on `.mh-inline-title`).

**Dropdown (`.lib-dropdown`):**
- `position: absolute; top: calc(100% + 8px); left: 0; width: 340px`.
- `border: 1px solid --ink; box-shadow: 0 12px 40px rgba(20,20,20,0.15); z-index: 200`.
- Header: "Switch library" label + count.
- Each library row (`.lib-row`): dot indicator (filled when active) + name + description + `Np · Nt` count + hover-revealed Edit/× action buttons.
- Active row: `.lib-row.active` → dot fills, name bolder.
- Footer: italic `+` serif glyph + "New library" ghost text button → `onAdd()`.
- Close on outside click (mousedown listener on `document`, cleaned up on close).

#### `function LibraryModal({ lib, onClose, onSave })`
Centred modal (`position: fixed; inset: 0`). Backdrop `rgba(20,20,20,0.4)`. `Escape` closes. Click outside closes. Name field autofocuses. Save disabled when name empty. For edit: pre-populates name and description.

#### `function LibraryDeleteModal({ lib, onClose, onConfirm })`
Same shell. Shows library name in serif italic. "Delete library" button: `background: #a04545`.

---

### Bulk Action Bar

```jsx
// Renders fixed at viewport bottom when selectedIds.size > 0
<div className="bulk-bar">
  <span className="bulk-count">{selectedIds.size} selected</span>
  <button className="bulk-act">Add to Schedule</button>
  <button className="bulk-act danger">Remove</button>
  <button className="bulk-clear" onClick={onClearSel}>Clear</button>
</div>
```

Animation: `@keyframes barUp { from { transform: translateY(100%); } to { transform: translateY(0); } }` — `0.18s ease`. Applied via `animation: barUp 0.18s ease` on the element. Unmount (not just hide) when count reaches 0 so the slide-out is natural (or animate out explicitly before removing).

---

## Component inventory — Schedule Cards.html

### Data model

Each schedule card has:
```js
{
  id, section, sectionSub, sectionCount,
  kind,          // 'product' | 'type' | 'empty'
  element,       // 'Tapware', 'Floor', 'Wall', etc.
  name,          // item name (absent for empty)
  // product-specific:
  brand, supplier, sku, trade, swatchColor, swatchBrand,
  // type-specific:
  code, slots, trades, slotColors,
  // shared:
  state,         // 'new' | 'existing' | 'repair' | 'match' | 'demolish'
  mode,          // 'prop' | 'perf' | 'open' | 'pc' | 'tba'
  hiddenFields,  // string[] of field keys hidden by user
  notes,
  fields,        // [{ l, v, mono? }] extra display fields
}
```

### `function Chip({ type, value, onChange, showDot })`
Clicking the chip cycles through the list (`STATES` or `MODES`). This is the primary way users change state/mode on a card without opening the full edit tray. Do not replace with a select — the click-to-cycle behaviour is intentional.

CSS classes: `chip s-{value}` for state chips, `chip m-{value}` for mode chips. Each has its own text colour, background colour, and dot colour — lift from the `/* CHIP BASE */` CSS block verbatim.

### `function CardVariantD({ card, density, onSwatchClick, onStateChange, onModeChange, onFieldChange, onHiddenFieldsChange, onDelete, isEditing, onEdit, onSave, q5trade })`

This is the **canonical card variant** to implement. (Variants A, B, C are earlier explorations — do not implement them.)

**Card layout:** `display: grid; grid-template-columns: 178px 1fr`. No border-radius, no shadow.

**Left swatch column (178px):**
- **Product**: solid colour block (`swatchColor`), `height: swatchH` (168px at standard density). Brand name watermark bottom-left: mono 7.5px `rgba(255,255,255,0.35)`.
- **Type**: sage-tinted block (`rgba(107,142,78,0.10)`), top+bottom `1px solid --good`. Centred serif italic 44px weight-300 `code` in `--good-ink`. Below: mono 8px "— N layers —".
- **Empty**: `--paper-2` bg, centred `+` circle SVG in `--ink-4`. Clicking → `onSwatchClick()` → opens picker drawer.

Clicking any swatch → `onSwatchClick()`.

**Right content column:**
`padding: 15px 28px` (standard density).

Top line: element label (sans 8.5px uppercase, coloured by kind: `--accent-ink` for product, `--good-ink` for type, `--ink-4` for empty).

Name row (flex, space-between):
- Left: serif 18px item name + inline mono 11px type `code` (if type). Below: meta row with SKU (mono 9.5px `--ink-4`), supplier (sans 11.5px `--ink-3`), trade (sans 9px uppercase `--ink-4`). Trade chips if `q5trade === 'chips'`.
- Right (read mode only): state chip + mode chip (side by side, no labels).

**Field grid (`.fgrid-d`):**
`display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 16px`. Visible only for fields not in `card.hiddenFields`. Each cell: `.detail-label` + field value (read) or input (edit mode).

**Edit mode:**
Triggered by "Edit" ghost button appearing on card hover (top-right). `isEditing` prop controls the mode.

In edit mode:
- Status/mode chips become `<select className="edit-select">` — same values, same colours applied via inline `style={{ color: f.color }}`.
- Text fields become `<input className="edit-input">` or `<input className="edit-input mono">`.
- Notes field becomes `<textarea className="edit-input" rows={2}>`.
- The edit tray (`.edit-fields`) animates in: `@keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }` — `0.18s ease`.
- "Save" button appears top-right of card → `onSave()`.
- Card background: `rgba(20,20,20,0.012)` while editing.

**Field hide/show:**
- In read mode, hovering a field cell reveals a `×` hide button (`.fcell-hide`). Clicking → `hideField(key)` → adds key to `card.hiddenFields`.
- Hidden fields show in a tray at the bottom of the card (`.hidden-tray`, `background: --paper-2; border-top: 1px dashed --rule-2`). Each hidden field is a ghost button — click to restore (`showField(key)`).

**Hover state:**
`onMouseEnter`/`onMouseLeave` on the card root. `hovered` state controls: "Edit" button visibility, field hide button visibility, left accent bar appearance.

---

### Picker Drawer

#### `function PickerDrawer({ open, onClose, context, products, types, onConfirm })`
(Search for `.drawer-overlay` in Schedule Cards.html)

**Shell:** same animation pattern as Library drawer.
- Backdrop: `position: fixed; inset: 0; background: rgba(20,20,20,0.32); z-index: 200; display: flex; justify-content: flex-end`.
- Drawer: `width: 560px; height: 100vh; border-left: 1px solid --ink`.
- Animation: `@keyframes drawerIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }` — `0.22s ease`. Note: this is a translate+fade, slightly different from the Library drawer's pure translateX.

**Header:**
- Serif 22px drawer title (context-dependent: "Add to Kitchen", etc.).
- Italic 11.5px subtitle.
- Search bar (`.drawer-search`): `border: 1px solid --rule-2`. Focus → `border-color: --ink-3`. Plain text input inside, no button.

**Body:** scrollable, two sticky section headers.

**Types section** (`.dsec-head.types`):
- `position: sticky; top: 0; z-index: 2; background: rgba(107,142,78,0.07)`.
- Eyebrow "Assemblies" in `--good-ink`.
- Count in `--good-ink`.

Each type row (`.prow-type`):
- Left badge (64px wide): sage-tinted bg, `border-right: 1px solid rgba(107,142,78,0.2)`. Centred serif italic 18px weight-300 code in `--good-ink`.
- Body: type name (serif 15px) + slot colour strip (4px tall, each slot `flex: 1`) + mono slots label + sans trades.
- Right: 40px checkmark column — shows `✓` in `--good-ink` when selected.
- Selected: `.prow-type.selected` → sage-tinted background.

**Products section** (`.dsec-head.products`):
- `background: rgba(184,92,58,0.05)`.
- Eyebrow "Products" in `--accent-ink`.

Each product row (`.prow-product`):
- `padding: 10px 24px; gap: 12px`.
- 40×40 colour swatch + name (serif 14px) + meta (brand · type, sans 11px `--ink-4`) + checkmark.

**Footer (`.drawer-foot`):**
- `background: --paper-2; border-top: 1px solid --ink`.
- "Add Product" outlined terracotta button + "Add Assembly" outlined sage button.
- `margin-left: auto`: filled "Add N Items" confirm button → `onConfirm(selectedIds)`.

---

## Schedule page shell

The schedule page uses the same `Nav`, page header, and toolbar pattern as the Library. Additions:
- Section grouping `<select>` in the toolbar: "By Room" / "By Trade" / "By Type".
- "Fields" button → toggles a column-chooser-style popover for visible card fields.
- View toggle: add "Specification" option alongside whatever the existing schedule view is called. Switching is a local state toggle — no route change needed.

Items are grouped into `<div className="sec">` sections. Section header (`.sec-head`): `display: flex; gap: 12px; align-items: center; padding: 12px 0 9px; border-bottom: 2px solid --ink`. Section title: serif 18px 500. Section subtitle (area, e.g. "18 m²"): mono 10px `--ink-4`. Count: mono 9px `--ink-4` (`flex: 1` spacer between subtitle and count).

---

## Interaction checklist

Before considering any feature done, verify:

**Register (Layout A):**
- [ ] Master checkbox cycles through unchecked → indeterminate → all-checked correctly
- [ ] Row hover shows left accent bar AND reveals action buttons
- [ ] Selected rows show sage left bar; stay selected when scrolling
- [ ] Bulk bar slides up from bottom when any item selected; slides/unmounts when deselected
- [ ] Column chooser popover opens below button, closes on outside click
- [ ] Locked columns are greyed and unclickable in the chooser
- [ ] Group labels show when "Group by type" is on
- [ ] Add row appears after each group

**Split / Detail (Layout C):**
- [ ] Clicking list item shows its detail on the right
- [ ] Active item shows correct accent colour (terracotta for products, sage for types)
- [ ] "Edit all fields" expands inputs; "Cancel" collapses without saving
- [ ] Selecting a different item while editing discards edits silently
- [ ] "Remove" deletes item and moves active selection to next item
- [ ] Empty state shows when nothing is selected

**Add / Edit Drawer:**
- [ ] Slides in from right with `cubic-bezier(0.2, 0.8, 0.2, 1)` easing
- [ ] Backdrop fades in simultaneously
- [ ] `Escape` key closes
- [ ] Click outside (on backdrop) closes
- [ ] Mode tabs only show when creating (not editing)
- [ ] "Save & add another" saves and resets form without closing drawer
- [ ] Name and Code fields show required asterisk (`color: --accent`)
- [ ] Save button is disabled / inert when required fields empty

**Schedule cards:**
- [ ] Clicking a status/mode chip cycles to next value (not a dropdown)
- [ ] Hovering a card reveals "Edit" button top-right
- [ ] Clicking "Edit" opens inline edit tray with `slideDown` animation
- [ ] In edit mode, state/mode chips become `<select>` elements (same colour)
- [ ] Clicking swatch opens picker drawer
- [ ] Picker drawer uses translate+fade animation (not pure slide)
- [ ] Selecting items in picker updates footer confirm button count
- [ ] Field hide `×` button appears on field hover; clicking hides field
- [ ] Hidden fields appear in dotted tray at card bottom; click to restore
