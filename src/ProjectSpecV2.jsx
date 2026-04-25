// Project Spec V2 — Material Submittal Register.
//
// Alternate "Register" view for the spec section. Same per-project rows as
// ProjectSpec.jsx (v1 List view), reframed as an editorial submittal register:
// large product cards per item, status badges, sticky trade headers with
// status counts, per-trade column visibility, search + trade/status filter.
//
// Receives spec data + ops as props from ProjectSpec.jsx, so persistence and
// cloud sync are handled upstream — this file is purely presentation + minor
// inline editing (status, rooms). Material-level fields (mfr/contact/url/
// warranty/installNotes) are read-only here; edited via the Library editor.

const SPEC_STATUS = {
  specified:  { label: 'Specified',  dot: '#9a9385', bg: 'rgba(154,147,133,0.10)' },
  submitted:  { label: 'Submitted',  dot: '#7a5e20', bg: 'rgba(122,94,32,0.10)'  },
  approved:   { label: 'Approved',   dot: '#3a6645', bg: 'rgba(58,102,69,0.10)'  },
  'on-order': { label: 'On Order',   dot: '#2e5a7a', bg: 'rgba(46,90,122,0.10)'  },
  installed:  { label: 'Installed',  dot: '#141414', bg: 'rgba(20,20,20,0.08)'   },
};
const STATUS_ORDER = ['specified','submitted','approved','on-order','installed'];

// Columns the user can toggle per trade.
const SPEC_V2_COLS = [
  { id: 'finish',   label: 'Finish' },
  { id: 'desc',     label: 'Description' },
  { id: 'rooms',    label: 'Rooms' },
  { id: 'supplier', label: 'Supplier' },
  { id: 'mfr',      label: 'Manufacturer' },
  { id: 'url',      label: 'Product URL' },
  { id: 'contact',  label: 'Contact' },
  { id: 'install',  label: 'Installation' },
  { id: 'warranty', label: 'Warranty' },
  { id: 'note',     label: 'Project note' },
];

// Sensible defaults per trade — falls back to DEFAULT_VIS_FALLBACK for unlisted.
const DEFAULT_VIS = {
  Flooring:            ['finish','rooms','supplier','contact','install','warranty'],
  'Paints & Finishes': ['finish','rooms','supplier','install'],
  Tiling:              ['finish','rooms','supplier','install'],
  Stonework:           ['finish','rooms','supplier','warranty'],
  Joinery:             ['finish','desc','rooms','mfr','install'],
  Carpentry:           ['finish','rooms','supplier','install'],
  Electrical:          ['finish','desc','rooms','supplier','contact'],
  Plumbing:            ['finish','desc','rooms','supplier','contact'],
  Mechanical:          ['desc','rooms','supplier','contact'],
  Glazing:             ['finish','rooms','supplier','warranty'],
  'Doors & Windows':   ['finish','rooms','supplier','mfr'],
  Hardware:            ['finish','desc','rooms','supplier','contact'],
  FFE:                 ['desc','rooms','supplier','warranty'],
  Landscape:           ['rooms','supplier','install'],
  Other:               ['finish','rooms','supplier'],
};
const DEFAULT_VIS_FALLBACK = ['finish','rooms','supplier'];

const SHORT_COL_IDS = new Set(['finish','rooms','supplier','mfr','url','contact','warranty']);
const LONG_COL_IDS  = new Set(['desc','install','note']);

function getSpecV2DefaultVis(trade) {
  return DEFAULT_VIS[trade] || DEFAULT_VIS_FALLBACK;
}

