// Shared modal chrome for two-column picker dialogs.
// Props: eyebrow, title, width, leftWidth, onClose, leftRail (element), footer (element), children (right panel).

function ModalPicker({ eyebrow, title, width, leftWidth, onClose, leftRail, footer, children }) {
  React.useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
          width: width || 'min(780px, 100%)',
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
            }}>{eyebrow}</div>
            <h2 style={{
              margin: 0,
              fontFamily: "'Newsreader', serif",
              fontSize: 22, fontWeight: 400,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
            }}>{title}</h2>
          </div>
          <button type="button" onClick={onClose}
            style={{
              background: 'none', border: 'none', padding: 4, cursor: 'pointer',
              fontSize: 18, color: 'var(--ink-3)', lineHeight: 1,
            }}>×</button>
        </div>

        {/* Body: left rail + right panel */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `${leftWidth || 200}px 1fr`,
          minHeight: 0,
        }}>
          <div style={{
            borderRight: '1px solid var(--rule)',
            background: 'var(--paper-2)',
            overflowY: 'auto',
            padding: '10px 0',
          }}>
            {leftRail}
          </div>
          <div style={{ overflowY: 'auto', padding: '14px 20px 20px' }}>
            {children}
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
          {footer}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ModalPicker });
