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
      <div className="cloud-toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={'cloud-toast' + (t.kind === 'error' ? ' error' : '')}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="cloud-toast-head">
                {t.kind === 'error' ? 'Save failed' : 'Notice'}
              </div>
              <div className="cloud-toast-body">{t.message}</div>
            </div>
            {t.retry ? (
              <button type="button" className="cloud-toast-btn primary" onClick={() => { t.retry(); dismiss(t.id); }}>
                Retry
              </button>
            ) : null}
            <button type="button" className="cloud-toast-btn" onClick={() => dismiss(t.id)}>
              Dismiss
            </button>
          </div>
        ))}
      </div>
    );
  }

  Object.assign(window, { CloudToasts });
})();
