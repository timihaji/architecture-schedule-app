// Seed data — realistic architectural materials in v5 shape.
// Prices in AUD, unit costs are indicative.
//
// v5 shape per item:
//   { id, code, name, category, fields, _touched, swatch, libraryIds, projects }
// where `fields` contains the migrated v5 field ids:
//   common: supplier, country_of_origin, lead_time, unit, unit_cost, image_ref,
//           notes, tags: { performance, location, materialFamily }
//   group:  brand, model, finish, thickness, dimensions, …
//   per-cat: colour_name, sheen_paint, paint_system, species, …
//
// migrate-v5 runs on first load and idempotently adds legacy mirrors at the
// top level (m.supplier, m.unitCost, m.brand, m.tags as flat string[], etc.)
// so untouched UI surfaces still render. Phase 4 rewrites those readers.

// Helper to build a material with sensible defaults.
function mk(id, code, name, category, fields, swatch, opts) {
  opts = opts || {};
  const cleanFields = {};
  for (const [k, v] of Object.entries(fields || {})) {
    if (v === undefined || v === null || v === '') continue;
    cleanFields[k] = v;
  }
  // Always have a tags shape so renderers never have to null-check.
  if (!cleanFields.tags) {
    cleanFields.tags = { performance: [], location: [], materialFamily: [] };
  }
  return {
    id, code, name,
    category,
    fields: cleanFields,
    _touched: opts._touched || {},
    swatch: swatch || null,
    libraryIds: opts.libraryIds || [],
    projects:   opts.projects   || [],
  };
}

