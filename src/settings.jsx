// Settings — user-facing preferences. Single source of truth in appState
// (cloud-backed). Applied as CSS variables on <html>.
// loadSettings / saveSettings remain for one-time localStorage migration
// on first cloud load; resetSettings() returns defaults for the reset flow.

// ─────────────── Registries ───────────────

const SETTINGS_THEMES = [
  { key: 'light', label: 'Light',
    description: 'Warm paper — the studio default.',
    vars: {
      '--paper':   '#f3efe7', '--paper-2': '#eae5d9',
      '--ink':     '#141414', '--ink-2': '#3a3630', '--ink-3': '#6b6559', '--ink-4': '#9a9385',
      '--rule':    '#d8d3c6', '--rule-2': '#c6bfae',
      '--tint':    'rgba(20,20,20,0.03)', '--tint-2': 'rgba(20,20,20,0.06)',
      '--stripe':  'rgba(20,20,20,0.025)',
      '--shadow':  '0 16px 40px rgba(20,20,20,0.08)',
    },
    preview: { paper: '#f3efe7', ink: '#141414', accent: '#b85c3a' },
  },
  { key: 'daylight', label: 'Daylight',
    description: 'Cool neutral white — crisp, unsaturated.',
    vars: {
      '--paper':   '#fafaf7', '--paper-2': '#eef0ee',
      '--ink':     '#0f1012', '--ink-2': '#2d3036', '--ink-3': '#5a5e66', '--ink-4': '#8f9299',
      '--rule':    '#d8dadd', '--rule-2': '#c0c3c9',
      '--tint':    'rgba(15,16,18,0.03)', '--tint-2': 'rgba(15,16,18,0.06)',
      '--stripe':  'rgba(15,16,18,0.022)',
      '--shadow':  '0 16px 40px rgba(15,16,18,0.06)',
    },
    preview: { paper: '#fafaf7', ink: '#0f1012', accent: '#3a4a5c' },
  },
  { key: 'sepia', label: 'Sepia',
    description: 'Deep warm tan — aged paper, low contrast.',
    vars: {
      '--paper':   '#ece1cc', '--paper-2': '#ddcfae',
      '--ink':     '#2a1e10', '--ink-2': '#4d3a25', '--ink-3': '#7a6848', '--ink-4': '#a89670',
      '--rule':    '#c7b690', '--rule-2': '#b2a078',
      '--tint':    'rgba(42,30,16,0.04)', '--tint-2': 'rgba(42,30,16,0.08)',
      '--stripe':  'rgba(42,30,16,0.03)',
      '--shadow':  '0 16px 40px rgba(42,30,16,0.12)',
    },
    preview: { paper: '#ece1cc', ink: '#2a1e10', accent: '#8a4028' },
  },
  { key: 'ink', label: 'Ink',
    description: 'Charcoal paper, warm off-white type — on-brand dark.',
    vars: {
      '--paper':   '#1d1c1a', '--paper-2': '#272522',
      '--ink':     '#efe9dc', '--ink-2': '#cfc6b3', '--ink-3': '#938b7c', '--ink-4': '#5f5a52',
      '--rule':    '#3a3732', '--rule-2': '#4a463f',
      '--tint':    'rgba(239,233,220,0.04)', '--tint-2': 'rgba(239,233,220,0.08)',
      '--stripe':  'rgba(239,233,220,0.028)',
      '--shadow':  '0 16px 40px rgba(0,0,0,0.5)',
    },
    preview: { paper: '#1d1c1a', ink: '#efe9dc', accent: '#d97757' },
    dark: true,
  },
  { key: 'dark', label: 'Dark',
    description: 'True dark — neutral charcoal, cool whites.',
    vars: {
      '--paper':   '#121316', '--paper-2': '#1c1d22',
      '--ink':     '#f2f3f5', '--ink-2': '#c9cbcf', '--ink-3': '#8a8c92', '--ink-4': '#5a5c62',
      '--rule':    '#2d2f34', '--rule-2': '#3d4046',
      '--tint':    'rgba(242,243,245,0.04)', '--tint-2': 'rgba(242,243,245,0.08)',
      '--stripe':  'rgba(242,243,245,0.028)',
      '--shadow':  '0 16px 40px rgba(0,0,0,0.6)',
    },
    preview: { paper: '#121316', ink: '#f2f3f5', accent: '#d97757' },
    dark: true,
  },
  { key: 'hc', label: 'High contrast',
    description: 'AAA-compliant — crisp black on pure paper.',
    vars: {
      '--paper':   '#ffffff', '--paper-2': '#f2f2f2',
      '--ink':     '#000000', '--ink-2': '#1a1a1a', '--ink-3': '#333333', '--ink-4': '#595959',
      '--rule':    '#000000', '--rule-2': '#000000',
      '--tint':    'rgba(0,0,0,0.06)', '--tint-2': 'rgba(0,0,0,0.12)',
      '--stripe':  'rgba(0,0,0,0.04)',
      '--shadow':  '0 0 0 1px #000',
    },
    preview: { paper: '#ffffff', ink: '#000000', accent: '#000000' },
  },
];

