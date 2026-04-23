# Remaining work

_Last updated by Claude after P5 first pass landed._

## P5 · Project Spec (IV) — in progress

The skeleton shipped (nav item, header + project switcher, trade sections, row renderer, right-side drawer picker, empty state, subtotals + grand total). Remaining:

- [ ] **Dedupe warn dialog** — when picking a material already in the spec, offer *Replace existing row / Add a second row / Cancel* instead of silently adding a duplicate.
- [ ] **Tags on rows** — inline editor (chip input) per row, using `STARTER_TAGS` for suggestions. Filter pills at top are wired but there's no UI to attach tags yet.
- [ ] **Row click → Library item overlay** — open a read-only side panel showing the full Library record (spec, lead time, finish, linked paint, etc.) so you don't have to leave Spec to check details.
- [ ] **CS bridge**
  - Top-bar bulk action: "Send all to Cost Schedule" (creates one Option with every row as a component).
  - Per-row "Promote to Cost Schedule" menu item.
- [ ] **Drag-reorder trade sections** and rows within a section (reuse `CostScheduleDnD` if compatible).
- [ ] **Seed fix for p-brunswick** — current seed looks items up by code fragment (`TIM`, `VEN`, etc.) but those don't match the actual library codes, so it falls back to empty. Pick real ids from `data.jsx` so new Brunswick sessions ship with a populated spec.
- [ ] **Supplier roll-up / export** — group rows by supplier for a "send this list to each trade" view; copy-to-clipboard or CSV export.

## P2 · Kinds & subtypes — optional polish

- [ ] **KindPicker shows subtype tiles** after a kind is chosen (step 2 of new-item creation).
- [ ] **Editor exposes a subtype picker** so users can change subtype post-creation.

## DnD polish (Cost Schedule v2)

- [ ] **Fix grip cursor** — I-beam bleeds over drag handle in some browsers.
- [ ] **Pickup micro-animation** when the grip is pressed (small scale-down or pop).
- [ ] **Ghost rotation + growing shadow** as the drag moves further from origin.

## Open question from the user

- [ ] **III. Cost Schedule table view** — Claude couldn't find prior context for this in the (trimmed) chat history. User to re-describe or point at the prior turn.
