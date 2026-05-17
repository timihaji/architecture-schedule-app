// proto-library.jsx — Library page, Material Editor, overlays

// ── Swatches for colour picker ────────────────────────────────────────
const SWATCH_PALETTE = ['#e8e0d2','#ddd9d0','#c8c0b0','#b8b4a8','#a0998c','#6e6b65','#3a3635','#1c1913','#c9a87c','#b89060','#a8784a','#8a5a30','#c8a85a','#a85133','#8a4028','#6e2e18','#3a3a3a','#6a8a7a','#4a7a5a','#4a6a8a','#f0ede6','#ddd6c5','#c6bfae','#9a9890'];

// ── Gallery card ──────────────────────────────────────────────────────
function GalleryCard({ m, onEdit, selectMode, selected, onToggleSelect }) {
  const [hov, setHov] = React.useState(false);
  const handleClick = () => selectMode ? onToggleSelect(m.id) : onEdit(m);
  return (
    <div onClick={handleClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ borderRight:'1px solid var(--rule)', borderBottom:'1px solid var(--rule)', cursor:'pointer', background: selectMode && selected ? 'var(--tint-2)' : (hov?'var(--paper-2)':'var(--paper)'), transition:'background 0.12s', position:'relative' }}>
      <div style={{ aspectRatio:'1.3/1', background:m.tone||'#ccc', position:'relative', overflow:'hidden' }}>
        <span style={{ position:'absolute', top:6, right:6, padding:'2px 5px', background:'rgba(243,239,231,0.9)', border:'1px solid var(--rule-2)', fontFamily:'var(--font-mono)', fontSize:8, color:'var(--ink-3)', letterSpacing:'0.06em' }}>{m.category}</span>
        {selectMode && (
          <div style={{ position:'absolute', top:6, left:6 }}>
            <Checkbox checked={selected} size={20} />
          </div>
        )}
      </div>
      <div style={{ padding:'10px 12px' }}>
        <Mono size={9} color="var(--ink-4)" style={{ letterSpacing:'0.06em', marginBottom:3, display:'block' }}>{m.code}</Mono>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:13.5, lineHeight:1.2, color:'var(--ink)', textDecoration:!selectMode&&hov?'underline':'none', textUnderlineOffset:3, textDecorationColor:'var(--ink-3)' }}>{m.name}</div>
        <div style={{ fontFamily:'var(--font-sans)', fontSize:10, color:'var(--ink-4)', marginTop:3 }}>{m.supplier}</div>
      </div>
    </div>
  );
}

// ── Register row ──────────────────────────────────────────────────────
function RegisterRow({ m, onEdit, selectMode, selected, onToggleSelect }) {
  const { deleteMaterial, duplicateMaterial, ui } = useApp();
  const editMode = ui.editMode;
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);
  if (selectMode) {
    return (
      <div onClick={() => onToggleSelect(m.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom:'1px solid var(--rule)', cursor:'pointer', background:selected?'var(--tint-2)':'var(--paper)' }}>
        <Checkbox checked={selected} />
        <SwatchBox tone={m.tone} size={24} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:14, color:'var(--ink)', lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>
          <div style={{ display:'flex', gap:8, marginTop:2 }}>
            <Mono size={9.5} color="var(--ink-4)">{m.code}</Mono>
            <span style={{ color:'var(--rule-2)' }}>·</span>
            <span style={{ fontFamily:'var(--font-sans)', fontSize:10.5, color:'var(--ink-4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.supplier}</span>
          </div>
        </div>
        <Mono size={10} color="var(--ink-3)" style={{ flexShrink:0 }}>{m.unitCost?`$${m.unitCost}`:''}</Mono>
      </div>
    );
  }
  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom:'1px solid var(--rule)', cursor:'pointer', background:'var(--paper)', position:'relative' }}>
        <SwatchBox tone={m.tone} size={24} style={{ cursor:'pointer' }} onClick={() => onEdit(m)} />
        <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={() => onEdit(m)}>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:14, color:'var(--ink)', lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>
          <div style={{ display:'flex', gap:8, marginTop:2 }}>
            <Mono size={9.5} color="var(--ink-4)">{m.code}</Mono>
            <span style={{ color:'var(--rule-2)' }}>·</span>
            <span style={{ fontFamily:'var(--font-sans)', fontSize:10.5, color:'var(--ink-4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.supplier}</span>
          </div>
        </div>
        <Mono size={10} color="var(--ink-3)" style={{ flexShrink:0, textAlign:'right' }}>{m.unitCost?`$${m.unitCost}`:''}</Mono>
        {editMode && <button onClick={e => { e.stopPropagation(); setMenuOpen(o=>!o); }}
          style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'var(--ink-4)', padding:'2px 6px', lineHeight:1, minHeight:44, minWidth:36, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>⋯</button>}
        {menuOpen && editMode && (
          <div style={{ position:'absolute', right:12, top:'100%', background:'var(--paper)', border:'1px solid var(--ink)', zIndex:60, minWidth:160, boxShadow:'0 8px 24px rgba(20,20,20,0.14)' }} onClick={e=>e.stopPropagation()}>
            <button onClick={() => { onEdit(m); setMenuOpen(false); }} style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', padding:'12px 14px', fontFamily:'var(--font-sans)', fontSize:13, cursor:'pointer', color:'var(--ink)', borderBottom:'1px solid var(--rule)' }}>Edit</button>
            <button onClick={() => { duplicateMaterial(m.id); setMenuOpen(false); }} style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', padding:'12px 14px', fontFamily:'var(--font-sans)', fontSize:13, cursor:'pointer', color:'var(--ink)', borderBottom:'1px solid var(--rule)' }}>Duplicate</button>
            <button onClick={() => { setConfirmDel(true); setMenuOpen(false); }} style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', padding:'12px 14px', fontFamily:'var(--font-sans)', fontSize:13, cursor:'pointer', color:'#a04545' }}>Delete</button>
          </div>
        )}
      </div>
      {confirmDel && <ConfirmSheet message={`Delete "${m.name}"? This cannot be undone.`} onConfirm={() => { deleteMaterial(m.id); setConfirmDel(false); }} onCancel={() => setConfirmDel(false)} />}
    </>
  );
}

