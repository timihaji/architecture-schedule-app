// src/SaveStatusIndicator.jsx — inline save-state widget for the lower revision bar.
//
// States:
//   idle (no saves yet)              — hidden
//   pending > 0                       — pulsing dot, "Saving…"
//   pending === 0 && lastSavedAt      — green dot, "Saved <relative>"
//   lastError                         — red dot, "Couldn't save", with dismiss
//
// Wires via window.cloud.onSaveStatus. Rendered inline by RevisionBadge so the
// styling matches the bar's 10px JetBrains Mono / var(--ink-4) typography.

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
      <span style={wrap()}>
        <span style={dot(dotColor, pulsing)} />
        <span>{label}</span>
        {state.lastError ? (
          <a href="#" style={dismissLink()}
             title={state.lastError}
             onClick={e => {
               e.preventDefault();
               setState(s => ({ ...s, lastError: null }));
             }}>
            Dismiss
          </a>
        ) : null}
        {pulsing ? <PulseKeyframes /> : null}
      </span>
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
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      color: 'inherit',
    };
  }
  function dot(color, pulsing) {
    return {
      display: 'inline-block',
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: color,
      animation: pulsing ? 'amlSavePulse 1.2s ease-in-out infinite' : 'none',
    };
  }
  function dismissLink() {
    return {
      marginLeft: 4,
      color: 'var(--ink-3)',
      textDecoration: 'none',
      cursor: 'pointer',
    };
  }

  Object.assign(window, { SaveStatusIndicator });
})();
