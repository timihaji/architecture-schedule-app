// src/schema-data.jsx — declarative taxonomy data for DEFAULT_SCHEMA_V5.
// Loaded by index.html immediately after schema.jsx.
// Reads builders + state from window._schemaCtx (set by schema.jsx).
(function () {
  const {
    f, fText, fLong, fNum, fBool, fSel, fMSel, fCur, fUrl,
    fItem, fItemMulti, fSwatch, fDate, fColor, fTag,
    group, cat,
    GROUPS, CATEGORIES, FIELDS, COMMON_FIELD_IDS, TAG_AXES, ROW_ORTHOGONALS,
  } = window._schemaCtx;

  // =============================================================================
  // GROUP 1 — Surfaces (4 — slots)
  // =============================================================================
  fLong('extent_of_works', 'Extent of works');
  group('surfaces', 'Surfaces', ['substrate_ref']);
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
  fNum('coats', 'Coats');
  fNum('coverage_per_l', 'Coverage', 'm²/L');
  fCur('price_per_l', 'Price per litre');
  fNum('lrv', 'LRV');
  cat('paint', 'Paint', 'finishes', 'm²',
    ['brand', 'range', 'colour_name', 'colour_code', 'sheen_paint', 'coats', 'coverage_per_l', 'price_per_l', 'lrv']);

  // Wallpaper
  fNum('roll_width_mm', 'Roll width', 'mm');
  fNum('roll_length_m', 'Roll length', 'm');
  fSel('paste_method', 'Matching method', ['free', 'straight', 'drop']);
  cat('wallpaper', 'Wallpaper', 'finishes', 'm²',
    ['brand', 'range', 'pattern', 'roll_width_mm', 'roll_length_m', 'paste_method']);

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
  cat('metal', 'Metal', 'finishes', 'm²',
    ['metal_type', 'metal_finish', 'finish_colour']);

  // Polished concrete
  fSel('aggregate_type', 'Aggregate type', ['seeded', 'exposed-natural', 'exposed-decorative', 'integral']);
  fSel('concrete_sheen', 'Sheen', ['matt', 'satin', 'polished', 'mirror']);
  cat('polished_concrete', 'Polished concrete', 'finishes', 'm²',
    ['aggregate_type', 'concrete_sheen', 'colour']);

  // Resin floor
  // Vinyl
  cat('vinyl', 'Vinyl', 'finishes', 'm²',
    ['brand', 'range', 'pattern', 'thickness']);

  // Linoleum
  cat('linoleum', 'Linoleum', 'finishes', 'm²',
    ['brand', 'range', 'pattern', 'thickness']);

  // Rubber
  // Cork
  // Terrazzo
  fSel('terrazzo_type', 'Type', ['in-situ', 'precast tile', 'precast slab']);
  fText('base_colour', 'Base colour');
  cat('terrazzo', 'Terrazzo', 'finishes', 'm²',
    ['terrazzo_type', 'base_colour', 'grout_colour']);

  // Polished plaster
  fSel('plaster_type', 'Type', ['marmorino','venetian','tadelakt','lime-wash','scagliola']);
  fSel('plaster_sheen', 'Sheen', ['matt', 'satin', 'polished', 'mirror']);
  cat('polished_plaster', 'Polished plaster', 'finishes', 'm²',
    ['plaster_type', 'base_colour', 'plaster_sheen']);

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
  fSel('textile_use', 'Use', ['upholstery', 'drapery', 'wallcovering', 'bed-linen']);
  cat('textile', 'Textile', 'finishes', 'lm',
    ['brand', 'range', 'composition', 'width_cm', 'textile_use']);

  // Acoustic panel
  fSel('acoustic_facing', 'Facing', ['fabric', 'wood-veneer', 'metal', 'MDF-perforated', 'gypsum-perforated', 'PET']);
  cat('acoustic_panel', 'Acoustic panel', 'finishes', 'm²',
    ['brand', 'range', 'acoustic_facing', 'thickness', 'format_text']);

  // Cladding
  fSel('cladding_material', 'Material', ['timber','fibre-cement','metal','composite','masonry','concrete-panel','terracotta']);
  fSel('cladding_fixing', 'Fixing', ['face-fixed', 'secret-fixed', 'clip-fixed', 'rivet-fixed']);
  cat('cladding', 'Cladding', 'finishes', 'm²',
    ['brand', 'profile', 'cladding_material', 'finish', 'cladding_fixing'],
    { aliases: ['external lining'] });

  // Render
  fSel('render_system', 'System', ['cement', 'acrylic', 'lime', 'polymer-modified']);
  fSel('render_finish', 'Finish', ['smooth', 'sponge', 'sand', 'bagged', 'scratched', 'textured']);
  cat('render', 'Render', 'finishes', 'm²',
    ['render_system', 'render_finish', 'colour']);

  // Glazing
  fSel('glazing_type', 'Type', ['float','low-iron','toughened','laminated','double-glazed','triple-glazed','low-E','fire-rated','acoustic','switchable','obscure']);
  fText('glazing_thickness', 'Thickness', { helpText: 'e.g. 6/12/6' });
  fBool('low_e', 'Low-E');
  fNum('u_value', 'U value');
  fNum('shgc', 'SHGC');
  fNum('rw', 'Rw');
  fText('safety_compliance', 'Safety compliance');
  fText('obscure_pattern', 'Obscure pattern');
  cat('glazing', 'Glazing', 'finishes', 'm²',
    ['glazing_type', 'glazing_thickness', 'low_e', 'u_value', 'shgc', 'rw', 'safety_compliance', 'obscure_pattern']);

  // =============================================================================
  // GROUP 4 — Substrates, barriers & membranes (11)
  // =============================================================================
  group('substrates', 'Substrates, barriers & membranes', ['thickness']);

  // Plasterboard
  fSel('plasterboard_type', 'Type', ['standard','fire-rated','water-resistant','impact-resistant','acoustic','sound-rated','mould-resistant']);
  fText('sheet_size', 'Sheet size');
  cat('plasterboard', 'Plasterboard', 'substrates', 'm²',
    ['plasterboard_type', 'sheet_size'],
    { aliases: ['Gyprock', 'GIB', 'drywall', 'gypsum board', 'gypsum'] });

  // Fibre cement sheet
  fSel('fc_sheet_type', 'Type', ['lining', 'cladding', 'eaves', 'compressed', 'soffit']);
  fSel('fc_sheet_finish', 'Finish', ['smooth', 'textured']);
  cat('fibre_cement_sheet', 'Fibre cement sheet', 'substrates', 'm²',
    ['fc_sheet_type', 'sheet_size', 'fc_sheet_finish'],
    { aliases: ['Villaboard', 'FC sheet', 'Hardiflex', 'blueboard'] });

  // Cement sheet
  // Plywood lining
  // Lining (generic)
  fSel('lining_application', 'Application', ['wall', 'ceiling', 'floor', 'joinery']);
  cat('lining', 'Lining', 'substrates', 'm²',
    ['type_text', 'sheet_size', 'lining_application']);

  // Insulation
  fSel('insulation_type', 'Type', ['glasswool','rockwool','polyester','cellulose','EPS','XPS','PIR','PUR','sheep-wool','hemp','mineral-fibre']);
  fNum('r_value', 'R value');
  cat('insulation', 'Insulation', 'substrates', 'm²',
    ['insulation_type', 'r_value'],
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
    ['system_text', 'fire_stopping_use']);

  // Sealant
  fSel('sealant_type', 'Type', ['silicone','polyurethane','MS-polymer','acrylic','butyl','fire-rated','hybrid']);
  fSel('sealant_use_class', 'Use class', ['wet-area', 'expansion', 'fire', 'glazing', 'exterior', 'structural']);
  cat('sealant', 'Sealant', 'substrates', 'ea',
    ['sealant_type', 'colour', 'sealant_use_class']);

  // Sealant joint
  // Movement joint
  // =============================================================================
  // GROUP 5 — Roof, facade & rainwater (12)
  // =============================================================================
  fText('fall', 'Fall');
  // Fall (drainage gradient) only applies to roof_slot, gutter, and a few
  // surfaces — pushed down so fascias, downpipes, solar PV, flashings,
  // bargeboards don't inherit a "Fall" field that doesn't apply.
  group('roof', 'Roof, facade & rainwater', ['material', 'finish']);

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

  cat('coping', 'Coping', 'roof', 'lm',
    ['profile']);

  cat('bargeboard', 'Bargeboard', 'roof', 'lm',
    ['profile', 'depth', 'capping_ref']);

  fSel('gutter_profile', 'Profile', ['quad', 'half-round', 'square', 'box', 'internal-box', 'ogee']);
  cat('gutter', 'Gutter', 'roof', 'lm',
    ['gutter_profile', 'size', 'fall']);

  fSel('downpipe_profile', 'Profile', ['round', 'rectangular', 'square']);
  cat('downpipe', 'Downpipe', 'roof', 'm',
    ['downpipe_profile', 'size']);

  fNum('panel_wattage_w', 'Panel wattage', 'W');
  fText('panel_dimensions', 'Panel dimensions');
  cat('solar_pv', 'Solar PV', 'roof', 'ea',
    ['panel_wattage_w', 'panel_dimensions']);

  fSel('flashing_material', 'Material', ['zinc', 'lead', 'copper', 'stainless', 'aluminium', 'EPDM']);
  cat('flashing', 'Flashing', 'roof', 'lm',
    ['flashing_material', 'profile']);

  // =============================================================================
  // GROUP 6 — Structure (16)
  // =============================================================================
  // Connection type only applies to discrete members (column, beam, truss,
  // framing). Doesn't fit slabs, footings, masonry, reinforcement, hob_bund.
  // steel_structure has its own typed steel_connection. Pushed down.
  group('structure', 'Structure', []);

  fSel('footing_type', 'Type', ['pad', 'strip', 'raft', 'piled', 'screw-pile']);
  cat('footing', 'Footing', 'structure', 'm³',
    ['footing_type', 'depth', 'dimensions'], { flavour: 'slot' });

  fText('mesh', 'Mesh');
  fItem('vapour_barrier_ref', 'Vapour barrier', 'membrane');
  cat('slab_on_ground', 'Slab on ground', 'structure', 'm²',
    ['thickness', 'vapour_barrier_ref', 'finish'], { flavour: 'slot' });

  fSel('suspended_slab_system', 'System', ['PT', 'RC', 'formwork', 'Bondek', 'hollow-core', 'voided-slab']);
  fText('span', 'Span');
  cat('suspended_slab', 'Suspended slab', 'structure', 'm²',
    ['thickness', 'suspended_slab_system'], { flavour: 'slot' });

  cat('column', 'Column', 'structure', 'ea',
    ['material', 'size', 'height'], { flavour: 'slot' });

  cat('beam', 'Beam', 'structure', 'm',
    ['material', 'profile'], { flavour: 'slot' });

  cat('structural_wall', 'Structural wall', 'structure', 'm²',
    ['material', 'thickness'], { flavour: 'slot' });

  cat('lintel', 'Lintel', 'structure', 'ea',
    ['material', 'length'], { flavour: 'slot' });

  fSel('bracing_type', 'Type', ['K-brace', 'X-brace', 'knee', 'plywood-shear', 'strap']);
  cat('bracing', 'Bracing', 'structure', 'ea',
    ['bracing_type', 'material'], { flavour: 'slot' });

  fSel('framing_material', 'Material', ['timber', 'light-gauge-steel', 'steel', 'hot-rolled', 'cold-formed']);
  fNum('spacing_mm', 'Spacing', 'mm');
  cat('framing', 'Framing', 'structure', 'm²',
    ['framing_material'], { flavour: 'slot' });

  cat('concrete_structure', 'Concrete structure', 'structure', 'm³',
    ['grade', 'reinforcement_ref', 'finish']);

  fSel('steel_finish', 'Finish', ['galvanised', 'painted', 'primed', 'weathering', 'painted-galv']);
  cat('steel_structure', 'Steel structure', 'structure', 'kg',
    ['grade', 'profile', 'steel_finish']);

  fSel('timber_treatment', 'Treatment', ['H1', 'H2', 'H3', 'H4', 'glulam', 'LVL', 'CLT', 'untreated']);
  cat('timber_structure', 'Timber structure', 'structure', 'm³',
    ['species', 'grade', 'timber_treatment']);

  fSel('masonry_type', 'Type', ['brick', 'blockwork', 'stone']);
  fText('unit_size', 'Unit size');
  fText('mortar_type', 'Mortar type');
  cat('masonry_structure', 'Masonry structure', 'structure', 'm²',
    ['masonry_type', 'unit_size', 'mortar_type']);

  fSel('hob_bund_type', 'Type', ['hob', 'bund']);
  cat('hob_bund', 'Hob / bund', 'structure', 'lm',
    ['hob_bund_type', 'height', 'width', 'membrane_ref'],
    { aliases: ['kerb-bund', 'containment-kerb', 'shower hob'] });

  fSel('truss_joist_type', 'Type', ['truss', 'joist', 'rafter', 'purlin']);
  cat('truss_joist', 'Truss / joist', 'structure', 'ea',
    ['truss_joist_type', 'material', 'depth', 'spacing_mm', 'span'],
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
  fNum('sill_height_mm', 'Sill height', 'mm');
  cat('door', 'Door', 'openings', 'ea',
    ['opening_type', 'leaf_material', 'leaf_thickness_mm', 'frame_material', 'frame_finish', 'threshold', 'hardware_set', 'glazing_ref', 'door_fire_rating', 'acoustic_rw_door', 'sill_height_mm']);

  // Window
  fSel('window_type', 'Window type', ['fixed','casement','awning','sliding','double-hung','bifold','louvre','hopper','tilt-turn']);
  fSel('window_frame_material', 'Frame material', ['aluminium', 'timber', 'uPVC', 'steel', 'composite']);
  fText('sill_type', 'Sill type');
  fText('reveal', 'Reveal');
  fBool('flyscreen', 'Flyscreen');
  cat('window', 'Window', 'openings', 'ea',
    ['window_type', 'window_frame_material', 'frame_finish', 'glazing_ref', 'sill_height_mm', 'sill_type', 'reveal', 'flyscreen']);

  // Garage door
  fSel('garage_door_type', 'Type', ['panel-lift', 'sectional', 'roller', 'tilt', 'side-hinged', 'bifold']);
  fSel('garage_motor', 'Motor', ['belt-drive', 'chain-drive', 'screw-drive', 'manual']);
  fBool('remote', 'Remote');
  cat('garage_door', 'Garage door', 'openings', 'ea',
    ['garage_door_type', 'material', 'finish', 'garage_motor', 'remote', 'hardware_set']);

  // Roller shutter
  // Operable wall
  // Skylight
  fSel('skylight_type', 'Type', ['fixed', 'opening', 'tubular', 'ventilating']);
  fSel('skylight_opening', 'Opening method', ['manual', 'electric', 'solar', 'rain-sensor']);
  cat('skylight', 'Skylight', 'openings', 'ea',
    ['skylight_type', 'size', 'glazing_ref', 'frame_finish', 'skylight_opening']);

  // Louvre
  fSel('louvre_type', 'Type', ['fixed', 'operable', 'automatic']);
  fSel('louvre_drive', 'Opening drive', ['manual', 'motorised', 'BMS-controlled', 'rain-sensor']);
  cat('louvre', 'Louvre', 'openings', 'ea',
    ['louvre_type', 'material', 'louvre_drive']);

  // Access panel
  fBool('key_required', 'Key required');
  cat('access_panel', 'Access panel', 'openings', 'ea',
    ['material', 'size', 'finish', 'key_required'],
    { aliases: ['AP', 'ceiling hatch', 'service hatch'] });

  // =============================================================================
  // GROUP 8 — Sanitary, tapware & hydraulic fixtures (14)
  // =============================================================================
  fSel('mounting_san', 'Mounting', ['wall', 'deck', 'floor', 'countertop', 'in-wall']);
  // Brand and finish are universal in this group. WELS, sanitary connection,
  // and sanitary mounting only fit fixtures using water and physical mounts —
  // pushed down so mirrors, shower screens, niches don't inherit them.
  group('sanitary', 'Sanitary, tapware & hydraulic fixtures', ['brand', 'finish']);

  // Basin
  fSel('basin_bowl_shape', 'Bowl shape', ['round', 'oval', 'square', 'rectangle', 'vessel', 'semi-recessed', 'undermount', 'integral']);
  fBool('overflow', 'Overflow');
  fSel('basin_taphole_count', 'Taphole count', ['0', '1', '3']);
  cat('basin', 'Basin', 'sanitary', 'ea',
    ['basin_bowl_shape', 'size', 'mounting_san', 'basin_taphole_count']);

  // Sink
  fSel('sink_type', 'Type', ['kitchen', 'laundry', 'butlers', 'prep', 'bar', 'bath']);
  fSel('sink_bowl_count', 'Bowl count', ['single', '1.5', 'double', 'triple']);
  fSel('sink_material', 'Material', ['stainless','granite-composite','ceramic','copper','fireclay','concrete','solid-surface']);
  fBool('undermount', 'Undermount');
  cat('sink', 'Sink', 'sanitary', 'ea',
    ['sink_type', 'sink_bowl_count', 'size', 'mounting_san', 'sink_material']);

  // WC
  fSel('wc_pan_type', 'Pan type', ['wall-faced', 'close-coupled', 'back-to-wall', 'wall-hung', 'in-wall']);
  fSel('wc_cistern_type', 'Cistern type', ['close-coupled', 'in-wall', 'exposed', 'none']);
  cat('wc', 'WC', 'sanitary', 'ea',
    ['wc_pan_type', 'wc_cistern_type', 'mounting_san'],
    { aliases: ['toilet', 'lavatory', 'water closet', 'dunny'] });

  // Urinal
  fSel('urinal_type', 'Type', ['bowl', 'slab', 'wall-hung', 'waterless', 'trough']);
  cat('urinal', 'Urinal', 'sanitary', 'ea',
    ['urinal_type', 'size', 'mounting_san']);

  // Bath
  fSel('bath_type', 'Type', ['freestanding', 'drop-in', 'alcove', 'corner', 'walk-in', 'japanese', 'claw-foot']);
  cat('bath', 'Bath', 'sanitary', 'ea',
    ['bath_type', 'size', 'capacity_l']);

  // Shower
  fSel('shower_type', 'Type', ['walk-in', 'screened', 'alcove', 'wet-room', 'tub-shower']);
  cat('shower', 'Shower', 'sanitary', 'ea',
    ['shower_type', 'size']);

  // Tapware
  fSel('tapware_type', 'Type', ['mixer', 'two-handle', 'sensor', 'timed', 'hose-tap', 'lever']);
  cat('tapware', 'Tapware', 'sanitary', 'ea',
    ['tapware_type', 'mounting_san']);

  // Floor waste
  fText('grate_pattern', 'Grate pattern');
  fSel('floor_waste_material', 'Material', ['stainless', 'brass', 'chrome', 'custom-tiled']);
  cat('floor_waste', 'Floor waste', 'sanitary', 'ea',
    ['size', 'grate_pattern', 'floor_waste_material']);

  // Linear drain
  cat('linear_drain', 'Linear drain', 'sanitary', 'lm',
    ['length', 'grate_pattern', 'material'],
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
  fBool('demister', 'Demister');
  cat('mirror', 'Mirror', 'sanitary', 'ea',
    ['mirror_type', 'size', 'mirror_edge', 'mounting_san', 'demister']);

  // Bathroom accessory
  // Heated towel rail
  fSel('htr_type', 'Type', ['hardwired', 'plug-in', 'hydronic']);
  cat('heated_towel_rail', 'Heated towel rail', 'sanitary', 'ea',
    ['htr_type', 'power_w', 'mounting_san', 'size']);

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
  fBool('soft_close', 'Soft close');
  // Cabinet-construction fields (carcass, door finish, hardware, kickboard,
  // soft-close) only fit boxes-with-doors. Benchtops, splashbacks, banquettes,
  // hardware items themselves, and lab benches don't need them. Pushed down
  // to vanity/wardrobe/kitchen_joinery/storage_joinery/reception_desk only.
  group('joinery', 'Joinery & casework', []);

  // Joinery hardware
  fSel('joinery_hardware_type', 'Type', ['handle','knob','hinge','drawer-runner','shelf-support','catch','lock','lift-up','drop-down','push-to-open']);
  cat('joinery_hardware', 'Joinery hardware', 'joinery', 'ea',
    ['joinery_hardware_type', 'brand', 'material', 'finish'],
    { aliases: ['ironmongery', 'cabinet hardware'] });

  // Benchtop
  fSel('benchtop_material', 'Material', ['stone','engineered-stone','laminate','timber','stainless','concrete','solid-surface','porcelain','ceramic','glass']);
  fSel('benchtop_edge_profile', 'Edge profile', ['square', 'eased', 'bullnose', 'ogee', 'mitred', 'waterfall', 'chamfered']);
  fSel('benchtop_waterfall', 'Waterfall ends', ['none', 'one', 'both']);
  fText('joint_locations', 'Joint locations');
  cat('benchtop', 'Benchtop', 'joinery', 'm²',
    ['benchtop_material', 'material_ref', 'thickness', 'benchtop_edge_profile', 'benchtop_waterfall', 'joint_locations']);

  // Splashback
  fText('grout_or_jointing', 'Grout / jointing');
  cat('splashback', 'Splashback', 'joinery', 'm²',
    ['material_ref', 'height', 'grout_or_jointing', 'finish']);

  // Vanity
  fSel('vanity_type', 'Type', ['wall-hung', 'floor-mounted', 'semi-recessed', 'custom']);
  fText('interior_finish', 'Interior finish');
  cat('vanity', 'Vanity', 'joinery', 'ea',
    ['vanity_type', 'basin_ref', 'tapware_ref', 'carcass_material', 'door_finish_ref', 'hardware_set', 'size']);

  // Wardrobe
  fSel('wardrobe_type', 'Type', ['built-in', 'walk-in', 'freestanding', 'sliding-door', 'hinged-door']);
  fLong('interior_fitout', 'Interior fitout');
  cat('wardrobe', 'Wardrobe', 'joinery', 'ea',
    ['wardrobe_type', 'carcass_material', 'door_finish_ref', 'hardware_set', 'soft_close', 'interior_fitout']);

  // Kitchen joinery
  fBool('island', 'Island');
  // Reception desk
  fSel('counter_height_mm', 'Counter height', ['720', '900', '1100', 'custom']);
  cat('reception_desk', 'Reception desk', 'joinery', 'ea',
    ['size', 'carcass_material', 'door_finish_ref', 'counter_height_mm']);

  // Banquette
  fSel('banquette_type', 'Type', ['built-in', 'freestanding', 'modular']);
  fNum('seat_height_mm', 'Seat height', 'mm');
  fItem('upholstery_ref', 'Upholstery', 'textile');
  cat('banquette', 'Banquette', 'joinery', 'lm',
    ['banquette_type', 'depth', 'upholstery_ref']);

  // Storage joinery
  // Lab bench
  // =============================================================================
  // GROUP 10 — Stairs, ramps & barriers (6)
  // =============================================================================
  fItem('structural_ref', 'Structure', null);
  group('stairs', 'Stairs, ramps & barriers', ['structural_ref']);

  // Stair
  fSel('stair_type', 'Type', ['straight','dog-leg','U-shaped','helical','spiral','cantilevered','half-turn','quarter-turn']);
  fNum('going_mm', 'Going', 'mm');
  fNum('rise_mm', 'Rise', 'mm');
  fItem('tread_material_ref', 'Tread material', null);
  fSel('nosing_detail', 'Nosing detail', ['bullnose', 'square', 'integral', 'stair-nosing-strip', 'contrast-strip']);
  fSel('stringer_type', 'Stringer type', ['closed', 'open', 'central', 'twin']);
  cat('stair', 'Stair', 'stairs', 'ea',
    ['stair_type', 'going_mm', 'rise_mm', 'width', 'tread_material_ref', 'nosing_detail', 'stringer_type', 'balustrade_ref', 'handrail_ref']);

  // Ramp
  fSel('ramp_gradient', 'Gradient', ['1:14', '1:20', 'custom']);
  fText('surface', 'Surface');
  fBool('handrail_both_sides', 'Handrail both sides');
  cat('ramp', 'Ramp', 'stairs', 'm',
    ['ramp_gradient', 'width', 'handrail_both_sides']);

  // Handrail
  fSel('handrail_profile', 'Profile', ['round', 'rectangular', 'oval', 'square', 'custom']);
  fNum('handrail_diameter_mm', 'Diameter', 'mm');
  fSel('handrail_mount', 'Mount type', ['wall', 'post', 'top-mount', 'side-mount']);
  cat('handrail', 'Handrail', 'stairs', 'lm',
    ['handrail_profile', 'material', 'handrail_diameter_mm', 'height', 'handrail_mount']);

  // Balustrade
  fSel('balustrade_type', 'Type', ['glass-infill','vertical-pickets','horizontal-rails','mesh','perforated-panel','solid-panel','wire-balustrade','post-and-rail']);
  fText('infill_material', 'Infill material');
  cat('balustrade', 'Balustrade', 'stairs', 'lm',
    ['balustrade_type', 'infill_material', 'height']);

  // Barrier
  fSel('barrier_type', 'Type', ['pedestrian', 'bollard', 'cable', 'vehicle']);
  cat('barrier', 'Barrier', 'stairs', 'lm',
    ['barrier_type', 'material', 'height']);

  // Guardrail
  fSel('guardrail_type', 'Type', ['void-edge', 'balcony', 'roof-edge', 'plant']);
  cat('guardrail', 'Guardrail', 'stairs', 'lm',
    ['guardrail_type', 'material', 'height']);

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
  fNum('cutout_diameter_mm', 'Cutout diameter', 'mm');
  fBool('adjustable', 'Adjustable');
  fText('trim_finish', 'Trim finish');
  cat('downlight', 'Downlight', 'lighting', 'ea',
    [...LUMINAIRE_FIELDS, 'beam_angle_deg', 'cutout_diameter_mm', 'adjustable', 'trim_finish']);

  fNum('drop_mm', 'Drop', 'mm');
  fNum('cord_length_mm', 'Cord length', 'mm');
  fNum('canopy_diameter_mm', 'Canopy diameter', 'mm');
  fText('canopy_finish', 'Canopy finish');
  fText('shade_material', 'Shade material');
  fNum('diameter_mm', 'Diameter', 'mm');
  cat('pendant', 'Pendant', 'lighting', 'ea',
    [...LUMINAIRE_FIELDS, 'diameter_mm', 'drop_mm', 'cord_length_mm', 'canopy_diameter_mm', 'canopy_finish', 'shade_material']);

  fSel('wall_light_mount', 'Mount type', ['surface', 'recessed', 'semi-recessed']);
  fSel('uplight_downlight', 'Uplight/downlight', ['up', 'down', 'both', 'side']);
  cat('wall_light', 'Wall light', 'lighting', 'ea',
    [...LUMINAIRE_FIELDS, 'wall_light_mount', 'uplight_downlight'], { aliases: ['sconce'] });

  fSel('linear_profile', 'Profile', ['surface', 'recessed', 'suspended', 'batten', 'plaster-in']);
  fSel('linear_diffuser', 'Diffuser', ['opal', 'prismatic', 'frosted', 'clear']);
  fText('led_strip_density', 'LED strip density');
  cat('linear_light', 'Linear light', 'lighting', 'lm',
    [...LUMINAIRE_FIELDS, 'length', 'linear_profile', 'linear_diffuser', 'led_strip_density'],
    { aliases: ['LED strip', 'strip lighting', 'batten'] });

  fSel('track_compat', 'Track compatibility', ['single-circuit', '3-circuit', '48V', 'mag-track']);
  fNum('head_count', 'Head count');
  fText('track_finish', 'Track finish');
  cat('track_light', 'Track light', 'lighting', 'ea',
    [...LUMINAIRE_FIELDS, 'track_compat', 'head_count', 'adjustable', 'track_finish']);

  fSel('step_light_mount', 'Mount type', ['recessed', 'surface']);
  fSel('step_projection', 'Projection pattern', ['down', 'side', 'full']);
  cat('step_light', 'Step light', 'lighting', 'ea',
    [...LUMINAIRE_FIELDS, 'step_light_mount', 'step_projection']);

  fSel('bollard_projection', 'Projection pattern', ['360', 'asymmetric', 'downlight']);
  fBool('vandal_resistant', 'Vandal resistant');
  cat('bollard_light', 'Bollard light', 'lighting', 'ea',
    [...LUMINAIRE_FIELDS, 'height', 'bollard_projection', 'vandal_resistant']);

  fSel('emergency_type', 'Type', ['maintained', 'non-maintained', 'sustained']);
  fSel('battery_type', 'Battery type', ['NiCd', 'Li-Ion', 'NiMH']);
  fNum('runtime_min', 'Runtime', 'min');
  fBool('self_test', 'Self-test');
  cat('emergency_light', 'Emergency light', 'lighting', 'ea',
    ['emergency_type', 'battery_type', 'runtime_min', 'self_test']);

  fSel('exit_pictogram', 'Pictogram compliance', ['AS-2293', 'EN-1838']);
  fBool('running_man', 'Running man');
  fSel('exit_maintained', 'Maintained / non-maintained', ['maintained', 'non-maintained']);
  fBool('double_sided', 'Double sided');
  cat('exit_sign', 'Exit sign', 'lighting', 'ea',
    ['exit_pictogram', 'running_man', 'exit_maintained', 'double_sided']);

  fSel('lighting_control_proto', 'Protocol', ['0-10V', 'DALI', 'Dynalite', 'KNX', 'DMX', 'Casambi', 'Zigbee', 'Wi-Fi']);
  fSel('lighting_control_kind', 'Type', ['dimmer', 'switch', 'sensor', 'scene-controller', 'gateway']);
  fSel('lighting_control_ui', 'UI', ['keypad', 'app', 'voice', 'push-button']);
  cat('lighting_control', 'Lighting control', 'lighting', 'ea',
    ['lighting_control_proto', 'lighting_control_kind', 'lighting_control_ui'],
    { aliases: ['dimmer', 'scene controller', 'gateway'] });

  // =============================================================================
  // GROUP 12 — Electrical, data & AV (16)
  // =============================================================================
  // Brand/model are universal. Finish, IP rating, and location zone only fit
  // a subset (wall plates, outdoor gear, wet-area hardware). Pushed down so
  // switchboards, server racks, AV equipment etc. don't inherit a meaningless
  // "Finish" or "Location zone" field.
  group('electrical', 'Electrical, data & AV', ['brand', 'model']);

  fSel('switch_gangs', 'Gangs', ['1', '2', '3', '4', '5', '6']);
  fSel('switch_function', 'Function', ['on-off', 'dimmer', 'fan', 'motorised', 'intermediate']);
  fText('plate_material', 'Plate material');
  cat('switch', 'Switch', 'electrical', 'ea',
    ['switch_gangs', 'switch_function', 'finish', 'plate_material']);

  fSel('outlet_gangs', 'Gangs', ['single', 'double', 'triple', 'quad']);
  fNum('usb_count', 'USB count');
  fSel('usb_type', 'USB type', ['A', 'C', 'A+C', 'none']);
  cat('power_outlet', 'Power outlet', 'electrical', 'ea',
    ['outlet_gangs', 'finish', 'usb_count', 'usb_type'],
    { aliases: ['GPO', 'power point', 'socket'] });

  fSel('data_outlet_type', 'Type', ['Cat6', 'Cat6A', 'Cat7', 'Cat8', 'fibre-OM3', 'fibre-OM4']);
  fNum('port_count', 'Port count');
  cat('data_outlet', 'Data outlet', 'electrical', 'ea',
    ['data_outlet_type', 'port_count', 'finish']);

  fMSel('floor_box_contents', 'Contents', ['power', 'data', 'AV', 'USB', 'HDMI']);
  fSel('floor_box_access', 'Access', ['hinged', 'slide-out', 'removable']);
  cat('floor_box', 'Floor box', 'electrical', 'ea',
    ['size', 'floor_box_contents', 'finish', 'IP_rating', 'floor_box_access']);

  fSel('switchboard_type', 'Type', ['distribution', 'main', 'sub', 'meter']);
  fSel('phases', 'Phases', ['single', 'three']);
  cat('switchboard', 'Switchboard', 'electrical', 'ea',
    ['switchboard_type', 'phases']);

  fSel('ev_charger_type', 'Type', ['AC-Type-2', 'DC-CCS', 'DC-CHAdeMO']);
  fNum('ev_power_kw', 'Power', 'kW');
  cat('ev_charger', 'EV charger', 'electrical', 'ea',
    ['ev_charger_type', 'ev_power_kw']);

  fSel('sensor_type', 'Type', ['motion', 'occupancy', 'daylight', 'temperature', 'humidity', 'CO2', 'smoke', 'VOC']);
  cat('sensor', 'Sensor', 'electrical', 'ea',
    ['sensor_type', 'IP_rating']);

  fSel('intercom_type', 'Type', ['audio', 'video', 'IP', 'GSM']);
  fNum('station_count', 'Station count');
  fBool('door_release_integrated', 'Door release integrated');
  cat('intercom', 'Intercom', 'electrical', 'ea',
    ['intercom_type', 'door_release_integrated', 'finish']);

  fSel('av_type', 'Type', ['amplifier', 'processor', 'matrix', 'encoder', 'decoder', 'microphone', 'mixer']);
  cat('av_equipment', 'AV equipment', 'electrical', 'ea',
    ['av_type']);

  fSel('speaker_type', 'Type', ['ceiling', 'wall', 'surface', 'in-wall', 'pendant', 'subwoofer']);
  cat('speaker', 'Speaker', 'electrical', 'ea',
    ['speaker_type']);

  fSel('display_type', 'Type', ['TV', 'monitor', 'video-wall', 'projector', 'kiosk']);
  fNum('display_size_inch', 'Size', 'inch');
  fText('resolution', 'Resolution');
  fText('mount_text', 'Mount');
  cat('display', 'Display', 'electrical', 'ea',
    ['display_type', 'display_size_inch', 'resolution', 'mount_text', 'finish'],
    { aliases: ['monitor', 'screen', 'TV'] });

  // =============================================================================
  // GROUP 13 — Mechanical (15)
  // =============================================================================
  fNum('capacity_kw', 'Capacity', 'kW');
  fSel('controls_protocol', 'Controls protocol', ['BMS', 'standalone', 'wireless', 'BACnet', 'Modbus', 'KNX']);
  // Brand and model are universal. Capacity, refrigerant, controls protocol,
  // and noise level only apply to active equipment — pushed down so passive
  // components (diffuser, grille, register, ductwork) don't inherit them.
  group('mechanical', 'Mechanical', ['brand', 'model']);

  fSel('ac_indoor_type', 'Type', ['ducted','cassette','wall-mounted','floor-mounted','ceiling-suspended','multi-split-head']);
  fNum('airflow_l_s', 'Airflow', 'l/s');
  cat('ac_indoor', 'AC indoor', 'mechanical', 'ea',
    ['ac_indoor_type', 'capacity_kw', 'controls_protocol']);

  fSel('ac_outdoor_type', 'Type', ['split', 'multi-split', 'VRF', 'chiller', 'packaged', 'cassette']);
  cat('ac_outdoor', 'AC outdoor', 'mechanical', 'ea',
    ['ac_outdoor_type', 'capacity_kw', 'controls_protocol']);

  fSel('diffuser_type', 'Type', ['linear-bar', 'linear-slot', 'swirl', 'perforated', 'jet', 'displacement', 'square-egg-crate', 'round']);
  fText('throw_pattern', 'Throw pattern');
  cat('diffuser', 'Diffuser', 'mechanical', 'ea',
    ['diffuser_type', 'size', 'throw_pattern', 'finish']);

  fSel('grille_type', 'Type', ['return', 'exhaust', 'transfer', 'weather', 'eggcrate']);
  cat('grille', 'Grille', 'mechanical', 'ea',
    ['grille_type', 'size', 'finish']);

  fSel('register_type', 'Type', ['supply', 'return']);
  fBool('damper_yn', 'Damper');
  cat('register', 'Register', 'mechanical', 'ea',
    ['register_type', 'size', 'damper_yn', 'finish']);

  fSel('exhaust_fan_type', 'Type', ['ceiling', 'wall', 'in-line', 'roof-mounted']);
  fText('static_pressure', 'Static pressure');
  fBool('ducted', 'Ducted');
  cat('exhaust_fan', 'Exhaust fan', 'mechanical', 'ea',
    ['exhaust_fan_type', 'airflow_l_s', 'static_pressure', 'controls_protocol', 'ducted']);

  fSel('rangehood_type', 'Type', ['undermount', 'canopy', 'integrated', 'downdraft', 'recirculating', 'ducted']);
  fBool('light_integrated', 'Light integrated');
  cat('rangehood', 'Rangehood', 'mechanical', 'ea',
    ['rangehood_type', 'airflow_l_s', 'width', 'light_integrated']);

  fSel('ductwork_material', 'Material', ['galvanised', 'stainless', 'flexible', 'fibreglass', 'fabric']);
  fText('diameter_or_dimensions', 'Diameter / dimensions');
  cat('ductwork', 'Ductwork', 'mechanical', 'm',
    ['ductwork_material', 'diameter_or_dimensions']);

  fSel('ufh_system', 'System', ['hydronic', 'electric-cable', 'electric-mat']);
  fNum('output_w_m2', 'Output', 'W/m²');
  fText('controls', 'Controls');
  cat('underfloor_heating', 'Underfloor heating', 'mechanical', 'm²',
    ['ufh_system', 'output_w_m2', 'controls', 'controls_protocol']);

  fSel('hvac_type', 'Type', ['AHU', 'FCU', 'VAV', 'CAV', 'ERV', 'HRV', 'chiller', 'boiler', 'cooling-tower']);
  cat('hvac_equipment', 'HVAC equipment', 'mechanical', 'ea',
    ['hvac_type', 'capacity', 'capacity_kw', 'controls_protocol'],
    { aliases: ['FCU', 'AHU', 'fan coil unit', 'air handling unit'] });

  // =============================================================================
  // GROUP 14 — Hydraulic (5)
  // =============================================================================
  group('hydraulic', 'Hydraulic',
    ['brand', 'model', 'location']);

  fSel('hwu_type', 'Type', ['gas-storage', 'gas-instant', 'electric-storage', 'electric-instant', 'heat-pump', 'solar-thermal', 'solar-with-boost']);
  cat('hot_water_unit', 'Hot water unit', 'hydraulic', 'ea',
    ['hwu_type', 'capacity_l']);

  fSel('water_meter_type', 'Type', ['domestic', 'sub-meter', 'fire', 'irrigation', 'recycled']);
  fBool('pulse_output', 'Pulse output');
  cat('water_meter', 'Water meter', 'hydraulic', 'ea',
    ['water_meter_type', 'size', 'pulse_output']);

  fSel('pump_application', 'Application', ['irrigation','domestic-water','hot-water-circ','sump','fire-booster','swimming-pool','rainwater-harvest','transfer']);
  fSel('pump_type', 'Type', ['centrifugal', 'submersible', 'multistage', 'jet']);
  cat('pump', 'Pump', 'hydraulic', 'ea',
    ['pump_application', 'pump_type']);

  // =============================================================================
  // GROUP 15 — Fire & life safety (12)
  // =============================================================================
  fSel('fire_addressable', 'Addressable', ['addressable', 'conventional', 'hybrid']);
  // Addressable applies only to detectors and alarm panels (the digitally-
  // addressed signalling network). Hose reels, extinguishers, blankets,
  // shutters, dampers, collars don't have addressability — pushed down.
  group('fire', 'Fire & life safety', ['brand', 'model']);

  fSel('smoke_det_type', 'Detection type', ['photoelectric', 'ionisation', 'dual', 'aspirating']);
  fSel('smoke_det_power', 'Power', ['hardwired', 'battery', 'mains-with-battery']);
  cat('smoke_detector', 'Smoke detector', 'fire', 'ea',
    ['smoke_det_type', 'smoke_det_power', 'fire_addressable']);

  fSel('sprinkler_type', 'Type', ['pendant', 'upright', 'sidewall', 'concealed', 'in-rack', 'ESFR', 'residential']);
  fText('cover_plate_finish', 'Cover plate finish');
  cat('sprinkler_head', 'Sprinkler head', 'fire', 'ea',
    ['sprinkler_type', 'finish', 'cover_plate_finish']);

  fNum('hose_length_m', 'Hose length', 'm');
  fText('cabinet_finish', 'Cabinet finish');
  cat('hose_reel', 'Hose reel', 'fire', 'ea',
    ['hose_length_m', 'cabinet_finish']);

  fSel('hydrant_type', 'Type', ['landing-valve', 'fire-plug', 'booster', 'monitor']);
  fSel('hydrant_connection', 'Connection', ['Storz', 'BIC']);
  cat('hydrant', 'Hydrant', 'fire', 'ea',
    ['hydrant_type', 'hydrant_connection']);

  fSel('extinguisher_type', 'Type', ['water', 'foam', 'dry-powder', 'CO2', 'wet-chemical', 'clean-agent']);
  fNum('extinguisher_size_kg', 'Size', 'kg');
  fMSel('extinguisher_class', 'Class rating', ['A', 'B', 'C', 'D', 'E', 'F']);
  cat('extinguisher', 'Extinguisher', 'fire', 'ea',
    ['extinguisher_type', 'extinguisher_size_kg', 'extinguisher_class']);

  fSel('fip_type', 'Type', ['addressable', 'conventional', 'hybrid', 'voice-evac']);
  cat('fire_indicator_panel', 'Fire indicator panel', 'fire', 'ea',
    ['fip_type', 'fire_addressable'],
    { aliases: ['FIP'] });

  fSel('fire_shutter_op', 'Operation', ['manual', 'motorised', 'fail-safe']);
  cat('fire_shutter', 'Fire shutter', 'fire', 'ea',
    ['width', 'height', 'fire_shutter_op']);

  fSel('fire_damper_op', 'Operation', ['thermal', 'electric', 'smoke-actuated']);
  cat('fire_damper', 'Fire damper', 'fire', 'ea',
    ['size', 'fire_damper_op']);

  // =============================================================================
  // GROUP 16 — Vertical transport (6)
  // =============================================================================
  fNum('speed_m_s', 'Speed', 'm/s');
  fSel('drive_type', 'Drive type', ['traction', 'MRL', 'hydraulic', 'geared', 'gearless']);
  group('vertical_transport', 'Vertical transport',
    ['brand', 'capacity_kg', 'capacity_persons', 'speed_m_s', 'drive_type']);

  fItem('car_finish_ref', 'Car finish', null);
  fText('door_finish', 'Door finish');
  cat('passenger_lift', 'Passenger lift', 'vertical_transport', 'ea',
    ['size', 'car_finish_ref', 'door_finish']);

  fSel('escalator_angle', 'Angle', ['30', '35']);
  fText('step_finish', 'Step finish');
  fSel('escalator_balustrade', 'Balustrade', ['glass', 'panel']);
  cat('escalator', 'Escalator', 'vertical_transport', 'ea',
    ['width', 'escalator_angle', 'step_finish', 'escalator_balustrade']);

  fNum('travelator_length_m', 'Length', 'm');
  fSel('travelator_slope', 'Slope', ['0', '6', '10', '12']);
  cat('travelator', 'Travelator', 'vertical_transport', 'ea',
    ['travelator_length_m', 'width', 'travelator_slope']);

  // =============================================================================
  // GROUP 17 — Accessibility & signage (9)
  // =============================================================================
  fBool('braille_required', 'Braille required');
  // Braille only applies to text-bearing signs (tactile_sign, room_id_sign,
  // statutory_sign, braille_sign) — pushed down. The other group fields
  // (AS-1428 compliance, finish, mounting) are universal enough to keep.
  group('accessibility', 'Accessibility & signage',
    ['finish', 'mounting']);

  fSel('tgsi_type', 'Type', ['directional', 'hazard']);
  fSel('tgsi_format', 'Format', ['tile', 'individual-stud', 'applied']);
  cat('tgsi', 'TGSI', 'accessibility', 'm²',
    ['tgsi_type', 'tgsi_format'],
    { aliases: ['tactile ground surface indicator', 'hazard tile'] });

  fSel('grab_rail_diameter', 'Diameter', ['32', '38', '50']);
  cat('grab_rail', 'Grab rail', 'accessibility', 'ea',
    ['grab_rail_diameter', 'length', 'finish', 'mounting']);

  fNum('luminance_contrast', 'Luminance contrast');
  cat('tactile_sign', 'Tactile sign', 'accessibility', 'ea',
    ['size', 'braille_required', 'luminance_contrast', 'finish']);

  fSel('hearing_loop_type', 'Type', ['room-loop', 'counter-loop', 'perimeter']);
  fText('amplifier', 'Amplifier');
  fBool('signage_required', 'Signage required');
  cat('hearing_loop', 'Hearing loop', 'accessibility', 'ea',
    ['hearing_loop_type', 'signage_required']);

  // =============================================================================
  // GROUP 18 — FF&E (12)
  // =============================================================================
  fText('designer', 'Designer');
  // FF&E members vary too widely for shared group fields (an oven and a sofa
  // share almost nothing). Group is organizational only; each category lists
  // the fields it actually needs.
  group('ffe', 'FF&E', []);

  fSel('furniture_type', 'Type', ['chair','armchair','sofa','lounge','stool','bench','ottoman','dining-table','coffee-table','side-table','desk','console','bed','daybed','custom']);
  cat('furniture', 'Furniture', 'ffe', 'ea',
    ['furniture_type', 'brand', 'range', 'designer', 'dimensions', 'material', 'finish', 'upholstery_ref', 'seat_height_mm']);

  fItem('fabric_ref', 'Fabric', 'textile');
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
    ['workstation_type', 'brand', 'size', 'dimensions', 'finish', 'adjustable', 'partitions']);

  fBool('magnetic', 'Magnetic');
  fSel('appliance_type', 'Type', ['oven','cooktop','rangehood','dishwasher','fridge','freezer','washing-machine','dryer','microwave','coffee-machine','warming-drawer','wine-cabinet']);
  fNum('energy_star', 'Energy star');
  fSel('appliance_integration', 'Integrated or freestanding', ['integrated', 'freestanding', 'semi-integrated']);
  cat('appliance', 'Appliance', 'ffe', 'ea',
    ['appliance_type', 'brand', 'model', 'dimensions', 'energy_star', 'capacity', 'finish', 'appliance_integration']);

  // =============================================================================
  // GROUP 19 — Landscape & external works (29)
  // =============================================================================
  fSel('slip_rating_landscape', 'Slip rating', ['P3', 'P4', 'P5', 'R10', 'R11', 'R12', 'R13']);
  group('landscape', 'Landscape & external works',
    ['material', 'finish', 'slip_rating_landscape']);

  fSel('driveway_material', 'Material', ['concrete', 'asphalt', 'exposed-aggregate', 'paver', 'gravel']);
  fText('sub_base', 'Sub-base');
  fText('bordering', 'Bordering');
  cat('driveway', 'Driveway', 'landscape', 'm²',
    ['driveway_material', 'finish', 'sub_base', 'bordering']);

  fText('falls', 'Falls');
  cat('path', 'Path', 'landscape', 'm²',
    ['material', 'width', 'finish', 'edging_ref', 'falls']);

  cat('external_stair', 'External stair', 'landscape', 'ea',
    ['material', 'finish', 'rise_mm', 'going_mm']);

  cat('external_ramp', 'External ramp', 'landscape', 'm',
    ['ramp_gradient', 'handrail_ref']);

  fSel('retaining_wall_material', 'Material', ['masonry', 'concrete', 'sleeper', 'gabion', 'segmental-block', 'stone']);
  fNum('max_height_mm_rw', 'Max height', 'mm');
  cat('retaining_wall', 'Retaining wall', 'landscape', 'm²',
    ['retaining_wall_material', 'max_height_mm_rw']);

  fSel('fence_type', 'Type', ['paling', 'capped-paling', 'slat', 'picket', 'palisade', 'mesh', 'glass', 'steel-bar', 'hedge']);
  cat('fence', 'Fence', 'landscape', 'lm',
    ['fence_type', 'height']);

  fSel('gate_type', 'Type', ['pedestrian', 'vehicle', 'sliding', 'swing', 'automatic']);
  fSel('gate_operation', 'Operation', ['manual', 'motorised']);
  cat('gate', 'Gate', 'landscape', 'ea',
    ['gate_type', 'width', 'height', 'material', 'gate_operation', 'access_control_ref']);

  fSel('bbq_type', 'Type', ['built-in', 'freestanding', 'kettle', 'wood-fired', 'hibachi']);
  fSel('bbq_fuel', 'Fuel', ['gas', 'charcoal', 'electric']);
  fNum('burners', 'Burners');
  cat('bbq', 'BBQ', 'landscape', 'ea',
    ['bbq_type', 'bbq_fuel', 'burners', 'size']);

  fSel('pool_type', 'Type', ['in-ground-concrete', 'fibreglass', 'vinyl-liner', 'infinity', 'lap', 'plunge', 'swim-spa']);
  fText('heating', 'Heating');
  cat('pool', 'Pool', 'landscape', 'm²',
    ['pool_type', 'interior_finish', 'size', 'heating']);

  fSel('outdoor_furniture_type', 'Type', ['bench', 'chair', 'table', 'lounge', 'daybed', 'sun-lounge']);
  cat('outdoor_furniture', 'Outdoor furniture', 'landscape', 'ea',
    ['outdoor_furniture_type', 'material', 'finish']);

  fSel('bike_rack_type', 'Type', ['hoop', 'vertical', 'two-tier', 'lockers']);
  fSel('bike_fixing', 'Fixing', ['surface-mount', 'in-ground']);
  cat('bike_rack', 'Bike rack', 'landscape', 'ea',
    ['bike_rack_type', 'capacity', 'material', 'bike_fixing']);

  fSel('letterbox_type', 'Type', ['standalone', 'integrated', 'multi-unit']);
  cat('letterbox', 'Letterbox', 'landscape', 'ea',
    ['letterbox_type', 'material', 'finish']);

  fSel('clothesline_type', 'Type', ['rotary', 'retractable', 'fixed']);
  cat('clothesline', 'Clothesline', 'landscape', 'ea',
    ['clothesline_type', 'capacity', 'material']);

  // =============================================================================
  // GROUP 20 — Planting, irrigation & drainage (20)
  // =============================================================================
  fText('climate_zone', 'Climate zone');
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
  cat('tree', 'Tree', 'planting', 'ea',
    ['species_botanical', 'species_common', 'climate_zone', 'pot_size_l', 'height_at_supply_m', 'expected_mature_height_m', 'canopy_spread_m', 'root_barrier_required']);

  fSel('lawn_species', 'Species', ['kikuyu', 'couch', 'buffalo', 'zoysia', 'fescue', 'ryegrass', 'blend']);
  cat('lawn_turf', 'Lawn / turf', 'planting', 'm²',
    ['lawn_species', 'climate_zone']);

  fBool('drainage_required', 'Drainage required');
  cat('garden_bed', 'Garden bed', 'planting', 'm²',
    ['planting_palette_ref', 'soil_ref', 'mulch_ref', 'edging_ref', 'drainage_required'],
    { flavour: 'slot' });

  fSel('gravel_mulch_type', 'Type', ['pebble', 'gravel', 'scoria', 'decomposed-granite', 'stone-chip']);
  fNum('depth_mm', 'Depth', 'mm');
  cat('gravel_stone_mulch', 'Gravel / stone mulch', 'planting', 'm²',
    ['gravel_mulch_type', 'size', 'colour', 'depth_mm']);

  fSel('planter_material', 'Material', ['ceramic', 'metal', 'concrete', 'fibreglass', 'timber']);
  cat('planter', 'Planter', 'planting', 'ea',
    ['planter_material', 'size']);

  fNum('station_count', 'Station count');
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

  cat('drainage_pit', 'Drainage pit', 'planting', 'ea',
    ['size']);

  // ─── Build the schema object ───────────────────────────────────────────────
  // _reseedVersion: schemaActive() returns the saved workspace snapshot, not DEFAULT_SCHEMA_V5.
  // Bump to force LoadingGate step 5d to reseed via cloneDefaultSchemaV5(). Bump for structural
  // changes only (remove field-def, restructure group fieldIds, delete category); skip for additive/cosmetic.
  window.DEFAULT_SCHEMA_V5 = {
    schemaVersion: 5,
    _reseedVersion: 6,
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
  delete window._schemaCtx;
})();
