// Themed pdfmake renderers for Project Schedule exports.
//
// Nine visual directions (D1, D2, D3, D4, D5, D6, D8, D9, D10 —
// D7 is explicitly cut). Each theme implements two builders:
//
//   buildCoverGrouped({ project, data, content, revision, builder })
//   buildTable       ({ project, data, content, revision, builder })
//
// Both return a pdfmake doc-fragment of shape:
//   { content: [...], header?: fn, footer?: fn, background?: fn,
//     styles?: {...}, defaultStyle?: {...} }
//
// The wizard merges the fragment into the docDef along with the
// wizard-owned settings (paper size, orientation, watermark, info).
//
// The profile (export-profile-schedule.jsx) enriches each card with
// pre-computed display strings (location, brand, supplier, finish,
// colour, dims) so themes stay focused on visual identity. The
// schedule profile carries NO pricing — qty/rate/total/subtotal/
// grandTotal from the mockups are dropped; figures show item / group
// counts instead.
//
// Phase 1 ships D1 (Studio Archive) at full fidelity. Phases 2–5
// replace each D2–D10 stub with a real implementation. Until then,
// the stubs render via D1 with a small "provisional" badge.

(function () {
  if (typeof window === 'undefined') return;
  const B = window.expPdf;
  if (!B) {
    console.error('[export-themes] requires window.expPdf — load src/export-pdf-builder.jsx first.');
    return;
  }

  const pad2 = (n) => String(n).padStart(2, '0');

  // ─── Card visibility helpers ────────────────────────────────────────
  // Themes share these so the column subset stays consistent across
  // all 9 directions (driven by the user's content toggles).
  function tableCols(content) {
    return [
      { id: 'code',     show: true },
      { id: 'material', show: true },
      { id: 'element',  show: !!content.element },
      { id: 'location', show: !!content.location },
      { id: 'supplier', show: !!content.supplier },
      { id: 'trade',    show: !!content.trade },
      { id: 'sku',      show: !!content.sku },
    ].filter(c => c.show);
  }

  // ═════════════════════════════════════════════════════════════════════
  // D1 · STUDIO ARCHIVE
  // Editorial cream. Cormorant Garamond + Inter + JetBrains Mono.
  // Warm bands, italic decks. Medium density. The current direction,
  // polished.
  // ═════════════════════════════════════════════════════════════════════

  const D1_PALETTE = {
    paper:   '#fbfaf5',
    paper2:  '#f3efe7',
    ink:     '#1a1815',
    ink2:    '#2c2924',
    ink3:    '#6a665d',
    ink4:    '#9a958a',
    rule:    '#1a1815',
    rule2:   '#c8c2b3',
    rule3:   '#e3decf',
    accent:  '#8a3020',
  };

  const D1_STYLES = {
    // Cover
    d1CoverMark:    { font: 'Cormorant', fontSize: 18, bold: true,    color: D1_PALETTE.ink, lineHeight: 1.0 },
    d1CoverEye:     { font: 'JetBrainsMono', fontSize: 9, characterSpacing: 1.8, color: D1_PALETTE.ink3 },
    d1CoverTitle:   { font: 'Cormorant', fontSize: 56, bold: true,    color: D1_PALETTE.ink, lineHeight: 0.98 },
    d1CoverSub:     { font: 'Cormorant', fontSize: 16, italics: true, color: D1_PALETTE.ink2, lineHeight: 1.35 },
    d1MetaK:        { font: 'JetBrainsMono', fontSize: 7.5, characterSpacing: 1.4, color: D1_PALETTE.ink3 },
    d1MetaV:        { font: 'Inter',         fontSize: 10.5, bold: true, color: D1_PALETTE.ink },
    d1MetaVMono:    { font: 'JetBrainsMono', fontSize: 9.5,  color: D1_PALETTE.ink },
    d1FigLbl:       { font: 'JetBrainsMono', fontSize: 9, characterSpacing: 1.6, color: D1_PALETTE.ink2, bold: true },
    d1FigLblSub:    { font: 'Cormorant', fontSize: 13, italics: true, color: D1_PALETTE.ink3 },
    d1FigVal:       { font: 'Cormorant', fontSize: 40, bold: true, color: D1_PALETTE.ink },

    // Section page
    d1SectNum:      { font: 'JetBrainsMono', fontSize: 11, characterSpacing: 0.6, color: D1_PALETTE.ink3 },
    d1SectTtl:      { font: 'Cormorant', fontSize: 28, bold: true, color: D1_PALETTE.ink, lineHeight: 1.0 },
    d1SectCt:       { font: 'JetBrainsMono', fontSize: 8.5, characterSpacing: 1.4, color: D1_PALETTE.ink3 },

    // Tables
    d1TH:           { font: 'JetBrainsMono', fontSize: 7.5, characterSpacing: 1.6, color: D1_PALETTE.ink2, bold: true },
    d1TD:           { font: 'Inter',         fontSize: 9.5, color: D1_PALETTE.ink },
    d1TDMono:       { font: 'JetBrainsMono', fontSize: 9,   characterSpacing: 0.4, color: D1_PALETTE.ink3 },
    d1TDName:       { font: 'Inter',         fontSize: 9.5, bold: true, color: D1_PALETTE.ink },
    d1TDLoc:        { font: 'JetBrainsMono', fontSize: 7.5, characterSpacing: 0.4, color: D1_PALETTE.ink3 },
    d1TDMuted:      { font: 'Inter',         fontSize: 8.5, color: D1_PALETTE.ink3 },
    d1Band:         { font: 'JetBrainsMono', fontSize: 8,   characterSpacing: 1.8, bold: true, color: D1_PALETTE.ink },

    // Compact table head (A3)
    d1AHeadEye:     { font: 'JetBrainsMono', fontSize: 8.5, characterSpacing: 1.6, color: D1_PALETTE.ink3 },
    d1AHeadTtl:     { font: 'Cormorant', fontSize: 30, bold: true, color: D1_PALETTE.ink, lineHeight: 1.0 },
    d1AHeadMeta:    { font: 'JetBrainsMono', fontSize: 8.5, characterSpacing: 0.8, color: D1_PALETTE.ink3 },
    d1AHeadRev:     { font: 'JetBrainsMono', fontSize: 9, characterSpacing: 0.6, color: D1_PALETTE.ink, bold: true },

    // Running chrome
    d1RH:           { font: 'JetBrainsMono', fontSize: 7.5, characterSpacing: 1.3, color: D1_PALETTE.ink3 },
    d1RHStrong:     { font: 'JetBrainsMono', fontSize: 7.5, characterSpacing: 1.3, color: D1_PALETTE.ink, bold: true },
    d1Foot:         { font: 'JetBrainsMono', fontSize: 7.5, characterSpacing: 1.2, color: D1_PALETTE.ink3 },
    d1FootPn:       { font: 'JetBrainsMono', fontSize: 7.5, characterSpacing: 1.2, color: D1_PALETTE.ink, bold: true },

    // Summary page (end of cover-grouped)
    d1SumEye:       { font: 'JetBrainsMono', fontSize: 9, characterSpacing: 1.6, color: D1_PALETTE.ink3 },
    d1SumTtl:       { font: 'Cormorant', fontSize: 30, bold: true, color: D1_PALETTE.ink, lineHeight: 1.0 },
    d1SumK:         { font: 'JetBrainsMono', fontSize: 7.5, characterSpacing: 1.4, color: D1_PALETTE.ink3 },
    d1SumV:         { font: 'Cormorant', fontSize: 18, italics: true, color: D1_PALETTE.ink2 },
    d1Sign:         { font: 'JetBrainsMono', fontSize: 8.5, characterSpacing: 1.4, color: D1_PALETTE.ink3 },

    // Provisional badge for stub themes
    d1ProvBadge:    { font: 'JetBrainsMono', fontSize: 7.5, characterSpacing: 1.6, color: D1_PALETTE.accent, bold: true },
  };

  function d1RunningHeader(project, revision) {
    return (currentPage, pageCount) => {
      if (currentPage === 1) return null; // cover has no header chrome
      return {
        stack: [
          {
            columns: [
              {
                text: [
                  { text: project.code || '', style: 'd1RHStrong' },
                  { text: ' · ' + (project.name || 'Untitled') + (project.client ? (' · ' + project.client) : ''), style: 'd1RH' },
                ],
              },
              { text: 'IV · Schedule' + (revision ? (' · ' + revision) : ''), style: 'd1RH', alignment: 'right' },
            ],
          },
          { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 495, y2: 4, lineWidth: 0.5, lineColor: D1_PALETTE.rule2 }] },
        ],
        margin: [50, 28, 50, 0],
      };
    };
  }

  function d1RunningFooter() {
    return (currentPage, pageCount) => {
      return {
        stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.5, lineColor: D1_PALETTE.rule2 }] },
          {
            columns: [
              { text: 'Hollis & Arne · Architects', style: 'd1Foot' },
              { text: pad2(currentPage) + ' / ' + pad2(pageCount), style: 'd1FootPn', alignment: 'right' },
            ],
            margin: [0, 8, 0, 0],
          },
        ],
        margin: [50, 0, 50, 22],
      };
    };
  }

  function d1Background() {
    return (currentPage, pageSize) => ({
      canvas: [{
        type: 'rect',
        x: 0, y: 0,
        w: pageSize.width, h: pageSize.height,
        color: D1_PALETTE.paper,
      }],
    });
  }

  // D1 cover (A4 portrait)
  function d1CoverNode({ project, data, revision }) {
    const itemCount = (data && data.itemCount) || 0;
    const groupCount = (data && data.groups && data.groups.length) || 0;
    const today = B.todayLong();

    const meta = [
      { k: 'Project code', v: project.code, mono: true },
      { k: 'Client',       v: project.client },
      project.address ? { k: 'Address', v: project.address } : null,
      project.stage   ? { k: 'Stage',   v: project.stage   } : null,
      revision        ? { k: 'Revision', v: revision, mono: true } : null,
      { k: 'Issued', v: today, mono: true },
    ].filter(Boolean);

    const metaRows = [];
    for (let i = 0; i < meta.length; i += 2) {
      const row = meta.slice(i, i + 2);
      if (row.length < 2) row.push(null);
      metaRows.push(row);
    }

    return {
      stack: [
        // Studio mark
        {
          columns: [
            { canvas: [{ type: 'rect', x: 0, y: 4, w: 14, h: 14, color: D1_PALETTE.ink }], width: 18 },
            { text: 'Hollis & Arne', style: 'd1CoverMark', margin: [4, 0, 0, 0] },
          ],
          margin: [0, 8, 0, 0],
        },
        // Mid block — top rule, then eyebrow, title, deck, meta, then bottom rule
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.5, lineColor: D1_PALETTE.rule2 }],
          margin: [0, 28, 0, 0],
        },
        {
          stack: [
            { text: 'VOLUME IV · PROJECT SCHEDULE', style: 'd1CoverEye', margin: [0, 56, 0, 18] },
            { text: project.name || 'Untitled Project', style: 'd1CoverTitle', margin: [0, 0, 0, 18] },
            {
              text: 'A printable record of every material specified — assembled for site, supplier and consultant reference.',
              style: 'd1CoverSub',
              margin: [0, 0, 0, 22],
              width: 380,
            },
            // 2-col meta grid via table
            {
              table: {
                widths: ['*', '*'],
                body: metaRows.map(r => r.map(cell =>
                  cell
                    ? {
                        stack: [
                          { text: cell.k.toUpperCase(), style: 'd1MetaK', margin: [0, 0, 0, 4] },
                          { text: cell.v, style: cell.mono ? 'd1MetaVMono' : 'd1MetaV' },
                        ],
                        margin: [0, 0, 0, 14],
                      }
                    : { text: '' }
                )),
              },
              layout: 'noBorders',
            },
          ],
        },
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.5, lineColor: D1_PALETTE.rule2 }],
          margin: [0, 24, 0, 0],
        },
        // Bottom figure block
        {
          margin: [0, 56, 0, 0],
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 1, lineColor: D1_PALETTE.ink }] },
            {
              columns: [
                {
                  stack: [
                    { text: itemCount + ' ITEM' + (itemCount === 1 ? '' : 'S') + ' · ' + groupCount + ' GROUP' + (groupCount === 1 ? '' : 'S'), style: 'd1FigLbl' },
                    { text: project.name || 'Untitled Project', style: 'd1FigLblSub', margin: [0, 4, 0, 0] },
                  ],
                  width: '*',
                },
                {
                  text: itemCount.toString(),
                  style: 'd1FigVal',
                  width: 'auto',
                  alignment: 'right',
                },
              ],
              margin: [0, 18, 0, 0],
            },
          ],
        },
      ],
      pageBreak: 'after',
    };
  }

  // D1 per-group section page (A4 portrait)
  function d1SectionNode({ group, idx, total, content }) {
    const cards = group.cards || [];
    const cols = tableCols(content);

    const headerRow = cols.map(c => {
      const labels = { code: 'Code', material: 'Material · Location', element: 'Element', location: 'Location', supplier: 'Supplier', trade: 'Trade', sku: 'SKU' };
      return { text: (labels[c.id] || c.id).toUpperCase(), style: 'd1TH', alignment: 'left' };
    });

    const body = [headerRow].concat(cards.map(card => {
      return cols.map(c => {
        if (c.id === 'code') return { text: card.code || '—', style: 'd1TDMono' };
        if (c.id === 'material') {
          const tone = card.swatchColor || '#e1dccd';
          const sub = card._loSub || (card.locationName ? card.locationName : null);
          return {
            columns: [
              content.imagery !== false
                ? { canvas: [{ type: 'rect', x: 0, y: 1, w: 12, h: 12, color: tone, lineColor: '#cfc9b7', lineWidth: 0.4 }], width: 16 }
                : { text: '', width: 0 },
              {
                stack: [
                  { text: card.name || 'Unspecified', style: 'd1TDName' },
                  sub ? { text: sub, style: 'd1TDLoc', margin: [0, 2, 0, 0] } : null,
                ].filter(Boolean),
                width: '*',
              },
            ],
          };
        }
        if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd1TDMuted' };
        if (c.id === 'location') return { text: card.locationName || '—', style: 'd1TDMuted' };
        if (c.id === 'supplier') {
          const brand = card.swatchBrand || card.supplier || '';
          const sup = card.supplier && card.supplier !== brand ? card.supplier : null;
          return {
            stack: [
              { text: brand || '—', style: 'd1TD' },
              sup ? { text: sup, style: 'd1TDMuted' } : null,
            ].filter(Boolean),
          };
        }
        if (c.id === 'trade') return { text: card.trade || '—', style: 'd1TDMuted' };
        if (c.id === 'sku')   return { text: card.sku || '—', style: 'd1TDMono' };
        return { text: '' };
      });
    }));

    return {
      stack: [
        // Section header
        {
          columns: [
            { text: pad2(idx) + ' / ' + pad2(total), style: 'd1SectNum', width: 'auto', margin: [0, 8, 0, 0] },
            { text: group.title || '—', style: 'd1SectTtl', width: '*', margin: [18, 0, 18, 0] },
            { text: cards.length + ' item' + (cards.length === 1 ? '' : 's'), style: 'd1SectCt', width: 'auto', alignment: 'right', margin: [0, 12, 0, 0] },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.8, lineColor: D1_PALETTE.ink }], margin: [0, 12, 0, 14] },
        // Table
        {
          table: { widths: d1ColWidths(cols), body, dontBreakRows: true, headerRows: 1 },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.6 : 0.3),
            vLineWidth: () => 0,
            hLineColor: (i) => i === 1 ? D1_PALETTE.ink : D1_PALETTE.rule2,
            paddingTop:    () => 7,
            paddingBottom: () => 7,
            paddingLeft:   () => 6,
            paddingRight:  () => 6,
          },
        },
      ],
      pageBreak: 'before',
    };
  }

  function d1ColWidths(cols) {
    return cols.map(c => {
      if (c.id === 'code')     return 56;
      if (c.id === 'material') return '*';
      if (c.id === 'element')  return 72;
      if (c.id === 'location') return 90;
      if (c.id === 'supplier') return 110;
      if (c.id === 'trade')    return 60;
      if (c.id === 'sku')      return 70;
      return '*';
    });
  }

  // D1 final summary page — the missing sign-off page the designer
  // expected the `cover` toggle to add.
  function d1SummaryNode({ project, data, revision }) {
    const itemCount = (data && data.itemCount) || 0;
    const groups = (data && data.groups) || [];
    const today = B.todayLong();

    return {
      stack: [
        { text: 'SUMMARY · SIGN-OFF', style: 'd1SumEye' },
        { text: project.name || 'Untitled Project', style: 'd1SumTtl', margin: [0, 6, 0, 0] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.8, lineColor: D1_PALETTE.ink }], margin: [0, 14, 0, 18] },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [
                { stack: [{ text: 'TOTAL ITEMS', style: 'd1SumK' }, { text: String(itemCount), style: 'd1SumV', margin: [0, 4, 0, 0] }] },
                { stack: [{ text: 'GROUPS',      style: 'd1SumK' }, { text: String(groups.length), style: 'd1SumV', margin: [0, 4, 0, 0] }] },
              ],
              [
                { stack: [{ text: 'REVISION', style: 'd1SumK' }, { text: revision || '—', style: 'd1SumV', margin: [0, 4, 0, 0] }] },
                { stack: [{ text: 'ISSUED',   style: 'd1SumK' }, { text: today, style: 'd1SumV', margin: [0, 4, 0, 0] }] },
              ],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 28],
        },
        // Per-group counts
        { text: 'PER-GROUP COUNT', style: 'd1SumK', margin: [0, 12, 0, 8] },
        {
          table: {
            widths: ['*', 'auto'],
            body: groups.map(g => [
              { text: g.title || '—', style: 'd1TD' },
              { text: ((g.cards || []).length) + ' item' + ((g.cards || []).length === 1 ? '' : 's'), style: 'd1TDMono', alignment: 'right' },
            ]),
          },
          layout: {
            hLineWidth: (i, node) => i === 0 || i === node.table.body.length ? 0 : 0.3,
            vLineWidth: () => 0,
            hLineColor: () => D1_PALETTE.rule2,
            paddingTop: () => 8,
            paddingBottom: () => 8,
            paddingLeft: () => 0,
            paddingRight: () => 0,
          },
        },
        // Sign-off block
        {
          margin: [0, 60, 0, 0],
          columns: [
            {
              stack: [
                { text: 'PREPARED BY', style: 'd1Sign' },
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.4, lineColor: D1_PALETTE.ink2 }], margin: [0, 36, 0, 4] },
                { text: 'Hollis & Arne · Architects', style: 'd1Sign' },
              ],
            },
            {
              stack: [
                { text: 'APPROVED BY', style: 'd1Sign' },
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.4, lineColor: D1_PALETTE.ink2 }], margin: [0, 36, 0, 4] },
                { text: project.client || 'Client', style: 'd1Sign' },
              ],
            },
          ],
        },
      ],
      pageBreak: 'before',
    };
  }

  // D1 buildCoverGrouped
  function d1BuildCoverGrouped({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const out = [];

    if (content.cover) out.push(d1CoverNode({ project, data, revision }));

    groups.forEach((g, gi) => {
      const node = d1SectionNode({ group: g, idx: gi + 1, total: groups.length, content });
      // First section after cover: needs pageBreak (handled by node already
      // for gi > 0; for gi === 0 with cover, pageBreak: 'before' will give
      // us a fresh page). Without cover, the first section should not break.
      if (gi === 0 && !content.cover) delete node.pageBreak;
      out.push(node);
    });

    if (content.cover) out.push(d1SummaryNode({ project, data, revision }));

    return {
      content: out,
      header: d1RunningHeader(project, revision),
      footer: d1RunningFooter(),
      background: d1Background(),
      styles: D1_STYLES,
      defaultStyle: { font: 'Inter', fontSize: 9.5, color: D1_PALETTE.ink, lineHeight: 1.4 },
    };
  }

  // D1 compact-table builder (A3 landscape, one big banded table)
  function d1BuildTable({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const itemCount = (data && data.itemCount) || 0;
    const today = B.todayLong();

    const cols = tableCols(content);

    // Wider table for A3 landscape — pad column widths.
    const widths = cols.map(c => {
      if (c.id === 'code')     return 60;
      if (c.id === 'material') return '*';
      if (c.id === 'element')  return 85;
      if (c.id === 'location') return 120;
      if (c.id === 'supplier') return 140;
      if (c.id === 'trade')    return 75;
      if (c.id === 'sku')      return 85;
      return '*';
    });

    const labels = { code: 'Code', material: 'Material · Brand', element: 'Element', location: 'Location', supplier: 'Brand · Supplier', trade: 'Trade', sku: 'SKU' };
    const headerRow = cols.map(c => ({ text: (labels[c.id] || c.id).toUpperCase(), style: 'd1TH', alignment: 'left' }));

    const body = [headerRow];

    groups.forEach((g, gi) => {
      // Band row spanning all columns
      body.push([
        {
          text: [
            { text: g.title.toUpperCase() },
            { text: '   ·   ' + g.cards.length + ' ITEM' + (g.cards.length === 1 ? '' : 'S'), color: D1_PALETTE.ink3 },
          ],
          colSpan: cols.length,
          style: 'd1Band',
          fillColor: D1_PALETTE.paper2,
          margin: [4, 7, 4, 7],
        },
      ].concat(Array(cols.length - 1).fill({})));

      g.cards.forEach(card => {
        body.push(cols.map(c => {
          if (c.id === 'code') return { text: card.code || '—', style: 'd1TDMono' };
          if (c.id === 'material') {
            const tone = card.swatchColor || '#e1dccd';
            const brand = card.swatchBrand || card.supplier || '';
            return {
              columns: [
                content.imagery !== false
                  ? { canvas: [{ type: 'rect', x: 0, y: 1, w: 12, h: 12, color: tone, lineColor: '#cfc9b7', lineWidth: 0.4 }], width: 16 }
                  : { text: '', width: 0 },
                {
                  stack: [
                    { text: card.name || 'Unspecified', style: 'd1TDName' },
                    brand ? { text: brand, style: 'd1TDLoc', margin: [0, 2, 0, 0] } : null,
                  ].filter(Boolean),
                  width: '*',
                },
              ],
            };
          }
          if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd1TDMuted' };
          if (c.id === 'location') return { text: card.locationName || '—', style: 'd1TDMuted' };
          if (c.id === 'supplier') {
            const brand = card.swatchBrand || card.supplier || '';
            const sup = card.supplier && card.supplier !== brand ? card.supplier : null;
            return {
              stack: [
                { text: brand || '—', style: 'd1TD' },
                sup ? { text: sup, style: 'd1TDMuted' } : null,
              ].filter(Boolean),
            };
          }
          if (c.id === 'trade') return { text: card.trade || '—', style: 'd1TDMuted' };
          if (c.id === 'sku')   return { text: card.sku || '—', style: 'd1TDMono' };
          return { text: '' };
        }));
      });
    });

    return {
      content: [
        // Big A3 head: eyebrow + serif title on left, meta on right.
        {
          columns: [
            {
              stack: [
                { text: 'VOLUME IV · PROJECT SCHEDULE · COMPACT', style: 'd1AHeadEye', margin: [0, 0, 0, 6] },
                { text: project.name || 'Untitled Project', style: 'd1AHeadTtl' },
              ],
              width: '*',
            },
            {
              stack: [
                { text: (project.code || '') + (project.client ? ('  ·  ' + project.client) : ''), style: 'd1AHeadMeta', alignment: 'right' },
                { text: (project.address ? project.address + '\n' : '') + 'Hollis & Arne · Issued ' + today, style: 'd1AHeadMeta', alignment: 'right', margin: [0, 2, 0, 0] },
                revision ? {
                  text: revision.toUpperCase(),
                  style: 'd1AHeadRev',
                  alignment: 'right',
                  margin: [0, 8, 0, 0],
                } : null,
                { text: itemCount + ' items · ' + groups.length + ' group' + (groups.length === 1 ? '' : 's'), style: 'd1AHeadMeta', alignment: 'right', margin: [0, 6, 0, 0] },
              ].filter(Boolean),
              width: 280,
            },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 1100, y2: 0, lineWidth: 0.8, lineColor: D1_PALETTE.ink }], margin: [0, 12, 0, 18] },
        {
          table: { headerRows: 1, widths, body, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.6 : 0.3),
            vLineWidth: () => 0,
            hLineColor: (i) => i === 1 ? D1_PALETTE.ink : D1_PALETTE.rule2,
            paddingTop:    () => 6,
            paddingBottom: () => 6,
            paddingLeft:   () => 5,
            paddingRight:  () => 5,
          },
        },
      ],
      header: d1RunningHeader(project, revision),
      footer: d1RunningFooter(),
      background: d1Background(),
      styles: D1_STYLES,
      defaultStyle: { font: 'Inter', fontSize: 9, color: D1_PALETTE.ink, lineHeight: 1.4 },
    };
  }

  // D1 export — full implementation
  const D1 = {
    id: 'D1',
    name: 'Studio Archive',
    eyebrow: 'D1 — Editorial',
    description: 'Cream paper, Cormorant serif + Inter + JetBrains Mono. Warm bands, italic decks, medium density. The current direction, polished.',
    meta: 'A4 portrait · medium density · serif display',
    fonts: ['Cormorant', 'Inter', 'JetBrainsMono'],
    paperHint: {
      'cover-grouped': { paper: 'A4', orientation: 'portrait' },
      table:           { paper: 'A3', orientation: 'landscape' },
    },
    pageMargins: {
      'cover-grouped': [50, 60, 50, 60],
      table:           [40, 50, 40, 50],
    },
    buildCoverGrouped: d1BuildCoverGrouped,
    buildTable:        d1BuildTable,
  };

  // ═════════════════════════════════════════════════════════════════════
  // D3 · VITRINE
  // Pure white, Inter sans only, no fills, no serif. Section numbers
  // as massive numerals, hairline rules, very generous breathing room.
  // Low density, gallery feel.
  // ═════════════════════════════════════════════════════════════════════

  const D3_PALETTE = {
    paper:  '#ffffff',
    ink:    '#1a1815',
    ink2:   '#3a3530',
    ink3:   '#8a8680',
    ink4:   '#bcb8b2',
    rule:   '#1a1815',
    rule2:  '#dcd8d0',
  };

  const D3_STYLES = {
    d3CoverEye:    { font: 'Inter', fontSize: 8.5, characterSpacing: 1.8, color: D3_PALETTE.ink3 },
    d3CoverTitle:  { font: 'Inter', fontSize: 44, color: D3_PALETTE.ink, lineHeight: 0.95 },
    d3CoverSub:    { font: 'Inter', fontSize: 13, color: D3_PALETTE.ink2, lineHeight: 1.5 },
    d3MetaK:       { font: 'Inter', fontSize: 7.5, characterSpacing: 1.4, color: D3_PALETTE.ink3 },
    d3MetaV:       { font: 'Inter', fontSize: 11,  color: D3_PALETTE.ink, bold: true },
    d3FigLbl:      { font: 'Inter', fontSize: 8,   characterSpacing: 1.6, color: D3_PALETTE.ink3 },
    d3FigVal:      { font: 'Inter', fontSize: 34,  color: D3_PALETTE.ink, bold: true },
    d3FigSub:      { font: 'Inter', fontSize: 10,  color: D3_PALETTE.ink2 },

    d3SectNum:     { font: 'Inter', fontSize: 96,  color: D3_PALETTE.ink3, lineHeight: 0.85 },
    d3SectTtl:     { font: 'Inter', fontSize: 26,  color: D3_PALETTE.ink, lineHeight: 1.0 },
    d3SectMeta:    { font: 'Inter', fontSize: 8.5, characterSpacing: 1.2, color: D3_PALETTE.ink3 },

    d3TH:          { font: 'Inter', fontSize: 7.5, characterSpacing: 1.6, color: D3_PALETTE.ink2, bold: true },
    d3TD:          { font: 'Inter', fontSize: 9.5, color: D3_PALETTE.ink },
    d3TDMono:      { font: 'Inter', fontSize: 9,   color: D3_PALETTE.ink3 },
    d3TDName:      { font: 'Inter', fontSize: 10,  color: D3_PALETTE.ink, bold: true },
    d3TDLoc:       { font: 'Inter', fontSize: 8,   color: D3_PALETTE.ink3 },
    d3TDMuted:     { font: 'Inter', fontSize: 8.5, color: D3_PALETTE.ink3 },
    d3Band:        { font: 'Inter', fontSize: 8,   characterSpacing: 1.8, bold: true, color: D3_PALETTE.ink2 },

    d3AHeadEye:    { font: 'Inter', fontSize: 8,   characterSpacing: 1.6, color: D3_PALETTE.ink3 },
    d3AHeadTtl:    { font: 'Inter', fontSize: 30,  color: D3_PALETTE.ink, lineHeight: 1.0 },
    d3AHeadMeta:   { font: 'Inter', fontSize: 8.5, color: D3_PALETTE.ink3, lineHeight: 1.5 },

    d3RH:          { font: 'Inter', fontSize: 7.5, characterSpacing: 1.3, color: D3_PALETTE.ink3 },
    d3Foot:        { font: 'Inter', fontSize: 7.5, characterSpacing: 1.2, color: D3_PALETTE.ink3 },
  };

  function d3Header(project, revision) {
    return (currentPage, pageCount) => {
      if (currentPage === 1) return null;
      return {
        columns: [
          { text: [{ text: project.code || '', bold: true, color: D3_PALETTE.ink }, { text: '  ·  ' + (project.name || ''), color: D3_PALETTE.ink3 }], style: 'd3RH' },
          { text: 'IV  ·  Schedule' + (revision ? '  ·  ' + revision : ''), style: 'd3RH', alignment: 'right' },
        ],
        margin: [70, 36, 70, 0],
      };
    };
  }

  function d3Footer() {
    return (currentPage, pageCount) => ({
      columns: [
        { text: 'Hollis & Arne', style: 'd3Foot' },
        { text: pad2(currentPage) + ' — ' + pad2(pageCount), style: 'd3Foot', alignment: 'right' },
      ],
      margin: [70, 8, 70, 30],
    });
  }

  function d3Background() {
    return (currentPage, pageSize) => ({
      canvas: [{ type: 'rect', x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: D3_PALETTE.paper }],
    });
  }

  function d3CoverNode({ project, data, revision }) {
    const itemCount = (data && data.itemCount) || 0;
    const groupCount = (data && data.groups && data.groups.length) || 0;
    const today = B.todayLong();
    return {
      stack: [
        { text: pad2(1), style: 'd3CoverEye', alignment: 'right', margin: [0, 0, 0, 0] },
        { text: '', margin: [0, 100, 0, 0] },
        { text: 'VOLUME IV  ·  PROJECT SCHEDULE', style: 'd3CoverEye', margin: [0, 0, 0, 22] },
        { text: project.name || 'Untitled Project', style: 'd3CoverTitle', margin: [0, 0, 0, 22] },
        { text: 'A printable record of every material specified — for site, supplier and consultant reference.', style: 'd3CoverSub', width: 380, margin: [0, 0, 0, 60] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 455, y2: 0, lineWidth: 0.3, lineColor: D3_PALETTE.rule2 }] },
        {
          margin: [0, 18, 0, 0],
          columns: [
            {
              width: '*',
              stack: [
                { text: project.client || '—', style: 'd3FigLbl' },
                project.address ? { text: project.address, style: 'd3FigSub', margin: [0, 6, 0, 0] } : null,
                { text: 'Hollis & Arne · ' + today, style: 'd3FigSub', margin: [0, 4, 0, 0] },
                revision ? { text: revision, style: 'd3FigSub', margin: [0, 4, 0, 0] } : null,
                { text: itemCount + ' items  ·  ' + groupCount + ' group' + (groupCount === 1 ? '' : 's'), style: 'd3FigSub', margin: [0, 4, 0, 0] },
              ].filter(Boolean),
            },
            { text: String(itemCount), style: 'd3FigVal', width: 'auto', alignment: 'right' },
          ],
        },
      ],
      pageBreak: 'after',
    };
  }

  function d3SectionNode({ group, idx, total, content }) {
    const cards = group.cards || [];
    const cols = tableCols(content);
    const labels = { code: 'Code', material: 'Material', element: 'Element', location: 'Location', supplier: 'Brand', trade: 'Trade', sku: 'SKU' };
    const headerRow = cols.map(c => ({ text: (labels[c.id] || c.id), style: 'd3TH', alignment: 'left' }));
    const body = [headerRow].concat(cards.map(card => cols.map(c => {
      if (c.id === 'code') return { text: card.code || '—', style: 'd3TDMono' };
      if (c.id === 'material') {
        return {
          stack: [
            { text: card.name || 'Unspecified', style: 'd3TDName' },
            card._finish ? { text: card._finish, style: 'd3TDLoc', margin: [0, 2, 0, 0] } : null,
          ].filter(Boolean),
        };
      }
      if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd3TDMuted' };
      if (c.id === 'location') return { text: card.locationName || '—', style: 'd3TDMuted' };
      if (c.id === 'supplier') {
        const brand = card.swatchBrand || card.supplier || '';
        return { text: brand || '—', style: 'd3TD' };
      }
      if (c.id === 'trade')    return { text: card.trade || '—', style: 'd3TDMuted' };
      if (c.id === 'sku')      return { text: card.sku || '—', style: 'd3TDMono' };
      return { text: '' };
    })));
    return {
      stack: [
        // Massive numeral on its own line + meta strip
        {
          columns: [
            { text: pad2(idx), style: 'd3SectNum', width: 'auto' },
            { text: '', width: '*' },
            {
              width: 'auto',
              stack: [
                { text: pad2(idx) + ' OF ' + pad2(total), style: 'd3SectMeta', alignment: 'right' },
                { text: cards.length + ' ITEMS', style: 'd3SectMeta', alignment: 'right', margin: [0, 4, 0, 0] },
              ],
              margin: [0, 30, 0, 0],
            },
          ],
          margin: [0, 30, 0, 18],
        },
        { text: group.title || '—', style: 'd3SectTtl', margin: [0, 0, 0, 14] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 455, y2: 0, lineWidth: 0.3, lineColor: D3_PALETTE.rule2 }], margin: [0, 0, 0, 14] },
        {
          table: { widths: d3ColWidths(cols), body, headerRows: 1, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.4 : 0.2),
            vLineWidth: () => 0,
            hLineColor: () => D3_PALETTE.rule2,
            paddingTop:    () => 9,
            paddingBottom: () => 9,
            paddingLeft:   () => 0,
            paddingRight:  () => 8,
          },
        },
      ],
      pageBreak: 'before',
    };
  }

  function d3ColWidths(cols) {
    return cols.map(c => c.id === 'code' ? 56 : c.id === 'material' ? '*' : c.id === 'element' ? 70 : c.id === 'location' ? 100 : c.id === 'supplier' ? 110 : c.id === 'trade' ? 60 : 70);
  }

  function d3SummaryNode({ project, data, revision }) {
    const itemCount = (data && data.itemCount) || 0;
    const groups = (data && data.groups) || [];
    return {
      stack: [
        { text: 'END', style: 'd3SectMeta', alignment: 'right' },
        { text: '', margin: [0, 80, 0, 0] },
        { text: String(itemCount), style: 'd3SectNum' },
        { text: 'items, ' + groups.length + ' groups', style: 'd3SectTtl', margin: [0, 12, 0, 18] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 455, y2: 0, lineWidth: 0.3, lineColor: D3_PALETTE.rule2 }] },
        revision ? { text: revision, style: 'd3SectMeta', margin: [0, 18, 0, 0] } : null,
      ].filter(Boolean),
      pageBreak: 'before',
    };
  }

  function d3BuildCoverGrouped({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const out = [];
    if (content.cover) out.push(d3CoverNode({ project, data, revision }));
    groups.forEach((g, gi) => {
      const node = d3SectionNode({ group: g, idx: gi + 1, total: groups.length, content });
      if (gi === 0 && !content.cover) delete node.pageBreak;
      out.push(node);
    });
    if (content.cover) out.push(d3SummaryNode({ project, data, revision }));
    return {
      content: out,
      header: d3Header(project, revision),
      footer: d3Footer(),
      background: d3Background(),
      styles: D3_STYLES,
      defaultStyle: { font: 'Inter', fontSize: 9.5, color: D3_PALETTE.ink, lineHeight: 1.5 },
    };
  }

  function d3BuildTable({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const itemCount = (data && data.itemCount) || 0;
    const today = B.todayLong();
    const cols = tableCols(content);
    const widths = cols.map(c => c.id === 'code' ? 60 : c.id === 'material' ? '*' : c.id === 'element' ? 85 : c.id === 'location' ? 120 : c.id === 'supplier' ? 140 : c.id === 'trade' ? 75 : 85);
    const labels = { code: 'Code', material: 'Material', element: 'Element', location: 'Location', supplier: 'Brand', trade: 'Trade', sku: 'SKU' };
    const headerRow = cols.map(c => ({ text: labels[c.id] || c.id, style: 'd3TH', alignment: 'left' }));
    const body = [headerRow];
    groups.forEach((g) => {
      body.push([{
        text: g.title + '   ·   ' + g.cards.length + ' item' + (g.cards.length === 1 ? '' : 's'),
        colSpan: cols.length,
        style: 'd3Band',
        margin: [0, 14, 0, 6],
      }].concat(Array(cols.length - 1).fill({})));
      g.cards.forEach(card => {
        body.push(cols.map(c => {
          if (c.id === 'code') return { text: card.code || '—', style: 'd3TDMono' };
          if (c.id === 'material') {
            return {
              stack: [
                { text: card.name || 'Unspecified', style: 'd3TDName' },
                card._finish ? { text: card._finish, style: 'd3TDLoc', margin: [0, 2, 0, 0] } : null,
              ].filter(Boolean),
            };
          }
          if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd3TDMuted' };
          if (c.id === 'location') return { text: card.locationName || '—', style: 'd3TDMuted' };
          if (c.id === 'supplier') {
            const brand = card.swatchBrand || card.supplier || '';
            return { text: brand || '—', style: 'd3TD' };
          }
          if (c.id === 'trade')    return { text: card.trade || '—', style: 'd3TDMuted' };
          if (c.id === 'sku')      return { text: card.sku || '—', style: 'd3TDMono' };
          return { text: '' };
        }));
      });
    });
    return {
      content: [
        {
          columns: [
            { stack: [{ text: 'VOLUME IV — COMPACT SCHEDULE', style: 'd3AHeadEye', margin: [0, 0, 0, 6] }, { text: project.name || 'Untitled Project', style: 'd3AHeadTtl' }], width: '*' },
            { stack: [
              { text: (project.code || ''), style: 'd3AHeadMeta', alignment: 'right' },
              { text: project.client || '', style: 'd3AHeadMeta', alignment: 'right' },
              { text: 'Hollis & Arne · ' + today, style: 'd3AHeadMeta', alignment: 'right' },
              { text: itemCount + ' items · ' + groups.length + ' group' + (groups.length === 1 ? '' : 's'), style: 'd3AHeadMeta', alignment: 'right' },
            ], width: 280 },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 1100, y2: 0, lineWidth: 0.3, lineColor: D3_PALETTE.rule2 }], margin: [0, 14, 0, 20] },
        {
          table: { headerRows: 1, widths, body, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.4 : 0.2),
            vLineWidth: () => 0,
            hLineColor: () => D3_PALETTE.rule2,
            paddingTop:    () => 8,
            paddingBottom: () => 8,
            paddingLeft:   () => 0,
            paddingRight:  () => 6,
          },
        },
      ],
      header: d3Header(project, revision),
      footer: d3Footer(),
      background: d3Background(),
      styles: D3_STYLES,
      defaultStyle: { font: 'Inter', fontSize: 9, color: D3_PALETTE.ink, lineHeight: 1.4 },
    };
  }

  const D3 = {
    id: 'D3', name: 'Vitrine',
    eyebrow: 'D3 — Minimal',
    description: 'Pure white, Inter sans only, no fills, no serif. Massive numerals, hairline rules, very generous breathing room. Low density, gallery feel.',
    meta: 'A4 portrait · low density · sans only',
    fonts: ['Inter'],
    paperHint: { 'cover-grouped': { paper: 'A4', orientation: 'portrait' }, table: { paper: 'A3', orientation: 'landscape' } },
    pageMargins: { 'cover-grouped': [70, 60, 70, 60], table: [50, 50, 50, 50] },
    buildCoverGrouped: d3BuildCoverGrouped,
    buildTable: d3BuildTable,
  };

  // ═════════════════════════════════════════════════════════════════════
  // D4 · LEDGER
  // Warm ivory paper. Cormorant serif throughout, italic descriptions,
  // ornament rules, Roman page numerals. Antiquarian accountant's book.
  // ═════════════════════════════════════════════════════════════════════

  const D4_PALETTE = {
    paper:  '#f5f0e3',
    paper2: '#ede7d4',
    ink:    '#2a2620',
    ink2:   '#4a4135',
    ink3:   '#7a6f5c',
    ink4:   '#a59a83',
    rule:   '#2a2620',
    rule2:  '#c4b896',
  };

  // i, ii, iii … x — repeat lowercase Roman numerals beyond x just for
  // safety; tables rarely exceed 10 sections.
  const ROMAN = ['', 'i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii','xiii','xiv','xv','xvi','xvii','xviii','xix','xx'];
  function roman(n) { return ROMAN[n] || String(n); }

  const D4_STYLES = {
    d4CoverEye:    { font: 'Cormorant', fontSize: 12, italics: true, color: D4_PALETTE.ink3 },
    d4CoverTitle:  { font: 'Cormorant', fontSize: 54, bold: true, color: D4_PALETTE.ink, lineHeight: 0.98 },
    d4CoverSub:    { font: 'Cormorant', fontSize: 13, italics: true, color: D4_PALETTE.ink3 },
    d4Stamp:       { font: 'Cormorant', fontSize: 10, italics: true, color: D4_PALETTE.ink3 },
    d4Orn:         { font: 'Cormorant', fontSize: 14, color: D4_PALETTE.ink2, alignment: 'center' },
    d4MetaK:       { font: 'Cormorant', fontSize: 10, italics: true, color: D4_PALETTE.ink3 },
    d4MetaV:       { font: 'Cormorant', fontSize: 11, color: D4_PALETTE.ink, bold: true },
    d4FigLbl:      { font: 'Cormorant', fontSize: 11, italics: true, color: D4_PALETTE.ink2 },
    d4FigVal:      { font: 'Cormorant', fontSize: 36, bold: true, color: D4_PALETTE.ink },

    d4SectNum:     { font: 'Cormorant', fontSize: 12, italics: true, color: D4_PALETTE.ink3 },
    d4SectTtl:     { font: 'Cormorant', fontSize: 28, bold: true, color: D4_PALETTE.ink, lineHeight: 1.0 },
    d4SectCt:      { font: 'Cormorant', fontSize: 11, italics: true, color: D4_PALETTE.ink3 },

    d4TH:          { font: 'Cormorant', fontSize: 9.5, italics: true, color: D4_PALETTE.ink2 },
    d4TD:          { font: 'Cormorant', fontSize: 11, color: D4_PALETTE.ink },
    d4TDMono:      { font: 'Inter',     fontSize: 9, color: D4_PALETTE.ink3 },
    d4TDName:      { font: 'Cormorant', fontSize: 12, color: D4_PALETTE.ink, bold: true },
    d4TDLoc:       { font: 'Cormorant', fontSize: 9.5, italics: true, color: D4_PALETTE.ink3 },
    d4TDMuted:     { font: 'Cormorant', fontSize: 10, italics: true, color: D4_PALETTE.ink3 },
    d4Band:        { font: 'Cormorant', fontSize: 12, italics: true, color: D4_PALETTE.ink },

    d4AHeadEye:    { font: 'Cormorant', fontSize: 11, italics: true, color: D4_PALETTE.ink3 },
    d4AHeadTtl:    { font: 'Cormorant', fontSize: 32, bold: true, color: D4_PALETTE.ink, lineHeight: 1.0 },
    d4AHeadMeta:   { font: 'Cormorant', fontSize: 10, italics: true, color: D4_PALETTE.ink3 },

    d4RH:          { font: 'Cormorant', fontSize: 9.5, italics: true, color: D4_PALETTE.ink3 },
    d4Foot:        { font: 'Cormorant', fontSize: 10, italics: true, color: D4_PALETTE.ink3 },
  };

  function d4Header(project, revision) {
    return (currentPage, pageCount) => {
      if (currentPage === 1) return null;
      return {
        columns: [
          { text: [{ text: project.code || '', italics: true }, { text: '  ·  ' + (project.name || '') }], style: 'd4RH' },
          { text: 'Vol. IV  ·  Project Schedule', style: 'd4RH', alignment: 'right' },
        ],
        margin: [55, 32, 55, 0],
      };
    };
  }

  function d4Footer() {
    return (currentPage, pageCount) => ({
      stack: [
        { text: '— Hollis & Arne, Architects —', style: 'd4Foot', alignment: 'center' },
        { text: roman(currentPage) + ' / ' + roman(pageCount), style: 'd4Foot', alignment: 'center', margin: [0, 4, 0, 0] },
      ],
      margin: [55, 8, 55, 28],
    });
  }

  function d4Background() {
    return (currentPage, pageSize) => {
      // Faint horizontal ruling — like an accountant's book. ~12pt spacing.
      const canvas = [{ type: 'rect', x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: D4_PALETTE.paper }];
      const ruleColor = '#d4c8a4';
      for (let y = 80; y < pageSize.height - 60; y += 14) {
        canvas.push({ type: 'line', x1: 55, y1: y, x2: pageSize.width - 55, y2: y, lineWidth: 0.15, lineColor: ruleColor });
      }
      return { canvas };
    };
  }

  function d4OrnamentRule() {
    return {
      columns: [
        { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 210, y2: 5, lineWidth: 0.4, lineColor: D4_PALETTE.ink2 }], width: '*' },
        { text: '§', style: 'd4Orn', width: 'auto', margin: [10, 0, 10, 0] },
        { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 210, y2: 5, lineWidth: 0.4, lineColor: D4_PALETTE.ink2 }], width: '*' },
      ],
      margin: [0, 12, 0, 12],
    };
  }

  function d4CoverNode({ project, data, revision }) {
    const itemCount = (data && data.itemCount) || 0;
    const groupCount = (data && data.groups && data.groups.length) || 0;
    const today = B.todayLong();
    const meta = [
      { k: 'Project №', v: project.code },
      { k: 'Client',    v: project.client || '—' },
      project.address ? { k: 'Address', v: project.address } : null,
      project.stage   ? { k: 'Stage',   v: project.stage   } : null,
      revision        ? { k: 'Revision', v: revision } : null,
      { k: 'Issued',  v: today },
      { k: 'Architect', v: 'Hollis & Arne' },
      { k: 'Items',     v: String(itemCount) },
    ].filter(Boolean);
    const metaRows = [];
    for (let i = 0; i < meta.length; i++) {
      metaRows.push([
        { text: meta[i].k, style: 'd4MetaK', alignment: 'right' },
        { text: meta[i].v, style: 'd4MetaV' },
      ]);
    }
    return {
      stack: [
        // Bordered frame
        {
          stack: [
            { text: 'Hollis & Arne · Studio Archive', style: 'd4Stamp', alignment: 'center', margin: [0, 18, 0, 0] },
            { text: 'Being a printable record of', style: 'd4CoverEye', alignment: 'center', margin: [0, 24, 0, 8] },
            { text: project.name || 'Untitled Project', style: 'd4CoverTitle', alignment: 'center', margin: [0, 0, 0, 8] },
            { text: '— project schedule, in ' + itemCount + ' items —', style: 'd4CoverEye', alignment: 'center' },
            d4OrnamentRule(),
            // Meta two-column
            {
              margin: [40, 4, 40, 0],
              table: { widths: [80, '*'], body: metaRows },
              layout: {
                hLineWidth: () => 0, vLineWidth: () => 0,
                paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 4, paddingRight: () => 0,
              },
            },
            // Figure
            {
              margin: [0, 36, 0, 18],
              columns: [
                { text: 'In account, ' + groupCount + ' group' + (groupCount === 1 ? '' : 's'), style: 'd4FigLbl', width: '*', margin: [12, 8, 0, 0] },
                { text: String(itemCount), style: 'd4FigVal', width: 'auto', alignment: 'right', margin: [0, 0, 12, 0] },
              ],
            },
          ],
          margin: [10, 20, 10, 0],
          // Frame border
          // pdfmake table-based border around the stack
        },
      ],
      pageBreak: 'after',
    };
  }

  function d4SectionNode({ group, idx, total, content }) {
    const cards = group.cards || [];
    const cols = tableCols(content);
    const labels = { code: 'Code', material: 'Description', element: 'Element', location: 'Location', supplier: 'Brand', trade: 'Trade', sku: 'SKU' };
    const headerRow = cols.map(c => ({ text: labels[c.id] || c.id, style: 'd4TH', alignment: 'left' }));
    const body = [headerRow].concat(cards.map(card => cols.map(c => {
      if (c.id === 'code') return { text: card.code || '—', style: 'd4TDMono' };
      if (c.id === 'material') {
        return {
          stack: [
            { text: card.name || 'Unspecified', style: 'd4TDName' },
            card._specNote ? { text: card._specNote, style: 'd4TDLoc', margin: [0, 1, 0, 0] } : null,
          ].filter(Boolean),
        };
      }
      if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd4TDMuted' };
      if (c.id === 'location') return { text: card.locationName || '—', style: 'd4TDMuted' };
      if (c.id === 'supplier') {
        const brand = card.swatchBrand || card.supplier || '';
        return { text: brand || '—', style: 'd4TD' };
      }
      if (c.id === 'trade')    return { text: card.trade || '—', style: 'd4TDMuted' };
      if (c.id === 'sku')      return { text: card.sku || '—', style: 'd4TDMono' };
      return { text: '' };
    })));
    return {
      stack: [
        {
          columns: [
            { text: 'No. ' + roman(idx), style: 'd4SectNum', width: 'auto', margin: [0, 8, 0, 0] },
            { text: group.title || '—', style: 'd4SectTtl', width: '*', margin: [14, 0, 0, 0] },
            { text: '— ' + cards.length + ' items —', style: 'd4SectCt', width: 'auto', alignment: 'right', margin: [0, 10, 0, 0] },
          ],
        },
        d4OrnamentRule(),
        {
          table: { widths: d4ColWidths(cols), body, headerRows: 1, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.5 : 0.25),
            vLineWidth: () => 0,
            hLineColor: (i) => i === 1 ? D4_PALETTE.ink : D4_PALETTE.rule2,
            paddingTop:    () => 7,
            paddingBottom: () => 7,
            paddingLeft:   () => 5,
            paddingRight:  () => 5,
          },
        },
        // Italic foot — "Sum of {group}, in items"
        {
          margin: [0, 14, 0, 0],
          columns: [
            { text: 'Sum of ' + (group.title || '—') + ', in items', style: 'd4FigLbl', width: '*' },
            { text: String(cards.length), style: 'd4TDName', width: 'auto', alignment: 'right' },
          ],
        },
        // Double-rule beneath
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 485, y2: 0, lineWidth: 0.6, lineColor: D4_PALETTE.ink }], margin: [0, 4, 0, 2] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 485, y2: 0, lineWidth: 0.3, lineColor: D4_PALETTE.ink }] },
      ],
      pageBreak: 'before',
    };
  }

  function d4ColWidths(cols) {
    return cols.map(c => c.id === 'code' ? 50 : c.id === 'material' ? '*' : c.id === 'element' ? 70 : c.id === 'location' ? 96 : c.id === 'supplier' ? 110 : c.id === 'trade' ? 60 : 70);
  }

  function d4SummaryNode({ project, data, revision }) {
    const itemCount = (data && data.itemCount) || 0;
    const groups = (data && data.groups) || [];
    const today = B.todayLong();
    return {
      stack: [
        { text: '— Finis —', style: 'd4CoverEye', alignment: 'center', margin: [0, 12, 0, 24] },
        { text: 'Summary in account', style: 'd4SectTtl', alignment: 'center', margin: [0, 0, 0, 16] },
        d4OrnamentRule(),
        // Per-group counts
        {
          margin: [60, 8, 60, 0],
          table: {
            widths: ['*', 'auto'],
            body: groups.map(g => [
              { text: g.title || '—', style: 'd4TD' },
              { text: String((g.cards || []).length) + ' items', style: 'd4TDMuted', alignment: 'right' },
            ]),
          },
          layout: {
            hLineWidth: (i, node) => i === 0 || i === node.table.body.length ? 0 : 0.25,
            vLineWidth: () => 0,
            hLineColor: () => D4_PALETTE.rule2,
            paddingTop: () => 9, paddingBottom: () => 9, paddingLeft: () => 0, paddingRight: () => 0,
          },
        },
        // Sign-off
        {
          margin: [60, 40, 60, 0],
          columns: [
            { stack: [{ text: 'Prepared by', style: 'd4MetaK', alignment: 'center' }, { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.4, lineColor: D4_PALETTE.ink2 }], margin: [0, 36, 0, 6] }, { text: 'Hollis & Arne', style: 'd4MetaV', alignment: 'center' }] },
            { stack: [{ text: 'Approved by', style: 'd4MetaK', alignment: 'center' }, { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.4, lineColor: D4_PALETTE.ink2 }], margin: [0, 36, 0, 6] }, { text: project.client || 'Client', style: 'd4MetaV', alignment: 'center' }] },
          ],
        },
        revision ? { text: revision, style: 'd4MetaK', alignment: 'center', margin: [0, 40, 0, 0] } : null,
      ].filter(Boolean),
      pageBreak: 'before',
    };
  }

  function d4BuildCoverGrouped({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const out = [];
    if (content.cover) out.push(d4CoverNode({ project, data, revision }));
    groups.forEach((g, gi) => {
      const node = d4SectionNode({ group: g, idx: gi + 1, total: groups.length, content });
      if (gi === 0 && !content.cover) delete node.pageBreak;
      out.push(node);
    });
    if (content.cover) out.push(d4SummaryNode({ project, data, revision }));
    return {
      content: out,
      header: d4Header(project, revision),
      footer: d4Footer(),
      background: d4Background(),
      styles: D4_STYLES,
      defaultStyle: { font: 'Cormorant', fontSize: 11, color: D4_PALETTE.ink, lineHeight: 1.45 },
    };
  }

  function d4BuildTable({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const itemCount = (data && data.itemCount) || 0;
    const today = B.todayLong();
    const cols = tableCols(content);
    const widths = cols.map(c => c.id === 'code' ? 60 : c.id === 'material' ? '*' : c.id === 'element' ? 85 : c.id === 'location' ? 120 : c.id === 'supplier' ? 140 : c.id === 'trade' ? 75 : 85);
    const labels = { code: 'Code', material: 'Description', element: 'Element', location: 'Location', supplier: 'Brand', trade: 'Trade', sku: 'SKU' };
    const headerRow = cols.map(c => ({ text: labels[c.id] || c.id, style: 'd4TH', alignment: 'left' }));
    const body = [headerRow];
    groups.forEach((g) => {
      body.push([{
        text: g.title + ' — ' + g.cards.length + ' items',
        colSpan: cols.length, style: 'd4Band',
        margin: [4, 10, 4, 6],
      }].concat(Array(cols.length - 1).fill({})));
      g.cards.forEach(card => {
        body.push(cols.map(c => {
          if (c.id === 'code') return { text: card.code || '—', style: 'd4TDMono' };
          if (c.id === 'material') {
            return {
              stack: [
                { text: card.name || 'Unspecified', style: 'd4TDName' },
                card._specNote ? { text: card._specNote, style: 'd4TDLoc', margin: [0, 1, 0, 0] } : null,
              ].filter(Boolean),
            };
          }
          if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd4TDMuted' };
          if (c.id === 'location') return { text: card.locationName || '—', style: 'd4TDMuted' };
          if (c.id === 'supplier') {
            const brand = card.swatchBrand || card.supplier || '';
            return { text: brand || '—', style: 'd4TD' };
          }
          if (c.id === 'trade')    return { text: card.trade || '—', style: 'd4TDMuted' };
          if (c.id === 'sku')      return { text: card.sku || '—', style: 'd4TDMono' };
          return { text: '' };
        }));
      });
      // Italic "carried forward" line per group
      const carried = Array(cols.length).fill({});
      carried[cols.length - 2] = { text: '— carried forward, ' + (g.title || '—') + ' —', style: 'd4FigLbl', alignment: 'right' };
      carried[cols.length - 1] = { text: String(g.cards.length), style: 'd4TDName', alignment: 'right' };
      body.push(carried);
    });
    return {
      content: [
        {
          columns: [
            { stack: [{ text: '— A record of every material specified —', style: 'd4AHeadEye' }, { text: project.name || 'Untitled Project', style: 'd4AHeadTtl', margin: [0, 4, 0, 0] }], width: '*' },
            { stack: [
              { text: project.client || '', style: 'd4AHeadMeta', alignment: 'right' },
              { text: project.address || '', style: 'd4AHeadMeta', alignment: 'right' },
              { text: 'Hollis & Arne · Issued ' + today, style: 'd4AHeadMeta', alignment: 'right' },
              { text: '— ' + itemCount + ' items, ' + groups.length + ' groups —', style: 'd4AHeadMeta', alignment: 'right' },
            ], width: 280 },
          ],
        },
        d4OrnamentRule(),
        {
          table: { headerRows: 1, widths, body, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.5 : 0.25),
            vLineWidth: () => 0,
            hLineColor: (i) => i === 1 ? D4_PALETTE.ink : D4_PALETTE.rule2,
            paddingTop:    () => 6,
            paddingBottom: () => 6,
            paddingLeft:   () => 5,
            paddingRight:  () => 5,
          },
        },
      ],
      header: d4Header(project, revision),
      footer: d4Footer(),
      background: d4Background(),
      styles: D4_STYLES,
      defaultStyle: { font: 'Cormorant', fontSize: 11, color: D4_PALETTE.ink, lineHeight: 1.4 },
    };
  }

  const D4 = {
    id: 'D4', name: 'Ledger',
    eyebrow: 'D4 — Antiquarian',
    description: "Warm ivory paper with faint horizontal ruling — like an accountant's book. Cormorant serif throughout, italic descriptions, ornament rules, Roman page numerals.",
    meta: 'A4 portrait · medium density · serif',
    fonts: ['Cormorant', 'Inter'],
    paperHint: { 'cover-grouped': { paper: 'A4', orientation: 'portrait' }, table: { paper: 'A3', orientation: 'landscape' } },
    pageMargins: { 'cover-grouped': [55, 60, 55, 60], table: [45, 50, 45, 50] },
    buildCoverGrouped: d4BuildCoverGrouped,
    buildTable: d4BuildTable,
  };

  // ═════════════════════════════════════════════════════════════════════
  // D10 · WABI-SABI
  // Warm parchment with deep indigo ink, soft Cormorant italic display,
  // asymmetric layouts, big margins. Hairline rules only, no fills.
  // ═════════════════════════════════════════════════════════════════════

  const D10_PALETTE = {
    paper:  '#efe8d4',
    paper2: '#e6dec5',
    ink:    '#1d2754',
    ink2:   '#2c3865',
    ink3:   '#5e6890',
    ink4:   '#9098b3',
    rule:   '#1d2754',
    rule2:  '#b8b298',
  };

  const D10_STYLES = {
    d10Eye:        { font: 'Cormorant', fontSize: 11, italics: true, color: D10_PALETTE.ink3 },
    d10CoverTitle: { font: 'Cormorant', fontSize: 56, italics: true, color: D10_PALETTE.ink, lineHeight: 0.95 },
    d10CoverSub:   { font: 'Cormorant', fontSize: 15, italics: true, color: D10_PALETTE.ink2, lineHeight: 1.5 },
    d10MetaK:      { font: 'Cormorant', fontSize: 10, italics: true, color: D10_PALETTE.ink3 },
    d10MetaV:      { font: 'Cormorant', fontSize: 12, color: D10_PALETTE.ink },
    d10FigLbl:     { font: 'Cormorant', fontSize: 11, italics: true, color: D10_PALETTE.ink3 },
    d10FigVal:     { font: 'Cormorant', fontSize: 44, italics: true, color: D10_PALETTE.ink, bold: true },

    d10SectNum:    { font: 'Cormorant', fontSize: 14, italics: true, color: D10_PALETTE.ink3 },
    d10SectTtl:    { font: 'Cormorant', fontSize: 36, italics: true, color: D10_PALETTE.ink, lineHeight: 1.0 },
    d10SectCt:     { font: 'Cormorant', fontSize: 11, italics: true, color: D10_PALETTE.ink3 },

    d10TH:         { font: 'Cormorant', fontSize: 10, italics: true, color: D10_PALETTE.ink2 },
    d10TD:         { font: 'Cormorant', fontSize: 12, color: D10_PALETTE.ink },
    d10TDMono:     { font: 'Inter',     fontSize: 9, color: D10_PALETTE.ink3 },
    d10TDName:     { font: 'Cormorant', fontSize: 13, color: D10_PALETTE.ink },
    d10TDLoc:      { font: 'Cormorant', fontSize: 10, italics: true, color: D10_PALETTE.ink3 },
    d10TDMuted:    { font: 'Cormorant', fontSize: 10.5, italics: true, color: D10_PALETTE.ink3 },
    d10Band:       { font: 'Cormorant', fontSize: 13, italics: true, color: D10_PALETTE.ink },

    d10AHeadEye:   { font: 'Cormorant', fontSize: 12, italics: true, color: D10_PALETTE.ink3 },
    d10AHeadTtl:   { font: 'Cormorant', fontSize: 34, italics: true, color: D10_PALETTE.ink, lineHeight: 1.0 },
    d10AHeadMeta:  { font: 'Cormorant', fontSize: 10, italics: true, color: D10_PALETTE.ink3 },

    d10RH:         { font: 'Cormorant', fontSize: 10, italics: true, color: D10_PALETTE.ink3 },
    d10Foot:       { font: 'Cormorant', fontSize: 10, italics: true, color: D10_PALETTE.ink3 },
  };

  function d10Header(project, revision) {
    return (currentPage, pageCount) => {
      if (currentPage === 1) return null;
      return {
        columns: [
          { text: project.code || '', style: 'd10RH' },
          { text: 'iv · ' + (project.name || ''), style: 'd10RH', alignment: 'right' },
        ],
        margin: [80, 36, 80, 0],
      };
    };
  }

  function d10Footer() {
    return (currentPage, pageCount) => ({
      columns: [
        { text: '', width: '*' },
        { text: roman(currentPage), style: 'd10Foot', width: 'auto' },
      ],
      margin: [80, 8, 80, 30],
    });
  }

  function d10Background() {
    return (currentPage, pageSize) => ({
      canvas: [{ type: 'rect', x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: D10_PALETTE.paper }],
    });
  }

  function d10CoverNode({ project, data, revision }) {
    const itemCount = (data && data.itemCount) || 0;
    const groupCount = (data && data.groups && data.groups.length) || 0;
    const today = B.todayLong();
    return {
      stack: [
        { text: '— iv —', style: 'd10Eye', margin: [0, 60, 0, 80] },
        // Asymmetric — push title to right
        {
          columns: [
            { text: '', width: '*' },
            {
              width: 320,
              stack: [
                { text: 'volume iv', style: 'd10Eye', alignment: 'right', margin: [0, 0, 0, 6] },
                { text: project.name || 'Untitled Project', style: 'd10CoverTitle', alignment: 'right', margin: [0, 0, 0, 18] },
                { text: 'A printable record of every material specified.', style: 'd10CoverSub', alignment: 'right' },
              ],
            },
          ],
        },
        { text: '', margin: [0, 60, 0, 0] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 435, y2: 0, lineWidth: 0.3, lineColor: D10_PALETTE.rule2 }] },
        {
          margin: [0, 18, 0, 0],
          columns: [
            {
              width: '*',
              stack: [
                project.client ? { text: project.client, style: 'd10MetaV' } : null,
                project.address ? { text: project.address, style: 'd10MetaK', margin: [0, 4, 0, 0] } : null,
                { text: 'Hollis & Arne · ' + today, style: 'd10MetaK', margin: [0, 4, 0, 0] },
                revision ? { text: revision, style: 'd10MetaK', margin: [0, 4, 0, 0] } : null,
              ].filter(Boolean),
            },
            {
              width: 'auto',
              stack: [
                { text: itemCount + ' items', style: 'd10FigLbl', alignment: 'right' },
                { text: String(itemCount), style: 'd10FigVal', alignment: 'right', margin: [0, 4, 0, 0] },
              ],
            },
          ],
        },
      ],
      pageBreak: 'after',
    };
  }

  function d10SectionNode({ group, idx, total, content }) {
    const cards = group.cards || [];
    const cols = tableCols(content);
    const labels = { code: 'code', material: 'material', element: 'element', location: 'location', supplier: 'brand', trade: 'trade', sku: 'sku' };
    const headerRow = cols.map(c => ({ text: labels[c.id] || c.id, style: 'd10TH', alignment: 'left' }));
    const body = [headerRow].concat(cards.map(card => cols.map(c => {
      if (c.id === 'code') return { text: card.code || '—', style: 'd10TDMono' };
      if (c.id === 'material') {
        return {
          stack: [
            { text: card.name || 'Unspecified', style: 'd10TDName' },
            card._specNote ? { text: card._specNote, style: 'd10TDLoc', margin: [0, 1, 0, 0] } : null,
          ].filter(Boolean),
        };
      }
      if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd10TDMuted' };
      if (c.id === 'location') return { text: card.locationName || '—', style: 'd10TDMuted' };
      if (c.id === 'supplier') {
        const brand = card.swatchBrand || card.supplier || '';
        return { text: brand || '—', style: 'd10TD' };
      }
      if (c.id === 'trade')    return { text: card.trade || '—', style: 'd10TDMuted' };
      if (c.id === 'sku')      return { text: card.sku || '—', style: 'd10TDMono' };
      return { text: '' };
    })));
    return {
      stack: [
        // Asymmetric: number on left, title indented right
        {
          margin: [0, 40, 0, 0],
          columns: [
            { text: roman(idx), style: 'd10SectNum', width: 'auto' },
            { text: '', width: 40 },
            { text: group.title || '—', style: 'd10SectTtl', width: '*' },
            { text: cards.length + ' items', style: 'd10SectCt', width: 'auto', alignment: 'right', margin: [0, 18, 0, 0] },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 435, y2: 0, lineWidth: 0.3, lineColor: D10_PALETTE.rule2 }], margin: [0, 18, 0, 18] },
        {
          table: { widths: d10ColWidths(cols), body, headerRows: 1, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.3 : 0.15),
            vLineWidth: () => 0,
            hLineColor: () => D10_PALETTE.rule2,
            paddingTop:    () => 10,
            paddingBottom: () => 10,
            paddingLeft:   () => 0,
            paddingRight:  () => 8,
          },
        },
      ],
      pageBreak: 'before',
    };
  }

  function d10ColWidths(cols) {
    return cols.map(c => c.id === 'code' ? 50 : c.id === 'material' ? '*' : c.id === 'element' ? 70 : c.id === 'location' ? 96 : c.id === 'supplier' ? 110 : c.id === 'trade' ? 60 : 70);
  }

  function d10SummaryNode({ project, data, revision }) {
    const itemCount = (data && data.itemCount) || 0;
    const groups = (data && data.groups) || [];
    return {
      stack: [
        { text: '— finis —', style: 'd10Eye', alignment: 'center', margin: [0, 80, 0, 40] },
        {
          columns: [
            { text: '', width: '*' },
            { text: String(itemCount), style: 'd10FigVal', width: 'auto' },
          ],
        },
        { text: 'items in ' + groups.length + ' groups', style: 'd10FigLbl', alignment: 'right', margin: [0, 4, 0, 24] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 435, y2: 0, lineWidth: 0.3, lineColor: D10_PALETTE.rule2 }] },
        revision ? { text: revision, style: 'd10MetaK', alignment: 'right', margin: [0, 14, 0, 0] } : null,
      ].filter(Boolean),
      pageBreak: 'before',
    };
  }

  function d10BuildCoverGrouped({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const out = [];
    if (content.cover) out.push(d10CoverNode({ project, data, revision }));
    groups.forEach((g, gi) => {
      const node = d10SectionNode({ group: g, idx: gi + 1, total: groups.length, content });
      if (gi === 0 && !content.cover) delete node.pageBreak;
      out.push(node);
    });
    if (content.cover) out.push(d10SummaryNode({ project, data, revision }));
    return {
      content: out,
      header: d10Header(project, revision),
      footer: d10Footer(),
      background: d10Background(),
      styles: D10_STYLES,
      defaultStyle: { font: 'Cormorant', fontSize: 11, color: D10_PALETTE.ink, lineHeight: 1.5 },
    };
  }

  function d10BuildTable({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const itemCount = (data && data.itemCount) || 0;
    const today = B.todayLong();
    const cols = tableCols(content);
    const widths = cols.map(c => c.id === 'code' ? 60 : c.id === 'material' ? '*' : c.id === 'element' ? 90 : c.id === 'location' ? 130 : c.id === 'supplier' ? 150 : c.id === 'trade' ? 80 : 90);
    const labels = { code: 'code', material: 'material', element: 'element', location: 'location', supplier: 'brand', trade: 'trade', sku: 'sku' };
    const headerRow = cols.map(c => ({ text: labels[c.id] || c.id, style: 'd10TH', alignment: 'left' }));
    const body = [headerRow];
    groups.forEach((g) => {
      body.push([{
        text: g.title + ' — ' + g.cards.length + ' items',
        colSpan: cols.length, style: 'd10Band',
        margin: [0, 18, 0, 8],
      }].concat(Array(cols.length - 1).fill({})));
      g.cards.forEach(card => {
        body.push(cols.map(c => {
          if (c.id === 'code') return { text: card.code || '—', style: 'd10TDMono' };
          if (c.id === 'material') {
            return {
              stack: [
                { text: card.name || 'Unspecified', style: 'd10TDName' },
                card._specNote ? { text: card._specNote, style: 'd10TDLoc', margin: [0, 1, 0, 0] } : null,
              ].filter(Boolean),
            };
          }
          if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd10TDMuted' };
          if (c.id === 'location') return { text: card.locationName || '—', style: 'd10TDMuted' };
          if (c.id === 'supplier') {
            const brand = card.swatchBrand || card.supplier || '';
            return { text: brand || '—', style: 'd10TD' };
          }
          if (c.id === 'trade')    return { text: card.trade || '—', style: 'd10TDMuted' };
          if (c.id === 'sku')      return { text: card.sku || '—', style: 'd10TDMono' };
          return { text: '' };
        }));
      });
    });
    return {
      content: [
        // Asymmetric — title pushed right
        {
          columns: [
            { text: '', width: '*' },
            { stack: [
                { text: 'iv  ·  compact schedule', style: 'd10AHeadEye', alignment: 'right' },
                { text: project.name || 'Untitled Project', style: 'd10AHeadTtl', alignment: 'right', margin: [0, 4, 0, 0] },
                { text: project.client || '', style: 'd10AHeadMeta', alignment: 'right', margin: [0, 6, 0, 0] },
                { text: 'Hollis & Arne · ' + today + ' · ' + itemCount + ' items', style: 'd10AHeadMeta', alignment: 'right' },
              ], width: 'auto' },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 1100, y2: 0, lineWidth: 0.3, lineColor: D10_PALETTE.rule2 }], margin: [0, 18, 0, 18] },
        {
          table: { headerRows: 1, widths, body, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.3 : 0.15),
            vLineWidth: () => 0,
            hLineColor: () => D10_PALETTE.rule2,
            paddingTop:    () => 8,
            paddingBottom: () => 8,
            paddingLeft:   () => 0,
            paddingRight:  () => 6,
          },
        },
      ],
      header: d10Header(project, revision),
      footer: d10Footer(),
      background: d10Background(),
      styles: D10_STYLES,
      defaultStyle: { font: 'Cormorant', fontSize: 11, color: D10_PALETTE.ink, lineHeight: 1.4 },
    };
  }

  const D10 = {
    id: 'D10', name: 'Wabi-sabi',
    eyebrow: 'D10 — Quiet',
    description: 'Warm parchment with deep indigo ink, soft Cormorant italic display, asymmetric layouts, big margins. Hairline rules only, no fills. The quietest direction.',
    meta: 'A4 portrait · lowest density · italic display',
    fonts: ['Cormorant', 'Inter'],
    paperHint: { 'cover-grouped': { paper: 'A4', orientation: 'portrait' }, table: { paper: 'A3', orientation: 'landscape' } },
    pageMargins: { 'cover-grouped': [80, 70, 80, 70], table: [55, 55, 55, 55] },
    buildCoverGrouped: d10BuildCoverGrouped,
    buildTable: d10BuildTable,
  };

  // ═════════════════════════════════════════════════════════════════════
  // D2 · DRAFTING BLOCK
  // Pure white, all monospace, drawing-sheet conventions — title block
  // in the corner of every page, registration marks, faint ruled grid.
  // High density. For builders and consultants.
  // ═════════════════════════════════════════════════════════════════════

  const D2_PALETTE = {
    paper:  '#ffffff',
    ink:    '#0d1b29',
    ink2:   '#233140',
    ink3:   '#687785',
    ink4:   '#aab4be',
    rule:   '#0d1b29',
    rule2:  '#c4ccd4',
    blue:   '#1e4a72',
  };

  const D2_STYLES = {
    d2Strip:        { font: 'JetBrainsMono', fontSize: 7,   characterSpacing: 1.2, color: D2_PALETTE.ink3 },
    d2StripV:       { font: 'JetBrainsMono', fontSize: 7,   color: D2_PALETTE.ink, bold: true },
    d2CoverEye:     { font: 'JetBrainsMono', fontSize: 9,   characterSpacing: 1.8, color: D2_PALETTE.ink3 },
    d2CoverTitle:   { font: 'Inter',         fontSize: 50,  bold: true, color: D2_PALETTE.ink, lineHeight: 0.95 },
    d2CoverSub:     { font: 'JetBrainsMono', fontSize: 9,   color: D2_PALETTE.ink2, lineHeight: 1.5 },
    d2SheetNo:      { font: 'JetBrainsMono', fontSize: 20,  bold: true, color: D2_PALETTE.ink },
    d2Badge:        { font: 'JetBrainsMono', fontSize: 8,   characterSpacing: 1.4, color: D2_PALETTE.ink },
    d2MetaK:        { font: 'JetBrainsMono', fontSize: 6.5, characterSpacing: 1.2, color: D2_PALETTE.ink3 },
    d2MetaV:        { font: 'JetBrainsMono', fontSize: 9,   color: D2_PALETTE.ink, bold: true },
    d2FigLbl:       { font: 'JetBrainsMono', fontSize: 8,   characterSpacing: 1.4, color: D2_PALETTE.ink2 },
    d2FigVal:       { font: 'Inter',         fontSize: 32,  bold: true, color: D2_PALETTE.ink },

    d2SectNum:      { font: 'JetBrainsMono', fontSize: 9,   characterSpacing: 1.2, color: D2_PALETTE.blue, bold: true },
    d2SectTtl:      { font: 'Inter',         fontSize: 18,  bold: true, color: D2_PALETTE.ink, lineHeight: 1.0 },
    d2SectCt:       { font: 'JetBrainsMono', fontSize: 8,   characterSpacing: 1.4, color: D2_PALETTE.ink3 },

    d2TH:           { font: 'JetBrainsMono', fontSize: 6.5, characterSpacing: 1.3, color: D2_PALETTE.ink2, bold: true },
    d2TD:           { font: 'JetBrainsMono', fontSize: 8,   color: D2_PALETTE.ink },
    d2TDName:       { font: 'Inter',         fontSize: 9,   bold: true, color: D2_PALETTE.ink },
    d2TDLoc:        { font: 'JetBrainsMono', fontSize: 7,   color: D2_PALETTE.ink3 },
    d2TDMuted:      { font: 'JetBrainsMono', fontSize: 7.5, color: D2_PALETTE.ink3 },
    d2Band:         { font: 'JetBrainsMono', fontSize: 8.5, characterSpacing: 1.3, bold: true, color: '#ffffff' },

    d2AHeadEye:     { font: 'JetBrainsMono', fontSize: 8,   characterSpacing: 1.4, color: D2_PALETTE.ink3 },
    d2AHeadTtl:     { font: 'Inter',         fontSize: 26,  bold: true, color: D2_PALETTE.ink, lineHeight: 1.0 },
    d2AHeadMeta:    { font: 'JetBrainsMono', fontSize: 7.5, color: D2_PALETTE.ink3 },
  };

  // Drafting-grid background + corner registration marks on every page.
  // Title block lives in the page footer (margin reserved by the theme).
  function d2Background(project, revision) {
    return (currentPage, pageSize) => {
      const w = pageSize.width, h = pageSize.height;
      const canvas = [
        { type: 'rect', x: 0, y: 0, w, h, color: D2_PALETTE.paper },
      ];
      // Subtle 24pt grid
      const grid = '#eef0f2';
      for (let x = 24; x < w; x += 24) canvas.push({ type: 'line', x1: x, y1: 0, x2: x, y2: h, lineWidth: 0.2, lineColor: grid });
      for (let y = 24; y < h; y += 24) canvas.push({ type: 'line', x1: 0, y1: y, x2: w, y2: y, lineWidth: 0.2, lineColor: grid });
      // Corner registration marks
      const r = 16;
      canvas.push(
        { type: 'line', x1: 8, y1: 8, x2: 8 + r, y2: 8, lineWidth: 0.7, lineColor: D2_PALETTE.ink },
        { type: 'line', x1: 8, y1: 8, x2: 8, y2: 8 + r, lineWidth: 0.7, lineColor: D2_PALETTE.ink },
        { type: 'line', x1: w - 8, y1: 8, x2: w - 8 - r, y2: 8, lineWidth: 0.7, lineColor: D2_PALETTE.ink },
        { type: 'line', x1: w - 8, y1: 8, x2: w - 8, y2: 8 + r, lineWidth: 0.7, lineColor: D2_PALETTE.ink },
        { type: 'line', x1: 8, y1: h - 8, x2: 8 + r, y2: h - 8, lineWidth: 0.7, lineColor: D2_PALETTE.ink },
        { type: 'line', x1: 8, y1: h - 8, x2: 8, y2: h - 8 - r, lineWidth: 0.7, lineColor: D2_PALETTE.ink },
        { type: 'line', x1: w - 8, y1: h - 8, x2: w - 8 - r, y2: h - 8, lineWidth: 0.7, lineColor: D2_PALETTE.ink },
        { type: 'line', x1: w - 8, y1: h - 8, x2: w - 8, y2: h - 8 - r, lineWidth: 0.7, lineColor: D2_PALETTE.ink }
      );
      return { canvas };
    };
  }

  // Top strip — fragments of header data per page.
  function d2Header(project, revision) {
    return (currentPage, pageCount) => {
      if (currentPage === 1) return null;
      return {
        table: {
          widths: ['auto', 'auto', '*', 'auto', 'auto'],
          body: [[
            { text: [{ text: 'SHEET ', style: 'd2Strip' }, { text: 'CS·' + pad2(currentPage), style: 'd2StripV' }], border: [false, true, true, true], borderColor: ['', D2_PALETTE.ink, D2_PALETTE.ink, D2_PALETTE.ink] },
            { text: [{ text: 'DOC ',  style: 'd2Strip' }, { text: 'Project Schedule', style: 'd2StripV' }], border: [false, true, true, true], borderColor: ['', D2_PALETTE.ink, D2_PALETTE.ink, D2_PALETTE.ink] },
            { text: '', border: [false, true, false, true], borderColor: ['', D2_PALETTE.ink, '', D2_PALETTE.ink] },
            { text: [{ text: 'PROJ ', style: 'd2Strip' }, { text: project.code || '—', style: 'd2StripV' }], border: [true, true, true, true], borderColor: [D2_PALETTE.ink, D2_PALETTE.ink, D2_PALETTE.ink, D2_PALETTE.ink] },
            { text: [{ text: 'REV ',  style: 'd2Strip' }, { text: (revision || '—').replace(/^Rev\.\s*/, ''), style: 'd2StripV' }], border: [false, true, false, true], borderColor: ['', D2_PALETTE.ink, '', D2_PALETTE.ink] },
          ]],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: (i) => i === 0 || i === 5 ? 0 : 0.5,
          hLineColor: () => D2_PALETTE.ink,
          vLineColor: () => D2_PALETTE.ink,
          paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 8, paddingRight: () => 8,
        },
        margin: [44, 32, 44, 0],
      };
    };
  }

  // Title block (drawing-sheet bottom strip) — appears on every page.
  // Two flat rows of cells (rowSpan caused pdfmake to hang on A3
  // landscape — simpler grid layout sidesteps that).
  function d2Footer(project, revision) {
    return (currentPage, pageCount) => {
      const today = B.todayLong();
      const codeShort = (project.code || '').replace(/[·.]/g, '-');
      const file = codeShort + '_PS_' + (revision || 'X').replace(/^Rev\.\s*/, '');
      const row1 = [
        { stack: [{ text: 'Hollis & Arne', font: 'Inter', fontSize: 12, bold: true, color: D2_PALETTE.ink }, { text: 'ARCHITECTS · STUDIO ARCHIVE', style: 'd2MetaK', margin: [0, 2, 0, 0] }] },
        { stack: [{ text: 'PROJECT', style: 'd2MetaK' }, { text: project.name || '—', style: 'd2MetaV', margin: [0, 3, 0, 0] }] },
        { stack: [{ text: 'PROJ NO.', style: 'd2MetaK' }, { text: project.code || '—', style: 'd2MetaV', margin: [0, 3, 0, 0] }] },
        { stack: [{ text: 'CLIENT', style: 'd2MetaK' }, { text: project.client || '—', style: 'd2MetaV', margin: [0, 3, 0, 0] }] },
        { stack: [{ text: 'SHEET', style: 'd2MetaK' }, { text: 'CS·' + pad2(currentPage), font: 'JetBrainsMono', fontSize: 14, bold: true, color: D2_PALETTE.ink, margin: [0, 2, 0, 0] }] },
      ];
      const row2 = [
        { stack: [{ text: 'ISSUED', style: 'd2MetaK' }, { text: today, style: 'd2MetaV', margin: [0, 3, 0, 0] }] },
        { stack: [{ text: 'STAGE', style: 'd2MetaK' }, { text: (project.stage || 'CD').slice(0, 12), style: 'd2MetaV', margin: [0, 3, 0, 0] }] },
        { stack: [{ text: 'REV', style: 'd2MetaK' }, { text: (revision || '—').replace(/^Rev\.\s*/, ''), color: D2_PALETTE.blue, font: 'JetBrainsMono', fontSize: 10, bold: true, margin: [0, 3, 0, 0] }] },
        { stack: [{ text: 'SHEETS', style: 'd2MetaK' }, { text: pad2(pageCount) + '  ·  DRAWN HA', style: 'd2MetaV', margin: [0, 3, 0, 0] }] },
        { stack: [{ text: 'FILE', style: 'd2MetaK' }, { text: file, font: 'JetBrainsMono', fontSize: 7, color: D2_PALETTE.ink, margin: [0, 3, 0, 0] }] },
      ];
      return {
        margin: [44, 0, 44, 24],
        table: {
          widths: [115, '*', 70, 80, 70],
          body: [row1, row2],
          dontBreakRows: true,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => D2_PALETTE.ink,
          vLineColor: () => D2_PALETTE.ink,
          paddingTop: () => 6, paddingBottom: () => 6, paddingLeft: () => 6, paddingRight: () => 6,
        },
      };
    };
  }

  function d2CoverNode({ project, data, revision }) {
    const itemCount = (data && data.itemCount) || 0;
    const groupCount = (data && data.groups && data.groups.length) || 0;
    const today = B.todayLong();
    return {
      stack: [
        // Top strip
        {
          margin: [0, 8, 0, 24],
          table: {
            widths: ['auto', 'auto', '*', 'auto', 'auto'],
            body: [[
              { text: [{ text: 'SHEET ', style: 'd2Strip' }, { text: 'CS·00', style: 'd2StripV' }] },
              { text: [{ text: 'DOC ', style: 'd2Strip' }, { text: 'Project Schedule — Cover', style: 'd2StripV' }] },
              { text: '' },
              { text: [{ text: 'PROJ ', style: 'd2Strip' }, { text: project.code || '—', style: 'd2StripV' }] },
              { text: [{ text: 'REV ', style: 'd2Strip' }, { text: (revision || '—').replace(/^Rev\.\s*/, ''), style: 'd2StripV' }] },
            ]],
          },
          layout: {
            hLineWidth: (i) => i === 0 ? 1.6 : 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => D2_PALETTE.ink,
            vLineColor: () => D2_PALETTE.ink,
            paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 8, paddingRight: () => 8,
          },
        },
        // Framed drawing-sheet style cover
        {
          margin: [0, 0, 0, 18],
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                {
                  columns: [
                    { text: 'CS·00', style: 'd2SheetNo', width: 'auto' },
                    { text: '', width: '*' },
                    { text: 'COVER SHEET · PROJECT SCHEDULE', style: 'd2Badge', width: 'auto' },
                  ],
                  margin: [0, 0, 0, 14],
                },
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 440, y2: 0, lineWidth: 0.6, lineColor: D2_PALETTE.ink }], margin: [0, 0, 0, 28] },
                { text: 'IV · PROJECT SCHEDULE', style: 'd2CoverEye', margin: [0, 0, 0, 14] },
                { text: project.name || 'Untitled Project', style: 'd2CoverTitle', margin: [0, 0, 0, 14] },
                { text: 'Specification record · ' + itemCount + ' items across ' + groupCount + ' groups. Issued for site, supplier and consultant reference.', style: 'd2CoverSub', width: 400, margin: [0, 0, 0, 28] },
                {
                  table: {
                    widths: ['*', '*', '*', '*'],
                    body: [
                      [
                        { stack: [{ text: 'PROJ NO.', style: 'd2MetaK' }, { text: project.code || '—', style: 'd2MetaV', margin: [0, 4, 0, 0] }] },
                        { stack: [{ text: 'CLIENT',   style: 'd2MetaK' }, { text: project.client || '—', style: 'd2MetaV', margin: [0, 4, 0, 0] }] },
                        { stack: [{ text: 'STAGE',    style: 'd2MetaK' }, { text: project.stage || 'CD', style: 'd2MetaV', margin: [0, 4, 0, 0] }] },
                        { stack: [{ text: 'REVISION', style: 'd2MetaK' }, { text: (revision || '—').replace(/^Rev\.\s*/, ''), style: 'd2MetaV', color: D2_PALETTE.blue, margin: [0, 4, 0, 0] }] },
                      ],
                      [
                        { stack: [{ text: 'ADDRESS', style: 'd2MetaK' }, { text: (project.address || '—').slice(0, 40), style: 'd2MetaV', margin: [0, 4, 0, 0] }] },
                        { stack: [{ text: 'ARCHITECT', style: 'd2MetaK' }, { text: 'Hollis & Arne', style: 'd2MetaV', margin: [0, 4, 0, 0] }] },
                        { stack: [{ text: 'DRAWN/CHECKED', style: 'd2MetaK' }, { text: 'HA / JA', style: 'd2MetaV', margin: [0, 4, 0, 0] }] },
                        { stack: [{ text: 'ISSUED', style: 'd2MetaK' }, { text: today, style: 'd2MetaV', margin: [0, 4, 0, 0] }] },
                      ],
                    ],
                  },
                  layout: {
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0.5,
                    hLineColor: () => D2_PALETTE.ink,
                    vLineColor: () => D2_PALETTE.ink,
                    paddingTop: () => 8, paddingBottom: () => 8, paddingLeft: () => 8, paddingRight: () => 8,
                  },
                },
                {
                  margin: [0, 28, 0, 0],
                  columns: [
                    { text: itemCount + ' ITEMS · ' + groupCount + ' GROUPS', style: 'd2FigLbl', width: '*', margin: [0, 14, 0, 0] },
                    { text: String(itemCount), style: 'd2FigVal', width: 'auto', alignment: 'right' },
                  ],
                },
              ],
              border: [true, true, true, true],
              borderColor: [D2_PALETTE.ink, D2_PALETTE.ink, D2_PALETTE.ink, D2_PALETTE.ink],
              margin: [22, 22, 22, 22],
            }]],
          },
          layout: {
            hLineWidth: () => 1.6,
            vLineWidth: () => 1.6,
            hLineColor: () => D2_PALETTE.ink,
            vLineColor: () => D2_PALETTE.ink,
          },
        },
      ],
      pageBreak: 'after',
    };
  }

  function d2SectionNode({ group, idx, total, content }) {
    const cards = group.cards || [];
    const cols = tableCols(content);
    const labels = { code: 'Code', material: 'Material', element: 'Element', location: 'Location', supplier: 'Brand', trade: 'Trade', sku: 'SKU' };
    const headerRow = cols.map(c => ({ text: (labels[c.id] || c.id).toUpperCase(), style: 'd2TH', alignment: 'left' }));
    const body = [headerRow].concat(cards.map(card => cols.map(c => {
      if (c.id === 'code') return { text: card.code || '—', style: 'd2TD' };
      if (c.id === 'material') {
        return {
          stack: [
            { text: card.name || 'Unspecified', style: 'd2TDName' },
            card._specNote ? { text: card._specNote, style: 'd2TDLoc', margin: [0, 1, 0, 0] } : null,
          ].filter(Boolean),
        };
      }
      if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd2TDMuted' };
      if (c.id === 'location') return { text: card.locationName || '—', style: 'd2TDMuted' };
      if (c.id === 'supplier') return { text: (card.swatchBrand || card.supplier || '—'), style: 'd2TD' };
      if (c.id === 'trade')    return { text: card.trade || '—', style: 'd2TDMuted' };
      if (c.id === 'sku')      return { text: card.sku || '—', style: 'd2TD' };
      return { text: '' };
    })));
    return {
      stack: [
        // Section banner: blue bar with section number + title
        {
          margin: [0, 8, 0, 14],
          table: {
            widths: ['auto', '*', 'auto'],
            body: [[
              { text: 'IV · ' + pad2(idx), style: 'd2SectNum', margin: [10, 8, 10, 8], fillColor: '#eaf0f6', border: [true, true, false, true], borderColor: [D2_PALETTE.blue, D2_PALETTE.blue, '', D2_PALETTE.blue] },
              { text: (group.title || '—').toUpperCase(), style: 'd2SectTtl', margin: [4, 6, 8, 8], border: [false, true, false, true], borderColor: ['', D2_PALETTE.blue, '', D2_PALETTE.blue] },
              { text: cards.length + ' ITEM' + (cards.length === 1 ? '' : 'S'), style: 'd2SectCt', margin: [8, 9, 10, 8], border: [false, true, true, true], borderColor: ['', D2_PALETTE.blue, D2_PALETTE.blue, D2_PALETTE.blue] },
            ]],
          },
          layout: { hLineWidth: () => 0.6, vLineWidth: () => 0.6, hLineColor: () => D2_PALETTE.blue, vLineColor: () => D2_PALETTE.blue, paddingTop: () => 0, paddingBottom: () => 0, paddingLeft: () => 0, paddingRight: () => 0 },
        },
        {
          table: { widths: d2ColWidths(cols), body, headerRows: 1, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.6 : 0.3),
            vLineWidth: () => 0,
            hLineColor: (i) => i === 1 ? D2_PALETTE.ink : D2_PALETTE.rule2,
            paddingTop:    () => 6,
            paddingBottom: () => 6,
            paddingLeft:   () => 5,
            paddingRight:  () => 5,
          },
        },
      ],
      pageBreak: 'before',
    };
  }

  function d2ColWidths(cols) {
    return cols.map(c => c.id === 'code' ? 56 : c.id === 'material' ? '*' : c.id === 'element' ? 75 : c.id === 'location' ? 100 : c.id === 'supplier' ? 100 : c.id === 'trade' ? 60 : 75);
  }

  function d2SummaryNode({ project, data, revision }) {
    const itemCount = (data && data.itemCount) || 0;
    const groups = (data && data.groups) || [];
    return {
      stack: [
        { text: 'IV · CS·END · SUMMARY', style: 'd2CoverEye', margin: [0, 8, 0, 18] },
        {
          table: {
            widths: [60, '*', 'auto'],
            body: [
              [
                { text: 'GROUP', style: 'd2TH' },
                { text: 'TITLE', style: 'd2TH' },
                { text: 'COUNT', style: 'd2TH', alignment: 'right' },
              ],
              ...groups.map((g, i) => [
                { text: 'IV·' + pad2(i + 1), style: 'd2TD' },
                { text: g.title || '—', style: 'd2TDName' },
                { text: String((g.cards || []).length), style: 'd2TD', alignment: 'right' },
              ]),
              [
                { text: 'TOTAL', style: 'd2SectNum' },
                { text: '', },
                { text: String(itemCount), style: 'd2FigVal', alignment: 'right' },
              ],
            ],
          },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.6 : 0.3),
            vLineWidth: () => 0,
            hLineColor: () => D2_PALETTE.ink,
            paddingTop: () => 6, paddingBottom: () => 6, paddingLeft: () => 5, paddingRight: () => 5,
          },
        },
      ],
      pageBreak: 'before',
    };
  }

  function d2BuildCoverGrouped({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const out = [];
    if (content.cover) out.push(d2CoverNode({ project, data, revision }));
    groups.forEach((g, gi) => {
      const node = d2SectionNode({ group: g, idx: gi + 1, total: groups.length, content });
      if (gi === 0 && !content.cover) delete node.pageBreak;
      out.push(node);
    });
    if (content.cover) out.push(d2SummaryNode({ project, data, revision }));
    return {
      content: out,
      header: d2Header(project, revision),
      footer: d2Footer(project, revision),
      background: d2Background(project, revision),
      styles: D2_STYLES,
      defaultStyle: { font: 'JetBrainsMono', fontSize: 8.5, color: D2_PALETTE.ink, lineHeight: 1.4 },
    };
  }

  function d2BuildTable({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const itemCount = (data && data.itemCount) || 0;
    const today = B.todayLong();
    const cols = tableCols(content);
    const widths = cols.map(c => c.id === 'code' ? 60 : c.id === 'material' ? '*' : c.id === 'element' ? 90 : c.id === 'location' ? 130 : c.id === 'supplier' ? 130 : c.id === 'trade' ? 80 : 90);
    const labels = { code: 'Code', material: 'Material', element: 'Element', location: 'Location', supplier: 'Brand', trade: 'Trade', sku: 'SKU' };
    const headerRow = cols.map(c => ({ text: (labels[c.id] || c.id).toUpperCase(), style: 'd2TH', alignment: 'left' }));
    const body = [headerRow];
    groups.forEach((g) => {
      // Black banner. NOTE: don't put fillColor on the filler cells of
      // the colSpan — that combo hangs pdfmake on A3 landscape. The
      // primary cell's fillColor + colSpan paints the whole row span.
      body.push([{
        text: (g.title || '—').toUpperCase() + '   ·   ' + g.cards.length + ' ITEM' + (g.cards.length === 1 ? '' : 'S'),
        colSpan: cols.length, style: 'd2Band',
        fillColor: D2_PALETTE.ink,
        margin: [6, 6, 6, 6],
      }].concat(Array(cols.length - 1).fill({})));
      g.cards.forEach(card => {
        body.push(cols.map(c => {
          if (c.id === 'code') return { text: card.code || '—', style: 'd2TD' };
          if (c.id === 'material') {
            return {
              stack: [
                { text: card.name || 'Unspecified', style: 'd2TDName' },
                card._specNote ? { text: card._specNote, style: 'd2TDLoc', margin: [0, 1, 0, 0] } : null,
              ].filter(Boolean),
            };
          }
          if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd2TDMuted' };
          if (c.id === 'location') return { text: card.locationName || '—', style: 'd2TDMuted' };
          if (c.id === 'supplier') return { text: card.swatchBrand || card.supplier || '—', style: 'd2TD' };
          if (c.id === 'trade')    return { text: card.trade || '—', style: 'd2TDMuted' };
          if (c.id === 'sku')      return { text: card.sku || '—', style: 'd2TD' };
          return { text: '' };
        }));
      });
    });
    return {
      content: [
        {
          columns: [
            { stack: [{ text: 'IV · 00 · PROJECT SCHEDULE · COMPACT', style: 'd2AHeadEye', margin: [0, 0, 0, 6] }, { text: project.name || 'Untitled Project', style: 'd2AHeadTtl' }], width: '*' },
            { stack: [
              { text: project.client || '', style: 'd2AHeadMeta', alignment: 'right' },
              { text: (project.address || '').slice(0, 50), style: 'd2AHeadMeta', alignment: 'right' },
              { text: 'Hollis & Arne · ' + today, style: 'd2AHeadMeta', alignment: 'right' },
              { text: itemCount + ' items · ' + groups.length + ' group' + (groups.length === 1 ? '' : 's'), style: 'd2AHeadMeta', alignment: 'right' },
            ], width: 280 },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 1130, y2: 0, lineWidth: 0.8, lineColor: D2_PALETTE.ink }], margin: [0, 12, 0, 18] },
        {
          table: { headerRows: 1, widths, body, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.6 : 0.3),
            vLineWidth: () => 0,
            hLineColor: (i) => i === 1 ? D2_PALETTE.ink : D2_PALETTE.rule2,
            paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 5, paddingRight: () => 5,
          },
        },
      ],
      header: d2Header(project, revision),
      footer: d2Footer(project, revision),
      background: d2Background(project, revision),
      styles: D2_STYLES,
      defaultStyle: { font: 'JetBrainsMono', fontSize: 8, color: D2_PALETTE.ink, lineHeight: 1.4 },
    };
  }

  const D2 = {
    id: 'D2', name: 'Drafting Block',
    eyebrow: 'D2 — Technical',
    description: 'Pure white, mono throughout, drawing-sheet conventions — title block at the foot of every page, registration marks, faint ruled grid. High density.',
    meta: 'A4 portrait · high density · mono',
    fonts: ['JetBrainsMono', 'Inter'],
    paperHint: { 'cover-grouped': { paper: 'A4', orientation: 'portrait' }, table: { paper: 'A3', orientation: 'landscape' } },
    // Bigger bottom margin to make space for the title block.
    pageMargins: { 'cover-grouped': [44, 60, 44, 195], table: [44, 60, 44, 175] },
    buildCoverGrouped: d2BuildCoverGrouped,
    buildTable: d2BuildTable,
  };

  // ═════════════════════════════════════════════════════════════════════
  // D6 · INDEX
  // Cool grey paper, all monospace + Inter heavy display, bar-chart of
  // groups on cover, dense table. Highest density.
  // ═════════════════════════════════════════════════════════════════════

  const D6_PALETTE = {
    paper:  '#e8e9eb',
    paper2: '#dadce0',
    ink:    '#1a1d20',
    ink2:   '#33373c',
    ink3:   '#6a6d70',
    ink4:   '#a0a3a6',
    rule:   '#1a1d20',
    rule2:  '#b8babd',
  };

  const D6_STYLES = {
    d6Eye:        { font: 'JetBrainsMono', fontSize: 7.5, characterSpacing: 1.4, color: D6_PALETTE.ink3 },
    d6CoverTitle: { font: 'Inter',         fontSize: 60, bold: true, color: D6_PALETTE.ink, lineHeight: 0.9 },
    d6CoverSub:   { font: 'JetBrainsMono', fontSize: 9, color: D6_PALETTE.ink2, lineHeight: 1.5 },
    d6MetaK:      { font: 'JetBrainsMono', fontSize: 7, characterSpacing: 1.4, color: D6_PALETTE.ink3 },
    d6MetaV:      { font: 'JetBrainsMono', fontSize: 9.5, color: D6_PALETTE.ink, bold: true },
    d6Bar:        { font: 'JetBrainsMono', fontSize: 8.5, color: D6_PALETTE.ink2 },
    d6FigLbl:     { font: 'JetBrainsMono', fontSize: 8.5, characterSpacing: 1.4, color: D6_PALETTE.ink2 },
    d6FigVal:     { font: 'Inter',         fontSize: 30, bold: true, color: D6_PALETTE.ink },

    d6SectNum:    { font: 'JetBrainsMono', fontSize: 10, characterSpacing: 1.4, color: D6_PALETTE.ink3, bold: true },
    d6SectTtl:    { font: 'Inter',         fontSize: 22, bold: true, color: D6_PALETTE.ink, lineHeight: 1.0 },
    d6SectCt:     { font: 'JetBrainsMono', fontSize: 8, characterSpacing: 1.4, color: D6_PALETTE.ink3 },

    d6TH:         { font: 'JetBrainsMono', fontSize: 7, characterSpacing: 1.3, color: D6_PALETTE.ink2, bold: true },
    d6TD:         { font: 'JetBrainsMono', fontSize: 8, color: D6_PALETTE.ink },
    d6TDName:     { font: 'Inter',         fontSize: 8.5, bold: true, color: D6_PALETTE.ink },
    d6TDLoc:      { font: 'JetBrainsMono', fontSize: 7, color: D6_PALETTE.ink3 },
    d6TDMuted:    { font: 'JetBrainsMono', fontSize: 7.5, color: D6_PALETTE.ink3 },
    d6Band:       { font: 'JetBrainsMono', fontSize: 9, characterSpacing: 1.4, bold: true, color: '#ffffff' },

    d6AHeadEye:   { font: 'JetBrainsMono', fontSize: 8.5, characterSpacing: 1.4, color: D6_PALETTE.ink3 },
    d6AHeadTtl:   { font: 'Inter',         fontSize: 28, bold: true, color: D6_PALETTE.ink, lineHeight: 1.0 },
    d6AHeadMeta:  { font: 'JetBrainsMono', fontSize: 7.5, color: D6_PALETTE.ink3 },

    d6RH:         { font: 'JetBrainsMono', fontSize: 7, characterSpacing: 1.3, color: D6_PALETTE.ink3 },
    d6Foot:       { font: 'JetBrainsMono', fontSize: 7, characterSpacing: 1.2, color: D6_PALETTE.ink3 },
  };

  function d6Header(project, revision) {
    return (currentPage, pageCount) => {
      if (currentPage === 1) return null;
      return {
        columns: [
          { text: (project.code || '—') + ' · ' + (project.name || ''), style: 'd6RH' },
          { text: 'IV · ' + pad2(currentPage), style: 'd6RH', alignment: 'right' },
        ],
        margin: [40, 32, 40, 0],
      };
    };
  }

  function d6Footer() {
    return (currentPage, pageCount) => ({
      columns: [
        { text: 'HA · PS · IV', style: 'd6Foot' },
        { text: pad2(currentPage) + ' / ' + pad2(pageCount), style: 'd6Foot', alignment: 'right' },
      ],
      margin: [40, 8, 40, 26],
    });
  }

  function d6Background() {
    return (currentPage, pageSize) => ({
      canvas: [{ type: 'rect', x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: D6_PALETTE.paper }],
    });
  }

  function d6CoverNode({ project, data, revision }) {
    const groups = (data && data.groups) || [];
    const itemCount = (data && data.itemCount) || 0;
    const maxCount = Math.max(1, ...groups.map(g => (g.cards || []).length));
    const today = B.todayLong();
    return {
      stack: [
        { text: 'HOLLIS · ARNE  ·  ARCHITECTS  ·  STUDIO ARCHIVE', style: 'd6Eye', margin: [0, 0, 0, 24] },
        { text: 'IV · 00 · PROJECT SCHEDULE', style: 'd6Eye', margin: [0, 0, 0, 12] },
        { text: (project.name || 'UNTITLED').toUpperCase(), style: 'd6CoverTitle', margin: [0, 0, 0, 18] },
        { text: 'A printable record of every material specified — ' + itemCount + ' items across ' + groups.length + ' groups.', style: 'd6CoverSub', width: 460, margin: [0, 0, 0, 28] },
        // 4-column meta strip
        {
          table: { widths: ['*', '*', '*', '*'], body: [[
            { stack: [{ text: 'PROJ',   style: 'd6MetaK' }, { text: project.code || '—', style: 'd6MetaV', margin: [0, 4, 0, 0] }] },
            { stack: [{ text: 'CLIENT', style: 'd6MetaK' }, { text: project.client || '—', style: 'd6MetaV', margin: [0, 4, 0, 0] }] },
            { stack: [{ text: 'STAGE',  style: 'd6MetaK' }, { text: project.stage || 'CD', style: 'd6MetaV', margin: [0, 4, 0, 0] }] },
            { stack: [{ text: 'REV · DATE', style: 'd6MetaK' }, { text: (revision || '—').replace(/^Rev\.\s*/, '') + ' · ' + today, style: 'd6MetaV', margin: [0, 4, 0, 0] }] },
          ]]},
          layout: 'noBorders',
          margin: [0, 0, 0, 24],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.6, lineColor: D6_PALETTE.ink }] },
        // Bar chart of group sizes
        {
          margin: [0, 16, 0, 0],
          stack: [
            {
              columns: [
                { text: 'COUNT BY GROUP', style: 'd6MetaK', width: '*' },
                { text: 'ITEMS', style: 'd6MetaK', alignment: 'right', width: 'auto' },
              ],
              margin: [0, 0, 0, 12],
            },
            ...groups.map((g, gi) => {
              const n = (g.cards || []).length;
              const barWidth = Math.round((n / maxCount) * 380);
              return {
                columns: [
                  { text: pad2(gi + 1) + ' · ' + (g.title || '—'), style: 'd6Bar', width: 140 },
                  { canvas: [{ type: 'rect', x: 0, y: 3, w: Math.max(2, barWidth), h: 8, color: D6_PALETTE.ink }], width: '*' },
                  { text: String(n), style: 'd6Bar', alignment: 'right', width: 30 },
                ],
                margin: [0, 0, 0, 6],
              };
            }),
          ],
        },
        // Big figure
        {
          margin: [0, 30, 0, 0],
          columns: [
            { text: 'TOTAL ITEMS', style: 'd6FigLbl', width: '*', margin: [0, 10, 0, 0] },
            { text: String(itemCount), style: 'd6FigVal', width: 'auto', alignment: 'right' },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.6, lineColor: D6_PALETTE.ink }], margin: [0, 4, 0, 0] },
      ],
      pageBreak: 'after',
    };
  }

  function d6SectionNode({ group, idx, total, content }) {
    const cards = group.cards || [];
    const cols = tableCols(content);
    const labels = { code: 'CODE', material: 'MATERIAL', element: 'ELEMENT', location: 'LOCATION', supplier: 'BRAND', trade: 'TRADE', sku: 'SKU' };
    const headerRow = cols.map(c => ({ text: labels[c.id] || c.id.toUpperCase(), style: 'd6TH', alignment: 'left' }));
    const body = [headerRow].concat(cards.map(card => cols.map(c => {
      if (c.id === 'code') return { text: card.code || '—', style: 'd6TD' };
      if (c.id === 'material') return {
        stack: [
          { text: card.name || 'Unspecified', style: 'd6TDName' },
          card._dims ? { text: card._dims, style: 'd6TDLoc', margin: [0, 1, 0, 0] } : null,
        ].filter(Boolean),
      };
      if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd6TDMuted' };
      if (c.id === 'location') return { text: card.locationName || '—', style: 'd6TDMuted' };
      if (c.id === 'supplier') return { text: card.swatchBrand || card.supplier || '—', style: 'd6TD' };
      if (c.id === 'trade')    return { text: card.trade || '—', style: 'd6TDMuted' };
      if (c.id === 'sku')      return { text: card.sku || '—', style: 'd6TD' };
      return { text: '' };
    })));
    return {
      stack: [
        {
          columns: [
            { text: 'IV · ' + pad2(idx), style: 'd6SectNum', width: 'auto', margin: [0, 8, 0, 0] },
            { text: (group.title || '—').toUpperCase(), style: 'd6SectTtl', width: '*', margin: [12, 0, 0, 0] },
            { text: cards.length + ' ITEMS · ' + Math.round(cards.length / Math.max(1, (group._totalItems || cards.length)) * 100) + '% OF GROUP', style: 'd6SectCt', width: 'auto', alignment: 'right', margin: [0, 10, 0, 0] },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.6, lineColor: D6_PALETTE.ink }], margin: [0, 10, 0, 14] },
        {
          table: { widths: d6ColWidths(cols), body, headerRows: 1, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.5 : 0.25),
            vLineWidth: () => 0,
            hLineColor: (i) => i === 1 ? D6_PALETTE.ink : D6_PALETTE.rule2,
            paddingTop:    () => 5,
            paddingBottom: () => 5,
            paddingLeft:   () => 4,
            paddingRight:  () => 4,
          },
        },
      ],
      pageBreak: 'before',
    };
  }

  function d6ColWidths(cols) {
    return cols.map(c => c.id === 'code' ? 50 : c.id === 'material' ? '*' : c.id === 'element' ? 65 : c.id === 'location' ? 90 : c.id === 'supplier' ? 90 : c.id === 'trade' ? 55 : 65);
  }

  function d6SummaryNode({ project, data, revision }) {
    const itemCount = (data && data.itemCount) || 0;
    const groups = (data && data.groups) || [];
    return {
      stack: [
        { text: 'IV · END · SUMMARY', style: 'd6Eye', margin: [0, 8, 0, 18] },
        {
          table: {
            widths: [50, '*', 'auto'],
            body: [
              [{ text: 'IDX', style: 'd6TH' }, { text: 'GROUP', style: 'd6TH' }, { text: 'COUNT', style: 'd6TH', alignment: 'right' }],
              ...groups.map((g, i) => [
                { text: pad2(i + 1), style: 'd6TD' },
                { text: g.title || '—', style: 'd6TDName' },
                { text: String((g.cards || []).length), style: 'd6TD', alignment: 'right' },
              ]),
              [
                { text: 'TOTAL', style: 'd6SectNum' },
                { text: '' },
                { text: String(itemCount), style: 'd6FigVal', alignment: 'right' },
              ],
            ],
          },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.5 : 0.25),
            vLineWidth: () => 0,
            hLineColor: () => D6_PALETTE.ink,
            paddingTop: () => 6, paddingBottom: () => 6, paddingLeft: () => 4, paddingRight: () => 4,
          },
        },
      ],
      pageBreak: 'before',
    };
  }

  function d6BuildCoverGrouped({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const out = [];
    if (content.cover) out.push(d6CoverNode({ project, data, revision }));
    groups.forEach((g, gi) => {
      const node = d6SectionNode({ group: g, idx: gi + 1, total: groups.length, content });
      if (gi === 0 && !content.cover) delete node.pageBreak;
      out.push(node);
    });
    if (content.cover) out.push(d6SummaryNode({ project, data, revision }));
    return {
      content: out,
      header: d6Header(project, revision),
      footer: d6Footer(),
      background: d6Background(),
      styles: D6_STYLES,
      defaultStyle: { font: 'JetBrainsMono', fontSize: 8, color: D6_PALETTE.ink, lineHeight: 1.4 },
    };
  }

  function d6BuildTable({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const itemCount = (data && data.itemCount) || 0;
    const today = B.todayLong();
    const cols = tableCols(content);
    const widths = cols.map(c => c.id === 'code' ? 55 : c.id === 'material' ? '*' : c.id === 'element' ? 85 : c.id === 'location' ? 120 : c.id === 'supplier' ? 120 : c.id === 'trade' ? 70 : 85);
    const labels = { code: 'CODE', material: 'MATERIAL', element: 'ELEMENT', location: 'LOCATION', supplier: 'BRAND', trade: 'TRADE', sku: 'SKU' };
    const headerRow = cols.map(c => ({ text: labels[c.id] || c.id.toUpperCase(), style: 'd6TH', alignment: 'left' }));
    const body = [headerRow];
    groups.forEach((g, gi) => {
      // See D2 builder note: fillColor on filler cells + colSpan
      // hangs pdfmake on A3 landscape. Bare {} placeholders are safe.
      body.push([{
        text: 'IV · ' + pad2(gi + 1) + ' · ' + (g.title || '—').toUpperCase() + '   ·   ' + g.cards.length + ' ITEMS',
        colSpan: cols.length, style: 'd6Band',
        fillColor: D6_PALETTE.ink,
        margin: [6, 6, 6, 6],
      }].concat(Array(cols.length - 1).fill({})));
      g.cards.forEach(card => {
        body.push(cols.map(c => {
          if (c.id === 'code') return { text: card.code || '—', style: 'd6TD' };
          if (c.id === 'material') return {
            stack: [
              { text: card.name || 'Unspecified', style: 'd6TDName' },
              card._dims ? { text: card._dims, style: 'd6TDLoc', margin: [0, 1, 0, 0] } : null,
            ].filter(Boolean),
          };
          if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd6TDMuted' };
          if (c.id === 'location') return { text: card.locationName || '—', style: 'd6TDMuted' };
          if (c.id === 'supplier') return { text: card.swatchBrand || card.supplier || '—', style: 'd6TD' };
          if (c.id === 'trade')    return { text: card.trade || '—', style: 'd6TDMuted' };
          if (c.id === 'sku')      return { text: card.sku || '—', style: 'd6TD' };
          return { text: '' };
        }));
      });
    });
    return {
      content: [
        {
          columns: [
            { stack: [{ text: 'IV · 00 · PROJECT SCHEDULE · COMPACT', style: 'd6AHeadEye', margin: [0, 0, 0, 6] }, { text: (project.name || 'UNTITLED').toUpperCase(), style: 'd6AHeadTtl' }], width: '*' },
            { stack: [
              { text: project.client || '', style: 'd6AHeadMeta', alignment: 'right' },
              { text: (project.address || '').slice(0, 50), style: 'd6AHeadMeta', alignment: 'right' },
              { text: 'Hollis & Arne · ' + today, style: 'd6AHeadMeta', alignment: 'right' },
              { text: itemCount + ' items · ' + groups.length + ' group' + (groups.length === 1 ? '' : 's'), style: 'd6AHeadMeta', alignment: 'right' },
            ], width: 260 },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 1130, y2: 0, lineWidth: 0.8, lineColor: D6_PALETTE.ink }], margin: [0, 10, 0, 14] },
        {
          table: { headerRows: 1, widths, body, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.6 : 0.3),
            vLineWidth: () => 0,
            hLineColor: (i) => i === 1 ? D6_PALETTE.ink : D6_PALETTE.rule2,
            paddingTop: () => 4, paddingBottom: () => 4, paddingLeft: () => 4, paddingRight: () => 4,
          },
        },
      ],
      header: d6Header(project, revision),
      footer: d6Footer(),
      background: d6Background(),
      styles: D6_STYLES,
      defaultStyle: { font: 'JetBrainsMono', fontSize: 7.5, color: D6_PALETTE.ink, lineHeight: 1.4 },
    };
  }

  const D6 = {
    id: 'D6', name: 'Index',
    eyebrow: 'D6 — Bauhaus',
    description: 'Bauhaus spec sheet. Cool grey paper, mono + Inter heavy display, bar-chart of groups on the cover, dense table. Highest density.',
    meta: 'A4 portrait · highest density · mono + heavy sans',
    fonts: ['JetBrainsMono', 'Inter'],
    paperHint: { 'cover-grouped': { paper: 'A4', orientation: 'portrait' }, table: { paper: 'A3', orientation: 'landscape' } },
    pageMargins: { 'cover-grouped': [40, 55, 40, 55], table: [40, 50, 40, 45] },
    buildCoverGrouped: d6BuildCoverGrouped,
    buildTable: d6BuildTable,
  };

  // ═════════════════════════════════════════════════════════════════════
  // D5 · FOLIO
  // Magazine. Full-bleed terracotta cover. Color-coded section openers
  // per trade (slate/moss/gold/terra/bone/ink, wrapping mod 6). Large
  // display italic. Cormorant italic + Inter.
  // ═════════════════════════════════════════════════════════════════════

  const D5_PALETTE = {
    paper:  '#fbfaf5',
    paper2: '#f3efe7',
    ink:    '#1a1815',
    ink2:   '#2c2924',
    ink3:   '#6a665d',
    ink4:   '#9a958a',
    rule:   '#1a1815',
    rule2:  '#c8c2b3',
    // Cover terracotta (full-bleed)
    coverBg: '#a4543a',
    coverInk: '#f5e9d8',
  };

  // FOLIO trade tones, mod-6. Each section page picks one by index.
  const FOLIO_TONES = [
    { bg: '#4a5862', fg: '#f5e9d8', name: 'slate' }, // 0
    { bg: '#6a7a4a', fg: '#f5e9d8', name: 'moss'  }, // 1
    { bg: '#b8985a', fg: '#fbfaf5', name: 'gold'  }, // 2
    { bg: '#a4543a', fg: '#f5e9d8', name: 'terra' }, // 3
    { bg: '#ddd0b8', fg: '#2c2924', name: 'bone'  }, // 4
    { bg: '#2d2520', fg: '#f5e9d8', name: 'ink'   }, // 5
  ];
  function folioTone(idx) { return FOLIO_TONES[(idx - 1) % FOLIO_TONES.length]; }

  const D5_STYLES = {
    d5CoverMark:   { font: 'Inter',     fontSize: 8.5, characterSpacing: 1.6, color: D5_PALETTE.coverInk },
    d5CoverTitle:  { font: 'Cormorant', fontSize: 76, italics: true, color: D5_PALETTE.coverInk, lineHeight: 0.95 },
    d5CoverDeck:   { font: 'Cormorant', fontSize: 16, italics: true, color: D5_PALETTE.coverInk, lineHeight: 1.4 },
    d5CoverK:      { font: 'Inter',     fontSize: 7.5, characterSpacing: 1.4, color: D5_PALETTE.coverInk },
    d5CoverV:      { font: 'Inter',     fontSize: 11, bold: true, color: D5_PALETTE.coverInk },
    d5CoverFig:    { font: 'Cormorant', fontSize: 50, italics: true, bold: true, color: D5_PALETTE.coverInk },
    d5CoverFigLbl: { font: 'Inter',     fontSize: 8,  characterSpacing: 1.6, color: D5_PALETTE.coverInk },

    d5SectKick:    { font: 'Inter',     fontSize: 9, characterSpacing: 1.5, color: '#f5e9d8' },
    d5SectTtl:     { font: 'Cormorant', fontSize: 56, italics: true, color: '#f5e9d8', lineHeight: 1.0 },
    d5SectDeck:    { font: 'Cormorant', fontSize: 13, italics: true, color: '#f5e9d8', lineHeight: 1.4 },
    d5SectCt:      { font: 'Inter',     fontSize: 9, characterSpacing: 1.4, color: '#f5e9d8' },

    d5TH:          { font: 'Inter',     fontSize: 7.5, characterSpacing: 1.4, color: D5_PALETTE.ink2, bold: true },
    d5TD:          { font: 'Inter',     fontSize: 10, color: D5_PALETTE.ink },
    d5TDMono:      { font: 'Inter',     fontSize: 9, color: D5_PALETTE.ink3 },
    d5TDName:      { font: 'Cormorant', fontSize: 13, color: D5_PALETTE.ink, bold: true },
    d5TDLoc:       { font: 'Cormorant', fontSize: 10, italics: true, color: D5_PALETTE.ink3 },
    d5TDMuted:     { font: 'Inter',     fontSize: 8.5, color: D5_PALETTE.ink3 },
    d5Pill:        { font: 'Inter',     fontSize: 8.5, characterSpacing: 1.4, bold: true },

    d5AHeadEye:    { font: 'Inter',     fontSize: 8, characterSpacing: 1.4, color: D5_PALETTE.ink3 },
    d5AHeadTtl:    { font: 'Cormorant', fontSize: 36, italics: true, color: D5_PALETTE.ink, lineHeight: 1.0 },
    d5AHeadMeta:   { font: 'Inter',     fontSize: 8.5, color: D5_PALETTE.ink3 },

    d5RH:          { font: 'Inter',     fontSize: 7.5, characterSpacing: 1.3, color: D5_PALETTE.ink3 },
    d5Foot:        { font: 'Inter',     fontSize: 7.5, characterSpacing: 1.2, color: D5_PALETTE.ink3 },
    d5CoverFoot:   { font: 'Inter',     fontSize: 7.5, characterSpacing: 1.4, color: D5_PALETTE.coverInk },
  };

  function d5Header(project, revision) {
    return (currentPage) => {
      if (currentPage === 1) return null;
      return {
        columns: [
          { text: (project.code || '') + ' · ' + (project.name || ''), style: 'd5RH' },
          { text: 'IV · Schedule' + (revision ? ' · ' + revision : ''), style: 'd5RH', alignment: 'right' },
        ],
        margin: [50, 30, 50, 0],
      };
    };
  }

  function d5Footer() {
    return (currentPage, pageCount) => ({
      columns: [
        { text: 'Hollis & Arne · Architects · Studio Archive', style: 'd5Foot' },
        { text: pad2(currentPage) + ' / ' + pad2(pageCount), style: 'd5Foot', alignment: 'right' },
      ],
      margin: [50, 8, 50, 28],
    });
  }

  // For D5 we use a per-page background fn that paints the cover
  // full-bleed terracotta. Other pages get neutral paper.
  function d5Background() {
    return (currentPage, pageSize) => {
      if (currentPage === 1) {
        return {
          canvas: [{ type: 'rect', x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: D5_PALETTE.coverBg }],
        };
      }
      return { canvas: [{ type: 'rect', x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: D5_PALETTE.paper }] };
    };
  }

  function d5CoverNode({ project, data, revision }) {
    const itemCount = (data && data.itemCount) || 0;
    const groupCount = (data && data.groups && data.groups.length) || 0;
    const today = B.todayLong();
    return {
      stack: [
        { text: '· HOLLIS & ARNE  ·  STUDIO ARCHIVE', style: 'd5CoverMark', margin: [0, 0, 0, 70] },
        { text: project.name || 'Untitled Project', style: 'd5CoverTitle', margin: [0, 0, 0, 26] },
        { text: 'A printable record of every material specified — colour, brand, location, finish. Prepared for client review.', style: 'd5CoverDeck', width: 440, margin: [0, 0, 0, 80] },
        // Meta row
        {
          table: { widths: ['*', '*', '*'], body: [[
            { stack: [{ text: 'VOLUME', style: 'd5CoverK' }, { text: 'IV · Project Schedule', style: 'd5CoverV', margin: [0, 4, 0, 0] }] },
            { stack: [{ text: 'PROJECT №', style: 'd5CoverK' }, { text: project.code || '—', style: 'd5CoverV', margin: [0, 4, 0, 0] }] },
            { stack: [{ text: 'REVISION · ISSUED', style: 'd5CoverK' }, { text: (revision || '—').replace(/^Rev\.\s*/, '') + ' · ' + today, style: 'd5CoverV', margin: [0, 4, 0, 0] }] },
          ]] },
          layout: 'noBorders',
          margin: [0, 0, 0, 24],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.6, lineColor: D5_PALETTE.coverInk }] },
        // Big figure
        {
          margin: [0, 18, 0, 0],
          columns: [
            { text: itemCount + ' ITEMS · ' + groupCount + ' GROUP' + (groupCount === 1 ? '' : 'S'), style: 'd5CoverFigLbl', width: '*', margin: [0, 24, 0, 0] },
            { text: String(itemCount), style: 'd5CoverFig', width: 'auto', alignment: 'right' },
          ],
        },
      ],
      pageBreak: 'after',
    };
  }

  function d5SectionNode({ group, idx, total, content }) {
    const cards = group.cards || [];
    const cols = tableCols(content);
    const tone = folioTone(idx);
    const labels = { code: 'Code', material: 'Material', element: 'Element', location: 'Location', supplier: 'Brand', trade: 'Trade', sku: 'SKU' };
    const headerRow = cols.map(c => ({ text: (labels[c.id] || c.id).toUpperCase(), style: 'd5TH', alignment: 'left' }));
    const body = [headerRow].concat(cards.map(card => cols.map(c => {
      if (c.id === 'code') return { text: card.code || '—', style: 'd5TDMono' };
      if (c.id === 'material') {
        const sw = card.swatchColor || '#e1dccd';
        return {
          columns: [
            content.imagery !== false
              ? { canvas: [{ type: 'rect', x: 0, y: 1, w: 14, h: 14, color: sw, lineColor: '#cfc9b7', lineWidth: 0.4 }], width: 20 }
              : { text: '', width: 0 },
            { stack: [
                { text: card.name || 'Unspecified', style: 'd5TDName' },
                card._specNote ? { text: card._specNote, style: 'd5TDLoc', margin: [0, 1, 0, 0] } : null,
              ].filter(Boolean), width: '*' },
          ],
        };
      }
      if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd5TDMuted' };
      if (c.id === 'location') return { text: card.locationName || '—', style: 'd5TDMuted' };
      if (c.id === 'supplier') return { text: card.swatchBrand || card.supplier || '—', style: 'd5TD' };
      if (c.id === 'trade')    return { text: card.trade || '—', style: 'd5TDMuted' };
      if (c.id === 'sku')      return { text: card.sku || '—', style: 'd5TDMono' };
      return { text: '' };
    })));
    return {
      stack: [
        // Color-band header — wraps to printable width via inner table
        {
          margin: [0, 0, 0, 22],
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: 'IV · ' + pad2(idx) + ' OF ' + pad2(total) + ' · TRADE', style: 'd5SectKick' },
                { text: group.title || '—', style: 'd5SectTtl', margin: [0, 14, 0, 14] },
                { columns: [
                  { text: groupBlurb(group.title), style: 'd5SectDeck', width: '*' },
                  { text: cards.length + ' ITEMS', style: 'd5SectCt', width: 'auto', alignment: 'right', margin: [0, 14, 0, 0] },
                ] },
              ],
              fillColor: tone.bg,
              color: tone.fg,
              border: [false, false, false, false],
              margin: [22, 22, 22, 22],
            }]],
          },
          layout: 'noBorders',
        },
        {
          table: { widths: d5ColWidths(cols), body, headerRows: 1, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.6 : 0.3),
            vLineWidth: () => 0,
            hLineColor: (i) => i === 1 ? D5_PALETTE.ink : D5_PALETTE.rule2,
            paddingTop:    () => 8,
            paddingBottom: () => 8,
            paddingLeft:   () => 6,
            paddingRight:  () => 6,
          },
        },
      ],
      pageBreak: 'before',
    };
  }

  function groupBlurb(title) {
    const map = {
      'Floors': 'Hardwood and stone selections, sealed and oiled for low-maintenance use.',
      'Walls': 'Low-sheen, lime-based and timber-lined surfaces for warmth and acoustic softening.',
      'Walls & ceilings': 'Low-sheen, lime-based and timber-lined surfaces for warmth and acoustic softening.',
      'Joinery': 'Veneer, laminate and burnt-ash carcassry across kitchen, bar and service zones.',
      'Tapware & fixtures': 'Mixers, basins and sanitaryware specified across wet areas.',
      'Stone & tile': 'Honed marble, travertine and Japanese ceramic — feature surfaces.',
      'Lighting': 'Ceramic and brass pendants and wall lights across living, dining, hallway.',
    };
    return map[title] || 'Specified materials assembled in this grouping.';
  }

  function d5ColWidths(cols) {
    return cols.map(c => c.id === 'code' ? 56 : c.id === 'material' ? '*' : c.id === 'element' ? 75 : c.id === 'location' ? 100 : c.id === 'supplier' ? 110 : c.id === 'trade' ? 60 : 70);
  }

  function d5SummaryNode({ project, data, revision }) {
    const itemCount = (data && data.itemCount) || 0;
    const groups = (data && data.groups) || [];
    return {
      stack: [
        { text: 'IV · END · INDEX', style: 'd5AHeadEye', margin: [0, 12, 0, 12] },
        { text: 'Summary by trade', style: 'd5AHeadTtl', margin: [0, 0, 0, 18] },
        // Pill chips of each trade
        {
          margin: [0, 0, 0, 18],
          stack: groups.map((g, i) => {
            const tone = folioTone(i + 1);
            return {
              margin: [0, 0, 0, 8],
              columns: [
                { canvas: [{ type: 'rect', x: 0, y: 2, w: 80, h: 18, r: 9, color: tone.bg }], width: 90 },
                { text: g.title || '—', style: 'd5TDName', width: '*', margin: [0, 4, 0, 0] },
                { text: String((g.cards || []).length) + ' items', style: 'd5TDMuted', width: 'auto', alignment: 'right', margin: [0, 6, 0, 0] },
              ],
            };
          }),
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.6, lineColor: D5_PALETTE.ink }] },
        {
          margin: [0, 18, 0, 0],
          columns: [
            { text: 'TOTAL · EX. PRICING', style: 'd5AHeadEye', width: '*', margin: [0, 22, 0, 0] },
            { text: String(itemCount), font: 'Cormorant', fontSize: 50, italics: true, bold: true, color: D5_PALETTE.ink, width: 'auto' },
          ],
        },
      ],
      pageBreak: 'before',
    };
  }

  function d5BuildCoverGrouped({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const out = [];
    if (content.cover) out.push(d5CoverNode({ project, data, revision }));
    groups.forEach((g, gi) => {
      const node = d5SectionNode({ group: g, idx: gi + 1, total: groups.length, content });
      if (gi === 0 && !content.cover) delete node.pageBreak;
      out.push(node);
    });
    if (content.cover) out.push(d5SummaryNode({ project, data, revision }));
    return {
      content: out,
      header: d5Header(project, revision),
      footer: d5Footer(),
      background: d5Background(),
      styles: D5_STYLES,
      defaultStyle: { font: 'Inter', fontSize: 10, color: D5_PALETTE.ink, lineHeight: 1.4 },
    };
  }

  function d5BuildTable({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const itemCount = (data && data.itemCount) || 0;
    const today = B.todayLong();
    const cols = tableCols(content);
    const widths = cols.map(c => c.id === 'code' ? 60 : c.id === 'material' ? '*' : c.id === 'element' ? 90 : c.id === 'location' ? 120 : c.id === 'supplier' ? 130 : c.id === 'trade' ? 70 : 85);
    const labels = { code: 'Code', material: 'Material', element: 'Element', location: 'Location', supplier: 'Brand', trade: 'Trade', sku: 'SKU' };
    const headerRow = cols.map(c => ({ text: (labels[c.id] || c.id).toUpperCase(), style: 'd5TH', alignment: 'left' }));
    const body = [headerRow];
    groups.forEach((g, gi) => {
      const tone = folioTone(gi + 1);
      // Coloured pill banner row — single coloured cell with pill text,
      // filler cells stay bare (no fillColor — avoids the pdfmake A3 hang).
      body.push([{
        text: [
          { text: ' ' + (g.title || '—').toUpperCase() + ' ', color: tone.fg, fillColor: tone.bg },
          { text: '   ' + g.cards.length + ' ITEMS', color: D5_PALETTE.ink3 },
        ],
        style: 'd5Pill',
        colSpan: cols.length,
        margin: [0, 16, 0, 10],
      }].concat(Array(cols.length - 1).fill({})));
      g.cards.forEach(card => {
        body.push(cols.map(c => {
          if (c.id === 'code') return { text: card.code || '—', style: 'd5TDMono' };
          if (c.id === 'material') {
            const sw = card.swatchColor || '#e1dccd';
            return {
              columns: [
                content.imagery !== false
                  ? { canvas: [{ type: 'rect', x: 0, y: 1, w: 14, h: 14, color: sw, lineColor: '#cfc9b7', lineWidth: 0.4 }], width: 20 }
                  : { text: '', width: 0 },
                { stack: [
                  { text: card.name || 'Unspecified', style: 'd5TDName' },
                  card._specNote ? { text: card._specNote, style: 'd5TDLoc', margin: [0, 1, 0, 0] } : null,
                ].filter(Boolean), width: '*' },
              ],
            };
          }
          if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd5TDMuted' };
          if (c.id === 'location') return { text: card.locationName || '—', style: 'd5TDMuted' };
          if (c.id === 'supplier') return { text: card.swatchBrand || card.supplier || '—', style: 'd5TD' };
          if (c.id === 'trade')    return { text: card.trade || '—', style: 'd5TDMuted' };
          if (c.id === 'sku')      return { text: card.sku || '—', style: 'd5TDMono' };
          return { text: '' };
        }));
      });
    });
    return {
      content: [
        {
          columns: [
            { stack: [{ text: 'VOLUME IV · COMPACT SCHEDULE', style: 'd5AHeadEye', margin: [0, 0, 0, 6] }, { text: project.name || 'Untitled Project', style: 'd5AHeadTtl' }], width: '*' },
            { stack: [
              { text: project.client || '', style: 'd5AHeadMeta', alignment: 'right' },
              { text: (project.address || '').slice(0, 50), style: 'd5AHeadMeta', alignment: 'right' },
              { text: 'Hollis & Arne · ' + today, style: 'd5AHeadMeta', alignment: 'right' },
              { text: itemCount + ' items · ' + groups.length + ' group' + (groups.length === 1 ? '' : 's'), style: 'd5AHeadMeta', alignment: 'right' },
            ], width: 260 },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 1130, y2: 0, lineWidth: 0.6, lineColor: D5_PALETTE.ink }], margin: [0, 14, 0, 18] },
        {
          table: { headerRows: 1, widths, body, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.6 : 0.3),
            vLineWidth: () => 0,
            hLineColor: (i) => i === 1 ? D5_PALETTE.ink : D5_PALETTE.rule2,
            paddingTop: () => 7, paddingBottom: () => 7, paddingLeft: () => 5, paddingRight: () => 5,
          },
        },
      ],
      header: d5Header(project, revision),
      footer: d5Footer(),
      background: (currentPage, pageSize) => ({ canvas: [{ type: 'rect', x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: D5_PALETTE.paper }] }),
      styles: D5_STYLES,
      defaultStyle: { font: 'Inter', fontSize: 9.5, color: D5_PALETTE.ink, lineHeight: 1.4 },
    };
  }

  const D5 = {
    id: 'D5', name: 'Folio',
    eyebrow: 'D5 — Magazine',
    description: 'Magazine-style. Full-bleed terracotta cover, color-coded section openers per trade (slate, moss, gold, terra, bone, ink). Large display italic, lower density.',
    meta: 'A4 portrait · lower density · color-coded sections',
    fonts: ['Cormorant', 'Inter'],
    paperHint: { 'cover-grouped': { paper: 'A4', orientation: 'portrait' }, table: { paper: 'A3', orientation: 'landscape' } },
    pageMargins: { 'cover-grouped': [50, 55, 50, 55], table: [45, 50, 45, 50] },
    buildCoverGrouped: d5BuildCoverGrouped,
    buildTable: d5BuildTable,
  };

  // ═════════════════════════════════════════════════════════════════════
  // D9 · SPECIMEN
  // Paint-chip swatch book. Every material is a coloured chip on the
  // cover; every row has a coloured strip on the left. Image-forward.
  // ═════════════════════════════════════════════════════════════════════

  const D9_PALETTE = {
    paper:  '#fbfaf5',
    paper2: '#f3efe7',
    ink:    '#1a1815',
    ink2:   '#2c2924',
    ink3:   '#6a665d',
    ink4:   '#9a958a',
    rule:   '#1a1815',
    rule2:  '#c8c2b3',
  };

  const D9_STYLES = {
    d9Eye:        { font: 'Inter',     fontSize: 8.5, characterSpacing: 1.6, color: D9_PALETTE.ink3 },
    d9CoverTitle: { font: 'Inter',     fontSize: 52, bold: true, color: D9_PALETTE.ink, lineHeight: 0.95 },
    d9CoverSub:   { font: 'Inter',     fontSize: 12.5, color: D9_PALETTE.ink2, lineHeight: 1.5 },
    d9MetaK:      { font: 'Inter',     fontSize: 7.5, characterSpacing: 1.4, color: D9_PALETTE.ink3 },
    d9MetaV:      { font: 'Inter',     fontSize: 11, bold: true, color: D9_PALETTE.ink },
    d9ChipCode:   { font: 'Inter',     fontSize: 7, characterSpacing: 0.8, color: D9_PALETTE.ink },
    d9ChipName:   { font: 'Inter',     fontSize: 7.5, bold: true, color: D9_PALETTE.ink },
    d9FigVal:     { font: 'Inter',     fontSize: 34, bold: true, color: D9_PALETTE.ink },
    d9FigLbl:     { font: 'Inter',     fontSize: 8.5, characterSpacing: 1.4, color: D9_PALETTE.ink3 },

    d9SectNum:    { font: 'Inter',     fontSize: 10, characterSpacing: 1.4, color: D9_PALETTE.ink3, bold: true },
    d9SectTtl:    { font: 'Inter',     fontSize: 26, bold: true, color: D9_PALETTE.ink, lineHeight: 1.0 },
    d9SectCt:     { font: 'Inter',     fontSize: 8.5, characterSpacing: 1.4, color: D9_PALETTE.ink3 },

    d9TH:         { font: 'Inter',     fontSize: 7.5, characterSpacing: 1.4, color: D9_PALETTE.ink2, bold: true },
    d9TD:         { font: 'Inter',     fontSize: 9.5, color: D9_PALETTE.ink },
    d9TDMono:     { font: 'Inter',     fontSize: 9, color: D9_PALETTE.ink3 },
    d9TDName:     { font: 'Inter',     fontSize: 10, bold: true, color: D9_PALETTE.ink },
    d9TDLoc:      { font: 'Inter',     fontSize: 8, color: D9_PALETTE.ink3 },
    d9TDMuted:    { font: 'Inter',     fontSize: 8.5, color: D9_PALETTE.ink3 },
    d9Band:       { font: 'Inter',     fontSize: 9, characterSpacing: 1.6, bold: true, color: D9_PALETTE.ink },

    d9AHeadEye:   { font: 'Inter',     fontSize: 8.5, characterSpacing: 1.4, color: D9_PALETTE.ink3 },
    d9AHeadTtl:   { font: 'Inter',     fontSize: 28, bold: true, color: D9_PALETTE.ink, lineHeight: 1.0 },
    d9AHeadMeta:  { font: 'Inter',     fontSize: 8.5, color: D9_PALETTE.ink3 },

    d9RH:         { font: 'Inter',     fontSize: 7.5, characterSpacing: 1.3, color: D9_PALETTE.ink3 },
    d9Foot:       { font: 'Inter',     fontSize: 7.5, characterSpacing: 1.2, color: D9_PALETTE.ink3 },
  };

  function d9Header(project, revision) {
    return (currentPage) => {
      if (currentPage === 1) return null;
      return {
        columns: [
          { text: [{ text: project.code || '', bold: true, color: D9_PALETTE.ink }, { text: ' · ' + (project.name || ''), color: D9_PALETTE.ink3 }], style: 'd9RH' },
          { text: 'IV · SPECIMENS' + (revision ? ' · ' + revision : ''), style: 'd9RH', alignment: 'right' },
        ],
        margin: [50, 32, 50, 0],
      };
    };
  }

  function d9Footer() {
    return (currentPage, pageCount) => ({
      columns: [
        { text: 'Hollis & Arne · Studio Archive', style: 'd9Foot' },
        { text: pad2(currentPage) + ' / ' + pad2(pageCount), style: 'd9Foot', alignment: 'right' },
      ],
      margin: [50, 8, 50, 28],
    });
  }

  function d9Background(groupIdx) {
    return (currentPage, pageSize) => {
      const canvas = [{ type: 'rect', x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: D9_PALETTE.paper }];
      // Page > 1: paint a thin left vertical band — colour comes from
      // the section's first card swatch via a closure on a global cursor.
      // We tag bands on the docDef via background callback; for simple
      // schedule data we colour by page index mod 6 over a fixed palette.
      const BAND_TONES = ['#9a7a55', '#3d362f', '#b48a5a', '#a87d54', '#e2dccb', '#5d5d5e'];
      if (currentPage > 1) {
        canvas.push({ type: 'rect', x: 0, y: 0, w: 26, h: pageSize.height, color: BAND_TONES[(currentPage - 2) % BAND_TONES.length] });
      }
      return { canvas };
    };
  }

  function d9CoverChip(card) {
    const tone = card.swatchColor || '#e1dccd';
    return {
      stack: [
        { canvas: [{ type: 'rect', x: 0, y: 0, w: 100, h: 60, color: tone, lineColor: '#cfc9b7', lineWidth: 0.4 }] },
        { text: card.code || '—', style: 'd9ChipCode', margin: [0, 4, 0, 1] },
        { text: card.name || 'Unspecified', style: 'd9ChipName' },
      ],
    };
  }

  function d9CoverNode({ project, data, revision }) {
    const groups = (data && data.groups) || [];
    const itemCount = (data && data.itemCount) || 0;
    const flat = [];
    groups.forEach(g => (g.cards || []).forEach(c => flat.push(c)));
    // Chip grid — 4 columns, lay out via repeated tables of widths [100×4]
    const chipsPerRow = 4;
    const chipRows = [];
    for (let i = 0; i < flat.length; i += chipsPerRow) {
      const row = flat.slice(i, i + chipsPerRow).map(d9CoverChip);
      while (row.length < chipsPerRow) row.push({ text: '' });
      chipRows.push(row);
    }
    const today = B.todayLong();
    return {
      stack: [
        { text: 'VOLUME IV · SPECIMENS', style: 'd9Eye', margin: [0, 0, 0, 18] },
        { text: project.name || 'Untitled Project', style: 'd9CoverTitle', margin: [0, 0, 0, 18] },
        { text: 'Every material specified — laid out as a swatch book. ' + itemCount + ' specimens across ' + groups.length + ' groups.', style: 'd9CoverSub', width: 460, margin: [0, 0, 0, 28] },
        // Chip grid
        flat.length ? {
          table: { widths: Array(chipsPerRow).fill(110), body: chipRows },
          layout: {
            hLineWidth: () => 0, vLineWidth: () => 0,
            paddingTop: () => 8, paddingBottom: () => 8, paddingLeft: () => 0, paddingRight: () => 8,
          },
          margin: [0, 0, 0, 24],
        } : { text: '' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.6, lineColor: D9_PALETTE.ink }] },
        {
          margin: [0, 14, 0, 0],
          columns: [
            { stack: [
                project.client ? { text: project.client, style: 'd9MetaV' } : null,
                project.address ? { text: project.address, style: 'd9MetaK', margin: [0, 4, 0, 0] } : null,
                { text: 'Hollis & Arne · ' + today, style: 'd9MetaK', margin: [0, 4, 0, 0] },
                revision ? { text: revision, style: 'd9MetaK', margin: [0, 4, 0, 0] } : null,
              ].filter(Boolean), width: '*' },
            { stack: [
                { text: 'SPECIMENS', style: 'd9FigLbl', alignment: 'right' },
                { text: String(itemCount), style: 'd9FigVal', alignment: 'right', margin: [0, 4, 0, 0] },
              ], width: 'auto' },
          ],
        },
      ],
      pageBreak: 'after',
    };
  }

  function d9SectionNode({ group, idx, total, content }) {
    const cards = group.cards || [];
    const cols = tableCols(content);
    const labels = { code: 'Code', material: 'Material', element: 'Element', location: 'Location', supplier: 'Brand', trade: 'Trade', sku: 'SKU' };
    const headerRow = cols.map(c => ({ text: (labels[c.id] || c.id).toUpperCase(), style: 'd9TH', alignment: 'left' }));
    const body = [headerRow].concat(cards.map(card => cols.map(c => {
      if (c.id === 'code') return { text: card.code || '—', style: 'd9TDMono' };
      if (c.id === 'material') {
        const sw = card.swatchColor || '#e1dccd';
        return {
          columns: [
            // Bigger swatch — image-forward
            { canvas: [{ type: 'rect', x: 0, y: 1, w: 22, h: 22, color: sw, lineColor: '#cfc9b7', lineWidth: 0.4 }], width: 28 },
            { stack: [
                { text: card.name || 'Unspecified', style: 'd9TDName' },
                card._specNote ? { text: card._specNote, style: 'd9TDLoc', margin: [0, 1, 0, 0] } : null,
              ].filter(Boolean), width: '*', margin: [4, 4, 0, 0] },
          ],
        };
      }
      if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd9TDMuted' };
      if (c.id === 'location') return { text: card.locationName || '—', style: 'd9TDMuted' };
      if (c.id === 'supplier') return { text: card.swatchBrand || card.supplier || '—', style: 'd9TD' };
      if (c.id === 'trade')    return { text: card.trade || '—', style: 'd9TDMuted' };
      if (c.id === 'sku')      return { text: card.sku || '—', style: 'd9TDMono' };
      return { text: '' };
    })));
    return {
      stack: [
        {
          // Indent past the coloured vertical band on the left.
          margin: [16, 12, 0, 16],
          columns: [
            { text: 'IV · ' + pad2(idx), style: 'd9SectNum', width: 'auto', margin: [0, 6, 0, 0] },
            { text: group.title || '—', style: 'd9SectTtl', width: '*', margin: [14, 0, 0, 0] },
            { text: cards.length + ' SPECIMENS', style: 'd9SectCt', width: 'auto', alignment: 'right', margin: [0, 10, 0, 0] },
          ],
        },
        { canvas: [{ type: 'line', x1: 16, y1: 0, x2: 495, y2: 0, lineWidth: 0.6, lineColor: D9_PALETTE.ink }], margin: [0, 0, 0, 14] },
        {
          margin: [16, 0, 0, 0],
          table: { widths: d9ColWidths(cols), body, headerRows: 1, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.6 : 0.3),
            vLineWidth: () => 0,
            hLineColor: (i) => i === 1 ? D9_PALETTE.ink : D9_PALETTE.rule2,
            paddingTop: () => 9, paddingBottom: () => 9, paddingLeft: () => 4, paddingRight: () => 4,
          },
        },
      ],
      pageBreak: 'before',
    };
  }

  function d9ColWidths(cols) {
    return cols.map(c => c.id === 'code' ? 50 : c.id === 'material' ? '*' : c.id === 'element' ? 70 : c.id === 'location' ? 95 : c.id === 'supplier' ? 105 : c.id === 'trade' ? 55 : 65);
  }

  function d9SummaryNode({ project, data, revision }) {
    const itemCount = (data && data.itemCount) || 0;
    const groups = (data && data.groups) || [];
    return {
      stack: [
        { text: 'IV · END · INDEX', style: 'd9Eye', margin: [16, 12, 0, 18] },
        { text: itemCount + ' specimens', style: 'd9SectTtl', margin: [16, 0, 0, 18] },
        {
          margin: [16, 0, 0, 0],
          table: {
            widths: ['*', 'auto'],
            body: groups.map(g => [
              { text: g.title || '—', style: 'd9TDName' },
              { text: ((g.cards || []).length) + ' items', style: 'd9TDMuted', alignment: 'right' },
            ]),
          },
          layout: {
            hLineWidth: (i, node) => i === 0 || i === node.table.body.length ? 0 : 0.3,
            vLineWidth: () => 0,
            hLineColor: () => D9_PALETTE.rule2,
            paddingTop: () => 9, paddingBottom: () => 9, paddingLeft: () => 0, paddingRight: () => 0,
          },
        },
      ],
      pageBreak: 'before',
    };
  }

  function d9BuildCoverGrouped({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const out = [];
    if (content.cover) out.push(d9CoverNode({ project, data, revision }));
    groups.forEach((g, gi) => {
      const node = d9SectionNode({ group: g, idx: gi + 1, total: groups.length, content });
      if (gi === 0 && !content.cover) delete node.pageBreak;
      out.push(node);
    });
    if (content.cover) out.push(d9SummaryNode({ project, data, revision }));
    return {
      content: out,
      header: d9Header(project, revision),
      footer: d9Footer(),
      background: d9Background(),
      styles: D9_STYLES,
      defaultStyle: { font: 'Inter', fontSize: 9.5, color: D9_PALETTE.ink, lineHeight: 1.4 },
    };
  }

  function d9BuildTable({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const itemCount = (data && data.itemCount) || 0;
    const today = B.todayLong();
    const cols = tableCols(content);
    const widths = cols.map(c => c.id === 'code' ? 60 : c.id === 'material' ? '*' : c.id === 'element' ? 90 : c.id === 'location' ? 120 : c.id === 'supplier' ? 130 : c.id === 'trade' ? 70 : 85);
    const labels = { code: 'Code', material: 'Material', element: 'Element', location: 'Location', supplier: 'Brand', trade: 'Trade', sku: 'SKU' };
    const headerRow = cols.map(c => ({ text: (labels[c.id] || c.id).toUpperCase(), style: 'd9TH', alignment: 'left' }));
    const body = [headerRow];
    groups.forEach((g) => {
      body.push([{
        text: (g.title || '—').toUpperCase() + '   ·   ' + g.cards.length + ' SPECIMEN' + (g.cards.length === 1 ? '' : 'S'),
        colSpan: cols.length, style: 'd9Band',
        margin: [0, 12, 0, 8],
      }].concat(Array(cols.length - 1).fill({})));
      g.cards.forEach(card => {
        body.push(cols.map(c => {
          if (c.id === 'code') return { text: card.code || '—', style: 'd9TDMono' };
          if (c.id === 'material') {
            const sw = card.swatchColor || '#e1dccd';
            return {
              columns: [
                { canvas: [{ type: 'rect', x: 0, y: 1, w: 22, h: 22, color: sw, lineColor: '#cfc9b7', lineWidth: 0.4 }], width: 28 },
                { stack: [
                  { text: card.name || 'Unspecified', style: 'd9TDName' },
                  card._specNote ? { text: card._specNote, style: 'd9TDLoc', margin: [0, 1, 0, 0] } : null,
                ].filter(Boolean), width: '*', margin: [4, 4, 0, 0] },
              ],
            };
          }
          if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd9TDMuted' };
          if (c.id === 'location') return { text: card.locationName || '—', style: 'd9TDMuted' };
          if (c.id === 'supplier') return { text: card.swatchBrand || card.supplier || '—', style: 'd9TD' };
          if (c.id === 'trade')    return { text: card.trade || '—', style: 'd9TDMuted' };
          if (c.id === 'sku')      return { text: card.sku || '—', style: 'd9TDMono' };
          return { text: '' };
        }));
      });
    });
    return {
      content: [
        {
          columns: [
            { stack: [{ text: 'VOLUME IV · SPECIMENS · COMPACT', style: 'd9AHeadEye', margin: [0, 0, 0, 6] }, { text: project.name || 'Untitled Project', style: 'd9AHeadTtl' }], width: '*' },
            { stack: [
              { text: project.client || '', style: 'd9AHeadMeta', alignment: 'right' },
              { text: (project.address || '').slice(0, 50), style: 'd9AHeadMeta', alignment: 'right' },
              { text: 'Hollis & Arne · ' + today, style: 'd9AHeadMeta', alignment: 'right' },
              { text: itemCount + ' specimens', style: 'd9AHeadMeta', alignment: 'right' },
            ], width: 260 },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 1130, y2: 0, lineWidth: 0.6, lineColor: D9_PALETTE.ink }], margin: [0, 14, 0, 18] },
        {
          table: { headerRows: 1, widths, body, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.6 : 0.3),
            vLineWidth: () => 0,
            hLineColor: (i) => i === 1 ? D9_PALETTE.ink : D9_PALETTE.rule2,
            paddingTop: () => 8, paddingBottom: () => 8, paddingLeft: () => 5, paddingRight: () => 5,
          },
        },
      ],
      header: d9Header(project, revision),
      footer: d9Footer(),
      // Plain paper for tables — no vertical band on dense layouts.
      background: (currentPage, pageSize) => ({ canvas: [{ type: 'rect', x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: D9_PALETTE.paper }] }),
      styles: D9_STYLES,
      defaultStyle: { font: 'Inter', fontSize: 9, color: D9_PALETTE.ink, lineHeight: 1.4 },
    };
  }

  const D9 = {
    id: 'D9', name: 'Specimen',
    eyebrow: 'D9 — Swatch book',
    description: 'Paint-chip swatch book. Every material is a coloured chip on the cover; every section page has a coloured vertical band. Image-forward.',
    meta: 'A4 portrait · low density · image-forward',
    fonts: ['Inter'],
    paperHint: { 'cover-grouped': { paper: 'A4', orientation: 'portrait' }, table: { paper: 'A3', orientation: 'landscape' } },
    pageMargins: { 'cover-grouped': [50, 55, 50, 55], table: [45, 50, 45, 50] },
    buildCoverGrouped: d9BuildCoverGrouped,
    buildTable: d9BuildTable,
  };

  // ═════════════════════════════════════════════════════════════════════
  // D8 · BROADSHEET
  // Newspaper front-page treatment. Playfair Display didone masthead,
  // drop-cap lead, pull quote. Double rules at major divisions.
  // ═════════════════════════════════════════════════════════════════════

  const D8_PALETTE = {
    paper:  '#fbfaf5',
    paper2: '#f0ece1',
    ink:    '#1a1815',
    ink2:   '#2c2924',
    ink3:   '#6a665d',
    ink4:   '#9a958a',
    rule:   '#1a1815',
    rule2:  '#c8c2b3',
    accent: '#8a3020',
  };

  const D8_STYLES = {
    d8MastFirm:    { font: 'Playfair', fontSize: 44, bold: true, color: D8_PALETTE.ink, lineHeight: 0.95 },
    d8MastSub:     { font: 'Inter',    fontSize: 8, characterSpacing: 1.6, color: D8_PALETTE.ink3 },
    d8MastMeta:    { font: 'Inter',    fontSize: 8.5, color: D8_PALETTE.ink2, lineHeight: 1.45 },
    d8Deckline:    { font: 'Inter',    fontSize: 8.5, characterSpacing: 1.5, color: D8_PALETTE.ink2 },
    d8DecklineAcc: { font: 'Inter',    fontSize: 8.5, characterSpacing: 1.5, color: D8_PALETTE.accent, bold: true },

    d8Kicker:      { font: 'Inter',    fontSize: 9, characterSpacing: 1.6, color: D8_PALETTE.accent, bold: true },
    d8Headline:    { font: 'Playfair', fontSize: 54, bold: true, color: D8_PALETTE.ink, lineHeight: 0.96 },
    d8Deck:        { font: 'Playfair', fontSize: 16, italics: true, color: D8_PALETTE.ink2, lineHeight: 1.4 },

    d8Lead:        { font: 'Playfair', fontSize: 11, color: D8_PALETTE.ink, lineHeight: 1.45 },
    d8DropCap:     { font: 'Playfair', fontSize: 56, bold: true, color: D8_PALETTE.ink, lineHeight: 0.9 },
    d8Pull:        { font: 'Playfair', fontSize: 16, italics: true, color: D8_PALETTE.ink, lineHeight: 1.3 },

    d8Stand:       { font: 'Inter',    fontSize: 8, characterSpacing: 1.6, color: D8_PALETTE.ink3, bold: true },
    d8StandVal:    { font: 'Playfair', fontSize: 32, bold: true, color: D8_PALETTE.ink },

    d8FeatNum:     { font: 'Playfair', fontSize: 80, bold: true, color: D8_PALETTE.ink, lineHeight: 0.85 },
    d8FeatKicker:  { font: 'Inter',    fontSize: 9, characterSpacing: 1.6, color: D8_PALETTE.accent, bold: true },
    d8FeatTtl:     { font: 'Playfair', fontSize: 34, bold: true, color: D8_PALETTE.ink, lineHeight: 1.0 },
    d8FeatDeck:    { font: 'Playfair', fontSize: 14, italics: true, color: D8_PALETTE.ink2, lineHeight: 1.4 },

    d8TH:          { font: 'Inter',    fontSize: 7.5, characterSpacing: 1.4, color: D8_PALETTE.ink2, bold: true },
    d8TD:          { font: 'Playfair', fontSize: 10, color: D8_PALETTE.ink },
    d8TDMono:      { font: 'Inter',    fontSize: 9, color: D8_PALETTE.ink3 },
    d8TDName:      { font: 'Playfair', fontSize: 12, bold: true, color: D8_PALETTE.ink },
    d8TDLoc:       { font: 'Inter',    fontSize: 8, color: D8_PALETTE.ink3 },
    d8TDMuted:     { font: 'Inter',    fontSize: 8.5, color: D8_PALETTE.ink3 },
    d8Band:        { font: 'Playfair', fontSize: 13, bold: true, color: D8_PALETTE.ink },

    d8AHeadEye:    { font: 'Inter',    fontSize: 9, characterSpacing: 1.6, color: D8_PALETTE.accent, bold: true },
    d8AHeadTtl:    { font: 'Playfair', fontSize: 34, bold: true, color: D8_PALETTE.ink, lineHeight: 1.0 },
    d8AHeadMeta:   { font: 'Inter',    fontSize: 8.5, color: D8_PALETTE.ink3 },

    d8RH:          { font: 'Inter',    fontSize: 7.5, characterSpacing: 1.4, color: D8_PALETTE.ink3 },
    d8Foot:        { font: 'Inter',    fontSize: 7.5, characterSpacing: 1.4, color: D8_PALETTE.ink3 },
  };

  function d8Header(project, revision) {
    return (currentPage) => {
      if (currentPage === 1) return null;
      return {
        columns: [
          { text: 'THE ARCHIVE  ·  HOLLIS & ARNE  ·  VOL. IV', style: 'd8RH' },
          { text: 'No. ' + (project.code || '—') + (revision ? ' · ' + revision : ''), style: 'd8RH', alignment: 'right' },
        ],
        margin: [50, 32, 50, 0],
      };
    };
  }

  function d8Footer() {
    return (currentPage, pageCount) => ({
      columns: [
        { text: 'The Archive · Vol. IV · Project Schedule', style: 'd8Foot' },
        { text: pad2(currentPage) + ' of ' + pad2(pageCount), style: 'd8Foot', alignment: 'right' },
      ],
      margin: [50, 8, 50, 28],
    });
  }

  function d8Background() {
    return (currentPage, pageSize) => ({
      canvas: [{ type: 'rect', x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: D8_PALETTE.paper }],
    });
  }

  function d8CoverNode({ project, data, revision }) {
    const itemCount = (data && data.itemCount) || 0;
    const groupCount = (data && data.groups && data.groups.length) || 0;
    const today = B.todayLong();
    const leadOpener = 'The schedule that follows lists ' + itemCount + ' materials specified across ' + groupCount + ' groups for the works on this project — assembled by the office of Hollis & Arne in the course of construction-stage documentation.';
    return {
      stack: [
        // Masthead
        {
          columns: [
            { stack: [
                { text: 'The Archive', style: 'd8MastFirm' },
                { text: 'HOLLIS & ARNE · ARCHITECTS · VOL. IV', style: 'd8MastSub', margin: [0, 2, 0, 0] },
              ], width: '*' },
            { text: 'No. ' + (project.code || '—') + '\n' + today + '\n' + (project.client || '') + '\n' + (revision || '— for client'), style: 'd8MastMeta', width: 'auto', alignment: 'right' },
          ],
        },
        // Double rule
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 1.4, lineColor: D8_PALETTE.ink }], margin: [0, 8, 0, 1] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.4, lineColor: D8_PALETTE.ink }], margin: [0, 0, 0, 8] },
        // Deckline strip
        {
          columns: [
            { text: 'PROJECT SCHEDULE · ' + itemCount + ' ITEMS · ' + groupCount + ' GROUPS', style: 'd8Deckline', width: '*' },
            { text: 'ISSUED FOR REVIEW', style: 'd8DecklineAcc', width: 'auto', alignment: 'right' },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.4, lineColor: D8_PALETTE.ink }], margin: [0, 8, 0, 18] },
        // Headline
        { text: 'A Project Schedule — in ' + itemCount + ' Items', style: 'd8Kicker', margin: [0, 0, 0, 8] },
        { text: project.name || 'Untitled Project', style: 'd8Headline', margin: [0, 0, 0, 14] },
        { text: 'Being the printable record of every material specified for the works' + (project.address ? ' at ' + project.address : '') + ' — with location, brand, finish and supplier.', style: 'd8Deck', width: 495, margin: [0, 0, 0, 24] },
        // Lead paragraph with drop cap
        {
          columns: [
            { text: leadOpener.charAt(0), style: 'd8DropCap', width: 38 },
            { text: leadOpener.slice(1), style: 'd8Lead', width: '*', margin: [4, 6, 0, 0] },
          ],
          margin: [0, 0, 0, 14],
        },
        // Pull quote
        {
          margin: [40, 6, 40, 14],
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 380, y2: 0, lineWidth: 0.4, lineColor: D8_PALETTE.ink }], margin: [0, 0, 0, 8] },
            { text: '"Every item is shown with its supplier, location, brand and finish."', style: 'd8Pull' },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 380, y2: 0, lineWidth: 0.4, lineColor: D8_PALETTE.ink }], margin: [0, 8, 0, 0] },
          ],
        },
        { text: 'Each group is given its own page in the long-form record; a compact two-sheet table follows for the use of builders and consultants at handover.', style: 'd8Lead', margin: [0, 0, 0, 24] },
        // Double rule
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 1.4, lineColor: D8_PALETTE.ink }] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.4, lineColor: D8_PALETTE.ink }], margin: [0, 1, 0, 14] },
        // Stand
        {
          columns: [
            { stack: [{ text: 'TOTAL', style: 'd8Stand' }, { text: 'ITEMS RECORDED', style: 'd8Stand' }], width: '*' },
            { text: project.name || 'Untitled', style: 'd8Stand', alignment: 'center', width: 'auto', margin: [12, 12, 12, 0] },
            { text: String(itemCount), style: 'd8StandVal', width: 'auto', alignment: 'right' },
          ],
        },
      ],
      pageBreak: 'after',
    };
  }

  function d8SectionNode({ group, idx, total, content }) {
    const cards = group.cards || [];
    const cols = tableCols(content);
    const labels = { code: 'Code', material: 'Material · Brand', element: 'Element', location: 'Location', supplier: 'Brand', trade: 'Trade', sku: 'SKU' };
    const headerRow = cols.map(c => ({ text: (labels[c.id] || c.id).toUpperCase(), style: 'd8TH', alignment: 'left' }));
    const body = [headerRow].concat(cards.map(card => cols.map(c => {
      if (c.id === 'code') return { text: card.code || '—', style: 'd8TDMono' };
      if (c.id === 'material') {
        const sw = card.swatchColor || '#e1dccd';
        return {
          columns: [
            content.imagery !== false
              ? { canvas: [{ type: 'rect', x: 0, y: 1, w: 12, h: 12, color: sw, lineColor: '#cfc9b7', lineWidth: 0.4 }], width: 16 }
              : { text: '', width: 0 },
            { stack: [
                { text: card.name || 'Unspecified', style: 'd8TDName' },
                card._specNote ? { text: card._specNote, style: 'd8TDLoc', margin: [0, 1, 0, 0] } : null,
              ].filter(Boolean), width: '*' },
          ],
        };
      }
      if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd8TDMuted' };
      if (c.id === 'location') return { text: card.locationName || '—', style: 'd8TDMuted' };
      if (c.id === 'supplier') return { text: card.swatchBrand || card.supplier || '—', style: 'd8TD' };
      if (c.id === 'trade')    return { text: card.trade || '—', style: 'd8TDMuted' };
      if (c.id === 'sku')      return { text: card.sku || '—', style: 'd8TDMono' };
      return { text: '' };
    })));
    return {
      stack: [
        // Feature head: massive numeral + kicker + title + deck
        {
          columns: [
            { text: pad2(idx), style: 'd8FeatNum', width: 'auto' },
            { stack: [
                { text: 'SECTION ' + pad2(idx) + ' OF ' + pad2(total) + ' · GROUP', style: 'd8FeatKicker' },
                { text: group.title || '—', style: 'd8FeatTtl', margin: [0, 4, 0, 6] },
              ], width: '*', margin: [16, 14, 0, 0] },
          ],
          margin: [0, 8, 0, 14],
        },
        { text: groupBlurb(group.title), style: 'd8FeatDeck', margin: [0, 0, 0, 18] },
        // Double rule
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 1.4, lineColor: D8_PALETTE.ink }] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.4, lineColor: D8_PALETTE.ink }], margin: [0, 1, 0, 14] },
        {
          table: { widths: d8ColWidths(cols), body, headerRows: 1, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.6 : 0.3),
            vLineWidth: () => 0,
            hLineColor: (i) => i === 1 ? D8_PALETTE.ink : D8_PALETTE.rule2,
            paddingTop: () => 7, paddingBottom: () => 7, paddingLeft: () => 6, paddingRight: () => 6,
          },
        },
      ],
      pageBreak: 'before',
    };
  }

  function d8ColWidths(cols) {
    return cols.map(c => c.id === 'code' ? 50 : c.id === 'material' ? '*' : c.id === 'element' ? 70 : c.id === 'location' ? 95 : c.id === 'supplier' ? 110 : c.id === 'trade' ? 55 : 65);
  }

  function d8SummaryNode({ project, data, revision }) {
    const itemCount = (data && data.itemCount) || 0;
    const groups = (data && data.groups) || [];
    return {
      stack: [
        { text: 'IN CLOSING', style: 'd8FeatKicker', margin: [0, 8, 0, 6] },
        { text: 'Project register', style: 'd8FeatTtl', margin: [0, 0, 0, 12] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 1.4, lineColor: D8_PALETTE.ink }] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.4, lineColor: D8_PALETTE.ink }], margin: [0, 1, 0, 16] },
        {
          table: {
            widths: ['*', 'auto'],
            body: groups.map(g => [
              { text: g.title || '—', style: 'd8TDName' },
              { text: String((g.cards || []).length) + ' items', style: 'd8TDMuted', alignment: 'right' },
            ]),
          },
          layout: {
            hLineWidth: (i, node) => i === 0 || i === node.table.body.length ? 0 : 0.3,
            vLineWidth: () => 0,
            hLineColor: () => D8_PALETTE.rule2,
            paddingTop: () => 9, paddingBottom: () => 9, paddingLeft: () => 0, paddingRight: () => 0,
          },
          margin: [0, 0, 0, 22],
        },
        {
          columns: [
            { text: 'TOTAL ITEMS', style: 'd8Stand', width: '*', margin: [0, 14, 0, 0] },
            { text: String(itemCount), style: 'd8StandVal', width: 'auto', alignment: 'right' },
          ],
        },
      ],
      pageBreak: 'before',
    };
  }

  function d8BuildCoverGrouped({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const out = [];
    if (content.cover) out.push(d8CoverNode({ project, data, revision }));
    groups.forEach((g, gi) => {
      const node = d8SectionNode({ group: g, idx: gi + 1, total: groups.length, content });
      if (gi === 0 && !content.cover) delete node.pageBreak;
      out.push(node);
    });
    if (content.cover) out.push(d8SummaryNode({ project, data, revision }));
    return {
      content: out,
      header: d8Header(project, revision),
      footer: d8Footer(),
      background: d8Background(),
      styles: D8_STYLES,
      defaultStyle: { font: 'Playfair', fontSize: 10.5, color: D8_PALETTE.ink, lineHeight: 1.4 },
    };
  }

  function d8BuildTable({ project, data, content, revision }) {
    const groups = (data && data.groups) || [];
    const itemCount = (data && data.itemCount) || 0;
    const today = B.todayLong();
    const cols = tableCols(content);
    const widths = cols.map(c => c.id === 'code' ? 55 : c.id === 'material' ? '*' : c.id === 'element' ? 90 : c.id === 'location' ? 120 : c.id === 'supplier' ? 130 : c.id === 'trade' ? 70 : 85);
    const labels = { code: 'Code', material: 'Material · Brand', element: 'Element', location: 'Location', supplier: 'Brand', trade: 'Trade', sku: 'SKU' };
    const headerRow = cols.map(c => ({ text: (labels[c.id] || c.id).toUpperCase(), style: 'd8TH', alignment: 'left' }));
    const body = [headerRow];
    groups.forEach((g) => {
      body.push([{
        text: (g.title || '—') + '   ·   ' + g.cards.length + ' item' + (g.cards.length === 1 ? '' : 's'),
        colSpan: cols.length, style: 'd8Band',
        margin: [0, 14, 0, 8],
      }].concat(Array(cols.length - 1).fill({})));
      g.cards.forEach(card => {
        body.push(cols.map(c => {
          if (c.id === 'code') return { text: card.code || '—', style: 'd8TDMono' };
          if (c.id === 'material') {
            const sw = card.swatchColor || '#e1dccd';
            return {
              columns: [
                content.imagery !== false
                  ? { canvas: [{ type: 'rect', x: 0, y: 1, w: 12, h: 12, color: sw, lineColor: '#cfc9b7', lineWidth: 0.4 }], width: 16 }
                  : { text: '', width: 0 },
                { stack: [
                  { text: card.name || 'Unspecified', style: 'd8TDName' },
                  card._specNote ? { text: card._specNote, style: 'd8TDLoc', margin: [0, 1, 0, 0] } : null,
                ].filter(Boolean), width: '*' },
              ],
            };
          }
          if (c.id === 'element')  return { text: card.elementLabel || card.element || '—', style: 'd8TDMuted' };
          if (c.id === 'location') return { text: card.locationName || '—', style: 'd8TDMuted' };
          if (c.id === 'supplier') return { text: card.swatchBrand || card.supplier || '—', style: 'd8TD' };
          if (c.id === 'trade')    return { text: card.trade || '—', style: 'd8TDMuted' };
          if (c.id === 'sku')      return { text: card.sku || '—', style: 'd8TDMono' };
          return { text: '' };
        }));
      });
    });
    return {
      content: [
        // A3 head — masthead-style
        {
          columns: [
            { stack: [{ text: 'COMPACT SCHEDULE · ALL GROUPS', style: 'd8AHeadEye', margin: [0, 0, 0, 4] }, { text: project.name || 'Untitled Project', style: 'd8AHeadTtl' }], width: '*' },
            { stack: [
                { text: 'No. ' + (project.code || '—'), style: 'd8AHeadMeta', alignment: 'right' },
                { text: project.client || '', style: 'd8AHeadMeta', alignment: 'right' },
                { text: 'Hollis & Arne · ' + today, style: 'd8AHeadMeta', alignment: 'right' },
                { text: itemCount + ' items · ' + groups.length + ' groups', style: 'd8AHeadMeta', alignment: 'right' },
              ], width: 260 },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 1130, y2: 0, lineWidth: 1.4, lineColor: D8_PALETTE.ink }], margin: [0, 10, 0, 1] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 1130, y2: 0, lineWidth: 0.4, lineColor: D8_PALETTE.ink }], margin: [0, 0, 0, 18] },
        {
          table: { headerRows: 1, widths, body, dontBreakRows: true },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.6 : 0.3),
            vLineWidth: () => 0,
            hLineColor: (i) => i === 1 ? D8_PALETTE.ink : D8_PALETTE.rule2,
            paddingTop: () => 7, paddingBottom: () => 7, paddingLeft: () => 5, paddingRight: () => 5,
          },
        },
      ],
      header: d8Header(project, revision),
      footer: d8Footer(),
      background: d8Background(),
      styles: D8_STYLES,
      defaultStyle: { font: 'Playfair', fontSize: 10, color: D8_PALETTE.ink, lineHeight: 1.4 },
    };
  }

  const D8 = {
    id: 'D8', name: 'Broadsheet',
    eyebrow: 'D8 — Newspaper',
    description: 'Newspaper front-page treatment. Playfair Display didone masthead, drop-cap lead, pull quote. Double rules at major divisions. Higher density.',
    meta: 'A4 portrait · higher density · didone display',
    fonts: ['Playfair', 'Inter'],
    paperHint: { 'cover-grouped': { paper: 'A4', orientation: 'portrait' }, table: { paper: 'A3', orientation: 'landscape' } },
    pageMargins: { 'cover-grouped': [50, 55, 50, 55], table: [45, 50, 45, 50] },
    buildCoverGrouped: d8BuildCoverGrouped,
    buildTable: d8BuildTable,
  };

  // ═════════════════════════════════════════════════════════════════════
  // STUB FACTORY — currently unused (every direction has a real
  // implementation). Kept for safety: when D7 (Dossier) is added in
  // the future, drop a new makeStub() call below.
  // ═════════════════════════════════════════════════════════════════════
  function makeStub({ id, name, eyebrow, description, meta, fonts, density }) {
    const provBadge = {
      text: 'PROVISIONAL · ' + id + ' will land in a later phase · currently rendering with ' + D1.name,
      style: 'd1ProvBadge',
      margin: [0, 0, 0, 12],
    };

    return {
      id, name, eyebrow, description, meta,
      fonts: fonts && fonts.length ? fonts : D1.fonts,
      paperHint: D1.paperHint,
      pageMargins: D1.pageMargins,
      provisional: true,
      buildCoverGrouped: function (args) {
        const out = D1.buildCoverGrouped(args);
        out.content = [provBadge].concat(out.content);
        return out;
      },
      buildTable: function (args) {
        const out = D1.buildTable(args);
        out.content = [provBadge].concat(out.content);
        return out;
      },
    };
  }

  // ─── Stubs — each phase will replace one of these ─────────────────


  // ─── Theme registry (ordered) ─────────────────────────────────────
  const THEMES_ORDERED = [D1, D2, D3, D4, D5, D6, D8, D9, D10];
  const THEMES_BY_ID = {};
  THEMES_ORDERED.forEach(t => { THEMES_BY_ID[t.id] = t; });

  function getTheme(id) {
    return THEMES_BY_ID[id] || D1;
  }

  function listThemes() {
    return THEMES_ORDERED.slice();
  }

  window.expThemes = {
    get:    getTheme,
    list:   listThemes,
    DEFAULT_ID: 'D1',
  };
})();