// Persisted per-trade visibility, single JSON blob in localStorage.
function loadSpecV2Cols() {
  try {
    const raw = localStorage.getItem('aml-spec-cols');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}
function saveSpecV2Cols(state) {
  try { localStorage.setItem('aml-spec-cols', JSON.stringify(state)); } catch {}
}

// ───────────────────────────────────────────────────────────────────────────
// Top-level component
// ───────────────────────────────────────────────────────────────────────────
function ProjectSpecV2({ spec, project, materials, labelTemplates,
  onUpdateRow, onRemoveRow, onAddItem }) {

  const [q, setQ] = React.useState('');
  const [tradeFilter, setTradeFilter] = React.useState('All trades');
  const [statusFilter, setStatusFilter] = React.useState('All statuses');
  const [colsByTrade, setColsByTrade] = React.useState(() => loadSpecV2Cols());

  function setColsForTrade(trade, cols) {
    setColsByTrade(prev => {
      const next = { ...prev, [trade]: Array.from(cols) };
      saveSpecV2Cols(next);
      return next;
    });
  }

  // Flatten rows with their trade for filtering. Preserve section order.
  const allRows = React.useMemo(() => {
    const out = [];
    spec.sections.forEach(sec => {
      sec.rowIds.forEach(rid => {
        const r = spec.rows[rid];
        if (!r) return;
        const m = materials.find(x => x.id === r.materialId) || null;
        out.push({ row: r, material: m, trade: sec.trade });
      });
    });
    return out;
  }, [spec, materials]);

  const tradesPresent = React.useMemo(() => {
    const seen = [];
    spec.sections.forEach(sec => { if (!seen.includes(sec.trade)) seen.push(sec.trade); });
    return seen;
  }, [spec]);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    return allRows.filter(({ row, material, trade }) => {
      if (tradeFilter !== 'All trades' && trade !== tradeFilter) return false;
      if (statusFilter !== 'All statuses') {
        const cfg = SPEC_STATUS[row.status || 'specified'] || SPEC_STATUS.specified;
        if (cfg.label !== statusFilter) return false;
      }
      if (query) {
        const m = material || {};
        const hay = [
          m.name, m.code, m.supplier, m.mfr, m.contact, m.finish, m.spec,
          m.installNotes, row.note, ...(row.rooms || []),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [allRows, q, tradeFilter, statusFilter]);

  const isFiltered = q.trim() !== '' || tradeFilter !== 'All trades' || statusFilter !== 'All statuses';
  const tradesAfterFilter = tradesPresent.filter(t => filtered.some(r => r.trade === t));

  function clearFilters() {
    setQ('');
    setTradeFilter('All trades');
    setStatusFilter('All statuses');
  }

  return (
    <div>
      <SpecV2Header project={project} />
      <SpecV2Toolbar
        q={q} setQ={setQ}
        trades={tradesPresent}
        tradeFilter={tradeFilter} setTradeFilter={setTradeFilter}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        isFiltered={isFiltered}
        onClear={clearFilters}
        countText={isFiltered
          ? `${filtered.length} of ${allRows.length}`
          : `${allRows.length} item${allRows.length === 1 ? '' : 's'}`}
      />

      {tradesAfterFilter.length === 0 && (
        <div style={{
          padding: '80px 0', textAlign: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--ink-4)',
        }}>
          {allRows.length === 0 ? 'No items in spec yet' : 'No items match'}
        </div>
      )}

      {tradesAfterFilter.map(trade => {
        const tradeRows = filtered.filter(r => r.trade === trade);
        const visSet = new Set(colsByTrade[trade] || getSpecV2DefaultVis(trade));
        return (
          <SpecV2Section
            key={trade}
            trade={trade}
            tradeRows={tradeRows}
            vis={visSet}
            onToggleCol={(id) => {
              const next = new Set(visSet);
              next.has(id) ? next.delete(id) : next.add(id);
              setColsForTrade(trade, next);
            }}
            labelTemplates={labelTemplates}
            onUpdateRow={onUpdateRow}
            onRemoveRow={onRemoveRow}
            onAddItem={() => onAddItem(trade)}
          />
        );
      })}
    </div>
  );
}

// ───────── Header ─────────
function SpecV2Header({ project }) {
  return (
    <header style={{ marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid var(--ink)' }}>
      <Eyebrow style={{ marginBottom: 6 }}>IV · Material Submittal Register</Eyebrow>
      <Serif size={28} style={{ display: 'block', fontWeight: 400 }}>
        {project.name || 'Material Submittal Register'}
      </Serif>
      <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', marginTop: 10, flexWrap: 'wrap' }}>
        <Mono size={10} color="var(--ink-4)" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {project.code || project.id}
        </Mono>
        {project.client && (
          <span style={{ ...ui.serif, fontSize: 14, color: 'var(--ink-3)', fontStyle: 'italic' }}>
            for {project.client}
          </span>
        )}
        {project.stage && (
          <Mono size={10} color="var(--ink-4)" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {project.stage}
          </Mono>
        )}
      </div>
    </header>
  );
}

// ───────── Toolbar ─────────
function SpecV2Toolbar({ q, setQ, trades, tradeFilter, setTradeFilter,
  statusFilter, setStatusFilter, isFiltered, onClear, countText }) {

  const selStyle = {
    background: 'transparent', border: '1px solid var(--rule-2)',
    padding: '6px 26px 6px 10px',
    fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
    color: 'var(--ink-3)', outline: 'none', cursor: 'pointer',
    appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239a9385' stroke-width='1.2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 0 18px', flexWrap: 'wrap',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        flex: 1, minWidth: 220, maxWidth: 380,
        border: '1px solid var(--rule-2)', padding: '5px 10px',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--ink-3)', flexShrink: 0 }}>
          <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="1.5" />
          <line x1="15.2" y1="15.2" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search materials, suppliers, codes, rooms…"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontFamily: "'Inter Tight', sans-serif", fontSize: 12.5, color: 'var(--ink)' }} />
        {q && (
          <button type="button" onClick={() => setQ('')}
            style={{ background: 'none', border: 'none', color: 'var(--ink-4)',
              fontSize: 14, padding: 0, lineHeight: 1, cursor: 'pointer' }}>×</button>
        )}
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--rule-2)' }} />

      <select value={tradeFilter} onChange={e => setTradeFilter(e.target.value)} style={selStyle}>
        <option>All trades</option>
        {trades.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selStyle}>
        <option>All statuses</option>
        {STATUS_ORDER.map(s => <option key={s} value={SPEC_STATUS[s].label}>{SPEC_STATUS[s].label}</option>)}
      </select>

      <span style={{ flex: 1 }} />

      <Mono size={10} color={isFiltered ? 'var(--ink)' : 'var(--ink-4)'}
        style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {countText}
      </Mono>

      {isFiltered && (
        <button type="button" onClick={onClear} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'Inter Tight', sans-serif", fontSize: 10,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--ink-4)', padding: 0,
        }}>Clear ×</button>
      )}
    </div>
  );
}

// ───────── Trade section ─────────
function SpecV2Section({ trade, tradeRows, vis, onToggleCol, labelTemplates,
  onUpdateRow, onRemoveRow, onAddItem }) {

  const [collapsed, setCollapsed] = React.useState(false);
  const code = tradeCode(trade);

  return (
    <section style={{ marginBottom: 36 }}>
      <div style={{
        display: 'flex', gap: 14, alignItems: 'center',
        padding: '14px 0 10px',
        borderBottom: '2px solid var(--ink)',
        position: 'sticky', top: 0, background: 'var(--paper)', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flex: 1, minWidth: 0 }}>
          <Mono size={10} color="var(--ink-4)" style={{ letterSpacing: '0.12em' }}>{code}</Mono>
          <Serif size={19} style={{ fontWeight: 500 }}>{trade}</Serif>
          <Mono size={9} color="var(--ink-4)" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {tradeRows.length} item{tradeRows.length === 1 ? '' : 's'}
          </Mono>
        </div>
        <SpecV2StatusCounts items={tradeRows} />
        <SpecV2ColPicker vis={vis} onToggle={onToggleCol} />
        <button type="button" onClick={() => setCollapsed(c => !c)} style={{
          background: 'none', border: '1px solid var(--rule-2)',
          padding: '4px 10px', cursor: 'pointer',
          fontFamily: "'Inter Tight', sans-serif", fontSize: 10,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)',
        }}>{collapsed ? 'Show' : 'Hide'}</button>
      </div>

      {!collapsed && tradeRows.map(({ row, material }, idx) => (
        <SpecV2ProductCard
          key={row.id}
          row={row}
          material={material}
          vis={vis}
          refCode={code + '-' + String(idx + 1).padStart(2, '0')}
          labelTemplates={labelTemplates}
          onUpdate={patch => onUpdateRow(row.id, patch)}
          onRemove={() => onRemoveRow(row.id)}
        />
      ))}

      {!collapsed && (
        <div style={{ padding: '10px 0', borderBottom: '1px dotted var(--rule-2)' }}>
          <button type="button" onClick={onAddItem} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'Inter Tight', sans-serif", fontSize: 10.5,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--ink-4)', padding: 0,
          }}>+ Add to {trade}</button>
        </div>
      )}
      {collapsed && (
        <div style={{ padding: '9px 0', fontFamily: 'var(--font-mono)',
          fontSize: 10, color: 'var(--ink-4)' }}>
          {tradeRows.length} items hidden
        </div>
      )}
    </section>
  );
}

