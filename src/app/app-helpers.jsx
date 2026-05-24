// App-level shared helpers (Phase 6 extract).
//
// Single source of truth for swatch-tone resolution. The "paintable inheritTone"
// rule lives here so LibraryColumns / LibraryLayoutC / future call sites all
// behave identically. Other call sites (Library.jsx, LibraryRegister.jsx,
// LibraryTableOverlays.jsx, LibraryTableRows.jsx) still inline this logic
// — leave them for a future cleanup; this commit only consolidates the three
// sites named in the Phase 6 plan.

// A paintable product can opt in to mirroring the linked paint's tone by
// setting swatch.inheritTone. Returns the swatch with the linked paint's
// tone substituted in; otherwise returns the original swatch.
function effectiveSwatch(m, allMaterials) {
  if (!m) return null;
  const paintedWithId = window.getFieldValue ? window.getFieldValue(m, 'paintedWith') : m.paintedWithId;
  if (m.swatch?.inheritTone && paintedWithId) {
    const linked = (allMaterials || []).find(x => x.id === paintedWithId);
    if (linked) return { ...m.swatch, tone: linked.swatch?.tone };
  }
  return m.swatch;
}

Object.assign(window, { effectiveSwatch });
