# Hidden Action Menu

_Started 2026-05-17 11:30 UTC_

---

## User

for all pages, i dont like having the buttons for edit, add always showing, is there a ui way to hide it and still making it available?

## Assistant

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: grep]_

Now I have a clear picture. Let me also check the Library page briefly:

_[tool: read_file]_

_[tool: update_todos]_

Great catch — the always-visible `Edit`, `+ Add`, and `⋯` buttons add visual noise to what should feel like a calm reference document. The classic iOS pattern for this is an **"Edit mode" toggle**: a single pencil button in the top bar that reveals all modification affordances. When off, you get a clean read-only view; tap "Edit" and every add/edit/delete control appears in unison.

Let me wire this up across all pages.

_[tool: str_replace_edit]_

**Step 1** — add `editMode` to ui state:**Step 2** — Add pencil/done toggle in TopNav. I'll place it as the first action so it's always visible:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

**Step 3** — Gate `ProjectsPage` buttons:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

**Step 4** — Gate `CostPage` modification buttons:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

**Step 5** — Gate `SchedulePage` modification buttons:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

**Step 6** — Library page. Let me see what add/edit buttons it has:

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: show_html]_

Now let's verify in the framed preview:

_[tool: update_todos]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Done. I added a global **Edit mode toggle** to the top bar (pencil → "Edit"; checkmark → "Done").

**How it works:**
- By default, all pages render in a clean read-only state — no `+ Add`, `+ New project`, `Sel`, `⋯` row menus, per-row Edit/Duplicate/×, inline quantity editing, or per-group "+ Add to ..." buttons.
- Tap **Edit** in the top bar → every modification affordance appears in unison across Library, Projects, Cost Schedule, and Schedule.
- Tap **Done** → back to clean view. Select-mode and inline-edit states auto-exit so you can't get stranded.

**Kept always-visible** (because they're navigation, not modification): tab bar, theme toggle, settings, project tabs, compact/detailed toggle, group-by, search/filter, the `Cost →` / `Schedule →` per-project nav buttons, and tap-on-row to view material details.

If you'd like to explore variations (e.g., long-press to enter edit, a floating "+" only, or swipe-row-left to reveal edit/delete), say the word and I'll set them up as tweaks.

## User

Verifier agent check completed

## Assistant

Verifier confirmed clean across all four pages — modification affordances hide and reappear correctly with the Edit toggle, navigation buttons stay put. Ready for your next move.