const MATERIALS = [
  // ─────────── TIMBER ───────────
  mk('m-001', 'TBR·01', 'Victorian Ash', 'timber', {
    supplier: 'Britton Timbers', country_of_origin: 'Tasmania, AU',
    species: 'Eucalyptus regnans', finish: 'Clear matte lacquer',
    thickness: 19, dimensions: '2400×140',
    unit_cost: 186, unit: 'm²', lead_time: '2–3 wk',
    notes: 'Pale straw to pinkish-brown hardwood; straight-grained; mills cleanly. Janka 4.9kN. Suitable for interior joinery, veneer, lining boards. Source: FSC-certified coupe.',
    tags: { performance: [], location: ['internal'], materialFamily: ['timber'] },
  }, { kind: 'woodgrain', tone: '#c9a778', grain: '#8a6236' },
    { projects: ['p-brunswick', 'p-clifton'] }),

  mk('m-002', 'TBR·02', 'Blackbutt', 'timber', {
    supplier: 'Australian Sustainable Hardwoods', country_of_origin: 'NSW, AU',
    species: 'Eucalyptus pilularis', finish: 'Oiled',
    thickness: 21, dimensions: '1800×130',
    unit_cost: 214, unit: 'm²', lead_time: '3–4 wk',
    notes: 'Golden yellow to pale brown. BAL-29 bushfire rating. Dense, durable. Common for flooring and external cladding.',
    tags: { performance: ['external-grade'], location: ['external'], materialFamily: ['timber'] },
  }, { kind: 'woodgrain', tone: '#b88a57', grain: '#6b451f' },
    { projects: ['p-brunswick'] }),

  mk('m-003', 'TBR·03', 'Western Red Cedar', 'timber', {
    supplier: 'Radial Timbers', country_of_origin: 'British Columbia, CA',
    species: 'Thuja plicata', finish: 'Cutek CD50 oil',
    thickness: 19, dimensions: '2400×86',
    unit_cost: 168, unit: 'm²', lead_time: '4 wk',
    notes: 'Lightweight softwood, naturally decay-resistant. Warm amber tone weathering to silver. Specify for external screens, castellation, soffits.',
    tags: { performance: ['external-grade'], location: ['external'], materialFamily: ['timber'] },
  }, { kind: 'castellation', tone: '#a36948', grain: '#5a3319' },
    { projects: ['p-brunswick', 'p-clifton', 'p-hawthorn'] }),

  mk('m-004', 'TBR·04', 'American White Oak', 'timber', {
    supplier: 'Mathews Timber', country_of_origin: 'Appalachia, US',
    species: 'Quercus alba', finish: 'Fumed & hard-waxed',
    thickness: 15, dimensions: '2200×220',
    unit_cost: 264, unit: 'm²', lead_time: '6 wk',
    notes: 'Prime grade, rift & quartered. Stable for wide-plank flooring. Fuming (ammonia) deepens tannins to walnut-brown.',
    tags: { performance: [], location: ['internal'], materialFamily: ['timber'] },
  }, { kind: 'woodgrain', tone: '#b4916a', grain: '#4d3620' },
    { projects: ['p-hawthorn'] }),

  mk('m-005', 'TBR·05', 'Spotted Gum', 'timber', {
    supplier: 'Hazelwood & Hill', country_of_origin: 'QLD, AU',
    species: 'Corymbia maculata', finish: 'Intergrain UltraDeck',
    thickness: 32, dimensions: '2000×90',
    unit_cost: 232, unit: 'm²', lead_time: '3 wk',
    notes: 'Decking-grade hardwood. Distinctive streaked appearance. Class 1 durability in-ground.',
    tags: { performance: ['external-grade', 'slip-resistant'], location: ['external'], materialFamily: ['timber'] },
  }, { kind: 'woodgrain', tone: '#a97a4f', grain: '#5d3a1d' }),

  // ─────────── STONE ───────────
  mk('m-010', 'STN·01', 'Elba Bianco Marble', 'stone', {
    supplier: 'CDK Stone', country_of_origin: 'Carrara, IT',
    finish: 'Honed', thickness: 20, dimensions: '3100×1900',
    unit_cost: 640, unit: 'm²', lead_time: '8–10 wk',
    notes: 'White background with soft grey feathered veining. Recommended sealing with Akemi MN. Avoid acidic cleaners.',
    tags: { performance: [], location: ['internal'], materialFamily: ['stone'] },
  }, { kind: 'marble', tone: '#ece6dc', vein: '#7a7468' },
    { projects: ['p-hawthorn'] }),

  mk('m-011', 'STN·02', 'Pietra Grey Limestone', 'stone', {
    supplier: 'Euro Marble', country_of_origin: 'Iran',
    finish: 'Brushed', thickness: 30, dimensions: '2800×1600',
    unit_cost: 480, unit: 'm²', lead_time: '10 wk',
    notes: 'Deep charcoal with fine white veins. Dense limestone; suitable for vanities, feature walls. Brushed finish reduces fingerprint.',
    tags: { performance: ['wet-area'], location: ['internal'], materialFamily: ['stone'] },
  }, { kind: 'marble', tone: '#5e5a55', vein: '#a8a49c' },
    { projects: ['p-clifton'] }),

  mk('m-012', 'STN·03', 'Travertine Noce', 'stone', {
    supplier: 'Signorino', country_of_origin: 'Tivoli, IT',
    finish: 'Honed & filled', thickness: 20, dimensions: '2600×1500',
    unit_cost: 395, unit: 'm²', lead_time: '9 wk',
    notes: 'Walnut-brown travertine, vein-cut. Porous — factory-filled with matching resin. Interior use preferred.',
    tags: { performance: [], location: ['internal'], materialFamily: ['stone'] },
  }, { kind: 'travertine', tone: '#9a7a5c', vein: '#624628' },
    { projects: ['p-hawthorn'] }),

  mk('m-013', 'STN·04', 'Bluestone — Sawn', 'stone', {
    supplier: 'Eco Outdoor', country_of_origin: 'VIC, AU',
    finish: 'Sawn', thickness: 30, dimensions: '600×400',
    unit_cost: 172, unit: 'm²', lead_time: '2 wk',
    notes: 'Victorian basalt. Cool grey-blue. External paving, plinth, stair treads. Slip-rated P4.',
    tags: { performance: ['external-grade', 'slip-resistant'], location: ['external'], materialFamily: ['stone'] },
  }, { kind: 'stone', tone: '#575a5a', grain: '#2f3131' },
    { projects: ['p-brunswick', 'p-clifton'] }),

  // ─────────── COMPOSITE / LAMINATE ───────────
  mk('m-020', 'CMP·01', 'Laminex AbsoluteMatte — Ravine', 'laminate', {
    supplier: 'Laminex', country_of_origin: 'AU',
    finish: 'Matte', thickness: 18, dimensions: '2400×1200',
    unit_cost: 142, unit: 'm²', lead_time: '1 wk',
    notes: 'Thermally fused melamine on E0 MDF. Anti-fingerprint. Warm taupe grey. Joinery shells, base fronts, sliders.',
    tags: { performance: [], location: ['internal'], materialFamily: ['laminate'] },
  }, { kind: 'solid', tone: '#6b6158' },
    { projects: ['p-brunswick', 'p-clifton', 'p-hawthorn'] }),

  mk('m-021', 'CMP·02', 'Navurban Whittlesea Oak Veneer', 'laminate', {
    supplier: 'Navurban (Laminex)', country_of_origin: 'AU',
    finish: 'Matte sealed', thickness: 18, dimensions: '2400×1200',
    unit_cost: 218, unit: 'm²', lead_time: '2 wk',
    notes: 'Reconstituted oak veneer on MDF. Consistent grain run. Cost-effective alternative to natural veneer.',
    tags: { performance: [], location: ['internal'], materialFamily: ['laminate', 'timber'] },
  }, { kind: 'veneer', tone: '#b89268', grain: '#6d4a24' },
    { projects: ['p-clifton'] }),

  mk('m-022', 'CMP·03', 'VJ MDF Panelling — 100mm module', 'laminate', {
    supplier: 'Custom joiner', country_of_origin: 'AU',
    finish: '2pac satin', thickness: 18, dimensions: '2400×1200',
    unit_cost: 128, unit: 'm²', lead_time: '3 wk',
    notes: 'Vertical-joint machined MDF, 100mm module. Primed & sprayed. Classic coastal / Federation detailing. Supplied primed — specify paint finish separately.',
    paintable: true, paintedWith: 'm-050',
    tags: { performance: [], location: ['internal'], materialFamily: ['laminate'] },
  }, { kind: 'vj', tone: '#ede7da' },
    { projects: ['p-hawthorn'] }),

  mk('m-023', 'CMP·04', 'Fluted MDF — 30mm half-round', 'laminate', {
    supplier: 'Briggs Veneers', country_of_origin: 'AU',
    finish: 'Stained oak', thickness: 25, dimensions: '2400×1200',
    unit_cost: 246, unit: 'm²', lead_time: '4 wk',
    notes: 'Machined fluting on MDF substrate, half-round profile. Reception joinery, feature walls. Specify stain reference.',
    paintable: true,
    tags: { performance: [], location: ['internal'], materialFamily: ['laminate'] },
  }, { kind: 'fluted', tone: '#a67d52', grain: '#6b4a28' },
    { projects: ['p-brunswick'] }),

  // ─────────── METAL ───────────
  mk('m-030', 'MTL·01', 'Brushed Stainless Steel 316', 'metal', {
    supplier: 'Austral Wright Metals', country_of_origin: 'AU',
    finish: 'No.4 brushed', thickness: 1.5, dimensions: '2400×1200',
    unit_cost: 385, unit: 'm²', lead_time: '2 wk',
    notes: 'Marine-grade. Kitchen splashbacks, benchtops, external fixings.',
    tags: { performance: ['external-grade', 'wet-area', 'non-combustible'], location: ['external', 'wet-area'], materialFamily: ['metal'] },
  }, { kind: 'brushed', tone: '#b8b5ae', grain: '#8a8780' },
    { projects: ['p-hawthorn'] }),

  mk('m-031', 'MTL·02', 'Blackened Brass Sheet', 'metal', {
    supplier: 'Surface Gallery', country_of_origin: 'AU',
    finish: 'Patinated, waxed', thickness: 2, dimensions: '1200×600',
    unit_cost: 642, unit: 'm²', lead_time: '5 wk',
    notes: 'Hand-patinated CZ108 brass. Each sheet unique. Joinery inlays, feature panels.',
    tags: { performance: [], location: ['internal'], materialFamily: ['metal'] },
  }, { kind: 'solid', tone: '#3a2f22' }),

  mk('m-032', 'MTL·03', 'Powdercoat — Dulux Namadji', 'metal', {
    supplier: 'Dulux Powders', country_of_origin: 'AU',
    finish: 'Matte', thickness: 0.08, dimensions: 'Applied to substrate',
    unit_cost: 58, unit: 'm²', lead_time: '1 wk',
    notes: 'Interior/exterior polyester powdercoat. Deep charcoal. Metal frames, handles.',
    tags: { performance: ['external-grade'], location: ['external'], materialFamily: ['metal'] },
  }, { kind: 'solid', tone: '#2a2826' },
    { projects: ['p-brunswick', 'p-clifton'] }),

  mk('m-033', 'MTL·04', 'Copper Sheet — Natural', 'metal', {
    supplier: 'Craft Metals', country_of_origin: 'AU',
    finish: 'Mill', thickness: 0.7, dimensions: '2400×600',
    unit_cost: 428, unit: 'm²', lead_time: '3 wk',
    notes: 'Will patina unsealed to green-brown over 18–24 months exposed. Roofing, rainwater goods, feature cladding.',
    tags: { performance: ['external-grade', 'weatherproof'], location: ['roof', 'external'], materialFamily: ['metal'] },
  }, { kind: 'brushed', tone: '#b17149', grain: '#7a4525' }),

  // ─────────── PAINT ───────────
  mk('m-050', 'PNT·01', 'Natural White', 'paint', {
    brand: 'Dulux', colour_name: 'Natural White', colour_code: 'SW1F2',
    sheen_paint: 'low-sheen', paint_system: 'Wash & Wear Interior', coats: 2,
    coverage_per_l: 16, price_per_l: 92, substrate_required: 'Plasterboard, primed MDF',
    supplier: 'Dulux', country_of_origin: 'AU',
    finish: 'Low Sheen',
    unit_cost: 12, unit: 'm²', lead_time: '1 wk',
    notes: 'Warm off-white. Dulux most-specified white. Anti-fingerprint acrylic. Low-VOC.',
    tags: { performance: ['low-voc'], location: ['internal'], materialFamily: ['plaster'] },
  }, { kind: 'paint', tone: '#f0ece0', sheen: 'Low Sheen' },
    { projects: ['p-hawthorn', 'p-brunswick'] }),

  mk('m-051', 'PNT·02', 'Lexicon Quarter', 'paint', {
    brand: 'Dulux', colour_name: 'Lexicon Quarter', colour_code: 'PG1H2',
    sheen_paint: 'matt', paint_system: 'Wash & Wear Interior', coats: 2,
    coverage_per_l: 16, price_per_l: 92, substrate_required: 'Plasterboard',
    supplier: 'Dulux', country_of_origin: 'AU',
    finish: 'Matt',
    unit_cost: 12, unit: 'm²', lead_time: '1 wk',
    notes: 'Crisp cool white with blue undertone. Quarter strength. Trim & ceilings.',
    tags: { performance: [], location: ['internal'], materialFamily: ['plaster'] },
  }, { kind: 'paint', tone: '#ecede8', sheen: 'Matt' },
    { projects: ['p-clifton'] }),

  mk('m-052', 'PNT·03', 'Milk', 'paint', {
    brand: "Porter's Paints", colour_name: 'Milk', colour_code: 'MILK',
    sheen_paint: 'matt', paint_system: 'Aqua Eggshell', coats: 2,
    coverage_per_l: 12, price_per_l: 145, substrate_required: 'Plaster, primed timber',
    supplier: "Porter's Paints", country_of_origin: 'AU',
    finish: 'Dead Flat',
    unit_cost: 22, unit: 'm²', lead_time: '2 wk',
    notes: 'Warm buttery off-white. Chalky matt reads soft in morning light.',
    tags: { performance: [], location: ['internal'], materialFamily: ['plaster'] },
  }, { kind: 'paint', tone: '#ece7d8', sheen: 'Dead Flat' },
    { projects: ['p-hawthorn'] }),

  mk('m-053', 'PNT·04', 'Stone', 'paint', {
    brand: "Porter's Paints", colour_name: 'Stone', colour_code: 'STONE',
    sheen_paint: 'low-sheen', paint_system: 'Aqua Low Sheen', coats: 2,
    coverage_per_l: 12, price_per_l: 145, substrate_required: 'Plaster, primed MDF',
    supplier: "Porter's Paints", country_of_origin: 'AU',
    finish: 'Low Sheen',
    unit_cost: 22, unit: 'm²', lead_time: '2 wk',
    notes: 'Mid warm grey. Reads taupe against timber. Wet-area rated.',
    tags: { performance: ['wet-area'], location: ['wet-area', 'internal'], materialFamily: ['plaster'] },
  }, { kind: 'paint', tone: '#b5ad9f', sheen: 'Low Sheen' }),

  mk('m-054', 'PNT·05', 'Bondi', 'paint', {
    brand: 'Bauwerk', colour_name: 'Bondi', colour_code: 'BONDI',
    sheen_paint: 'matt', paint_system: 'Mineral Limewash', coats: 2,
    coverage_per_l: 8, price_per_l: 220, substrate_required: 'Plaster, masonry',
    supplier: 'Bauwerk Colour', country_of_origin: 'AU',
    finish: 'Mineral Matt',
    unit_cost: 44, unit: 'm²', lead_time: '3 wk',
    notes: 'Lime-based limewash. Soft chalk finish with subtle cloudy variation. Not wash-safe.',
    tags: { performance: ['low-voc'], location: ['internal'], materialFamily: ['plaster'] },
  }, { kind: 'paint', tone: '#e6dcc4', sheen: 'Mineral Matt' },
    { projects: ['p-fitzroy'] }),

  mk('m-055', 'PNT·06', 'Roman', 'paint', {
    brand: 'Bauwerk', colour_name: 'Roman', colour_code: 'ROMAN',
    sheen_paint: 'matt', paint_system: 'Mineral Limewash', coats: 2,
    coverage_per_l: 8, price_per_l: 220, substrate_required: 'Plaster, masonry',
    supplier: 'Bauwerk Colour', country_of_origin: 'AU',
    finish: 'Mineral Matt',
    unit_cost: 44, unit: 'm²', lead_time: '3 wk',
    notes: 'Deep terracotta brown. Dramatic feature walls. Apply over Bauwerk basecoat.',
    tags: { performance: ['low-voc'], location: ['internal'], materialFamily: ['plaster'] },
  }, { kind: 'paint', tone: '#6e5544', sheen: 'Mineral Matt' }),

  mk('m-056', 'PNT·07', 'Seed', 'paint', {
    brand: 'Haymes', colour_name: 'Seed', colour_code: 'H168W',
    sheen_paint: 'semi-gloss', paint_system: 'Ultra Premium Interior', coats: 2,
    coverage_per_l: 14, price_per_l: 115, substrate_required: 'Primed timber, MDF',
    supplier: 'Haymes Paint', country_of_origin: 'AU',
    finish: 'Semi Gloss',
    unit_cost: 16, unit: 'm²', lead_time: '1 wk',
    notes: 'Soft green-beige. Use on trim and joinery for subtle warmth.',
    tags: { performance: [], location: ['internal'], materialFamily: ['plaster'] },
  }, { kind: 'paint', tone: '#cec4a9', sheen: 'Semi Gloss' }),

  mk('m-057', 'PNT·08', 'Black Caviar', 'paint', {
    brand: 'Haymes', colour_name: 'Black Caviar', colour_code: 'H5BK',
    sheen_paint: 'matt', paint_system: 'Ultra Premium Interior', coats: 2,
    coverage_per_l: 14, price_per_l: 115, substrate_required: 'Plasterboard',
    supplier: 'Haymes Paint', country_of_origin: 'AU',
    finish: 'Matt',
    unit_cost: 16, unit: 'm²', lead_time: '1 wk',
    notes: 'Near-true black with hint of warm brown. Dramatic in low light.',
    tags: { performance: [], location: ['internal'], materialFamily: ['plaster'] },
  }, { kind: 'paint', tone: '#1c1a18', sheen: 'Matt' },
    { projects: ['p-brunswick'] }),

  mk('m-058', 'PNT·09', 'Alabaster', 'paint', {
    brand: 'Resene', colour_name: 'Alabaster', colour_code: 'R60H',
    sheen_paint: 'low-sheen', paint_system: 'SpaceCote Low Sheen', coats: 2,
    coverage_per_l: 14, price_per_l: 105, substrate_required: 'Plasterboard, primed MDF',
    supplier: 'Resene', country_of_origin: 'NZ',
    finish: 'Low Sheen',
    unit_cost: 14, unit: 'm²', lead_time: '1 wk',
    notes: 'Warm white with yellow undertone. Forgiving on north-facing rooms.',
    tags: { performance: [], location: ['internal'], materialFamily: ['plaster'] },
  }, { kind: 'paint', tone: '#f4eee3', sheen: 'Low Sheen' }),

  mk('m-059', 'PNT·10', 'Monument', 'paint', {
    brand: 'Taubmans', colour_name: 'Monument', colour_code: 'T12.12.5',
    sheen_paint: 'matt', paint_system: 'Endure Interior', coats: 2,
    coverage_per_l: 14, price_per_l: 88, substrate_required: 'Plasterboard, primed timber',
    supplier: 'Taubmans', country_of_origin: 'AU',
    finish: 'Matt',
    unit_cost: 12, unit: 'm²', lead_time: '1 wk',
    notes: 'Charcoal grey. Colorbond match. Ceilings in heritage interiors.',
    tags: { performance: [], location: ['internal'], materialFamily: ['plaster'] },
  }, { kind: 'paint', tone: '#3c3d3d', sheen: 'Matt' }),

  // ─────────── TEXTILE / SOFT ───────────
  mk('m-040', 'TXT·01', 'Kvadrat Remix 3 — 0933', 'textile', {
    supplier: 'Kvadrat Maharam', country_of_origin: 'DK',
    finish: 'Wool blend', thickness: 1.5, dimensions: '140cm roll',
    unit_cost: 186, unit: 'lm', lead_time: '4 wk',
    notes: '90% new wool / 10% nylon. 40,000 Martindale. EN1021 1&2. Upholstery, banquettes.',
    tags: { performance: ['fire-rated'], location: ['internal'], materialFamily: ['textile'] },
  }, { kind: 'solid', tone: '#8a7560' },
    { projects: ['p-clifton'] }),

  mk('m-041', 'TXT·02', 'Armadillo Drift Weave — Oat', 'rug', {
    supplier: 'Armadillo', country_of_origin: 'IN / AU',
    finish: 'Hand-knotted', thickness: 12, dimensions: 'Made to size',
    unit_cost: 920, unit: 'm²', lead_time: '12 wk',
    notes: 'GoodWeave-certified. Wool / jute. Custom sizing available.',
    tags: { performance: [], location: ['internal'], materialFamily: ['textile'] },
  }, { kind: 'weave', tone: '#cfc2a6', grain: '#9a8c6c' }),

  // ─────────── APPLIANCE ───────────
  mk('m-100', 'APP·01', 'Pyrolytic Oven 600 — Graphite', 'appliance', {
    supplier: 'Miele', country_of_origin: 'DE', model: 'H7860 BP',
    finish: 'Graphite grey', dimensions: '595×595×570',
    unit_cost: 6490, unit: 'ea', lead_time: '4 wk',
    trade: 'Electrical',
    notes: 'Single cavity pyrolytic oven. MasterChef Plus programmes. Concealed hinges. Hardwired 15A.',
    tags: { performance: [], location: ['internal'], materialFamily: ['metal'] },
  }, { kind: 'solid', tone: '#3a3a3c' },
    { projects: ['p-hawthorn'], _touched: { trade: true } }),

  mk('m-101', 'APP·02', 'Induction Cooktop 900', 'appliance', {
    supplier: 'Bora', country_of_origin: 'DE', model: 'PURU',
    finish: 'Black glass', dimensions: '830×515',
    unit_cost: 11200, unit: 'ea', lead_time: '8 wk',
    trade: 'Electrical',
    notes: 'Integrated downdraft extraction. 4 zones, bridge function. Requires 32A dedicated circuit + exhaust duct.',
    tags: { performance: [], location: ['internal'], materialFamily: ['glass'] },
  }, { kind: 'solid', tone: '#151517' },
    { projects: ['p-brunswick', 'p-hawthorn'], _touched: { trade: true } }),

  mk('m-102', 'APP·03', 'Integrated Dishwasher 600', 'appliance', {
    supplier: 'Asko', country_of_origin: 'SE', model: 'DFI746U',
    finish: 'Panel-ready', dimensions: '598×820×570',
    unit_cost: 2890, unit: 'ea', lead_time: '3 wk',
    trade: 'Plumbing',
    notes: 'Fully integrated, custom door. 15 place settings. Requires 10A + cold water + 40mm waste.',
    tags: { performance: ['wet-area'], location: ['wet-area'], materialFamily: ['metal'] },
  }, { kind: 'solid', tone: '#c9c2b3' },
    { projects: ['p-brunswick', 'p-clifton', 'p-hawthorn'], _touched: { trade: true } }),

  mk('m-103', 'APP·04', 'Integrated Fridge/Freezer 760', 'appliance', {
    supplier: 'Liebherr', country_of_origin: 'DE', model: 'ECBN 6256',
    finish: 'Panel-ready', dimensions: '762×2125×610',
    unit_cost: 14900, unit: 'ea', lead_time: '12 wk',
    trade: 'Joinery',
    notes: 'BioFresh + NoFrost. Fully integrated door panel. Plumbed ice/water. Specify hinge side in shop drawings.',
    tags: { performance: [], location: ['internal'], materialFamily: ['metal'] },
  }, { kind: 'solid', tone: '#d4cec2' },
    { projects: ['p-hawthorn'], _touched: { trade: true } }),

  mk('m-104', 'APP·05', 'Concealed Rangehood 900', 'rangehood', {
    supplier: 'Qasair', country_of_origin: 'AU', model: 'Grandeur 900',
    finish: 'Stainless', dimensions: '900×320×510',
    unit_cost: 3420, unit: 'ea', lead_time: '4 wk',
    trade: 'Electrical',
    notes: 'Undermount, concealed behind custom joinery. 1200m³/h. Ducted externally.',
    tags: { performance: [], location: ['internal'], materialFamily: ['metal'] },
  }, { kind: 'brushed', tone: '#b8b5ae', grain: '#8a8780' },
    { projects: ['p-brunswick', 'p-hawthorn'] }),

  // ─────────── TAPWARE / SANITARY ───────────
  mk('m-110', 'FIT·01', 'Icon Mixer — Aged Brass', 'tapware', {
    supplier: 'Brodware', country_of_origin: 'AU', model: 'City Stik 1.8700',
    finish: 'Aged Brass',
    unit_cost: 1480, unit: 'ea', lead_time: '6 wk',
    trade: 'Plumbing',
    notes: 'Wall-mounted basin mixer. 180mm spout. WELS 5-star. Living finish — will patina naturally.',
    tags: { performance: ['wet-area'], location: ['wet-area'], materialFamily: ['metal'] },
  }, { kind: 'solid', tone: '#8a6b3a' },
    { projects: ['p-hawthorn'] }),

  mk('m-111', 'FIT·02', 'Sussex Scala Shower Set', 'shower', {
    supplier: 'Sussex', country_of_origin: 'AU', model: 'SC.04.CP',
    finish: 'Chrome',
    unit_cost: 2260, unit: 'ea', lead_time: '3 wk',
    trade: 'Plumbing',
    notes: 'Wall-mount rainhead + handshower diverter. Australian-made, lifetime warranty.',
    tags: { performance: ['wet-area'], location: ['wet-area'], materialFamily: ['metal'] },
  }, { kind: 'solid', tone: '#c7c9cb' },
    { projects: ['p-clifton'] }),

  mk('m-112', 'FIT·03', 'Above-counter Basin — Concrete', 'basin', {
    supplier: 'Concrete Nation', country_of_origin: 'AU',
    finish: 'Sealed concrete', dimensions: 'Ø400×120',
    unit_cost: 890, unit: 'ea', lead_time: '5 wk',
    trade: 'Plumbing',
    notes: 'Hand-cast GFRC. 40mm waste. Sealed for wet-area use. Colour variation expected.',
    tags: { performance: ['wet-area'], location: ['wet-area'], materialFamily: ['concrete'] },
  }, { kind: 'stone', tone: '#a49e93', grain: '#7a7569' },
    { projects: ['p-hawthorn'] }),

  mk('m-113', 'FIT·04', 'Wall-hung Pan + Cistern', 'wc', {
    supplier: 'Geberit', country_of_origin: 'CH', model: 'Sigma 8',
    finish: 'White', dimensions: '360×540',
    unit_cost: 1740, unit: 'ea', lead_time: '2 wk',
    trade: 'Plumbing',
    notes: 'In-wall cistern with Sigma 50 plate. Rimless pan. WELS 4-star.',
    tags: { performance: ['wet-area'], location: ['wet-area'], materialFamily: ['ceramic'] },
  }, { kind: 'solid', tone: '#f5f2ed' },
    { projects: ['p-brunswick', 'p-clifton', 'p-hawthorn'] }),

  mk('m-114', 'FIT·05', 'Freestanding Bath 1700', 'bath', {
    supplier: 'Apaiser', country_of_origin: 'AU', model: 'Haven',
    finish: 'Marble composite — Bone', dimensions: '1700×780×580',
    unit_cost: 6890, unit: 'ea', lead_time: '10 wk',
    trade: 'Plumbing',
    notes: 'Marble & resin composite. Heat-retentive. Integrated overflow. Lifting crew required.',
    tags: { performance: ['wet-area'], location: ['wet-area'], materialFamily: ['stone', 'composite'] },
  }, { kind: 'solid', tone: '#ece4d5' },
    { projects: ['p-hawthorn'] }),

  // ─────────── LIGHTING ───────────
  mk('m-120', 'LGT·01', 'Dot 40 Pendant — Aged Brass', 'pendant', {
    supplier: 'Volker Haug', country_of_origin: 'AU', model: 'Dot 40',
    finish: 'Aged brass', dimensions: 'Ø400, 1.5m drop',
    unit_cost: 2140, unit: 'ea', lead_time: '8 wk',
    trade: 'Electrical',
    dimmable: true,
    notes: 'Spun brass pendant, E27. Dimmable with Leading-edge. Hand-finished — slight variation.',
    tags: { performance: [], location: ['internal'], materialFamily: ['metal'] },
  }, { kind: 'solid', tone: '#b8955a' },
    { projects: ['p-hawthorn'] }),

  mk('m-121', 'LGT·02', 'Trimless LED Downlight 75', 'downlight', {
    supplier: 'Unios', country_of_origin: 'AU', model: 'Titan X 9W',
    finish: 'Matte white', dimensions: 'Ø92 cutout',
    unit_cost: 215, unit: 'ea', lead_time: '1 wk',
    trade: 'Electrical',
    wattage_w: 9, colour_temperature_k: 2700, dimmable: true,
    notes: '9W LED, 2700K, 90CRI. Trimless plaster-in frame. Dimmable. IC-F rated.',
    tags: { performance: [], location: ['internal'], materialFamily: ['metal'] },
  }, { kind: 'solid', tone: '#ecebe6' },
    { projects: ['p-brunswick', 'p-clifton', 'p-hawthorn'] }),

  mk('m-122', 'LGT·03', 'Bai Wall Sconce — Plaster', 'wall_light', {
    supplier: 'Apparatus', country_of_origin: 'US', model: 'Bai',
    finish: 'Lime plaster', dimensions: 'Ø300×110',
    unit_cost: 3890, unit: 'ea', lead_time: '16 wk',
    trade: 'Electrical',
    colour_temperature_k: 2200,
    notes: 'Hand-applied lime plaster over metal. Integrated LED 2200K. Hardwired. Lead time reflects studio production.',
    tags: { performance: [], location: ['internal'], materialFamily: ['plaster'] },
  }, { kind: 'solid', tone: '#eae3d2' }),

  mk('m-123', 'LGT·04', 'Linear Strip — 3000K', 'linear_light', {
    supplier: 'Klik Systems', country_of_origin: 'AU', model: 'KStrip Pro',
    finish: 'Aluminium channel', dimensions: 'Per-metre',
    unit_cost: 145, unit: 'm', lead_time: '2 wk',
    trade: 'Electrical',
    wattage_w: 14, colour_temperature_k: 2700, dimmable: true,
    notes: '24V, 14W/m, 2700K, 95CRI. Recessed aluminium channel + opal diffuser. Requires dimmable driver (spec separately).',
    tags: { performance: [], location: ['internal'], materialFamily: ['metal'] },
  }, { kind: 'brushed', tone: '#c4c2bc' },
    { projects: ['p-brunswick', 'p-hawthorn'] }),

  // ─────────── JOINERY HARDWARE ───────────
  mk('m-130', 'JNY·01', 'Mardeco M-Series Pull 192', 'joinery_hardware', {
    supplier: 'Mardeco', country_of_origin: 'AU', model: 'M5022.192',
    finish: 'Brushed brass', dimensions: '192mm CTC',
    unit_cost: 84, unit: 'ea', lead_time: '1 wk',
    trade: 'Joinery',
    notes: 'Solid brass cabinet pull. 192mm centres, 212mm overall. M4 threaded bolts included.',
    tags: { performance: [], location: ['internal'], materialFamily: ['metal'] },
  }, { kind: 'brushed', tone: '#b89762', grain: '#8a6e40' },
    { projects: ['p-brunswick', 'p-hawthorn'] }),

  mk('m-131', 'JNY·02', 'Blum Legrabox Drawer Runner', 'joinery_hardware', {
    supplier: 'Blum', country_of_origin: 'AT', model: 'Legrabox Pure 550mm',
    finish: 'Orion grey', dimensions: '550×193',
    unit_cost: 168, unit: 'set', lead_time: '1 wk',
    trade: 'Joinery',
    notes: '40kg rated. Tip-on Blumotion soft-close. Full extension. Specify drawer height M/K/C.',
    tags: { performance: [], location: ['internal'], materialFamily: ['metal'] },
  }, { kind: 'solid', tone: '#6a6d70' },
    { projects: ['p-brunswick', 'p-clifton', 'p-hawthorn'] }),

  mk('m-132', 'JNY·03', 'Concealed Hinge — Blum Clip Top', 'joinery_hardware', {
    supplier: 'Blum', country_of_origin: 'AT', model: '71B3550',
    finish: 'Nickel-plated', dimensions: '110° opening',
    unit_cost: 12, unit: 'ea', lead_time: '1 wk',
    trade: 'Joinery',
    notes: 'Clip-on mount, Blumotion integrated soft-close. 110° opening. Spec mounting plate separately.',
    tags: { performance: [], location: ['internal'], materialFamily: ['metal'] },
  }, { kind: 'solid', tone: '#c8c5be' },
    { projects: ['p-brunswick', 'p-clifton', 'p-hawthorn'] }),

  // ─────────── FF&E: SEATING / TABLES → 'furniture' ───────────
  mk('m-200', 'FFE·01', 'Wishbone Chair CH24', 'furniture', {
    supplier: 'Cult', country_of_origin: 'DK', model: 'Carl Hansen CH24',
    finish: 'Oiled oak, natural paper cord', dimensions: '550×520×760 (SH 450)',
    unit_cost: 1680, unit: 'ea', lead_time: '10 wk',
    notes: 'Hans Wegner 1949. FSC-certified oak. 120 hand-tied paper cord weaves.',
    tags: { performance: [], location: ['internal'], materialFamily: ['timber'] },
  }, { kind: 'woodgrain', tone: '#c9a67a', grain: '#8a6236' },
    { projects: ['p-hawthorn'] }),

  mk('m-201', 'FFE·02', 'Mags Soft 2.5-seat Sofa', 'furniture', {
    supplier: 'Living Edge', country_of_origin: 'DK', model: 'HAY Mags Soft',
    finish: 'Vidar 3 / 0733 oatmeal', dimensions: '2280×1050×700',
    unit_cost: 6840, unit: 'ea', lead_time: '14 wk',
    notes: 'Modular deep-seat sofa. Feather-wrapped foam. Fabric removable for cleaning.',
    tags: { performance: [], location: ['internal'], materialFamily: ['textile'] },
  }, { kind: 'solid', tone: '#c9bfa6' },
    { projects: ['p-brunswick'] }),

  mk('m-202', 'FFE·03', 'Shaker Counter Stool 650', 'furniture', {
    supplier: 'Mr & Mrs White', country_of_origin: 'AU',
    finish: 'Blackened ash', dimensions: 'Ø380×650',
    unit_cost: 890, unit: 'ea', lead_time: '6 wk',
    notes: 'Turned solid ash. Ebonised with water-based stain. Bench-made in Melbourne.',
    tags: { performance: [], location: ['internal'], materialFamily: ['timber'] },
  }, { kind: 'solid', tone: '#2a2622' },
    { projects: ['p-brunswick', 'p-hawthorn'] }),

  mk('m-210', 'FFE·10', 'Plank Dining Table 2400', 'furniture', {
    supplier: 'Fred International', country_of_origin: 'DK', model: 'Fredericia Plank',
    finish: 'Soaped oak', dimensions: '2400×1000×720',
    unit_cost: 9420, unit: 'ea', lead_time: '16 wk',
    notes: 'Solid FSC oak, trestle base. Soaped finish — periodic re-soaping required.',
    tags: { performance: [], location: ['internal'], materialFamily: ['timber'] },
  }, { kind: 'woodgrain', tone: '#d6c5a4', grain: '#997a4e' },
    { projects: ['p-hawthorn'] }),

  mk('m-211', 'FFE·11', 'Tulou Coffee Table', 'furniture', {
    supplier: 'Cult', country_of_origin: 'DK', model: 'Cappellini Tulou',
    finish: 'Terracotta', dimensions: '700×420',
    unit_cost: 2180, unit: 'ea', lead_time: '12 wk',
    notes: 'Rotationally-moulded polyethylene. Indoor/outdoor. Lightweight.',
    tags: { performance: ['external-grade'], location: ['internal', 'external'], materialFamily: ['plastic'] },
  }, { kind: 'solid', tone: '#a06446' },
    { projects: ['p-brunswick'] }),

  // ─────────── FF&E: SOFT (rug / curtain) ───────────
  mk('m-220', 'FFE·20', 'Drift Weave Rug — 3×4m', 'rug', {
    supplier: 'Armadillo', country_of_origin: 'IN / AU', model: 'Drift Weave — Oat',
    finish: 'Hand-knotted wool/jute', dimensions: '3000×4000',
    unit_cost: 11040, unit: 'ea', lead_time: '14 wk',
    notes: 'GoodWeave-certified. 12mm pile. Underlay recommended on hard floors.',
    tags: { performance: [], location: ['internal'], materialFamily: ['textile'] },
  }, { kind: 'weave', tone: '#cfc2a6', grain: '#9a8c6c' },
    { projects: ['p-hawthorn'] }),

  mk('m-221', 'FFE·21', 'Linen Curtain — Heavy Weight', 'curtain', {
    supplier: 'Mokum', country_of_origin: 'AU', model: 'Cascade — Fog',
    finish: 'S-fold, blockout lining', dimensions: 'Made to size',
    unit_cost: 420, unit: 'm', lead_time: '6 wk',
    notes: '100% Belgian linen, 320gsm. S-fold heading on concealed track. Specify drop + stack allowance.',
    tags: { performance: [], location: ['internal'], materialFamily: ['textile'] },
  }, { kind: 'weave', tone: '#c5c3bc', grain: '#918f88' },
    { projects: ['p-clifton', 'p-hawthorn'] }),

  // ─────────── FF&E: LIGHTING (decorative table / floor) ───────────
  mk('m-230', 'FFE·30', 'Flowerpot VP3 Table Lamp', 'pendant', {
    supplier: 'Cult', country_of_origin: 'DK', model: '&Tradition VP3',
    finish: 'Matte red', dimensions: 'Ø230×360',
    unit_cost: 640, unit: 'ea', lead_time: '4 wk',
    notes: 'Verner Panton 1968 reissue. E14 LED. Plug-in — specify cable colour.',
    tags: { performance: [], location: ['internal'], materialFamily: ['metal'] },
  }, { kind: 'solid', tone: '#c34a3a' },
    { projects: ['p-brunswick'] }),

  mk('m-231', 'FFE·31', 'Akari 10A Floor Lamp', 'pendant', {
    supplier: 'Anibou', country_of_origin: 'JP', model: 'Isamu Noguchi 10A',
    finish: 'Washi paper / bamboo', dimensions: 'Ø450×1600',
    unit_cost: 1290, unit: 'ea', lead_time: '8 wk',
    notes: 'Handmade Gifu washi. Single E27 bulb. Packs flat for shipping.',
    tags: { performance: [], location: ['internal'], materialFamily: ['textile', 'timber'] },
  }, { kind: 'solid', tone: '#ebe2c8' },
    { projects: ['p-hawthorn'] }),

  // ─────────── FF&E: ART / DECOR ───────────
  mk('m-240', 'FFE·40', 'Round Brass Mirror 900', 'mirror', {
    supplier: 'Middle of Nowhere', country_of_origin: 'AU', model: 'Bjorn 900',
    finish: 'Antique brass frame', dimensions: 'Ø900×20',
    unit_cost: 780, unit: 'ea', lead_time: '3 wk',
    notes: 'Solid brass-plated frame. 4mm silver mirror. D-ring + French-cleat compatible.',
    tags: { performance: [], location: ['internal'], materialFamily: ['metal', 'glass'] },
  }, { kind: 'solid', tone: '#a88654' },
    { projects: ['p-hawthorn'] }),

  mk('m-241', 'FFE·41', 'Terracotta Vessel — Large', 'art', {
    supplier: 'The DEA Store', country_of_origin: 'GR',
    finish: 'Unglazed terracotta', dimensions: 'Ø420×620',
    unit_cost: 540, unit: 'ea', lead_time: '8 wk',
    notes: 'Hand-thrown on Crete. Indoor use only — unsealed. Subtle variation per piece.',
    tags: { performance: [], location: ['internal'], materialFamily: ['ceramic'] },
  }, { kind: 'solid', tone: '#b86f4a' }),
];

