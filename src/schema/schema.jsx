// src/schema.jsx — v5 taxonomy + field schema seed.
//
// Defines window.DEFAULT_SCHEMA_V5 — the canonical v5 schema:
//   • 20 groups, 240 categories
//   • Three-layer field inheritance: common (workspace) → group → category
//   • 11 field types incl. itemRef + swatchRef + tag-as-multiselect
//   • Tags: 3 axes (performance, location, materialFamily)
//   • Row orthogonals: state, specMode, typeOrInstance
//
// Source of truth for content: design/library-categories-v5.md.
//
// Backfilled into appState.taxonomies by migrate-v5.jsx (Phase 3) if missing.
// Ids are stable. Renaming a category id breaks materials.category and
// schedule_row.category references. Add new ids freely; never rename.
//
// Inheritance rules (see schema-helpers.jsx):
//   fieldsForCategory(id) = commonFieldIds ∪ groups[cat.groupId].fieldIds ∪ cat.fieldIds
//
// Many field ids are reused across categories where the semantics match
// ("brand", "size", "finish"). Category-specific ids are prefixed where
// the concept is unique ("beam_angle", "leaf_material", "pan_type").

(function () {
  // ─── Field-def builders ────────────────────────────────────────────────────
  const FIELDS = {};
  function f(id, def) {
    if (FIELDS[id]) return id; // idempotent: first def wins
    FIELDS[id] = Object.assign({ id }, def);
    return id;
  }
  // Shorthand variants:
  const fText = (id, label, extra)    => f(id, Object.assign({ label, type: 'text' }, extra || {}));
  const fLong = (id, label, extra)    => f(id, Object.assign({ label, type: 'longText' }, extra || {}));
  const fNum  = (id, label, unit, extra) => f(id, Object.assign({ label, type: 'number', unit: unit || null }, extra || {}));
  const fBool = (id, label, extra)    => f(id, Object.assign({ label, type: 'boolean' }, extra || {}));
  const fSel  = (id, label, options, extra) => f(id, Object.assign({ label, type: 'select', options: options.map(o => typeof o === 'string' ? { value: o, label: o } : o) }, extra || {}));
  const fMSel = (id, label, options, extra) => f(id, Object.assign({ label, type: 'select', multiple: true, options: options.map(o => typeof o === 'string' ? { value: o, label: o } : o) }, extra || {}));
  const fCur  = (id, label, extra)    => f(id, Object.assign({ label, type: 'currency' }, extra || {}));
  const fUrl  = (id, label, extra)    => f(id, Object.assign({ label, type: 'url' }, extra || {}));
  const fItem = (id, label, target, extra) => f(id, Object.assign({ label, type: 'itemRef', targetCategory: target || null }, extra || {}));
  const fItemMulti = (id, label, target, extra) => f(id, Object.assign({ label, type: 'itemRef', targetCategory: target || null, multiple: true }, extra || {}));
  const fSwatch = (id, label, extra)  => f(id, Object.assign({ label, type: 'swatchRef' }, extra || {}));
  const fDate = (id, label, extra)    => f(id, Object.assign({ label, type: 'date' }, extra || {}));
  const fColor = (id, label, extra)   => f(id, Object.assign({ label, type: 'color' }, extra || {}));
  const fTag  = (id, label, axis, extra) => f(id, Object.assign({ label, type: 'select', multiple: true, tagAxis: axis }, extra || {}));

  const GROUPS = [];
  const CATEGORIES = [];
  function group(id, label, fieldIds) {
    GROUPS.push({ id, label, sortOrder: GROUPS.length + 1, hidden: false, fieldIds: fieldIds || [] });
  }
  function cat(id, label, groupId, defaultUnit, fieldIds, opts) {
    CATEGORIES.push(Object.assign({
      id, label, groupId, defaultUnit,
      sortOrder: CATEGORIES.length + 1,
      hidden: false,
      flavour: (opts && opts.flavour) || 'product',
      fieldIds: fieldIds || [],
      aliases: (opts && opts.aliases) || []
    }));
  }

  // ─── Common fields ─────────────────────────────────────────────────────────
  fText('code', 'Code', { helpText: 'Office-wide library code. Visible only in office mode (Settings → Codes & duplicates → Preset C).' });
  fText('name', 'Name');
  fText('supplier', 'Supplier');
  fText('country_of_origin', 'Country of origin');
  fText('lead_time', 'Lead time', { helpText: 'e.g. "2–3 wk"' });
  fSel('unit', 'Unit', ['ea', 'm²', 'm', 'lm', 'kg', 'set', 'item', 'L', 'm³'], { groupable: false });
  fCur('unit_cost', 'Unit cost');
  fSwatch('swatch', 'Swatch');
  fLong('notes', 'Notes');
  // Submittal / procurement fields — universal across all categories:
  fText('supplier_code', 'Supplier code');
  fText('manufacturer', 'Manufacturer', { helpText: 'If different from supplier' });
  fText('contact', 'Contact', { helpText: 'Name · phone / email' });
  fUrl('product_url', 'Product URL');
  fText('warranty', 'Warranty');
  fLong('install_notes', 'Installation notes');
  fMSel('libraries', 'Libraries', []); // options resolved at runtime

  const COMMON_FIELD_IDS = [
    'code', 'name', 'supplier', 'supplier_code', 'country_of_origin',
    'lead_time', 'unit', 'unit_cost', 'swatch', 'notes',
    'manufacturer', 'contact', 'product_url', 'warranty', 'install_notes',
    'libraries',
  ];

  // ─── Tag axes ──────────────────────────────────────────────────────────────
  const TAG_AXES = {
    performance: [
      'fire-rated', 'acoustic', 'smoke-rated', 'security', 'external-grade',
      'wet-area', 'slip-resistant', 'accessible', 'automatic', 'weatherproof',
      'non-combustible', 'low-voc'
    ].map((id, i) => ({ id, label: id.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()), sortOrder: i + 1, hidden: false })),
    area: [
      'kitchen', 'living', 'dining', 'bedroom', 'bathroom', 'ensuite',
      'powder', 'laundry', 'office', 'hallway', 'entry', 'outdoor'
    ].map((id, i) => ({ id, label: id.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()), sortOrder: i + 1, hidden: false })),
    materialFamily: [
      'timber', 'stone', 'ceramic', 'concrete', 'metal', 'glass', 'plastic',
      'laminate', 'composite', 'textile', 'cork', 'rubber', 'vinyl', 'plaster', 'gypsum'
    ].map((id, i) => ({ id, label: id.replace(/^./, c => c.toUpperCase()), sortOrder: i + 1, hidden: false })),
  };

  // ─── Row orthogonals ───────────────────────────────────────────────────────
  const ROW_ORTHOGONALS = {
    state: [
      { id: 'new',         label: 'New',         sortOrder: 1, hidden: false },
      { id: 'existing',    label: 'Existing',    sortOrder: 2, hidden: false },
      { id: 'demolished',  label: 'Demolished',  sortOrder: 3, hidden: false },
    ],
    specMode: [
      { id: 'proprietary', label: 'Proprietary', sortOrder: 1, hidden: false },
      { id: 'performance', label: 'Performance', sortOrder: 2, hidden: false },
      { id: 'open',        label: 'Open / "or equal"', sortOrder: 3, hidden: false },
      { id: 'allowance',   label: 'Allowance / PC sum', sortOrder: 4, hidden: false },
      { id: 'tba',         label: 'TBC / TBA',   sortOrder: 5, hidden: false },
    ],
    typeOrInstance: [
      { id: 'instance',    label: 'Instance',    sortOrder: 1, hidden: false },
      { id: 'type',        label: 'Type',        sortOrder: 2, hidden: false },
    ],
  };

  // ─── Shared field definitions used by many groups/categories ───────────────
  // (Keeping these together near the top so it's clear which ids are shared.)
  fText('brand', 'Brand');
  fText('range', 'Range');
  fText('model', 'Model');
  fText('finish', 'Finish');
  fText('finish_colour', 'Finish colour');
  fText('size', 'Size');
  fText('dimensions', 'Dimensions');
  fText('material', 'Material');
  fText('colour', 'Colour');
  fNum('thickness', 'Thickness', 'mm');
  fNum('width', 'Width', 'mm');
  fNum('height', 'Height', 'mm');
  fNum('depth', 'Depth', 'mm');
  fNum('length', 'Length', 'mm');
  fText('mounting', 'Mounting');
  fText('location', 'Location');
  fText('profile', 'Profile');
  fText('pattern', 'Pattern');
  fText('grade', 'Grade');
  fText('type_text', 'Type'); // free-text type when no controlled list
  fText('IP_rating', 'IP rating');
  fNum('capacity_l', 'Capacity', 'L');
  fNum('capacity_kg', 'Capacity', 'kg');
  fNum('capacity_persons', 'Capacity (persons)');
  fText('capacity', 'Capacity');
  fNum('power_w', 'Power', 'W');
  fItem('material_ref', 'Material', null);
  fItemMulti('hardware_set', 'Hardware set', 'joinery_hardware');
  fItem('glazing_ref', 'Glazing', 'glazing');
  fItem('substrate_ref', 'Substrate', null);
  fItem('soffit_finish_ref', 'Soffit finish', null);
  fItem('handrail_ref', 'Handrail', 'handrail');
  fItem('balustrade_ref', 'Balustrade', 'balustrade');
  fItem('basin_ref', 'Basin', 'basin');
  fItem('tapware_ref', 'Tapware', 'tapware');
  fItem('edging_ref', 'Edging', 'edging');
  fItem('soil_ref', 'Soil', 'soil');
  fItem('mulch_ref', 'Mulch', null); // accepts mulch or gravel/stone mulch
  fItemMulti('planting_palette_ref', 'Planting palette', null);
  fItem('membrane_ref', 'Membrane', 'membrane');
  fItem('reinforcement_ref', 'Reinforcement', 'reinforcement');
  fItem('access_control_ref', 'Access control', 'access_control');

  // Expose builders + mutable state arrays for schema-data.jsx.
  // schema-data.jsx (loaded next by index.html) pushes all group/cat calls
  // into GROUPS/CATEGORIES/FIELDS, then assembles window.DEFAULT_SCHEMA_V5.
  window._schemaCtx = {
    f, fText, fLong, fNum, fBool, fSel, fMSel, fCur, fUrl,
    fItem, fItemMulti, fSwatch, fDate, fColor, fTag,
    group, cat,
    GROUPS, CATEGORIES, FIELDS, COMMON_FIELD_IDS, TAG_AXES, ROW_ORTHOGONALS,
  };
})();
