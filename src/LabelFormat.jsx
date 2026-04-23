// Label Format builder — chip composer + text mode + preview + per-category tabs.

const CATEGORY_TABS = ['Global', 'Timber', 'Stone', 'Composite', 'Metal', 'Paint', 'Textile'];

function LabelFormatModal({ templates, setTemplates, materials, onClose, initialTab = 'Global' }) {
  const [tab, setTab] = React.useState(initialTab);
  const [mode, setMode] = React.useState('visual'); // visual | text
  const [previewId, setPreviewId] = React.useState(() => {
    if (initialTab !== 'Global') {
      const sample = materials.find(m => m.category === initialTab);
      if (sample) return sample.id;
    }
    return materials[0]?.id;
  });

  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // When switching tabs, pick a preview material that matches if possible
  React.useEffect(() => {
    if (tab === 'Global') return;
    const sample = materials.find(m => m.category === tab);
    if (sample) setPreviewId(sample.id);
  }, [tab]);

  // Current parts being edited
  const isGlobal = tab === 'Global';
  const catTpl = isGlobal ? null : templates.byCategory?.[tab];
  const parts = isGlobal ? templates.global : (catTpl || templates.global);
  const inheriting = !isGlobal && !catTpl;

  function setParts(updater) {
    setTemplates(prev => {
      const next = { ...prev, byCategory: { ...(prev.byCategory || {}) } };
      const newParts = typeof updater === 'function' ? updater(parts) : updater;
      if (isGlobal) next.global = newParts;
      else next.byCategory[tab] = newParts;
      return next;
    });
  }

  function enableOverride() {
    // Start from the global template as the seed for this category
    setTemplates(prev => ({
      ...prev,
      byCategory: { ...(prev.byCategory || {}), [tab]: prev.global.slice() },
    }));
  }
  function clearOverride() {
    setTemplates(prev => ({
      ...prev,
      byCategory: { ...(prev.byCategory || {}), [tab]: null },
    }));
  }

  const previewMaterial = materials.find(m => m.id === previewId);

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(20,20,20,0.55)',
        zIndex: 110,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 30,
      }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--ink)',
          width: 'min(940px, 100%)',
          maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
        }}>
        {/* Header */}
        <div style={{ padding: '22px 28px 12px', borderBottom: '1px solid var(--ink)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <Eyebrow>Display label format</Eyebrow>
            <Serif size={24} style={{ marginTop: 4, display: 'block' }}>
              Build how entries are labelled across the archive
            </Serif>
            <div style={{ ...ui.serif, fontStyle: 'italic', fontSize: 13,
              color: 'var(--ink-3)', marginTop: 4, maxWidth: '70ch' }}>
              Compose a template from field tokens and separators. Each material's label is rendered from this template — unless it has a custom name set.
            </div>
          </div>
          <TextButton onClick={onClose}>Close ×</TextButton>
        </div>

        {/* Tabs */}
        <div style={{ padding: '12px 28px 0', display: 'flex', gap: 0,
          borderBottom: '1px solid var(--rule)' }}>
          {CATEGORY_TABS.map(t => {
            const active = tab === t;
            const override = t !== 'Global' && !!templates.byCategory?.[t];
            return (
              <button key={t} type="button" onClick={() => setTab(t)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '9px 16px',
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: active ? 'var(--ink)' : 'var(--ink-4)',
                  fontWeight: active ? 500 : 400,
                  borderBottom: '1px solid ' + (active ? 'var(--ink)' : 'transparent'),
                  marginBottom: -1,
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                {t}
                {override && (
                  <span style={{ width: 4, height: 4, background: 'var(--accent)',
                    borderRadius: '50%', display: 'inline-block' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 24px' }}>
          {/* Preview */}
          <div style={{ marginBottom: 18, padding: '14px 16px',
            background: 'var(--paper-2)', border: '1px solid var(--rule-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'baseline', marginBottom: 10, gap: 14, flexWrap: 'wrap' }}>
              <Eyebrow>Preview</Eyebrow>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ ...ui.mono, fontSize: 10, color: 'var(--ink-4)',
                  letterSpacing: '0.08em' }}>SAMPLE ENTRY</span>
                <select value={previewId || ''}
                  onChange={e => setPreviewId(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none', borderBottom: '1px solid var(--rule-2)',
                    fontFamily: "'Inter Tight', sans-serif", fontSize: 12,
                    padding: '2px 14px 2px 0', outline: 'none',
                    color: 'var(--ink-2)', cursor: 'pointer',
                  }}>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.code} · {m.category} · {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {previewMaterial && parts?.length ? (
              <div style={{
                ...ui.serif, fontSize: 22, lineHeight: 1.25, color: 'var(--ink)',
                padding: '4px 0',
              }}>
                {renderPreview(parts, previewMaterial)}
              </div>
            ) : (
              <div style={{ ...ui.serif, fontStyle: 'italic', fontSize: 14,
                color: 'var(--ink-4)' }}>
                {parts?.length ? 'Pick a sample entry to preview' : 'Add at least one token below'}
              </div>
            )}
          </div>

          {/* Inherit banner for category tabs */}
          {!isGlobal && inheriting && (
            <div style={{ marginBottom: 16, padding: '11px 14px',
              background: 'var(--tint)', borderLeft: '2px solid var(--ink-4)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              gap: 14, flexWrap: 'wrap' }}>
              <div style={{ ...ui.serif, fontStyle: 'italic', fontSize: 13,
                color: 'var(--ink-2)', lineHeight: 1.4 }}>
                <strong style={{ fontStyle: 'normal', fontWeight: 500 }}>{tab}</strong> entries use the Global template. Override to customise.
              </div>
              <TextButton onClick={enableOverride} accent>Override for {tab}</TextButton>
            </div>
          )}
          {!isGlobal && !inheriting && (
            <div style={{ marginBottom: 12,
              display: 'flex', justifyContent: 'flex-end' }}>
              <TextButton onClick={clearOverride}>↺ Inherit from Global</TextButton>
            </div>
          )}

          {/* Mode toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', marginBottom: 10 }}>
            <Eyebrow>{isGlobal ? 'Global template' : `${tab} template`}</Eyebrow>
            <div style={{ display: 'flex', gap: 0, border: '1px solid var(--rule-2)' }}>
              {['visual', 'text'].map(m => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  style={{
                    background: mode === m ? 'var(--ink)' : 'transparent',
                    color: mode === m ? 'var(--paper)' : 'var(--ink-3)',
                    border: 'none',
                    padding: '4px 10px',
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                    cursor: 'pointer', fontWeight: 500,
                  }}>{m}</button>
              ))}
            </div>
          </div>

          {/* Composer */}
          <div style={{ opacity: inheriting ? 0.5 : 1, pointerEvents: inheriting ? 'none' : 'auto' }}>
            {mode === 'visual' ? (
              <ChipComposer parts={parts || []} setParts={setParts} />
            ) : (
              <TextModeComposer parts={parts || []} setParts={setParts} />
            )}
          </div>

          {/* Token palette */}
          <div style={{ marginTop: 22, opacity: inheriting ? 0.5 : 1,
            pointerEvents: inheriting ? 'none' : 'auto' }}>
            <Eyebrow style={{ marginBottom: 8 }}>Insert field</Eyebrow>
            <TokenPalette
              onInsert={(id) => setParts(ps => [...ps, { kind: 'token', id }])} />
          </div>

          <div style={{ marginTop: 18, opacity: inheriting ? 0.5 : 1,
            pointerEvents: inheriting ? 'none' : 'auto' }}>
            <Eyebrow style={{ marginBottom: 8 }}>Insert separator</Eyebrow>
            <SeparatorPalette
              onInsert={(text) => setParts(ps => [...ps, { kind: 'sep', text }])} />
          </div>

          {/* Presets */}
          <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px dotted var(--rule-2)',
            opacity: inheriting ? 0.5 : 1, pointerEvents: inheriting ? 'none' : 'auto' }}>
            <Eyebrow style={{ marginBottom: 8 }}>Presets</Eyebrow>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {window.PRESETS.map(p => (
                <PresetChip key={p.id} preset={p}
                  onApply={() => setParts(p.parts.slice())} />
              ))}
              {tab === 'Paint' && window.PAINT_PRESETS.map(p => (
                <PresetChip key={p.id} preset={p} accent
                  onApply={() => setParts(p.parts.slice())} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 28px', borderTop: '1px solid var(--ink)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
          <Mono size={10} color="var(--ink-4)"
            style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Changes apply live · Esc to close
          </Mono>
          <div style={{ display: 'flex', gap: 22 }}>
            <TextButton onClick={() => {
              if (window.confirm('Reset all label templates to defaults?')) {
                setTemplates(JSON.parse(JSON.stringify(window.DEFAULT_TEMPLATES)));
              }
            }}>Reset all to default</TextButton>
            <TextButton onClick={onClose} accent>Done</TextButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// Render preview with subtle placeholder for empty tokens
function renderPreview(parts, material) {
  return parts.map((p, i) => {
    if (p.kind === 'sep') {
      return <span key={i} style={{ color: 'var(--ink-4)' }}>{p.text}</span>;
    }
    const def = window.getTokenDef(p.id);
    const val = def ? def.get(material) : null;
    if (val == null || val === '') {
      return <span key={i} style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>—</span>;
    }
    return <span key={i}>{String(val)}</span>;
  });
}

// ───────── Chip composer ─────────

function ChipComposer({ parts, setParts }) {
  const [dragIdx, setDragIdx] = React.useState(null);
  const [dragOver, setDragOver] = React.useState(null);

  function removeAt(i) {
    setParts(ps => ps.filter((_, idx) => idx !== i));
  }
  function onDragStart(i) { setDragIdx(i); }
  function onDragEnd() { setDragIdx(null); setDragOver(null); }
  function onDragOver(e, i) {
    e.preventDefault();
    setDragOver(i);
  }
  function onDrop(e, i) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    setParts(ps => {
      const next = ps.slice();
      const [moved] = next.splice(dragIdx, 1);
      next.splice(i, 0, moved);
      return next;
    });
    setDragIdx(null); setDragOver(null);
  }

  if (!parts.length) {
    return (
      <div style={{
        padding: '28px 16px', textAlign: 'center',
        border: '1px dashed var(--rule-2)',
        background: 'var(--tint)',
        color: 'var(--ink-4)',
        fontStyle: 'italic',
        fontFamily: "'Newsreader', serif",
        fontSize: 13,
      }}>
        Empty — insert a field or separator below to begin
      </div>
    );
  }

  return (
    <div style={{
      padding: '12px 12px 8px',
      border: '1px solid var(--rule-2)',
      background: 'var(--paper-2)',
      display: 'flex', flexWrap: 'wrap', alignItems: 'center',
      gap: 6, minHeight: 54,
    }}>
      {parts.map((p, i) => (
        <Chip key={i} part={p} index={i}
          isDragging={dragIdx === i}
          isDragOver={dragOver === i}
          onDragStart={() => onDragStart(i)}
          onDragEnd={onDragEnd}
          onDragOver={(e) => onDragOver(e, i)}
          onDrop={(e) => onDrop(e, i)}
          onRemove={() => removeAt(i)} />
      ))}
    </div>
  );
}

function Chip({ part, index, isDragging, isDragOver, onDragStart, onDragEnd, onDragOver, onDrop, onRemove }) {
  const [hov, setHov] = React.useState(false);
  const isToken = part.kind === 'token';
  const def = isToken ? window.getTokenDef(part.id) : null;
  const color = isToken && def ? window.TOKEN_GROUP_COLOR[def.group] : null;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: isToken ? '5px 4px 5px 9px' : '5px 6px',
        background: isToken ? color : 'var(--paper)',
        color: isToken ? '#fff' : 'var(--ink-3)',
        border: isToken ? 'none' : '1px dashed var(--rule-2)',
        fontFamily: isToken ? "'Inter Tight', sans-serif" : "'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: isToken ? 500 : 400,
        letterSpacing: isToken ? '0.08em' : '0.04em',
        textTransform: isToken ? 'uppercase' : 'none',
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        outline: isDragOver ? '2px solid var(--accent)' : 'none',
        outlineOffset: 1,
        userSelect: 'none',
      }}
    >
      {isToken && (
        <span style={{ opacity: 0.6, fontSize: 9, marginRight: 2 }}>⋮⋮</span>
      )}
      <span>{isToken ? (def?.label || part.id) : renderSepLabel(part.text)}</span>
      <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{
          background: isToken ? 'rgba(255,255,255,0.22)' : 'transparent',
          border: 'none', cursor: 'pointer',
          color: isToken ? '#fff' : 'var(--ink-4)',
          width: 18, height: 18, borderRadius: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, lineHeight: 1, padding: 0, marginLeft: 2,
          opacity: hov ? 1 : 0.75,
        }}
        title="Remove">×</button>
    </div>
  );
}

function renderSepLabel(text) {
  if (text === ' ') return '␣space␣';
  if (text.match(/^\s+$/)) return '␣'.repeat(text.length);
  // Strip surrounding whitespace for display
  const stripped = text.replace(/^\s+|\s+$/g, '');
  return stripped || text;
}

// ───────── Text mode ─────────

function TextModeComposer({ parts, setParts }) {
  const text = window.templateToText(parts);
  const [draft, setDraft] = React.useState(text);
  React.useEffect(() => { setDraft(text); }, [text]);

  function commit(v) {
    setDraft(v);
    setParts(window.textToTemplate(v));
  }

  return (
    <div>
      <textarea
        value={draft}
        onChange={e => commit(e.target.value)}
        rows={2}
        style={{
          width: '100%',
          background: 'var(--paper-2)',
          border: '1px solid var(--rule-2)',
          padding: '10px 12px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14, lineHeight: 1.5,
          color: 'var(--ink)',
          outline: 'none',
          resize: 'vertical',
        }}
      />
      <div style={{ marginTop: 6, ...ui.mono, fontSize: 10,
        color: 'var(--ink-4)', letterSpacing: '0.04em' }}>
        Wrap field ids in braces: <code style={{ color: 'var(--ink-2)' }}>{'{name}'}</code>,
        &nbsp;<code style={{ color: 'var(--ink-2)' }}>{'{code}'}</code>,
        &nbsp;<code style={{ color: 'var(--ink-2)' }}>{'{brand}'}</code> …
        Anything else is treated as a literal separator.
      </div>
    </div>
  );
}

// ───────── Palettes ─────────

function TokenPalette({ onInsert }) {
  const groups = [
    { id: 'identity',   label: 'Identity'   },
    { id: 'spec',       label: 'Spec'       },
    { id: 'commercial', label: 'Commercial' },
    { id: 'paint',      label: 'Paint-only' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
      {groups.map(g => {
        const tokens = window.TOKEN_DEFS.filter(t => t.group === g.id);
        return (
          <div key={g.id}>
            <div style={{
              ...ui.mono, fontSize: 9.5, color: 'var(--ink-4)',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              marginBottom: 6, paddingBottom: 4,
              borderBottom: '1px dotted var(--rule-2)',
            }}>{g.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {tokens.map(t => (
                <button key={t.id} type="button"
                  onClick={() => onInsert(t.id)}
                  style={{
                    background: window.TOKEN_GROUP_COLOR[g.id],
                    color: '#fff', border: 'none', cursor: 'pointer',
                    padding: '4px 9px',
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 10, letterSpacing: '0.08em',
                    textTransform: 'uppercase', fontWeight: 500,
                    opacity: 0.86,
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0.86}
                  title={`Insert {${t.id}}`}
                >＋ {t.label}</button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SeparatorPalette({ onInsert }) {
  const [custom, setCustom] = React.useState('');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {window.SEP_OPTIONS.map(s => (
        <button key={s.id} type="button"
          onClick={() => onInsert(s.text)}
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--rule-2)',
            cursor: 'pointer',
            padding: '4px 10px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12, color: 'var(--ink-2)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ink)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--rule-2)'}
          title={`Insert "${s.text.replace(/ /g, '␣')}"`}
        >{s.label}</button>
      ))}
      <span style={{ ...ui.mono, fontSize: 10, color: 'var(--ink-4)', marginLeft: 6 }}>
        custom:
      </span>
      <input value={custom}
        onChange={e => setCustom(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && custom) {
            onInsert(custom); setCustom('');
          }
        }}
        placeholder={`e.g. " in "`}
        style={{
          width: 140, background: 'transparent',
          border: 'none', borderBottom: '1px solid var(--rule-2)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12, padding: '2px 0', outline: 'none',
          color: 'var(--ink)',
        }} />
      <button type="button" onClick={() => { if (custom) { onInsert(custom); setCustom(''); } }}
        disabled={!custom}
        style={{
          background: 'none', border: 'none', padding: 0,
          cursor: custom ? 'pointer' : 'not-allowed',
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: custom ? 'var(--accent-ink)' : 'var(--ink-4)',
          fontWeight: 500,
        }}>＋ Insert</button>
    </div>
  );
}

// ───────── Preset chip ─────────

function PresetChip({ preset, onApply, accent }) {
  return (
    <button type="button" onClick={onApply}
      style={{
        background: 'var(--paper)',
        border: '1px solid ' + (accent ? 'var(--accent)' : 'var(--rule-2)'),
        cursor: 'pointer',
        padding: '6px 11px',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        gap: 2, minWidth: 160,
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ink)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = accent ? 'var(--accent)' : 'var(--rule-2)'}
    >
      <span style={{ ...ui.mono, fontSize: 9, letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: accent ? 'var(--accent-ink)' : 'var(--ink-4)' }}>
        {preset.name}
      </span>
      <span style={{ ...ui.serif, fontSize: 13, color: 'var(--ink-2)',
        fontStyle: 'italic' }}>
        {window.templateToText(preset.parts)}
      </span>
    </button>
  );
}

// ───────── Quick-pick for Library header ─────────

function LabelFormatQuickPick({ templates, setTemplates, onOpenBuilder }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef();
  React.useEffect(() => {
    if (!open) return;
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Identify if global matches a known preset
  const globalText = window.templateToText(templates.global);
  const matched = window.PRESETS.find(p => window.templateToText(p.parts) === globalText);
  const currentLabel = matched ? matched.name : 'Custom';

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ ...ui.label, marginRight: 4 }}>Label</span>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '2px 4px',
          fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
          color: 'var(--ink)', fontWeight: 500,
          borderBottom: '1px solid var(--ink)',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
        {currentLabel}
        <span style={{ ...ui.mono, fontSize: 9, color: 'var(--ink-4)' }}>▾</span>
      </button>
      <button type="button" onClick={onOpenBuilder}
        title="Open label format builder"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '2px 4px',
          fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
          color: 'var(--ink-4)', fontWeight: 500,
          borderBottom: '1px solid transparent',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink)'; e.currentTarget.style.borderColor = 'var(--ink)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-4)'; e.currentTarget.style.borderColor = 'transparent'; }}
      >⚙ customise</button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: 'var(--paper)',
          border: '1px solid var(--ink)',
          boxShadow: '0 8px 24px rgba(20,20,20,0.12)',
          width: 260, padding: '8px 0', zIndex: 30,
        }}>
          <div style={{ padding: '4px 12px 6px', borderBottom: '1px dotted var(--rule-2)' }}>
            <Eyebrow>Quick presets</Eyebrow>
          </div>
          {window.PRESETS.map(p => {
            const isActive = window.templateToText(p.parts) === globalText;
            return (
              <button key={p.id} type="button"
                onClick={() => {
                  setTemplates(prev => ({ ...prev, global: p.parts.slice() }));
                  setOpen(false);
                }}
                style={{
                  width: '100%', textAlign: 'left',
                  background: isActive ? 'var(--tint)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  padding: '8px 12px',
                  display: 'flex', flexDirection: 'column', gap: 2,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--tint)'}
                onMouseLeave={e => e.currentTarget.style.background = isActive ? 'var(--tint)' : 'transparent'}
              >
                <span style={{ ...ui.mono, fontSize: 9, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--ink-4)' }}>{p.name}</span>
                <span style={{ ...ui.serif, fontSize: 13, color: 'var(--ink)',
                  fontStyle: 'italic' }}>
                  {window.templateToText(p.parts)}
                </span>
              </button>
            );
          })}
          <div style={{ padding: '6px 12px', borderTop: '1px dotted var(--rule-2)' }}>
            <button type="button"
              onClick={() => { onOpenBuilder(); setOpen(false); }}
              style={{
                background: 'none', border: 'none', padding: '4px 0',
                cursor: 'pointer',
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--accent-ink)', fontWeight: 500,
              }}>⚙ Open full builder</button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { LabelFormatModal, LabelFormatQuickPick });