const PROJECTS = [
  { id: 'p-brunswick', code: '23·14', name: 'Brunswick Residence',
    client: 'Ng / Park', stage: 'Construction', type: 'New build — single dwelling',
    address: 'Brunswick VIC', commenced: '2024-03', completion: '2026-08',
    budget: 'A$2.4M', lead: 'ED',
    locations: [], locationIds: [], libraryIds: [],
    description: 'Brick veneer replacement house on a mid-block 380m² lot. Two-storey, four-bedroom. Material palette centred on local hardwoods and recycled brick, with a restrained joinery package throughout.' },
  { id: 'p-clifton', code: '24·02', name: 'Clifton Hill Addition',
    client: 'Hassall', stage: 'Documentation', type: 'Rear addition + renovation',
    address: 'Clifton Hill VIC', commenced: '2024-09', completion: '2026-03',
    budget: 'A$1.1M', lead: 'LM',
    locations: [], locationIds: [], libraryIds: [],
    description: 'Two-room rear addition to a Victorian terrace. Cedar castellation screen to north, bluestone plinth, melamine-faced joinery with veneer feature shelving.' },
  { id: 'p-hawthorn', code: '23·07', name: 'Hawthorn East House',
    client: 'Fidalgo', stage: 'Handover', type: 'Full renovation',
    address: 'Hawthorn East VIC', commenced: '2023-06', completion: '2026-04',
    budget: 'A$3.8M', lead: 'ED',
    locations: [], locationIds: [], libraryIds: [],
    description: 'Heritage-listed Edwardian. Full interior refit with Elba Bianco marble kitchen, white oak flooring, painted VJ panelling.' },
  { id: 'p-fitzroy', code: '25·01', name: 'Fitzroy Studio',
    client: 'In-house', stage: 'Concept', type: 'Workplace / gallery',
    address: 'Fitzroy VIC', commenced: '2025-11', completion: '2026-12',
    budget: 'A$640K', lead: 'TH',
    locations: [], locationIds: [], libraryIds: [],
    description: 'Ground-floor warehouse fitout for practice studio + monthly gallery hang. Palette TBC.' },
];

