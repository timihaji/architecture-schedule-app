// Export profile · Cost Schedule (Vol III) — pdfmake builders.
//
// Each builder receives ({ project, data, content, revision, builder })
// and returns a pdfmake docDef fragment of shape:
//   { content: [...], styles?: {...}, footer?: fn, header?: fn }
//
// The wizard wraps the fragment with pageSize/orientation/margins/
// watermark/info before calling pdfMake.createPdf().download().
//
// Data shape (passed in by CostScheduleV2):
//   data = { grouped, grandTotal, itemCount }
// where grouped = [{ category, entries, subtotal }]
// and each entry = { row, material, qty, unitCost, subtotal }.

(function () {
  if (typeof window === 'undefined') return;
  const B = window.expPdf;
  if (!B) {
    console.error('[export-profile-cost] requires window.expPdf — load src/export-pdf-builder.jsx first.');
    return;
  }
  const { fv, fmtCurrency, COLOR, hr, swatch, inlineSwatch, docHead, cover, kvGrid } = B;

  // ─── Toggles ──────────────────────────────────────────────────────
  const COST_TOGGLES = [
    { key: 'cover',            group: 'Content blocks', label: 'Cover sheet',           desc: 'Project name, code, client, date and revision.', defaultOn: true },
    { key: 'specNotes',        group: 'Content blocks', label: 'Specification notes',   desc: 'Dimensions, finish and colour against each material.', defaultOn: true },
    { key: 'imagery',          group: 'Content blocks', label: 'Material imagery',      desc: 'Swatch tones and product photography where present.', defaultOn: true },
    { key: 'supplierLeadTime', group: 'Content blocks', label: 'Supplier & lead time',  desc: 'Brand, supplier reference and weeks-to-deliver.', defaultOn: true },
    { key: 'pricing',          group: 'Pricing',        label: 'Show pricing',          desc: 'Rates, quantities and totals on each row.', defaultOn: true },
    { key: 'tradeSubtotals',   group: 'Pricing',        label: 'Trade subtotals',       desc: 'Running totals between trade groupings.', defaultOn: true },
    { key: 'grandTotal',       group: 'Pricing',        label: 'Grand total',           desc: 'Final summary on the back page.', defaultOn: true },
  ];

  // ─── Helpers ──────────────────────────────────────────────────────
  function toneFor(material) {
    return material ? ((material.swatch && material.swatch.tone) || material.color || '#a08660') : '#e1dccd';
  }

  function ptypeFor(material) {
    const catDef = material && window.categoryDef && window.categoryDef(material.category);
    return catDef ? catDef.label : (material && material.category ? String(material.category).replace(/_/g, ' ') : '—');
  }

  // Build the KV list for a card, respecting content toggles.
  function buildKVs(material, qty, unitCost, subtotal, content) {
    const kvs = [];
    const brand = fv(material, 'brand');
    const supplier = fv(material, 'supplier') || (material && material.supplier);
    const dims = fv(material, 'dimensions') || fv(material, 'thickness');
    const finish = fv(material, 'finish') || fv(material, 'sheen_paint');
    const colour = fv(material, 'colour_name') || fv(material, 'colour_code');
    const lead = fv(material, 'lead_time');
    const unit = fv(material, 'unit');
    if (content.supplierLeadTime) {
      if (brand) kvs.push({ k: 'Brand', v: String(brand) });
      if (supplier && supplier !== brand) kvs.push({ k: 'Supplier', v: String(supplier) });
      if (lead) kvs.push({ k: 'Lead time', v: String(lead) });
    }
    if (content.specNotes) {
      if (dims) kvs.push({ k: 'Dimensions', v: String(dims) });
      if (finish) kvs.push({ k: 'Finish', v: String(finish) });
      if (colour) kvs.push({ k: 'Colour', v: String(colour) });
    }
    if (content.pricing) {
      if (qty != null && Number.isFinite(qty)) kvs.push({ k: 'Quantity', v: String(qty) + (unit ? ' ' + unit : ''), mono: true });
      if (Number.isFinite(unitCost))            kvs.push({ k: 'Rate',     v: fmtCurrency(unitCost) + (unit ? ' / ' + unit : ''), mono: true });
      if (Number.isFinite(subtotal))            kvs.push({ k: 'Total',    v: fmtCurrency(subtotal), mono: true });
    }
    return kvs;
  }

  // ─── Builder: Cards (one item per page) ───────────────────────────
  function buildCards({ project, data, content, revision }) {
    const grouped = (data && data.grouped) || [];
    const entries = [].concat(...grouped.map(g => g.entries.map(e => ({ ...e, category: g.category }))));

    const cards = entries.map(({ row, material, qty, unitCost, subtotal, category }, i) => {
      const tone = toneFor(material);
      const kvs = buildKVs(material, qty, unitCost, subtotal, content);
      const header = {
        columns: [
          content.imagery
            ? { width: 90, stack: [swatch(tone, 90)] }
            : { width: 0, text: '' },
          {
            width: '*',
            margin: content.imagery ? [16, 0, 0, 0] : [0, 0, 0, 0],
            stack: [
              { text: (row.code || '—'), style: 'cardCode', margin: [0, 4, 0, 4] },
              { text: material ? (material.name || 'Unnamed') : 'Unspecified', style: 'cardName', margin: [0, 0, 0, 4] },
              { text: (category || '').toUpperCase(), style: 'cardCat' },
            ],
          },
        ],
      };
      const card = {
        stack: [
          header,
          hr(0.6, COLOR.ink, 24, 14),
          kvs.length ? kvGrid(kvs, { cols: 2, marginTop: 0 }) : { text: '' },
        ],
      };
      // Page-break after every card except the last so each card sits
      // on its own page.
      if (i < entries.length - 1) card.pageBreak = 'after';
      return card;
    });

    return {
      content: cards.length ? cards : [{ text: 'No items.', italics: true, color: COLOR.ink3 }],
    };
  }

  // ─── Builder: Compact table (dense, multi-page) ───────────────────
  function buildTable({ project, data, content, revision }) {
    const grouped = (data && data.grouped) || [];
    const grandTotal = (data && data.grandTotal) || 0;
    const showSupplier = !!content.supplierLeadTime;
    const showPricing = !!content.pricing;

    // Column definitions, in order. We hand the visible subset to
    // pdfmake.
    const cols = [
      { id: 'code',     header: 'Code',     width: 50,  align: 'left'  },
      { id: 'material', header: 'Material', width: '*', align: 'left'  },
      { id: 'type',     header: 'Type',     width: 70,  align: 'left'  },
      { id: 'supplier', header: 'Supplier', width: 90,  align: 'left',  show: showSupplier },
      { id: 'qty',      header: 'Qty',      width: 35,  align: 'right', show: showPricing },
      { id: 'rate',     header: 'Rate',     width: 55,  align: 'right', show: showPricing },
      { id: 'total',    header: 'Total',    width: 65,  align: 'right', show: showPricing },
    ].filter(c => c.show !== false);

    const widths = cols.map(c => c.width);
    const headerRow = cols.map(c => ({ text: c.header.toUpperCase(), style: 'tHead', alignment: c.align }));

    const body = [headerRow];

    grouped.forEach(g => {
      // Group banner row spans all columns.
      body.push([{
        text: g.category + '   ·   ' + g.entries.length + ' item' + (g.entries.length === 1 ? '' : 's'),
        colSpan: cols.length,
        style: 'tCatHead',
        fillColor: '#f0eee9',
        margin: [4, 6, 4, 4],
      }].concat(Array(cols.length - 1).fill({})));

      g.entries.forEach(({ row, material, qty, unitCost, subtotal }) => {
        const tone = toneFor(material);
        const brand = material && (fv(material, 'brand') || fv(material, 'supplier'));
        const supplier = material && (fv(material, 'supplier') || material.supplier || brand);
        const lead = material && fv(material, 'lead_time');
        const ptype = ptypeFor(material);
        const cells = cols.map(c => {
          if (c.id === 'code')     return { text: row.code || '—', style: 'tCellMono' };
          if (c.id === 'material') return {
            stack: [
              content.imagery ? {
                columns: [
                  inlineSwatch(tone),
                  { text: material ? (material.name || 'Unnamed') : 'Unspecified', style: 'tCellName', margin: [4, 0, 0, 0] },
                ],
              } : { text: material ? (material.name || 'Unnamed') : 'Unspecified', style: 'tCellName' },
              brand ? { text: brand, style: 'tCellSub', margin: [content.imagery ? 14 : 0, 1, 0, 0] } : null,
            ].filter(Boolean),
          };
          if (c.id === 'type')     return { text: ptype, style: 'tCell' };
          if (c.id === 'supplier') return {
            stack: [
              { text: supplier || '—', style: 'tCell' },
              lead ? { text: lead, style: 'tCellSub' } : null,
            ].filter(Boolean),
          };
          if (c.id === 'qty')      return { text: qty == null ? '—' : String(qty), style: 'tCellNum' };
          if (c.id === 'rate')     return { text: Number.isFinite(unitCost) ? fmtCurrency(unitCost) : '—', style: 'tCellNum' };
          if (c.id === 'total')    return { text: Number.isFinite(subtotal) ? fmtCurrency(subtotal) : '—', style: 'tCellNum' };
          return { text: '' };
        });
        body.push(cells);
      });

      if (content.tradeSubtotals && showPricing) {
        const sub = Array(cols.length - 1).fill({}).concat([{}]); // placeholder
        const subRow = cols.map((c, i) => {
          if (i === cols.length - 1) return { text: fmtCurrency(g.subtotal), style: 'tSubtotal', alignment: 'right', fillColor: '#f0eee9' };
          if (i === cols.length - 2) return { text: g.category + ' subtotal', style: 'tSubtotal', alignment: 'right', fillColor: '#f0eee9' };
          return { text: '', fillColor: '#f0eee9' };
        });
        body.push(subRow);
      }
    });

    if (content.grandTotal && showPricing && cols.length >= 2) {
      const grandRow = cols.map((c, i) => {
        if (i === cols.length - 1) return { text: fmtCurrency(grandTotal), style: 'grandVal', alignment: 'right', border: [false, true, false, false], borderColor: ['', COLOR.ink, '', ''] };
        if (i === cols.length - 2) return { text: 'GRAND TOTAL', style: 'grandLbl', alignment: 'right', border: [false, true, false, false], borderColor: ['', COLOR.ink, '', ''] };
        return { text: '', border: [false, true, false, false], borderColor: ['', COLOR.ink, '', ''] };
      });
      body.push(grandRow);
    }

    return {
      content: [
        docHead({ eyebrow: 'Cost Schedule', project, revision, meta: (data && data.itemCount) + ' items' }),
        {
          table: {
            headerRows: 1,
            widths,
            body,
            dontBreakRows: true,
            keepWithHeaderRows: 0,
          },
          layout: {
            hLineWidth: (i) => (i === 0 || i === 1) ? 0.6 : 0.3,
            vLineWidth: () => 0,
            hLineColor: (i) => (i === 0 || i === 1) ? COLOR.ink : COLOR.rule2,
            paddingTop:    (i) => i === 0 ? 4 : 5,
            paddingBottom: (i) => i === 0 ? 4 : 5,
            paddingLeft:   () => 4,
            paddingRight:  () => 4,
          },
        },
      ],
    };
  }

  // ─── Builder: Cover + grouped sections ────────────────────────────
  function buildCoverGrouped({ project, data, content, revision }) {
    const grouped = (data && data.grouped) || [];
    const grandTotal = (data && data.grandTotal) || 0;
    const showSupplier = !!content.supplierLeadTime;
    const showPricing = !!content.pricing;

    const cols = [
      { id: 'code',     header: 'Code',     width: 50,  align: 'left'  },
      { id: 'material', header: 'Material', width: '*', align: 'left'  },
      { id: 'supplier', header: 'Supplier', width: 90,  align: 'left',  show: showSupplier },
      { id: 'qty',      header: 'Qty',      width: 35,  align: 'right', show: showPricing },
      { id: 'rate',     header: 'Rate',     width: 55,  align: 'right', show: showPricing },
      { id: 'total',    header: 'Total',    width: 65,  align: 'right', show: showPricing },
    ].filter(c => c.show !== false);
    const widths = cols.map(c => c.width);
    const headerRow = cols.map(c => ({ text: c.header.toUpperCase(), style: 'tHead', alignment: c.align }));

    const content_ = [];

    if (content.cover) {
      content_.push(cover({
        eyebrow: 'Cost Schedule',
        project,
        revision,
        figure: content.grandTotal ? {
          columns: [
            { text: 'GRAND TOTAL', style: 'grandLbl', width: '*' },
            { text: fmtCurrency(grandTotal), style: 'grandVal', alignment: 'right', width: 'auto' },
          ],
        } : { text: '' },
      }));
    }

    grouped.forEach((g, gi) => {
      const body = [headerRow];
      g.entries.forEach(({ row, material, qty, unitCost, subtotal }) => {
        const tone = toneFor(material);
        const brand = material && (fv(material, 'brand') || fv(material, 'supplier'));
        const supplier = material && (fv(material, 'supplier') || material.supplier || brand);
        const dims = material && (fv(material, 'dimensions') || fv(material, 'finish') || fv(material, 'colour_name'));
        const cells = cols.map(c => {
          if (c.id === 'code')     return { text: row.code || '—', style: 'tCellMono' };
          if (c.id === 'material') return {
            stack: [
              content.imagery ? {
                columns: [
                  inlineSwatch(tone),
                  { text: material ? (material.name || 'Unnamed') : 'Unspecified', style: 'tCellName', margin: [4, 0, 0, 0] },
                ],
              } : { text: material ? (material.name || 'Unnamed') : 'Unspecified', style: 'tCellName' },
              content.specNotes && dims ? { text: dims, style: 'tCellSub', margin: [content.imagery ? 14 : 0, 1, 0, 0] } : null,
            ].filter(Boolean),
          };
          if (c.id === 'supplier') return { text: supplier || '—', style: 'tCell' };
          if (c.id === 'qty')      return { text: qty == null ? '—' : String(qty), style: 'tCellNum' };
          if (c.id === 'rate')     return { text: Number.isFinite(unitCost) ? fmtCurrency(unitCost) : '—', style: 'tCellNum' };
          if (c.id === 'total')    return { text: Number.isFinite(subtotal) ? fmtCurrency(subtotal) : '—', style: 'tCellNum' };
          return { text: '' };
        });
        body.push(cells);
      });

      const section = {
        stack: [
          {
            columns: [
              { text: g.category, style: 'catHeadBig', width: '*' },
              { text: g.entries.length + ' item' + (g.entries.length === 1 ? '' : 's'), style: 'catHeadMeta', alignment: 'right', width: 'auto', margin: [0, 8, 0, 0] },
            ],
            margin: [0, 0, 0, 6],
          },
          hr(0.8, COLOR.ink, 0, 8),
          {
            table: { headerRows: 1, widths, body, dontBreakRows: true },
            layout: {
              hLineWidth: (i) => (i === 0 || i === 1) ? 0.6 : 0.3,
              vLineWidth: () => 0,
              hLineColor: (i) => (i === 0 || i === 1) ? COLOR.ink : COLOR.rule2,
              paddingTop:    () => 5,
              paddingBottom: () => 5,
              paddingLeft:   () => 4,
              paddingRight:  () => 4,
            },
          },
          content.tradeSubtotals && content.pricing ? {
            columns: [
              { text: g.category.toUpperCase() + ' SUBTOTAL', style: 'catSubtotal', width: '*' },
              { text: fmtCurrency(g.subtotal), style: 'tSubtotal', alignment: 'right', width: 'auto' },
            ],
            margin: [0, 8, 0, 0],
          } : { text: '' },
        ],
      };
      // Each section starts on its own page (except first if no cover).
      if (gi > 0 || content.cover) section.pageBreak = 'before';
      content_.push(section);
    });

    if (content.grandTotal && content.pricing) {
      content_.push({
        margin: [0, 24, 0, 0],
        columns: [
          { text: 'GRAND TOTAL', style: 'grandLbl', width: '*', margin: [0, 8, 0, 0] },
          { text: fmtCurrency(grandTotal), style: 'grandVal', alignment: 'right', width: 'auto' },
        ],
        // Rule above the grand total
      });
      content_.push(hr(1.2, COLOR.ink, 4, 0));
    }

    return { content: content_ };
  }

  // ─── Profile ──────────────────────────────────────────────────────
  window.COST_EXPORT_PROFILE = {
    id: 'cost',
    filenameStem: 'cost-schedule',
    eyebrow: 'III · Cost Schedule / Export',
    drawerTitle: 'Export to PDF',
    subtitle: ({ project, data }) => {
      const n = (data && data.itemCount) || 0;
      const g = (data && data.grandTotal) || 0;
      return (
        <>A printable record of <strong style={{ fontStyle: 'normal' }}>{(project && project.name) || 'Untitled project'}</strong> — {n} row{n === 1 ? '' : 's'}, {fmtCurrency(g)} grand total.</>
      );
    },
    toggles: COST_TOGGLES,
    builders: {
      cards:        buildCards,
      table:        buildTable,
      coverGrouped: buildCoverGrouped,
    },
    estimatePages: (layout, data) => {
      const n = (data && data.itemCount) || 0;
      const groupCount = (data && data.grouped && data.grouped.length) || 0;
      if (layout === 'cards') return Math.max(1, n);
      if (layout === 'table') return Math.max(1, Math.ceil(n / 28));
      const groups = (data && data.grouped) || [];
      const catPages = groups.reduce((s, g) => s + Math.max(1, Math.ceil(((g.entries || []).length) / 18)), 0);
      return 1 + (catPages || groupCount || 1);
    },
  };
})();
