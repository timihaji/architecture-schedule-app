// Kind picker — two-column modal shown before the editor opens.
// Left: groups. Right: kinds in the active group. Pick one → createNewItem(kindId).

function KindPicker({ onPick, onClose }) {
  const KINDS = window.KINDS || [];
  const GROUPS = window.KIND_GROUPS || [];
  const [activeGroup, setActiveGroup] = React.useState(GROUPS[0] || 'Finishes');
  const [hoverKind, setHoverKind] = React.useState(null);

  // Esc to close
  React.useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const groupKinds = KINDS.filter(k => k.group === activeGroup);

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
          gridTemplateColumns: '180px 1fr',
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
              const count = KINDS.filter(k => k.group === g).length;
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

          {/* Kinds panel */}
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 10,
            }}>
              {groupKinds.map(k => {
                const hovered = hoverKind === k.id;
                const glyph = (window.kindGlyph && window.kindGlyph(k.id)) || '·';
                return (
                  <button key={k.id} type="button"
                    onClick={() => onPick(k.id)}
                    onMouseEnter={() => setHoverKind(k.id)}
                    onMouseLeave={() => setHoverKind(null)}
                    style={{
                      background: hovered ? 'var(--paper-2)' : 'var(--paper)',
                      border: '1px solid ' + (hovered ? 'var(--ink)' : 'var(--rule-2)'),
                      padding: '14px 14px 12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'grid',
                      gridTemplateColumns: '36px 1fr',
                      gap: 12,
                      alignItems: 'center',
                      transition: 'border-color 120ms, background 120ms',
                    }}>
                    <span style={{
                      width: 36, height: 36,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid var(--rule-2)',
                      background: 'var(--paper)',
                      color: hovered ? 'var(--accent-ink)' : 'var(--ink-2)',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 20, lineHeight: 1,
                      transition: 'color 120ms',
                    }}>{glyph}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                      <span style={{
                        fontFamily: "'Newsreader', serif",
                        fontSize: 15,
                        color: 'var(--ink)',
                        letterSpacing: '-0.005em',
                      }}>{k.label}</span>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9.5, letterSpacing: '0.05em',
                        color: 'var(--ink-4)',
                        textTransform: 'uppercase',
                      }}>{k.defaultTrade}</span>
                    </span>
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
            Pick a kind — you can change trade and tags in the editor.
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
