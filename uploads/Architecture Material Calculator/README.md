# Cost Table - Local Setup

## Quick start

The workspace is already wired up to run the attached `CostTable.jsx` through `src/App.jsx`.

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Files

- `src/CostTable.jsx`: main cost table screen and UI orchestration.
- `src/costTableModel.js`: document shape, persistence, history, and calculation helpers.
- `src/costTableCells.jsx`: reusable editable cell and unit select components.
- `src/dynamic-table.jsx`: preserved live table utility.
- `src/App.jsx`: minimal app entry that renders `CostTable`.

## Notes

- `CostTable.jsx` is the active screen.
- The big cost table logic is now split so the main screen is easier to hand off and iterate on.
- `dynamic-table.jsx` is preserved in the project and can be wired in when needed.
- From here on, edits should be made against these existing files rather than replacing the UI shell.
