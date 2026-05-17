# Schedule Toggle & Editing

_Started 2026-05-17 11:21 UTC_

---

## User

can you work on the schedule page. the user needs an option to toggle on more detail. and a way to add and edit etc. btw schedule is in the australian context, not dealing with time, but its a specification in architecture

## Assistant

_[tool: list_files]_

_[tool: local_ls]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: local_grep]_

_[tool: local_ls]_

Let me check the local reference for the desktop schedule view to understand what "more detail" means in this Australian architecture context.

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_grep]_

_[tool: update_todos]_

Now I have a clear picture. The desktop app has a "Columns ▾" detail chooser; for mobile I'll do something similar with a clean Detail toggle. Let me plan and build.

_[tool: str_replace_edit]_

Plan — I'll rebuild the mobile **Schedule** page with this aesthetic locked in:
- Warm paper, Newsreader serif for material names, Inter Tight for chrome, JetBrains Mono for codes — matches existing
- **Group by** segmented control: Element / Category / Code / None
- **Detail toggle** (Compact ↔ Detailed) — compact = one line per row, detailed = full mini-spec block per row with supplier, finish, lead time, notes
- **Add** at top right + per-group "+ Add to {section}" at bottom of each group
- **Tap a row** → action sheet (Edit · Duplicate · Delete)
- **Edit/Add** share one sheet with material picker, code, qty, element + an optional note

Let me also add a `note` field to row updates and a per-row `code` editable in the form (it's currently shown but not editable from the schedule view).

_[tool: show_html]_

_[tool: done]_

_[tool: fork_verifier_agent]_

I've rebuilt the mobile Schedule page with the features you asked for:

**Detail toggle** (Compact ↔ Detailed) in the toolbar
- Compact: one-line rows — swatch · material name · element · qty/unit · code
- Detailed: bigger swatch · serif name · element · category chip · spec mini-grid (Supplier / Finish / Lead time / Product code / Unit cost) · optional spec note with accent left rule

**Add & edit**
- Top-right "+ Add" and a dashed "+ Add to {group}" at the foot of every section
- Tap any row → bottom sheet with **Edit · Duplicate · Delete**
- Edit/Add share one sheet: material picker (from library), Element/location, Schedule code (mono), Quantity, and a Specification note (for setting/joint/exposure/fixings type detail)

**Grouping** segmented tabs: Element / Category / Code / None (code groups by prefix like FS-, WL-, MT-). Group choice and detail level both persist via localStorage.

The verifier is checking both states now and will ping back if anything looks off.

## User

can you change icon of schedule to something else more appropriate

## Assistant

_[tool: str_replace_edit]_

I'll swap the calendar icon (wrong metaphor — a schedule is a specification register, not a time-based thing) for a two-column register icon — reads as a spec sheet with codes/details paired up.

_[tool: done]_

Swapped the Schedule icon to a two-column register glyph (like an open spec book / ledger) — reads as "specification document" rather than a calendar.