function tradeCode(trade) {
  if (!trade) return '—';
  // Multi-word trades → first letters of first two words; single word → first 3 chars.
  const words = trade.split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return trade.slice(0, 3).toUpperCase();
}

function SpecV2StatusCounts({ items }) {
  const counts = {};
  items.forEach(({ row }) => {
    const s = row.status || 'specified';
    counts[s] = (counts[s] || 0) + 1;
  });
  return (
    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {STATUS_ORDER.filter(s => counts[s]).map(s => {
        const cfg = SPEC_STATUS[s];
        return (
          <span key={s} title={cfg.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
            <Mono size={9} color={cfg.dot}>{counts[s]}</Mono>
          </span>
        );
      })}
    </span>
  );
}

// ───────── Column picker popover ─────────
function SpecV2ColPicker({ vis, onToggle }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        background: 'none', border: '1px solid var(--rule-2)',
        padding: '4px 10px', cursor: 'pointer',
        fontFamily: "'Inter Tight', sans-serif", fontSize: 10,
        letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)',
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}>
        Fields <span style={{ opacity: 0.6, fontSize: 8 }}>▾</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0,
            background: 'var(--paper)', border: '1px solid var(--ink)',
            zIndex: 20, minWidth: 210, boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
          }}>
            <div style={{
              padding: '8px 14px 6px',
              fontFamily: "'Inter Tight', sans-serif", fontSize: 9,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)',
              borderBottom: '1px solid var(--rule)',
            }}>Toggle fields</div>
            {SPEC_V2_COLS.map(col => {
              const on = vis.has(col.id);
              return (
                <div key={col.id} onClick={() => onToggle(col.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 9,
                    padding: '7px 14px', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--tint)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{
                    width: 12, height: 12, flexShrink: 0,
                    border: '1px solid ' + (on ? 'var(--ink)' : 'var(--rule-2)'),
                    background: on ? 'var(--ink)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {on && <span style={{ color: 'var(--paper)', fontSize: 9, lineHeight: 1, fontWeight: 600 }}>✓</span>}
                  </div>
                  <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 12,
                    color: on ? 'var(--ink)' : 'var(--ink-3)' }}>{col.label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ───────── Product card ─────────
function SpecV2ProductCard({ row, material, vis, refCode, labelTemplates, onUpdate, onRemove }) {
  const [hov, setHov] = React.useState(false);

  if (!material) {
    return (
      <div style={{
        padding: '14px 0', borderBottom: '1px solid var(--rule)',
        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-ink)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>↯ Material missing — was deleted from Library</span>
        <button type="button" onClick={onRemove} style={{
          background: 'none', border: '1px solid var(--rule-2)', cursor: 'pointer',
          padding: '4px 10px',
          fontFamily: "'Inter Tight', sans-serif", fontSize: 10,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)',
        }}>Remove</button>
      </div>
    );
  }

  const swatchTone = material.swatch?.tone || '#cbc6ba';
  const visibleCols = SPEC_V2_COLS.filter(c => vis.has(c.id));
  const shortFields = visibleCols.filter(c => SHORT_COL_IDS.has(c.id));
  const wideFields  = visibleCols.filter(c => LONG_COL_IDS.has(c.id));

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'grid', gridTemplateColumns: '178px 1fr',
        borderBottom: '1px solid var(--rule)',
        background: hov ? 'var(--tint)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <div style={{
        borderRight: '1px solid var(--rule)',
        position: 'relative',
      }}>
        <div style={{
          width: 178, height: 178,
          background: swatchTone,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.32)" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="1" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21,15 16,10 5,21" />
            </svg>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 8,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.32)',
            }}>swatch</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 24px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: 10, gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10,
              marginBottom: 4, flexWrap: 'wrap' }}>
              <Mono size={9.5} color="var(--ink-4)" style={{ letterSpacing: '0.08em' }}>
                {refCode}
              </Mono>
              <span style={{
                fontFamily: "'Newsreader', serif", fontSize: 18,
                color: 'var(--ink)', lineHeight: 1.2,
              }}>
                {window.formatLabel ? window.formatLabel(material, labelTemplates) : material.name}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <Mono size={9.5} color="var(--ink-4)">{material.code}</Mono>
              {material.supplier && (
                <span style={{ fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 12, color: 'var(--ink-3)' }}>{material.supplier}</span>
              )}
              {material.mfr && material.mfr !== material.supplier && (
                <span style={{ fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic' }}>
                  mfr: {material.mfr}
                </span>
              )}
            </div>
          </div>
          <SpecV2StatusEditor
            value={row.status || 'specified'}
            onChange={s => onUpdate({ status: s })}
          />
        </div>

        {shortFields.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px 24px', padding: '10px 0',
            borderTop: '1px solid var(--rule)',
          }}>
            {shortFields.map(col => (
              <div key={col.id}>
                <div style={{
                  fontFamily: "'Inter Tight', sans-serif", fontSize: 8.5,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--ink-4)', marginBottom: 4,
                }}>{col.label}</div>
                {col.id === 'rooms' ? (
                  <SpecV2RoomsField rooms={row.rooms || []}
                    onChange={rooms => onUpdate({ rooms })} />
                ) : (
                  <SpecV2ShortValue colId={col.id} material={material} />
                )}
              </div>
            ))}
          </div>
        )}

        {wideFields.map(col => {
          const value = wideFieldValue(col.id, row, material);
          if (!value) return null;
          return (
            <div key={col.id} style={{ borderTop: '1px solid var(--rule)', padding: '10px 0' }}>
              <div style={{
                fontFamily: "'Inter Tight', sans-serif", fontSize: 8.5,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--ink-4)', marginBottom: 4,
              }}>{col.label}</div>
              <div style={{
                fontFamily: "'Newsreader', serif", fontSize: 13,
                color: 'var(--ink-3)', fontStyle: 'italic', lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
              }}>{value}</div>
            </div>
          );
        })}

        {hov && (
          <button type="button" onClick={onRemove} title="Remove from spec"
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-4)', fontSize: 16, padding: 4, lineHeight: 1,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-4)'}
          >×</button>
        )}
      </div>
    </div>
  );
}