// Accents are paired with each theme's character. We keep a single list but
// shift shade so contrast holds in dark themes.
const SETTINGS_ACCENTS = [
  { key: 'umber', label: 'Umber',
    light: { accent: '#b85c3a', ink: '#8a4028' },
    dark:  { accent: '#d97757', ink: '#e89372' } },
  { key: 'slate', label: 'Slate',
    light: { accent: '#3a4a5c', ink: '#27323f' },
    dark:  { accent: '#7b95b2', ink: '#a3bad3' } },
  { key: 'moss',  label: 'Moss',
    light: { accent: '#5c6b3a', ink: '#424d29' },
    dark:  { accent: '#9daf6e', ink: '#bccb93' } },
  { key: 'ink',   label: 'Ink',
    light: { accent: '#141414', ink: '#000000' },
    dark:  { accent: '#efe9dc', ink: '#ffffff' } },
  { key: 'crimson', label: 'Crimson',
    light: { accent: '#8a2a2a', ink: '#5c1a1a' },
    dark:  { accent: '#d06868', ink: '#e39090' } },
  { key: 'cobalt',  label: 'Cobalt',
    light: { accent: '#2a4a8a', ink: '#1a305c' },
    dark:  { accent: '#7595d6', ink: '#9fb6e4' } },
];

const SETTINGS_TYPEFACES = [
  { key: 'editorial', label: 'Editorial',
    description: 'Newsreader · Inter Tight · JetBrains Mono — studio default.',
    serif: "'Newsreader', Georgia, serif",
    sans:  "'Inter Tight', system-ui, sans-serif",
    mono:  "'JetBrains Mono', ui-monospace, monospace",
    googleFonts: 'family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,400&family=Inter+Tight:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500',
    sample: 'The studio archive — forty-two.',
  },
  { key: 'archival', label: 'Archival',
    description: 'EB Garamond · Inter · IBM Plex Mono — old-world specimen book.',
    serif: "'EB Garamond', 'Newsreader', serif",
    sans:  "'Inter', system-ui, sans-serif",
    mono:  "'IBM Plex Mono', ui-monospace, monospace",
    googleFonts: 'family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&family=IBM+Plex+Mono:wght@300;400;500',
    sample: 'The studio archive — forty-two.',
  },
  { key: 'monument', label: 'Monument',
    description: 'Fraunces · Work Sans · Fira Code — architectural, weighty.',
    serif: "'Fraunces', Georgia, serif",
    sans:  "'Work Sans', system-ui, sans-serif",
    mono:  "'Fira Code', ui-monospace, monospace",
    googleFonts: 'family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Work+Sans:wght@300;400;500;600&family=Fira+Code:wght@300;400;500',
    sample: 'The studio archive — forty-two.',
  },
  { key: 'system', label: 'System',
    description: 'Charter · system-ui · SF Mono — no webfonts, fastest.',
    serif: "Charter, 'Iowan Old Style', Georgia, serif",
    sans:  "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    mono:  "ui-monospace, 'SF Mono', Menlo, monospace",
    googleFonts: null,
    sample: 'The studio archive — forty-two.',
  },
  { key: 'bold', label: 'Bold',
    description: 'Playfair · Manrope · JetBrains Mono — high-contrast, display.',
    serif: "'Playfair Display', Georgia, serif",
    sans:  "'Manrope', system-ui, sans-serif",
    mono:  "'JetBrains Mono', ui-monospace, monospace",
    googleFonts: 'family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Manrope:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500',
    sample: 'The studio archive — forty-two.',
  },
];

