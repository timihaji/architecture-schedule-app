// Phase A2 atoms — design-system primitives derived from design/handoff/designs/*.
// CSS specs sourced from Library.html, Add Product.html, Library Switcher.html.
// Eyebrow stays in primitives.jsx (already correct: 10px / 0.14em / 500 / ink-3).

// ─── MetaMono ───────────────────────────────────────────────────────────────
// Library.html .meta-mono — used for "LIB-02", "46 PRODUCTS", etc.
function MetaMono({ children, style = {}, ...rest }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--ink-4)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}

// ─── CodeChip ───────────────────────────────────────────────────────────────
// Library.html .code-mono — Mono Clean variant ships in v1. Future variants
// (serif / pill / box / stamp) reserved for v2 per-library override.
// size: 'register' (11px) | 'gallery' (13px)
// tone: 'product' (default — accent-ink) | 'type' (good-ink — v2)
function CodeChip({ children, size = 'register', tone = 'product', variant = 'mono-clean', style = {}, ...rest }) {
  const fontSize = size === 'gallery' ? 13 : 11;
  const color = tone === 'type' ? 'var(--good-ink)' : 'var(--accent-ink)';
  // v2 variants would branch here; v1 always renders mono-clean.
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize,
        fontWeight: 500,
        letterSpacing: '0.04em',
        color,
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}

// ─── SectionHeading ─────────────────────────────────────────────────────────
// Add Product.html .section-h — serif 13 / 500 / ink-3 with rule-bottom +
// right-aligned mono numeral.
function SectionHeading({ title, numeral, style = {}, children }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--ink-3)',
        paddingBottom: 6,
        margin: '18px 0 10px',
        borderBottom: '1px solid var(--rule)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        ...style,
      }}
    >
      <span>{title ?? children}</span>
      {numeral != null && (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          color: 'var(--ink-4)',
          letterSpacing: '0.1em',
        }}>{numeral}</span>
      )}
    </div>
  );
}

// ─── PrimaryButton ──────────────────────────────────────────────────────────
// Add Product.html .btn-pri — filled ink, paper text. Hover opacity 0.85.
function PrimaryButton({ children, onClick, type = 'button', disabled = false, style = {}, ...rest }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--ink)',
        color: 'var(--paper)',
        border: 'none',
        padding: '9px 18px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        fontWeight: 500,
        transition: 'opacity 0.1s',
        opacity: disabled ? 0.4 : (hov ? 0.85 : 1),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ─── GhostButton ────────────────────────────────────────────────────────────
// Library.html .btn-ghost — transparent, rule-2 border, ink-4 text.
// Hover → ink-3 border, ink-2 text.
function GhostButton({ children, onClick, type = 'button', disabled = false, style = {}, ...rest }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'none',
        border: '1px solid ' + (hov && !disabled ? 'var(--ink-3)' : 'var(--rule-2)'),
        padding: '5px 10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: hov && !disabled ? 'var(--ink-2)' : 'var(--ink-4)',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color 0.12s, color 0.12s',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ─── Input / Select / Textarea ──────────────────────────────────────────────
// Add Product.html .inp / .sel / .tarea
const FIELD_BASE = {
  width: '100%',
  background: 'var(--paper)',
  border: '1px solid var(--rule-2)',
  padding: '7px 10px',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  color: 'var(--ink)',
  outline: 'none',
  transition: 'border-color 0.1s',
};

function Input({ mono = false, style = {}, onFocus, onBlur, ...rest }) {
  return (
    <input
      style={{
        ...FIELD_BASE,
        ...(mono ? { fontFamily: 'var(--font-mono)', fontSize: 12 } : null),
        ...style,
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--ink-3)'; onFocus && onFocus(e); }}
      onBlur={e => { e.target.style.borderColor = 'var(--rule-2)'; onBlur && onBlur(e); }}
      {...rest}
    />
  );
}

const SELECT_CHEVRON_BG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239a9385' stroke-width='1.2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")";

function Select({ children, style = {}, onFocus, onBlur, ...rest }) {
  return (
    <select
      style={{
        ...FIELD_BASE,
        padding: '7px 28px 7px 10px',
        appearance: 'none',
        cursor: 'pointer',
        backgroundImage: SELECT_CHEVRON_BG,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 9px center',
        ...style,
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--ink-3)'; onFocus && onFocus(e); }}
      onBlur={e => { e.target.style.borderColor = 'var(--rule-2)'; onBlur && onBlur(e); }}
      {...rest}
    >
      {children}
    </select>
  );
}

function Textarea({ style = {}, onFocus, onBlur, ...rest }) {
  return (
    <textarea
      style={{
        ...FIELD_BASE,
        fontFamily: 'var(--font-serif)',
        color: 'var(--ink-2)',
        resize: 'vertical',
        lineHeight: 1.5,
        ...style,
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--ink-3)'; onFocus && onFocus(e); }}
      onBlur={e => { e.target.style.borderColor = 'var(--rule-2)'; onBlur && onBlur(e); }}
      {...rest}
    />
  );
}

// ─── LibTabs + Tab ──────────────────────────────────────────────────────────
// Library.html .lib-tabs / .lib-tab — bottom-rule strip with active underline.
// Used for Schedule view-toggle (Room/Element/Trade) and Add Product mode-tabs.
function LibTabs({ children, style = {} }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid var(--rule)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Tab({ children, active = false, onClick, disabled = false, count, style = {}, ...rest }) {
  const [hov, setHov] = React.useState(false);
  const color = active ? 'var(--ink)' : (hov && !disabled ? 'var(--ink-2)' : 'var(--ink-4)');
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'none',
        border: 'none',
        borderBottom: '2px solid ' + (active ? 'var(--ink)' : 'transparent'),
        marginBottom: -1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '9px 14px',
        fontFamily: 'var(--font-sans)',
        fontSize: 11.5,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color,
        fontWeight: active ? 600 : 400,
        opacity: disabled ? 0.4 : 1,
        transition: 'color 0.12s, border-color 0.12s',
        display: 'flex',
        gap: 7,
        alignItems: 'baseline',
        ...style,
      }}
      {...rest}
    >
      <span>{children}</span>
      {count != null && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5 }}>{count}</span>
      )}
    </button>
  );
}

