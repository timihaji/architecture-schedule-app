// Component Type picker — modal popover for tagging a schedule/spec row with
// a physical type (floor, wall, tap, etc.). Drives picker filtering + defaults.
// API: <ComponentTypePicker value={typeId|null} onChange={(typeId|null)=>} onClose={()=>} />

function ComponentTypePicker({ value, onChange, onClose }) {
  const TYPES = window.COMPONENT_TYPES || [];
  const GROUPS = window.COMPONENT_TYPE_GROUPS || [];
  const current = value ? TYPES.find(t => t.id === value) : null;
  const [activeGroup, setActiveGroup] = React.useState(() => current?.group || GROUPS[0] || 'Surfaces');
  const [hoverType, setHoverType] = React.useState(null);

  React.useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const groupTypes = TYPES.filter(t => t.group === activeGroup);

  function pick(typeId) {
    onChange(typeId);
    onClose();
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(20, 18, 14, 0.48)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 32,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(720px, 100%)',
          maxHeight: '82vh',
          background: 'var(--paper)',
          border: '1px solid var(--ink)',
          boxShadow: '0 20px 60px rgba(20, 18, 14, 0.25)',
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          overflow: 'hidden',
        }}>
        {/* Header */}
        <div style={{
          padding: '18px 28px 14px',
          borderBottom: '1px solid var(--ink)',
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 18,
        }}>
          <div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--ink-4)', marginBottom: 4,
            }}>Component type</div>
            <h2 style={{
              margin: 0,
              fontFamily: "'Newsreader', serif",
              fontSize: 22, fontWeight: 400,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
            }}>What is this row?</h2>
          </div>
          <button type="button" onClick={onClose}
            style={{
              background: 'none', border: 'none', padding: 4, cursor: 'pointer',
              fontSize: 18, color: 'var(--ink-3)', lineHeight: 1,
            }}>×</button>
        </div>

        {/* Body: two columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '170px 1fr',
          minHeight: 0,
        }}>
          {/* Groups rail */}
          <div style={{
            borderRight: '1px solid var(--rule)',
            background: 'var(--paper-2)',
            overflowY: 'auto',
            padding: '10px 0',
          }}>
            {GROUPS.map(g => {
              const active = g === activeGroup;
              const count = TYPES.filter(t => t.group === g).length;
              return (
                <button key={g} type="button"
                  onClick={() => setActiveGroup(g)}
                  style={{
                    display: 'flex', alignItems: 'baseline',
                    justifyContent: 'space-between', gap: 10,
                    width: '100%', border: 'none',
                    background: active ? 'var(--paper)' : 'transparent',
                    padding: '7px 16px',
                    cursor: 'pointer',
                    fontFamily: "'Newsreader', serif",
                    fontSize: 14,
                    color: active ? 'var(--ink)' : 'var(--ink-3)',
                    borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                    textAlign: 'left',
                  }}>
                  <span>{g}</span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10, color: 'var(--ink-4)',
                  }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Types panel */}
          <div style={{ overflowY: 'auto', padding: '14px 20px 20px' }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--ink-4)', marginBottom: 10,
            }}>
              {activeGroup}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: 8,
            }}>
              {groupTypes.map(t => {
                const hovered = hoverType === t.id;
                const isActive = value === t.id;
                return (
                  <button key={t.id} type="button"
                    onClick={() => pick(t.id)}
                    onMouseEnter={() => setHoverType(t.id)}
                    onMouseLeave={() => setHoverType(null)}
                    style={{
                      background: isActive ? 'var(--paper-2)' : (hovered ? 'var(--paper-2)' : 'var(--paper)'),
                      border: '1px solid ' + (isActive ? 'var(--accent)' : (hovered ? 'var(--ink)' : 'var(--rule-2)')),
                      padding: '10px 12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex', flexDirection: 'column', gap: 3,
                      transition: 'border-color 120ms, background 120ms',
                    }}>
                    <span style={{
                      fontFamily: "'Newsreader', serif",
                      fontSize: 14,
                      color: 'var(--ink)',
                      letterSpacing: '-0.005em',
                    }}>{t.label}</span>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9, letterSpacing: '0.05em',
                      color: 'var(--ink-4)',
                      textTransform: 'uppercase',
                    }}>unit: {t.defaultUnit}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 28px',
          borderTop: '1px solid var(--rule)',
          background: 'var(--paper-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16,
        }}>
          <button type="button"
            onClick={() => { onChange(null); onClose(); }}
            disabled={!value}
            style={{
              background: 'none', border: 'none', padding: 0,
              cursor: value ? 'pointer' : 'default',
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: value ? 'var(--ink-3)' : 'var(--ink-4)', fontWeight: 500,
            }}>Clear type</button>
          <button type="button" onClick={onClose}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--ink-3)', fontWeight: 500,
            }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ComponentTypePicker });
