// src/SaveStatusIndicator.jsx — top-right chrome widget showing save state.
//
// States:
//   idle (no saves yet)              — hidden
//   pending > 0                       — pulsing dot, "Saving…"
//   pending === 0 && lastSavedAt      — green dot, "Saved <relative>"
//   lastError                         — red dot, "Couldn't save", with retry
//
// Wires via window.cloud.onSaveStatus. Phase 1b: no saves happen yet (App
// still uses localStorage), so this stays hidden until Phase 2.

(function () {
  const { useState, useEffect } = React;

  function SaveStatusIndicator() {
    const [state, setState] = useState({ pending: 0, lastError: null, lastSavedAt: null });
    const [, setTick] = useState(0);

    useEffect(() => {
      if (!window.cloud) return;
      return window.cloud.onSaveStatus(setState);
    }, []);

    // Re-render every 30s so "Saved 2m ago" stays current.
    useEffect(() => {
      if (!state.lastSavedAt) return;
      const t = setInterval(() => setTick(n => n + 1), 30_000);
      return () => clearInterval(t);
    }, [state.lastSavedAt]);

    let label, dotColor, pulsing = false;
    if (state.lastError) {
      label = "Couldn't save";
      dotColor = '#c54a3b';
    } else if (state.pending > 0) {
      label = 'Saving…';
      dotColor = 'var(--accent)';
      pulsing = true;
    } else if (state.lastSavedAt) {
      label = `Saved ${formatRelative(state.lastSavedAt)}`;
      dotColor = '#3a8a4a';
    } else {
      return null;
    }

    return (
      <div style={wrap()}>
        <span style={dot(dotColor, pulsing)} />
        <span>{label}</span>
        {state.lastError ? (
          <button type="button" style={retryBtn()}
                  title={state.lastError}
                  onClick={() => {
                    // Phase 1b: just clears the error so user can keep working.
                    // Real retry is wired in Phase 3 when actual saves are happening.
                    if (window.cloud && window.cloud.onSaveStatus) {
                      // Force-emit a cleared state by re-subscribing nothing — just
                      // reset locally; the next successful save will overwrite this.
                      setState(s => ({ ...s, lastError: null }));
                    }
                  }}>
            Dismiss
          </button>
        ) : null}
        {pulsing ? <PulseKeyframes /> : null}
      </div>
    );
  }

  function PulseKeyframes() {
    return (
      <style>{`
        @keyframes amlSavePulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.35 } }
      `}</style>
    );
  }

  function formatRelative(ts) {
    const ms = Date.now() - ts;
    const s = Math.round(ms / 1000);
    if (s < 5)    return 'just now';
    if (s < 60)   return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60)   return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24)   return `${h}h ago`;
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function wrap() {
    return {
      position: 'fixed',
      top: 12,
      right: 12,
      zIndex: 9000,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.06em',
      color: 'var(--ink-2)',
      background: 'rgba(243, 239, 231, 0.92)',
      border: '1px solid var(--rule-2)',
      borderRadius: 2,
      backdropFilter: 'blur(4px)',
      pointerEvents: 'auto',
    };
  }
  function dot(color, pulsing) {
    return {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: color,
      animation: pulsing ? 'amlSavePulse 1.2s ease-in-out infinite' : 'none',
    };
  }
  function retryBtn() {
    return {
      marginLeft: 4,
      padding: '2px 6px',
      fontFamily: 'inherit',
      fontSize: 10,
      letterSpacing: 'inherit',
      color: 'var(--accent-ink)',
      background: 'transparent',
      border: '1px solid var(--rule-2)',
      borderRadius: 2,
      cursor: 'pointer',
    };
  }

  Object.assign(window, { SaveStatusIndicator });
})();
