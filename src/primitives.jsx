// Shared UI primitives

const ui = {
  label: {
    fontFamily: "'Inter Tight', system-ui, sans-serif",
    fontWeight: 500,
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--ink-3)',
  },
  mono: {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontWeight: 400,
    fontFeatureSettings: '"tnum", "zero"',
  },
  serif: {
    fontFamily: "'Newsreader', Georgia, serif",
    fontWeight: 400,
  },
};

function Eyebrow({ children, style = {} }) {
  return <div style={{ ...ui.label, ...style }}>{children}</div>;
}

function Mono({ children, size = 13, color, style = {} }) {
  return (
    <span style={{ ...ui.mono, fontSize: size, color: color || 'inherit', ...style }}>
      {children}
    </span>
  );
}

function Serif({ children, size = 18, style = {} }) {
  return <span style={{ ...ui.serif, fontSize: size, ...style }}>{children}</span>;
}

function Rule({ heavy = false, style = {} }) {
  return (
    <div style={{
      height: 1,
      background: heavy ? 'var(--ink)' : 'var(--rule)',
      ...style,
    }} />
  );
}

function IconButton({ children, onClick, title, active = false, style = {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: active ? 'var(--ink)' : 'transparent',
        border: '1px solid var(--rule-2)',
        color: active ? 'var(--paper)' : 'var(--ink-2)',
        cursor: 'pointer',
        padding: '6px 10px',
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontWeight: 500,
        transition: 'all 0.12s',
        ...style,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'var(--ink)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--rule-2)'; }}
    >
      {children}
    </button>
  );
}

function TextButton({ children, onClick, accent = false, style = {} }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontWeight: 500,
        color: hov ? (accent ? 'var(--accent-ink)' : 'var(--ink)') : (accent ? 'var(--accent)' : 'var(--ink-3)'),
        borderBottom: '1px solid ' + (hov ? 'currentColor' : 'transparent'),
        transition: 'color 0.12s, border-color 0.12s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Tag({ children, tone = 'neutral', style = {} }) {
  const tones = {
    neutral: { bg: 'transparent', bd: 'var(--rule-2)', fg: 'var(--ink-3)' },
    ink:     { bg: 'var(--ink)', bd: 'var(--ink)', fg: 'var(--paper)' },
    accent:  { bg: 'transparent', bd: 'var(--accent)', fg: 'var(--accent-ink)' },
    soft:    { bg: 'var(--tint)', bd: 'transparent', fg: 'var(--ink-2)' },
  }[tone] || { bg: 'transparent', bd: 'var(--rule-2)', fg: 'var(--ink-3)' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 7px',
      background: tones.bg,
      border: `1px solid ${tones.bd}`,
      color: tones.fg,
      fontFamily: "'Inter Tight', sans-serif",
      fontSize: 9.5,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      fontWeight: 500,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {children}
    </span>
  );
}

function fmtCurrency(v) {
  if (v === null || v === undefined || v === '' || Number.isNaN(+v)) return '—';
  return '$' + Number(v).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(v) {
  if (v === null || v === undefined || v === '' || Number.isNaN(+v)) return '—';
  const n = Number(v);
  return n % 1 === 0 ? n.toString() : n.toLocaleString('en-AU', { maximumFractionDigits: 3 });
}

function SearchField({ value, onChange, placeholder = 'Search', style = {} }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--rule-2)',
          padding: '8px 0 8px 22px',
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 13,
          color: 'var(--ink)',
          outline: 'none',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--ink)'}
        onBlur={e => e.target.style.borderColor = 'var(--rule-2)'}
      />
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}>
        <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="1.4" />
        <line x1="15" y1="15" x2="20" y2="20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

Object.assign(window, { ui, Eyebrow, Mono, Serif, Rule, IconButton, TextButton, Tag, fmtCurrency, fmtNum, SearchField });