// ── Material editor ───────────────────────────────────────────────────
function MaterialEditor({ material, onSave, onClose, isNew }) {
  const { deleteMaterial, duplicateMaterial } = useApp();
  const [draft, setDraft] = React.useState({ ...material });
  const [tab, setTab] = React.useState('details');
  const [confirmDel, setConfirmDel] = React.useState(false);
  function set(k, v) { setDraft(d => ({ ...d, [k]: v })); }

  return (
    <FullDrawer onClose={onClose}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--ink)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
          <div style={{ minWidth:0 }}>
            <Eyebrow style={{ marginBottom:4 }}>{isNew ? 'Add product' : `Edit · ${draft.code||'no code'}`}</Eyebrow>
            <div style={{ fontFamily:'var(--font-serif)', fontSize:20, lineHeight:1.15, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {draft.name || <span style={{ color:'var(--ink-4)', fontStyle:'italic' }}>Untitled</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:24, color:'var(--ink-4)', lineHeight:1, minHeight:44, minWidth:44, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>×</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--rule)', overflowX:'auto', flexWrap:'nowrap', flexShrink:0, WebkitOverflowScrolling:'touch' }}>
        {['Details','Visual','Specs','Commercial'].map(t => (
          <button key={t} onClick={() => setTab(t.toLowerCase())} style={{ background:'none', border:'none', borderBottom:tab===t.toLowerCase()?'2px solid var(--ink)':'2px solid transparent', marginBottom:-1, padding:'9px 14px', fontFamily:'var(--font-sans)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:tab===t.toLowerCase()?'var(--ink)':'var(--ink-4)', cursor:'pointer', whiteSpace:'nowrap', fontWeight:tab===t.toLowerCase()?500:400, minHeight:40 }}>
            {t}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px', WebkitOverflowScrolling:'touch' }}>
        {tab === 'details' && (
          <>
            <Field label="Name" value={draft.name} onChange={v=>set('name',v)} required />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 12px' }}>
              <Field label="Code" value={draft.code} onChange={v=>set('code',v)} mono />
              <Field label="Category" value={draft.category} onChange={v=>set('category',v)} />
            </div>
            <Field label="Supplier" value={draft.supplier} onChange={v=>set('supplier',v)} />
            <Field label="Notes / specification" value={draft.notes} onChange={v=>set('notes',v)} multiline />
          </>
        )}
        {tab === 'visual' && (
          <>
            <Eyebrow style={{ marginBottom:8 }}>Swatch colour</Eyebrow>
            <div style={{ width:'100%', height:72, background:draft.tone||'#ccc', marginBottom:14, border:'1px solid var(--rule)', outline:'1px solid rgba(20,20,20,0.08)' }} />
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
              {SWATCH_PALETTE.map(c => (
                <button key={c} onClick={() => set('tone',c)} style={{ width:36, height:36, background:c, cursor:'pointer', border:draft.tone===c?'2px solid var(--ink)':'1px solid var(--rule-2)', outline:draft.tone===c?'2px solid var(--paper)':'none', outlineOffset:draft.tone===c?-4:0, flexShrink:0 }} />
              ))}
            </div>
            <Field label="Custom hex" value={draft.tone} onChange={v=>set('tone',v)} mono placeholder="#c8c0b0" />
          </>
        )}
        {tab === 'specs' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 12px' }}>
              <Field label="Finish" value={draft.finish} onChange={v=>set('finish',v)} />
              <Field label="Thickness" value={draft.thickness} onChange={v=>set('thickness',v)} />
              <Field label="Dimensions" value={draft.dimensions} onChange={v=>set('dimensions',v)} />
              <Field label="Country of origin" value={draft.origin} onChange={v=>set('origin',v)} />
            </div>
            <Field label="Lead time" value={draft.leadTime} onChange={v=>set('leadTime',v)} />
          </>
        )}
        {tab === 'commercial' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 12px' }}>
              <Field label="Unit" value={draft.unit} onChange={v=>set('unit',v)} placeholder="m², lm, ea…" />
              <Field label="Unit cost ($)" value={draft.unitCost!=null?String(draft.unitCost):''} onChange={v=>set('unitCost',v===''?null:Number(v))} type="number" />
            </div>
            <Field label="Trade discount (%)" value={draft.tradeDiscount} onChange={v=>set('tradeDiscount',v)} />
            <Field label="Min. order qty" value={draft.minOrder} onChange={v=>set('minOrder',v)} />
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:'12px 16px', borderTop:'1px solid var(--rule)', display:'flex', gap:6, background:'var(--paper)', flexShrink:0, paddingBottom:'calc(12px + env(safe-area-inset-bottom,0px))' }}>
        {!isNew && <button onClick={() => { duplicateMaterial(draft.id); onClose(); }} title="Duplicate" style={{ padding:'9px 10px', background:'transparent', border:'1px solid var(--rule-2)', color:'var(--ink-3)', fontFamily:'var(--font-sans)', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', minHeight:44, display:'flex', alignItems:'center', gap:5 }}>
          <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}><rect x={3} y={3} width={9} height={9}/><rect x={6} y={6} width={9} height={9} fill="var(--paper)"/></svg>
          Dup
        </button>}
        {!isNew && <button onClick={() => setConfirmDel(true)} style={{ padding:'9px 10px', background:'transparent', border:'1px solid rgba(160,69,69,0.3)', color:'#a04545', fontFamily:'var(--font-sans)', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', minHeight:44 }}>Delete</button>}
        <button onClick={onClose} style={{ padding:'9px 12px', background:'transparent', border:'1px solid var(--rule-2)', color:'var(--ink-3)', fontFamily:'var(--font-sans)', fontSize:10.5, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', minHeight:44 }}>Cancel</button>
        <button onClick={() => { if(!draft.name?.trim()) return; onSave(draft); }} style={{ flex:1, background:'var(--ink)', color:'var(--paper)', border:'none', padding:'9px 14px', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:500, minHeight:44 }}>
          {isNew ? 'Add product' : 'Save'}
        </button>
      </div>
      {confirmDel && <ConfirmSheet message={`Delete "${draft.name}"? This cannot be undone.`} onConfirm={() => { deleteMaterial(draft.id); onClose(); }} onCancel={() => setConfirmDel(false)} />}
    </FullDrawer>
  );
}

// ── Kind picker ───────────────────────────────────────────────────────
function KindPicker({ onPick, onClose }) {
  const kinds = [
    { id:'stone',   label:'Stone',   icon:'◻', desc:'Marble, granite, limestone' },
    { id:'timber',  label:'Timber',  icon:'◫', desc:'Hardwood, veneer, engineered' },
    { id:'paint',   label:'Paint',   icon:'◉', desc:'Interior, exterior, specialty' },
    { id:'metal',   label:'Metal',   icon:'◈', desc:'Steel, aluminium, brass' },
    { id:'ceramic', label:'Ceramic', icon:'◪', desc:'Tiles, porcelain, mosaic' },
    { id:'glass',   label:'Glass',   icon:'◇', desc:'Glazing, mirrors' },
    { id:'fabric',  label:'Fabric',  icon:'◆', desc:'Upholstery, curtains, acoustic' },
    { id:'other',   label:'Other',   icon:'○', desc:'Miscellaneous products' },
  ];
  return (
    <SheetBg onClose={onClose}>
      <div style={{ padding:'12px 16px 28px' }}>
        <div style={{ width:32, height:3, background:'var(--rule-2)', borderRadius:2, margin:'4px auto 14px' }} />
        <Eyebrow style={{ marginBottom:14 }}>Select product type</Eyebrow>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {kinds.map(k => (
            <button key={k.id} onClick={() => onPick(k.id)} style={{ display:'flex', flexDirection:'column', gap:5, padding:'14px 12px', border:'1px solid var(--rule-2)', background:'transparent', textAlign:'left', cursor:'pointer', transition:'border-color 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--ink)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--rule-2)'}
            >
              <span style={{ fontFamily:'var(--font-mono)', fontSize:18, color:'var(--ink-3)', lineHeight:1 }}>{k.icon}</span>
              <span style={{ fontFamily:'var(--font-sans)', fontSize:13, color:'var(--ink)', fontWeight:500 }}>{k.label}</span>
              <span style={{ fontFamily:'var(--font-serif)', fontStyle:'italic', fontSize:11, color:'var(--ink-4)', lineHeight:1.3 }}>{k.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </SheetBg>
  );
}

// ── Library editor (create / rename) ──────────────────────────────────
function LibraryEditor({ library, onClose, isNew }) {
  const { addLibrary, saveLibrary } = useApp();
  const [d, setD] = React.useState({ ...library });
  const set = (k,v) => setD(p => ({ ...p, [k]:v }));
  function handleSave() {
    if (!d.name?.trim()) return;
    if (isNew) addLibrary(d); else saveLibrary(d);
    onClose();
  }
  return (
    <SheetBg onClose={onClose}>
      <div style={{ padding:'12px 16px 24px' }}>
        <div style={{ width:32, height:3, background:'var(--rule-2)', borderRadius:2, margin:'4px auto 14px' }} />
        <Eyebrow style={{ marginBottom:14 }}>{isNew ? 'New library' : 'Rename library'}</Eyebrow>
        <Field label="Name" value={d.name} onChange={v=>set('name',v)} required placeholder="e.g. Commercial palette" />
        <Field label="Description" value={d.description} onChange={v=>set('description',v)} placeholder="Optional. One-line description." />
        <div style={{ display:'flex', gap:8, marginTop:4 }}>
          <button onClick={onClose} style={{ padding:'11px 16px', background:'transparent', border:'1px solid var(--rule-2)', fontFamily:'var(--font-sans)', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', color:'var(--ink-3)', minHeight:44 }}>Cancel</button>
          <button onClick={handleSave} style={{ flex:1, background:'var(--ink)', color:'var(--paper)', border:'none', padding:'11px', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:500, minHeight:44 }}>{isNew?'Create library':'Save changes'}</button>
        </div>
      </div>
    </SheetBg>
  );
}

// ── Library switcher ──────────────────────────────────────────────────
function LibrarySwitcher({ onClose }) {
  const { libraries, materials, deleteLibrary, ui, setUi } = useApp();
  const activeLibId = ui.activeLibraryId;
  const [editing, setEditing] = React.useState(null);   // {library, isNew}
  const [confirmDel, setConfirmDel] = React.useState(null); // library
  const [menuFor, setMenuFor] = React.useState(null); // lib id
  const all = [{ id:'all', name:'All libraries', description:'Every material across all libraries', system:true, locked:true }, ...libraries];
  return (
    <SheetBg onClose={onClose}>
      <div style={{ padding:'12px 16px 24px' }} onClick={() => setMenuFor(null)}>
        <div style={{ width:32, height:3, background:'var(--rule-2)', borderRadius:2, margin:'4px auto 14px' }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <Eyebrow>Libraries</Eyebrow>
          <button onClick={e => { e.stopPropagation(); setEditing({ library:{ id:'', name:'', description:'' }, isNew:true }); }}
            style={{ background:'var(--ink)', color:'var(--paper)', border:'none', padding:'6px 11px', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:9.5, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:500, minHeight:32 }}>＋ New</button>
        </div>
        {all.map(l => {
          const count = l.id==='all' ? materials.length : materials.filter(m=>(m.libraryIds||[]).includes(l.id)).length;
          const active = activeLibId === l.id;
          const canEdit = !l.locked && !l.system;
          const canRename = !l.locked; // even system libs can be renamed
          return (
            <div key={l.id} style={{ display:'flex', alignItems:'center', gap:10, background:active?'var(--tint)':'transparent', borderBottom:'1px solid var(--rule)', padding:'10px 0', position:'relative' }}>
              <button onClick={() => { setUi({ activeLibraryId:l.id }); onClose(); }}
                style={{ display:'flex', alignItems:'center', gap:12, flex:1, minWidth:0, textAlign:'left', background:'none', border:'none', padding:'2px 0', cursor:'pointer', minHeight:44 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:active?'var(--ink)':'var(--rule-2)', flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'var(--font-serif)', fontSize:15, color:'var(--ink)', fontWeight:active?500:400, display:'flex', alignItems:'baseline', gap:7 }}>
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.name}</span>
                    {l.system && !l.locked && <Mono size={8} color="var(--ink-4)" style={{ letterSpacing:'0.1em', textTransform:'uppercase', flexShrink:0 }}>system</Mono>}
                  </div>
                  {l.description && <div style={{ fontFamily:'var(--font-sans)', fontSize:11, color:'var(--ink-4)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.description}</div>}
                </div>
                <Mono size={11} color="var(--ink-4)" style={{ flexShrink:0 }}>{count}</Mono>
              </button>
              {!l.locked && (
                <button onClick={e => { e.stopPropagation(); setMenuFor(menuFor===l.id?null:l.id); }}
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'var(--ink-4)', padding:'2px 6px', lineHeight:1, minHeight:36, minWidth:32, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>⋯</button>
              )}
              {menuFor===l.id && (
                <div style={{ position:'absolute', right:0, top:'100%', background:'var(--paper)', border:'1px solid var(--ink)', zIndex:60, minWidth:150, boxShadow:'0 8px 24px rgba(20,20,20,0.14)' }} onClick={e=>e.stopPropagation()}>
                  {canRename && <button onClick={() => { setEditing({ library:l, isNew:false }); setMenuFor(null); }} style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', padding:'12px 14px', fontFamily:'var(--font-sans)', fontSize:13, cursor:'pointer', color:'var(--ink)', borderBottom: canEdit ? '1px solid var(--rule)' : 'none' }}>Rename</button>}
                  {canEdit && <button onClick={() => { setConfirmDel(l); setMenuFor(null); }} style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', padding:'12px 14px', fontFamily:'var(--font-sans)', fontSize:13, cursor:'pointer', color:'#a04545' }}>Delete library</button>}
                </div>
              )}
            </div>
          );
        })}
        <p style={{ fontFamily:'var(--font-serif)', fontStyle:'italic', fontSize:11.5, color:'var(--ink-4)', marginTop:12, lineHeight:1.5 }}>Deleting a library does not remove its products — they remain in <em>All libraries</em>.</p>
      </div>
      {editing && <LibraryEditor library={editing.library} isNew={editing.isNew} onClose={() => setEditing(null)} />}
      {confirmDel && <ConfirmSheet message={`Delete library "${confirmDel.name}"? Products will keep existing in All libraries.`} onConfirm={() => { deleteLibrary(confirmDel.id); setConfirmDel(null); }} onCancel={() => setConfirmDel(null)} />}
    </SheetBg>
  );
}

// ── Library toolbar ───────────────────────────────────────────────────
function LibraryToolbar({ query, setQuery, filterCat, setFilterCat, sort, setSort, groupBy, setGroupBy, categories, count, total }) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const activeCount = (filterCat!=='All'?1:0) + (sort!=='name'?1:0) + (groupBy?1:0);

  return (
    <>
      <div style={{ padding:'8px 16px', borderBottom:'1px solid var(--rule)', display:'flex', gap:6, alignItems:'center', background:'var(--paper)', flexShrink:0 }}>
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:7, border:'1px solid var(--rule-2)', padding:'5px 10px', minWidth:0 }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" style={{ color:'var(--ink-4)', flexShrink:0 }}>
            <circle cx={10.5} cy={10.5} r={6} stroke="currentColor" strokeWidth={1.6}/>
            <line x1={15} y1={15} x2={20} y2={20} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"/>
          </svg>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, code, supplier…"
            style={{ flex:1, background:'transparent', border:'none', outline:'none', fontFamily:'var(--font-sans)', fontSize:12, color:'var(--ink)', minWidth:0 }} />
          {query && <button onClick={() => setQuery('')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-4)', fontSize:15, padding:0, lineHeight:1, minHeight:30 }}>×</button>}
        </div>
        <button onClick={() => setSheetOpen(true)} style={{ display:'flex', alignItems:'center', gap:6, background:'transparent', border:activeCount>0?'1px solid var(--ink)':'1px solid var(--rule-2)', padding:'5px 10px', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:11, color:activeCount>0?'var(--ink)':'var(--ink-3)', flexShrink:0, minHeight:36 }}>
          Filters
          {activeCount>0 && <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:15, height:15, background:'var(--ink)', color:'var(--paper)', fontFamily:'var(--font-mono)', fontSize:8, fontWeight:700, borderRadius:'50%' }}>{activeCount}</span>}
        </button>
        <Mono size={10} color="var(--ink-4)" style={{ flexShrink:0 }}>{count!==total?`${count}/${total}`:count}</Mono>
      </div>

      {sheetOpen && (
        <SheetBg onClose={() => setSheetOpen(false)}>
          <div style={{ padding:'8px 20px 28px', display:'flex', flexDirection:'column', gap:18 }}>
            <div style={{ width:32, height:3, background:'var(--rule-2)', borderRadius:2, margin:'4px auto 0' }} />
            <div>
              <Eyebrow style={{ marginBottom:8 }}>Filter by category</Eyebrow>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {['All',...categories].map(c => (
                  <button key={c} onClick={() => setFilterCat(c)} style={{ padding:'6px 12px', border:'1px solid var(--rule-2)', background:filterCat===c?'var(--ink)':'transparent', color:filterCat===c?'var(--paper)':'var(--ink-3)', fontFamily:'var(--font-sans)', fontSize:11, cursor:'pointer', textTransform:'capitalize', minHeight:36 }}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <Eyebrow style={{ marginBottom:8 }}>Sort by</Eyebrow>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {[['name','Name'],['code','Code'],['cost','Cost ↑'],['lead','Lead time']].map(([k,l]) => (
                  <button key={k} onClick={() => setSort(k)} style={{ padding:'6px 12px', border:'1px solid var(--rule-2)', background:sort===k?'var(--ink)':'transparent', color:sort===k?'var(--paper)':'var(--ink-3)', fontFamily:'var(--font-sans)', fontSize:11, cursor:'pointer', minHeight:36 }}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <Eyebrow style={{ marginBottom:8 }}>Group by</Eyebrow>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {[['','None'],['category','Category'],['supplier','Supplier']].map(([k,l]) => (
                  <button key={k} onClick={() => setGroupBy(k)} style={{ padding:'6px 12px', border:'1px solid var(--rule-2)', background:groupBy===k?'var(--ink)':'transparent', color:groupBy===k?'var(--paper)':'var(--ink-3)', fontFamily:'var(--font-sans)', fontSize:11, cursor:'pointer', minHeight:36 }}>{l}</button>
                ))}
              </div>
            </div>
            <button onClick={() => setSheetOpen(false)} style={{ background:'var(--ink)', color:'var(--paper)', border:'none', padding:'12px', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:500, minHeight:44 }}>Done</button>
          </div>
        </SheetBg>
      )}
    </>
  );
}

// ── Bulk action bar (selection mode) ──────────────────────────────────
function BulkActionBar({ count, onDuplicate, onMove, onDelete, onCancel, onSelectAll, allSelected }) {
  return (
    <div style={{ position:'absolute', bottom:56, left:0, right:0, background:'var(--ink)', color:'var(--paper)', display:'flex', alignItems:'stretch', zIndex:150, boxShadow:'0 -8px 24px rgba(20,20,20,0.18)', paddingBottom:'env(safe-area-inset-bottom,0px)' }}>
      <button onClick={onSelectAll} style={{ background:'transparent', color:'var(--paper)', border:'none', borderRight:'1px solid rgba(255,255,255,0.12)', padding:'10px 12px', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', minHeight:48, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2 }}>
        <Mono size={11} color="var(--paper)" style={{ fontWeight:600 }}>{count}</Mono>
        <span style={{ fontSize:8, opacity:0.7, letterSpacing:'0.08em' }}>{allSelected?'NONE':'ALL'}</span>
      </button>
      <button onClick={onDuplicate} disabled={!count} style={{ flex:1, background:'transparent', color:count?'var(--paper)':'rgba(243,239,231,0.4)', border:'none', borderRight:'1px solid rgba(255,255,255,0.12)', padding:'10px 4px', cursor:count?'pointer':'not-allowed', fontFamily:'var(--font-sans)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', minHeight:48 }}>Duplicate</button>
      <button onClick={onMove} disabled={!count} style={{ flex:1, background:'transparent', color:count?'var(--paper)':'rgba(243,239,231,0.4)', border:'none', borderRight:'1px solid rgba(255,255,255,0.12)', padding:'10px 4px', cursor:count?'pointer':'not-allowed', fontFamily:'var(--font-sans)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', minHeight:48 }}>Add to…</button>
      <button onClick={onDelete} disabled={!count} style={{ flex:1, background:'transparent', color:count?'#ff9a9a':'rgba(255,154,154,0.4)', border:'none', borderRight:'1px solid rgba(255,255,255,0.12)', padding:'10px 4px', cursor:count?'pointer':'not-allowed', fontFamily:'var(--font-sans)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', minHeight:48 }}>Delete</button>
      <button onClick={onCancel} style={{ flex:1, background:'transparent', color:'var(--paper)', border:'none', padding:'10px 4px', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', minHeight:48 }}>Cancel</button>
    </div>
  );
}

// ── Library picker (for "add to library" bulk action) ─────────────────
function LibraryPickerSheet({ onPick, onClose, excludeAll }) {
  const { libraries } = useApp();
  return (
    <SheetBg onClose={onClose}>
      <div style={{ padding:'12px 16px 24px' }}>
        <div style={{ width:32, height:3, background:'var(--rule-2)', borderRadius:2, margin:'4px auto 14px' }} />
        <Eyebrow style={{ marginBottom:10 }}>Add selected to library</Eyebrow>
        {libraries.map(l => (
          <button key={l.id} onClick={() => onPick(l.id)} style={{ display:'flex', alignItems:'center', gap:12, width:'100%', textAlign:'left', background:'transparent', border:'none', borderBottom:'1px solid var(--rule)', padding:'12px 0', cursor:'pointer', minHeight:48 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--rule-2)', flexShrink:0 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'var(--font-serif)', fontSize:14.5, color:'var(--ink)' }}>{l.name}</div>
              {l.description && <div style={{ fontFamily:'var(--font-sans)', fontSize:11, color:'var(--ink-4)', marginTop:2 }}>{l.description}</div>}
            </div>
            <span style={{ color:'var(--ink-4)', fontSize:14 }}>›</span>
          </button>
        ))}
      </div>
    </SheetBg>
  );
}

// ── Library page ──────────────────────────────────────────────────────
function LibraryPage() {
  const { materials, addMaterial, saveMaterial, libraries, bulkDeleteMaterials, bulkDuplicateMaterials, bulkAssignLibrary, ui, setUi, toast } = useApp();
  const editMode = ui.editMode;
  const [query, setQuery]         = React.useState('');
  const [filterCat, setFilterCat] = React.useState('All');
  const [sort, setSort]           = React.useState('name');
  const [groupBy, setGroupBy]     = React.useState('');
  const [editing, setEditing]     = React.useState(null);
  const [isNew, setIsNew]         = React.useState(false);
  const [kindOpen, setKindOpen]   = React.useState(false);
  const [swOpen, setSwOpen]       = React.useState(false);
  const [selectMode, setSelectMode] = React.useState(false);
  const [sel, setSel] = React.useState(new Set());
  const [confirmBulkDel, setConfirmBulkDel] = React.useState(false);
  const [libPickerOpen, setLibPickerOpen] = React.useState(false);
  const mode      = ui.libraryMode || 'gallery';
  const setMode   = v => setUi({ libraryMode:v });
  const activeLibId = ui.activeLibraryId || 'all';

  const scoped = React.useMemo(() =>
    activeLibId==='all' ? materials : materials.filter(m=>(m.libraryIds||[]).includes(activeLibId))
  , [materials, activeLibId]);

  const categories = React.useMemo(() => [...new Set(scoped.map(m=>m.category).filter(Boolean))].sort(), [scoped]);

  const filtered = React.useMemo(() => {
    let list = scoped;
    if (filterCat!=='All') list = list.filter(m=>m.category===filterCat);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(m => [m.name,m.code,m.supplier,m.category].some(v=>v&&String(v).toLowerCase().includes(q)));
    return [...list].sort((a,b) => {
      if (sort==='code') return (a.code||'').localeCompare(b.code||'');
      if (sort==='cost') return (a.unitCost||0)-(b.unitCost||0);
      if (sort==='lead') return (a.leadTime||'').localeCompare(b.leadTime||'');
      return (a.name||'').localeCompare(b.name||'');
    });
  }, [scoped, filterCat, query, sort]);

  const grouped = React.useMemo(() => {
    if (!groupBy) return [['',filtered]];
    const g = {};
    filtered.forEach(m => {
      const k = (groupBy==='supplier' ? m.supplier : m.category) || 'Other';
      if (!g[k]) g[k] = [];
      g[k].push(m);
    });
    return Object.entries(g).sort((a,b)=>a[0].localeCompare(b[0]));
  }, [filtered, groupBy]);

  const activeLib = libraries.find(l=>l.id===activeLibId);

  function handlePick(categoryId) {
    setIsNew(true);
    setEditing({ id:'', name:'', code:'', category:categoryId, supplier:'', tone:'#c8c0b0', unit:'m²', unitCost:null, leadTime:'', notes:'', libraryIds:[activeLibId!=='all'?activeLibId:'lib-1'] });
    setKindOpen(false);
  }
  function handleSave(m) {
    if (isNew) { addMaterial(m); toast('Product added', { kind:'success' }); }
    else { saveMaterial(m); toast('Product saved'); }
    setEditing(null); setIsNew(false);
  }
  function toggleSel(id) {
    setSel(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  }
  function exitSelectMode() {
    setSelectMode(false); setSel(new Set());
  }
  function selectAllToggle() {
    if (sel.size === filtered.length && filtered.length>0) setSel(new Set());
    else setSel(new Set(filtered.map(m=>m.id)));
  }
  function handleBulkDelete() {
    const n = sel.size;
    bulkDeleteMaterials([...sel]);
    setConfirmBulkDel(false);
    exitSelectMode();
    toast(`${n} product${n===1?'':'s'} deleted`, { kind:'danger' });
  }
  function handleBulkDuplicate() {
    const n = sel.size;
    bulkDuplicateMaterials([...sel]);
    exitSelectMode();
    toast(`${n} product${n===1?'':'s'} duplicated`);
  }
  function handleBulkMove(libId) {
    const n = sel.size;
    bulkAssignLibrary([...sel], libId, true);
    setLibPickerOpen(false);
    exitSelectMode();
    const lib = libraries.find(l=>l.id===libId);
    toast(`Added ${n} to ${lib?.name||'library'}`, { kind:'success' });
  }

  React.useEffect(() => { if (!editMode) { exitSelectMode(); } }, [editMode]);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'var(--paper)', overflow:'hidden', position:'relative' }}>
      <TopNav />

      {/* Masthead */}
      <div style={{ padding:'10px 16px 0', borderBottom:'1px solid var(--rule)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:4 }}>
          <Eyebrow>Library</Eyebrow>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            {!selectMode && <SegBtn small options={[{key:'gallery',label:'',icon:'▦',iconSize:14},{key:'register',label:'',icon:'☰',iconSize:14}]} value={mode} onChange={setMode} />}
            {selectMode ? (
              <button onClick={exitSelectMode} style={{ background:'transparent', color:'var(--ink)', border:'1px solid var(--ink)', padding:'7px 12px', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:500, whiteSpace:'nowrap', minHeight:34 }}>Done</button>
            ) : editMode ? (
              <>
                <button onClick={() => setSelectMode(true)} title="Select" style={{ background:'transparent', color:'var(--ink-3)', border:'1px solid var(--rule-2)', padding:'7px 10px', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', whiteSpace:'nowrap', minHeight:34 }}>Sel</button>
                <button onClick={() => setKindOpen(true)} style={{ background:'var(--ink)', color:'var(--paper)', border:'none', padding:'7px 12px', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:500, whiteSpace:'nowrap', minHeight:34 }}>＋ Add</button>
              </>
            ) : null}
          </div>
        </div>
        <div style={{ paddingBottom:12, borderBottom:'1px solid var(--rule)' }}>
          <button onClick={() => setSwOpen(true)} style={{ background:'none', border:'none', padding:0, cursor:'pointer', display:'flex', alignItems:'baseline', gap:8, textAlign:'left', maxWidth:'100%' }}>
            <span style={{ fontFamily:'var(--font-serif)', fontWeight:300, fontSize:'clamp(22px, 7vw, 34px)', letterSpacing:'-0.015em', lineHeight:1.1, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 }}>
              {activeLibId==='all' ? 'All libraries' : (activeLib?.name||'Library')}
            </span>
            <span style={{ fontFamily:'var(--font-sans)', fontSize:14, color:'var(--ink-4)', flexShrink:0, position:'relative', top:-2 }}>▾</span>
          </button>
          <div style={{ display:'flex', gap:8, marginTop:6 }}>
            <Mono size={9} color="var(--ink-4)" style={{ letterSpacing:'0.1em', textTransform:'uppercase' }}>{String(scoped.length).padStart(2,'0')} PRODUCTS</Mono>
            <span style={{ color:'var(--rule-2)' }}>·</span>
            <Mono size={9} color="var(--ink-4)" style={{ letterSpacing:'0.1em', textTransform:'uppercase' }}>{String(new Set(scoped.map(m=>m.supplier).filter(Boolean)).size).padStart(2,'0')} SUPPLIERS</Mono>
          </div>
        </div>
        <div style={{ display:'flex', gap:0, overflowX:'auto', flexWrap:'nowrap', WebkitOverflowScrolling:'touch' }}>
          <div style={{ background:'none', borderBottom:'2px solid var(--ink)', padding:'9px 12px', fontFamily:'var(--font-sans)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink)', fontWeight:600, whiteSpace:'nowrap', display:'flex', gap:6, alignItems:'center' }}>
            Products <Mono size={9.5}>{scoped.length}</Mono>
          </div>
        </div>
      </div>

      {!selectMode && <LibraryToolbar query={query} setQuery={setQuery} filterCat={filterCat} setFilterCat={setFilterCat} sort={sort} setSort={setSort} groupBy={groupBy} setGroupBy={setGroupBy} categories={categories} count={filtered.length} total={scoped.length} />}

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', paddingBottom: selectMode ? 110 : 60 }}>
        {filtered.length===0 && (
          <div style={{ padding:'48px 16px', textAlign:'center' }}>
            <Mono size={11} color="var(--ink-4)" style={{ display:'block', marginBottom:14, letterSpacing:'0.1em', textTransform:'uppercase' }}>{query?'No materials match':'Library is empty'}</Mono>
            {editMode
              ? <button onClick={() => setKindOpen(true)} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:13, color:'var(--accent)', textDecoration:'underline' }}>＋ Add the first material</button>
              : !query && <Mono size={10} color="var(--ink-4)" style={{ letterSpacing:'0.1em', textTransform:'uppercase' }}>Tap <strong style={{ color:'var(--ink-3)' }}>Edit</strong> in the top bar to add.</Mono>
            }
          </div>
        )}
        {grouped.map(([gk, items]) => (
          <React.Fragment key={gk}>
            {groupBy && gk && (
              <div style={{ display:'flex', alignItems:'baseline', gap:12, padding:'14px 16px 6px' }}>
                <span style={{ fontFamily:'var(--font-serif)', fontStyle:'italic', fontSize:18, color:'var(--ink)' }}>{gk}</span>
                <div style={{ flex:1, height:1, background:'var(--rule)', alignSelf:'center' }} />
                <Mono size={10} color="var(--ink-4)">{items.length}</Mono>
              </div>
            )}
            {mode==='gallery' ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', borderTop:groupBy?'none':'1px solid var(--rule)', borderLeft:'1px solid var(--rule)' }}>
                {items.map(m => <GalleryCard key={m.id} m={m} onEdit={setEditing} selectMode={selectMode} selected={sel.has(m.id)} onToggleSelect={toggleSel} />)}
              </div>
            ) : (
              <div>{items.map(m => <RegisterRow key={m.id} m={m} onEdit={setEditing} selectMode={selectMode} selected={sel.has(m.id)} onToggleSelect={toggleSel} />)}</div>
            )}
          </React.Fragment>
        ))}
      </div>

      {selectMode && (
        <BulkActionBar
          count={sel.size}
          allSelected={sel.size===filtered.length && filtered.length>0}
          onSelectAll={selectAllToggle}
          onDuplicate={handleBulkDuplicate}
          onMove={() => setLibPickerOpen(true)}
          onDelete={() => setConfirmBulkDel(true)}
          onCancel={exitSelectMode}
        />
      )}

      {swOpen        && <LibrarySwitcher onClose={() => setSwOpen(false)} />}
      {kindOpen      && <KindPicker onPick={handlePick} onClose={() => setKindOpen(false)} />}
      {editing       && <MaterialEditor material={editing} onSave={handleSave} onClose={() => { setEditing(null); setIsNew(false); }} isNew={isNew} />}
      {libPickerOpen && <LibraryPickerSheet onPick={handleBulkMove} onClose={() => setLibPickerOpen(false)} />}
      {confirmBulkDel && <ConfirmSheet message={`Delete ${sel.size} material${sel.size===1?'':'s'}? This cannot be undone.`} onConfirm={handleBulkDelete} onCancel={() => setConfirmBulkDel(false)} />}
    </div>
  );
}

Object.assign(window, { LibraryPage });
