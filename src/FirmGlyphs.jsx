// FirmGlyphs — preset glyphs for the firm logo, plus the <FirmLogo/> component
// that renders the default mark, a preset glyph, or an uploaded image based
// on settings.firmLogoType.

const G = {
  // Each entry renders inside a 24x24 viewBox using currentColor for stroke/fill
  // so the mark picks up var(--ink) or the paper when inverted.
  'square-nested': (
    <g>
      <rect x="1" y="1" width="22" height="22" fill="currentColor" />
      <rect x="6" y="6" width="12" height="12" fill="var(--paper)" />
      <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1" />
    </g>
  ),
  'square-solid':    <rect x="2" y="2" width="20" height="20" fill="currentColor" />,
  'square-outline':  <rect x="2.5" y="2.5" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.5" />,
  'circle-solid':    <circle cx="12" cy="12" r="10" fill="currentColor" />,
  'circle-outline':  <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.5" />,
  'circle-concentric': (
    <g fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="3" />
    </g>
  ),
  'circle-dot':      <g><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.2"/><circle cx="12" cy="12" r="3" fill="currentColor"/></g>,
  'triangle-solid':  <polygon points="12,2 22,21 2,21" fill="currentColor" />,
  'triangle-outline':<polygon points="12,2.5 21.5,21 2.5,21" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" />,
  'diamond':         <polygon points="12,1.5 22.5,12 12,22.5 1.5,12" fill="currentColor" />,
  'hexagon':         <polygon points="12,1.5 21.5,7 21.5,17 12,22.5 2.5,17 2.5,7" fill="none" stroke="currentColor" strokeWidth="1.5" />,
  'pentagon':        <polygon points="12,2 22,9.5 18,22 6,22 2,9.5" fill="currentColor" />,
  'octagon':         <polygon points="8,2 16,2 22,8 22,16 16,22 8,22 2,16 2,8" fill="none" stroke="currentColor" strokeWidth="1.5" />,
  'plus':            <g fill="currentColor"><rect x="10" y="2" width="4" height="20"/><rect x="2" y="10" width="20" height="4"/></g>,
  'x-mark':          <g stroke="currentColor" strokeWidth="3" strokeLinecap="square"><line x1="3" y1="3" x2="21" y2="21"/><line x1="21" y1="3" x2="3" y2="21"/></g>,
  'star-5':          <polygon points="12,2 14.6,9 22,9 16,13.5 18.4,21 12,16.5 5.6,21 8,13.5 2,9 9.4,9" fill="currentColor" />,
  'arch': (
    <g fill="currentColor">
      <path d="M3 22 L3 12 A9 9 0 0 1 21 12 L21 22 Z" />
      <rect x="9" y="14" width="6" height="8" fill="var(--paper)" />
    </g>
  ),
  'column': (
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <rect x="3" y="3" width="18" height="2.5" fill="currentColor" />
      <rect x="3" y="18.5" width="18" height="2.5" fill="currentColor" />
      <line x1="7" y1="6" x2="7" y2="18" />
      <line x1="12" y1="6" x2="12" y2="18" />
      <line x1="17" y1="6" x2="17" y2="18" />
    </g>
  ),
  'grid-4':          <g fill="currentColor"><rect x="2" y="2" width="9" height="9"/><rect x="13" y="2" width="9" height="9"/><rect x="2" y="13" width="9" height="9"/><rect x="13" y="13" width="9" height="9"/></g>,
  'grid-9': (
    <g fill="currentColor">
      {[0,1,2].map(r => [0,1,2].map(c =>
        <rect key={r+'-'+c} x={2 + c*7} y={2 + r*7} width="6" height="6" />
      ))}
    </g>
  ),
  'keystone':        <polygon points="6,3 18,3 22,21 2,21" fill="currentColor" />,
  'brackets':        <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="square"><polyline points="8,3 3,12 8,21"/><polyline points="16,3 21,12 16,21"/></g>,
  'chevron-up':      <polyline points="3,17 12,7 21,17" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="square" strokeLinejoin="miter" />,
  'arrow-up': (
    <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="square">
      <line x1="12" y1="21" x2="12" y2="4" />
      <polyline points="5,11 12,4 19,11" />
    </g>
  ),
  'compass': (
    <g>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <polygon points="12,3 14,12 12,21 10,12" fill="currentColor" />
      <polygon points="3,12 12,10 21,12 12,14" fill="currentColor" opacity="0.55" />
    </g>
  ),
  'offset-squares': (
    <g fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="14" height="14" />
      <rect x="8" y="8" width="14" height="14" fill="var(--paper)" />
    </g>
  ),
};

// Ordered list for the picker grid
const FIRM_GLYPHS = [
  { id: 'square-nested',   label: 'Nested square' },
  { id: 'square-solid',    label: 'Square' },
  { id: 'square-outline',  label: 'Square outline' },
  { id: 'circle-solid',    label: 'Circle' },
  { id: 'circle-outline',  label: 'Circle outline' },
  { id: 'circle-concentric', label: 'Rings' },
  { id: 'triangle-solid',  label: 'Triangle' },
  { id: 'triangle-outline', label: 'Triangle outline' },
  { id: 'diamond',         label: 'Diamond' },
  { id: 'hexagon',         label: 'Hexagon' },
  { id: 'pentagon',        label: 'Pentagon' },
  { id: 'octagon',         label: 'Octagon' },
  { id: 'plus',            label: 'Plus' },
  { id: 'x-mark',          label: 'Cross' },
  { id: 'star-5',          label: 'Star' },
  { id: 'arch',            label: 'Arch' },
  { id: 'column',          label: 'Column' },
  { id: 'grid-4',          label: 'Grid 2×2' },
  { id: 'grid-9',          label: 'Grid 3×3' },
  { id: 'keystone',        label: 'Keystone' },
  { id: 'brackets',        label: 'Brackets' },
  { id: 'chevron-up',      label: 'Chevron' },
  { id: 'arrow-up',        label: 'Arrow' },
  { id: 'compass',         label: 'Compass' },
  { id: 'offset-squares',  label: 'Offset squares' },
];

function GlyphSvg({ id, size = 22, style }) {
  const node = G[id] || G['square-nested'];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      style={{ display: 'block', color: 'var(--ink)', ...style }}>
      {node}
    </svg>
  );
}

// Renders the firm mark based on settings. Default is the original hand-drawn
// nested-square; preset picks from the glyph set; upload shows the user's image.
function FirmLogo({ settings, size = 22 }) {
  const type = settings?.firmLogoType || 'default';

  if (type === 'upload' && settings?.firmLogoData) {
    return (
      <img src={settings.firmLogoData} alt=""
        style={{ width: size, height: size, objectFit: 'contain', display: 'block',
          position: 'relative', top: 3 }} />
    );
  }

  if (type === 'preset') {
    return (
      <div style={{ position: 'relative', top: 3, lineHeight: 0 }}>
        <GlyphSvg id={settings?.firmLogoPreset || 'square-nested'} size={size} />
      </div>
    );
  }

  // Default — the original geometric mark
  return (
    <div style={{
      width: size, height: size,
      background: 'var(--ink)',
      display: 'inline-block',
      position: 'relative',
      top: 3,
    }}>
      <div style={{
        position: 'absolute', top: 5, left: 5, right: 5, bottom: 5,
        background: 'var(--paper)',
      }} />
      <div style={{
        position: 'absolute', top: 10, left: 5, right: 5, height: 1,
        background: 'var(--ink)',
      }} />
    </div>
  );
}

Object.assign(window, { FIRM_GLYPHS, FirmLogo, GlyphSvg });
