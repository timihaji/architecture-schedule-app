// Phase D1d — PickerDrawer for Schedule swatch-click. Replaces the canonical
// /* PICKER DRAWER */ block from design/handoff/v2/Schedule Cards.html.
//
// Two modes:
//   • single  → onPick(productId|typeId)         — one row's swatch click
//   • multi   → onPick(arrayOfIds)               — bulk add from "Add to Section"
//
// Header context comes from { eyebrow, title, subtitle } props (e.g. eyebrow
// "Specify · Door", title "Pick from Library"). Body = sticky Assemblies
// section (sage tint) + sticky Products section (terracotta tint). Assemblies
// are hidden in v1 unless window.SHOW_TYPES is true; the parked-POC type
// templates feed the section once Types ship.
//
// Keyframe is translate-X 40px + opacity, NOT C2's pure slideIn. Backdrop
// click / Escape closes. The footer's "Add Product" / "Add Assembly" buttons
// are NEW-IN-LIBRARY buttons (per the Schedule Cards.html footer), not the
// confirm action — they fire onAddNewProduct / onAddNewType when supplied;
// callers can leave them out to hide.

(function () {
  const { useState, useMemo, useEffect, useRef } = React;

  function PickerDrawer({
    open,
    eyebrow,
    title = 'Pick from Library',
    subtitle,
    materials = [],
    typeTemplates = [],
    elementFilter,        // optional element id; types are filtered to this element when set
    selectionMode = 'single',
    initialSelected = [],
    showTypes,            // override; defaults to window.SHOW_TYPES
    onPick,               // (idOrIds) => void
    onClose,
    onAddNewProduct,      // optional — footer "Add Product" button
    onAddNewType,         // optional — footer "Add Type" button (hidden in v1 unless typed-on)
  }) {
    const [q, setQ] = useState('');
    const [sel, setSel] = useState(() => new Set(initialSelected));
    const searchRef = useRef(null);

    const typesEnabled = (showTypes != null) ? showTypes : !!window.SHOW_TYPES;

    // Reset on open and focus search.
    useEffect(() => {
      if (!open) return;
      setQ('');
      setSel(new Set(initialSelected));
      const t = setTimeout(() => searchRef.current && searchRef.current.focus(), 60);
      return () => clearTimeout(t);
    }, [open]);  // eslint-disable-line react-hooks/exhaustive-deps

    // Escape closes.
    useEffect(() => {
      if (!open) return;
      function onKey(e) { if (e.key === 'Escape') onClose && onClose(); }
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    // Filter sources.
    const matchingTypes = useMemo(() => {
      if (!typesEnabled) return [];
      const all = (typeTemplates || []).filter(t => {
        if (!elementFilter) return true;
        const els = t.elements || (t.element ? [t.element] : []);
        return els.length === 0 || els.includes(elementFilter);
      });
      const lc = q.trim().toLowerCase();
      if (!lc) return all;
      return all.filter(t =>
        (t.name || '').toLowerCase().includes(lc) ||
        (t.code || '').toLowerCase().includes(lc));
    }, [typeTemplates, elementFilter, q, typesEnabled]);

    const matchingProducts = useMemo(() => {
      const lc = q.trim().toLowerCase();
      if (!lc) return materials;
      return materials.filter(m =>
        (m.name || '').toLowerCase().includes(lc) ||
        (m.code || '').toLowerCase().includes(lc) ||
        (m.brand || '').toLowerCase().includes(lc) ||
        (m.supplier || '').toLowerCase().includes(lc));
    }, [materials, q]);

    if (!open) return null;

    function toggle(id) {
      setSel(prev => {
        const next = new Set(prev);
        if (selectionMode === 'single') {
          if (next.has(id)) next.delete(id);
          else { next.clear(); next.add(id); }
        } else {
          if (next.has(id)) next.delete(id); else next.add(id);
        }
        return next;
      });
    }

    function confirm() {
      if (sel.size === 0) return;
      const ids = Array.from(sel);
      if (selectionMode === 'single') onPick && onPick(ids[0]);
      else onPick && onPick(ids);
      onClose && onClose();
    }

    const hasTypes = matchingTypes.length > 0;
    const placeholder = elementFilter
      ? `Search ${elementFilter} types and products…`
      : 'Search types and products…';
    const confirmLabel = selectionMode === 'single'
      ? 'Confirm →'
      : `Add ${sel.size || ''} Item${sel.size === 1 ? '' : 's'}`.trim();

    return (
      <div className="pdrw-overlay" onClick={e => { if (e.target === e.currentTarget) onClose && onClose(); }}>
        <div className="pdrw" role="dialog" aria-modal="true">
          {/* Head */}
          <div className="pdrw-head">
            <div className="pdrw-head-row">
              <div style={{ minWidth: 0 }}>
                {eyebrow && <div className="pdrw-eyebrow">{eyebrow}</div>}
                <span className="pdrw-title">{title}</span>
                {subtitle && <span className="pdrw-subtitle">{subtitle}</span>}
              </div>
              <button type="button" className="pdrw-close" onClick={onClose} aria-label="Close">×</button>
            </div>
            <div className="pdrw-search">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                style={{ color: 'var(--ink-4)', flexShrink: 0 }}>
                <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="1.5" />
                <line x1="15.2" y1="15.2" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input ref={searchRef} placeholder={placeholder}
                value={q} onChange={e => setQ(e.target.value)} />
              {q && (
                <button type="button" className="pdrw-search-clear"
                  onClick={() => setQ('')} aria-label="Clear search">×</button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="pdrw-body">
            {typesEnabled && (
              <>
                <div className="pdrw-dsec-head types">
                  <div>
                    <div className="pdrw-dsec-eyebrow">Assembly Types</div>
                    <div className="pdrw-dsec-explain">One pick · multiple products · shared across project</div>
                  </div>
                  <span className="pdrw-dsec-count">{matchingTypes.length}</span>
                </div>
                {matchingTypes.length === 0 && (
                  <div className="pdrw-empty">
                    <div className="pdrw-empty-msg">
                      No {elementFilter ? `${elementFilter} ` : ''}assembly types in library yet.
                    </div>
                    <div className="pdrw-empty-sub">
                      Create one with + Add new Type below — it'll be reusable across all projects.
                    </div>
                  </div>
                )}
                {matchingTypes.map(t => {
                  const isSel = sel.has(t.id);
                  const slotColors = t.slotColors || (t.layers || []).map(l => l.color || '#cdcfd2');
                  return (
                    <button key={t.id} type="button"
                      className={`pdrw-prow-type${isSel ? ' selected' : ''}`}
                      onClick={() => toggle(t.id)}>
                      <div className="pdrw-prow-type-badge">
                        <div className="pdrw-prow-type-code">{t.code}</div>
                        {t.slots != null && (
                          <div className="pdrw-prow-type-slots-mini">{t.slots} slots</div>
                        )}
                      </div>
                      <div className="pdrw-prow-type-body">
                        <div className="pdrw-prow-type-name">{t.name}</div>
                        {slotColors.length > 0 && (
                          <div className="pdrw-prow-type-slots">
                            {slotColors.map((c, i) => (
                              <div key={i} className="pdrw-prow-type-slot"
                                style={{ background: c }} title={`Layer ${i + 1}`} />
                            ))}
                          </div>
                        )}
                        <div className="pdrw-prow-type-meta">
                          {t.slots != null && (
                            <span className="pdrw-prow-type-slots-label">{t.slots} layers</span>
                          )}
                          {(t.trades || []).length > 0 && (
                            <span className="pdrw-prow-type-trades">{(t.trades || []).join(' · ')}</span>
                          )}
                        </div>
                      </div>
                      <div className="pdrw-prow-type-check">{isSel && <span>✓</span>}</div>
                    </button>
                  );
                })}
              </>
            )}

            <div className="pdrw-dsec-head products">
              <div>
                <div className="pdrw-dsec-eyebrow">{typesEnabled ? 'Single Products' : 'Products'}</div>
                <div className="pdrw-dsec-explain">One item · one trade · specify per room</div>
              </div>
              <span className="pdrw-dsec-count">{matchingProducts.length}</span>
            </div>

            {matchingProducts.length === 0 && (
              <div className="pdrw-empty">
                <div className="pdrw-empty-msg">No products match.</div>
                <div className="pdrw-empty-sub">
                  Try clearing the search or adding a new product below.
                </div>
              </div>
            )}

            {matchingProducts.map(m => {
              const isSel = sel.has(m.id);
              const thumb = (m.swatch && m.swatch.tone) || m.color || 'var(--paper-2)';
              return (
                <button key={m.id} type="button"
                  className={`pdrw-prow-product${isSel ? ' selected' : ''}`}
                  onClick={() => toggle(m.id)}>
                  <div className="pdrw-prow-product-thumb" style={{ background: thumb }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pdrw-prow-product-name">{m.name || m.code || 'Unnamed'}</div>
                    <div className="pdrw-prow-product-meta">
                      {m.code && <span style={{ fontFamily: 'var(--font-mono)' }}>{m.code}</span>}
                      {m.brand && <span>{m.brand}</span>}
                      {!m.brand && m.supplier && <span>{m.supplier}</span>}
                    </div>
                  </div>
                  <div className="pdrw-prow-product-check">{isSel && <span>✓</span>}</div>
                </button>
              );
            })}
          </div>

          {/* Foot */}
          <div className="pdrw-foot">
            {onAddNewProduct && (
              <button type="button" className="pdrw-add acc" onClick={onAddNewProduct}>
                + Add new Product
              </button>
            )}
            {typesEnabled && onAddNewType && (
              <button type="button" className="pdrw-add gd" onClick={onAddNewType}>
                + Add new Type
              </button>
            )}
            <button type="button" className="pdrw-confirm"
              onClick={confirm} disabled={sel.size === 0}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  window.PickerDrawer = PickerDrawer;
})();
