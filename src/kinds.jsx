// ─────────── Kinds taxonomy ───────────
// Every Library item has a `kind`. Kind drives:
//   • which editor blocks render (handled in material/item editor)
//   • which Library kind-tab it shows under
//   • default trade assignment
//   • row renderer dispatch (material = bespoke, others = generic)
//
// "material" is the legacy kind — everything seeded before P1 becomes this.
// Other kinds land over P2/P3 as generic-rendered items with a kind label.

const KINDS = [
  // Finishes (legacy "material")
  { id: 'material',         label: 'Material',          group: 'Finishes',        defaultTrade: 'Paints & Finishes' },

  // Fittings
  { id: 'fitting',          label: 'Fitting',           group: 'Fittings',        defaultTrade: 'Plumbing' },

  // Appliances
  { id: 'appliance',        label: 'Appliance',         group: 'Appliances',      defaultTrade: 'Electrical' },

  // Architectural lighting (hard-wired)
  { id: 'light',            label: 'Light fitting',     group: 'Lighting',        defaultTrade: 'Electrical' },

  // Joinery & hardware (incl. handles/hinges/runners)
  { id: 'joinery',          label: 'Joinery / hardware',group: 'Joinery',         defaultTrade: 'Joinery' },

  // Doors & windows (generic for now)
  { id: 'door',             label: 'Door',              group: 'Doors & Windows', defaultTrade: 'Doors & Windows' },
  { id: 'window',           label: 'Window',            group: 'Doors & Windows', defaultTrade: 'Doors & Windows' },

  // FFE, split
  { id: 'ffe-seating',      label: 'Seating',           group: 'FFE',             defaultTrade: 'FFE' },
  { id: 'ffe-tables',       label: 'Tables',            group: 'FFE',             defaultTrade: 'FFE' },
  { id: 'ffe-storage',      label: 'Storage',           group: 'FFE',             defaultTrade: 'FFE' },
  { id: 'ffe-beds',         label: 'Beds',              group: 'FFE',             defaultTrade: 'FFE' },
  { id: 'ffe-soft',         label: 'Soft furnishings',  group: 'FFE',             defaultTrade: 'FFE' },
  { id: 'ffe-lighting',     label: 'Decorative lighting', group: 'FFE',           defaultTrade: 'FFE' },
  { id: 'ffe-art',          label: 'Art & accessories', group: 'FFE',             defaultTrade: 'FFE' },

  // Catch-all
  { id: 'other',            label: 'Other',             group: 'Other',           defaultTrade: 'Other' },
];

// Groups (tabs) in display order. 'All' is synthesised in the UI.
const KIND_GROUPS = [
  'Finishes',
  'Fittings',
  'Appliances',
  'Lighting',
  'Joinery',
  'Doors & Windows',
  'FFE',
  'Other',
];

// AU trade vocabulary — preloaded, autocomplete-suggested, but freeform allowed.
const TRADES = [
  'Paints & Finishes',
  'Tiling',
  'Flooring',
  'Stonework',
  'Joinery',
  'Carpentry',
  'Electrical',
  'Plumbing',
  'Mechanical',
  'Glazing',
  'Doors & Windows',
  'Hardware',
  'FFE',
  'Landscape',
  'Other',
];

// Legacy `category` → kind. Everything seeded as a finish/material category
// rolls forward as kind 'material'. The category stays on the record and is
// also used to seed the trade.
const LEGACY_CATEGORY_TO_TRADE = {
  'Timber':    'Carpentry',
  'Stone':     'Stonework',
  'Composite': 'Joinery',
  'Metal':     'Joinery',
  'Paint':     'Paints & Finishes',
  'Textile':   'FFE',
};

// Given an item (possibly legacy), return the kind id. If one is already
// set, keep it. Otherwise assume 'material' — every seeded record is one.
function inferKind(item) {
  if (!item) return 'material';
  if (item.kind) return item.kind;
  return 'material';
}

// Given an item, return a sensible trade. If one is already set, keep it.
// Otherwise try legacy category → trade, else fall back to the kind's default.
function inferTrade(item) {
  if (!item) return 'Other';
  if (item.trade) return item.trade;
  if (item.category && LEGACY_CATEGORY_TO_TRADE[item.category]) {
    return LEGACY_CATEGORY_TO_TRADE[item.category];
  }
  const k = KINDS.find(x => x.id === inferKind(item));
  return k?.defaultTrade || 'Other';
}

// Fill in kind / trade / tags if missing. Non-destructive: never overrides
// existing values. Safe to call repeatedly on already-migrated records.
function migrateItem(item) {
  if (!item) return item;
  const out = { ...item };
  if (!out.kind)  out.kind  = inferKind(item);
  if (!out.trade) out.trade = inferTrade(item);
  if (!Array.isArray(out.tags)) out.tags = [];
  return out;
}

