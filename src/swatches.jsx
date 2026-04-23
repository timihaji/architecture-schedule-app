// Procedural SVG swatches for materials.
// Each swatch takes { tone, grain, vein } + dimensions.

function Woodgrain({ tone = '#b88a57', grain = '#6b451f', w = 120, h = 80, seed = 1 }) {
  // irregular grain lines
  const lines = [];
  const rand = mulberry32(seed);
  for (let i = 0; i < 9; i++) {
    const y = (i + rand()) * (h / 9);
    const d = `M -4 ${y.toFixed(1)} Q ${w * 0.3} ${(y + (rand() - 0.5) * 6).toFixed(1)}, ${w * 0.55} ${(y + (rand() - 0.5) * 4).toFixed(1)} T ${w + 4} ${(y + (rand() - 0.5) * 6).toFixed(1)}`;
    lines.push(
      <path key={i} d={d} stroke={grain} strokeWidth={0.3 + rand() * 0.9} fill="none" opacity={0.4 + rand() * 0.5} />
    );
  }
  // knot
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {lines}
      <ellipse cx={w * 0.72} cy={h * 0.4} rx="2.5" ry="1.3" fill={grain} opacity="0.7" />
      <ellipse cx={w * 0.72} cy={h * 0.4} rx="5" ry="2.5" fill="none" stroke={grain} strokeWidth="0.4" opacity="0.5" />
    </svg>
  );
}

function Veneer({ tone = '#b89268', grain = '#6d4a24', w = 120, h = 80 }) {
  // tight parallel lines — more uniform than Woodgrain
  const lines = [];
  for (let i = 0; i < 24; i++) {
    const y = (i * h) / 24;
    lines.push(<line key={i} x1="0" y1={y} x2={w} y2={y + (i % 3 === 0 ? 0.4 : 0)} stroke={grain} strokeWidth="0.35" opacity={0.3 + (i % 5) * 0.08} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {lines}
    </svg>
  );
}

function Castellation({ tone = '#a36948', grain = '#5a3319', w = 120, h = 80 }) {
  const battens = 10;
  const bw = w / battens;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {Array.from({ length: battens }).map((_, i) => (
        <g key={i}>
          <rect x={i * bw} y="0" width={bw * 0.7} height={h} fill={tone} />
          <rect x={i * bw + bw * 0.7} y="0" width={bw * 0.3} height={h} fill={grain} opacity="0.55" />
          <line x1={i * bw + bw * 0.3} y1="0" x2={i * bw + bw * 0.3} y2={h} stroke={grain} strokeWidth="0.4" opacity="0.35" />
        </g>
      ))}
    </svg>
  );
}

function Fluted({ tone = '#a67d52', grain = '#6b4a28', w = 120, h = 80 }) {
  const flutes = 14;
  const fw = w / flutes;
  const stops = [];
  for (let i = 0; i < flutes; i++) {
    const cx = i * fw + fw / 2;
    stops.push(
      <g key={i}>
        <rect x={i * fw} y="0" width={fw} height={h} fill={tone} />
        <rect x={i * fw} y="0" width={fw * 0.15} height={h} fill={grain} opacity="0.4" />
        <rect x={i * fw + fw * 0.85} y="0" width={fw * 0.15} height={h} fill={grain} opacity="0.18" />
        <rect x={cx - 0.4} y="0" width="0.8" height={h} fill="#fff" opacity="0.15" />
      </g>
    );
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      {stops}
    </svg>
  );
}

function VJ({ tone = '#ede7da', w = 120, h = 80 }) {
  const joints = 6;
  const jw = w / joints;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {Array.from({ length: joints - 1 }).map((_, i) => (
        <g key={i}>
          <line x1={(i + 1) * jw - 0.4} y1="0" x2={(i + 1) * jw - 0.4} y2={h} stroke="#000" strokeWidth="0.35" opacity="0.22" />
          <line x1={(i + 1) * jw + 0.4} y1="0" x2={(i + 1) * jw + 0.4} y2={h} stroke="#fff" strokeWidth="0.35" opacity="0.5" />
        </g>
      ))}
    </svg>
  );
}

function Marble({ tone = '#ece6dc', vein = '#7a7468', w = 120, h = 80, seed = 7 }) {
  const rand = mulberry32(seed);
  const veins = [];
  for (let i = 0; i < 6; i++) {
    const x1 = rand() * w, y1 = rand() * h;
    const cx = rand() * w, cy = rand() * h;
    const x2 = rand() * w, y2 = rand() * h;
    veins.push(
      <path key={i} d={`M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`}
        stroke={vein} strokeWidth={0.3 + rand() * 0.8} fill="none" opacity={0.3 + rand() * 0.5} />
    );
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {veins}
    </svg>
  );
}

