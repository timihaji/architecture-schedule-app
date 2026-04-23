// Tweaks panel — dev-only experimental toggles.
// Mature user-facing controls (accent, density, paper, gallery width, imagery)
// have graduated to the Settings page. This panel is now empty by design —
// a home for future experiments.

function Tweaks({ tweaks, setTweaks, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      right: 24,
      bottom: 24,
      width: 280,
      background: 'var(--paper)',
      border: '1px solid var(--ink)',
      boxShadow: '0 16px 40px rgba(0,0,0,0.1)',
      padding: '18px 20px 20px',
      zIndex: 90,
      fontFamily: "'Inter Tight', var(--font-sans, system-ui), sans-serif",
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: 14 }}>
        <Eyebrow>Tweaks · dev</Eyebrow>
        <TextButton onClick={onClose}>×</TextButton>
      </div>

      <div style={{
        ...ui.serif, fontStyle: 'italic',
        fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.45,
        marginBottom: 14,
      }}>
        User-facing style controls now live in Settings
        <span style={{ ...ui.mono, fontSize: 10, color: 'var(--ink-4)',
          letterSpacing: '0.12em', marginLeft: 4 }}>
          (IV, top right)
        </span>.
      </div>

      <div style={{
        padding: '10px 12px',
        background: 'var(--tint)',
        borderLeft: '2px solid var(--rule-2)',
        fontFamily: "'Newsreader', var(--font-serif, serif)",
        fontStyle: 'italic',
        fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.45,
      }}>
        No experimental tweaks are active. This panel is reserved for
        work-in-progress flags during development.
      </div>
    </div>
  );
}

Object.assign(window, { Tweaks });
