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

function WireBrushed({ tone = '#c8a878', grain = '#8a6a4a', w = 120, h = 80, seed = 5 }) {
  const rand = mulberry32(seed);
  const lines = [];
  for (let i = 0; i < 32; i++) {
    const y = (i * h) / 32;
    const startX = rand() < 0.3 ? rand() * w * 0.35 : 0;
    const endX = rand() < 0.3 ? w * (0.55 + rand() * 0.45) : w;
    lines.push(
      <line key={i} x1={startX.toFixed(1)} y1={y.toFixed(1)} x2={endX.toFixed(1)} y2={(y + (rand() - 0.5) * 1.5).toFixed(1)}
        stroke={grain} strokeWidth={(0.35 + rand() * 0.65).toFixed(2)} opacity={(0.22 + rand() * 0.42).toFixed(2)} />
    );
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {lines}
    </svg>
  );
}

function Charred({ tone = '#1a1612', grain = '#3a3028', w = 120, h = 80, seed = 9 }) {
  const rand = mulberry32(seed);
  const cracks = [];
  for (let i = 0; i < 12; i++) {
    const y = (i + rand()) * (h / 12);
    const d = `M -2 ${y.toFixed(1)} Q ${(w * 0.3).toFixed(1)} ${(y + (rand() - 0.5) * 4).toFixed(1)}, ${(w * 0.6).toFixed(1)} ${(y + (rand() - 0.5) * 3).toFixed(1)} T ${w + 2} ${(y + (rand() - 0.5) * 4).toFixed(1)}`;
    cracks.push(
      <path key={i} d={d} stroke={grain} strokeWidth={(0.25 + rand() * 0.55).toFixed(2)} fill="none" opacity={(0.35 + rand() * 0.4).toFixed(2)} />
    );
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {cracks}
    </svg>
  );
}

function Slate({ tone = '#5a5c5e', grain = '#3a3c3e', w = 120, h = 80, seed = 4 }) {
  const rand = mulberry32(seed);
  const layers = [];
  let y = 0;
  let idx = 0;
  while (y < h) {
    const layerH = 4 + rand() * 9;
    const col = rand() < 0.45 ? grain : tone;
    layers.push(<rect key={'l' + idx} x="0" y={y.toFixed(1)} width={w} height={layerH.toFixed(1)} fill={col} opacity={(0.55 + rand() * 0.45).toFixed(2)} />);
    if (rand() < 0.65) {
      layers.push(<line key={'c' + idx} x1="0" y1={(y + layerH).toFixed(1)} x2={w} y2={(y + layerH + (rand() - 0.5)).toFixed(1)} stroke={grain} strokeWidth="0.6" opacity={(0.28 + rand() * 0.28).toFixed(2)} />);
    }
    y += layerH;
    idx++;
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {layers}
    </svg>
  );
}

