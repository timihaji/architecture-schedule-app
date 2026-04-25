// src/CloudToasts.jsx — non-modal toasts for cloud save failures + conflicts.
//
// Phase 1b: subscribes to cloud.onSaveStatus and shows a toast on lastError.
// Conflict-specific toast wires up properly in Phase 3 when actual concurrent
// edits become possible. Until then, generic "couldn't save" toast covers it.

(function () {
  const { useState, useEffect, useRef } = React;

  function CloudToasts() {
    const [toasts, setToasts] = useState([]); // [{ id, kind, message, retry }]
    const lastErrorRef = useRef(null);
    const idRef = useRef(0);

    useEffect(() => {
      if (!window.cloud) return;
      return window.cloud.onSaveStatus(state => {
        // Deduplicate — only fire when the error transitions to a new value.
        if (state.lastError && state.lastError !== lastErrorRef.current) {
          lastErrorRef.current = state.lastError;
          push({ kind: 'error', message: state.lastError });
        }
        if (!state.lastError) {
          lastErrorRef.current = null;
        }
      });
    }, []);

    function push({ kind, message, retry }) {
      const id = ++idRef.current;
      setToasts(t => [...t, { id, kind, message, retry }]);
      // Errors stay until dismissed; info auto-clears after 6s.
      if (kind !== 'error') {
        setTimeout(() => dismiss(id), 6000);
      }
    }
    function dismiss(id) {
      setToasts(t => t.filter(x => x.id !== id));
    }

    if (toasts.length === 0) return null;

    return (
      <div style={stack()}>
        {toasts.map(t => (
          <div key={t.id} style={toastBox(t.kind)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={toastTitle(t.kind)}>
                {t.kind === 'error' ? 'Save failed' : 'Notice'}
              </div>
              <div style={toastBody()}>{t.message}</div>
            </div>
            {t.retry ? (
              <button type="button" style={btn('primary')} onClick={() => { t.retry(); dismiss(t.id); }}>
                Retry
              </button>
            ) : null}
            <button type="button" style={btn('ghost')} onClick={() => dismiss(t.id)}>
              Dismiss
            </button>
          </div>
        ))}
      </div>
    );
  }

  function stack() {
    return {
      position: 'fixed',
      bottom: 16,
      right: 16,
      zIndex: 9100,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      maxWidth: 380,
    };
  }
  function toastBox(kind) {
    const isError = kind === 'error';
    return {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '12px 14px',
      background: isError ? 'rgba(197, 74, 59, 0.96)' : 'rgba(20, 20, 20, 0.92)',
      color: '#fff',
      borderRadius: 3,
      boxShadow: '0 6px 20px rgba(20, 20, 20, 0.18)',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      lineHeight: 1.4,
    };
  }
  function toastTitle() {
    return {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      opacity: 0.85,
      marginBottom: 2,
    };
  }
  function toastBody() {
    return {
      wordBreak: 'break-word',
    };
  }
  function btn(variant) {
    const base = {
      padding: '4px 8px',
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      borderRadius: 2,
      cursor: 'pointer',
      border: '1px solid rgba(255,255,255,0.4)',
      color: '#fff',
      whiteSpace: 'nowrap',
    };
    if (variant === 'primary') {
      return { ...base, background: 'rgba(255,255,255,0.18)' };
    }
    return { ...base, background: 'transparent' };
  }

  Object.assign(window, { CloudToasts });
})();
