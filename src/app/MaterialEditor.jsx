// MaterialEditor — right-sliding drawer for adding / editing a product.
//
// v7 rebuild (Phase 7) — re-implements design/handoff/latest/designs/
// Edit Product v7.html in React. Replaces the legacy SwatchEditor + hardcoded
// section blocks with:
//   • Section-driven body (sections come from window.sectionsActive()).
//   • Inline schema editing in "Customize fields" mode — drag-drop reorder,
//     width picker, hide / delete / restore, add field/section. Changes write
//     to the live taxonomies blob (firm-wide).
//   • Visual picker (Colour / Pattern / Image) via window.VisualPickerV7.
//   • Used By cross-reference panel (async schedule scan).
//   • Prev / next nav across the visible Library list.
//   • Loose mode + dirty / customizing pills.
//   • Undo / redo of schema edits (Cmd/Ctrl+Z, ⇧+).
//
// State picker, Tweaks panel, and v-banner from the prototype are NOT shipped
// — those are design-review aids only.

(function () {
  const { useState, useEffect, useRef, useMemo, useCallback } = React;

  // ────────────────────────────────────────────────────────────────────────
  //  Top-level drawer
  // ────────────────────────────────────────────────────────────────────────
  function MaterialEditor({
    material, materials = [], labelTemplates, onOpenLabelBuilder,
    onClose, onSave, onSaveAndAddAnother, requireCodeOnSave,
    showLibraryCode = false,
    siblings = null,   // [materialId, ...] in current Library view order
    onNavigate,        // (materialId) => void
    onDelete,          // (materialId) => void
  }) {
    const [draft, setDraft] = useState(() => ({
      ...material,
      currency: material.currency || 'AUD',
      swatch: material.swatch
        ? (window.migrateSwatchToV7 ? window.migrateSwatchToV7(material.swatch) : material.swatch)
        : { mode: 'colour', kind: 'solid', tone: '#cdcfd2' },
    }));
    const [codeError, setCodeError] = useState(false);
    const [customizing, setCustomizing] = useState(false);
    const [looseMode, setLooseMode] = useState(false);
    const [dirty, setDirty] = useState(false);
    const drawerRef = useRef(null);

    function set(k, v) {
      setDraft(d => ({ ...d, [k]: v }));
      setDirty(true);
      if (k === 'code') setCodeError(false);
    }
    function setSwatch(k, v) {
      setDraft(d => ({ ...d, swatch: { ...(d.swatch || {}), [k]: v } }));
      setDirty(true);
    }

    // Reload draft when navigating to a new material
    useEffect(() => {
      setDraft({
        ...material,
        currency: material.currency || 'AUD',
        swatch: material.swatch
          ? (window.migrateSwatchToV7 ? window.migrateSwatchToV7(material.swatch) : material.swatch)
          : { mode: 'colour', kind: 'solid', tone: '#cdcfd2' },
      });
      setDirty(false);
      setCodeError(false);
      // Flash animation
      if (drawerRef.current && drawerRef.current.animate) {
        drawerRef.current.animate(
          [{ transform: 'translateX(8px)', opacity: 0.6 }, { transform: 'translateX(0)', opacity: 1 }],
          { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }
        );
      }
    }, [material && material.id]);

    function handleSave() {
      if (requireCodeOnSave && !draft.code?.trim()) { setCodeError(true); return; }
      onSave(draft);
    }
    function handleSaveAndAddAnother() {
      if (requireCodeOnSave && !draft.code?.trim()) { setCodeError(true); return; }
      if (onSaveAndAddAnother) onSaveAndAddAnother(draft);
    }
    function handleDelete() {
      if (!onDelete || material._isNew) return;
      if (window.confirm('Delete this product?')) onDelete(material.id);
    }

    // Sibling nav indices
    const sibIdx = useMemo(() => {
      if (!siblings || !Array.isArray(siblings) || !material) return -1;
      return siblings.indexOf(material.id);
    }, [siblings, material && material.id]);

    function gotoPrev() {
      if (!onNavigate || sibIdx <= 0) return;
      onNavigate(siblings[sibIdx - 1]);
    }
    function gotoNext() {
      if (!onNavigate || sibIdx < 0 || sibIdx >= siblings.length - 1) return;
      onNavigate(siblings[sibIdx + 1]);
    }

    // Keyboard: Escape closes, ←/→ nav (unless inside an input), Cmd/Ctrl+E customize, Cmd/Ctrl+L loose
    useEffect(() => {
      function onKey(e) {
        if (e.key === 'Escape') { onClose(); return; }
        const inField = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
        if (inField) return;
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
          e.preventDefault(); setCustomizing(c => !c); return;
        }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
          e.preventDefault(); setLooseMode(m => !m); return;
        }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); gotoPrev(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); gotoNext(); }
      }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onClose, sibIdx]);

    // Schema undo / redo (customize mode only)
    const undoStack = useRef([]);
    const redoStack = useRef([]);
    const [, forceRender] = useState(0);
    function pushHistory() {
      if (!window.schemaSectionMutators) return;
      const snap = window.schemaSectionMutators.snapshotSchema();
      undoStack.current.push(snap);
      if (undoStack.current.length > 50) undoStack.current.shift();
      redoStack.current.length = 0;
      forceRender(x => x + 1);
    }
    function doUndo() {
      if (!undoStack.current.length || !window.schemaSectionMutators) return;
      const snap = window.schemaSectionMutators.snapshotSchema();
      redoStack.current.push(snap);
      const prev = undoStack.current.pop();
      window.schemaSectionMutators.replaceSchema(prev);
      forceRender(x => x + 1);
    }
    function doRedo() {
      if (!redoStack.current.length || !window.schemaSectionMutators) return;
      const snap = window.schemaSectionMutators.snapshotSchema();
      undoStack.current.push(snap);
      const next = redoStack.current.pop();
      window.schemaSectionMutators.replaceSchema(next);
      forceRender(x => x + 1);
    }
    useEffect(() => {
      function onKey(e) {
        if (!customizing) return;
        const meta = e.metaKey || e.ctrlKey;
        if (!meta) return;
        const inField = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
        if (inField) return;
        if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); }
        else if ((e.key.toLowerCase() === 'y') || (e.shiftKey && e.key.toLowerCase() === 'z')) {
          e.preventDefault(); doRedo();
        }
      }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [customizing]);

    // Reset undo when entering / leaving customize mode
    useEffect(() => {
      if (!customizing) {
        undoStack.current = [];
        redoStack.current = [];
        forceRender(x => x + 1);
      }
    }, [customizing]);

    const bodyClasses = []
      .concat(customizing ? ['customizing'] : [])
      .concat(looseMode ? ['loose'] : [])
      .join(' ');

    // Resolve display label / code / swatch
    const draftName = (draft.customName && draft.customName.trim())
      || (window.formatLabel ? window.formatLabel(draft, labelTemplates) : draft.name)
      || 'Untitled';
    const draftCode = draft.code || '—';

    return (
      <>
        <div className="drw-bg" onClick={onClose} />
        <div ref={drawerRef} className={'drw-panel drw-v7 ' + bodyClasses}
          role="dialog" aria-modal="true"
          aria-label={material._isNew ? 'Add product' : 'Edit product'}
          onClick={e => e.stopPropagation()}>

          {/* HEADER */}
          <div className="drw-head">
            <button type="button" className="drw-close" onClick={onClose} aria-label="Close">×</button>
            <div className="bg-eyebrow" style={{ marginBottom: 6 }}>
              I · Library / {material._isNew ? 'Add' : 'Edit'}
            </div>

            {siblings && siblings.length > 1 && !material._isNew && (
              <div className="eh-navrow">
                <button type="button" className="eh-nav-btn" onClick={gotoPrev}
                  disabled={sibIdx <= 0} title="Previous (←)">‹</button>
                <button type="button" className="eh-nav-btn" onClick={gotoNext}
                  disabled={sibIdx < 0 || sibIdx >= siblings.length - 1} title="Next (→)">›</button>
                <span className="eh-nav-pos"><b>{sibIdx + 1}</b> of {siblings.length}</span>
                <span className="eh-nav-ctx" />
              </div>
            )}

            <div className="eh-row">
              {window.SwatchMini && (
                <window.SwatchMini swatch={draft.swatch}
                  style={{ width: 32, height: 32, border: '1px solid var(--rule)', flexShrink: 0 }} />
              )}
              <div className="eh-body-h">
                <div className="eh-titleline">
                  <span className="eh-title">{draftName}</span>
                  <span className="eh-code">{draftCode}</span>
                  {dirty && <span className="eh-dirty">Unsaved</span>}
                  {customizing && <span className="eh-customizing-pill">Editing schema</span>}
                </div>
              </div>
            </div>
          </div>

          {/* MODE BAR */}
          <div className="mode-bar">
            <span className="lbl">View</span>
            <div className="mode-toggle">
              <button type="button"
                className={!looseMode ? 'on' : ''}
                onClick={() => setLooseMode(false)}>Detailed</button>
              <button type="button"
                className={looseMode ? 'on' : ''}
                onClick={() => setLooseMode(true)}>Loose</button>
            </div>
            <span className="grow" />
            <button type="button"
              className={'btn-customize' + (customizing ? ' on' : '')}
              onClick={() => setCustomizing(c => !c)}
              title="Customize fields (firm-wide)">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M4 3h8M4 8h8M4 13h5" />
                <circle cx="3" cy="3" r="1.2" fill="currentColor" />
                <circle cx="3" cy="8" r="1.2" fill="currentColor" />
                <circle cx="3" cy="13" r="1.2" fill="currentColor" />
              </svg>
              <span>{customizing ? 'Done customizing' : 'Customize fields'}</span>
            </button>
          </div>

          {/* BODY */}
          <div className="drw-body" id="drw-body-v7">
            <SchemaBody
              draft={draft} set={set} setSwatch={setSwatch}
              materials={materials}
              customizing={customizing}
              looseMode={looseMode}
              labelTemplates={labelTemplates}
              onOpenLabelBuilder={onOpenLabelBuilder}
              showLibraryCode={showLibraryCode}
              codeError={codeError}
              pushHistory={pushHistory}
            />

            {!customizing && !looseMode && !material._isNew && (
              <UsedByPanel materialId={material.id} />
            )}
          </div>

          {/* FOOTER — normal */}
          {!customizing && (
            <div className="drw-foot normal-foot">
              {!material._isNew && (
                <button type="button" className="btn-del-d" onClick={handleDelete}>Delete</button>
              )}
              {codeError && (
                <span style={{ fontSize: 11, color: 'var(--accent)',
                  fontFamily: 'var(--font-sans)', marginLeft: 8 }}>
                  A code is required before saving.
                </span>
              )}
              <span style={{ flex: 1 }} />
              <button type="button" className="btn-sec-d" onClick={onClose}>Cancel</button>
              {material._isNew && onSaveAndAddAnother && (
                <button type="button" className="btn-sec-d" onClick={handleSaveAndAddAnother}>
                  Save &amp; add another
                </button>
              )}
              <button type="button" className="btn-pri-d next-save" onClick={handleSave}>
                <span>{material._isNew ? 'Save Product' : 'Save'}</span>
                <span className="arr">›</span>
              </button>
            </div>
          )}

          {/* FOOTER — customize mode */}
          {customizing && (
            <div className="drw-foot cust-foot">
              <div className="undo-group">
                <button type="button" className="btn-undo"
                  disabled={undoStack.current.length === 0}
                  onClick={doUndo} title="Undo (⌘Z)">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 6H10.5a3.5 3.5 0 010 7H6" />
                    <path d="M7 3.5L4 6l3 2.5" />
                  </svg>
                  <span>Undo</span>
                </button>
                <button type="button" className="btn-undo"
                  disabled={redoStack.current.length === 0}
                  onClick={doRedo} title="Redo (⇧⌘Z)">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 6H5.5a3.5 3.5 0 000 7H10" />
                    <path d="M9 3.5L12 6l-3 2.5" />
                  </svg>
                  <span>Redo</span>
                </button>
              </div>
              <span className="cust-foot-meta">Editing schema · changes apply <b>firm-wide</b></span>
              <button type="button" className="btn-sec-d" onClick={() => setCustomizing(false)}>Cancel</button>
              <button type="button" className="btn-cust-save" onClick={() => setCustomizing(false)}>Save schema</button>
            </div>
          )}
        </div>
      </>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Schema body — section list + customize-mode drag-drop
  // ────────────────────────────────────────────────────────────────────────
  function SchemaBody({
    draft, set, setSwatch, materials, customizing, looseMode,
    labelTemplates, onOpenLabelBuilder, showLibraryCode, codeError, pushHistory,
  }) {
    const cat = useMemo(() => {
      if (!draft) return 'other';
      if (draft.category && window.categoryDef && window.categoryDef(draft.category)) return draft.category;
      return (window.legacyCategoryFor && window.legacyCategoryFor(draft)) || 'other';
    }, [draft && draft.category]);

    // Subscribe to taxonomy edits so sectioned + bin recompute when the user
    // hides / restores / reorders / resizes a field in customize mode. The
    // schema lives on `window` (via schemaActive()), so without this hook the
    // useMemo deps wouldn't see edits.
    const cs = window.useCloudState ? window.useCloudState() : null;
    const taxKey = cs && cs.taxonomies;

    // LoadingGate mirrors cs.taxonomies → window.appState.taxonomies via a
    // useEffect, which fires AFTER render commits. That means our useMemos
    // below (which read through window.schemaActive()) would see the stale
    // pre-mutation taxonomies for one render after every schema edit — the
    // visible symptom was hide/restore appearing to need a second click.
    // Mirror synchronously here so the memos see the fresh schema this render.
    if (taxKey && window.appState && window.appState.taxonomies !== taxKey) {
      window.appState.taxonomies = taxKey;
    }

    const sectioned = useMemo(() => {
      if (!window.sectionedFieldsForCategory) return [];
      return window.sectionedFieldsForCategory(cat, { includeHidden: false });
    }, [cat, customizing, taxKey]);

    const bin = useMemo(() => {
      if (!customizing || !window.binFieldsForCategory) return [];
      return window.binFieldsForCategory(cat);
    }, [cat, customizing, taxKey]);

    // Collapsed-state per section (UI only, not persisted)
    const [collapsed, setCollapsed] = useState({});
    function toggleSection(id) {
      setCollapsed(s => ({ ...s, [id]: !s[id] }));
    }

    return (
      <>
        {/* CustomNameBar — only in non-loose mode */}
        {!looseMode && draft && (
          <CustomNameBarLite draft={draft} set={set}
            labelTemplates={labelTemplates}
            onOpenLabelBuilder={onOpenLabelBuilder} />
        )}

        {sectioned.map((entry, i) => (
          <SectionCard
            key={entry.section.id}
            section={entry.section}
            fields={entry.fields}
            num={String(i + 1).padStart(2, '0')}
            draft={draft} set={set} setSwatch={setSwatch}
            materials={materials}
            customizing={customizing}
            looseMode={looseMode}
            collapsed={!!collapsed[entry.section.id]}
            onToggle={() => toggleSection(entry.section.id)}
            showLibraryCode={showLibraryCode}
            codeError={codeError}
            pushHistory={pushHistory}
          />
        ))}

        {customizing && (
          <button type="button" className="btn-add-section"
            onClick={() => {
              const label = window.prompt('Section name', 'New section');
              if (!label) return;
              pushHistory();
              window.schemaSectionMutators.addSection(label);
            }}>
            + Add new section
          </button>
        )}

        {looseMode && (
          <div className="loose-hint">
            Loose mode is on. Other sections are hidden but their data is preserved.
            Switch to <b>Detailed</b> in the bar above to see brand, supplier, specs,
            pricing, and trade discounts.
          </div>
        )}

        {customizing && bin.length > 0 && (
          <HiddenBin bin={bin} pushHistory={pushHistory} />
        )}
      </>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Section card
  // ────────────────────────────────────────────────────────────────────────
  function SectionCard({
    section, fields, num, draft, set, setSwatch, materials,
    customizing, looseMode, collapsed, onToggle,
    showLibraryCode, codeError, pushHistory,
  }) {
    // Loose mode shows only the Notes section in full and pinned fields elsewhere.
    if (looseMode && section.id !== 'notes' && section.id !== 'identity') return null;

    function renameSection(label) {
      pushHistory();
      window.schemaSectionMutators.renameSection(section.id, label);
    }

    function deleteSection() {
      if (section.locked) return;
      if (!window.confirm('Delete the "' + section.label + '" section? Its fields will move to Specs.')) return;
      pushHistory();
      window.schemaSectionMutators.deleteSection(section.id);
    }

    function addFieldHere() {
      const lbl = window.prompt('Field label', 'New field');
      if (!lbl) return;
      pushHistory();
      window.schemaSectionMutators.addField(section.id, lbl, 'text');
    }

    return (
      <div className={'section v7-section' + (collapsed ? ' is-collapsed' : '')}
        data-section-id={section.id}
        draggable={customizing}
        onDragStart={customizing ? e => handleSectionDragStart(e, section.id) : undefined}
        onDragEnd={handleSectionDragEnd}
        onDragOver={customizing ? e => handleSectionDragOver(e, section.id) : undefined}
        onDrop={customizing ? e => handleSectionDrop(e, section.id, pushHistory) : undefined}>
        <div className="section-h v7-section-h" onClick={onToggle}>
          <span className="section-chev" aria-hidden="true">
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l3 3 3-3" /></svg>
          </span>
          {customizing && <span className="drag-h" data-section-grip>⋮⋮</span>}
          <input className="section-title-inp title"
            value={section.label}
            readOnly={!customizing}
            onClick={e => e.stopPropagation()}
            onChange={e => renameSection(e.target.value)} />
          {customizing && (
            <div className="section-actions">
              <button type="button" className="ico-btn danger"
                disabled={section.locked} title="Delete section"
                onClick={e => { e.stopPropagation(); deleteSection(); }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9h5L11 4" />
                </svg>
              </button>
            </div>
          )}
          <span className="num">{num}</span>
        </div>
        {!collapsed && (
          <>
            <div className="section-body v7-section-body" data-section-id={section.id}>
              {fields.map(f => (
                <FieldCell key={f.id}
                  field={f}
                  draft={draft} set={set} setSwatch={setSwatch}
                  materials={materials}
                  customizing={customizing}
                  pushHistory={pushHistory}
                  inSection={section.id}
                  showLibraryCode={showLibraryCode}
                  codeError={codeError} />
              ))}
            </div>
            {customizing && (
              <div className="add-field-row">
                <button type="button" className="btn-add-field" onClick={addFieldHere}>
                  + Add field to {section.label}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Field cell — 12-col grid item
  // ────────────────────────────────────────────────────────────────────────
  function FieldCell({
    field, draft, set, setSwatch, materials, customizing, pushHistory,
    inSection, showLibraryCode, codeError,
  }) {
    const w = window.widthForField ? window.widthForField(field) : 12;
    const required = field.id === 'name' || field.id === 'code';
    const isSwatch = field.type === 'swatchRef' || field.id === 'swatch';
    const isLooseHidden = false; // FieldCell respects loose pin via parent
    const isLoosePin = (field.id === 'name' || field.id === 'code' || field.id === 'notes');

    function hide() {
      pushHistory();
      window.schemaSectionMutators.setFieldHidden(field.id, true);
    }
    function del() {
      pushHistory();
      window.schemaSectionMutators.setFieldDeleted(field.id, true);
    }
    function setW(n) {
      pushHistory();
      window.schemaSectionMutators.setFieldWidth(field.id, n);
    }

    // The Code field needs special handling — only shown in office mode.
    if (field.id === 'code' && !showLibraryCode && !customizing) return null;

    return (
      <div className="fld" data-field-id={field.id} data-w={w}
        data-loose-pin={isLoosePin ? 'true' : undefined}
        draggable={customizing}
        onDragStart={customizing ? e => handleFieldDragStart(e, field.id) : undefined}
        onDragEnd={handleFieldDragEnd}>
        {customizing && (
          <>
            <span className="fld-grip" data-field-grip>⋮⋮</span>
            <span className="fld-id">{field.id} · {field.type}</span>
            <div className="fld-actions">
              <button type="button" className="ico-btn" onClick={hide}
                disabled={required} title={required ? 'Required' : 'Hide field'}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" /><circle cx="8" cy="8" r="2" />
                </svg>
              </button>
              <button type="button" className="ico-btn danger" onClick={del}
                disabled={required} title={required ? 'Required' : 'Delete field'}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9h5L11 4" />
                </svg>
              </button>
            </div>
          </>
        )}
        <label className="lbl-d">
          {field.label}{field.unit ? ' (' + field.unit + ')' : ''}
          {required && <span className="req-d">*</span>}
        </label>

        <FieldControl field={field} draft={draft} set={set} setSwatch={setSwatch}
          materials={materials} codeError={codeError} />

        {customizing && (
          <div className="w-picker">
            {[3, 4, 6, 8, 12].map(n => (
              <button key={n} type="button"
                className={w === n ? 'on' : ''}
                onClick={() => setW(n)}
                data-w={n}>
                {({ 3: '1/4', 4: '1/3', 6: '1/2', 8: '2/3', 12: 'Full' })[n]}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Field control — routes through FieldRenderer; bespoke for visual / code
  // ────────────────────────────────────────────────────────────────────────
  function FieldControl({ field, draft, set, setSwatch, materials, codeError }) {
    if (!field) return null;
    // Visual / swatch — use the v7 picker
    if (field.id === 'swatch' || field.type === 'swatchRef') {
      if (window.VisualPickerV7) {
        return <window.VisualPickerV7 swatch={draft.swatch} setSwatch={setSwatch} materials={materials} />;
      }
      return null;
    }
    // Required-code field
    if (field.id === 'code') {
      return <input className="inp-d mono"
        value={draft.code || ''}
        onChange={e => set('code', e.target.value)}
        style={codeError ? { borderColor: 'var(--accent)' } : undefined} />;
    }
    // Required-name field
    if (field.id === 'name') {
      return <input className="inp-d"
        value={draft.name || ''}
        onChange={e => set('name', e.target.value)} />;
    }
    // Supplier / brand etc. live on draft directly historically
    if (field.id === 'supplier' || field.id === 'brand' || field.id === 'range' || field.id === 'model') {
      const v = (window.getFieldValue ? window.getFieldValue(draft, field.id) : draft[field.id]) || '';
      return <input className="inp-d" value={v}
        onChange={e => window.setFieldOnDraft
          ? window.setFieldOnDraft(set, field.id, e.target.value, draft)
          : set(field.id, e.target.value)} />;
    }
    // Currency — bespoke
    if (field.id === 'currency') {
      return <select className="sel-d"
        value={draft.currency || 'AUD'}
        onChange={e => set('currency', e.target.value)}>
        {['AUD', 'USD', 'EUR', 'GBP', 'NZD'].map(c => <option key={c} value={c}>{c}</option>)}
      </select>;
    }
    // Everything else — through FieldRenderer
    if (!window.FieldRenderer) return null;
    const value = window.getFieldValue ? window.getFieldValue(draft, field.id) : draft[field.id];
    const onChange = (v) => window.setFieldOnDraft
      ? window.setFieldOnDraft(set, field.id, v, draft)
      : set(field.id, v);
    return <window.FieldRenderer field={field} value={value} onChange={onChange}
      mode="edit" materials={materials} draft={draft} />;
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Hidden bin
  // ────────────────────────────────────────────────────────────────────────
  function HiddenBin({ bin, pushHistory }) {
    const [collapsed, setCollapsed] = useState(false);
    return (
      <div className="hidden-bin has-items">
        <div className="bin-h" onClick={() => setCollapsed(c => !c)}>
          <span className="chev">{collapsed ? '▸' : '▾'}</span>
          <span className="ttl"><b>{bin.length}</b> hidden field{bin.length === 1 ? '' : 's'}</span>
          <span className="meta">data preserved · restore any time</span>
        </div>
        <div className={'bin-list' + (collapsed ? ' collapsed' : '')}>
          {bin.map(b => (
            <div key={b.field.id} className="bin-row">
              <span className="nm">{b.field.label}</span>
              <span className="typ">{b.deleted ? 'deleted' : 'hidden'}</span>
              <button type="button" className="restore" onClick={() => {
                pushHistory();
                if (b.deleted) window.schemaSectionMutators.setFieldDeleted(b.field.id, false);
                else           window.schemaSectionMutators.setFieldHidden(b.field.id, false);
              }}>{b.deleted ? 'Undelete' : 'Restore'}</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Used-by panel — scans every project schedule for references
  // ────────────────────────────────────────────────────────────────────────
  function UsedByPanel({ materialId }) {
    const [state, setState] = useState({ status: 'loading', rows: [] });
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
      let cancelled = false;
      const cloud = window.cloud;
      if (!cloud || !cloud.loadSchedule) {
        setState({ status: 'ready', rows: [] });
        return;
      }
      const projects = (window.appState && window.appState.projects) || [];
      const out = [];
      Promise.all(projects.map(p =>
        cloud.loadSchedule(p.id).then(sched => {
          if (!sched) return;
          const rows = sched.rows || sched.components || [];
          rows.forEach(r => {
            if (r && r.specRef && r.specRef.id === materialId) {
              out.push({
                projectId: p.id, projectName: p.name || p.title || p.id,
                rowId: r.id, locationLabel: r.locationLabel || r.location || '—',
                element: r.element || '—',
                qty: r.qty || r.quantity || 1,
              });
            }
          });
        }).catch(() => {})
      )).then(() => {
        if (cancelled) return;
        setState({ status: 'ready', rows: out });
      });
      return () => { cancelled = true; };
    }, [materialId]);

    const projectCount = useMemo(() => {
      return new Set(state.rows.map(r => r.projectId)).size;
    }, [state.rows]);

    if (state.status === 'loading') {
      return (
        <div className="usedby-wrap">
          <label className="lbl-d">Used by</label>
          <div className="usedby">
            <div className="usedby-h">
              <span className="lbl">Scanning schedules…</span>
            </div>
          </div>
        </div>
      );
    }

    if (state.rows.length === 0) {
      return (
        <div className="usedby-wrap">
          <label className="lbl-d">Used by</label>
          <div className="usedby">
            <div className="usedby-h">
              <span className="lbl">Not referenced in any schedule yet</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={'usedby-wrap' + (collapsed ? ' is-collapsed' : '')}>
        <div className="usedby-label" onClick={() => setCollapsed(c => !c)}>
          <span className="usedby-chev">
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l3 3 3-3" /></svg>
          </span>
          <label className="lbl-d">Used by</label>
        </div>
        <div className="usedby">
          <div className="usedby-h">
            <span className="lbl">Schedule rows referencing this product</span>
            <span className="ct"><b>{state.rows.length}</b> row{state.rows.length === 1 ? '' : 's'} · <b>{projectCount}</b> project{projectCount === 1 ? '' : 's'}</span>
          </div>
          {state.rows.slice(0, 10).map(r => (
            <div key={r.projectId + ':' + r.rowId} className="usedby-row"
              onClick={() => {
                if (window.appState && window.cloud) {
                  // Navigate to the schedule (best-effort)
                }
              }}>
              <div className="proj">
                {r.projectName}
                <span className="pcode">{r.projectId}</span>
              </div>
              <div className="room">{r.locationLabel}</div>
              <div className="elt">{r.element}</div>
              <div className="ct-cell">×{r.qty}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Drag-and-drop handlers (delegated to the section / field DOM)
  // ────────────────────────────────────────────────────────────────────────
  let dragCtx = null; // { kind: 'section'|'field', id }

  function handleSectionDragStart(e, sectionId) {
    if (!e.target.closest || !e.target.closest('[data-section-grip]')) {
      // Only allow drag from the grip — disable when starting elsewhere.
      // But .section also has draggable=true, so let it through if not from grip.
      // For HTML5 DnD we need the whole section draggable; gate by .drag-h click later if needed.
    }
    dragCtx = { kind: 'section', id: sectionId };
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', sectionId);
    } catch (_) {}
  }
  function handleSectionDragEnd() { dragCtx = null; }
  function handleSectionDragOver(e, overSectionId) {
    if (dragCtx && dragCtx.kind === 'section' && dragCtx.id !== overSectionId) {
      e.preventDefault();
    }
  }
  function handleSectionDrop(e, overSectionId, pushHistory) {
    if (!dragCtx || dragCtx.kind !== 'section' || dragCtx.id === overSectionId) return;
    e.preventDefault();
    const sections = window.sectionsActive ? window.sectionsActive() : [];
    const ids = sections.map(s => s.id);
    const fromIdx = ids.indexOf(dragCtx.id);
    const toIdx   = ids.indexOf(overSectionId);
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = ids.slice();
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    if (pushHistory) pushHistory();
    window.schemaSectionMutators.reorderSections(reordered);
    dragCtx = null;
  }

  function handleFieldDragStart(e, fieldId) {
    dragCtx = { kind: 'field', id: fieldId };
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', fieldId);
    } catch (_) {}
    e.stopPropagation();
  }
  function handleFieldDragEnd() { dragCtx = null; }

  // Section body — dragover/drop for field DnD
  // Listening at the document level keeps us in sync with the section card render.
  if (typeof window !== 'undefined' && !window.__mev7DnDInstalled) {
    window.__mev7DnDInstalled = true;
    document.addEventListener('dragover', function (e) {
      if (!dragCtx || dragCtx.kind !== 'field') return;
      const target = e.target;
      if (!target || !target.closest) return;
      const grid = target.closest('.v7-section-body');
      if (!grid) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    document.addEventListener('drop', function (e) {
      if (!dragCtx || dragCtx.kind !== 'field') return;
      const target = e.target;
      if (!target || !target.closest) return;
      const grid = target.closest('.v7-section-body');
      if (!grid) return;
      e.preventDefault();
      const targetSectionId = grid.dataset.sectionId;
      // Find closest .fld to the drop point
      const fields = Array.from(grid.querySelectorAll(':scope > .fld'));
      let beforeFieldId = null;
      let minDist = Infinity;
      fields.forEach(f => {
        if (f.dataset.fieldId === dragCtx.id) return;
        const r = f.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top  + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const d  = dx * dx + dy * dy;
        if (d < minDist) {
          minDist = d;
          // before this field iff cursor is left/above its centre on same row
          const sameRow = Math.abs(dy) < r.height / 2;
          if (sameRow) {
            beforeFieldId = (e.clientX < cx) ? f.dataset.fieldId : nextSibling(f);
          } else {
            beforeFieldId = (e.clientY < cy) ? f.dataset.fieldId : nextSibling(f);
          }
        }
      });
      if (window.schemaSectionMutators) {
        window.schemaSectionMutators.moveField(dragCtx.id, targetSectionId, beforeFieldId);
      }
      dragCtx = null;
    });
  }

  function nextSibling(fld) {
    const next = fld.nextElementSibling;
    return (next && next.classList.contains('fld')) ? next.dataset.fieldId : null;
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Lightweight CustomNameBar (shown above sections in non-loose mode)
  // ────────────────────────────────────────────────────────────────────────
  function CustomNameBarLite({ draft, set, labelTemplates, onOpenLabelBuilder }) {
    const hasOverride = !!(draft.customName && draft.customName.trim());
    const templatePreview = labelTemplates && window.formatLabel
      ? window.formatLabel({ ...draft, customName: null }, labelTemplates)
      : draft.name;

    return (
      <div className="custom-name-bar">
        <div className="custom-name-bar-head">
          <span className="lbl-d">Display label</span>
          {hasOverride ? (
            <span className="custom-name-bar-tag">Custom override</span>
          ) : (
            <span className="custom-name-bar-tmpl">From template</span>
          )}
          {onOpenLabelBuilder && (
            <button type="button" className="custom-name-bar-link"
              onClick={() => onOpenLabelBuilder(draft.category || 'Global')}>Edit template</button>
          )}
        </div>
        <input
          className="inp-d"
          value={draft.customName || ''}
          onChange={e => set('customName', e.target.value)}
          placeholder={hasOverride ? '' : 'Renders as: ' + (templatePreview || draft.name || '—')}
          style={{
            borderColor: hasOverride ? 'var(--accent)' : undefined,
            fontFamily: "'Newsreader', serif",
            fontSize: 15,
          }} />
      </div>
    );
  }

  // ── Glue: DuplicatePicker stays exposed for any callers that still want it.
  // (The v7 drawer doesn't use mode tabs — duplicate flow becomes a separate
  // intake action.)
  function DuplicatePicker({ products = [], onPick }) {
    const [q, setQ] = useState('');
    const ql = q.trim().toLowerCase();
    const visible = ql
      ? products.filter(p => {
          const hay = [p.name, p.code, p.brand, p.supplier].filter(Boolean).join(' ').toLowerCase();
          return hay.includes(ql);
        })
      : products;
    return (
      <div className="dup-pick-wrap">
        <input className="inp-d" autoFocus value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search products…"
          style={{ marginBottom: 12 }} />
        <div className="dup-pick-list">
          {visible.map(p => (
            <button key={p.id} type="button"
              onClick={() => onPick(p)}
              className="dup-pick-row">
              <div className="dup-pick-info">
                <div className="dup-pick-name">{p.name || '—'}</div>
                <div className="dup-pick-meta">{[p.code, p.brand].filter(Boolean).join(' · ')}</div>
              </div>
              <span className="dup-pick-use">Use →</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  Object.assign(window, { MaterialEditor, DuplicatePicker });
})();
