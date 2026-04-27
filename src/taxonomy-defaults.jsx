// src/taxonomy-defaults.jsx — v4 taxonomy seed.
//
// Defines window.DEFAULT_TAXONOMIES — the canonical productTypes / elements /
// state / specMode vocabularies that ship in v1. Backfilled into
// appState.taxonomies by migrate-v4.jsx if missing.
//
// Why this file exists: in v3, taxonomy data lived in kinds.jsx (KINDS,
// SUBTYPES, COMPONENT_TYPES) hardcoded as JS constants. v4 promotes them to
// workspace-editable data on appState — so users can extend the productType /
// element vocab without code changes (Phase D unlocks the editor UI).
//
// A3 ships only the MINIMAL taxonomy needed for migration — every legacy
// kind+subtype maps to a productType id, every COMPONENT_TYPE maps to an
// element id. Phase C extends this with hand-curated productTypes
// (paint_wall vs paint_ceiling, lining_gyprock, etc.).
//
// Ids are stable. Renaming a productType or element id breaks all references
// in materials.productType + schedule rows. Add new ids freely; never rename.

(function () {
  // ─── Product types ─────────────────────────────────────────────────────────
  // One per legacy (kind, subtype) combination from kinds.jsx, plus the
  // legacy "material" kind which splits by category. Each has:
  //   id          — stable string used in material.productType
  //   label       — human-readable
  //   group       — Cost Schedule group key (was material.category)
  //   defaultUnit — for new schedule rows
  //   extraFields — declarative spec for ProductFieldBlocks (Phase C uses this)
  const PRODUCT_TYPES = [
    // Finishes (legacy kind='material' split by category)
    { id: 'timber',         label: 'Timber',          group: 'Finishes', defaultUnit: 'm²',
      extraFields: [
        { id: 'species',   label: 'Species',   type: 'text' },
        { id: 'origin',    label: 'Origin',    type: 'text' },
        { id: 'thickness', label: 'Thickness', type: 'text' },
      ] },
    { id: 'stone',          label: 'Stone',           group: 'Finishes', defaultUnit: 'm²',
      extraFields: [
        { id: 'origin',    label: 'Origin',    type: 'text' },
        { id: 'thickness', label: 'Thickness', type: 'text' },
      ] },
    { id: 'composite',      label: 'Composite / board', group: 'Finishes', defaultUnit: 'm²',
      extraFields: [
        { id: 'paintable',     label: 'Paintable',         type: 'boolean' },
        { id: 'paintedWithId', label: 'Painted with (id)', type: 'text' },
        { id: 'species',       label: 'Species',           type: 'text' },
        { id: 'thickness',     label: 'Thickness',         type: 'text' },
      ] },
    { id: 'metal',          label: 'Metal',           group: 'Finishes', defaultUnit: 'm²',
      extraFields: [
        { id: 'origin',    label: 'Origin',    type: 'text' },
        { id: 'thickness', label: 'Thickness', type: 'text' },
      ] },
    { id: 'tile',           label: 'Tile',            group: 'Finishes', defaultUnit: 'm²',
      extraFields: [
        { id: 'origin',    label: 'Origin',    type: 'text' },
        { id: 'thickness', label: 'Thickness', type: 'text' },
      ] },
    { id: 'textile',        label: 'Textile',         group: 'Finishes', defaultUnit: 'm²',
      extraFields: [] },
    { id: 'material_other', label: 'Material (other)', group: 'Finishes', defaultUnit: 'm²',
      extraFields: [] },

    // Paint
    { id: 'paint',          label: 'Paint',           group: 'Finishes', defaultUnit: 'm²',
      extraFields: [
        { id: 'brand',         label: 'Brand',          type: 'text' },
        { id: 'colourName',    label: 'Colour name',    type: 'text' },
        { id: 'colourCode',    label: 'Colour code',    type: 'text' },
        { id: 'sheen',         label: 'Sheen',          type: 'text' },
        { id: 'system',        label: 'System',         type: 'text' },
        { id: 'coats',         label: 'Coats',          type: 'number' },
        { id: 'coveragePerL',  label: 'Coverage (m²/L)', type: 'number' },
        { id: 'pricePerL',     label: 'Price per L',    type: 'number' },
        { id: 'substrates',    label: 'Substrates',     type: 'text' },
      ] },

    // Appliance subtypes
    { id: 'appliance',           label: 'Appliance (generic)', group: 'Services', defaultUnit: 'ea', extraFields: [] },
    { id: 'appliance_oven',      label: 'Oven',           group: 'Services', defaultUnit: 'ea', extraFields: [] },
    { id: 'appliance_cooktop',   label: 'Cooktop',        group: 'Services', defaultUnit: 'ea', extraFields: [] },
    { id: 'appliance_rangehood', label: 'Rangehood',      group: 'Services', defaultUnit: 'ea', extraFields: [] },
    { id: 'appliance_dishwasher',label: 'Dishwasher',     group: 'Services', defaultUnit: 'ea', extraFields: [] },
    { id: 'appliance_fridge',    label: 'Fridge',         group: 'Services', defaultUnit: 'ea', extraFields: [] },
    { id: 'appliance_freezer',   label: 'Freezer',        group: 'Services', defaultUnit: 'ea', extraFields: [] },
    { id: 'appliance_microwave', label: 'Microwave',      group: 'Services', defaultUnit: 'ea', extraFields: [] },
    { id: 'appliance_washer',    label: 'Washer / dryer', group: 'Services', defaultUnit: 'ea', extraFields: [] },
    { id: 'appliance_coffee',    label: 'Coffee machine', group: 'Services', defaultUnit: 'ea', extraFields: [] },
    { id: 'appliance_warming',   label: 'Warming drawer', group: 'Services', defaultUnit: 'ea', extraFields: [] },

    // Fitting subtypes
    { id: 'fitting',             label: 'Fitting (generic)', group: 'Fittings', defaultUnit: 'ea', extraFields: [] },
    { id: 'fitting_mixer',       label: 'Tap / mixer',    group: 'Fittings', defaultUnit: 'ea', extraFields: [] },
    { id: 'fitting_basin',       label: 'Basin',          group: 'Fittings', defaultUnit: 'ea', extraFields: [] },
    { id: 'fitting_sink',        label: 'Sink',           group: 'Fittings', defaultUnit: 'ea', extraFields: [] },
    { id: 'fitting_toilet',      label: 'Toilet',         group: 'Fittings', defaultUnit: 'ea', extraFields: [] },
    { id: 'fitting_bath',        label: 'Bath',           group: 'Fittings', defaultUnit: 'ea', extraFields: [] },
    { id: 'fitting_shower',      label: 'Shower',         group: 'Fittings', defaultUnit: 'ea', extraFields: [] },
    { id: 'fitting_floor-waste', label: 'Floor waste',    group: 'Fittings', defaultUnit: 'ea', extraFields: [] },
    { id: 'fitting_bottle-trap', label: 'Bottle trap',    group: 'Fittings', defaultUnit: 'ea', extraFields: [] },
    { id: 'fitting_accessory',   label: 'Accessory',      group: 'Fittings', defaultUnit: 'ea', extraFields: [] },

    // Light subtypes
    { id: 'light',               label: 'Light fitting (generic)', group: 'Lighting', defaultUnit: 'ea', extraFields: [] },
    { id: 'light_downlight',     label: 'Downlight',      group: 'Lighting', defaultUnit: 'ea', extraFields: [] },
    { id: 'light_pendant',       label: 'Pendant',        group: 'Lighting', defaultUnit: 'ea', extraFields: [] },
    { id: 'light_sconce',        label: 'Wall sconce',    group: 'Lighting', defaultUnit: 'ea', extraFields: [] },
    { id: 'light_strip',         label: 'Strip / linear', group: 'Lighting', defaultUnit: 'ea', extraFields: [] },
    { id: 'light_floor',         label: 'Floor lamp',     group: 'Lighting', defaultUnit: 'ea', extraFields: [] },
    { id: 'light_table',         label: 'Table lamp',     group: 'Lighting', defaultUnit: 'ea', extraFields: [] },
    { id: 'light_track',         label: 'Track',          group: 'Lighting', defaultUnit: 'ea', extraFields: [] },
    { id: 'light_spot',          label: 'Spotlight',      group: 'Lighting', defaultUnit: 'ea', extraFields: [] },

    // Joinery / hardware subtypes
    { id: 'joinery',             label: 'Joinery (generic)', group: 'Joinery', defaultUnit: 'ea', extraFields: [] },
    { id: 'joinery_handle',      label: 'Handle / pull',  group: 'Joinery', defaultUnit: 'ea', extraFields: [] },
    { id: 'joinery_knob',        label: 'Knob',           group: 'Joinery', defaultUnit: 'ea', extraFields: [] },
    { id: 'joinery_hinge',       label: 'Hinge',          group: 'Joinery', defaultUnit: 'ea', extraFields: [] },
    { id: 'joinery_runner',      label: 'Drawer runner',  group: 'Joinery', defaultUnit: 'ea', extraFields: [] },
    { id: 'joinery_shelf',       label: 'Shelf support',  group: 'Joinery', defaultUnit: 'ea', extraFields: [] },
    { id: 'joinery_catch',       label: 'Catch / latch',  group: 'Joinery', defaultUnit: 'ea', extraFields: [] },
    { id: 'joinery_tambour',     label: 'Tambour',        group: 'Joinery', defaultUnit: 'ea', extraFields: [] },

    // Doors
    { id: 'door',                label: 'Door (generic)', group: 'Doors & Windows', defaultUnit: 'ea', extraFields: [] },
    { id: 'door_hinged',         label: 'Hinged door',    group: 'Doors & Windows', defaultUnit: 'ea', extraFields: [] },
    { id: 'door_sliding',        label: 'Sliding door',   group: 'Doors & Windows', defaultUnit: 'ea', extraFields: [] },
    { id: 'door_pivot',          label: 'Pivot door',     group: 'Doors & Windows', defaultUnit: 'ea', extraFields: [] },
    { id: 'door_barn',           label: 'Barn door',      group: 'Doors & Windows', defaultUnit: 'ea', extraFields: [] },
    { id: 'door_bifold',         label: 'Bifold door',    group: 'Doors & Windows', defaultUnit: 'ea', extraFields: [] },
    { id: 'door_cavity',         label: 'Cavity slider',  group: 'Doors & Windows', defaultUnit: 'ea', extraFields: [] },

    // Windows
    { id: 'window',              label: 'Window (generic)', group: 'Doors & Windows', defaultUnit: 'ea', extraFields: [] },
    { id: 'window_casement',     label: 'Casement window',  group: 'Doors & Windows', defaultUnit: 'ea', extraFields: [] },
    { id: 'window_awning',       label: 'Awning window',    group: 'Doors & Windows', defaultUnit: 'ea', extraFields: [] },
    { id: 'window_sliding',      label: 'Sliding window',   group: 'Doors & Windows', defaultUnit: 'ea', extraFields: [] },
    { id: 'window_fixed',        label: 'Fixed pane',       group: 'Doors & Windows', defaultUnit: 'ea', extraFields: [] },
    { id: 'window_double-hung',  label: 'Double-hung',      group: 'Doors & Windows', defaultUnit: 'ea', extraFields: [] },
    { id: 'window_louvre',       label: 'Louvre window',    group: 'Doors & Windows', defaultUnit: 'ea', extraFields: [] },

    // FF&E (kind starts with 'ffe-' → productType prefixed 'furniture_')
    { id: 'furniture_seating',           label: 'Seating (generic)', group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_seating_chair',     label: 'Chair',          group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_seating_armchair',  label: 'Armchair',       group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_seating_sofa',      label: 'Sofa',           group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_seating_stool',     label: 'Stool',          group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_seating_bench',     label: 'Bench',          group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_seating_ottoman',   label: 'Ottoman',        group: 'FF&E', defaultUnit: 'ea', extraFields: [] },

    { id: 'furniture_tables',            label: 'Tables (generic)', group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_tables_dining',     label: 'Dining table',   group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_tables_coffee',     label: 'Coffee table',   group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_tables_side',       label: 'Side table',     group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_tables_desk',       label: 'Desk',           group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_tables_console',    label: 'Console',        group: 'FF&E', defaultUnit: 'ea', extraFields: [] },

    { id: 'furniture_storage',           label: 'Storage (generic)', group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_storage_shelving',  label: 'Shelving',       group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_storage_cabinet',   label: 'Cabinet',        group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_storage_sideboard', label: 'Sideboard',      group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_storage_wardrobe',  label: 'Wardrobe',       group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_storage_coat-rack', label: 'Coat rack',      group: 'FF&E', defaultUnit: 'ea', extraFields: [] },

    { id: 'furniture_beds',              label: 'Beds (generic)', group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_beds_single',       label: 'Single bed',     group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_beds_double',       label: 'Double bed',     group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_beds_queen',        label: 'Queen bed',      group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_beds_king',         label: 'King bed',       group: 'FF&E', defaultUnit: 'ea', extraFields: [] },

    { id: 'furniture_soft',              label: 'Soft (generic)', group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_soft_rug',          label: 'Rug',            group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_soft_cushion',      label: 'Cushion',        group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_soft_throw',        label: 'Throw',          group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_soft_curtain',      label: 'Curtain / drape', group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_soft_blind',        label: 'Blind',          group: 'FF&E', defaultUnit: 'ea', extraFields: [] },

    { id: 'furniture_lighting',          label: 'Decorative lighting (generic)', group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_lighting_pendant',  label: 'Decorative pendant', group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_lighting_floor',    label: 'Decorative floor lamp', group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_lighting_table',    label: 'Decorative table lamp', group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_lighting_wall',     label: 'Decorative wall lamp',  group: 'FF&E', defaultUnit: 'ea', extraFields: [] },

    { id: 'furniture_art',               label: 'Art (generic)',  group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_art_artwork',       label: 'Artwork',        group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_art_print',         label: 'Print',          group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_art_mirror',        label: 'Mirror',         group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_art_sculpture',     label: 'Sculpture',      group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_art_planter',       label: 'Planter',        group: 'FF&E', defaultUnit: 'ea', extraFields: [] },
    { id: 'furniture_art_vessel',        label: 'Vessel',         group: 'FF&E', defaultUnit: 'ea', extraFields: [] },

    // Catch-all
    { id: 'other',               label: 'Other',          group: 'Other', defaultUnit: 'ea', extraFields: [] },
  ];

  // ─── Elements ─────────────────────────────────────────────────────────────
  // 1:1 with COMPONENT_TYPES from kinds.jsx — id is the same so existing
  // schedule-row componentType values flow through unchanged when the
  // migration sets schedule_row.element = component.componentType.
  const ELEMENTS = [
    { id: 'floor',         label: 'Floor',           group: 'Surfaces',   defaultUnit: 'm²' },
    { id: 'wall',          label: 'Wall',            group: 'Surfaces',   defaultUnit: 'm²' },
    { id: 'ceiling',       label: 'Ceiling',         group: 'Surfaces',   defaultUnit: 'm²' },
    { id: 'skirting',      label: 'Skirting / trim', group: 'Surfaces',   defaultUnit: 'lm' },
    { id: 'architrave',    label: 'Architrave',      group: 'Surfaces',   defaultUnit: 'lm' },

    { id: 'door',          label: 'Door',            group: 'Openings',   defaultUnit: 'ea' },
    { id: 'window',        label: 'Window',          group: 'Openings',   defaultUnit: 'ea' },

    { id: 'countertop',    label: 'Countertop',      group: 'Benches',    defaultUnit: 'm²' },
    { id: 'splashback',    label: 'Splashback',      group: 'Benches',    defaultUnit: 'm²' },

    { id: 'joinery-body',  label: 'Joinery carcass',     group: 'Joinery', defaultUnit: 'm²' },
    { id: 'joinery-door',  label: 'Joinery door/drawer', group: 'Joinery', defaultUnit: 'm²' },
    { id: 'joinery-bench', label: 'Joinery benchtop',    group: 'Joinery', defaultUnit: 'm²' },
    { id: 'hardware',      label: 'Handle / hardware',   group: 'Joinery', defaultUnit: 'ea' },

    { id: 'tap',           label: 'Tap / mixer',     group: 'Fittings',   defaultUnit: 'ea' },
    { id: 'basin',         label: 'Basin',           group: 'Fittings',   defaultUnit: 'ea' },
    { id: 'sink',          label: 'Sink',            group: 'Fittings',   defaultUnit: 'ea' },
    { id: 'toilet',        label: 'Toilet',          group: 'Fittings',   defaultUnit: 'ea' },
    { id: 'bath',          label: 'Bath',            group: 'Fittings',   defaultUnit: 'ea' },
    { id: 'shower',        label: 'Shower',          group: 'Fittings',   defaultUnit: 'ea' },

    { id: 'appliance',     label: 'Appliance',       group: 'Services',   defaultUnit: 'ea' },
    { id: 'light',         label: 'Light fitting',   group: 'Services',   defaultUnit: 'ea' },

    { id: 'furniture',     label: 'Furniture',       group: 'FF&E',       defaultUnit: 'ea' },
    { id: 'soft',          label: 'Soft furnishings', group: 'FF&E',      defaultUnit: 'ea' },
    { id: 'art',           label: 'Art / accessory', group: 'FF&E',       defaultUnit: 'ea' },

    { id: 'other',         label: 'Other',           group: 'Other',      defaultUnit: 'ea' },
  ];

  // ─── State + spec mode (schedule row enums) ────────────────────────────────
  const STATE = [
    { id: 'new',        label: 'New' },
    { id: 'existing',   label: 'Existing' },
    { id: 'demolished', label: 'Demolished' },
  ];

  const SPEC_MODE = [
    { id: 'proprietary', label: 'Proprietary' },
    { id: 'performance', label: 'Performance' },
    { id: 'generic',     label: 'Generic' },
  ];

  window.DEFAULT_TAXONOMIES = {
    productTypes:  PRODUCT_TYPES,
    elements:      ELEMENTS,
    state:         STATE,
    specMode:      SPEC_MODE,
    typeTemplates: [],
  };
})();