function Travertine({ tone = '#9a7a5c', vein = '#624628', w = 120, h = 80, seed = 12 }) {
  const rand = mulberry32(seed);
  const bands = [];
  for (let i = 0; i < 5; i++) {
    const y = (i + rand() * 0.6) * (h / 5);
    bands.push(
      <rect key={'b' + i} x="0" y={y} width={w} height={0.8 + rand() * 1.6} fill={vein} opacity={0.18 + rand() * 0.2} />
    );
  }
  const pores = [];
  for (let i = 0; i < 22; i++) {
    pores.push(<ellipse key={'p' + i} cx={rand() * w} cy={rand() * h} rx={0.4 + rand() * 0.9} ry={0.3 + rand() * 0.5} fill={vein} opacity={0.35} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {bands}
      {pores}
    </svg>
  );
}

function Stone({ tone = '#575a5a', grain = '#2f3131', w = 120, h = 80, seed = 3 }) {
  const rand = mulberry32(seed);
  const dots = [];
  for (let i = 0; i < 80; i++) {
    dots.push(<circle key={i} cx={rand() * w} cy={rand() * h} r={0.3 + rand() * 0.7} fill={grain} opacity={0.2 + rand() * 0.4} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {dots}
    </svg>
  );
}

function Brushed({ tone = '#b8b5ae', grain = '#8a8780', w = 120, h = 80 }) {
  const lines = [];
  for (let i = 0; i < 60; i++) {
    const y = (i * h) / 60;
    lines.push(<line key={i} x1="0" y1={y} x2={w} y2={y} stroke={grain} strokeWidth="0.25" opacity={0.15 + (i % 7) * 0.05} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {lines}
    </svg>
  );
}

function Weave({ tone = '#cfc2a6', grain = '#9a8c6c', w = 120, h = 80 }) {
  const cell = 4;
  const cells = [];
  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      const v = ((x / cell) + (y / cell)) % 2 === 0;
      cells.push(<rect key={x + '-' + y} x={x} y={y} width={cell - 0.3} height={cell - 0.3} fill={v ? tone : grain} opacity={v ? 1 : 0.5} />);
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {cells}
    </svg>
  );
}

function Solid({ tone = '#6b6158', w = 120, h = 80 }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
    </svg>
  );
}

// Paint: flat hex block, a small sheen tag in the bottom-right corner.
function Paint({ tone = '#ece7d8', sheen = '', w = 120, h = 80 }) {
  const short = (sheen || '').replace('Mineral ', '').replace('Dead Flat', 'Flat').replace('Semi Gloss', 'Semi');
  const hex = (tone || '#ece7d8').replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textColour = lum > 0.55 ? 'rgba(20,20,20,0.55)' : 'rgba(255,255,255,0.70)';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {short && (
        <text x={w - 3} y={h - 3}
          textAnchor="end"
          fontFamily="'Inter Tight', sans-serif"
          fontSize="5.2"
          fontWeight="500"
          letterSpacing="0.4"
          fill={textColour}
          style={{ textTransform: 'uppercase' }}>
          {short.toUpperCase()}
        </text>
      )}
    </svg>
  );
}

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function Swatch({ swatch, size = 'md', seed = 1, style = {}, glyph = null, glyphColor = null }) {
  if (!swatch) return null;
  // Default to square swatches so rows + gallery cards feel like tokens, not chips.
  // lg/xl remain rectangular — those are used for large hero/spec previews.
  const dims = {
    xs: { w: 28, h: 28 },
    sm: { w: 48, h: 48 },
    md: { w: 80, h: 80 },
    lg: { w: 160, h: 110 },
    xl: { w: 260, h: 180 },
  }[size];
  const props = { ...swatch, seed, w: 120, h: 80 };
  const inner = (() => {
    switch (swatch.kind) {
      case 'image':
        return swatch.src
          ? <img src={swatch.src} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <Solid tone={swatch.tone || '#d8d3c6'} w={120} h={80} />;
      case 'woodgrain': return <Woodgrain {...props} />;
      case 'veneer': return <Veneer {...props} />;
      case 'castellation': return <Castellation {...props} />;
      case 'fluted': return <Fluted {...props} />;
      case 'vj': return <VJ {...props} />;
      case 'marble': return <Marble {...props} />;
      case 'travertine': return <Travertine {...props} />;
      case 'stone': return <Stone {...props} />;
      case 'brushed': return <Brushed {...props} />;
      case 'weave': return <Weave {...props} />;
      case 'paint': return <Paint {...props} />;
      case 'solid': default: return <Solid {...props} />;
    }
  })();

  // Glyph size scales with the swatch — ~58% of the shorter edge so it reads
  // as a real icon in the gallery, not a speck. Hero previews get a hero glyph.
  // Respect style-override dimensions so the table's 20×20 cell doesn't clip.
  const effW = typeof style.width === 'number' ? style.width : dims.w;
  const effH = typeof style.height === 'number' ? style.height : dims.h;
  const glyphSize = glyph ? Math.max(10, Math.round(Math.min(effW, effH) * 0.58)) : 0;
  const resolvedGlyphColor = glyphColor
    || (swatch.tone && window.readableInk ? window.readableInk(swatch.tone) : 'var(--ink-2)');

  return (
    <div style={{
      width: dims.w,
      height: dims.h,
      flexShrink: 0,
      overflow: 'hidden',
      outline: '1px solid rgba(20,20,20,0.12)',
      outlineOffset: -1,
      position: 'relative',
      // Honour the global swatch-shape setting (square / rounded / pill)
      borderRadius: 'var(--swatch-radius, 0)',
      ...style,
    }}>
      {inner}
      {glyph && (
        <span style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: glyphSize,
          lineHeight: 1,
          color: resolvedGlyphColor,
          // Subtle blend so the glyph sits in the material without feeling pasted on
          mixBlendMode: 'multiply',
          opacity: 0.72,
          pointerEvents: 'none',
          userSelect: 'none',
        }}>{glyph}</span>
      )}
    </div>
  );
}

Object.assign(window, { Swatch });
