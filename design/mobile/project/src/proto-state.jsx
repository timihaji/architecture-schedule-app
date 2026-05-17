// proto-state.jsx — seed data, AppContext, useApp hook, applySettings

const SEED_MATERIALS = [
  { id:'m1', name:'Calacatta Oro', category:'stone', code:'ST-01', supplier:'Artedomus', tone:'#e8e0d2', unitCost:485, unit:'m²', leadTime:'8–10 wk', finish:'Honed', notes:'Bookmatched panels available. Min order 20m².', libraryIds:['lib-1','lib-2'] },
  { id:'m2', name:'Blackbutt Select', category:'timber', code:'TM-01', supplier:'Big River Group', tone:'#c9a87c', unitCost:180, unit:'m²', leadTime:'4–6 wk', finish:'Pre-oiled', notes:'FSC certified. 19mm T&G board.', libraryIds:['lib-1'] },
  { id:'m3', name:'White on White', category:'paint', code:'PT-01', supplier:'Dulux', tone:'#f0ede6', unitCost:68, unit:'L', leadTime:'1–2 wk', finish:'Low sheen', notes:'Interior low sheen. 2 coats minimum.', libraryIds:['lib-1','lib-2'] },
  { id:'m4', name:'Terrazzo Grigio', category:'stone', code:'ST-02', supplier:'Signorino', tone:'#b8b4a8', unitCost:320, unit:'m²', leadTime:'12 wk', finish:'Polished', notes:'Custom chip size available on request.', libraryIds:['lib-1'] },
  { id:'m5', name:'Dark Anodised Aluminium', category:'metal', code:'MT-01', supplier:'Capral', tone:'#3a3a3a', unitCost:142, unit:'lm', leadTime:'6–8 wk', finish:'Anodised', notes:'6mm wall thickness standard. Class 2 finish.', libraryIds:['lib-1'] },
  { id:'m6', name:'Honed Basalt', category:'stone', code:'ST-03', supplier:'Eco Outdoor', tone:'#6e6b65', unitCost:290, unit:'m²', leadTime:'10–12 wk', finish:'Honed', notes:'Non-slip treatment available. Pool grade.', libraryIds:['lib-1','lib-2'] },
  { id:'m7', name:'Aged Oak Veneer', category:'timber', code:'TM-02', supplier:'Laminex', tone:'#b89060', unitCost:95, unit:'m²', leadTime:'3–4 wk', finish:'UV lacquer', notes:'8mm substrate bonded. Crown cut.', libraryIds:['lib-2'] },
  { id:'m8', name:'Pearl Ceramic 600×600', category:'ceramic', code:'CR-01', supplier:'Beaumont Tiles', tone:'#ddd9d0', unitCost:110, unit:'m²', leadTime:'2–3 wk', finish:'Matte', notes:'Rectified. Available in matte and gloss.', libraryIds:['lib-1'] },
  { id:'m9', name:'Fluted Teak', category:'timber', code:'TM-03', supplier:'Radford Veneers', tone:'#a8784a', unitCost:240, unit:'m²', leadTime:'8 wk', finish:'Oiled', notes:'3D routed panels, 25mm fins at 50mm centres.', libraryIds:['lib-2'] },
  { id:'m10', name:'Brushed Brass', category:'metal', code:'MT-02', supplier:'Levolux', tone:'#c8a85a', unitCost:380, unit:'m²', leadTime:'10–14 wk', finish:'PVD brushed', notes:'Type 316 SS substrate. PVD coated. Scratch resistant.', libraryIds:['lib-1'] },
];

const SEED_PROJECTS = [
  { id:'p1', code:'HAA-24-01', name:'Northcote House', client:'Mr & Mrs Petrov', stage:'Documentation', budget:'$980,000', address:'Northcote VIC', description:'Full residential renovation with extended rear wing and pool pavilion.' },
  { id:'p2', code:'HAA-24-02', name:'South Yarra Apartment', client:'Fletcher Group', stage:'Construction', budget:'$2,400,000', address:'South Yarra VIC', description:'Boutique apartment fitout, 8 levels, 32 dwellings.' },
  { id:'p3', code:'HAA-23-05', name:'Fitzroy Office Fitout', client:'Comma Studio', stage:'Handover', budget:'$540,000', address:'Fitzroy VIC', description:'Creative workplace, 420m² NLA. Exposed services.' },
];