// ─── SegmentedToggle ────────────────────────────────────────────────────────
// Inline button group with one active item highlighted in ink/paper. Used by
// ModeToggle (Gallery / Table) and DensityToggle (Compact / Regular /
// Comfortable). Items: { id, label?, icon?, title? }.
// `inactiveColor` lets callers tune visual weight (ModeToggle = ink-3;
// DensityToggle = ink-4 secondary).
// Name avoids collision with SettingsPage.jsx's local `Segmented` — babel-
// standalone leaks top-level function declarations to window.
function SegmentedToggle({
  items, active, onChange,
  height = 26,
  inactiveColor = 'var(--ink-4)',
  style = {},
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'stretch',
        border: '1px solid var(--rule-2)',
        height,
        ...style,
      }}
    >
      {items.map((item, i) => {
        const isActive = active === item.id;
        const hasLabel = !!item.label;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            title={item.title || item.label || item.id}
            style={{
              background: isActive ? 'var(--ink)' : 'transparent',
              color: isActive ? 'var(--paper)' : inactiveColor,
              border: 'none',
              borderLeft: i === 0 ? 'none' : '1px solid var(--rule-2)',
              padding: hasLabel ? '0 11px' : '0 8px',
              fontFamily: 'var(--font-sans)',
              fontSize: hasLabel ? 10.5 : 13,
              letterSpacing: hasLabel ? '0.08em' : 0,
              textTransform: hasLabel ? 'uppercase' : 'none',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              lineHeight: 1,
            }}
          >
            {item.icon != null && (
              <span style={{ fontSize: hasLabel ? 12 : 13, lineHeight: 1 }}>{item.icon}</span>
            )}
            {hasLabel && <span>{item.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── ModeTabStrip ───────────────────────────────────────────────────────────
// Add Product.html top strip — five intake-mode tabs across the top of the
// .ae editor frame. Manual + Duplicate are functional in v1; URL/PDF/CSV
// render greyed with a "v2" tag and a tooltip explaining unavailability.
// Disabled tabs are non-clickable and excluded from the tab order.
function ModeTabStrip({ mode, setMode, items, style = {} }) {
  // C1 delta — order matches v2 README "Add / Edit Drawer": Manual first, then
  // ingestion modes (URL/PDF/CSV deferred to v2), Duplicate last.
  const list = items || [
    { id: 'manual',    label: 'Manual' },
    { id: 'url',       label: 'URL', v2: true },
    { id: 'pdf',       label: 'PDF', v2: true },
    { id: 'csv',       label: 'CSV', v2: true },
    { id: 'duplicate', label: 'Duplicate' },
  ];
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid var(--rule)',
        padding: '0 22px',
        ...style,
      }}
    >
      {list.map(item => {
        const isActive = mode === item.id;
        const isDisabled = !!item.v2;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled || undefined}
            disabled={isDisabled}
            tabIndex={isDisabled ? -1 : 0}
            title={isDisabled ? 'Available in v2' : item.label}
            onClick={isDisabled ? undefined : () => setMode(item.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: '2px solid ' + (isActive ? 'var(--ink)' : 'transparent'),
              marginBottom: -1,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              padding: '11px 14px',
              fontFamily: 'var(--font-sans)',
              fontSize: 11.5,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: isDisabled ? 'var(--ink-4)' : (isActive ? 'var(--ink)' : 'var(--ink-3)'),
              fontWeight: isActive ? 600 : 500,
              opacity: isDisabled ? 0.45 : 1,
              transition: 'color 0.12s, border-color 0.12s',
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 6,
            }}
          >
            <span>{item.label}</span>
            {isDisabled && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--ink-4)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: 'var(--rule)',
                padding: '1px 4px',
              }}>v2</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Plate ──────────────────────────────────────────────────────────────────
// Reserved for v2 — Library Switcher overlay rows. Defined so v2 imports
// against a stable surface; not rendered anywhere in v1.
// Models the .dd-row pattern from Library Switcher Options.html.
function Plate({ code, name, count, active = false, onClick, actions, style = {} }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 12px',
        borderBottom: '1px solid var(--rule)',
        cursor: onClick ? 'pointer' : 'default',
        background: active ? 'rgba(20,20,20,0.03)' : 'transparent',
        ...style,
      }}
    >
      <div style={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: active ? 'var(--ink)' : 'var(--rule-2)',
        flexShrink: 0,
      }} />
      {code != null && (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--ink-4)',
          letterSpacing: '0.05em',
        }}>{code}</span>
      )}
      <span style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 13,
        color: 'var(--ink)',
        flex: 1,
        fontWeight: active ? 500 : 400,
      }}>{name}</span>
      {count != null && (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--ink-4)',
          letterSpacing: '0.05em',
        }}>{count}</span>
      )}
      {actions && <div style={{ display: 'flex', gap: 3 }}>{actions}</div>}
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────
// Adopt design's modal frame (Add Product.html .modal-bg / .modal-panel),
// stripped of shadow per A1 directive (design is square + no shadow).
// Slot-based: eyebrow (top strip), title (serif), onClose (X), children
// (body), footer (rule-top, callers compose with PrimaryButton + GhostButton).
function Modal({ eyebrow, title, onClose, children, footer, width = 600, style = {} }) {
  React.useEffect(() => {
    if (!onClose) return;
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,20,0.42)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width,
          maxWidth: '92vw',
          maxHeight: '90vh',
          background: 'var(--paper)',
          border: '1px solid var(--ink)',
          display: 'flex',
          flexDirection: 'column',
          ...style,
        }}
      >
        {(eyebrow || title || onClose) && (
          <div style={{
            padding: '14px 18px 12px',
            borderBottom: '1px solid var(--rule)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ minWidth: 0 }}>
              {eyebrow && (
                <div style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-3)',
                  marginBottom: 4,
                }}>{eyebrow}</div>
              )}
              {title && (
                <div style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 20,
                  fontWeight: 400,
                  color: 'var(--ink)',
                  lineHeight: 1.2,
                }}>{title}</div>
              )}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  fontFamily: 'var(--font-sans)',
                  fontSize: 18,
                  lineHeight: 1,
                  color: 'var(--ink-3)',
                }}
              >×</button>
            )}
          </div>
        )}
        <div style={{ padding: '14px 18px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
        {footer && (
          <div style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--rule)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}>{footer}</div>
        )}
      </div>
    </div>
  );
}

// ─── Toolbar ────────────────────────────────────────────────────────────────
// Library.html .toolbar — flex row with gap 8. Vbar separator exposed as
// Toolbar.Vbar so callers can compose: <Toolbar><search /><Toolbar.Vbar />…</Toolbar>.
function Toolbar({ children, style = {} }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 0 10px',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

Toolbar.Vbar = function ToolbarVbar({ style = {} }) {
  return (
    <div
      style={{
        width: 1,
        height: 18,
        background: 'var(--rule-2)',
        flexShrink: 0,
        ...style,
      }}
    />
  );
};

Toolbar.Count = function ToolbarCount({ children, style = {} }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--ink-4)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >{children}</span>
  );
};

Object.assign(window, {
  MetaMono,
  CodeChip,
  SectionHeading,
  PrimaryButton,
  GhostButton,
  Input,
  Select,
  Textarea,
  LibTabs,
  Tab,
  SegmentedToggle,
  ModeTabStrip,
  Plate,
  Modal,
  Toolbar,
});