// Lookup helper: find kind record by id.
function kindById(id) {
  return KINDS.find(k => k.id === id) || KINDS[0];
}

// Which kinds live under a given group label.
function kindsInGroup(groupLabel) {
  return KINDS.filter(k => k.group === groupLabel);
}

// Starter vocab of tags — shown as suggestions in tag autocomplete.
const STARTER_TAGS = [
  'OS',            // Owner supplied
  'Long lead',
  'Client decision',
  'Heritage',
  'Feature',
  'Local supplier',
  'Sustainable',
  'Spec\u2019d before',
];

// Subtype vocabulary per kind. A subtype is a free-form string but these are
// the preloaded options that get specific glyphs + show up as picker tiles.
const SUBTYPES = {
  appliance: [
    { id: 'oven',       label: 'Oven',           glyph: '⎕' },
    { id: 'cooktop',    label: 'Cooktop',        glyph: '⊞' },
    { id: 'rangehood',  label: 'Rangehood',      glyph: '⋂' },
    { id: 'dishwasher', label: 'Dishwasher',     glyph: '▤' },
    { id: 'fridge',     label: 'Fridge',         glyph: '▯' },
    { id: 'freezer',    label: 'Freezer',        glyph: '▮' },
    { id: 'microwave',  label: 'Microwave',      glyph: '▣' },
    { id: 'washer',     label: 'Washer / dryer', glyph: '◉' },
    { id: 'coffee',     label: 'Coffee machine', glyph: '◒' },
    { id: 'warming',    label: 'Warming drawer', glyph: '≡' },
  ],
  fitting: [
    { id: 'mixer',      label: 'Tap / mixer',    glyph: '⌐' },
    { id: 'basin',      label: 'Basin',          glyph: '◡' },
    { id: 'sink',       label: 'Sink',           glyph: '⊔' },
    { id: 'toilet',     label: 'Toilet',         glyph: '◗' },
    { id: 'bath',       label: 'Bath',           glyph: '⌒' },
    { id: 'shower',     label: 'Shower',         glyph: '⌁' },
    { id: 'floor-waste',label: 'Floor waste',    glyph: '◉' },
    { id: 'bottle-trap',label: 'Bottle trap',    glyph: '╷' },
    { id: 'accessory',  label: 'Accessory',      glyph: '✚' },
  ],
  light: [
    { id: 'downlight',  label: 'Downlight',      glyph: '◯' },
    { id: 'pendant',    label: 'Pendant',        glyph: '◉' },
    { id: 'sconce',     label: 'Wall sconce',    glyph: '◐' },
    { id: 'strip',      label: 'Strip / linear', glyph: '━' },
    { id: 'floor',      label: 'Floor lamp',     glyph: '╽' },
    { id: 'table',      label: 'Table lamp',     glyph: '╤' },
    { id: 'track',      label: 'Track',          glyph: '┅' },
    { id: 'spot',       label: 'Spotlight',      glyph: '✦' },
  ],
  joinery: [
    { id: 'handle',     label: 'Handle / pull',  glyph: '━' },
    { id: 'knob',       label: 'Knob',           glyph: '●' },
    { id: 'hinge',      label: 'Hinge',          glyph: '⌐' },
    { id: 'runner',     label: 'Drawer runner',  glyph: '═' },
    { id: 'shelf',      label: 'Shelf support',  glyph: '⊥' },
    { id: 'catch',      label: 'Catch / latch',  glyph: '⊓' },
    { id: 'tambour',    label: 'Tambour',        glyph: '┃' },
  ],
  door: [
    { id: 'hinged',     label: 'Hinged',         glyph: '▯' },
    { id: 'sliding',    label: 'Sliding',        glyph: '⇆' },
    { id: 'pivot',      label: 'Pivot',          glyph: '◐' },
    { id: 'barn',       label: 'Barn',           glyph: '⇢' },
    { id: 'bifold',     label: 'Bifold',         glyph: '≫' },
    { id: 'cavity',     label: 'Cavity slider',  glyph: '⇠' },
  ],
  window: [
    { id: 'casement',   label: 'Casement',       glyph: '▥' },
    { id: 'awning',     label: 'Awning',         glyph: '⌐' },
    { id: 'sliding',    label: 'Sliding',        glyph: '⇆' },
    { id: 'fixed',      label: 'Fixed pane',     glyph: '▢' },
    { id: 'double-hung',label: 'Double-hung',    glyph: '≡' },
    { id: 'louvre',     label: 'Louvre',         glyph: '☰' },
  ],
  'ffe-seating': [
    { id: 'chair',      label: 'Chair',          glyph: '◐' },
    { id: 'armchair',   label: 'Armchair',       glyph: '◒' },
    { id: 'sofa',       label: 'Sofa',           glyph: '◉' },
    { id: 'stool',      label: 'Stool',          glyph: '◯' },
    { id: 'bench',      label: 'Bench',          glyph: '━' },
    { id: 'ottoman',    label: 'Ottoman',        glyph: '◎' },
  ],
  'ffe-tables': [
    { id: 'dining',     label: 'Dining table',   glyph: '⎕' },
    { id: 'coffee',     label: 'Coffee table',   glyph: '▱' },
    { id: 'side',       label: 'Side table',     glyph: '□' },
    { id: 'desk',       label: 'Desk',           glyph: '▭' },
    { id: 'console',    label: 'Console',        glyph: '▬' },
  ],
  'ffe-storage': [
    { id: 'shelving',   label: 'Shelving',       glyph: '▤' },
    { id: 'cabinet',    label: 'Cabinet',        glyph: '▦' },
    { id: 'sideboard',  label: 'Sideboard',      glyph: '▬' },
    { id: 'wardrobe',   label: 'Wardrobe',       glyph: '▯' },
    { id: 'coat-rack',  label: 'Coat rack',      glyph: '╿' },
  ],
  'ffe-beds': [
    { id: 'single',     label: 'Single bed',     glyph: '◰' },
    { id: 'double',     label: 'Double bed',     glyph: '◱' },
    { id: 'queen',      label: 'Queen bed',      glyph: '◲' },
    { id: 'king',       label: 'King bed',       glyph: '◳' },
  ],
  'ffe-soft': [
    { id: 'rug',        label: 'Rug',            glyph: '▨' },
    { id: 'cushion',    label: 'Cushion',        glyph: '◉' },
    { id: 'throw',      label: 'Throw',          glyph: '≋' },
    { id: 'curtain',    label: 'Curtain / drape',glyph: '│' },
    { id: 'blind',      label: 'Blind',          glyph: '≣' },
  ],
  'ffe-lighting': [
    { id: 'pendant',    label: 'Pendant',        glyph: '◉' },
    { id: 'floor',      label: 'Floor lamp',     glyph: '╽' },
    { id: 'table',      label: 'Table lamp',     glyph: '╤' },
    { id: 'wall',       label: 'Wall lamp',      glyph: '◐' },
  ],
  'ffe-art': [
    { id: 'artwork',    label: 'Artwork',        glyph: '◇' },
    { id: 'print',      label: 'Print',          glyph: '▭' },
    { id: 'mirror',     label: 'Mirror',         glyph: '◈' },
    { id: 'sculpture',  label: 'Sculpture',      glyph: '▲' },
    { id: 'planter',    label: 'Planter',        glyph: '▽' },
    { id: 'vessel',     label: 'Vessel',         glyph: '◡' },
  ],
};