const SEED_LIBRARIES = [
  { id:'lib-1', name:'Studio Master', system:true, description:'Firm-wide archive — all products' },
  { id:'lib-2', name:'Residential Palette', system:false, description:'Curated residential finishes' },
];

const SEED_SCHEDULES = {
  p1: { rows:[
    { id:'r1', code:'FS-01', element:'Living room floor', materialId:'m2', qty:48 },
    { id:'r2', code:'FS-02', element:'Kitchen splashback', materialId:'m1', qty:6.4 },
    { id:'r3', code:'FS-03', element:'Master bath floor', materialId:'m6', qty:12 },
    { id:'r4', code:'WL-01', element:'Feature wall paint', materialId:'m3', qty:3 },
    { id:'r5', code:'MT-01', element:'Window frames', materialId:'m5', qty:22 },
    { id:'r6', code:'FS-04', element:'Entry terrazzo', materialId:'m4', qty:8 },
  ]},
  p2: { rows:[
    { id:'r7', code:'FS-01', element:'Lobby floor', materialId:'m4', qty:24 },
    { id:'r8', code:'FS-02', element:'Kitchen benchtop feature', materialId:'m1', qty:8.5 },
    { id:'r9', code:'WL-01', element:'Feature wall panels', materialId:'m9', qty:18 },
  ]},
  p3: { rows:[
    { id:'r10', code:'MT-01', element:'Reception desk cladding', materialId:'m10', qty:6 },
    { id:'r11', code:'FS-01', element:'Floor tiles', materialId:'m8', qty:420 },
  ]},
};

// ── Context ──────────────────────────────────────────────────────────
const AppContext = React.createContext(null);

function useApp() { return React.useContext(AppContext); }

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}

function uid(prefix) { return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6); }

