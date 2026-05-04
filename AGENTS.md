# Project Instructions

- Do not create or switch to a feature branch unless the user explicitly asks for one. When asked to push, commit and push the current branch unless the user says otherwise.

## Browser verification (mandatory for UI changes)

Before reporting any UI-touching task as done, run `/verify`. Do not mark done or push without it.

For changes to the **Schedule page** specifically, confirm all four before closing:
1. Empty schedule renders without error
2. Schedule with rows renders correctly
3. "Add row" opens the picker
4. Adding a row and removing it leaves the schedule in the prior state

If the server isn't running, start it first:
```bash
python3 -m http.server 8080 --directory "/Users/timihajnady/Library/CloudStorage/OneDrive-Personal/Desktop/Claude/Architecture Schedule App II"
```

## OneDrive commit rule

After writing any file, run `git add <file> && git commit` immediately — before any verification step. OneDrive sync can silently revert uncommitted writes.
