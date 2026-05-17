// proto-primitives.jsx — shared UI atoms used by all pages

// ── Type atoms ────────────────────────────────────────────────────────
function Serif({ children, size=14, style={} }) {
  return <span style={{ fontFamily:'var(--font-serif)', fontSize:size, ...style }}>{children}</span>;
}
function Mono({ children, size=10, color, style={} }) {
  return <span style={{ fontFamily:'var(--font-mono)', fontSize:size, color:color||'inherit', ...style }}>{children}</span>;
}
function Eyebrow({ children, style={} }) {
  return <div style={{ fontFamily:'var(--font-sans)', fontSize:8.5, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-4)', fontWeight:500, ...style }}>{children}</div>;
}

// ── Swatch ────────────────────────────────────────────────────────────
function SwatchBox({ tone, size=32, style={} }) {
  return <div style={{ width:size, height:size, background:tone||'#ccc', flexShrink:0, outline:'1px solid rgba(20,20,20,0.12)', ...style }} />;
}

// ── Checkbox ──────────────────────────────────────────────────────────
function Checkbox({ checked, size=18, style={} }) {
  return (
    <div style={{
      width:size, height:size, flexShrink:0,
      border: checked ? '1px solid var(--ink)' : '1px solid var(--rule-2)',
      background: checked ? 'var(--ink)' : 'var(--paper)',
      display:'flex', alignItems:'center', justifyContent:'center',
      transition:'background 0.1s, border-color 0.1s',
      ...style,
    }}>
      {checked && (
        <svg width={size-6} height={size-6} viewBox="0 0 16 16" fill="none" stroke="var(--paper)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5 L7 12 L13 4" />
        </svg>
      )}
    </div>
  );
}

// ── Stage bar ─────────────────────────────────────────────────────────
function StageBar({ stage }) {
  const stages = ['Concept','Documentation','Construction','Handover'];
  const idx = stages.indexOf(stage);
  return (
    <div>
      <div style={{ display:'flex', gap:3, marginBottom:4 }}>
        {stages.map((s,i) => <div key={s} style={{ flex:1, height:2, background:i<=idx?'var(--ink)':'var(--rule-2)' }} />)}
      </div>
      <Mono size={9} color="var(--ink-3)" style={{ letterSpacing:'0.08em', textTransform:'uppercase' }}>{stage}</Mono>
    </div>
  );
}

// ── Overlay primitives ────────────────────────────────────────────────
function SheetBg({ onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(20,20,20,0.42)', zIndex:400 }} onClick={onClose}>
      <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'var(--paper)', borderTop:'1px solid var(--ink)', maxHeight:'90vh', overflowY:'auto', WebkitOverflowScrolling:'touch', animation:'slideUp .22s cubic-bezier(.2,.8,.2,1)' }} onClick={e=>e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function FullDrawer({ children, onClose }) {
  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(20,20,20,0.32)', zIndex:300 }} onClick={onClose} />
      <div style={{ position:'fixed', inset:0, background:'var(--paper)', zIndex:301, display:'flex', flexDirection:'column', overflow:'hidden', animation:'slideUp .24s cubic-bezier(.2,.8,.2,1)' }}>
        {children}
      </div>
    </>
  );
}

function ConfirmSheet({ message, onConfirm, onCancel, danger=true }) {
  return (
    <SheetBg onClose={onCancel}>
      <div style={{ padding:'16px 20px 28px' }}>
        <div style={{ width:32, height:3, background:'var(--rule-2)', borderRadius:2, margin:'4px auto 14px' }} />
        <p style={{ fontFamily:'var(--font-serif)', fontStyle:'italic', fontSize:14.5, color:'var(--ink-2)', lineHeight:1.5, marginBottom:20 }}>{message}</p>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onCancel} style={{ flex:1, padding:'11px', background:'transparent', border:'1px solid var(--rule-2)', fontFamily:'var(--font-sans)', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', color:'var(--ink-3)', minHeight:44 }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1, padding:'11px', background: danger?'#a04545':'var(--ink)', border:'none', color:'#fff', fontFamily:'var(--font-sans)', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', fontWeight:500, minHeight:44 }}>{danger?'Delete':'Confirm'}</button>
        </div>
      </div>
    </SheetBg>
  );
}

// ── Segmented control ─────────────────────────────────────────────────
function SegBtn({ options, value, onChange, small }) {
  return (
    <div style={{ display:'inline-flex', flexWrap:'wrap' }}>
      {options.map((o,i) => (
        <button key={o.key} onClick={() => onChange(o.key)} style={{
          padding: small ? '4px 10px' : '6px 12px',
          border:'1px solid var(--rule-2)', borderLeft:i>0?'none':'1px solid var(--rule-2)',
          background:value===o.key?'var(--ink)':'transparent',
          color:value===o.key?'var(--paper)':'var(--ink-3)',
          fontFamily:'var(--font-sans)', fontSize: small?10:11.5, cursor:'pointer', fontWeight:500,
          display:'flex', alignItems:'center', gap:4, minHeight:36,
        }}>
          {o.icon && <span style={{ fontSize:o.iconSize||'inherit' }}>{o.icon}</span>}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Form field ────────────────────────────────────────────────────────
function Field({ label, value, onChange, type='text', multiline, mono, required, placeholder }) {
  const base = { width:'100%', background:'var(--paper)', border:'1px solid var(--rule-2)', padding:'7px 10px', fontFamily:mono?'var(--font-mono)':'var(--font-sans)', fontSize:mono?12:13, color:'var(--ink)', outline:'none' };
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:'block', fontFamily:'var(--font-sans)', fontSize:8.5, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-4)', marginBottom:4 }}>
        {label}{required&&<span style={{ color:'var(--accent)', marginLeft:2 }}>*</span>}
      </label>
      {multiline
        ? <textarea value={value||''} onChange={e=>onChange(e.target.value)} rows={3} placeholder={placeholder||''} style={{ ...base, resize:'vertical', fontFamily:'var(--font-serif)', lineHeight:1.5 }} />
        : <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder||''} style={base} />
      }
    </div>
  );
}

// ── Top nav ───────────────────────────────────────────────────────────
function TopNav({ title }) {
  const { settings, setSettings, ui, setUi } = useApp();
  const isDark = settings.theme === 'dark';
  const editing = ui.editMode;
  return (
    <header className={editing ? 'editing-ribbon' : ''}
      style={{ borderBottom:'1px solid var(--ink)', padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--paper)', gap:8, flexShrink:0, position:'sticky', top:0, zIndex:50 }}>
      <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0, overflow:'hidden', flex:1 }}>
        <div style={{ width:18, height:18, background:'var(--ink)', flexShrink:0, position:'relative' }}>
          {editing && <span style={{ position:'absolute', top:-3, right:-3, width:8, height:8, borderRadius:'50%', background:'var(--accent)', border:'1.5px solid var(--paper)', animation:'pulseDot 1.6s ease-in-out infinite' }} />}
        </div>
        <span style={{ fontFamily:'var(--font-serif)', fontWeight:400, fontSize:15, letterSpacing:'-0.005em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:'var(--ink)' }}>Hollis &amp; Arne</span>
        {editing && <Mono size={8.5} color="var(--accent)" style={{ letterSpacing:'0.12em', textTransform:'uppercase', flexShrink:0, fontWeight:600 }}>· EDITING</Mono>}
      </div>
      <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
        <button onClick={() => setUi({ editMode: !editing })} title={editing ? 'Exit edit mode' : 'Edit'}
          style={{
            height:36, padding: editing ? '0 12px 0 9px' : '0', width: editing ? 'auto' : 36,
            border:`1px solid ${editing?'var(--ink)':'var(--rule-2)'}`, background: editing?'var(--ink)':'transparent',
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            color: editing?'var(--paper)':'var(--ink-3)',
            fontFamily:'var(--font-sans)', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:500
          }}>
          {editing ? (
            <>
              <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5 L7 12 L13 4"/></svg>
              Done
            </>
          ) : (
            <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5 L13.5 4.5 L5 13 L2.5 13.5 L3 11 Z"/><path d="M10 4 L12 6"/></svg>
          )}
        </button>
        <button onClick={() => setSettings({ theme: isDark?'warm':'dark' })} title="Toggle theme"
          style={{ width:36, height:36, border:'1px solid var(--rule-2)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-3)' }}>
          {isDark
            ? <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round"><circle cx={8} cy={8} r={2.7}/><path d="M8 1.4v1.5M8 13.1v1.5M1.4 8h1.5M13.1 8h1.5M3.34 3.34l1.06 1.06M11.6 11.6l1.06 1.06M3.34 12.66l1.06-1.06M11.6 4.4l1.06-1.06"/></svg>
            : <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round"><path d="M12.85 10.26A5.35 5.35 0 0 1 5.74 3.15 5.38 5.38 0 1 0 12.85 10.26Z"/></svg>
          }
        </button>
      </div>
    </header>
  );
}

// ── Bottom nav ────────────────────────────────────────────────────────
function BottomNav({ view, setView }) {
  const tabs = [
    { key:'library',  label:'Library',  d:'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { key:'projects', label:'Projects', d:'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { key:'cost',     label:'Cost',     d:'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { key:'schedule', label:'Schedule', d:'M5 5h14v14H5z M12 5v14 M7.5 9h2 M14.5 9h2 M7.5 13h2 M14.5 13h2 M7.5 17h2 M14.5 17h2' },
    { key:'settings', label:'Settings', d:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ];
  const activeIdx = Math.max(0, tabs.findIndex(t => t.key === view));
  return (
    <nav style={{ position:'fixed', bottom:0, left:0, right:0, height:56, background:'var(--paper)', borderTop:'1px solid var(--ink)', display:'flex', zIndex:200, paddingBottom:'env(safe-area-inset-bottom,0px)' }}>
      {/* Animated indicator slides between tabs */}
      <div aria-hidden="true" style={{
        position:'absolute', top:0, left:0,
        width:`${100/tabs.length}%`, height:2,
        transform:`translateX(${activeIdx*100}%)`,
        transition:'transform 0.32s cubic-bezier(.5,.05,.2,1)',
        pointerEvents:'none',
        display:'flex', alignItems:'flex-start', justifyContent:'center',
      }}>
        <div style={{ width:30, height:2, background:'var(--ink)' }} />
      </div>
      {tabs.map(t => (
        <button key={t.key} onClick={() => setView(t.key)} style={{
          flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          gap:3, background:'none', border:'none', cursor:'pointer',
          color:view===t.key?'var(--ink)':'var(--ink-4)',
          fontFamily:'var(--font-sans)', fontSize:8, letterSpacing:'0.07em', textTransform:'uppercase', fontWeight:500,
          padding:'7px 0 5px', position:'relative', WebkitTapHighlightColor:'transparent', minHeight:44,
          transition:'color 0.2s ease',
        }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ transition:'transform 0.2s ease', transform: view===t.key ? 'translateY(-1px)' : 'translateY(0)' }}>
            <path d={t.d} />
          </svg>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ── Toast container ───────────────────────────────────────────────────
function ToastContainer() {
  const { toasts, dismissToast } = useApp();
  if (!toasts || toasts.length === 0) return null;
  return (
    <div style={{ position:'fixed', left:'50%', bottom:72, transform:'translateX(-50%)', zIndex:500, display:'flex', flexDirection:'column-reverse', gap:6, alignItems:'center', pointerEvents:'none', width:'100%', maxWidth:'min(86vw, 360px)' }}>
      {toasts.map((t, i) => (
        <div key={t.id}
          onClick={() => dismissToast(t.id)}
          style={{
            pointerEvents:'auto', cursor:'pointer',
            background:'var(--ink)', color:'var(--paper)',
            padding:'10px 14px',
            display:'flex', alignItems:'center', gap:10,
            fontFamily:'var(--font-sans)', fontSize:11.5, lineHeight:1.3,
            boxShadow:'0 12px 32px rgba(20,20,20,0.32), 0 4px 10px rgba(20,20,20,0.18)',
            animation:'toastIn .26s cubic-bezier(.2,.8,.2,1)',
            minWidth:200, maxWidth:'100%',
            opacity: 1 - (i * 0.18),
            transform: `scale(${1 - i * 0.04})`,
            transformOrigin:'center bottom',
          }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background: t.kind==='danger' ? '#ff9a9a' : t.kind==='success' ? '#9ad8a8' : 'var(--accent)', flexShrink:0 }} />
          <div style={{ flex:1, minWidth:0 }}>{t.message}</div>
          <span style={{ fontSize:14, opacity:0.45, flexShrink:0, lineHeight:1 }}>×</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Serif, Mono, Eyebrow, SwatchBox, Checkbox, StageBar, SheetBg, FullDrawer, ConfirmSheet, SegBtn, Field, TopNav, BottomNav, ToastContainer });