function AppStateProvider({ children }) {
  const [materials, setMaterials] = React.useState(() => load('pm-materials', SEED_MATERIALS));
  const [projects,  setProjects]  = React.useState(() => load('pm-projects',  SEED_PROJECTS));
  const [schedules, setSchedules] = React.useState(() => load('pm-schedules', SEED_SCHEDULES));
  const [libraries, setLibrariesRaw] = React.useState(() => load('pm-libraries', SEED_LIBRARIES));
  const [settings,  setSettingsRaw] = React.useState(() => load('pm-settings', { theme:'warm', density:'regular', accent:'umber', galleryWidth:'editorial' }));
  const [ui, setUiRaw] = React.useState({ view:'library', libraryMode:'gallery', activeLibraryId:'all', activeProjectId:null, settingsSection:'appearance', editMode:false });
  const [toasts, setToasts] = React.useState([]);
  const toastTimers = React.useRef({});

  function toast(message, opts = {}) {
    const id = uid('t');
    const item = { id, message, kind: opts.kind || 'info' };
    setToasts(ts => [...ts.slice(-2), item]); // keep at most 3
    const ms = opts.duration || 2200;
    toastTimers.current[id] = setTimeout(() => {
      setToasts(ts => ts.filter(t => t.id !== id));
      delete toastTimers.current[id];
    }, ms);
    return id;
  }
  function dismissToast(id) {
    setToasts(ts => ts.filter(t => t.id !== id));
    if (toastTimers.current[id]) { clearTimeout(toastTimers.current[id]); delete toastTimers.current[id]; }
  }
  React.useEffect(() => () => { Object.values(toastTimers.current).forEach(clearTimeout); }, []);

  React.useEffect(() => { try { localStorage.setItem('pm-materials',  JSON.stringify(materials));  } catch {} }, [materials]);
  React.useEffect(() => { try { localStorage.setItem('pm-projects',   JSON.stringify(projects));   } catch {} }, [projects]);
  React.useEffect(() => { try { localStorage.setItem('pm-schedules',  JSON.stringify(schedules));  } catch {} }, [schedules]);
  React.useEffect(() => { try { localStorage.setItem('pm-libraries',  JSON.stringify(libraries)); } catch {} }, [libraries]);
  React.useEffect(() => {
    try { localStorage.setItem('pm-settings', JSON.stringify(settings)); } catch {}
    applySettings(settings);
  }, [settings]);

  function setUi(u)        { setUiRaw(p => ({ ...p, ...u })); }
  function setSettings(s)  { setSettingsRaw(p => ({ ...p, ...s })); }

  // Materials ────────────────────────────────────────────────────────
  function addMaterial(m)      { const id=uid('m'); const n={...m,id}; setMaterials(ms=>[...ms,n]); return n; }
  function saveMaterial(m)     { setMaterials(ms=>ms.map(x=>x.id===m.id?m:x)); }
  function deleteMaterial(id)  { setMaterials(ms=>ms.filter(m=>m.id!==id)); }
  function duplicateMaterial(id) {
    const src = materials.find(x=>x.id===id); if (!src) return null;
    const n = { ...src, id:uid('m'), name:(src.name||'Untitled')+' (copy)', code: src.code ? src.code+'·c' : '' };
    setMaterials(ms=>[...ms,n]); return n;
  }
  function bulkDeleteMaterials(ids) {
    const s = new Set(ids);
    setMaterials(ms=>ms.filter(m=>!s.has(m.id)));
  }
  function bulkDuplicateMaterials(ids) {
    const s = new Set(ids);
    const dupes = materials.filter(m=>s.has(m.id)).map(src => ({
      ...src, id:uid('m'), name:(src.name||'Untitled')+' (copy)', code: src.code ? src.code+'·c' : '',
    }));
    setMaterials(ms=>[...ms, ...dupes]);
    return dupes;
  }
  function bulkAssignLibrary(ids, libId, add=true) {
    const s = new Set(ids);
    setMaterials(ms=>ms.map(m=>{
      if (!s.has(m.id)) return m;
      const cur = new Set(m.libraryIds||[]);
      if (add) cur.add(libId); else cur.delete(libId);
      return { ...m, libraryIds:[...cur] };
    }));
  }

  // Projects ─────────────────────────────────────────────────────────
  function addProject(p)     { const id=uid('p'); const n={...p,id}; setProjects(ps=>[...ps,n]); setSchedules(sc=>({...sc,[id]:{rows:[]}})); return n; }
  function saveProject(p)    { setProjects(ps=>ps.map(x=>x.id===p.id?x={...p}:x)); }
  function deleteProject(id) { setProjects(ps=>ps.filter(p=>p.id!==id)); setSchedules(sc=>{ const n={...sc}; delete n[id]; return n; }); }
  function duplicateProject(id) {
    const src = projects.find(x=>x.id===id); if (!src) return null;
    const nid = uid('p');
    const n = { ...src, id:nid, name:(src.name||'Untitled')+' (copy)', code: src.code ? src.code+'·c' : '' };
    setProjects(ps=>[...ps,n]);
    const rows = ((schedules[id]||{}).rows||[]).map(r => ({ ...r, id:uid('r') }));
    setSchedules(sc=>({ ...sc, [nid]:{ rows } }));
    return n;
  }

  // Schedule rows ────────────────────────────────────────────────────
  function addScheduleRow(pid, row)     { const id=uid('r'); setSchedules(sc=>({...sc,[pid]:{rows:[...(sc[pid]?.rows||[]),{...row,id}]}})); }
  function updateScheduleRow(pid, row)  { setSchedules(sc=>({...sc,[pid]:{rows:(sc[pid]?.rows||[]).map(r=>r.id===row.id?row:r)}})); }
  function deleteScheduleRow(pid, rid)  { setSchedules(sc=>({...sc,[pid]:{rows:(sc[pid]?.rows||[]).filter(r=>r.id!==rid)}})); }
  function duplicateScheduleRow(pid, rid) {
    setSchedules(sc => {
      const cur = (sc[pid]?.rows)||[];
      const i = cur.findIndex(r=>r.id===rid); if (i<0) return sc;
      const dup = { ...cur[i], id:uid('r'), code: cur[i].code ? cur[i].code+'·c' : '' };
      const next = [...cur.slice(0,i+1), dup, ...cur.slice(i+1)];
      return { ...sc, [pid]:{ rows: next } };
    });
  }
  function bulkDeleteScheduleRows(pid, ids) {
    const s = new Set(ids);
    setSchedules(sc => ({ ...sc, [pid]:{ rows:(sc[pid]?.rows||[]).filter(r=>!s.has(r.id)) }}));
  }

  // Libraries ────────────────────────────────────────────────────────
  function addLibrary(l) {
    const id = uid('lib');
    const n = { id, system:false, name:(l.name||'New library').trim(), description:(l.description||'').trim() };
    setLibrariesRaw(ls => [...ls, n]); return n;
  }
  function saveLibrary(l) {
    setLibrariesRaw(ls => ls.map(x => x.id===l.id ? { ...x, name:l.name, description:l.description } : x));
  }
  function deleteLibrary(id) {
    const lib = libraries.find(l=>l.id===id);
    if (!lib || lib.system) return; // never delete system libraries
    setLibrariesRaw(ls => ls.filter(l => l.id!==id));
    // unlink from materials but keep the materials themselves
    setMaterials(ms => ms.map(m => ({ ...m, libraryIds:(m.libraryIds||[]).filter(x=>x!==id) })));
    if (ui.activeLibraryId === id) setUiRaw(p => ({ ...p, activeLibraryId:'all' }));
  }

  const value = {
    materials, addMaterial, saveMaterial, deleteMaterial, duplicateMaterial, bulkDeleteMaterials, bulkDuplicateMaterials, bulkAssignLibrary,
    projects, addProject, saveProject, deleteProject, duplicateProject,
    schedules, addScheduleRow, updateScheduleRow, deleteScheduleRow, duplicateScheduleRow, bulkDeleteScheduleRows,
    libraries, addLibrary, saveLibrary, deleteLibrary,
    settings, setSettings, ui, setUi,
    toasts, toast, dismissToast,
  };

  return React.createElement(AppContext.Provider, { value }, children);
}

