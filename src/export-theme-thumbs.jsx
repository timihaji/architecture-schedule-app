// Theme-picker thumbnails for the export wizard.
//
// Each thumbnail is a small HTML/CSS approximation of the direction's
// printed aesthetic — paper colour, type rhythm, header treatment,
// section/row block. Intentionally schematic (no real text) so the
// picker stays visually scannable.
//
// Themes that haven't been built yet still get a real thumbnail so
// the picker is complete; an overlaid "PROVISIONAL" pill warns the
// user that the actual output will currently render via D1.

(function () {
  if (typeof window === 'undefined') return;
  if (typeof document === 'undefined') return;

  if (!document.getElementById('exp-theme-thumb-styles')) {
    const s = document.createElement('style');
    s.id = 'exp-theme-thumb-styles';
    s.textContent = [
      '.etb { width: 100%; aspect-ratio: 0.707; padding: 8px 9px; display: flex; flex-direction: column; gap: 4px; overflow: hidden; position: relative; }',
      '.etb .row { display: flex; align-items: center; gap: 3px; }',
      '.etb .ttl { font-weight: 700; font-size: 8px; line-height: 1; letter-spacing: -0.02em; }',
      '.etb .eye { font-size: 5px; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.55; font-family: ui-monospace, monospace; }',
      '.etb .ln { height: 1.5px; flex: 1; opacity: 0.45; }',
      '.etb .ln.short { flex: 0 0 35%; }',
      '.etb .ln.mid { flex: 0 0 60%; }',
      '.etb .sw { width: 6px; height: 6px; flex-shrink: 0; }',
      '.etb .rule { height: 0.5px; opacity: 0.4; }',
      '.etb .bigfig { font-weight: 800; font-size: 14px; letter-spacing: -0.04em; line-height: 1; margin-top: 2px; }',
      '.etb-prov { position: absolute; top: 4px; right: 4px; font-family: ui-monospace, monospace; font-size: 5.5px; letter-spacing: 0.1em; padding: 2px 4px; background: rgba(138,48,32,0.92); color: #fff; font-weight: 600; border-radius: 2px; z-index: 2; text-transform: uppercase; }',
      '.etb-grid { display: grid; gap: 1.5px; }',
      '.etb-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ─── Per-theme thumbnail renderers ─────────────────────────────────
  // Each returns a React node. Use bare React.createElement so this
  // file doesn't need JSX transformation (consistent with the rest of
  // the wizard's CSS injection patterns).

  const React = window.React;
  const h = React.createElement;

  function row(props, ...children) { return h('div', { ...(props || {}), className: 'row' + (props && props.className ? ' ' + props.className : '') }, children); }

  function styleFor(palette) {
    return {
      paper:   palette.paper,
      ink:     palette.ink,
      ink3:    palette.ink3 || palette.ink,
      accent:  palette.accent || palette.ink,
      paper2:  palette.paper2 || palette.paper,
    };
  }

  // D1 · Studio Archive — cream paper, serif title block
  function thumbD1() {
    const p = styleFor({ paper: '#fbfaf5', ink: '#1a1815', ink3: '#6a665d', paper2: '#f3efe7' });
    return h('div', { className: 'etb', style: { background: p.paper, color: p.ink, fontFamily: 'Georgia, serif' } }, [
      h('div', { key: 'eye', className: 'eye' }, 'VOL IV · SCHEDULE'),
      h('div', { key: 'rule', className: 'rule', style: { background: p.ink } }),
      h('div', { key: 'ttl', className: 'ttl', style: { fontSize: 10, marginTop: 4 } }, 'Project'),
      h('div', { key: 'ttl2', className: 'ttl', style: { fontSize: 10 } }, 'Schedule'),
      h('div', { key: 'sub', style: { fontStyle: 'italic', fontSize: 5, marginTop: 2, opacity: 0.6 } }, 'A printable record …'),
      h('div', { key: 'sp', style: { flex: 1 } }),
      h('div', { key: 'rule2', className: 'rule', style: { background: p.ink, height: 1 } }),
      h('div', { key: 'fig', className: 'row', style: { marginTop: 3, alignItems: 'baseline' } }, [
        h('div', { key: 'lbl', style: { fontFamily: 'ui-monospace, monospace', fontSize: 4, letterSpacing: '0.1em', textTransform: 'uppercase', flex: 1 } }, 'Items · Groups'),
        h('div', { key: 'val', className: 'bigfig' }, '18'),
      ]),
    ]);
  }

  // D2 · Drafting Block — white, mono, title block + corners
  function thumbD2() {
    const p = styleFor({ paper: '#ffffff', ink: '#0d1b29', ink3: '#687785' });
    return h('div', { className: 'etb', style: { background: p.paper, color: p.ink, fontFamily: 'ui-monospace, monospace', padding: 6 } }, [
      // Corners
      h('div', { key: 'c1', style: { position: 'absolute', top: 3, left: 3, width: 6, height: 6, borderTop: '1px solid ' + p.ink, borderLeft: '1px solid ' + p.ink } }),
      h('div', { key: 'c2', style: { position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderTop: '1px solid ' + p.ink, borderRight: '1px solid ' + p.ink } }),
      h('div', { key: 'c3', style: { position: 'absolute', bottom: 3, left: 3, width: 6, height: 6, borderBottom: '1px solid ' + p.ink, borderLeft: '1px solid ' + p.ink } }),
      h('div', { key: 'c4', style: { position: 'absolute', bottom: 3, right: 3, width: 6, height: 6, borderBottom: '1px solid ' + p.ink, borderRight: '1px solid ' + p.ink } }),
      h('div', { key: 'strip', style: { borderTop: '1.5px solid ' + p.ink, borderBottom: '0.5px solid ' + p.ink, padding: '2px 4px', fontSize: 4, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 6 } }, 'SHEET CS·00'),
      h('div', { key: 'big', style: { fontSize: 10, fontWeight: 700, marginTop: 6, fontFamily: 'system-ui, sans-serif' } }, 'PROJECT'),
      h('div', { key: 'big2', style: { fontSize: 10, fontWeight: 700, fontFamily: 'system-ui, sans-serif' } }, 'SCHEDULE'),
      h('div', { key: 'sp', style: { flex: 1 } }),
      h('div', { key: 'tb', style: { border: '0.5px solid ' + p.ink, padding: 2, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 1, fontSize: 3, marginBottom: 4 } }, [
        h('div', { key: 'a', style: { padding: 2, borderRight: '0.5px solid ' + p.ink } }, 'Hollis & Arne'),
        h('div', { key: 'b', style: { padding: 2, borderRight: '0.5px solid ' + p.ink } }, '23·14'),
        h('div', { key: 'c', style: { padding: 2 } }, 'Rev C'),
      ]),
    ]);
  }

  // D3 · Vitrine — pure white, hairlines, massive numerals
  function thumbD3() {
    const p = styleFor({ paper: '#ffffff', ink: '#1a1815', ink3: '#8a8680' });
    return h('div', { className: 'etb', style: { background: p.paper, color: p.ink, fontFamily: 'system-ui, sans-serif' } }, [
      h('div', { key: 'eye', className: 'eye', style: { color: p.ink3 } }, 'VOL IV'),
      h('div', { key: 'sp1', style: { height: 8 } }),
      h('div', { key: 'big', style: { fontSize: 11, fontWeight: 300, letterSpacing: '-0.04em' } }, 'Project'),
      h('div', { key: 'big2', style: { fontSize: 11, fontWeight: 300, letterSpacing: '-0.04em' } }, 'Schedule'),
      h('div', { key: 'sp', style: { flex: 1 } }),
      h('div', { key: 'num', style: { fontSize: 28, fontWeight: 200, letterSpacing: '-0.05em', lineHeight: 0.85, color: p.ink3, marginTop: 4 } }, '03'),
      h('div', { key: 'rule', className: 'rule', style: { background: p.ink, marginTop: 2 } }),
      h('div', { key: 'meta', style: { fontFamily: 'ui-monospace, monospace', fontSize: 4, marginTop: 3, opacity: 0.5 } }, '18 items'),
    ]);
  }

  // D4 · Ledger — ivory paper, ruled lines, ornament
  function thumbD4() {
    const p = styleFor({ paper: '#f5f0e3', ink: '#2a2620', ink3: '#7a6f5c' });
    return h('div', { className: 'etb', style: { background: p.paper, color: p.ink, fontFamily: 'Georgia, serif', backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 11px, rgba(122,111,92,0.18) 11px, rgba(122,111,92,0.18) 12px)' } }, [
      h('div', { key: 'border', style: { border: '0.5px solid ' + p.ink, padding: '5px 4px', position: 'relative', height: '100%' } }, [
        h('div', { key: 'eye', style: { fontSize: 5, fontStyle: 'italic', color: p.ink3 } }, 'Being a printable record of'),
        h('div', { key: 'ttl', style: { fontSize: 9, fontWeight: 700, marginTop: 2 } }, 'Brunswick'),
        h('div', { key: 'ttl2', style: { fontSize: 9, fontWeight: 700 } }, 'Residence'),
        h('div', { key: 'orn', style: { textAlign: 'center', fontSize: 7, marginTop: 4, color: p.ink3 } }, '— § —'),
        h('div', { key: 'meta', style: { fontSize: 4, marginTop: 4, fontStyle: 'italic' } }, 'No. 23·14 · 22 April'),
        h('div', { key: 'sp', style: { flex: 1 } }),
        h('div', { key: 'fig', style: { borderTop: '1.5px solid ' + p.ink, paddingTop: 4, marginTop: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } }, [
          h('span', { key: 'l', style: { fontSize: 4, fontStyle: 'italic' } }, 'Sum total'),
          h('span', { key: 'v', style: { fontSize: 11, fontWeight: 700 } }, 'xviii'),
        ]),
      ]),
    ]);
  }

  // D5 · Folio — full-bleed terracotta cover
  function thumbD5() {
    return h('div', { className: 'etb', style: { background: '#a4543a', color: '#f5e9d8', fontFamily: 'Georgia, serif', padding: 0 } }, [
      h('div', { key: 'pad', style: { padding: '8px 8px', height: '100%', display: 'flex', flexDirection: 'column' } }, [
        h('div', { key: 'mark', style: { fontFamily: 'ui-monospace, monospace', fontSize: 4, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7 } }, '· HOLLIS & ARNE'),
        h('div', { key: 'sp1', style: { flex: 0.3 } }),
        h('div', { key: 'big', style: { fontSize: 12, fontStyle: 'italic', letterSpacing: '-0.02em', lineHeight: 1 } }, 'Project'),
        h('div', { key: 'big2', style: { fontSize: 12, fontStyle: 'italic', letterSpacing: '-0.02em', lineHeight: 1 } }, 'Schedule'),
        h('div', { key: 'deck', style: { fontSize: 4, fontStyle: 'italic', marginTop: 4, opacity: 0.85 } }, 'A printable record of every material specified.'),
        h('div', { key: 'sp', style: { flex: 1 } }),
        h('div', { key: 'fig', style: { borderTop: '0.5px solid #f5e9d8', paddingTop: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } }, [
          h('span', { key: 'l', style: { fontFamily: 'ui-monospace, monospace', fontSize: 3.5, letterSpacing: '0.1em', textTransform: 'uppercase' } }, 'Items'),
          h('span', { key: 'v', style: { fontSize: 13, fontWeight: 700, fontStyle: 'italic' } }, '18'),
        ]),
      ]),
    ]);
  }

  // D6 · Index — cool grey, mono, bar chart
  function thumbD6() {
    const p = styleFor({ paper: '#e8e9eb', ink: '#1a1d20', ink3: '#6a6d70' });
    return h('div', { className: 'etb', style: { background: p.paper, color: p.ink, fontFamily: 'ui-monospace, monospace' } }, [
      h('div', { key: 'eye', style: { fontSize: 4, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.55 } }, 'IV · 00 · SCHEDULE'),
      h('div', { key: 'big', style: { fontSize: 10, fontWeight: 800, fontFamily: 'system-ui, sans-serif', marginTop: 3, lineHeight: 1 } }, 'BRUNSWICK'),
      h('div', { key: 'big2', style: { fontSize: 10, fontWeight: 800, fontFamily: 'system-ui, sans-serif', lineHeight: 1 } }, 'RESIDENCE'),
      h('div', { key: 'sp', style: { flex: 0.5 } }),
      h('div', { key: 'bars', style: { fontSize: 3 } }, [
        ...['Floors','Walls','Joinery','Tapware','Stone','Lighting'].map((label, i) => h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 2, marginTop: 1.5 } }, [
          h('span', { key: 'l', style: { width: 22, fontSize: 3.5 } }, label),
          h('span', { key: 'bar', style: { background: p.ink, height: 2, width: (12 + i * 5) + 'px' } }),
        ])),
      ]),
      h('div', { key: 'sp2', style: { flex: 1 } }),
      h('div', { key: 'fig', style: { borderTop: '0.5px solid ' + p.ink, paddingTop: 2, display: 'flex', justifyContent: 'space-between', fontSize: 4 } }, [
        h('span', { key: 'l' }, 'GRAND TOTAL'),
        h('span', { key: 'v', style: { fontWeight: 800, fontSize: 8, fontFamily: 'system-ui, sans-serif' } }, '18'),
      ]),
    ]);
  }

  // D8 · Broadsheet — newspaper masthead
  function thumbD8() {
    const p = styleFor({ paper: '#fbfaf5', ink: '#1a1815', ink3: '#6a665d' });
    return h('div', { className: 'etb', style: { background: p.paper, color: p.ink, fontFamily: 'Georgia, serif' } }, [
      h('div', { key: 'mast', style: { fontSize: 11, fontWeight: 800, letterSpacing: '-0.04em', borderBottom: '1.5px solid ' + p.ink, paddingBottom: 2 } }, 'The Archive'),
      h('div', { key: 'subm', style: { fontSize: 4, fontFamily: 'system-ui, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, marginTop: 1 } }, 'No. 23·14 · 22 April 2026'),
      h('div', { key: 'rules', className: 'rule', style: { background: p.ink, marginTop: 3 } }),
      h('div', { key: 'kicker', style: { fontFamily: 'system-ui, sans-serif', fontSize: 4, fontWeight: 600, textTransform: 'uppercase', marginTop: 3, opacity: 0.7 } }, 'A Schedule in 18 Items'),
      h('div', { key: 'h1', style: { fontSize: 11, fontWeight: 700, marginTop: 2, lineHeight: 0.95, letterSpacing: '-0.02em' } }, 'Brunswick'),
      h('div', { key: 'h2', style: { fontSize: 11, fontWeight: 700, lineHeight: 0.95, letterSpacing: '-0.02em' } }, 'Residence'),
      h('div', { key: 'sp', style: { flex: 1 } }),
      h('div', { key: 'lead', style: { fontSize: 4, lineHeight: 1.3, opacity: 0.7, columnCount: 2, columnGap: 4 } }, 'The schedule that follows lists eighteen materials specified across six trades — floors, walls and ceilings, joinery, tapware…'),
    ]);
  }

  // D9 · Specimen — paint chip swatch book
  function thumbD9() {
    const tones = ['#9a7a55', '#5d5d5e', '#b48a5a', '#a8a195', '#b8985a', '#e7e2d4', '#a87d54', '#3a4748', '#e2dccb'];
    return h('div', { className: 'etb', style: { background: '#fbfaf5', color: '#1a1815', fontFamily: 'system-ui, sans-serif' } }, [
      h('div', { key: 'eye', className: 'eye' }, 'IV · SPECIMENS'),
      h('div', { key: 'ttl', style: { fontSize: 9, fontWeight: 600, marginTop: 2 } }, 'Project'),
      h('div', { key: 'ttl2', style: { fontSize: 9, fontWeight: 600 } }, 'Schedule'),
      h('div', { key: 'sp', style: { height: 4 } }),
      h('div', { key: 'chips', style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, flex: 1 } },
        tones.map((t, i) => h('div', { key: i, style: { background: t, minHeight: 0 } })),
      ),
      h('div', { key: 'rule', className: 'rule', style: { background: '#1a1815', marginTop: 2 } }),
      h('div', { key: 'meta', style: { fontFamily: 'ui-monospace, monospace', fontSize: 4, marginTop: 2, opacity: 0.6 } }, '18 specimens · 6 trades'),
    ]);
  }

  // D10 · Wabi-sabi — parchment, indigo ink, lots of breath
  function thumbD10() {
    return h('div', { className: 'etb', style: { background: '#efe8d4', color: '#1d2754', fontFamily: 'Georgia, serif', padding: '10px 11px' } }, [
      h('div', { key: 'eye', style: { fontSize: 4, fontStyle: 'italic', opacity: 0.6, letterSpacing: '0.05em' } }, '— iv —'),
      h('div', { key: 'sp', style: { flex: 1 } }),
      h('div', { key: 'big', style: { fontSize: 13, fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1, textAlign: 'right' } }, 'Project'),
      h('div', { key: 'big2', style: { fontSize: 13, fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1, textAlign: 'right' } }, 'Schedule'),
      h('div', { key: 'sp2', style: { flex: 1 } }),
      h('div', { key: 'rule', className: 'rule', style: { background: '#1d2754', marginTop: 2, height: '0.3px' } }),
      h('div', { key: 'meta', style: { fontSize: 4, fontStyle: 'italic', marginTop: 3, opacity: 0.7, textAlign: 'right' } }, 'eighteen items'),
    ]);
  }

  const THUMBS = {
    D1:  thumbD1,
    D2:  thumbD2,
    D3:  thumbD3,
    D4:  thumbD4,
    D5:  thumbD5,
    D6:  thumbD6,
    D8:  thumbD8,
    D9:  thumbD9,
    D10: thumbD10,
  };

  function ThemeThumb({ id, provisional }) {
    const fn = THUMBS[id];
    return h('div', { style: { position: 'relative', width: '100%' } }, [
      fn ? React.cloneElement(fn(), { key: 'thumb' }) : h('div', { key: 'thumb', className: 'etb', style: { background: '#fff' } }),
      provisional ? h('div', { key: 'prov', className: 'etb-prov' }, 'PROVISIONAL') : null,
    ]);
  }

  window.ExportThemeThumb = ThemeThumb;
})();
