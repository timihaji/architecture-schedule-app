// VisualPickerV7 — Colour / Pattern / Image picker for the v7 Edit Product
// drawer. Replaces the legacy SwatchEditor. Persists a single `swatch` object
// on the draft:
//
//   { mode: 'colour'|'pattern'|'image', kind: 'solid'|'pattern_v7'|'image',
//     tone: '#hex',
//     // colour mode:
//     colorName, palette, finish, finishOn,
//     // pattern mode:
//     patternId, patternFg, patternBg, patternScale,
//     // image mode:
//     src }
//
// Legacy drafts (kind ∈ {solid|paint|woodgrain|marble|…}) read back through
// the migration helper at the bottom of this file. Save shape stays canonical
// for downstream consumers — `kind` and `tone` are always set.
//
// Library and pattern definitions are inlined verbatim from
// design/handoff/latest/designs/Edit Product v7.html so the visual output
// matches the prototype 1:1.

(function () {
  // ─── Palettes ──────────────────────────────────────────────────────────────
  const PALETTES = {
    primary: { name: 'Primary', colors: [
      ['Crimson','#C8322C'],['Vermilion','#D44A23'],['Amber','#E0A02C'],
      ['Yolk','#E6C03A'],['Lime','#9BBE3A'],['Forest','#2E6F4A'],
      ['Teal','#1F7A87'],['Cobalt','#1F4FA8'],['Indigo','#2D2F8C'],
      ['Violet','#6B3A9B'],['Magenta','#B0307A'],['Rose','#D85A7A'],
    ]},
    metals: { name: 'Brushed Metals', colors: [
      ['Polished Chrome','#CDCFD2'],['Brushed Nickel','#9AA0A6'],['Polished Nickel','#E4E4E4'],
      ['Matte Black','#1A1A1A'],['Gunmetal','#3A3A3A'],['Graphite','#5A5A5C'],
      ['Brushed Brass','#A08660'],['Antique Brass','#8A6C3A'],['Champagne','#D4AF7A'],
      ['Polished Copper','#B87333'],['Aged Copper','#7A5A3F'],['Rose Gold','#C8907A'],
    ]},
    'warm-neutrals': { name: 'Warm Neutrals', colors: [
      ['Linen','#F2EEE5'],['Whisper White','#EFE9DA'],['Antique White','#EDE6D3'],
      ['Bone','#E8DFC8'],['Hog Bristle','#C8B89A'],['Hampton','#B8A988'],
      ['Camel','#A88B66'],['Taupe','#8E7C68'],['Mushroom','#9C8E78'],
      ['Driftwood','#7A6E5C'],['Earth','#5D5043'],['Espresso','#3D332A'],
    ]},
    'cool-neutrals': { name: 'Cool Neutrals', colors: [
      ['Chalk','#EEEEEE'],['Mist','#E0E2E2'],['Dove','#CFD2D0'],
      ['Pewter','#B6B7B5'],['Smoke','#9DA09F'],['Steel','#7E8385'],
      ['Slate','#5A6065'],['Charcoal','#3E4346'],['Graphite','#2A2D30'],
      ['Ink','#141618'],['Cool White','#F4F6F5'],['Silverleaf','#C8CCCC'],
    ]},
    earth: { name: 'Earth Tones', colors: [
      ['Clay','#B07A57'],['Terracotta','#A04E36'],['Burnt Sienna','#8E3F26'],
      ['Ochre','#C99B45'],['Mustard','#A87C2C'],['Saffron','#D08F2C'],
      ['Rust','#8E4326'],['Brick','#7A3A2C'],['Cinnamon','#9A5A38'],
      ['Olive','#6F6A3E'],['Moss','#5D6A38'],['Loam','#4A3F2C'],
    ]},
    botanic: { name: 'Botanic Greens', colors: [
      ['Sage','#9AA190'],['Eucalyptus','#7A8C7A'],['Tranquil Retreat','#7A8C6E'],
      ['Olive Court','#6B8A4E'],['Hawthorn','#3A6645'],['Forest','#28432D'],
      ['Lichen','#A6AE8E'],['Mint','#B6C4AE'],['Cypress','#445A45'],['Bottle','#1F3A2A'],
    ]},
    coastal: { name: 'Coastal', colors: [
      ['Surfmist','#DFDCD0'],['Sea Salt','#D6D9D2'],['Pebble','#BCBDB4'],
      ['Bone China Blue','#A8B3B0'],['Ocean Mist','#8FA0A2'],['Harbour','#647A82'],
      ['Bluestone','#5A6065'],['Deep Sea','#36474D'],['Sand','#D2C5A8'],['Driftwood','#A89578'],
    ]},
    heritage: { name: 'Heritage', colors: [
      ['Old White','#E0D8C4'],['Slipper Satin','#E8E2D4'],['Wevet','#ECE6DA'],
      ['Skimming Stone','#CFC6B4'],['Plummett','#867F76'],['Mole’s Breath','#5C5852'],
      ['Down Pipe','#4F5453'],['Railings','#2C2E2D'],['Studio Green','#2E4334'],
      ['Eating Room Red','#7C3838'],
    ]},
    jewel: { name: 'Jewel', colors: [
      ['Emerald','#1F5C44'],['Forest Jade','#28503D'],['Peacock','#1F4D5A'],
      ['Sapphire','#1E3A5F'],['Indigo','#2A2F5A'],['Aubergine','#3E2A3E'],
      ['Plum','#5A2C44'],['Garnet','#6E2A2E'],['Burgundy','#5A1F2A'],['Mulberry','#4A2538'],
    ]},
    monochrome: { name: 'Monochrome', colors: [
      ['Pure White','#FFFFFF'],['Paper','#F4F2EC'],['Bone','#E8E5DD'],
      ['Stone','#CFCBC1'],['Concrete','#A6A39A'],['Pewter','#7C7A74'],
      ['Lead','#56544F'],['Charcoal','#36352F'],['Soot','#1F1E1A'],['Pure Black','#000000'],
    ]},
    timber: { name: 'Timber Stains', colors: [
      ['White Oak','#D8C8A8'],['Natural Oak','#C8A878'],['Tasmanian Oak','#B89070'],
      ['Limed Ash','#B8AC90'],['American Oak','#A07840'],['Spotted Gum','#9A7048'],
      ['Blackbutt','#A88865'],['Smoked Oak','#8A6F4A'],['Walnut','#5A3F28'],['Wenge','#3A2820'],
    ]},
    stone: { name: 'Stone & Tile', colors: [
      ['Carrara','#EBE7DF'],['Calacatta','#F0EBE0'],['Statuario','#E8E3D5'],
      ['Travertine','#C8B89A'],['Limestone','#D2C5A8'],['Sandstone','#C8A878'],
      ['Terrazzo Bone','#DCD2BD'],['Terrazzo Pepper','#7A7468'],['Marble Grigio','#A8A49A'],
      ['Bluestone','#5A6065'],['Slate','#48474A'],['Basalt','#3A3A3A'],
    ]},
  };

  const FINISHABLE_PALETTES = new Set(['Brushed Metals', 'Metals', 'Metallic', 'metals']);

  // ─── Patterns ──────────────────────────────────────────────────────────────
  const PATTERNS = [
    { id:'checker', cat:'geometric', name:'Checker', size:'24px 24px',
      img:'linear-gradient(45deg, var(--fg) 25%, transparent 25%), linear-gradient(-45deg, var(--fg) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--fg) 75%), linear-gradient(-45deg, transparent 75%, var(--fg) 75%)',
      pos:'0 0, 0 12px, 12px -12px, -12px 0px' },
    { id:'tri-grid', cat:'geometric', name:'Triangle Grid', size:'24px 14px',
      img:'linear-gradient(60deg, var(--fg) 25%, transparent 25.5%, transparent 75%, var(--fg) 75%, var(--fg)), linear-gradient(120deg, var(--fg) 25%, transparent 25.5%, transparent 75%, var(--fg) 75%, var(--fg))' },
    { id:'diamonds', cat:'geometric', name:'Diamonds', size:'20px 20px',
      img:'linear-gradient(135deg, var(--fg) 25%, transparent 25%) -10px 0, linear-gradient(225deg, var(--fg) 25%, transparent 25%) -10px 0, linear-gradient(315deg, var(--fg) 25%, transparent 25%), linear-gradient(45deg, var(--fg) 25%, transparent 25%)' },
    { id:'hex-cells', cat:'geometric', name:'Hex Cells', size:'30px 52px',
      img:'radial-gradient(circle at 0 0, transparent 14px, var(--fg) 14.5px, var(--fg) 15.5px, transparent 16px), radial-gradient(circle at 30px 26px, transparent 14px, var(--fg) 14.5px, var(--fg) 15.5px, transparent 16px), radial-gradient(circle at 0 52px, transparent 14px, var(--fg) 14.5px, var(--fg) 15.5px, transparent 16px)' },
    { id:'crosshatch', cat:'geometric', name:'Cross Hatch', size:'12px 12px',
      img:'repeating-linear-gradient(45deg, var(--fg) 0 1px, transparent 1px 6px), repeating-linear-gradient(-45deg, var(--fg) 0 1px, transparent 1px 6px)' },
    { id:'plus-grid', cat:'geometric', name:'Plus Grid', size:'20px 20px',
      img:'linear-gradient(var(--fg) 1.5px, transparent 1.5px) 9px 0, linear-gradient(90deg, var(--fg) 1.5px, transparent 1.5px) 0 9px',
      pos:'9px 0, 0 9px' },
    { id:'argyle', cat:'geometric', name:'Argyle', size:'40px 40px',
      img:'linear-gradient(135deg, var(--fg) 12.5%, transparent 12.5% 87.5%, var(--fg) 87.5%), linear-gradient(45deg, var(--fg) 12.5%, transparent 12.5% 87.5%, var(--fg) 87.5%)' },
    { id:'h-stripe', cat:'lines', name:'Horizontal', size:'10px 10px',
      img:'repeating-linear-gradient(0deg, var(--fg) 0 1.5px, transparent 1.5px 10px)' },
    { id:'v-stripe', cat:'lines', name:'Vertical', size:'10px 10px',
      img:'repeating-linear-gradient(90deg, var(--fg) 0 1.5px, transparent 1.5px 10px)' },
    { id:'diag-fine', cat:'lines', name:'Diagonal Fine', size:'8px 8px',
      img:'repeating-linear-gradient(45deg, var(--fg) 0 1px, transparent 1px 8px)' },
    { id:'diag-bold', cat:'lines', name:'Diagonal Bold', size:'14px 14px',
      img:'repeating-linear-gradient(45deg, var(--fg) 0 4px, transparent 4px 14px)' },
    { id:'pinstripe', cat:'lines', name:'Pinstripe', size:'4px 4px',
      img:'repeating-linear-gradient(90deg, var(--fg) 0 0.5px, transparent 0.5px 4px)' },
    { id:'tickets', cat:'lines', name:'Tickets', size:'14px 14px',
      img:'repeating-linear-gradient(0deg, var(--fg) 0 2px, transparent 2px 6px, var(--fg) 6px 7px, transparent 7px 14px)' },
    { id:'corduroy', cat:'lines', name:'Corduroy', size:'6px 6px',
      img:'repeating-linear-gradient(90deg, var(--fg) 0 1px, transparent 1px 3px, var(--fg) 3px 3.5px, transparent 3.5px 6px)' },
    { id:'wavy', cat:'lines', name:'Wavy', size:'20px 6px',
      img:'radial-gradient(circle at 5px 6px, transparent 4px, var(--fg) 4.5px 5.5px, transparent 6px), radial-gradient(circle at 15px 0, transparent 4px, var(--fg) 4.5px 5.5px, transparent 6px)' },
    { id:'polka-sm', cat:'dots', name:'Polka Small', size:'12px 12px',
      img:'radial-gradient(var(--fg) 1.2px, transparent 1.6px)' },
    { id:'polka-md', cat:'dots', name:'Polka Medium', size:'18px 18px',
      img:'radial-gradient(var(--fg) 2.5px, transparent 3px)' },
    { id:'polka-lg', cat:'dots', name:'Polka Large', size:'26px 26px',
      img:'radial-gradient(var(--fg) 4px, transparent 4.5px)' },
    { id:'half-tone', cat:'dots', name:'Half-Tone', size:'16px 16px',
      img:'radial-gradient(var(--fg) 2px, transparent 2.5px), radial-gradient(var(--fg) 1px, transparent 1.5px)',
      pos:'0 0, 8px 8px' },
    { id:'dot-grid', cat:'dots', name:'Dot Grid', size:'14px 14px',
      img:'radial-gradient(var(--fg) 0.8px, transparent 1.2px)' },
    { id:'basket', cat:'weave', name:'Basket Weave', size:'16px 16px',
      img:'linear-gradient(45deg, var(--fg) 25%, transparent 25%, transparent 75%, var(--fg) 75%), linear-gradient(45deg, var(--fg) 25%, transparent 25%, transparent 75%, var(--fg) 75%)',
      pos:'0 0, 8px 8px' },
    { id:'herringbone', cat:'weave', name:'Herringbone', size:'20px 20px',
      img:'linear-gradient(135deg, var(--fg) 25%, transparent 25%) 0 0, linear-gradient(225deg, var(--fg) 25%, transparent 25%) 0 0, linear-gradient(315deg, var(--fg) 25%, transparent 25%) 10px 10px, linear-gradient(45deg, var(--fg) 25%, transparent 25%) 10px 10px' },
    { id:'tweed', cat:'weave', name:'Tweed', size:'8px 8px',
      img:'repeating-linear-gradient(45deg, var(--fg) 0 1px, transparent 1px 4px), repeating-linear-gradient(-45deg, var(--fg) 0 1px, transparent 1px 4px)' },
    { id:'linen', cat:'weave', name:'Linen', size:'4px 4px',
      img:'repeating-linear-gradient(0deg, var(--fg) 0 0.5px, transparent 0.5px 2px), repeating-linear-gradient(90deg, var(--fg) 0 0.5px, transparent 0.5px 2px)' },
    { id:'gabardine', cat:'weave', name:'Gabardine', size:'10px 10px',
      img:'repeating-linear-gradient(60deg, var(--fg) 0 1px, transparent 1px 4px)' },
    { id:'topo', cat:'organic', name:'Topographic', size:'40px 40px',
      img:'radial-gradient(ellipse at 20px 20px, transparent 14px, var(--fg) 14.5px 15px, transparent 16px), radial-gradient(ellipse at 20px 20px, transparent 8px, var(--fg) 8.5px 9px, transparent 10px)' },
    { id:'noise', cat:'organic', name:'Noise', size:'6px 6px',
      img:'radial-gradient(var(--fg) 0.4px, transparent 0.8px), radial-gradient(var(--fg) 0.3px, transparent 0.6px)',
      pos:'0 0, 3px 3px' },
    { id:'scales', cat:'organic', name:'Scales', size:'20px 12px',
      img:'radial-gradient(circle at 10px 0, var(--fg) 9px, transparent 10px), radial-gradient(circle at 0 12px, var(--fg) 9px, transparent 10px), radial-gradient(circle at 20px 12px, var(--fg) 9px, transparent 10px)' },
    { id:'subway', cat:'tile', name:'Subway', size:'28px 14px',
      img:'linear-gradient(0deg, var(--fg) 1px, transparent 1px), linear-gradient(90deg, var(--fg) 1px, transparent 1px), linear-gradient(90deg, var(--fg) 1px, transparent 1px)',
      pos:'0 0, 0 0, 14px 7px' },
    { id:'square-grout', cat:'tile', name:'Square Grout', size:'20px 20px',
      img:'linear-gradient(0deg, var(--fg) 1.2px, transparent 1.2px), linear-gradient(90deg, var(--fg) 1.2px, transparent 1.2px)' },
    { id:'penny', cat:'tile', name:'Penny', size:'14px 14px',
      img:'radial-gradient(circle at 7px 7px, transparent 5.5px, var(--fg) 6px 6.5px, transparent 7px)' },
    { id:'fishscale', cat:'tile', name:'Fish Scale', size:'24px 12px',
      img:'radial-gradient(circle at 12px 0, transparent 10px, var(--fg) 10.5px 11px, transparent 11.5px), radial-gradient(circle at 0 12px, transparent 10px, var(--fg) 10.5px 11px, transparent 11.5px), radial-gradient(circle at 24px 12px, transparent 10px, var(--fg) 10.5px 11px, transparent 11.5px)' },
    { id:'mosaic', cat:'tile', name:'Mosaic', size:'10px 10px',
      img:'linear-gradient(0deg, var(--fg) 1px, transparent 1px), linear-gradient(90deg, var(--fg) 1px, transparent 1px)' },
  ];

  // ─── Migration: legacy swatch → v7 ────────────────────────────────────────
  // Legacy kinds: solid|paint|woodgrain|veneer|castellation|fluted|vj|marble|
  //               travertine|stone|brushed|weave|image
  function migrateSwatchToV7(swatch) {
    const s = swatch || {};
    if (s.mode) return s; // already v7
    const out = Object.assign({}, s);
    if (s.kind === 'image' && s.src) {
      out.mode = 'image';
    } else if (['woodgrain','veneer','castellation','fluted','vj','marble','travertine','stone','brushed','weave'].includes(s.kind)) {
      out.mode = 'pattern';
      out.patternFg = s.grain || s.vein || '#1a1a1a';
      out.patternBg = s.tone || '#f3efe7';
      out.patternScale = 1;
      // Best-effort id mapping from legacy kind to v7 pattern.
      out.patternId = ({
        woodgrain: 'h-stripe', veneer: 'h-stripe', castellation: 'v-stripe',
        fluted: 'pinstripe', vj: 'v-stripe', marble: 'topo', travertine: 'noise',
        stone: 'speckle', brushed: 'diag-fine', weave: 'tweed',
      })[s.kind] || 'h-stripe';
    } else {
      out.mode = 'colour';
      out.colorName = s.colorName || '';
      out.palette = s.palette || null;
      out.finish = s.finish || null;
      out.finishOn = !!s.finishOn;
    }
    if (!out.tone) out.tone = s.tone || '#cdcfd2';
    return out;
  }

  function findPaletteForHex(hex) {
    const H = (hex || '').toUpperCase();
    for (const [key, p] of Object.entries(PALETTES)) {
      const found = p.colors.find(([_, h]) => h.toUpperCase() === H);
      if (found) return { palKey: key, palName: p.name, name: found[0], hex: found[1] };
    }
    return null;
  }

  // ─── Component ────────────────────────────────────────────────────────────
  function VisualPickerV7({ swatch, setSwatch, materials }) {
    const sw = React.useMemo(() => migrateSwatchToV7(swatch), [swatch]);
    const mode = sw.mode || 'colour';

    function update(patch) {
      // setSwatch(key, value) was the legacy interface; assume same.
      if (typeof setSwatch === 'function') {
        Object.keys(patch).forEach(k => setSwatch(k, patch[k]));
      }
    }

    // Selected indicator background
    const selBg = React.useMemo(() => {
      if (mode === 'image' && sw.src) {
        return {
          background: '#000',
          backgroundImage: 'url(' + sw.src + ')',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        };
      }
      if (mode === 'pattern' && sw.patternId) {
        const pat = PATTERNS.find(p => p.id === sw.patternId);
        if (pat) {
          const css = pat.img.replace(/var\(--fg\)/g, sw.patternFg || '#1a1a1a').replace(/var\(--bg\)/g, sw.patternBg || '#f3efe7');
          const scaled = pat.size.split(' ').map(s => {
            const n = parseFloat(s); const u = s.replace(/[\d.]+/g, '');
            return (n * (sw.patternScale || 1)) + u;
          }).join(' ');
          return {
            background: sw.patternBg || '#f3efe7',
            backgroundImage: css,
            backgroundSize: scaled,
            backgroundPosition: pat.pos || undefined,
          };
        }
      }
      return { background: sw.tone || '#cdcfd2' };
    }, [mode, sw.tone, sw.src, sw.patternId, sw.patternFg, sw.patternBg, sw.patternScale]);

    const finishClass = (mode === 'colour' && sw.finishOn && sw.finish) ? ('surf-' + sw.finish) : '';
    const isFinishablePalette = mode === 'colour' && sw.palette && FINISHABLE_PALETTES.has(sw.palette);

    // ── Helpers ──
    function pickColor(name, hex, fromPaletteKey) {
      const paletteName = PALETTES[fromPaletteKey] ? PALETTES[fromPaletteKey].name : fromPaletteKey;
      update({
        mode: 'colour', kind: 'solid',
        tone: hex, colorName: name, palette: paletteName,
        // Reset image/pattern data
        src: null, patternId: null,
      });
    }

    function pickPattern(patternId) {
      update({
        mode: 'pattern', kind: 'pattern_v7',
        patternId,
        patternFg: sw.patternFg || '#1a1a1a',
        patternBg: sw.patternBg || '#f3efe7',
        patternScale: sw.patternScale || 1,
      });
    }

    function pickImageFromFile(file) {
      if (!file || !file.type || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        update({
          mode: 'image', kind: 'image',
          src: reader.result,
          imgName: file.name,
        });
      };
      reader.readAsDataURL(file);
    }

    function setMode(m) {
      update({ mode: m });
    }

    function clearSelection() {
      if (mode === 'colour') update({ tone: '#FFFFFF', colorName: '', palette: null, finishOn: false });
      else if (mode === 'pattern') update({ patternId: null });
      else if (mode === 'image') update({ src: null, imgName: '' });
    }

    return (
      <div className="cf-block">
        {/* Mode toggle */}
        <div className="cf-mode-row">
          <div className="cf-mode-toggle" role="tablist">
            {['colour','pattern','image'].map(m => (
              <button key={m} type="button"
                className={'cf-mode-btn' + (mode === m ? ' on' : '')}
                onClick={() => setMode(m)}>
                {m === 'colour' ? 'Colour' : m === 'pattern' ? 'Pattern' : 'Image'}
              </button>
            ))}
          </div>
        </div>

        {/* Selected indicator */}
        <div className="var-d"
          data-finishable={isFinishablePalette ? 'true' : 'false'}
          data-finish-on={sw.finishOn ? 'true' : 'false'}>
          <div className={'var-d-sw ' + finishClass} style={selBg} />
          <div className="var-d-body">
            <button type="button" className="var-d-x" title="Clear" onClick={clearSelection}>×</button>
            <div className="var-d-eyebrow">Selected</div>
            <div className="var-d-name">
              {mode === 'colour'
                ? (sw.colorName || 'No colour')
                : mode === 'pattern'
                  ? (sw.patternId ? (PATTERNS.find(p => p.id === sw.patternId)?.name || 'Pattern') : 'No pattern')
                  : (sw.imgName || (sw.src ? 'Image' : 'No image'))}
            </div>
            <div className="var-d-from">
              {mode === 'colour' && (
                <>
                  <span>{(sw.tone || '').toUpperCase()}</span>
                  {sw.palette && <> · from <b>{sw.palette}</b></>}
                </>
              )}
              {mode === 'pattern' && (
                <span>{(sw.patternFg || '').toUpperCase()} / {(sw.patternBg || '').toUpperCase()}</span>
              )}
              {mode === 'image' && sw.src && <span>Uploaded image</span>}
            </div>
            {isFinishablePalette && (
              <button type="button"
                className={'var-d-finish-toggle' + (sw.finishOn ? ' active' : '')}
                onClick={() => {
                  if (sw.finishOn) update({ finishOn: false, finish: null });
                  else update({ finishOn: true, finish: sw.finish || 'polished' });
                }}>
                <span className="plus">+</span>
                {sw.finishOn ? ' Remove metal finish' : ' Add metal finish'}
              </button>
            )}
            {isFinishablePalette && sw.finishOn && (
              <div className="var-d-finish-row">
                <span className="var-d-finish-lbl">Finish</span>
                <div className="var-d-finish-chips">
                  {['polished','brushed','matte'].map(f => (
                    <button key={f} type="button"
                      className={'var-d-finish-chip' + (sw.finish === f ? ' on' : '')}
                      onClick={() => update({ finish: f })}>
                      <span className={'dot surf-' + f} />{f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <span className="var-d-finish-note" title="Finish is a visual preview only.">Visual only</span>
              </div>
            )}
          </div>
        </div>

        {/* Body panel */}
        {mode === 'colour' && (
          <ColourPanel sw={sw} pickColor={pickColor} />
        )}
        {mode === 'pattern' && (
          <PatternPanel sw={sw} update={update} />
        )}
        {mode === 'image' && (
          <ImagePanel sw={sw} pickImageFromFile={pickImageFromFile} />
        )}
      </div>
    );
  }

  // ─── Colour panel ──────────────────────────────────────────────────────────
  function ColourPanel({ sw, pickColor }) {
    // Initial palette: detect from current hex, else metals.
    const initialPaletteKey = React.useMemo(() => {
      const found = findPaletteForHex(sw.tone);
      return found ? found.palKey : (Object.keys(PALETTES).find(k => PALETTES[k].name === sw.palette) || 'metals');
    }, [sw.tone, sw.palette]);
    const [palKey, setPalKey] = React.useState(initialPaletteKey);
    const [customOpen, setCustomOpen] = React.useState(false);
    const [hexInput, setHexInput] = React.useState(sw.tone || '#CDCFD2');
    const [nameInput, setNameInput] = React.useState('');

    React.useEffect(() => { setHexInput(sw.tone || '#CDCFD2'); }, [sw.tone]);

    const pal = PALETTES[palKey];

    return (
      <>
        <div className="cf-palette-row">
          <span className="cf-palette-lbl">Palette</span>
          <div className="cf-palette-chips" role="tablist">
            {Object.entries(PALETTES).map(([key, p]) => (
              <button key={key} type="button"
                className="cf-chip"
                aria-selected={key === palKey}
                onClick={() => setPalKey(key)}>
                {p.name} <span className="cf-chip-ct">{p.colors.length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="cf-swatch-grid">
          {pal && pal.colors.map(([name, hex]) => {
            const selected = (sw.tone || '').toUpperCase() === hex.toUpperCase()
              && (sw.colorName === name);
            return (
              <button key={hex + name} type="button"
                className="cf-sw"
                aria-selected={selected}
                style={{ '--c': hex }}
                onClick={() => pickColor(name, hex, palKey)}>
                <span className="cf-sw-tile" style={{ background: hex }} />
                <span className="cf-sw-nm">{name}</span>
              </button>
            );
          })}
          <button type="button" className="cf-sw cf-sw-add"
            title="Add custom hex"
            onClick={() => setCustomOpen(v => !v)}>
            <span className="cf-sw-tile cf-sw-tile-add">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v10M3 8h10"/></svg>
            </span>
            <span className="cf-sw-nm">Custom…</span>
          </button>
        </div>
        {customOpen && (
          <div className="cf-custom">
            <span className="cf-custom-lbl">Hex</span>
            <input className="cf-custom-inp" value={hexInput} maxLength={7}
              onChange={e => setHexInput(e.target.value)} />
            <input className="cf-custom-pick" type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(hexInput) ? hexInput : '#cdcfd2'}
              onChange={e => setHexInput(e.target.value.toUpperCase())} />
            <input className="cf-custom-name" placeholder="Name (optional)"
              value={nameInput} onChange={e => setNameInput(e.target.value)} />
            <button type="button" className="cf-custom-add" onClick={() => {
              if (!/^#[0-9a-fA-F]{6}$/.test(hexInput)) return;
              pickColor(nameInput || hexInput.toUpperCase(), hexInput.toUpperCase(), 'Custom');
              setCustomOpen(false);
              setNameInput('');
            }}>Add to palette</button>
          </div>
        )}
      </>
    );
  }

  // ─── Pattern panel ─────────────────────────────────────────────────────────
  function PatternPanel({ sw, update }) {
    const [cat, setCat] = React.useState('all');
    const list = cat === 'all' ? PATTERNS : PATTERNS.filter(p => p.cat === cat);
    const fg = sw.patternFg || '#1a1a1a';
    const bg = sw.patternBg || '#f3efe7';
    const scale = sw.patternScale || 1;
    const [cpTarget, setCpTarget] = React.useState(null); // 'fg' | 'bg' | null
    const [cpPalKey, setCpPalKey] = React.useState(() => {
      const f = findPaletteForHex(fg);
      return f ? f.palKey : 'metals';
    });
    const cpRef = React.useRef(null);

    // Close popover on outside click
    React.useEffect(() => {
      if (!cpTarget) return;
      function onDown(e) {
        if (cpRef.current && cpRef.current.contains(e.target)) return;
        if (e.target.closest && e.target.closest('.cf-pat-color-sw')) return;
        setCpTarget(null);
      }
      document.addEventListener('mousedown', onDown);
      return () => document.removeEventListener('mousedown', onDown);
    }, [cpTarget]);

    function pickCpColor(hex) {
      const HEX = hex.toUpperCase();
      if (cpTarget === 'fg') update({ patternFg: HEX });
      else if (cpTarget === 'bg') update({ patternBg: HEX });
      setCpTarget(null);
    }

    return (
      <>
        <div className="cf-pat-controls">
          <div className="cf-pat-color">
            <span className="cf-pat-lbl">FG</span>
            <button type="button" className="cf-pat-color-sw" style={{ background: fg }}
              title="Choose foreground"
              onClick={e => { e.stopPropagation(); setCpTarget(cpTarget === 'fg' ? null : 'fg'); }} />
            <span className="cf-pat-color-nm">{(findPaletteForHex(fg) || {}).name || fg}</span>
          </div>
          <div className="cf-pat-color">
            <span className="cf-pat-lbl">BG</span>
            <button type="button" className="cf-pat-color-sw" style={{ background: bg }}
              title="Choose background"
              onClick={e => { e.stopPropagation(); setCpTarget(cpTarget === 'bg' ? null : 'bg'); }} />
            <span className="cf-pat-color-nm">{(findPaletteForHex(bg) || {}).name || bg}</span>
          </div>
          <button type="button" className="cf-pat-swap" title="Swap FG/BG"
            onClick={() => update({ patternFg: bg, patternBg: fg })}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M3 6h9l-2-2M13 10H4l2 2"/></svg>
          </button>
          <span className="cf-pat-grow" />
          <label className="cf-pat-scale">
            <span>Scale</span>
            <input type="range" min="50" max="200" value={Math.round(scale * 100)}
              onChange={e => update({ patternScale: Number(e.target.value) / 100 })} />
          </label>
        </div>

        {cpTarget && (
          <div ref={cpRef} className="cf-cp">
            <div className={'cf-cp-arrow' + (cpTarget === 'bg' ? ' bg' : '')} />
            <div className="cf-cp-head">
              <span className="cf-cp-eyebrow">{cpTarget === 'fg' ? 'Foreground' : 'Background'}</span>
              <button type="button" className="cf-cp-close" onClick={() => setCpTarget(null)}>×</button>
            </div>
            <div className="cf-cp-pal-row">
              {Object.entries(PALETTES).map(([key, p]) => (
                <button key={key} type="button"
                  className="cf-cp-pal"
                  aria-selected={key === cpPalKey}
                  onClick={() => setCpPalKey(key)}>{p.name}</button>
              ))}
            </div>
            <div className="cf-cp-grid">
              {(PALETTES[cpPalKey] || PALETTES.metals).colors.map(([name, hex]) => {
                const cur = cpTarget === 'fg' ? fg : bg;
                return (
                  <button key={hex + name} type="button"
                    className="cf-cp-sw"
                    title={name + ' · ' + hex.toUpperCase()}
                    aria-selected={hex.toUpperCase() === cur.toUpperCase()}
                    style={{ background: hex }}
                    onClick={() => pickCpColor(hex)} />
                );
              })}
            </div>
          </div>
        )}

        <div className="cf-pat-cat-row">
          {['all','geometric','lines','dots','weave','organic','tile'].map(c => (
            <button key={c} type="button"
              className={'cf-pat-cat' + (cat === c ? ' on' : '')}
              onClick={() => setCat(c)}>{c.charAt(0).toUpperCase() + c.slice(1)}</button>
          ))}
        </div>

        <div className="cf-pat-grid">
          {list.map(pat => {
            const css = pat.img.replace(/var\(--fg\)/g, fg).replace(/var\(--bg\)/g, bg);
            const scaled = pat.size.split(' ').map(s => {
              const n = parseFloat(s); const u = s.replace(/[\d.]+/g, '');
              return (n * scale) + u;
            }).join(' ');
            const selected = sw.patternId === pat.id;
            return (
              <button key={pat.id} type="button"
                className="cf-pat-tile"
                aria-selected={selected}
                style={{ '--bg': bg, '--pat': css, '--ps': scaled }}
                onClick={() => update({ mode: 'pattern', kind: 'pattern_v7', patternId: pat.id })}>
                <span className="cf-pat-tile-sw"
                  style={pat.pos ? { backgroundPosition: pat.pos } : undefined} />
                <span className="cf-pat-tile-nm">{pat.name}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  // ─── Image panel ───────────────────────────────────────────────────────────
  function ImagePanel({ sw, pickImageFromFile }) {
    const fileRef = React.useRef(null);
    const [dragOver, setDragOver] = React.useState(false);

    function onDrop(e) {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) pickImageFromFile(f);
    }

    return (
      <>
        <div className={'cf-img-drop' + (dragOver ? ' dragover' : '')}
          onDragEnter={e => { e.preventDefault(); setDragOver(true); }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
          onDrop={onDrop}>
          <div className="cf-img-drop-inner">
            <svg className="cf-img-drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div className="cf-img-drop-h">
              Drop an image, or <button type="button" className="cf-img-browse"
                onClick={() => fileRef.current && fileRef.current.click()}>browse files</button>
            </div>
            <div className="cf-img-drop-meta">JPG · PNG · WEBP · up to 20 MB</div>
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={e => { if (e.target.files && e.target.files[0]) pickImageFromFile(e.target.files[0]); }} />
          </div>
        </div>
      </>
    );
  }

  // ─── Mini swatch for the drawer header (uses the same render rules) ───────
  function SwatchMini({ swatch, style }) {
    const sw = migrateSwatchToV7(swatch);
    let bgStyle = { background: sw.tone || '#cdcfd2' };
    let cls = '';
    if (sw.mode === 'image' && sw.src) {
      bgStyle = { background: '#000', backgroundImage: 'url(' + sw.src + ')', backgroundSize: 'cover', backgroundPosition: 'center' };
    } else if (sw.mode === 'pattern' && sw.patternId) {
      const pat = PATTERNS.find(p => p.id === sw.patternId);
      if (pat) {
        const css = pat.img.replace(/var\(--fg\)/g, sw.patternFg || '#1a1a1a').replace(/var\(--bg\)/g, sw.patternBg || '#f3efe7');
        const scaled = pat.size.split(' ').map(s => {
          const n = parseFloat(s); const u = s.replace(/[\d.]+/g, '');
          return (n * (sw.patternScale || 1)) + u;
        }).join(' ');
        bgStyle = {
          background: sw.patternBg || '#f3efe7',
          backgroundImage: css,
          backgroundSize: scaled,
          backgroundPosition: pat.pos || undefined,
        };
      }
    } else if (sw.mode === 'colour' && sw.finishOn && sw.finish) {
      cls = ' surf-' + sw.finish;
    }
    return <div className={'sw-mini' + cls} style={Object.assign({}, bgStyle, style || {})} />;
  }

  Object.assign(window, {
    VisualPickerV7,
    SwatchMini,
    PALETTES_V7: PALETTES,
    PATTERNS_V7: PATTERNS,
    migrateSwatchToV7,
    findPaletteForHexV7: findPaletteForHex,
  });
})();