const SETTINGS_PAPERS = [
  { key: 'warm',  label: 'Warm',  preview: '#f3efe7' },
  { key: 'cool',  label: 'Cool',  preview: '#eef0ee' },
  { key: 'white', label: 'White', preview: '#fafaf7' },
];

const SETTINGS_GALLERY_WIDTHS = [
  { key: 'editorial', label: 'Editorial', w: 1240 },
  { key: 'roomy',     label: 'Roomy',     w: 1360 },
  { key: 'studio',    label: 'Studio',    w: 1480 },
  { key: 'broad',     label: 'Broad',     w: 1680 },
  { key: 'wide',      label: 'Wide',      w: null },
];

const SETTINGS_DENSITIES = [
  { key: 'compact', label: 'Compact' },
  { key: 'regular', label: 'Regular' },
  { key: 'open',    label: 'Open' },
];

const SETTINGS_RULE_STYLES = [
  { key: 'solid',  label: 'Solid',  style: 'solid' },
  { key: 'dotted', label: 'Dotted', style: 'dotted' },
  { key: 'dashed', label: 'Dashed', style: 'dashed' },
  { key: 'none',   label: 'None',   style: 'solid' }, // 'none' handled as transparent colour
];

const SETTINGS_SWATCH_SHAPES = [
  { key: 'square',  label: 'Square',  radius: '0' },
  { key: 'rounded', label: 'Rounded', radius: '4px' },
  { key: 'circle',  label: 'Circle',  radius: '50%' },
];

// ─────────────── Defaults & persistence ───────────────

const SETTINGS_DEFAULTS = {
  theme: 'light',
  accent: 'umber',
  typeface: 'editorial',
  paper: 'warm',            // tints within Light theme only
  density: 'regular',
  galleryWidth: 'editorial',
  ruleStyle: 'solid',
  swatchShape: 'square',
  stripes: false,
  showImagery: true,

  // Firm identity (header & footer)
  firmName: 'Hollis & Arne',
  firmTagline: 'Studio Archive',
  firmFooterLeft: 'Hollis & Arne · Architecture',
  firmFooterRight: 'Rev. 22·04·26 · Internal',
  firmLogoType: 'default',       // 'default' | 'preset' | 'upload'
  firmLogoPreset: 'square-nested',
  firmLogoData: null,            // base64 data URL when type === 'upload'

  // Library / Project defaults
  defaultCategory: 'Timber',
  defaultUnit: 'm²',
  defaultStage: 'Concept',
  defaultCurrency: 'AUD',

  // Dismissed duplicate pairs (persisted here so it travels with JSON export)
  dismissedDuplicatePairs: [],

  // Code & duplicate policy (mirrors DUPE_PRESET_A)
  dupePolicy: {
    preset: 'A',
    scope: 'project',
    uniquenessProject: 'block',
    uniquenessLibrary: 'warn',
    autoAssign: 'series',
    duplicateName: 'keep',
    duplicateCode: 'series',
    onDelete: 'leave',
    warnOnMaterialDupe: 'warn',
    fuzzyNameMatch: false,
    requireCodeOnSave: false,
  },
};

const SETTINGS_KEY = 'aml-settings';
const TWEAKS_LEGACY_KEY = 'aml-tweaks';

function loadSettings() {
  let raw = null;
  try { raw = localStorage.getItem(SETTINGS_KEY); } catch {}
  if (raw) {
    try { return { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) }; }
    catch {}
  }
  // Migrate from old Tweaks blob, if present
  try {
    const legacy = localStorage.getItem(TWEAKS_LEGACY_KEY);
    if (legacy) {
      const t = JSON.parse(legacy);
      return {
        ...SETTINGS_DEFAULTS,
        accent: t.accent || SETTINGS_DEFAULTS.accent,
        density: t.density || SETTINGS_DEFAULTS.density,
        paper: t.paper || SETTINGS_DEFAULTS.paper,
        galleryWidth: t.galleryWidth || SETTINGS_DEFAULTS.galleryWidth,
        showImagery: typeof t.showImagery === 'boolean' ? t.showImagery : SETTINGS_DEFAULTS.showImagery,
      };
    }
  } catch {}
  return { ...SETTINGS_DEFAULTS };
}

