// Label template model — tokens, presets, and render fn.
// A template is an ARRAY of parts: { kind: 'token', id: 'name' } | { kind: 'sep', text: ' · ' }.
// labelTemplates in state: { global: [...], byCategory: { Timber: null | [...], Paint: [...], ... } }
// null = inherit global.

const TOKEN_DEFS = [
  // identity
  { id: 'code',       label: 'Code',          group: 'identity', get: m => m.code },
  { id: 'name',       label: 'Name',          group: 'identity', get: m => m.name },
  { id: 'category',   label: 'Category',      group: 'identity', get: m => m.category },
  // spec
  { id: 'species',    label: 'Species',       group: 'spec',     get: m => m.species },
  { id: 'finish',     label: 'Finish',        group: 'spec',     get: m => m.finish },
  { id: 'thickness',  label: 'Thickness',     group: 'spec',     get: m => m.thickness },
  { id: 'dimensions', label: 'Dimensions',    group: 'spec',     get: m => m.dimensions },
  // commercial
  { id: 'supplier',   label: 'Supplier',      group: 'commercial', get: m => m.supplier },
  { id: 'origin',     label: 'Origin',        group: 'commercial', get: m => m.origin },
  { id: 'unitCost',   label: 'Unit cost',     group: 'commercial',
    get: m => (m.unitCost != null ? `$${m.unitCost}/${m.unit || 'unit'}` : null) },
  { id: 'leadTime',   label: 'Lead time',     group: 'commercial', get: m => m.leadTime },
  // paint-specific
  { id: 'brand',      label: 'Brand',         group: 'paint',    get: m => m.brand },
  { id: 'colourName', label: 'Colour name',   group: 'paint',    get: m => m.colourName },
  { id: 'colourCode', label: 'Colour code',   group: 'paint',    get: m => m.colourCode },
  { id: 'sheen',      label: 'Sheen',         group: 'paint',    get: m => m.sheen },
  { id: 'system',     label: 'System',        group: 'paint',    get: m => m.system },
];

const TOKEN_GROUP_COLOR = {
  identity: '#3a4a5c',
  spec: '#5c6b3a',
  commercial: '#8a6236',
  paint: '#b85c3a',
};

const SEP_OPTIONS = [
  { id: 'dot', text: ' · ', label: '·' },
  { id: 'emdash', text: ' — ', label: '—' },
  { id: 'endash', text: ' – ', label: '–' },
  { id: 'colon', text: ': ', label: ':' },
  { id: 'slash', text: ' / ', label: '/' },
  { id: 'pipe', text: ' | ', label: '|' },
  { id: 'comma', text: ', ', label: ',' },
  { id: 'space', text: ' ', label: '␣' },
];

const PRESETS = [
  { id: 'name-only',   name: 'Name only',        parts: [T('name')] },
  { id: 'short',       name: 'Short',            parts: [T('code'), S(' · '), T('name')] },
  { id: 'full-spec',   name: 'Full spec',        parts: [T('code'), S(' · '), T('name'), S(' · '), T('finish'), S(' · '), T('thickness')] },
  { id: 'supplier',    name: 'Supplier line',    parts: [T('supplier'), S(' — '), T('name'), S(' · '), T('finish')] },
  { id: 'species',     name: 'Species · finish', parts: [T('species'), S(' · '), T('finish')] },
];

const PAINT_PRESETS = [
  { id: 'paint-chip',    name: 'Paint chip',          parts: [T('brand'), S(' · '), T('colourName'), S(' · '), T('sheen')] },
  { id: 'paint-code',    name: 'Paint with code',     parts: [T('colourCode'), S(' · '), T('brand'), S(' '), T('colourName')] },
  { id: 'paint-full',    name: 'Paint — full',        parts: [T('brand'), S(' · '), T('colourName'), S(' · '), T('sheen'), S(' · '), T('system')] },
];

function T(id) { return { kind: 'token', id }; }
function S(text) { return { kind: 'sep', text }; }

// Default templates shipped with the app.
const DEFAULT_TEMPLATES = {
  global: [T('code'), S(' · '), T('name')],
  byCategory: {
    Timber: null,
    Stone: null,
    Composite: null,
    Metal: null,
    Paint: [T('brand'), S(' · '), T('colourName'), S(' · '), T('sheen')],
    Textile: null,
  },
};

function getTokenDef(id) {
  return TOKEN_DEFS.find(t => t.id === id);
}

// Resolve which template to use for a material.
function resolveTemplate(material, labelTemplates) {
  const tpl = labelTemplates || DEFAULT_TEMPLATES;
  const catTpl = tpl.byCategory?.[material.category];
  if (catTpl && catTpl.length) return catTpl;
  return tpl.global || DEFAULT_TEMPLATES.global;
}

// Render a material to its display label.
// Empty tokens are replaced with EM-dash and their adjacent separator kept (so "A · — · B" is fine).
function formatLabel(material, labelTemplates, opts = {}) {
  if (!material) return '';
  // Per-material override
  if (material.customName && material.customName.trim()) {
    return material.customName.trim();
  }
  const parts = resolveTemplate(material, labelTemplates);
  const out = parts.map(p => {
    if (p.kind === 'sep') return p.text;
    const def = getTokenDef(p.id);
    const val = def ? def.get(material) : null;
    if (val == null || val === '') return opts.emptyPlaceholder ?? '—';
    return String(val);
  }).join('');
  // Collapse leading/trailing separators and double separators around empties
  return out.replace(/^\s*[·—–:/|,]+\s*/, '').replace(/\s*[·—–:/|,]+\s*$/, '').trim() || material.name || '';
}

// Convert template parts <-> text-mode string.
// Text mode: tokens are {name}, {code}, etc. Raw characters between are separators.
function templateToText(parts) {
  return parts.map(p => p.kind === 'token' ? `{${p.id}}` : p.text).join('');
}

function textToTemplate(text) {
  const parts = [];
  const re = /\{([a-zA-Z]+)\}/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ kind: 'sep', text: text.slice(last, m.index) });
    if (getTokenDef(m[1])) parts.push({ kind: 'token', id: m[1] });
    else parts.push({ kind: 'sep', text: m[0] });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ kind: 'sep', text: text.slice(last) });
  return parts;
}

window.TOKEN_DEFS = TOKEN_DEFS;
window.TOKEN_GROUP_COLOR = TOKEN_GROUP_COLOR;
window.SEP_OPTIONS = SEP_OPTIONS;
window.PRESETS = PRESETS;
window.PAINT_PRESETS = PAINT_PRESETS;
window.DEFAULT_TEMPLATES = DEFAULT_TEMPLATES;
window.getTokenDef = getTokenDef;
window.resolveTemplate = resolveTemplate;
window.formatLabel = formatLabel;
window.templateToText = templateToText;
window.textToTemplate = textToTemplate;