function SpecV2ShortValue({ colId, material }) {
  const value = (() => {
    switch (colId) {
      case 'finish':   return material.finish;
      case 'supplier': return material.supplier;
      case 'mfr':      return material.mfr;
      case 'url':      return material.url;
      case 'contact':  return material.contact;
      case 'warranty': return material.warranty;
      default:         return null;
    }
  })();
  if (!value) {
    return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>—</span>;
  }
  if (colId === 'url') {
    const href = /^https?:\/\//i.test(value) ? value : 'https://' + value;
    return (
      <a href={href} target="_blank" rel="noreferrer noopener"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--ink-2)', textDecoration: 'underline',
          wordBreak: 'break-all', lineHeight: 1.35 }}>{value}</a>
    );
  }
  const isMono = colId === 'contact';
  return (
    <div style={{
      fontFamily: isMono ? 'var(--font-mono)' : "'Inter Tight', sans-serif",
      fontSize: isMono ? 10.5 : 11.5,
      color: 'var(--ink-2)', lineHeight: 1.4,
      wordBreak: 'break-word',
    }}>{value}</div>
  );
}

function wideFieldValue(colId, row, material) {
  if (colId === 'desc')    return material.spec || '';
  if (colId === 'install') return material.installNotes || '';
  if (colId === 'note')    return row.note || '';
  return '';
}