// CATEGORIES is now derived from window.DEFAULT_SCHEMA_V5 at runtime; keep
// the old global as an empty array so any straggling references don't crash.
const CATEGORIES = [];

const PAINT_BRANDS = ['Dulux', "Porter's Paints", 'Bauwerk', 'Haymes', 'Resene', 'Taubmans', 'Wattyl'];
const PAINT_SHEENS = ['Dead Flat', 'Matt', 'Mineral Matt', 'Low Sheen', 'Eggshell', 'Satin', 'Semi Gloss', 'Gloss'];

const LIBRARIES = [
  { id: 'lib-finishes',   name: 'Finishes',         description: 'Timber, stone, composite, metal, paint, textile — surfaces you specify by m².' },
  { id: 'lib-appliances', name: 'Appliances',       description: 'Ovens, cooktops, dishwashers, fridges, rangehoods.' },
  { id: 'lib-fittings',   name: 'Fittings',         description: 'Tapware, basins, sinks, toilets, baths, showers.' },
  { id: 'lib-lighting',   name: 'Lighting',         description: 'Hard-wired architectural lighting — pendants, downlights, sconces, strip.' },
  { id: 'lib-joinery',    name: 'Joinery hardware', description: 'Handles, pulls, hinges, runners, latches.' },
  { id: 'lib-ffe',        name: 'FF&E',             description: 'Furniture, fixtures, equipment — seating, tables, soft, decorative.' },
];

