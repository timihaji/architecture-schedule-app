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
  fUrl('image_ref', 'Image reference');
  fLong('notes', 'Notes');
  // tags is a special composite — implemented as three multi-selects, one per axis:
  fTag('tags_performance', 'Performance', 'performance');
  fTag('tags_area', 'Area', 'area');
  fTag('tags_material_family', 'Material family', 'materialFamily');
  fMSel('libraries', 'Libraries', []); // options resolved at runtime

  const COMMON_FIELD_IDS = [
    'code', 'name', 'supplier', 'country_of_origin', 'lead_time',
    'unit', 'unit_cost', 'swatch', 'image_ref', 'notes',
    'tags_performance', 'tags_area', 'tags_material_family',
    'libraries'
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
  fText('IK_rating', 'IK rating');
  fNum('capacity_l', 'Capacity', 'L');
  fNum('capacity_kg', 'Capacity', 'kg');
  fNum('capacity_persons', 'Capacity (persons)');
  fText('capacity', 'Capacity');
  fNum('power_w', 'Power', 'W');
  fText('connection', 'Connection');
  fText('approval_standard', 'Approval standard');
  fText('frl', 'FRL');
  fItem('material_ref', 'Material', null);
  fItemMulti('hardware_set', 'Hardware set', 'joinery_hardware');
  fItem('glazing_ref', 'Glazing', 'glazing');
  fItem('substrate_ref', 'Substrate', null);
  fItem('soffit_finish_ref', 'Soffit finish', null);
  fItem('handrail_ref', 'Handrail', 'handrail');
  fItem('balustrade_ref', 'Balustrade', 'balustrade');
  fItem('basin_ref', 'Basin', 'basin');
  fItem('tapware_ref', 'Tapware', 'tapware');
  fItem('pump_ref', 'Pump', 'pump');
  fItem('edging_ref', 'Edging', 'edging');
  fItem('soil_ref', 'Soil', 'soil');
  fItem('mulch_ref', 'Mulch', null); // accepts mulch or gravel/stone mulch
  fItemMulti('planting_palette_ref', 'Planting palette', null);
  fItem('membrane_ref', 'Membrane', 'membrane');
  fItem('sealant_ref', 'Sealant', 'sealant');
  fItem('reinforcement_ref', 'Reinforcement', 'reinforcement');
  fItem('access_control_ref', 'Access control', 'access_control');
  fItem('sink_ref', 'Sink', 'sink');
  fItem('bbq_integrated_ref', 'BBQ integrated', 'bbq');
  fText('trade', 'Trade', { helpText: 'Auto-defaults from category; sticky once user-set.' });

  // =============================================================================
  // GROUP 1 — Surfaces (4 — slots)
  // =============================================================================
  fLong('extent_of_works', 'Extent of works');
  group('surfaces', 'Surfaces', ['extent_of_works', 'substrate_ref']);
  cat('wall',          'Wall',          'surfaces', 'm²', [], { flavour: 'slot' });
  cat('floor',         'Floor',         'surfaces', 'm²', [], { flavour: 'slot' });
  cat('ceiling',       'Ceiling',       'surfaces', 'm²', [], { flavour: 'slot' });
  cat('soffit',        'Soffit',        'surfaces', 'm²', [], { flavour: 'slot' });

  // =============================================================================
  // GROUP 2 — Trims (3 — slots)
  // =============================================================================
  fItem('profile_ref', 'Profile', null);
  group('trims', 'Trims', ['profile_ref', 'height', 'material']);
  cat('skirting',      'Skirting',      'trims', 'lm', [], { flavour: 'slot' });
  cat('architrave',    'Architrave',    'trims', 'lm', [], { flavour: 'slot' });
  cat('cornice',       'Cornice',       'trims', 'lm', [], { flavour: 'slot' });

  // =============================================================================
  // GROUP 3 — Finishes (21 — products)
  // =============================================================================
  fMSel('application_area', 'Application area',
    ['floor', 'wall', 'ceiling', 'exterior wall', 'soffit', 'joinery', 'splashback', 'benchtop']);
  fText('substrate_required', 'Substrate required');
  group('finishes', 'Finishes', ['application_area', 'substrate_required']);

  // Paint
  fText('colour_name', 'Colour name');
  fText('colour_code', 'Colour code');
  fSel('sheen_paint', 'Sheen', ['matt', 'low-sheen', 'satin', 'semi-gloss', 'gloss']);
  fText('paint_system', 'System');
  fNum('coats', 'Coats');
  fNum('coverage_per_l', 'Coverage', 'm²/L');
  fCur('price_per_l', 'Price per litre');
  fNum('lrv', 'LRV');
  fText('primer_required', 'Primer required');
  cat('paint', 'Paint', 'finishes', 'm²',
    ['brand', 'range', 'colour_name', 'colour_code', 'sheen_paint', 'paint_system', 'coats', 'coverage_per_l', 'price_per_l', 'lrv', 'primer_required']);

  // Wallpaper
  fNum('roll_width_mm', 'Roll width', 'mm');
  fNum('roll_length_m', 'Roll length', 'm');
  fNum('pattern_repeat_cm', 'Pattern repeat', 'cm');
  fSel('paste_method', 'Matching method', ['free', 'straight', 'drop']);
  fSel('paste_type', 'Paste type', ['paste-the-wall', 'paste-the-paper', 'pre-pasted']);
  cat('wallpaper', 'Wallpaper', 'finishes', 'm²',
    ['brand', 'range', 'pattern', 'roll_width_mm', 'roll_length_m', 'pattern_repeat_cm', 'paste_method', 'paste_type']);

  // Tile
  fText('format_text', 'Format', { helpText: 'e.g. 300×600' });
  fSel('tile_finish', 'Finish', ['gloss', 'satin', 'matt', 'anti-slip', 'structured', 'polished', 'lappato']);
  fSel('slip_rating', 'Slip rating', ['P0','P1','P2','P3','P4','P5','R9','R10','R11','R12','R13']);
  fText('grout_type', 'Grout type');
  fText('grout_colour', 'Grout colour');
  fNum('grout_width_mm', 'Grout width', 'mm');
  fSel('tile_edge_type', 'Edge type', ['rectified', 'cushion', 'bevelled']);
  cat('tile', 'Tile', 'finishes', 'm²',
    ['brand', 'range', 'format_text', 'tile_finish', 'slip_rating', 'grout_type', 'grout_colour', 'grout_width_mm', 'tile_edge_type']);

  // Timber finish
  fText('species', 'Species');
  fSel('timber_grade', 'Grade', ['select', 'feature', 'rustic', 'character']);
  fSel('timber_finish_method', 'Finish', ['oil', 'lacquer', 'hard-wax-oil', 'polyurethane', 'raw', 'stained']);
  fText('stain_colour', 'Stain colour');
  fNum('board_width_mm', 'Board width', 'mm');
  fNum('board_length_mm', 'Board length', 'mm');
  fSel('timber_profile', 'Profile', ['T&G', 'secret-fix', 'butt-joint', 'parquet', 'end-matched']);
  fNum('janka_hardness', 'Janka hardness');
  cat('timber', 'Timber', 'finishes', 'm²',
    ['species', 'timber_grade', 'timber_finish_method', 'stain_colour', 'board_width_mm', 'board_length_mm', 'thickness', 'timber_profile', 'janka_hardness']);

  // Stone
  fSel('stone_type', 'Type', ['marble','granite','limestone','travertine','slate','sandstone','quartzite','bluestone','basalt','terrazzo','onyx','soapstone']);
  fSel('stone_finish', 'Finish', ['polished','honed','brushed','flamed','sandblasted','leathered','aged']);
  fText('slab_size', 'Slab size');
  fText('edge_profile', 'Edge profile');
  fBool('sealing_required', 'Sealing required');
  cat('stone', 'Stone', 'finishes', 'm²',
    ['stone_type', 'stone_finish', 'slab_size', 'edge_profile', 'sealing_required']);

  // Laminate
  fText('decor', 'Decor');
  fSel('laminate_finish', 'Finish', ['matt', 'satin', 'gloss', 'textured', 'woodgrain', 'embossed']);
  fSel('laminate_edge_type', 'Edge type', ['PVC', 'ABS', 'laser', 'postformed', 'square']);
  fSel('laminate_core', 'Core', ['MR-MDF', 'particleboard', 'plywood', 'compact-laminate']);
  cat('laminate', 'Laminate', 'finishes', 'm²',
    ['brand', 'range', 'decor', 'thickness', 'laminate_finish', 'laminate_edge_type', 'laminate_core'],
    { aliases: ['HPL', 'melamine', 'decor sheet'] });

  // Metal finish
  fSel('metal_type', 'Type', ['aluminium','stainless steel','mild steel','brass','copper','zinc','weathering steel','bronze']);
  fSel('metal_finish', 'Finish', ['anodised','powder-coat','polished','brushed','mill','perforated','embossed','patinated']);
  fText('gauge', 'Gauge');
  fText('perforation_pattern', 'Perforation pattern');
  cat('metal', 'Metal', 'finishes', 'm²',
    ['metal_type', 'metal_finish', 'finish_colour', 'gauge', 'perforation_pattern']);

  // Polished concrete
  fSel('aggregate_type', 'Aggregate type', ['seeded', 'exposed-natural', 'exposed-decorative', 'integral']);
  fSel('concrete_sheen', 'Sheen', ['matt', 'satin', 'polished', 'mirror']);
  fText('sealer', 'Sealer');
  fNum('pour_thickness', 'Pour thickness', 'mm');
  cat('polished_concrete', 'Polished concrete', 'finishes', 'm²',
    ['aggregate_type', 'concrete_sheen', 'sealer', 'pour_thickness', 'colour']);

  // Resin floor
  fSel('resin_system', 'System', ['epoxy','polyurethane','MMA','vinyl-ester','cementitious-urethane']);
  fSel('resin_finish', 'Finish', ['smooth', 'broadcast', 'flake', 'anti-slip']);
  fNum('cove_height_mm', 'Cove height', 'mm');
  cat('resin_floor', 'Resin floor', 'finishes', 'm²',
    ['resin_system', 'resin_finish', 'colour', 'thickness', 'cove_height_mm']);

  // Vinyl
  fSel('vinyl_type', 'Type', ['sheet', 'plank', 'tile', 'LVT', 'SPC', 'WPC']);
  fText('plank_size', 'Plank size');
  fNum('wear_layer_mm', 'Wear layer', 'mm');
  cat('vinyl', 'Vinyl', 'finishes', 'm²',
    ['vinyl_type', 'brand', 'range', 'pattern', 'plank_size', 'thickness', 'wear_layer_mm']);

  // Linoleum
  fSel('linoleum_format', 'Format', ['sheet', 'tile']);
  cat('linoleum', 'Linoleum', 'finishes', 'm²',
    ['brand', 'range', 'pattern', 'thickness', 'linoleum_format']);

  // Rubber
  fSel('rubber_format', 'Format', ['sheet', 'tile', 'plank']);
  cat('rubber', 'Rubber', 'finishes', 'm²',
    ['brand', 'range', 'rubber_format', 'thickness', 'pattern']);

  // Cork
  fSel('cork_format', 'Format', ['tile', 'plank', 'sheet', 'roll']);
  fSel('cork_finish', 'Finish', ['natural', 'sealed', 'stained', 'painted']);
  cat('cork', 'Cork', 'finishes', 'm²',
    ['cork_format', 'thickness', 'cork_finish']);

  // Terrazzo
  fSel('terrazzo_type', 'Type', ['in-situ', 'precast tile', 'precast slab']);
  fText('base_colour', 'Base colour');
  fText('aggregate', 'Aggregate');
  cat('terrazzo', 'Terrazzo', 'finishes', 'm²',
    ['terrazzo_type', 'base_colour', 'aggregate', 'sealer', 'grout_colour']);

  // Polished plaster
  fSel('plaster_type', 'Type', ['marmorino','venetian','tadelakt','lime-wash','scagliola']);
  fSel('plaster_sheen', 'Sheen', ['matt', 'satin', 'polished', 'mirror']);
  fNum('system_layers', 'System layers');
  cat('polished_plaster', 'Polished plaster', 'finishes', 'm²',
    ['plaster_type', 'base_colour', 'plaster_sheen', 'system_layers', 'sealer']);

  // Carpet
  fSel('carpet_type', 'Type', ['broadloom', 'tile', 'plank']);
  fSel('carpet_pile', 'Pile', ['cut','loop','cut-and-loop','twist','level-loop','frieze']);
  fNum('pile_height_mm', 'Pile height', 'mm');
  fSel('carpet_backing', 'Backing', ['action-back', 'secondary-backing', 'cushion-back']);
  fSel('carpet_fibre', 'Fibre', ['nylon', 'wool', 'polyester', 'polypropylene', 'blend']);
  cat('carpet', 'Carpet', 'finishes', 'm²',
    ['carpet_type', 'brand', 'range', 'carpet_pile', 'pile_height_mm', 'carpet_backing', 'carpet_fibre']);

  // Textile
  fText('composition', 'Composition');
  fNum('width_cm', 'Width', 'cm');
  fNum('weight_gsm', 'Weight', 'gsm');
  fText('fire_rating', 'Fire rating');
  fSel('textile_use', 'Use', ['upholstery', 'drapery', 'wallcovering', 'bed-linen']);
  cat('textile', 'Textile', 'finishes', 'lm',
    ['brand', 'range', 'composition', 'width_cm', 'weight_gsm', 'fire_rating', 'textile_use']);

  // Acoustic panel
  fText('acoustic_core', 'Core');
  fSel('acoustic_facing', 'Facing', ['fabric', 'wood-veneer', 'metal', 'MDF-perforated', 'gypsum-perforated', 'PET']);
  fNum('nrc_rating', 'NRC rating');
  cat('acoustic_panel', 'Acoustic panel', 'finishes', 'm²',
    ['brand', 'range', 'acoustic_core', 'acoustic_facing', 'nrc_rating', 'fire_rating', 'thickness', 'format_text']);

  // Cladding
  fSel('cladding_material', 'Material', ['timber','fibre-cement','metal','composite','masonry','concrete-panel','terracotta']);
  fSel('cladding_fixing', 'Fixing', ['face-fixed', 'secret-fixed', 'clip-fixed', 'rivet-fixed']);
  fBool('weep_holes_required', 'Weep holes required');
  fNum('cavity_size_mm', 'Cavity size', 'mm');
  cat('cladding', 'Cladding', 'finishes', 'm²',
    ['brand', 'profile', 'cladding_material', 'finish', 'cladding_fixing', 'weep_holes_required', 'cavity_size_mm'],
    { aliases: ['external lining'] });

  // Render
  fSel('render_system', 'System', ['cement', 'acrylic', 'lime', 'polymer-modified']);
  fSel('render_finish', 'Finish', ['smooth', 'sponge', 'sand', 'bagged', 'scratched', 'textured']);
  cat('render', 'Render', 'finishes', 'm²',
    ['render_system', 'render_finish', 'colour', 'thickness']);

  // Glazing
  fSel('glazing_type', 'Type', ['float','low-iron','toughened','laminated','double-glazed','triple-glazed','low-E','fire-rated','acoustic','switchable','obscure']);
  fText('glazing_thickness', 'Thickness', { helpText: 'e.g. 6/12/6' });
  fText('interlayer', 'Interlayer');
  fBool('low_e', 'Low-E');
  fNum('u_value', 'U value');
  fNum('shgc', 'SHGC');
  fNum('vlt', 'VLT');
  fNum('rw', 'Rw');
  fText('safety_compliance', 'Safety compliance');
  fText('obscure_pattern', 'Obscure pattern');
  cat('glazing', 'Glazing', 'finishes', 'm²',
    ['glazing_type', 'glazing_thickness', 'interlayer', 'low_e', 'u_value', 'shgc', 'vlt', 'rw', 'safety_compliance', 'obscure_pattern']);

  // =============================================================================
  // GROUP 4 — Substrates, barriers & membranes (11)
  // =============================================================================
  fText('location_of_use', 'Location of use');
  group('substrates', 'Substrates, barriers & membranes', ['brand', 'thickness', 'location_of_use']);

  // Plasterboard
  fSel('plasterboard_type', 'Type', ['standard','fire-rated','water-resistant','impact-resistant','acoustic','sound-rated','mould-resistant']);
  fText('sheet_size', 'Sheet size');
  fSel('plasterboard_edge', 'Edge', ['square', 'recessed', 'tapered']);
  fNum('acoustic_rw', 'Acoustic Rw');
  cat('plasterboard', 'Plasterboard', 'substrates', 'm²',
    ['plasterboard_type', 'sheet_size', 'plasterboard_edge', 'fire_rating', 'acoustic_rw'],
    { aliases: ['Gyprock', 'GIB', 'drywall', 'gypsum board', 'gypsum'] });

  // Fibre cement sheet
  fSel('fc_sheet_type', 'Type', ['lining', 'cladding', 'eaves', 'compressed', 'soffit']);
  fSel('fc_sheet_finish', 'Finish', ['smooth', 'textured']);
  cat('fibre_cement_sheet', 'Fibre cement sheet', 'substrates', 'm²',
    ['fc_sheet_type', 'sheet_size', 'fc_sheet_finish'],
    { aliases: ['Villaboard', 'FC sheet', 'Hardiflex', 'blueboard'] });

  // Cement sheet
  fSel('cement_sheet_use', 'Use', ['lining', 'soffit', 'flooring', 'tile-substrate']);
  cat('cement_sheet', 'Cement sheet', 'substrates', 'm²',
    ['sheet_size', 'cement_sheet_use']);

  // Plywood lining
  fSel('plywood_grade', 'Grade', ['A', 'B', 'C', 'D', 'marine']);
  fText('structural_rating', 'Structural rating');
  cat('plywood_lining', 'Plywood lining', 'substrates', 'm²',
    ['species', 'plywood_grade', 'format_text', 'finish', 'structural_rating']);

  // Lining (generic)
  fSel('lining_application', 'Application', ['wall', 'ceiling', 'floor', 'joinery']);
  cat('lining', 'Lining', 'substrates', 'm²',
    ['type_text', 'sheet_size', 'lining_application']);

  // Insulation
  fSel('insulation_type', 'Type', ['glasswool','rockwool','polyester','cellulose','EPS','XPS','PIR','PUR','sheep-wool','hemp','mineral-fibre']);
  fNum('r_value', 'R value');
  fNum('density_kg_m3', 'Density', 'kg/m³');
  fNum('insulation_nrc', 'Acoustic NRC');
  fText('fire_classification', 'Fire classification');
  cat('insulation', 'Insulation', 'substrates', 'm²',
    ['insulation_type', 'r_value', 'density_kg_m3', 'insulation_nrc', 'fire_classification'],
    { aliases: ['batt', 'sarking-insulation', 'ceiling insulation'] });

  // Membrane
  fSel('membrane_type', 'Type', ['waterproofing','vapour-barrier','air-barrier','sarking','DPC','roofing','pond-liner','smoke-barrier','root-barrier']);
  fBool('uv_stable', 'UV stable');
  fBool('trafficable', 'Trafficable');
  cat('membrane', 'Membrane', 'substrates', 'm²',
    ['membrane_type', 'uv_stable', 'trafficable'],
    { aliases: ['DPC', 'sarking', 'vapour barrier', 'air barrier', 'waterproofing', 'damp-proof course'] });

  // Fire stopping
  fText('system_text', 'System');
  fSel('fire_stopping_use', 'Use', ['penetration', 'joint', 'collar', 'pillow', 'intumescent-strip']);
  cat('fire_stopping', 'Fire stopping', 'substrates', 'ea',
    ['system_text', 'frl', 'fire_stopping_use']);

  // Sealant
  fSel('sealant_type', 'Type', ['silicone','polyurethane','MS-polymer','acrylic','butyl','fire-rated','hybrid']);
  fText('cure_time', 'Cure time');
  fSel('sealant_use_class', 'Use class', ['wet-area', 'expansion', 'fire', 'glazing', 'exterior', 'structural']);
  cat('sealant', 'Sealant', 'substrates', 'ea',
    ['sealant_type', 'colour', 'cure_time', 'sealant_use_class']);

  // Sealant joint
  fNum('joint_width_mm', 'Joint width', 'mm');
  fNum('joint_depth_mm', 'Joint depth', 'mm');
  fBool('backing_rod', 'Backing rod');
  cat('sealant_joint', 'Sealant joint', 'substrates', 'lm',
    ['joint_width_mm', 'joint_depth_mm', 'backing_rod', 'sealant_ref', 'location']);

  // Movement joint
  fSel('movement_joint_type', 'Joint type', ['expansion', 'control', 'settlement', 'isolation', 'structural']);
  fText('cover_strip', 'Cover strip');
  fText('cover_material', 'Cover material');
  cat('movement_joint', 'Movement joint', 'substrates', 'lm',
    ['movement_joint_type', 'width', 'cover_strip', 'cover_material'],
    { aliases: ['expansion joint', 'control joint', 'settlement joint'] });

  // =============================================================================
  // GROUP 5 — Roof, facade & rainwater (12)
  // =============================================================================
  fText('as_compliance', 'AS compliance');
  fText('fall', 'Fall');
  // Fall (drainage gradient) only applies to roof_slot, gutter, and a few
  // surfaces — pushed down so fascias, downpipes, solar PV, flashings,
  // bargeboards don't inherit a "Fall" field that doesn't apply.
  group('roof', 'Roof, facade & rainwater', ['material', 'finish', 'as_compliance']);

  cat('roof_slot', 'Roof', 'roof', 'm²',
    ['extent_of_works', 'fall'], { flavour: 'slot' });

  fNum('overhang_mm', 'Overhang', 'mm');
  cat('eave', 'Eave', 'roof', 'lm',
    ['overhang_mm', 'soffit_finish_ref'], { flavour: 'slot' });

  fNum('fascia_depth_mm', 'Depth', 'mm');
  cat('fascia', 'Fascia', 'roof', 'lm',
    ['profile', 'fascia_depth_mm'], { flavour: 'slot' });

  fItem('capping_ref', 'Capping', 'coping');
  cat('parapet', 'Parapet', 'roof', 'lm',
    ['height', 'capping_ref'], { flavour: 'slot' });

  fNum('coping_fall_deg', 'Fall', 'deg');
  fBool('drip_edge', 'Drip edge');
  cat('coping', 'Coping', 'roof', 'lm',
    ['profile', 'coping_fall_deg', 'drip_edge']);

  cat('bargeboard', 'Bargeboard', 'roof', 'lm',
    ['profile', 'depth', 'capping_ref']);

  fSel('gutter_profile', 'Profile', ['quad', 'half-round', 'square', 'box', 'internal-box', 'ogee']);
  cat('gutter', 'Gutter', 'roof', 'lm',
    ['gutter_profile', 'gauge', 'size', 'fall']);

  fSel('downpipe_profile', 'Profile', ['round', 'rectangular', 'square']);
  fText('fixing_text', 'Fixing');
  cat('downpipe', 'Downpipe', 'roof', 'm',
    ['downpipe_profile', 'size', 'fixing_text']);

  fSel('rainhead_type', 'Type', ['standard', 'overflow', 'decorative']);
  fNum('capacity_l_s', 'Capacity', 'l/s');
  cat('rainhead', 'Rainhead', 'roof', 'ea',
    ['rainhead_type', 'capacity_l_s', 'material']);

  fNum('panel_wattage_w', 'Panel wattage', 'W');
  fText('panel_dimensions', 'Panel dimensions');
  fSel('solar_mount', 'Mount', ['roof-fixed', 'roof-integrated', 'ground', 'façade']);
  fText('inverter_text', 'Inverter');
  fBool('micro_inverter', 'Micro-inverter');
  cat('solar_pv', 'Solar PV', 'roof', 'ea',
    ['panel_wattage_w', 'panel_dimensions', 'solar_mount', 'inverter_text', 'micro_inverter']);

  fSel('green_roof_type', 'Type', ['extensive', 'intensive', 'semi-intensive']);
  fNum('substrate_depth_mm', 'Substrate depth', 'mm');
  fText('drainage_layer', 'Drainage layer');
  cat('green_roof', 'Green roof', 'roof', 'm²',
    ['green_roof_type', 'substrate_depth_mm', 'drainage_layer', 'planting_palette_ref', 'membrane_ref']);

  fSel('flashing_material', 'Material', ['zinc', 'lead', 'copper', 'stainless', 'aluminium', 'EPDM']);
  fSel('flashing_location', 'Location', ['pitch-change', 'valley', 'ridge', 'parapet', 'penetration', 'sill']);
  cat('flashing', 'Flashing', 'roof', 'lm',
    ['flashing_material', 'profile', 'gauge', 'flashing_location']);

  // =============================================================================
  // GROUP 6 — Structure (16)
  // =============================================================================
  fText('structural_grade', 'Structural grade');
  fBool('engineer_certified', 'Engineer certified');
  fText('connection_type', 'Connection type');
  // Connection type only applies to discrete members (column, beam, truss,
  // framing). Doesn't fit slabs, footings, masonry, reinforcement, hob_bund.
  // steel_structure has its own typed steel_connection. Pushed down.
  group('structure', 'Structure', ['structural_grade', 'engineer_certified']);

  fSel('footing_type', 'Type', ['pad', 'strip', 'raft', 'piled', 'screw-pile']);
  cat('footing', 'Footing', 'structure', 'm³',
    ['footing_type', 'depth', 'dimensions'], { flavour: 'slot' });

  fText('mesh', 'Mesh');
  fItem('vapour_barrier_ref', 'Vapour barrier', 'membrane');
  cat('slab_on_ground', 'Slab on ground', 'structure', 'm²',
    ['thickness', 'mesh', 'vapour_barrier_ref', 'finish'], { flavour: 'slot' });

  fSel('suspended_slab_system', 'System', ['PT', 'RC', 'formwork', 'Bondek', 'hollow-core', 'voided-slab']);
  fText('span', 'Span');
  cat('suspended_slab', 'Suspended slab', 'structure', 'm²',
    ['thickness', 'suspended_slab_system', 'span'], { flavour: 'slot' });

  cat('column', 'Column', 'structure', 'ea',
    ['material', 'size', 'height', 'capacity', 'connection_type'], { flavour: 'slot' });

  cat('beam', 'Beam', 'structure', 'm',
    ['material', 'profile', 'span', 'capacity', 'connection_type'], { flavour: 'slot' });

  cat('structural_wall', 'Structural wall', 'structure', 'm²',
    ['material', 'thickness', 'capacity'], { flavour: 'slot' });

  cat('lintel', 'Lintel', 'structure', 'ea',
    ['material', 'length', 'span', 'capacity'], { flavour: 'slot' });

  fSel('bracing_type', 'Type', ['K-brace', 'X-brace', 'knee', 'plywood-shear', 'strap']);
  cat('bracing', 'Bracing', 'structure', 'ea',
    ['bracing_type', 'material'], { flavour: 'slot' });

  fSel('framing_material', 'Material', ['timber', 'light-gauge-steel', 'steel', 'hot-rolled', 'cold-formed']);
  fNum('spacing_mm', 'Spacing', 'mm');
  fText('member_size', 'Member size');
  cat('framing', 'Framing', 'structure', 'm²',
    ['framing_material', 'spacing_mm', 'member_size', 'connection_type'], { flavour: 'slot' });

  fSel('concrete_pour_method', 'Pour method', ['in-situ', 'precast', 'tilt-up']);
  cat('concrete_structure', 'Concrete structure', 'structure', 'm³',
    ['grade', 'concrete_pour_method', 'reinforcement_ref', 'finish']);

  fSel('steel_connection', 'Connection type', ['bolted', 'welded', 'pinned']);
  fSel('steel_finish', 'Finish', ['galvanised', 'painted', 'primed', 'weathering', 'painted-galv']);
  cat('steel_structure', 'Steel structure', 'structure', 'kg',
    ['grade', 'profile', 'steel_connection', 'steel_finish']);

  fSel('timber_treatment', 'Treatment', ['H1', 'H2', 'H3', 'H4', 'glulam', 'LVL', 'CLT', 'untreated']);
  cat('timber_structure', 'Timber structure', 'structure', 'm³',
    ['species', 'grade', 'timber_treatment']);

  fSel('masonry_type', 'Type', ['brick', 'blockwork', 'stone']);
  fText('unit_size', 'Unit size');
  fText('mortar_type', 'Mortar type');
  cat('masonry_structure', 'Masonry structure', 'structure', 'm²',
    ['masonry_type', 'unit_size', 'mortar_type']);

  fText('bar_size', 'Bar size');
  fText('spacing_text', 'Spacing');
  fText('mesh_type', 'Mesh type');
  cat('reinforcement', 'Reinforcement', 'structure', 'kg',
    ['grade', 'bar_size', 'spacing_text', 'mesh_type']);

  fSel('hob_bund_type', 'Type', ['hob', 'bund']);
  cat('hob_bund', 'Hob / bund', 'structure', 'lm',
    ['hob_bund_type', 'height', 'width', 'membrane_ref'],
    { aliases: ['kerb-bund', 'containment-kerb', 'shower hob'] });

  fSel('truss_joist_type', 'Type', ['truss', 'joist', 'rafter', 'purlin']);
  cat('truss_joist', 'Truss / joist', 'structure', 'ea',
    ['truss_joist_type', 'material', 'depth', 'spacing_mm', 'span', 'connection_type'],
    { aliases: ['rafter', 'purlin'] });

  // =============================================================================
  // GROUP 7 — Doors, windows & openings (8)
  // =============================================================================
  fText('opening_size', 'Opening size');
  group('openings', 'Doors, windows & openings', ['width', 'height', 'opening_size']);

  // Door
  fSel('opening_type', 'Opening type', ['hinged','sliding','cavity-slider','bifold','pivot','barn','pocket','double-hinged','french']);
  fText('leaf_material', 'Leaf material');
  fNum('leaf_thickness_mm', 'Leaf thickness', 'mm');
  fText('frame_material', 'Frame material');
  fText('frame_finish', 'Frame finish');
  fText('threshold', 'Threshold');
  fSel('door_fire_rating', 'Fire rating', ['none','FRL -/30/30','FRL -/60/60','FRL -/90/90','FRL 60/60/60','FRL 90/90/90']);
  fNum('acoustic_rw_door', 'Acoustic Rw');
  fSel('opening_direction', 'Opening direction', ['LH', 'RH', 'double', 'sliding']);
  fNum('sill_height_mm', 'Sill height', 'mm');
  cat('door', 'Door', 'openings', 'ea',
    ['opening_type', 'leaf_material', 'leaf_thickness_mm', 'frame_material', 'frame_finish', 'threshold', 'hardware_set', 'glazing_ref', 'door_fire_rating', 'acoustic_rw_door', 'opening_direction', 'sill_height_mm']);

  // Window
  fSel('window_type', 'Window type', ['fixed','casement','awning','sliding','double-hung','bifold','louvre','hopper','tilt-turn']);
  fSel('window_frame_material', 'Frame material', ['aluminium', 'timber', 'uPVC', 'steel', 'composite']);
  fText('sill_type', 'Sill type');
  fText('reveal', 'Reveal');
  fText('cill_finish', 'Cill finish');
  fBool('flyscreen', 'Flyscreen');
  cat('window', 'Window', 'openings', 'ea',
    ['window_type', 'window_frame_material', 'frame_finish', 'glazing_ref', 'sill_height_mm', 'sill_type', 'reveal', 'cill_finish', 'flyscreen']);

  // Garage door
  fSel('garage_door_type', 'Type', ['panel-lift', 'sectional', 'roller', 'tilt', 'side-hinged', 'bifold']);
  fSel('garage_motor', 'Motor', ['belt-drive', 'chain-drive', 'screw-drive', 'manual']);
  fBool('remote', 'Remote');
  cat('garage_door', 'Garage door', 'openings', 'ea',
    ['garage_door_type', 'material', 'finish', 'garage_motor', 'remote', 'hardware_set']);

  // Roller shutter
  fSel('roller_shutter_type', 'Type', ['security', 'fire', 'smoke', 'insulated', 'perforated']);
  fSel('roller_shutter_operation', 'Operation', ['manual', 'motorised']);
  fText('slat_profile', 'Slat profile');
  cat('roller_shutter', 'Roller shutter', 'openings', 'ea',
    ['roller_shutter_type', 'material', 'roller_shutter_operation', 'slat_profile']);

  // Operable wall
  fSel('operable_wall_type', 'Type', ['folding', 'sliding', 'demountable', 'accordion', 'glass-stack']);
  fNum('panel_count', 'Panel count');
  fText('panel_material', 'Panel material');
  fNum('acoustic_rw_wall', 'Acoustic Rw');
  fNum('max_height_mm', 'Max height', 'mm');
  fText('stack_arrangement', 'Stack arrangement');
  cat('operable_wall', 'Operable wall', 'openings', 'lm',
    ['operable_wall_type', 'panel_count', 'panel_material', 'acoustic_rw_wall', 'max_height_mm', 'stack_arrangement']);

  // Skylight
  fSel('skylight_type', 'Type', ['fixed', 'opening', 'tubular', 'ventilating']);
  fSel('skylight_opening', 'Opening method', ['manual', 'electric', 'solar', 'rain-sensor']);
  fBool('flashing_kit_required', 'Flashing kit required');
  cat('skylight', 'Skylight', 'openings', 'ea',
    ['skylight_type', 'size', 'glazing_ref', 'frame_finish', 'skylight_opening', 'flashing_kit_required']);

  // Louvre
  fSel('louvre_type', 'Type', ['fixed', 'operable', 'automatic']);
  fText('blade_profile', 'Blade profile');
  fNum('blade_spacing_mm', 'Blade spacing', 'mm');
  fSel('louvre_drive', 'Opening drive', ['manual', 'motorised', 'BMS-controlled', 'rain-sensor']);
  cat('louvre', 'Louvre', 'openings', 'ea',
    ['louvre_type', 'material', 'blade_profile', 'blade_spacing_mm', 'louvre_drive']);

  // Access panel
  fBool('key_required', 'Key required');
  cat('access_panel', 'Access panel', 'openings', 'ea',
    ['material', 'size', 'finish', 'fire_rating', 'acoustic_rw', 'key_required'],
    { aliases: ['AP', 'ceiling hatch', 'service hatch'] });

  // =============================================================================
  // GROUP 8 — Sanitary, tapware & hydraulic fixtures (14)
  // =============================================================================
  fNum('wels_rating', 'WELS rating');
  fSel('connection_type_san', 'Connection type', ['1/2"', '15mm', '20mm', 'custom']);
  fSel('mounting_san', 'Mounting', ['wall', 'deck', 'floor', 'countertop', 'in-wall']);
  // Brand and finish are universal in this group. WELS, sanitary connection,
  // and sanitary mounting only fit fixtures using water and physical mounts —
  // pushed down so mirrors, shower screens, niches don't inherit them.
  group('sanitary', 'Sanitary, tapware & hydraulic fixtures', ['brand', 'finish']);

  // Basin
  fSel('basin_bowl_shape', 'Bowl shape', ['round', 'oval', 'square', 'rectangle', 'vessel', 'semi-recessed', 'undermount', 'integral']);
  fBool('overflow', 'Overflow');
  fSel('basin_taphole_count', 'Taphole count', ['0', '1', '3']);
  fText('drain_type', 'Drain type');
  cat('basin', 'Basin', 'sanitary', 'ea',
    ['basin_bowl_shape', 'size', 'wels_rating', 'connection_type_san', 'mounting_san', 'overflow', 'basin_taphole_count', 'drain_type']);

  // Sink
  fSel('sink_type', 'Type', ['kitchen', 'laundry', 'butlers', 'prep', 'bar', 'bath']);
  fSel('sink_bowl_count', 'Bowl count', ['single', '1.5', 'double', 'triple']);
  fBool('drainboard', 'Drainboard');
  fSel('sink_material', 'Material', ['stainless','granite-composite','ceramic','copper','fireclay','concrete','solid-surface']);
  fBool('undermount', 'Undermount');
  cat('sink', 'Sink', 'sanitary', 'ea',
    ['sink_type', 'sink_bowl_count', 'size', 'wels_rating', 'connection_type_san', 'mounting_san', 'drainboard', 'sink_material', 'undermount']);

  // WC
  fSel('wc_pan_type', 'Pan type', ['wall-faced', 'close-coupled', 'back-to-wall', 'wall-hung', 'in-wall']);
  fSel('wc_cistern_type', 'Cistern type', ['close-coupled', 'in-wall', 'exposed', 'none']);
  fSel('wc_flush_rating', 'Flush rating', ['4.5/3', '4.5/3.5', '6/3']);
  fSel('wc_trap', 'Trap', ['P', 'S', 'skew']);
  fBool('wc_seat_included', 'Seat included');
  fBool('wc_soft_close', 'Soft-close seat');
  cat('wc', 'WC', 'sanitary', 'ea',
    ['wc_pan_type', 'wc_cistern_type', 'wc_flush_rating', 'wc_trap', 'wels_rating', 'connection_type_san', 'mounting_san', 'wc_seat_included', 'wc_soft_close'],
    { aliases: ['toilet', 'lavatory', 'water closet', 'dunny'] });

  // Urinal
  fSel('urinal_type', 'Type', ['bowl', 'slab', 'wall-hung', 'waterless', 'trough']);
  fSel('urinal_flush', 'Flush method', ['sensor', 'manual', 'timed', 'none']);
  cat('urinal', 'Urinal', 'sanitary', 'ea',
    ['urinal_type', 'urinal_flush', 'size', 'wels_rating', 'connection_type_san', 'mounting_san']);

  // Bath
  fSel('bath_type', 'Type', ['freestanding', 'drop-in', 'alcove', 'corner', 'walk-in', 'japanese', 'claw-foot']);
  fSel('bath_material', 'Material', ['acrylic', 'steel-enamel', 'cast-iron', 'stone', 'copper', 'composite']);
  cat('bath', 'Bath', 'sanitary', 'ea',
    ['bath_type', 'bath_material', 'size', 'capacity_l', 'wels_rating', 'connection_type_san', 'overflow']);

  // Shower
  fSel('shower_type', 'Type', ['walk-in', 'screened', 'alcove', 'wet-room', 'tub-shower']);
  fSel('shower_base', 'Base', ['tray', 'in-situ-floor', 'raised-deck']);
  fSel('shower_drainage', 'Drainage', ['floor-waste', 'linear-drain']);
  cat('shower', 'Shower', 'sanitary', 'ea',
    ['shower_type', 'shower_base', 'shower_drainage', 'size', 'wels_rating', 'connection_type_san']);

  // Tapware
  fSel('tapware_type', 'Type', ['mixer', 'two-handle', 'sensor', 'timed', 'hose-tap', 'lever']);
  fSel('tapware_spout_type', 'Spout type', ['gooseneck', 'square', 'swan', 'pull-out', 'waterfall', 'hidden', 'none']);
  fNum('spout_reach_mm', 'Spout reach', 'mm');
  fSel('tapware_body_material', 'Body material', ['brass', 'stainless', 'chrome', 'plastic']);
  fSel('tapware_handle_count', 'Handle count', ['1', '2', '3']);
  cat('tapware', 'Tapware', 'sanitary', 'ea',
    ['tapware_type', 'tapware_spout_type', 'spout_reach_mm', 'tapware_body_material', 'tapware_handle_count', 'wels_rating', 'connection_type_san', 'mounting_san']);

  // Floor waste
  fText('grate_pattern', 'Grate pattern');
  fSel('floor_waste_material', 'Material', ['stainless', 'brass', 'chrome', 'custom-tiled']);
  fNum('trap_height_mm', 'Trap height', 'mm');
  cat('floor_waste', 'Floor waste', 'sanitary', 'ea',
    ['size', 'grate_pattern', 'floor_waste_material', 'trap_height_mm']);

  // Linear drain
  fNum('trap_depth_mm', 'Trap depth', 'mm');
  fSel('linear_drain_slope', 'Slope', ['integrated', 'site-formed']);
  cat('linear_drain', 'Linear drain', 'sanitary', 'lm',
    ['length', 'grate_pattern', 'material', 'trap_depth_mm', 'linear_drain_slope'],
    { aliases: ['strip drain', 'channel drain'] });

  // Shower screen
  fSel('shower_screen_type', 'Type', ['framed', 'semi-frameless', 'frameless', 'walk-in']);
  fNum('glass_thickness_mm', 'Glass thickness', 'mm');
  fSel('shower_screen_door', 'Door type', ['hinged', 'sliding', 'pivot', 'none']);
  cat('shower_screen', 'Shower screen', 'sanitary', 'ea',
    ['shower_screen_type', 'glass_thickness_mm', 'glazing_ref', 'shower_screen_door']);

  // Mirror
  fSel('mirror_type', 'Type', ['framed', 'frameless', 'demister', 'illuminated']);
  fSel('mirror_edge', 'Edge', ['bevelled', 'polished', 'framed']);
  fText('mirror_backing', 'Backing');
  fBool('led_integrated', 'LED integrated');
  fBool('demister', 'Demister');
  cat('mirror', 'Mirror', 'sanitary', 'ea',
    ['mirror_type', 'size', 'mirror_edge', 'mirror_backing', 'mounting_san', 'led_integrated', 'demister']);

  // Bathroom accessory
  fSel('bath_accessory_type', 'Type', ['towel-rail','towel-ring','soap-dish','soap-dispenser','toothbrush-holder','toilet-roll-holder','toilet-brush','robe-hook','shelf','basket','grab-rail','shower-niche-shelf']);
  cat('bathroom_accessory', 'Bathroom accessory', 'sanitary', 'ea',
    ['bath_accessory_type', 'mounting_san'],
    { aliases: ['bath fittings'] });

  // Heated towel rail
  fSel('htr_type', 'Type', ['hardwired', 'plug-in', 'hydronic']);
  fNum('htr_bar_count', 'Bar count');
  cat('heated_towel_rail', 'Heated towel rail', 'sanitary', 'ea',
    ['htr_type', 'power_w', 'connection_type_san', 'mounting_san', 'htr_bar_count', 'size']);

  // Niche
  fItem('finish_ref', 'Finish', null);
  fBool('waterproofing_required', 'Waterproofing required');
  cat('niche', 'Niche', 'sanitary', 'ea',
    ['size', 'location', 'finish_ref', 'waterproofing_required'], { flavour: 'slot' });

  // =============================================================================
  // GROUP 9 — Joinery & casework (10)
  // =============================================================================
  fText('carcass_material', 'Carcass material');
  fItem('door_finish_ref', 'Door finish', null);
  fNum('kickboard_height_mm', 'Kickboard height', 'mm');
  fBool('soft_close', 'Soft close');
  // Cabinet-construction fields (carcass, door finish, hardware, kickboard,
  // soft-close) only fit boxes-with-doors. Benchtops, splashbacks, banquettes,
  // hardware items themselves, and lab benches don't need them. Pushed down
  // to vanity/wardrobe/kitchen_joinery/storage_joinery/reception_desk only.
  group('joinery', 'Joinery & casework', []);

  // Joinery hardware
  fSel('joinery_hardware_type', 'Type', ['handle','knob','hinge','drawer-runner','shelf-support','catch','lock','lift-up','drop-down','push-to-open']);
  fNum('weight_capacity_kg', 'Weight capacity', 'kg');
  cat('joinery_hardware', 'Joinery hardware', 'joinery', 'ea',
    ['joinery_hardware_type', 'brand', 'material', 'finish', 'soft_close', 'weight_capacity_kg'],
    { aliases: ['ironmongery', 'cabinet hardware'] });

  // Benchtop
  fSel('benchtop_material', 'Material', ['stone','engineered-stone','laminate','timber','stainless','concrete','solid-surface','porcelain','ceramic','glass']);
  fSel('benchtop_edge_profile', 'Edge profile', ['square', 'eased', 'bullnose', 'ogee', 'mitred', 'waterfall', 'chamfered']);
  fSel('benchtop_waterfall', 'Waterfall ends', ['none', 'one', 'both']);
  fText('upstand', 'Upstand');
  fText('joint_locations', 'Joint locations');
  cat('benchtop', 'Benchtop', 'joinery', 'm²',
    ['benchtop_material', 'material_ref', 'thickness', 'benchtop_edge_profile', 'benchtop_waterfall', 'upstand', 'joint_locations']);

  // Splashback
  fText('grout_or_jointing', 'Grout / jointing');
  cat('splashback', 'Splashback', 'joinery', 'm²',
    ['material_ref', 'height', 'grout_or_jointing', 'finish']);

  // Vanity
  fSel('vanity_type', 'Type', ['wall-hung', 'floor-mounted', 'semi-recessed', 'custom']);
  fNum('drawer_count', 'Drawer count');
  fNum('door_count', 'Door count');
  fText('interior_finish', 'Interior finish');
  cat('vanity', 'Vanity', 'joinery', 'ea',
    ['vanity_type', 'basin_ref', 'tapware_ref', 'carcass_material', 'door_finish_ref', 'hardware_set', 'kickboard_height_mm', 'soft_close', 'drawer_count', 'door_count', 'size', 'interior_finish']);

  // Wardrobe
  fSel('wardrobe_type', 'Type', ['built-in', 'walk-in', 'freestanding', 'sliding-door', 'hinged-door']);
  fText('door_type_text', 'Door type');
  fLong('interior_fitout', 'Interior fitout');
  fNum('shelf_count', 'Shelf count');
  fNum('hanging_count', 'Hanging count');
  fBool('mirror_yn', 'Mirror');
  cat('wardrobe', 'Wardrobe', 'joinery', 'ea',
    ['wardrobe_type', 'carcass_material', 'door_finish_ref', 'hardware_set', 'soft_close', 'door_type_text', 'interior_fitout', 'drawer_count', 'shelf_count', 'hanging_count', 'mirror_yn']);

  // Kitchen joinery
  fSel('kitchen_layout', 'Layout', ['galley', 'L-shape', 'U-shape', 'island', 'single-wall', 'peninsula']);
  fNum('base_run_length_mm', 'Base run length', 'mm');
  fNum('wall_run_length_mm', 'Wall run length', 'mm');
  fBool('island', 'Island');
  fSel('pantry_type', 'Pantry type', ['none', 'walk-in', 'butlers', 'scullery']);
  cat('kitchen_joinery', 'Kitchen joinery', 'joinery', 'lm',
    ['kitchen_layout', 'carcass_material', 'door_finish_ref', 'hardware_set', 'kickboard_height_mm', 'soft_close', 'base_run_length_mm', 'wall_run_length_mm', 'island', 'pantry_type']);

  // Reception desk
  fSel('counter_height_mm', 'Counter height', ['720', '900', '1100', 'custom']);
  fBool('accessible_section', 'Accessible section');
  fBool('cable_management', 'Cable management');
  cat('reception_desk', 'Reception desk', 'joinery', 'ea',
    ['size', 'carcass_material', 'door_finish_ref', 'counter_height_mm', 'accessible_section', 'cable_management']);

  // Banquette
  fSel('banquette_type', 'Type', ['built-in', 'freestanding', 'modular']);
  fNum('seat_height_mm', 'Seat height', 'mm');
  fItem('upholstery_ref', 'Upholstery', 'textile');
  fBool('storage_under', 'Storage under');
  cat('banquette', 'Banquette', 'joinery', 'lm',
    ['banquette_type', 'depth', 'seat_height_mm', 'upholstery_ref', 'storage_under']);

  // Storage joinery
  fSel('storage_type', 'Type', ['shelving', 'cabinets', 'lockers', 'display', 'mobile']);
  fSel('storage_open', 'Open or closed', ['open', 'closed', 'mixed']);
  fBool('adjustable_shelves', 'Adjustable shelves');
  cat('storage_joinery', 'Storage joinery', 'joinery', 'ea',
    ['storage_type', 'carcass_material', 'door_finish_ref', 'hardware_set', 'kickboard_height_mm', 'soft_close', 'storage_open', 'adjustable_shelves']);

  // Lab bench
  fSel('lab_top_material', 'Top material', ['chemical-resistant-laminate', 'epoxy', 'stainless', 'phenolic']);
  fSel('lab_service_run', 'Service run', ['above-bench', 'below-bench', 'integrated', 'mobile']);
  fBool('sink_integrated', 'Sink integrated');
  fNum('gas_outlets', 'Gas outlets');
  fNum('power_outlets', 'Power outlets');
  fBool('fume_extraction_integrated', 'Fume extraction integrated');
  cat('lab_bench', 'Lab bench', 'joinery', 'lm',
    ['lab_top_material', 'lab_service_run', 'sink_integrated', 'gas_outlets', 'power_outlets', 'fume_extraction_integrated']);

  // =============================================================================
  // GROUP 10 — Stairs, ramps & barriers (6)
  // =============================================================================
  fItem('structural_ref', 'Structure', null);
  group('stairs', 'Stairs, ramps & barriers', ['structural_ref', 'location']);

  // Stair
  fSel('stair_type', 'Type', ['straight','dog-leg','U-shaped','helical','spiral','cantilevered','half-turn','quarter-turn']);
  fNum('going_mm', 'Going', 'mm');
  fNum('rise_mm', 'Rise', 'mm');
  fItem('tread_material_ref', 'Tread material', null);
  fText('riser_treatment', 'Riser treatment');
  fSel('nosing_detail', 'Nosing detail', ['bullnose', 'square', 'integral', 'stair-nosing-strip', 'contrast-strip']);
  fSel('stringer_type', 'Stringer type', ['closed', 'open', 'central', 'twin']);
  cat('stair', 'Stair', 'stairs', 'ea',
    ['stair_type', 'going_mm', 'rise_mm', 'width', 'tread_material_ref', 'riser_treatment', 'nosing_detail', 'stringer_type', 'balustrade_ref', 'handrail_ref']);

  // Ramp
  fSel('ramp_gradient', 'Gradient', ['1:14', '1:20', 'custom']);
  fText('surface', 'Surface');
  fNum('landing_count', 'Landing count');
  fBool('handrail_both_sides', 'Handrail both sides');
  cat('ramp', 'Ramp', 'stairs', 'm',
    ['ramp_gradient', 'width', 'surface', 'landing_count', 'handrail_both_sides']);

  // Handrail
  fSel('handrail_profile', 'Profile', ['round', 'rectangular', 'oval', 'square', 'custom']);
  fNum('handrail_diameter_mm', 'Diameter', 'mm');
  fSel('handrail_mount', 'Mount type', ['wall', 'post', 'top-mount', 'side-mount']);
  fSel('handrail_returns', 'Returns', ['full', 'partial', 'none']);
  cat('handrail', 'Handrail', 'stairs', 'lm',
    ['handrail_profile', 'material', 'handrail_diameter_mm', 'height', 'handrail_mount', 'handrail_returns']);

  // Balustrade
  fSel('balustrade_type', 'Type', ['glass-infill','vertical-pickets','horizontal-rails','mesh','perforated-panel','solid-panel','wire-balustrade','post-and-rail']);
  fText('infill_material', 'Infill material');
  fNum('post_spacing_mm', 'Post spacing', 'mm');
  fText('top_rail', 'Top rail');
  fText('base_fixing', 'Base fixing');
  cat('balustrade', 'Balustrade', 'stairs', 'lm',
    ['balustrade_type', 'infill_material', 'height', 'post_spacing_mm', 'top_rail', 'base_fixing']);

  // Barrier
  fSel('barrier_type', 'Type', ['pedestrian', 'bollard', 'cable', 'vehicle']);
  fText('loading', 'Loading');
  cat('barrier', 'Barrier', 'stairs', 'lm',
    ['barrier_type', 'material', 'height', 'loading']);

  // Guardrail
  fSel('guardrail_type', 'Type', ['void-edge', 'balcony', 'roof-edge', 'plant']);
  cat('guardrail', 'Guardrail', 'stairs', 'lm',
    ['guardrail_type', 'material', 'height', 'loading']);

  // =============================================================================
  // GROUP 11 — Lighting (11)
  // =============================================================================
  fNum('lumens', 'Lumens');
  fNum('colour_temperature_k', 'Colour temperature', 'K');
  fNum('cri', 'CRI');
  fNum('wattage_w', 'Wattage', 'W');
  fBool('dimmable', 'Dimmable');
  fSel('control_protocol', 'Control protocol', ['switch','0-10V','DALI','Dynalite','KNX','DMX','Casambi','Bluetooth','Zigbee','Wi-Fi','push']);
  fText('housing_material', 'Housing material');
  // Group fields are the lighting fundamentals every category honours. The
  // luminaire-specific payload (lumens/CCT/CRI/wattage/IP/dimmable/control
  // protocol/housing) is spread per-category via LUMINAIRE_FIELDS so that
  // emergency lights, exit signs, and lighting controls don't inherit fields
  // that don't apply to them.
  group('lighting', 'Lighting', ['brand', 'model', 'finish']);

  const LUMINAIRE_FIELDS = ['lumens', 'colour_temperature_k', 'cri', 'wattage_w', 'IP_rating', 'dimmable', 'control_protocol', 'housing_material'];

  cat('light', 'Light', 'lighting', 'ea', LUMINAIRE_FIELDS.slice(), { aliases: ['luminaire'] });

  fNum('beam_angle_deg', 'Beam angle', 'deg');
  fSel('ic_rating', 'IC rating', ['IC', 'IC-F', 'non-IC']);
  fNum('cutout_diameter_mm', 'Cutout diameter', 'mm');
  fBool('adjustable', 'Adjustable');
  fText('trim_finish', 'Trim finish');
  cat('downlight', 'Downlight', 'lighting', 'ea',
    [...LUMINAIRE_FIELDS, 'beam_angle_deg', 'ic_rating', 'cutout_diameter_mm', 'adjustable', 'trim_finish']);

  fNum('drop_mm', 'Drop', 'mm');
  fNum('cord_length_mm', 'Cord length', 'mm');
  fNum('canopy_diameter_mm', 'Canopy diameter', 'mm');
  fText('canopy_finish', 'Canopy finish');
  fText('shade_material', 'Shade material');
  fNum('diameter_mm', 'Diameter', 'mm');
  cat('pendant', 'Pendant', 'lighting', 'ea',
    [...LUMINAIRE_FIELDS, 'diameter_mm', 'drop_mm', 'cord_length_mm', 'canopy_diameter_mm', 'canopy_finish', 'shade_material']);

  fSel('wall_light_mount', 'Mount type', ['surface', 'recessed', 'semi-recessed']);
  fNum('projection_mm', 'Projection', 'mm');
  fSel('uplight_downlight', 'Uplight/downlight', ['up', 'down', 'both', 'side']);
  cat('wall_light', 'Wall light', 'lighting', 'ea',
    [...LUMINAIRE_FIELDS, 'wall_light_mount', 'projection_mm', 'uplight_downlight'], { aliases: ['sconce'] });

  fSel('linear_profile', 'Profile', ['surface', 'recessed', 'suspended', 'batten', 'plaster-in']);
  fText('joining_method', 'Joining method');
  fSel('linear_diffuser', 'Diffuser', ['opal', 'prismatic', 'frosted', 'clear']);
  fText('led_strip_density', 'LED strip density');
  cat('linear_light', 'Linear light', 'lighting', 'lm',
    [...LUMINAIRE_FIELDS, 'length', 'linear_profile', 'joining_method', 'linear_diffuser', 'led_strip_density'],
    { aliases: ['LED strip', 'strip lighting', 'batten'] });

  fSel('track_compat', 'Track compatibility', ['single-circuit', '3-circuit', '48V', 'mag-track']);
  fNum('head_count', 'Head count');
  fText('track_finish', 'Track finish');
  cat('track_light', 'Track light', 'lighting', 'ea',
    [...LUMINAIRE_FIELDS, 'track_compat', 'head_count', 'adjustable', 'track_finish']);

  fSel('step_light_mount', 'Mount type', ['recessed', 'surface']);
  fSel('step_projection', 'Projection pattern', ['down', 'side', 'full']);
  cat('step_light', 'Step light', 'lighting', 'ea',
    [...LUMINAIRE_FIELDS, 'step_light_mount', 'IK_rating', 'step_projection']);

  fSel('bollard_projection', 'Projection pattern', ['360', 'asymmetric', 'downlight']);
  fBool('vandal_resistant', 'Vandal resistant');
  cat('bollard_light', 'Bollard light', 'lighting', 'ea',
    [...LUMINAIRE_FIELDS, 'height', 'bollard_projection', 'IK_rating', 'vandal_resistant']);

  fSel('emergency_type', 'Type', ['maintained', 'non-maintained', 'sustained']);
  fSel('battery_type', 'Battery type', ['NiCd', 'Li-Ion', 'NiMH']);
  fNum('runtime_min', 'Runtime', 'min');
  fBool('self_test', 'Self-test');
  cat('emergency_light', 'Emergency light', 'lighting', 'ea',
    ['emergency_type', 'battery_type', 'runtime_min', 'self_test']);

  fSel('exit_pictogram', 'Pictogram compliance', ['AS-2293', 'EN-1838']);
  fBool('running_man', 'Running man');
  fSel('exit_maintained', 'Maintained / non-maintained', ['maintained', 'non-maintained']);
  fNum('viewing_distance_m', 'Viewing distance', 'm');
  fBool('double_sided', 'Double sided');
  cat('exit_sign', 'Exit sign', 'lighting', 'ea',
    ['exit_pictogram', 'running_man', 'exit_maintained', 'viewing_distance_m', 'double_sided']);

  fSel('lighting_control_proto', 'Protocol', ['0-10V', 'DALI', 'Dynalite', 'KNX', 'DMX', 'Casambi', 'Zigbee', 'Wi-Fi']);
  fSel('lighting_control_kind', 'Type', ['dimmer', 'switch', 'sensor', 'scene-controller', 'gateway']);
  fNum('max_load_w', 'Max load', 'W');
  fNum('scenes_supported', 'Scenes supported');
  fSel('lighting_control_ui', 'UI', ['keypad', 'app', 'voice', 'push-button']);
  cat('lighting_control', 'Lighting control', 'lighting', 'ea',
    ['lighting_control_proto', 'lighting_control_kind', 'max_load_w', 'scenes_supported', 'lighting_control_ui'],
    { aliases: ['dimmer', 'scene controller', 'gateway'] });

  // =============================================================================
  // GROUP 12 — Electrical, data & AV (16)
  // =============================================================================
  fSel('location_zone', 'Location zone', ['dry', 'damp', 'wet']);
  // Brand/model are universal. Finish, IP rating, and location zone only fit
  // a subset (wall plates, outdoor gear, wet-area hardware). Pushed down so
  // switchboards, server racks, AV equipment etc. don't inherit a meaningless
  // "Finish" or "Location zone" field.
  group('electrical', 'Electrical, data & AV', ['brand', 'model']);

  fSel('switch_gangs', 'Gangs', ['1', '2', '3', '4', '5', '6']);
  fSel('switch_function', 'Function', ['on-off', 'dimmer', 'fan', 'motorised', 'intermediate']);
  fText('plate_material', 'Plate material');
  cat('switch', 'Switch', 'electrical', 'ea',
    ['switch_gangs', 'switch_function', 'finish', 'location_zone', 'plate_material']);

  fSel('outlet_gangs', 'Gangs', ['single', 'double', 'triple', 'quad']);
  fNum('usb_count', 'USB count');
  fSel('usb_type', 'USB type', ['A', 'C', 'A+C', 'none']);
  fBool('rcd', 'RCD');
  fText('earth_leakage_rating', 'Earth leakage rating');
  cat('power_outlet', 'Power outlet', 'electrical', 'ea',
    ['outlet_gangs', 'finish', 'location_zone', 'usb_count', 'usb_type', 'rcd', 'earth_leakage_rating'],
    { aliases: ['GPO', 'power point', 'socket'] });

  fSel('data_outlet_type', 'Type', ['Cat6', 'Cat6A', 'Cat7', 'Cat8', 'fibre-OM3', 'fibre-OM4']);
  fNum('port_count', 'Port count');
  fText('termination', 'Termination');
  cat('data_outlet', 'Data outlet', 'electrical', 'ea',
    ['data_outlet_type', 'port_count', 'finish', 'location_zone', 'termination']);

  fMSel('floor_box_contents', 'Contents', ['power', 'data', 'AV', 'USB', 'HDMI']);
  fSel('floor_box_access', 'Access', ['hinged', 'slide-out', 'removable']);
  cat('floor_box', 'Floor box', 'electrical', 'ea',
    ['size', 'floor_box_contents', 'finish', 'IP_rating', 'location_zone', 'floor_box_access']);

  fNum('termination_count', 'Termination count');
  fSel('jb_location', 'Location', ['ceiling', 'wall', 'floor', 'external']);
  cat('junction_box', 'Junction box', 'electrical', 'ea',
    ['size', 'IP_rating', 'termination_count', 'jb_location']);

  fSel('switchboard_type', 'Type', ['distribution', 'main', 'sub', 'meter']);
  fNum('capacity_a', 'Capacity', 'A');
  fSel('phases', 'Phases', ['single', 'three']);
  fNum('pole_count', 'Pole count');
  cat('switchboard', 'Switchboard', 'electrical', 'ea',
    ['switchboard_type', 'capacity_a', 'phases', 'pole_count', 'IP_rating']);

  fSel('switchgear_type', 'Type', ['MCB', 'RCD', 'RCBO', 'contactor', 'isolator', 'surge-protector']);
  fText('rating', 'Rating');
  fSel('poles', 'Poles', ['1', '2', '3', '4']);
  cat('switchgear', 'Switchgear', 'electrical', 'ea',
    ['switchgear_type', 'rating', 'poles']);

  fSel('ev_charger_type', 'Type', ['AC-Type-2', 'DC-CCS', 'DC-CHAdeMO']);
  fNum('ev_power_kw', 'Power', 'kW');
  fNum('ev_cable_length_m', 'Cable length', 'm');
  fSel('ev_auth', 'Auth', ['app', 'RFID', 'plug-and-charge']);
  cat('ev_charger', 'EV charger', 'electrical', 'ea',
    ['ev_charger_type', 'ev_power_kw', 'ev_cable_length_m', 'ev_auth', 'IP_rating']);

  fSel('sensor_type', 'Type', ['motion', 'occupancy', 'daylight', 'temperature', 'humidity', 'CO2', 'smoke', 'VOC']);
  fText('range_text', 'Range');
  fText('trigger_logic', 'Trigger logic');
  cat('sensor', 'Sensor', 'electrical', 'ea',
    ['sensor_type', 'range_text', 'trigger_logic', 'IP_rating']);

  fSel('access_control_type', 'Type', ['card-reader','keypad','biometric','intercom-integrated','magnetic-lock','electric-strike','exit-button']);
  fSel('access_control_proto', 'Protocol', ['HID-iCLASS', 'MIFARE', 'DESFire', 'Bluetooth', 'NFC']);
  fText('power_text', 'Power');
  fBool('monitoring', 'Monitoring');
  cat('access_control', 'Access control', 'electrical', 'ea',
    ['access_control_type', 'access_control_proto', 'power_text', 'monitoring']);

  fSel('intercom_type', 'Type', ['audio', 'video', 'IP', 'GSM']);
  fNum('master_count', 'Master count');
  fNum('station_count', 'Station count');
  fBool('door_release_integrated', 'Door release integrated');
  cat('intercom', 'Intercom', 'electrical', 'ea',
    ['intercom_type', 'master_count', 'station_count', 'door_release_integrated', 'finish']);

  fSel('av_type', 'Type', ['amplifier', 'processor', 'matrix', 'encoder', 'decoder', 'microphone', 'mixer']);
  fNum('input_count', 'Input count');
  fNum('output_count', 'Output count');
  fText('format_av', 'Format');
  fText('brand_protocol', 'Brand protocol');
  cat('av_equipment', 'AV equipment', 'electrical', 'ea',
    ['av_type', 'input_count', 'output_count', 'format_av', 'brand_protocol']);

  fSel('speaker_type', 'Type', ['ceiling', 'wall', 'surface', 'in-wall', 'pendant', 'subwoofer']);
  fText('impedance', 'Impedance');
  fText('frequency_response', 'Frequency response');
  cat('speaker', 'Speaker', 'electrical', 'ea',
    ['speaker_type', 'power_w', 'impedance', 'frequency_response', 'IP_rating']);

  fSel('display_type', 'Type', ['TV', 'monitor', 'video-wall', 'projector', 'kiosk']);
  fNum('display_size_inch', 'Size', 'inch');
  fText('resolution', 'Resolution');
  fNum('brightness_nits', 'Brightness', 'nits');
  fText('mount_text', 'Mount');
  cat('display', 'Display', 'electrical', 'ea',
    ['display_type', 'display_size_inch', 'resolution', 'brightness_nits', 'mount_text', 'finish'],
    { aliases: ['monitor', 'screen', 'TV'] });

  fNum('size_u', 'Size', 'U');
  fSel('rack_width', 'Width', ['19"', '23"']);
  fSel('rack_cooling', 'Cooling', ['passive', 'active', 'in-rack']);
  fText('power_distribution', 'Power distribution');
  cat('server_rack', 'Server rack', 'electrical', 'ea',
    ['size_u', 'rack_width', 'depth', 'rack_cooling', 'power_distribution']);

  fSel('cable_tray_type', 'Type', ['ladder', 'perforated', 'basket', 'solid-bottom']);
  fSel('cable_tray_material', 'Material', ['galvanised', 'stainless', 'fibreglass']);
  cat('cable_tray', 'Cable tray', 'electrical', 'm',
    ['cable_tray_type', 'width', 'depth', 'cable_tray_material', 'loading']);

  // =============================================================================
  // GROUP 13 — Mechanical (15)
  // =============================================================================
  fNum('capacity_kw', 'Capacity', 'kW');
  fText('refrigerant', 'Refrigerant');
  fSel('controls_protocol', 'Controls protocol', ['BMS', 'standalone', 'wireless', 'BACnet', 'Modbus', 'KNX']);
  fNum('noise_level_db', 'Noise level', 'dB');
  // Brand and model are universal. Capacity, refrigerant, controls protocol,
  // and noise level only apply to active equipment — pushed down so passive
  // components (diffuser, grille, register, ductwork) don't inherit them.
  group('mechanical', 'Mechanical', ['brand', 'model']);

  fSel('ac_indoor_type', 'Type', ['ducted','cassette','wall-mounted','floor-mounted','ceiling-suspended','multi-split-head']);
  fNum('airflow_l_s', 'Airflow', 'l/s');
  fNum('static_pressure_pa', 'Static pressure', 'Pa');
  cat('ac_indoor', 'AC indoor', 'mechanical', 'ea',
    ['ac_indoor_type', 'capacity_kw', 'refrigerant', 'controls_protocol', 'airflow_l_s', 'noise_level_db', 'static_pressure_pa']);

  fSel('ac_outdoor_type', 'Type', ['split', 'multi-split', 'VRF', 'chiller', 'packaged', 'cassette']);
  fNum('cop', 'COP');
  fNum('eer', 'EER');
  cat('ac_outdoor', 'AC outdoor', 'mechanical', 'ea',
    ['ac_outdoor_type', 'capacity_kw', 'refrigerant', 'controls_protocol', 'cop', 'eer', 'noise_level_db']);

  fSel('diffuser_type', 'Type', ['linear-bar', 'linear-slot', 'swirl', 'perforated', 'jet', 'displacement', 'square-egg-crate', 'round']);
  fText('throw_pattern', 'Throw pattern');
  fNum('flow_rate_l_s', 'Flow rate', 'l/s');
  cat('diffuser', 'Diffuser', 'mechanical', 'ea',
    ['diffuser_type', 'size', 'throw_pattern', 'flow_rate_l_s', 'finish']);

  fSel('grille_type', 'Type', ['return', 'exhaust', 'transfer', 'weather', 'eggcrate']);
  fNum('free_area_pct', 'Free area', '%');
  cat('grille', 'Grille', 'mechanical', 'ea',
    ['grille_type', 'size', 'free_area_pct', 'finish']);

  fSel('register_type', 'Type', ['supply', 'return']);
  fBool('damper_yn', 'Damper');
  cat('register', 'Register', 'mechanical', 'ea',
    ['register_type', 'size', 'damper_yn', 'finish']);

  fSel('exhaust_fan_type', 'Type', ['ceiling', 'wall', 'in-line', 'roof-mounted']);
  fText('static_pressure', 'Static pressure');
  fBool('ducted', 'Ducted');
  cat('exhaust_fan', 'Exhaust fan', 'mechanical', 'ea',
    ['exhaust_fan_type', 'airflow_l_s', 'static_pressure', 'controls_protocol', 'noise_level_db', 'ducted']);

  fSel('rangehood_type', 'Type', ['undermount', 'canopy', 'integrated', 'downdraft', 'recirculating', 'ducted']);
  fBool('light_integrated', 'Light integrated');
  cat('rangehood', 'Rangehood', 'mechanical', 'ea',
    ['rangehood_type', 'airflow_l_s', 'width', 'noise_level_db', 'light_integrated']);

  fSel('ductwork_material', 'Material', ['galvanised', 'stainless', 'flexible', 'fibreglass', 'fabric']);
  fText('diameter_or_dimensions', 'Diameter / dimensions');
  fNum('insulation_thickness_mm', 'Insulation thickness', 'mm');
  fText('pressure_class', 'Pressure class');
  cat('ductwork', 'Ductwork', 'mechanical', 'm',
    ['ductwork_material', 'diameter_or_dimensions', 'insulation_thickness_mm', 'pressure_class']);

  fSel('damper_type', 'Type', ['volume-control', 'fire', 'smoke', 'fire-and-smoke', 'motorised', 'gravity', 'backdraft']);
  fText('damper_operation', 'Operation');
  cat('damper', 'Damper', 'mechanical', 'ea',
    ['damper_type', 'size', 'damper_operation', 'controls_protocol', 'frl']);

  fSel('hyd_rad_type', 'Type', ['panel', 'column', 'towel', 'designer']);
  fNum('output_w', 'Output', 'W');
  cat('hydronic_radiator', 'Hydronic radiator', 'mechanical', 'ea',
    ['hyd_rad_type', 'capacity_kw', 'output_w', 'dimensions', 'connection_type', 'finish']);

  fSel('ufh_system', 'System', ['hydronic', 'electric-cable', 'electric-mat']);
  fNum('output_w_m2', 'Output', 'W/m²');
  fText('controls', 'Controls');
  cat('underfloor_heating', 'Underfloor heating', 'mechanical', 'm²',
    ['ufh_system', 'output_w_m2', 'controls', 'controls_protocol']);

  fSel('hvac_type', 'Type', ['AHU', 'FCU', 'VAV', 'CAV', 'ERV', 'HRV', 'chiller', 'boiler', 'cooling-tower']);
  fText('airflow', 'Airflow');
  fText('efficiency_rating', 'Efficiency rating');
  cat('hvac_equipment', 'HVAC equipment', 'mechanical', 'ea',
    ['hvac_type', 'capacity', 'capacity_kw', 'refrigerant', 'controls_protocol', 'noise_level_db', 'static_pressure', 'airflow', 'efficiency_rating'],
    { aliases: ['FCU', 'AHU', 'fan coil unit', 'air handling unit'] });

  fSel('cool_room_type', 'Type', ['cool-room', 'freezer', 'blast-chiller', 'walk-in']);
  fText('internal_size', 'Internal size');
  fNum('panel_thickness_mm', 'Panel thickness', 'mm');
  fText('door_size', 'Door size');
  fText('refrigeration_unit', 'Refrigeration unit');
  cat('cool_room', 'Cool room', 'mechanical', 'ea',
    ['cool_room_type', 'internal_size', 'panel_thickness_mm', 'door_size', 'refrigeration_unit', 'capacity_kw', 'refrigerant', 'controls_protocol']);

  fSel('fume_cupboard_type', 'Type', ['ducted', 'recirculating', 'walk-in']);
  fText('sash_type', 'Sash type');
  fText('face_velocity', 'Face velocity');
  fText('containment_class', 'Containment class');
  cat('fume_cupboard', 'Fume cupboard', 'mechanical', 'ea',
    ['fume_cupboard_type', 'width', 'sash_type', 'face_velocity', 'containment_class', 'controls_protocol']);

  fSel('medical_gas_type', 'Type', ['oxygen', 'nitrous-oxide', 'medical-air', 'vacuum', 'scavenging', 'CO2', 'nitrogen']);
  fSel('medical_gas_outlet_type', 'Outlet type', ['BS-5682', 'AS-2896-DISS', 'AGSS']);
  fText('pressure_class_text', 'Pressure class');
  fBool('alarm_integrated', 'Alarm integrated');
  cat('medical_gas', 'Medical gas', 'mechanical', 'ea',
    ['medical_gas_type', 'medical_gas_outlet_type', 'pressure_class_text', 'alarm_integrated']);

  // =============================================================================
  // GROUP 14 — Hydraulic (5)
  // =============================================================================
  fText('pressure_rating', 'Pressure rating');
  fText('flow_rate', 'Flow rate');
  fBool('watermark', 'WaterMark');
  group('hydraulic', 'Hydraulic',
    ['brand', 'model', 'pressure_rating', 'flow_rate', 'watermark', 'location']);

  fSel('hwu_type', 'Type', ['gas-storage', 'gas-instant', 'electric-storage', 'electric-instant', 'heat-pump', 'solar-thermal', 'solar-with-boost']);
  fNum('efficiency_star', 'Efficiency star');
  fText('recovery_rate', 'Recovery rate');
  cat('hot_water_unit', 'Hot water unit', 'hydraulic', 'ea',
    ['hwu_type', 'capacity_l', 'efficiency_star', 'recovery_rate']);

  fSel('water_meter_type', 'Type', ['domestic', 'sub-meter', 'fire', 'irrigation', 'recycled']);
  fBool('pulse_output', 'Pulse output');
  cat('water_meter', 'Water meter', 'hydraulic', 'ea',
    ['water_meter_type', 'size', 'pulse_output']);

  fNum('inlet_pressure_max_kpa', 'Inlet pressure max', 'kPa');
  fNum('outlet_pressure_set_kpa', 'Outlet pressure set', 'kPa');
  cat('pressure_reducing_valve', 'Pressure reducing valve', 'hydraulic', 'ea',
    ['inlet_pressure_max_kpa', 'outlet_pressure_set_kpa', 'size'],
    { aliases: ['PRV'] });

  fSel('backflow_type', 'Type', ['RPZ', 'DCV', 'atmospheric-vacuum-breaker', 'pressure-vacuum-breaker']);
  fSel('hazard_class', 'Hazard class', ['high', 'medium', 'low']);
  cat('backflow_preventer', 'Backflow preventer', 'hydraulic', 'ea',
    ['backflow_type', 'size', 'hazard_class'],
    { aliases: ['RPZ'] });

  fSel('pump_application', 'Application', ['irrigation','domestic-water','hot-water-circ','sump','fire-booster','swimming-pool','rainwater-harvest','transfer']);
  fSel('pump_type', 'Type', ['centrifugal', 'submersible', 'multistage', 'jet']);
  fNum('head_m', 'Head', 'm');
  cat('pump', 'Pump', 'hydraulic', 'ea',
    ['pump_application', 'pump_type', 'flow_rate', 'head_m', 'power_w']);

  // =============================================================================
  // GROUP 15 — Fire & life safety (12)
  // =============================================================================
  fSel('fire_addressable', 'Addressable', ['addressable', 'conventional', 'hybrid']);
  // Addressable applies only to detectors and alarm panels (the digitally-
  // addressed signalling network). Hose reels, extinguishers, blankets,
  // shutters, dampers, collars don't have addressability — pushed down.
  group('fire', 'Fire & life safety', ['brand', 'model', 'approval_standard']);

  fSel('smoke_det_type', 'Detection type', ['photoelectric', 'ionisation', 'dual', 'aspirating']);
  fNum('coverage_radius_m', 'Coverage radius', 'm');
  fSel('smoke_det_power', 'Power', ['hardwired', 'battery', 'mains-with-battery']);
  cat('smoke_detector', 'Smoke detector', 'fire', 'ea',
    ['smoke_det_type', 'coverage_radius_m', 'smoke_det_power', 'fire_addressable']);

  fSel('heat_det_type', 'Detection type', ['rate-of-rise', 'fixed-temperature', 'combined']);
  fNum('temperature_threshold_c', 'Temperature threshold', '°C');
  cat('heat_detector', 'Heat detector', 'fire', 'ea',
    ['heat_det_type', 'temperature_threshold_c', 'fire_addressable']);

  fSel('sprinkler_type', 'Type', ['pendant', 'upright', 'sidewall', 'concealed', 'in-rack', 'ESFR', 'residential']);
  fNum('k_factor', 'K-factor');
  fSel('sprinkler_response', 'Response', ['standard', 'quick', 'fast']);
  fText('cover_plate_finish', 'Cover plate finish');
  cat('sprinkler_head', 'Sprinkler head', 'fire', 'ea',
    ['sprinkler_type', 'k_factor', 'sprinkler_response', 'finish', 'cover_plate_finish']);

  fNum('hose_length_m', 'Hose length', 'm');
  fSel('hose_diameter', 'Hose diameter', ['19mm', '25mm']);
  fText('cabinet_finish', 'Cabinet finish');
  cat('hose_reel', 'Hose reel', 'fire', 'ea',
    ['hose_length_m', 'hose_diameter', 'cabinet_finish', 'IP_rating']);

  fSel('hydrant_type', 'Type', ['landing-valve', 'fire-plug', 'booster', 'monitor']);
  fText('pressure', 'Pressure');
  fSel('hydrant_connection', 'Connection', ['Storz', 'BIC']);
  cat('hydrant', 'Hydrant', 'fire', 'ea',
    ['hydrant_type', 'pressure', 'hydrant_connection']);

  fSel('extinguisher_type', 'Type', ['water', 'foam', 'dry-powder', 'CO2', 'wet-chemical', 'clean-agent']);
  fNum('extinguisher_size_kg', 'Size', 'kg');
  fMSel('extinguisher_class', 'Class rating', ['A', 'B', 'C', 'D', 'E', 'F']);
  cat('extinguisher', 'Extinguisher', 'fire', 'ea',
    ['extinguisher_type', 'extinguisher_size_kg', 'extinguisher_class']);

  cat('fire_blanket', 'Fire blanket', 'fire', 'ea',
    ['size', 'housing_material']);

  fNum('zone_count', 'Zone count');
  fSel('fip_type', 'Type', ['addressable', 'conventional', 'hybrid', 'voice-evac']);
  fText('network_protocol', 'Network protocol');
  cat('fire_indicator_panel', 'Fire indicator panel', 'fire', 'ea',
    ['zone_count', 'fip_type', 'network_protocol', 'fire_addressable'],
    { aliases: ['FIP'] });

  fSel('ewis_type', 'Type', ['speaker', 'strobe', 'combined', 'beacon']);
  fText('pattern_text', 'Pattern');
  cat('ewis', 'EWIS / occupant warning', 'fire', 'ea',
    ['ewis_type', 'power_w', 'pattern_text', 'IP_rating', 'fire_addressable'],
    { aliases: ['EWIS'] });

  fSel('fire_shutter_op', 'Operation', ['manual', 'motorised', 'fail-safe']);
  fText('cyclic_test_compliance', 'Cyclic test compliance');
  cat('fire_shutter', 'Fire shutter', 'fire', 'ea',
    ['frl', 'width', 'height', 'fire_shutter_op', 'cyclic_test_compliance']);

  fSel('fire_damper_op', 'Operation', ['thermal', 'electric', 'smoke-actuated']);
  cat('fire_damper', 'Fire damper', 'fire', 'ea',
    ['frl', 'size', 'fire_damper_op']);

  fText('pipe_size', 'Pipe size');
  fSel('pipe_material', 'Pipe material', ['PVC', 'copper', 'steel', 'multilayer']);
  cat('fire_collar', 'Fire collar', 'fire', 'ea',
    ['pipe_size', 'pipe_material', 'frl']);

  // =============================================================================
  // GROUP 16 — Vertical transport (6)
  // =============================================================================
  fNum('speed_m_s', 'Speed', 'm/s');
  fSel('drive_type', 'Drive type', ['traction', 'MRL', 'hydraulic', 'geared', 'gearless']);
  group('vertical_transport', 'Vertical transport',
    ['brand', 'capacity_kg', 'capacity_persons', 'speed_m_s', 'drive_type']);

  fNum('stops', 'Stops');
  fText('serving_floors', 'Serving floors');
  fItem('car_finish_ref', 'Car finish', null);
  fText('door_finish', 'Door finish');
  fText('ride_quality_rating', 'Ride quality rating');
  fBool('accessibility_compliance', 'Accessibility compliance');
  cat('passenger_lift', 'Passenger lift', 'vertical_transport', 'ea',
    ['size', 'stops', 'serving_floors', 'car_finish_ref', 'door_finish', 'ride_quality_rating', 'accessibility_compliance']);

  fSel('goods_lift_lining', 'Car lining', ['stainless', 'galvanised', 'plywood', 'painted-steel']);
  cat('goods_lift', 'Goods lift', 'vertical_transport', 'ea',
    ['size', 'capacity_kg', 'door_size', 'goods_lift_lining']);

  fSel('platform_lift_type', 'Type', ['vertical', 'inclined', 'scissor']);
  fNum('max_travel_mm', 'Max travel', 'mm');
  fSel('platform_enclosure', 'Enclosure', ['open', 'semi-enclosed', 'full']);
  cat('platform_lift', 'Platform lift', 'vertical_transport', 'ea',
    ['platform_lift_type', 'capacity_kg', 'max_travel_mm', 'platform_enclosure']);

  fNum('vertical_rise_mm', 'Vertical rise', 'mm');
  fSel('escalator_angle', 'Angle', ['30', '35']);
  fText('step_finish', 'Step finish');
  fSel('escalator_balustrade', 'Balustrade', ['glass', 'panel']);
  cat('escalator', 'Escalator', 'vertical_transport', 'ea',
    ['vertical_rise_mm', 'width', 'escalator_angle', 'step_finish', 'escalator_balustrade']);

  fNum('travelator_length_m', 'Length', 'm');
  fSel('travelator_slope', 'Slope', ['0', '6', '10', '12']);
  fNum('belt_speed_m_s', 'Belt speed', 'm/s');
  cat('travelator', 'Travelator', 'vertical_transport', 'ea',
    ['travelator_length_m', 'width', 'travelator_slope', 'belt_speed_m_s']);

  fSel('dumbwaiter_door', 'Door type', ['bi-parting', 'slide-up', 'fold-up']);
  cat('dumbwaiter', 'Dumbwaiter', 'vertical_transport', 'ea',
    ['size', 'capacity_kg', 'stops', 'dumbwaiter_door']);

  // =============================================================================
  // GROUP 17 — Accessibility & signage (9)
  // =============================================================================
  fBool('as_1428_compliance', 'AS-1428 compliance');
  fBool('braille_required', 'Braille required');
  // Braille only applies to text-bearing signs (tactile_sign, room_id_sign,
  // statutory_sign, braille_sign) — pushed down. The other group fields
  // (AS-1428 compliance, finish, mounting) are universal enough to keep.
  group('accessibility', 'Accessibility & signage',
    ['as_1428_compliance', 'finish', 'mounting']);

  fSel('tgsi_type', 'Type', ['directional', 'hazard']);
  fSel('tgsi_format', 'Format', ['tile', 'individual-stud', 'applied']);
  fNum('colour_contrast_lrv', 'Colour contrast LRV');
  cat('tgsi', 'TGSI', 'accessibility', 'm²',
    ['tgsi_type', 'tgsi_format', 'colour_contrast_lrv'],
    { aliases: ['tactile ground surface indicator', 'hazard tile'] });

  fSel('grab_rail_diameter', 'Diameter', ['32', '38', '50']);
  fText('loading_compliance', 'Loading compliance');
  cat('grab_rail', 'Grab rail', 'accessibility', 'ea',
    ['grab_rail_diameter', 'length', 'finish', 'mounting', 'loading_compliance']);

  fNum('raised_text_height_mm', 'Raised text height', 'mm');
  fNum('luminance_contrast', 'Luminance contrast');
  cat('tactile_sign', 'Tactile sign', 'accessibility', 'ea',
    ['size', 'raised_text_height_mm', 'braille_required', 'luminance_contrast', 'finish']);

  fSel('braille_format', 'Braille format', ['grade-1', 'grade-2']);
  fNum('mount_height_mm', 'Mount height', 'mm');
  fText('text_text', 'Text');
  cat('braille_sign', 'Braille sign', 'accessibility', 'ea',
    ['text_text', 'braille_required', 'braille_format', 'size', 'finish', 'mount_height_mm']);

  fSel('hearing_loop_type', 'Type', ['room-loop', 'counter-loop', 'perimeter']);
  fText('coverage_area', 'Coverage area');
  fText('amplifier', 'Amplifier');
  fBool('signage_required', 'Signage required');
  cat('hearing_loop', 'Hearing loop', 'accessibility', 'ea',
    ['hearing_loop_type', 'coverage_area', 'amplifier', 'signage_required']);

  fSel('wayfinding_type', 'Type', ['directional', 'identification', 'regulatory', 'informational']);
  fText('materials', 'Materials');
  fSel('wayfinding_illumination', 'Illumination', ['none', 'internal', 'edge-lit', 'halo']);
  cat('wayfinding_sign', 'Wayfinding sign', 'accessibility', 'ea',
    ['wayfinding_type', 'size', 'materials', 'wayfinding_illumination']);

  fSel('statutory_compliance', 'Code compliance', ['BCA', 'AS-1319', 'custom']);
  fText('symbol', 'Symbol');
  fText('luminance', 'Luminance');
  cat('statutory_sign', 'Statutory sign', 'accessibility', 'ea',
    ['statutory_compliance', 'text_text', 'braille_required', 'symbol', 'size', 'luminance', 'materials']);

  fBool('pictogram', 'Pictogram');
  cat('room_id_sign', 'Room ID sign', 'accessibility', 'ea',
    ['text_text', 'braille_required', 'pictogram', 'finish', 'mount_height_mm']);

  fSel('manifestation_pattern', 'Pattern', ['dots', 'lines', 'custom-graphic', 'frosted-band', 'full-frost']);
  fSel('manifestation_application', 'Application', ['applied-film', 'etched', 'sandblasted', 'ceramic-frit']);
  fNum('band_height_mm', 'Band height', 'mm');
  fBool('contrast_compliance', 'Contrast compliance');
  cat('glazing_manifestation', 'Glazing manifestation', 'accessibility', 'm²',
    ['manifestation_pattern', 'manifestation_application', 'band_height_mm', 'contrast_compliance'],
    { aliases: ['glass decal', 'frosting', 'manifestation', 'decal'] });

  // =============================================================================
  // GROUP 18 — FF&E (12)
  // =============================================================================
  fText('designer', 'Designer');
  // FF&E members vary too widely for shared group fields (an oven and a sofa
  // share almost nothing). Group is organizational only; each category lists
  // the fields it actually needs.
  group('ffe', 'FF&E', []);

  fSel('furniture_type', 'Type', ['chair','armchair','sofa','lounge','stool','bench','ottoman','dining-table','coffee-table','side-table','desk','console','bed','daybed','custom']);
  fNum('weight_kg', 'Weight', 'kg');
  cat('furniture', 'Furniture', 'ffe', 'ea',
    ['furniture_type', 'brand', 'range', 'designer', 'dimensions', 'material', 'finish', 'upholstery_ref', 'seat_height_mm', 'weight_kg']);

  fSel('soft_furnishing_type', 'Type', ['cushion', 'throw', 'bed-linen', 'towel', 'mattress']);
  fItem('fabric_ref', 'Fabric', 'textile');
  fSel('soft_furnishing_fill', 'Fill', ['feather-down', 'foam', 'latex', 'synthetic']);
  cat('soft_furnishing', 'Soft furnishing', 'ffe', 'ea',
    ['soft_furnishing_type', 'brand', 'designer', 'size', 'fabric_ref', 'soft_furnishing_fill', 'finish']);

  fSel('curtain_type', 'Type', ['sheer', 'blockout', 'double-curtain']);
  fSel('curtain_heading', 'Heading', ['pinch-pleat', 'eyelet', 'S-fold', 'tab-top', 'ripple-fold']);
  fSel('curtain_track', 'Track or rod', ['track', 'rod', 'motorised']);
  fSel('curtain_operation', 'Operation', ['manual', 'motorised']);
  fNum('curtain_drop_mm', 'Drop', 'mm');
  cat('curtain', 'Curtain', 'ffe', 'm',
    ['curtain_type', 'fabric_ref', 'curtain_heading', 'curtain_track', 'curtain_drop_mm', 'curtain_operation']);

  fSel('blind_type', 'Type', ['roller', 'roman', 'venetian', 'vertical', 'panel-glide', 'honeycomb', 'motorised']);
  fText('fabric_or_material', 'Fabric / material');
  fSel('blind_operation', 'Operation', ['chain', 'spring', 'motorised', 'cord', 'wand']);
  fSel('blind_light_filter', 'Light filter', ['blockout', 'dim-out', 'sheer', 'light-filtering']);
  cat('blind', 'Blind', 'ffe', 'm²',
    ['blind_type', 'fabric_or_material', 'blind_operation', 'blind_light_filter']);

  fSel('rug_pile', 'Pile', ['cut', 'loop', 'hand-knotted', 'hand-tufted', 'flat-weave']);
  fSel('rug_custom', 'Custom or off-the-shelf', ['custom', 'OTS']);
  cat('rug', 'Rug', 'ffe', 'ea',
    ['brand', 'range', 'designer', 'size', 'material', 'rug_pile', 'carpet_backing', 'rug_custom']);

  fSel('art_type', 'Type', ['painting', 'print', 'photograph', 'sculpture', 'installation', 'mirror', 'mural']);
  fText('artist', 'Artist');
  fNum('year', 'Year');
  fText('medium', 'Medium');
  fText('framing', 'Framing');
  fBool('loan', 'Loan');
  cat('art', 'Art', 'ffe', 'ea',
    ['art_type', 'artist', 'year', 'medium', 'size', 'framing', 'loan']);

  fSel('workstation_type', 'Type', ['sit-stand', 'fixed-height', 'hot-desk']);
  fBool('partitions', 'Partitions');
  cat('workstation', 'Workstation', 'ffe', 'ea',
    ['workstation_type', 'brand', 'size', 'dimensions', 'finish', 'adjustable', 'cable_management', 'partitions']);

  fText('bank_size', 'Bank size');
  fSel('lock_type', 'Lock type', ['key', 'combination', 'RFID', 'master', 'padlock-hasp']);
  fBool('ventilation', 'Ventilation');
  cat('locker', 'Locker', 'ffe', 'ea',
    ['brand', 'bank_size', 'door_count', 'lock_type', 'ventilation', 'material', 'finish']);

  fSel('whiteboard_surface', 'Surface', ['porcelain', 'melamine', 'glass']);
  fBool('magnetic', 'Magnetic');
  cat('whiteboard', 'Whiteboard', 'ffe', 'ea',
    ['size', 'whiteboard_surface', 'magnetic', 'mounting']);

  fSel('pinboard_material', 'Material', ['cork', 'fabric', 'magnetic']);
  cat('pinboard', 'Pinboard', 'ffe', 'ea',
    ['size', 'pinboard_material', 'framing']);

  fSel('storage_system_type', 'Type', ['open-shelving', 'modular', 'flat-file', 'mobile', 'vertical-rotating']);
  fText('weight_capacity', 'Weight capacity');
  fText('adjustability', 'Adjustability');
  cat('storage_system', 'Storage system', 'ffe', 'ea',
    ['storage_system_type', 'brand', 'dimensions', 'finish', 'weight_capacity', 'adjustability']);

  fSel('appliance_type', 'Type', ['oven','cooktop','rangehood','dishwasher','fridge','freezer','washing-machine','dryer','microwave','coffee-machine','warming-drawer','wine-cabinet']);
  fNum('energy_star', 'Energy star');
  fSel('appliance_integration', 'Integrated or freestanding', ['integrated', 'freestanding', 'semi-integrated']);
  cat('appliance', 'Appliance', 'ffe', 'ea',
    ['appliance_type', 'brand', 'model', 'dimensions', 'energy_star', 'capacity', 'finish', 'appliance_integration']);

  // =============================================================================
  // GROUP 19 — Landscape & external works (29)
  // =============================================================================
  fBool('external_grade', 'External grade', { defaultValue: true });
  fSel('slip_rating_landscape', 'Slip rating', ['P3', 'P4', 'P5', 'R10', 'R11', 'R12', 'R13']);
  group('landscape', 'Landscape & external works',
    ['material', 'finish', 'external_grade', 'slip_rating_landscape']);

  fSel('paving_material', 'Material', ['concrete', 'granite', 'sandstone', 'bluestone', 'brick', 'porcelain', 'asphalt', 'gravel']);
  fText('jointing', 'Jointing');
  fText('sub_base_required', 'Sub-base required');
  cat('paving', 'Paving', 'landscape', 'm²',
    ['paving_material', 'format_text', 'pattern', 'jointing', 'sub_base_required']);

  fSel('decking_material', 'Material', ['hardwood', 'softwood-treated', 'composite', 'modified-timber', 'aluminium']);
  fSel('decking_fixing', 'Fixing', ['screw', 'hidden-clip', 'secret']);
  fNum('joist_spacing_mm', 'Joist spacing', 'mm');
  cat('decking', 'Decking', 'landscape', 'm²',
    ['decking_material', 'board_width_mm', 'pattern', 'decking_fixing', 'joist_spacing_mm']);

  fText('sub_structure', 'Sub-structure');
  cat('boardwalk', 'Boardwalk', 'landscape', 'm²',
    ['material', 'width', 'sub_structure', 'handrail_ref', 'slip_rating_landscape']);

  fSel('driveway_material', 'Material', ['concrete', 'asphalt', 'exposed-aggregate', 'paver', 'gravel']);
  fText('sub_base', 'Sub-base');
  fText('bordering', 'Bordering');
  cat('driveway', 'Driveway', 'landscape', 'm²',
    ['driveway_material', 'finish', 'sub_base', 'bordering']);

  fText('falls', 'Falls');
  cat('path', 'Path', 'landscape', 'm²',
    ['material', 'width', 'finish', 'edging_ref', 'falls']);

  cat('external_stair', 'External stair', 'landscape', 'ea',
    ['material', 'finish', 'rise_mm', 'going_mm', 'drainage_layer']);

  cat('external_ramp', 'External ramp', 'landscape', 'm',
    ['ramp_gradient', 'surface', 'drainage_layer', 'handrail_ref', 'landing_count']);

  fSel('kerb_profile', 'Profile', ['barrier', 'semi-mountable', 'mountable', 'dish']);
  cat('kerb', 'Kerb', 'landscape', 'lm',
    ['kerb_profile', 'material', 'height']);

  fSel('edging_material', 'Material', ['steel', 'aluminium', 'timber', 'concrete', 'stone']);
  cat('edging', 'Edging', 'landscape', 'lm',
    ['edging_material', 'height', 'finish']);

  fSel('retaining_wall_material', 'Material', ['masonry', 'concrete', 'sleeper', 'gabion', 'segmental-block', 'stone']);
  fNum('max_height_mm_rw', 'Max height', 'mm');
  fBool('structural_engineer_required', 'Structural engineer required');
  cat('retaining_wall', 'Retaining wall', 'landscape', 'm²',
    ['retaining_wall_material', 'max_height_mm_rw', 'drainage_layer', 'structural_engineer_required']);

  fSel('fence_type', 'Type', ['paling', 'capped-paling', 'slat', 'picket', 'palisade', 'mesh', 'glass', 'steel-bar', 'hedge']);
  fNum('post_centres_mm', 'Post centres', 'mm');
  fText('gate_locations', 'Gate locations');
  cat('fence', 'Fence', 'landscape', 'lm',
    ['fence_type', 'height', 'post_centres_mm', 'gate_locations']);

  fSel('gate_type', 'Type', ['pedestrian', 'vehicle', 'sliding', 'swing', 'automatic']);
  fSel('gate_operation', 'Operation', ['manual', 'motorised']);
  cat('gate', 'Gate', 'landscape', 'ea',
    ['gate_type', 'width', 'height', 'material', 'gate_operation', 'access_control_ref']);

  fSel('pergola_roof_type', 'Roof type', ['open', 'slat', 'polycarbonate', 'retractable', 'solid']);
  fText('footprint', 'Footprint');
  fNum('post_count', 'Post count');
  cat('pergola', 'Pergola', 'landscape', 'm²',
    ['material', 'pergola_roof_type', 'footprint', 'post_count']);

  fNum('uv_block_pct', 'UV block', '%');
  fNum('fixing_count', 'Fixing count');
  fText('tensioning', 'Tensioning');
  cat('shade_sail', 'Shade sail', 'landscape', 'ea',
    ['material', 'uv_block_pct', 'size', 'fixing_count', 'tensioning']);

  fText('cabinetry_material', 'Cabinetry material');
  fSel('outdoor_kitchen_fuel', 'Gas or electric', ['gas', 'electric', 'both']);
  cat('outdoor_kitchen', 'Outdoor kitchen', 'landscape', 'm²',
    ['material', 'bbq_integrated_ref', 'sink_ref', 'cabinetry_material', 'drainage_layer', 'outdoor_kitchen_fuel']);

  fSel('bbq_type', 'Type', ['built-in', 'freestanding', 'kettle', 'wood-fired', 'hibachi']);
  fSel('bbq_fuel', 'Fuel', ['gas', 'charcoal', 'electric']);
  fNum('burners', 'Burners');
  cat('bbq', 'BBQ', 'landscape', 'ea',
    ['bbq_type', 'bbq_fuel', 'burners', 'size']);

  fSel('fire_pit_type', 'Type', ['gas', 'wood-fired', 'ethanol']);
  fBool('lid', 'Lid');
  cat('fire_pit', 'Fire pit', 'landscape', 'ea',
    ['fire_pit_type', 'material', 'size', 'lid']);

  fSel('pool_type', 'Type', ['in-ground-concrete', 'fibreglass', 'vinyl-liner', 'infinity', 'lap', 'plunge', 'swim-spa']);
  fText('heating', 'Heating');
  fText('filtration', 'Filtration');
  cat('pool', 'Pool', 'landscape', 'm²',
    ['pool_type', 'interior_finish', 'size', 'heating', 'filtration']);

  fSel('spa_type', 'Type', ['portable', 'in-ground', 'swim-spa']);
  fNum('spa_capacity', 'Capacity (persons)');
  fNum('jets', 'Jets');
  cat('spa', 'Spa', 'landscape', 'ea',
    ['spa_type', 'spa_capacity', 'jets', 'heating']);

  fSel('water_feature_type', 'Type', ['pond', 'fountain', 'waterwall', 'rill', 'cascade']);
  fText('lighting_text', 'Lighting');
  cat('water_feature', 'Water feature', 'landscape', 'ea',
    ['water_feature_type', 'material', 'pump_ref', 'lighting_text']);

  fSel('outdoor_shower_type', 'Type', ['wall-mounted', 'freestanding', 'ceiling-mounted']);
  fText('floor_grate', 'Floor grate');
  cat('outdoor_shower', 'Outdoor shower', 'landscape', 'ea',
    ['outdoor_shower_type', 'finish', 'floor_grate', 'drainage_layer']);

  fSel('sport_court_type', 'Type', ['tennis', 'basketball', 'multi-purpose', 'futsal', 'netball']);
  fSel('sport_court_surface', 'Surface', ['acrylic', 'asphalt', 'synthetic-grass', 'concrete', 'hardcourt']);
  fText('linemarking', 'Linemarking');
  fText('fencing', 'Fencing');
  cat('sport_court', 'Sport court', 'landscape', 'm²',
    ['sport_court_type', 'sport_court_surface', 'linemarking', 'fencing', 'lighting_text']);

  fMSel('playground_equipment', 'Equipment type', ['combination', 'slide', 'swing', 'climber', 'balance', 'sand', 'water']);
  fSel('playground_age_range', 'Age range', ['0-2', '2-5', '5-12', '12+', 'mixed']);
  fText('safety_surface', 'Safety surface');
  fBool('perimeter_fence', 'Perimeter fence');
  cat('playground', 'Playground', 'landscape', 'm²',
    ['playground_equipment', 'playground_age_range', 'safety_surface', 'perimeter_fence']);

  fSel('outdoor_furniture_type', 'Type', ['bench', 'chair', 'table', 'lounge', 'daybed', 'sun-lounge']);
  fBool('uv_rated', 'UV rated');
  cat('outdoor_furniture', 'Outdoor furniture', 'landscape', 'ea',
    ['outdoor_furniture_type', 'material', 'finish', 'uv_rated', 'weight_kg']);

  fNum('bin_count', 'Bin count');
  fText('gate_type_text', 'Gate type');
  cat('bin_enclosure', 'Bin enclosure', 'landscape', 'ea',
    ['bin_count', 'size', 'ventilation', 'gate_type_text', 'material']);

  fSel('bike_rack_type', 'Type', ['hoop', 'vertical', 'two-tier', 'lockers']);
  fSel('bike_fixing', 'Fixing', ['surface-mount', 'in-ground']);
  cat('bike_rack', 'Bike rack', 'landscape', 'ea',
    ['bike_rack_type', 'capacity', 'material', 'bike_fixing']);

  fSel('letterbox_type', 'Type', ['standalone', 'integrated', 'multi-unit']);
  fText('mail_slot_size', 'Mail slot size');
  cat('letterbox', 'Letterbox', 'landscape', 'ea',
    ['letterbox_type', 'material', 'finish', 'mail_slot_size']);

  fSel('clothesline_type', 'Type', ['rotary', 'retractable', 'fixed']);
  cat('clothesline', 'Clothesline', 'landscape', 'ea',
    ['clothesline_type', 'capacity', 'material']);

  fSel('bollard_type', 'Type', ['fixed', 'removable', 'retractable', 'illuminated']);
  cat('bollard', 'Bollard', 'landscape', 'ea',
    ['bollard_type', 'material', 'finish', 'height', 'loading']);

  // =============================================================================
  // GROUP 20 — Planting, irrigation & drainage (20)
  // =============================================================================
  fText('climate_zone', 'Climate zone');
  fText('season_of_install', 'Season of install');
  fText('maturity_age', 'Maturity age');
  // The four group fields (supplier already a common field; climate zone,
  // season of install, maturity age) are botanical concepts. They make zero
  // sense for irrigation hardware (dripline, sprinkler, valve, controller),
  // drainage hardware (drainage_pit, sump, soakwell, water_tank), or
  // commodity products (mulch, soil, gravel). Pushed down to plants only.
  group('planting', 'Planting, irrigation & drainage', []);

  fText('species_botanical', 'Species (botanical)');
  fText('species_common', 'Species (common)');
  fNum('pot_size_l', 'Pot size', 'L');
  fNum('height_at_supply_m', 'Height at supply', 'm');
  fNum('expected_mature_height_m', 'Expected mature height', 'm');
  fNum('canopy_spread_m', 'Canopy spread', 'm');
  fBool('root_barrier_required', 'Root barrier required');
  fBool('semi_mature_purchase', 'Semi-mature purchase');
  cat('tree', 'Tree', 'planting', 'ea',
    ['species_botanical', 'species_common', 'climate_zone', 'season_of_install', 'maturity_age', 'pot_size_l', 'height_at_supply_m', 'expected_mature_height_m', 'canopy_spread_m', 'root_barrier_required', 'semi_mature_purchase']);

  fNum('spread_m', 'Spread', 'm');
  cat('shrub', 'Shrub', 'planting', 'ea',
    ['species_botanical', 'species_common', 'climate_zone', 'season_of_install', 'maturity_age', 'pot_size_l', 'height_at_supply_m', 'expected_mature_height_m', 'spread_m']);

  fText('pot_size', 'Pot size');
  fNum('plants_per_m2', 'Plants per m²');
  cat('groundcover', 'Groundcover', 'planting', 'ea',
    ['species_botanical', 'species_common', 'climate_zone', 'season_of_install', 'maturity_age', 'pot_size', 'plants_per_m2', 'spread_m']);

  fBool('trellis_required', 'Trellis required');
  fNum('expected_height_m', 'Expected height', 'm');
  cat('climber', 'Climber', 'planting', 'ea',
    ['species_botanical', 'species_common', 'climate_zone', 'season_of_install', 'maturity_age', 'pot_size', 'trellis_required', 'expected_height_m']);

  fNum('planting_centres_mm', 'Planting centres', 'mm');
  cat('hedge', 'Hedge', 'planting', 'lm',
    ['species_botanical', 'species_common', 'climate_zone', 'season_of_install', 'maturity_age', 'pot_size', 'planting_centres_mm', 'expected_height_m']);

  fSel('lawn_species', 'Species', ['kikuyu', 'couch', 'buffalo', 'zoysia', 'fescue', 'ryegrass', 'blend']);
  fSel('lawn_format', 'Format', ['roll', 'slab', 'instant', 'seed']);
  cat('lawn_turf', 'Lawn / turf', 'planting', 'm²',
    ['lawn_species', 'lawn_format', 'climate_zone', 'season_of_install', 'sub_base']);

  fBool('drainage_required', 'Drainage required');
  cat('garden_bed', 'Garden bed', 'planting', 'm²',
    ['planting_palette_ref', 'soil_ref', 'mulch_ref', 'edging_ref', 'climate_zone', 'season_of_install', 'drainage_required'],
    { flavour: 'slot' });

  fSel('gravel_mulch_type', 'Type', ['pebble', 'gravel', 'scoria', 'decomposed-granite', 'stone-chip']);
  fNum('depth_mm', 'Depth', 'mm');
  cat('gravel_stone_mulch', 'Gravel / stone mulch', 'planting', 'm²',
    ['gravel_mulch_type', 'size', 'colour', 'depth_mm']);

  fSel('mulch_type', 'Type', ['composted-hardwood', 'sugar-cane', 'pine-bark', 'eucalypt', 'coconut-coir', 'cypress']);
  fText('particle_size', 'Particle size');
  fNum('depth_at_install_mm', 'Depth at install', 'mm');
  cat('mulch', 'Mulch', 'planting', 'm³',
    ['mulch_type', 'particle_size', 'depth_at_install_mm']);

  fSel('soil_type', 'Type', ['topsoil', 'planting-mix', 'ameliorated', 'structural-soil', 'sandy-loam']);
  fNum('ph', 'pH');
  fNum('organic_matter_pct', 'Organic matter', '%');
  cat('soil', 'Soil', 'planting', 'm³',
    ['soil_type', 'ph', 'organic_matter_pct']);

  fSel('planter_material', 'Material', ['ceramic', 'metal', 'concrete', 'fibreglass', 'timber']);
  fBool('drainage_yn', 'Drainage');
  fBool('liner_required', 'Liner required');
  fBool('self_watering', 'Self-watering');
  cat('planter', 'Planter', 'planting', 'ea',
    ['planter_material', 'size', 'climate_zone', 'season_of_install', 'drainage_yn', 'liner_required', 'self_watering']);

  fSel('emitter_spacing_mm', 'Emitter spacing', ['200', '300', '400', '500']);
  fNum('flow_rate_l_h', 'Flow rate', 'l/h');
  fBool('pressure_compensating', 'Pressure compensating');
  fSel('dripline_position', 'Sub-surface or surface', ['sub-surface', 'surface']);
  cat('dripline', 'Dripline', 'planting', 'm',
    ['emitter_spacing_mm', 'flow_rate_l_h', 'pressure_compensating', 'dripline_position'],
    { aliases: ['drip line', 'drip irrigation'] });

  fSel('irrigation_sprinkler_type', 'Type', ['pop-up', 'gear-drive', 'rotary', 'micro-spray', 'mister']);
  fNum('throw_radius_m', 'Throw radius', 'm');
  fSel('irrigation_arc', 'Arc', ['90', '180', '270', '360', 'adjustable']);
  cat('irrigation_sprinkler', 'Irrigation sprinkler', 'planting', 'ea',
    ['irrigation_sprinkler_type', 'throw_radius_m', 'flow_rate', 'irrigation_arc'],
    { aliases: ['sprinkler'] });

  fSel('irrigation_valve_type', 'Type', ['solenoid', 'manual', 'master-valve', 'anti-siphon']);
  fNum('station_number', 'Station number');
  cat('irrigation_valve', 'Irrigation valve', 'planting', 'ea',
    ['irrigation_valve_type', 'size', 'pressure_rating', 'station_number']);

  fNum('station_count', 'Station count');
  fBool('expansion_modules', 'Expansion modules');
  fBool('wifi', 'Wi-Fi');
  fBool('weather_sensor_compatible', 'Weather sensor compatible');
  cat('irrigation_controller', 'Irrigation controller', 'planting', 'ea',
    ['station_count', 'expansion_modules', 'wifi', 'weather_sensor_compatible'],
    { aliases: ['irrigation timer'] });

  fSel('hose_cock_type', 'Type', ['garden-tap', 'lockable-tap', 'anti-vandal', 'sub-meter-equipped']);
  fBool('backflow_protection', 'Backflow protection');
  cat('hose_cock', 'Hose cock', 'planting', 'ea',
    ['hose_cock_type', 'finish', 'backflow_protection'],
    { aliases: ['garden tap', 'hose tap'] });

  fSel('water_tank_type', 'Type', ['rainwater', 'detention', 'fire', 'potable', 'stormwater-retention', 'recycled-water']);
  fSel('water_tank_material', 'Material', ['poly', 'concrete', 'steel', 'fibreglass', 'bladder']);
  fSel('water_tank_position', 'Above or below ground', ['above', 'below', 'partial']);
  cat('water_tank', 'Water tank', 'planting', 'ea',
    ['water_tank_type', 'capacity_l', 'water_tank_material', 'water_tank_position'],
    { aliases: ['rainwater tank', 'detention tank', 'fire tank'] });

  fSel('soakwell_material', 'Material', ['concrete', 'plastic', 'gravel-pit']);
  fNum('sub_surface_depth_mm', 'Sub-surface depth', 'mm');
  cat('soakwell', 'Soakwell', 'planting', 'ea',
    ['size', 'capacity_l', 'soakwell_material', 'sub_surface_depth_mm']);

  fSel('grate_loading_class', 'Grate loading class', ['A15', 'B125', 'C250', 'D400', 'E600', 'F900']);
  fSel('drainage_pit_base', 'Base type', ['silt-bucket', 'full-flow', 'sediment']);
  fText('connection_size', 'Connection size');
  cat('drainage_pit', 'Drainage pit', 'planting', 'ea',
    ['size', 'grate_loading_class', 'drainage_pit_base', 'connection_size']);

  fBool('alarm', 'Alarm');
  fBool('backup_pump', 'Backup pump');
  cat('sump', 'Sump', 'planting', 'ea',
    ['size', 'pump_ref', 'capacity_l', 'alarm', 'backup_pump']);

  // ─── Build the schema object ───────────────────────────────────────────────
  // _reseedVersion: bump when DEFAULT_SCHEMA_V5 changes in a way that should
  // overwrite existing workspace taxonomies snapshots. LoadingGate compares
  // appState.taxonomies._reseedVersion to this value at boot and replaces the
  // snapshot with a fresh clone if they differ.
  window.DEFAULT_SCHEMA_V5 = {
    schemaVersion: 5,
    _reseedVersion: 3,
    groups: GROUPS,
    categories: CATEGORIES,
    fields: Object.values(FIELDS),
    commonFieldIds: COMMON_FIELD_IDS,
    sections: [],
    tagAxes: TAG_AXES,
    rowOrthogonals: ROW_ORTHOGONALS,
  };

  // Quick sanity check available in console:
  window.DEFAULT_SCHEMA_V5._counts = {
    groups: GROUPS.length,
    categories: CATEGORIES.length,
    fields: Object.keys(FIELDS).length,
    commonFieldIds: COMMON_FIELD_IDS.length,
  };

  console.log('[schema] DEFAULT_SCHEMA_V5 loaded:', window.DEFAULT_SCHEMA_V5._counts);
})();
