// Category picker — two-column modal shown before the editor opens.
// Left: groups. Right: categories in the active group. Pick one → createNewItem(categoryId).

function KindPicker({ onPick, onClose }) {
  const schema = (window.schemaActive && window.schemaActive()) || window.DEFAULT_SCHEMA_V5 || { groups: [], categories: [] };
  const groups = (schema.groups || []).filter(g => !g.hidden);
  const allCats = schema.categories || [];
  const [activeGroupId, setActiveGroupId] = React.useState((groups[0] && groups[0].id) || '');
  const [hoverCat, setHoverCat] = React.useState(null);

  React.useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const groupCats = allCats.filter(c => c.groupId === activeGroupId && !c.hidden);
  const activeGroupDef = groups.find(g => g.id === activeGroupId);

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
          width: 'min(780px, 100%)',
          maxHeight: '82vh',
          background: 'var(--paper)',
          border: '1px solid var(--ink)',
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
            }}>New entry</div>
            <h2 style={{
              margin: 0,
              fontFamily: "'Newsreader', serif",
              fontSize: 22, fontWeight: 400,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
            }}>What are you adding?</h2>
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
          gridTemplateColumns: '200px 1fr',
          minHeight: 0,
        }}>
          {/* Groups rail */}
          <div style={{
            borderRight: '1px solid var(--rule)',
            background: 'var(--paper-2)',
            overflowY: 'auto',
            padding: '10px 0',
          }}>
            {groups.map(g => {
              const active = g.id === activeGroupId;
              const count = allCats.filter(c => c.groupId === g.id && !c.hidden).length;
              return (
                <button key={g.id} type="button"
                  onClick={() => setActiveGroupId(g.id)}
                  style={{
                    display: 'flex', alignItems: 'baseline',
                    justifyContent: 'space-between', gap: 10,
                    width: '100%', border: 'none',
                    background: active ? 'var(--paper)' : 'transparent',
                    padding: '7px 16px',
                    cursor: 'pointer',
                    fontFamily: "'Newsreader', serif",
                    fontSize: 13,
                    color: active ? 'var(--ink)' : 'var(--ink-3)',
                    borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                    textAlign: 'left',
                  }}>
                  <span>{g.label}</span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10, color: 'var(--ink-4)',
                  }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Categories panel */}
          <div style={{ overflowY: 'auto', padding: '14px 20px 20px' }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--ink-4)', marginBottom: 10,
            }}>
              {activeGroupDef ? activeGroupDef.label : ''}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 8,
            }}>
              {groupCats.map(c => {
                const hovered = hoverCat === c.id;
                const trade = window.defaultTradeForCategory ? window.defaultTradeForCategory(c.id) : '';
                return (
                  <button key={c.id} type="button"
                    onClick={() => onPick(c.id)}
                    onMouseEnter={() => setHoverCat(c.id)}
                    onMouseLeave={() => setHoverCat(null)}
                    style={{
                      background: hovered ? 'var(--paper-2)' : 'var(--paper)',
                      border: '1px solid ' + (hovered ? 'var(--ink)' : 'var(--rule-2)'),
                      padding: '12px 12px 10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      transition: 'border-color 120ms, background 120ms',
                    }}>
                    <span style={{
                      fontFamily: "'Newsreader', serif",
                      fontSize: 14,
                      color: 'var(--ink)',
                      letterSpacing: '-0.005em',
                    }}>{c.label}</span>
                    {trade && (
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9, letterSpacing: '0.05em',
                        color: 'var(--ink-4)',
                        textTransform: 'uppercase',
                      }}>{trade}</span>
                    )}
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
          <span style={{
            fontFamily: "'Newsreader', serif", fontStyle: 'italic',
            fontSize: 12.5, color: 'var(--ink-3)',
          }}>
            Pick a category — you can change it in the editor.
          </span>
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

Object.assign(window, { KindPicker });