function applySettings(s) {
  const r = document.documentElement;
  const themes = {
    dark:  { '--paper':'#1c1913','--paper-2':'#252118','--paper-3':'#302c22','--ink':'#f0ece4','--ink-2':'#d8d3c8','--ink-3':'#9a9285','--ink-4':'#7a7268','--rule':'#2e2b25','--rule-2':'#403c34','--tint':'rgba(255,255,255,0.03)','--tint-2':'rgba(255,255,255,0.06)' },
    cool:  { '--paper':'#eef0ee','--paper-2':'#e3e6e2','--paper-3':'#d6d9d5','--ink':'#141414','--ink-2':'#2c342c','--ink-3':'#5a6558','--ink-4':'#728070','--rule':'#ced1cb','--rule-2':'#bdc0b8','--tint':'rgba(20,40,20,0.03)','--tint-2':'rgba(20,40,20,0.06)' },
    warm:  { '--paper':'#f3efe7','--paper-2':'#eae5d9','--paper-3':'#ddd6c5','--ink':'#141414','--ink-2':'#3a3630','--ink-3':'#6b6559','--ink-4':'#716a5b','--rule':'#d8d3c6','--rule-2':'#c6bfae','--tint':'rgba(20,20,20,0.03)','--tint-2':'rgba(20,20,20,0.06)' },
  };
  const t = themes[s.theme] || themes.warm;
  Object.entries(t).forEach(([k,v]) => r.style.setProperty(k, v));
  const accents = { umber:'#a85133', forest:'#4a7a5a', slate:'#4a6a8a', ochre:'#c89040' };
  r.style.setProperty('--accent', accents[s.accent] || accents.umber);
  const dp = { compact:'7px', regular:'11px', open:'15px' };
  r.style.setProperty('--row-pad', dp[s.density] || '11px');
}

Object.assign(window, { AppStateProvider, AppContext, useApp, applySettings, SEED_MATERIALS, SEED_PROJECTS });