function Limestone({ tone = '#d2c5a8', grain = '#a89c84', w = 120, h = 80, seed = 6 }) {
  const rand = mulberry32(seed);
  const dots = [];
  for (let i = 0; i < 200; i++) {
    dots.push(<circle key={i} cx={(rand() * w).toFixed(1)} cy={(rand() * h).toFixed(1)} r={(0.18 + rand() * 0.38).toFixed(2)} fill={grain} opacity={(0.07 + rand() * 0.13).toFixed(2)} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {dots}
    </svg>
  );
}

function Sandstone({ tone = '#c8a878', grain = '#8a6a48', w = 120, h = 80, seed = 8 }) {
  const rand = mulberry32(seed);
  const dots = [];
  for (let i = 0; i < 280; i++) {
    dots.push(<circle key={i} cx={(rand() * w).toFixed(1)} cy={(rand() * h).toFixed(1)} r={(0.2 + rand() * 0.85).toFixed(2)} fill={grain} opacity={(0.1 + rand() * 0.28).toFixed(2)} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {dots}
    </svg>
  );
}

function Terrazzo({ tone = '#d8d0c0', grain = '#7a6858', w = 120, h = 80, seed = 11 }) {
  const rand = mulberry32(seed);
  const chips = [];
  const palette = [grain, '#a89878', '#6a5848', tone];
  for (let i = 0; i < 58; i++) {
    const cx = rand() * w;
    const cy = rand() * h;
    const rx = 0.7 + rand() * 2.6;
    const ry = 0.4 + rand() * 1.6;
    const angle = rand() * 180;
    const col = palette[Math.floor(rand() * palette.length)];
    chips.push(
      <ellipse key={i} cx={cx.toFixed(1)} cy={cy.toFixed(1)} rx={rx.toFixed(1)} ry={ry.toFixed(1)}
        transform={`rotate(${angle.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})`}
        fill={col} opacity={(0.65 + rand() * 0.35).toFixed(2)} />
    );
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {chips}
    </svg>
  );
}

function PolishedConcrete({ tone = '#a6a39a', grain = '#7a786e', w = 120, h = 80, seed = 14 }) {
  const rand = mulberry32(seed);
  const dots = [];
  for (let i = 0; i < 48; i++) {
    dots.push(<circle key={i} cx={(rand() * w).toFixed(1)} cy={(rand() * h).toFixed(1)} r={(0.4 + rand() * 1.3).toFixed(2)} fill={grain} opacity={(0.12 + rand() * 0.2).toFixed(2)} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {dots}
      <rect x="0" y={h * 0.34} width={w} height={h * 0.11} fill="#fff" opacity="0.06" />
    </svg>
  );
}

function BoardFormed({ tone = '#9a9690', grain = '#6a6460', w = 120, h = 80 }) {
  const lines = [];
  for (let i = 0; i < 22; i++) {
    const y = (i * h) / 22;
    const isMajor = i % 4 === 0;
    lines.push(<line key={i} x1="0" y1={y.toFixed(1)} x2={w} y2={(y + (isMajor ? 0.5 : 0)).toFixed(1)} stroke={grain} strokeWidth={isMajor ? 0.85 : 0.3} opacity={isMajor ? 0.42 : 0.18} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {lines}
    </svg>
  );
}

function RawConcrete({ tone = '#8a8780', grain = '#5a5850', w = 120, h = 80, seed = 17 }) {
  const rand = mulberry32(seed);
  const dots = [];
  for (let i = 0; i < 95; i++) {
    dots.push(<circle key={i} cx={(rand() * w).toFixed(1)} cy={(rand() * h).toFixed(1)} r={(0.5 + rand() * 1.9).toFixed(2)} fill={grain} opacity={(0.18 + rand() * 0.34).toFixed(2)} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {dots}
    </svg>
  );
}

function Perforated({ tone = '#8a8a88', grain = '#1e1e1c', w = 120, h = 80 }) {
  const cols = 14, rows = 9;
  const cw = w / cols, rh = h / rows;
  const holes = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      holes.push(<circle key={r + '-' + c} cx={((c + 0.5) * cw).toFixed(1)} cy={((r + 0.5) * rh).toFixed(1)} r={(cw * 0.3).toFixed(2)} fill={grain} opacity="0.82" />);
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {holes}
    </svg>
  );
}

function Corten({ tone = '#a0522d', grain = '#7a3820', w = 120, h = 80, seed = 19 }) {
  const rand = mulberry32(seed);
  const palette = [tone, grain, '#c06820', '#8a4818', '#5a2c10'];
  const patches = [];
  for (let i = 0; i < 38; i++) {
    const cx = rand() * w;
    const cy = rand() * h;
    const col = palette[Math.floor(rand() * palette.length)];
    patches.push(<ellipse key={i} cx={cx.toFixed(1)} cy={cy.toFixed(1)} rx={(4 + rand() * 16).toFixed(1)} ry={(3 + rand() * 9).toFixed(1)} fill={col} opacity={(0.28 + rand() * 0.5).toFixed(2)} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {patches}
    </svg>
  );
}

function Hammered({ tone = '#5a5a5c', grain = '#3a3a3c', w = 120, h = 80, seed = 21 }) {
  const rand = mulberry32(seed);
  const dimples = [];
  for (let i = 0; i < 140; i++) {
    dimples.push(<circle key={i} cx={(rand() * w).toFixed(1)} cy={(rand() * h).toFixed(1)} r={(0.4 + rand() * 1.1).toFixed(2)} fill="#ffffff" opacity={(0.05 + rand() * 0.11).toFixed(2)} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {dimples}
    </svg>
  );
}

function ReededGlass({ tone = '#dce8ec', grain = '#b0c8d0', w = 120, h = 80 }) {
  const reeds = 12;
  const rw = w / reeds;
  const strips = [];
  for (let i = 0; i < reeds; i++) {
    const cx = i * rw + rw / 2;
    strips.push(
      <g key={i}>
        <rect x={(i * rw).toFixed(1)} y="0" width={rw.toFixed(1)} height={h} fill={tone} />
        <rect x={(i * rw).toFixed(1)} y="0" width={(rw * 0.22).toFixed(1)} height={h} fill={grain} opacity="0.38" />
        <rect x={(i * rw + rw * 0.78).toFixed(1)} y="0" width={(rw * 0.22).toFixed(1)} height={h} fill={grain} opacity="0.16" />
        <rect x={(cx - 0.5).toFixed(1)} y="0" width="1" height={h} fill="#fff" opacity="0.42" />
      </g>
    );
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      {strips}
    </svg>
  );
}

function FrostedGlass({ tone = '#eef2f4', grain = '#c8d4d8', w = 120, h = 80, seed = 23 }) {
  const rand = mulberry32(seed);
  const dots = [];
  for (let i = 0; i < 380; i++) {
    dots.push(<circle key={i} cx={(rand() * w).toFixed(1)} cy={(rand() * h).toFixed(1)} r={(0.25 + rand() * 0.65).toFixed(2)} fill={grain} opacity={(0.09 + rand() * 0.18).toFixed(2)} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {dots}
    </svg>
  );
}

function FlutedGlass({ tone = '#cce0e8', grain = '#90b8c4', w = 120, h = 80 }) {
  const flutes = 14;
  const fw = w / flutes;
  const stops = [];
  for (let i = 0; i < flutes; i++) {
    const cx = i * fw + fw / 2;
    stops.push(
      <g key={i}>
        <rect x={(i * fw).toFixed(1)} y="0" width={fw.toFixed(1)} height={h} fill={tone} />
        <rect x={(i * fw).toFixed(1)} y="0" width={(fw * 0.2).toFixed(1)} height={h} fill={grain} opacity="0.42" />
        <rect x={(i * fw + fw * 0.8).toFixed(1)} y="0" width={(fw * 0.2).toFixed(1)} height={h} fill={grain} opacity="0.18" />
        <rect x={(cx - 0.5).toFixed(1)} y="0" width="1" height={h} fill="#fff" opacity="0.5" />
      </g>
    );
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      {stops}
    </svg>
  );
}

function Leather({ tone = '#8c6842', grain = '#5c4228', w = 120, h = 80, seed = 26 }) {
  const rand = mulberry32(seed);
  const segs = [];
  for (let i = 0; i < 95; i++) {
    const x1 = rand() * w;
    const y1 = rand() * h;
    const angle = rand() * Math.PI * 2;
    const len = 2 + rand() * 5.5;
    segs.push(<line key={i} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={(x1 + Math.cos(angle) * len).toFixed(1)} y2={(y1 + Math.sin(angle) * len).toFixed(1)} stroke={grain} strokeWidth={(0.28 + rand() * 0.5).toFixed(2)} opacity={(0.18 + rand() * 0.32).toFixed(2)} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {segs}
    </svg>
  );
}

function Cane({ tone = '#d2bc88', grain = '#8a7248', w = 120, h = 80 }) {
  const spacing = 6;
  const lines = [];
  for (let i = -h; i < w + h; i += spacing) {
    lines.push(<line key={'a' + i} x1={i} y1="0" x2={i + h} y2={h} stroke={grain} strokeWidth="1.3" opacity="0.52" />);
    lines.push(<line key={'b' + i} x1={i + h} y1="0" x2={i} y2={h} stroke={grain} strokeWidth="1.3" opacity="0.52" />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {lines}
    </svg>
  );
}

function Boucle({ tone = '#e8e0d0', grain = '#a8a090', w = 120, h = 80, seed = 28 }) {
  const rand = mulberry32(seed);
  const loops = [];
  for (let i = 0; i < 130; i++) {
    loops.push(<circle key={i} cx={(rand() * w).toFixed(1)} cy={(rand() * h).toFixed(1)} r={(0.4 + rand() * 1.6).toFixed(2)} fill="none" stroke={grain} strokeWidth={(0.35 + rand() * 0.45).toFixed(2)} opacity={(0.28 + rand() * 0.38).toFixed(2)} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {loops}
    </svg>
  );
}

function VenetianPlaster({ tone = '#e8e2d4', grain = '#c4bca8', w = 120, h = 80, seed = 29 }) {
  const rand = mulberry32(seed);
  const strokes = [];
  for (let i = 0; i < 9; i++) {
    const x1 = rand() * w, y1 = rand() * h;
    const cx = rand() * w, cy = rand() * h;
    const x2 = rand() * w, y2 = rand() * h;
    strokes.push(<path key={i} d={`M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`} stroke={grain} strokeWidth={(4 + rand() * 9).toFixed(1)} fill="none" opacity={(0.07 + rand() * 0.11).toFixed(2)} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {strokes}
    </svg>
  );
}

function Limewash({ tone = '#dcd4c4', grain = '#b4aa98', w = 120, h = 80, seed = 30 }) {
  const rand = mulberry32(seed);
  const patches = [];
  for (let i = 0; i < 18; i++) {
    patches.push(<rect key={i} x={(rand() * w * 0.88).toFixed(1)} y={(rand() * h * 0.88).toFixed(1)} width={(8 + rand() * 32).toFixed(1)} height={(5 + rand() * 22).toFixed(1)} fill={grain} opacity={(0.09 + rand() * 0.18).toFixed(2)} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {patches}
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

function Mesh({ tone = '#8a8a88', grain = '#1e1e1c', w = 120, h = 80 }) {
  const cols = 10, rows = 7;
  const cw = w / cols, rh = h / rows;
  const holeW = cw * 0.55, holeH = rh * 0.55;
  const bars = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ox = r % 2 === 1 ? cw * 0.5 : 0;
      const hx = (c + 0.5) * cw + ox - holeW / 2;
      const hy = (r + 0.5) * rh - holeH / 2;
      bars.push(<rect key={r + '-' + c} x={hx.toFixed(1)} y={hy.toFixed(1)} width={holeW.toFixed(1)} height={holeH.toFixed(1)} fill={grain} opacity="0.78" rx="0.5" />);
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {bars}
    </svg>
  );
}

function Quilted({ tone = '#8c6842', grain = '#5c4228', w = 120, h = 80 }) {
  const spacing = 12;
  const lines = [];
  // Diagonal lines going one direction (shadow)
  for (let i = -h; i < w + h; i += spacing) {
    lines.push(<line key={'s' + i} x1={i} y1="0" x2={i + h} y2={h} stroke={grain} strokeWidth="0.6" opacity="0.32" />);
  }
  // Diagonal lines going other direction (shadow)
  for (let i = -h; i < w + h; i += spacing) {
    lines.push(<line key={'t' + i} x1={i + h} y1="0" x2={i} y2={h} stroke={grain} strokeWidth="0.6" opacity="0.32" />);
  }
  // Highlight lines offset +1px
  for (let i = -h; i < w + h; i += spacing) {
    lines.push(<line key={'hs' + i} x1={i + 1} y1="0" x2={i + h + 1} y2={h} stroke="#fff" strokeWidth="0.5" opacity="0.14" />);
    lines.push(<line key={'ht' + i} x1={i + h + 1} y1="0" x2={i + 1} y2={h} stroke="#fff" strokeWidth="0.5" opacity="0.14" />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {lines}
    </svg>
  );
}

function Ribbed({ tone = '#a67d52', grain = '#6b4a28', w = 120, h = 80 }) {
  // Horizontal channels — same logic as Fluted but transposed
  const ribs = 10;
  const rh = h / ribs;
  const stops = [];
  for (let i = 0; i < ribs; i++) {
    const cy = i * rh + rh / 2;
    stops.push(
      <g key={i}>
        <rect x="0" y={(i * rh).toFixed(1)} width={w} height={rh.toFixed(1)} fill={tone} />
        <rect x="0" y={(i * rh).toFixed(1)} width={w} height={(rh * 0.18).toFixed(1)} fill={grain} opacity="0.42" />
        <rect x="0" y={(i * rh + rh * 0.82).toFixed(1)} width={w} height={(rh * 0.18).toFixed(1)} fill={grain} opacity="0.18" />
        <rect x="0" y={(cy - 0.5).toFixed(1)} width={w} height="1" fill="#fff" opacity="0.16" />
      </g>
    );
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      {stops}
    </svg>
  );
}

function Herringbone({ tone = '#c8a878', grain = '#8a6a48', w = 120, h = 80 }) {
  const size = 8; // slat width
  const segs = [];
  let k = 0;
  for (let row = -2; row < h / size + 2; row++) {
    for (let col = -2; col < w / size + 2; col++) {
      const x = col * size * 2;
      const y = row * size * 2;
      const even = (row + col) % 2 === 0;
      // Each cell: two short slats at 45° and 135°
      if (even) {
        segs.push(<line key={'a' + k++} x1={x} y1={y} x2={x + size} y2={y + size} stroke={grain} strokeWidth={size * 0.55} strokeLinecap="butt" opacity="0.5" />);
        segs.push(<line key={'b' + k++} x1={x + size} y1={y} x2={x} y2={y + size} stroke={tone} strokeWidth={size * 0.55} strokeLinecap="butt" opacity="0.85" />);
      } else {
        segs.push(<line key={'c' + k++} x1={x} y1={y} x2={x + size} y2={y + size} stroke={tone} strokeWidth={size * 0.55} strokeLinecap="butt" opacity="0.85" />);
        segs.push(<line key={'d' + k++} x1={x + size} y1={y} x2={x} y2={y + size} stroke={grain} strokeWidth={size * 0.55} strokeLinecap="butt" opacity="0.5" />);
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {segs}
    </svg>
  );
}

function Scale({ tone = '#7a9aaa', grain = '#4a6a7a', w = 120, h = 80 }) {
  const sw2 = 16, sh = 12; // scale width and height
  const scales = [];
  let k = 0;
  for (let row = -1; row < h / sh + 1; row++) {
    for (let col = -1; col < w / sw2 + 1; col++) {
      const ox = row % 2 === 1 ? sw2 / 2 : 0;
      const cx = col * sw2 + ox + sw2 / 2;
      const cy = row * sh;
      // Arc: bottom of this scale is at cy, top arc peaks at cy-sh
      const d = `M ${(cx - sw2 / 2).toFixed(1)} ${cy.toFixed(1)} Q ${cx.toFixed(1)} ${(cy - sh).toFixed(1)}, ${(cx + sw2 / 2).toFixed(1)} ${cy.toFixed(1)}`;
      scales.push(<path key={k++} d={d} fill="none" stroke={grain} strokeWidth="0.8" opacity="0.55" />);
      // Subtle fill for depth
      scales.push(<path key={'f' + k++} d={d + ` L ${(cx - sw2 / 2).toFixed(1)} ${cy.toFixed(1)}`} fill={grain} opacity="0.08" />);
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={w} height={h} fill={tone} />
      {scales}
    </svg>
  );
}

function renderTextureKind(id, props) {
  switch (id) {
    case 'woodgrain': return <Woodgrain {...props} />;
    case 'veneer': return <Veneer {...props} />;
    case 'castellation': return <Castellation {...props} />;
    case 'fluted': return <Fluted {...props} />;
    case 'vj': return <VJ {...props} />;
    case 'wire-brushed': return <WireBrushed {...props} />;
    case 'charred': return <Charred {...props} />;
    case 'marble': return <Marble {...props} />;
    case 'travertine': return <Travertine {...props} />;
    case 'granite': case 'stone': return <Stone {...props} />;
    case 'slate': return <Slate {...props} />;
    case 'limestone': return <Limestone {...props} />;
    case 'sandstone': return <Sandstone {...props} />;
    case 'terrazzo': return <Terrazzo {...props} />;
    case 'polished-concrete': return <PolishedConcrete {...props} />;
    case 'board-formed': return <BoardFormed {...props} />;
    case 'raw-concrete': return <RawConcrete {...props} />;
    case 'brushed': return <Brushed {...props} />;
    case 'perforated': return <Perforated {...props} />;
    case 'corten': return <Corten {...props} />;
    case 'hammered': return <Hammered {...props} />;
    case 'reeded-glass': return <ReededGlass {...props} />;
    case 'frosted-glass': return <FrostedGlass {...props} />;
    case 'fluted-glass': return <FlutedGlass {...props} />;
    case 'weave': return <Weave {...props} />;
    case 'leather': return <Leather {...props} />;
    case 'cane': return <Cane {...props} />;
    case 'boucle': return <Boucle {...props} />;
    case 'venetian-plaster': return <VenetianPlaster {...props} />;
    case 'limewash': return <Limewash {...props} />;
    case 'mesh': return <Mesh {...props} />;
    case 'quilted': return <Quilted {...props} />;
    case 'ribbed': return <Ribbed {...props} />;
    case 'herringbone': return <Herringbone {...props} />;
    case 'scale': return <Scale {...props} />;
    default: return <Solid {...props} />;
  }
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
    const p = { ...props, grain: swatch.grain || swatch.vein || props.grain, vein: swatch.grain || swatch.vein || props.vein };
    switch (swatch.kind) {
      case 'image':
        return swatch.src
          ? <img src={swatch.src} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <Solid tone={swatch.tone || '#d8d3c6'} w={120} h={80} />;
      case 'texture': return renderTextureKind(swatch.materialId, p);
      case 'woodgrain': return <Woodgrain {...p} />;
      case 'veneer': return <Veneer {...p} />;
      case 'castellation': return <Castellation {...p} />;
      case 'fluted': return <Fluted {...p} />;
      case 'vj': return <VJ {...p} />;
      case 'wire-brushed': return <WireBrushed {...p} />;
      case 'charred': return <Charred {...p} />;
      case 'marble': return <Marble {...p} />;
      case 'travertine': return <Travertine {...p} />;
      case 'granite':
      case 'stone': return <Stone {...p} />;
      case 'slate': return <Slate {...p} />;
      case 'limestone': return <Limestone {...p} />;
      case 'sandstone': return <Sandstone {...p} />;
      case 'terrazzo': return <Terrazzo {...p} />;
      case 'polished-concrete': return <PolishedConcrete {...p} />;
      case 'board-formed': return <BoardFormed {...p} />;
      case 'raw-concrete': return <RawConcrete {...p} />;
      case 'brushed': return <Brushed {...p} />;
      case 'perforated': return <Perforated {...p} />;
      case 'corten': return <Corten {...p} />;
      case 'hammered': return <Hammered {...p} />;
      case 'reeded-glass': return <ReededGlass {...p} />;
      case 'frosted-glass': return <FrostedGlass {...p} />;
      case 'fluted-glass': return <FlutedGlass {...p} />;
      case 'weave': return <Weave {...p} />;
      case 'leather': return <Leather {...p} />;
      case 'cane': return <Cane {...p} />;
      case 'boucle': return <Boucle {...p} />;
      case 'venetian-plaster': return <VenetianPlaster {...p} />;
      case 'limewash': return <Limewash {...p} />;
      case 'mesh': return <Mesh {...p} />;
      case 'quilted': return <Quilted {...p} />;
      case 'ribbed': return <Ribbed {...p} />;
      case 'herringbone': return <Herringbone {...p} />;
      case 'scale': return <Scale {...p} />;
      case 'paint': return <Paint {...p} />;
      case 'solid': default: return <Solid {...p} />;
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

Object.assign(window, { Swatch, renderTextureKind });