// ───────── Status badge + dropdown editor ─────────
function SpecV2StatusEditor({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const cfg = SPEC_STATUS[value] || SPEC_STATUS.specified;
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        title="Change status"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px',
          background: cfg.bg, border: 'none', cursor: 'pointer',
          fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          color: cfg.dot, fontWeight: 500, whiteSpace: 'nowrap',
        }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
        {cfg.label}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0,
            background: 'var(--paper)', border: '1px solid var(--ink)',
            zIndex: 20, minWidth: 160, boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
          }}>
            {STATUS_ORDER.map(s => {
              const c = SPEC_STATUS[s];
              const active = value === s;
              return (
                <button key={s} type="button"
                  onClick={() => { onChange(s); setOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '8px 12px',
                    background: active ? 'var(--tint)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--tint)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 12, color: 'var(--ink)' }}>{c.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ───────── Rooms tag input ─────────
function SpecV2RoomsField({ rooms, onChange }) {
  const [input, setInput] = React.useState('');

  function commit() {
    const v = input.trim();
    if (!v) return;
    if (rooms.includes(v)) { setInput(''); return; }
    onChange([...rooms, v]);
    setInput('');
  }
  function remove(r) {
    onChange(rooms.filter(x => x !== r));
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {rooms.map(r => (
        <span key={r} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 4px 2px 6px',
          border: '1px solid var(--rule-2)',
          fontFamily: "'Inter Tight', sans-serif", fontSize: 9.5,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          color: 'var(--ink-3)', whiteSpace: 'nowrap',
        }}>
          {r}
          <button type="button" onClick={() => remove(r)} title="Remove"
            onMouseDown={e => e.preventDefault()}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-4)', fontSize: 11, padding: 0, lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-4)'}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
          else if (e.key === 'Backspace' && !input && rooms.length) {
            onChange(rooms.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={rooms.length ? '+' : '+ add room'}
        style={{
          background: 'transparent', border: 'none', outline: 'none',
          fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
          color: 'var(--ink-2)',
          width: rooms.length ? 60 : 90,
          padding: '2px 0',
        }}
      />
    </div>
  );
}

Object.assign(window, { ProjectSpecV2 });