// Resolve a subtype glyph. Falls back to kind glyph, then '·'.
function subtypeGlyph(kindId, subtypeId) {
  if (!subtypeId) {
    return (window.kindGlyph ? window.kindGlyph(kindId) : '·');
  }
  const list = SUBTYPES[kindId] || [];
  const rec = list.find(s => s.id === subtypeId);
  if (rec) return rec.glyph;
  return (window.kindGlyph ? window.kindGlyph(kindId) : '·');
}

// Get subtype list for a kind (safe empty array if kind has no subtypes).
function subtypesForKind(kindId) {
  return SUBTYPES[kindId] || [];
}

// Lookup a subtype record by kind + id.
function subtypeById(kindId, subtypeId) {
  const list = SUBTYPES[kindId] || [];
  return list.find(s => s.id === subtypeId) || null;
}

// Given a hex colour, return a readable ink colour for text/glyph on that bg.
// Uses perceptual luminance (sRGB → relative luminance) with a pragmatic
// threshold. Returns a var() ref so hovers/themes still cascade.
function readableInk(hex) {
  if (!hex || typeof hex !== 'string') return 'var(--ink-2)';
  let h = hex.trim();
  if (h[0] === '#') h = h.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6) return 'var(--ink-2)';
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  // Relative luminance (sRGB, gamma-corrected)
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.55 ? 'var(--ink)' : 'var(--paper)';
}

Object.assign(window, {
  KINDS, KIND_GROUPS, TRADES, STARTER_TAGS, SUBTYPES,
  inferKind, inferTrade, migrateItem, kindById, kindsInGroup,
  subtypeGlyph, subtypesForKind, subtypeById, readableInk,
});