// Library auto-assignment by v5 category. Materials with no libraryIds get
// bucketed by category into one of the seed libraries.
const CATEGORY_TO_LIBRARY = {
  // Finishes
  paint: 'lib-finishes', timber: 'lib-finishes', stone: 'lib-finishes',
  laminate: 'lib-finishes', metal: 'lib-finishes', textile: 'lib-finishes',
  tile: 'lib-finishes', vinyl: 'lib-finishes', cork: 'lib-finishes',
  carpet: 'lib-finishes', terrazzo: 'lib-finishes',
  // Appliances
  appliance: 'lib-appliances', rangehood: 'lib-appliances',
  // Fittings (sanitary)
  tapware: 'lib-fittings', basin: 'lib-fittings', sink: 'lib-fittings',
  wc: 'lib-fittings', bath: 'lib-fittings', shower: 'lib-fittings',
  mirror: 'lib-fittings',
  // Lighting
  light: 'lib-lighting', pendant: 'lib-lighting', downlight: 'lib-lighting',
  wall_light: 'lib-lighting', linear_light: 'lib-lighting', track_light: 'lib-lighting',
  // Joinery
  joinery_hardware: 'lib-joinery',
  // FF&E
  furniture: 'lib-ffe', soft_furnishing: 'lib-ffe', curtain: 'lib-ffe',
  blind: 'lib-ffe', rug: 'lib-ffe', art: 'lib-ffe',
};

MATERIALS.forEach(m => {
  if (m.libraryIds && m.libraryIds.length) return;
  const lib = CATEGORY_TO_LIBRARY[m.category] || 'lib-finishes';
  m.libraryIds = [lib];
});

window.MATERIALS = MATERIALS;
window.PROJECTS = PROJECTS;
window.CATEGORIES = CATEGORIES;
window.LIBRARIES = LIBRARIES;
window.PAINT_BRANDS = PAINT_BRANDS;
window.PAINT_SHEENS = PAINT_SHEENS;
// Phase 4 will retire KIND_TO_LIBRARY entirely — keep an empty stub for any
// straggling reads.
window.KIND_TO_LIBRARY = {};