function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

function resetSettings() {
  try { localStorage.removeItem(SETTINGS_KEY); } catch {}
  return { ...SETTINGS_DEFAULTS };
}

// ─────────────── Appliers ───────────────

// Apply all CSS variables for the current theme + accent + typography + rule style
function applySettingsToDOM(s) {
  const root = document.documentElement;
  const theme = SETTINGS_THEMES.find(t => t.key === s.theme) || SETTINGS_THEMES[0];

  // 1. Theme vars (paper, ink, rules)
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));

  // 2. Paper sub-tint — Light theme only; other themes keep their own paper.
  if (s.theme === 'light') {
    const papers = {
      warm:  { '--paper': '#f3efe7', '--paper-2': '#eae5d9' },
      cool:  { '--paper': '#eef0ee', '--paper-2': '#e3e6e2' },
      white: { '--paper': '#fafaf7', '--paper-2': '#f0ede4' },
    };
    const p = papers[s.paper] || papers.warm;
    Object.entries(p).forEach(([k, v]) => root.style.setProperty(k, v));
  }

  // 3. Accent — shift to dark variant for dark themes
  const accent = SETTINGS_ACCENTS.find(a => a.key === s.accent) || SETTINGS_ACCENTS[0];
  const acc = theme.dark ? accent.dark : accent.light;
  root.style.setProperty('--accent', acc.accent);
  root.style.setProperty('--accent-ink', acc.ink);

  // 4. Typography
  const tf = SETTINGS_TYPEFACES.find(t => t.key === s.typeface) || SETTINGS_TYPEFACES[0];
  root.style.setProperty('--font-serif', tf.serif);
  root.style.setProperty('--font-sans', tf.sans);
  root.style.setProperty('--font-mono', tf.mono);

  // 5. Rule style
  const rule = SETTINGS_RULE_STYLES.find(r => r.key === s.ruleStyle) || SETTINGS_RULE_STYLES[0];
  root.style.setProperty('--rule-style', rule.style);
  if (s.ruleStyle === 'none') {
    root.style.setProperty('--rule-opacity', '0');
  } else {
    root.style.setProperty('--rule-opacity', '1');
  }

  // 6. Swatch shape
  const shape = SETTINGS_SWATCH_SHAPES.find(x => x.key === s.swatchShape) || SETTINGS_SWATCH_SHAPES[0];
  root.style.setProperty('--swatch-radius', shape.radius);

  // 7. Stripes
  root.style.setProperty('--stripe-on', s.stripes ? '1' : '0');

  // 8. Data attributes for CSS selectors
  root.setAttribute('data-theme', s.theme);
  root.setAttribute('data-accent', s.accent);
  root.setAttribute('data-density', s.density);
  root.setAttribute('data-typeface', s.typeface);
  root.setAttribute('data-rule-style', s.ruleStyle);
  root.setAttribute('data-swatch-shape', s.swatchShape);
  root.setAttribute('data-stripes', s.stripes ? 'on' : 'off');

  // 9. Google Fonts — inject if not already there
  ensureGoogleFont(tf);
}

// Tracks which font stylesheets we've injected
const __injectedFonts = new Set();
function ensureGoogleFont(tf) {
  if (!tf.googleFonts) return;
  if (__injectedFonts.has(tf.key)) return;
  __injectedFonts.add(tf.key);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?' + tf.googleFonts + '&display=swap';
  link.dataset.typefacePreset = tf.key;
  document.head.appendChild(link);
}

// ─────────────── Helper: currency formatter ───────────────

const CURRENCY_SYMBOLS = { AUD: 'A$', USD: 'US$', GBP: '£', EUR: '€', NZD: 'NZ$', JPY: '¥' };

// ─────────────── Exports ───────────────

Object.assign(window, {
  SETTINGS_THEMES,
  SETTINGS_ACCENTS,
  SETTINGS_TYPEFACES,
  SETTINGS_PAPERS,
  SETTINGS_GALLERY_WIDTHS,
  SETTINGS_DENSITIES,
  SETTINGS_RULE_STYLES,
  SETTINGS_SWATCH_SHAPES,
  SETTINGS_DEFAULTS,
  CURRENCY_SYMBOLS,
  loadSettings,
  saveSettings,
  resetSettings,
  applySettingsToDOM,
});
