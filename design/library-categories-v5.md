# Library categories & fields — v5 schema

**Status:** draft for v1, drafted with the user, pending Phase 1 implementation
**Total:** 20 groups, 240 categories
**Inheritance:** common (workspace) → group → category
**Aliases:** every category may have a `aliases: string[]` for search

## Conventions

**Field shape:**
```
field_id (type [options]) — short note if useful
```

**Field types:**
- `text` — short string
- `longText` — multi-line
- `number` — numeric (units in the note)
- `currency` — money
- `boolean` — yes/no
- `select` — single choice from listed options
- `multi-select` — multiple choices
- `date` — calendar date
- `url` — link
- `color` — colour swatch
- `swatchRef` — links to another item's swatch
- `itemRef[→category]` — links to another Library item, optionally filtered by category. `itemRef multi[→category]` for multiple references.
- `tag` — value from the global tag vocabulary

**"slot" categories** carry minimal fields and exist primarily as placeholders for un-spec'd schedule rows.

**Inheritance:** every item renders `common ∪ group.fields ∪ category.fields`. A category that adds nothing simply inherits common + group.

## Common fields (12)

Inherited by every category. Defined once.

| Field | Type | Notes |
|---|---|---|
| `code` | text | Auto-generated per category, user-editable. e.g. `TBR·01` |
| `name` | text | The user-given label |
| `supplier` | text or itemRef→Supplier | Company / vendor |
| `country_of_origin` | text | "Australia", "Italy", … |
| `lead_time` | text | "2–3 wk" |
| `unit` | select | ea / m² / m / lm / kg / set / item / L / m³ — defaults from category's `defaultUnit` |
| `unit_cost` | currency | |
| `swatch` | swatchRef | Colour / texture / glyph chip |
| `image_ref` | url | Reference image link |
| `notes` | longText | Free spec text |
| `tags` | multi-select tag | Performance + location + material tags |
| `libraries` | multi-select | User libraries this item lives in |

## Tags vocabulary

Three orthogonal axes. All multi-select. User can extend in field manager.

**Performance** — fire-rated · acoustic · smoke-rated · security · external-grade · wet-area · slip-resistant · accessible · automatic · weatherproof · non-combustible · low-VOC

**Location** — internal · external · wet area · public · back-of-house · roof · semi-exposed · clinical · food prep · high-traffic

**Material family** — timber · stone · ceramic · concrete · metal · glass · plastic · laminate · composite · textile · cork · rubber · vinyl · plaster · gypsum

---

## 1. Surfaces (4 — slots)

**Group fields:** `extent_of_works (longText)` · `substrate (text)`

**Wall** [m² · slot]
**Floor** [m² · slot]
**Ceiling** [m² · slot]
**Soffit** [m² · slot]

---

## 2. Trims (3 — slots)

**Group fields:** `profile_ref (itemRef→Timber|Metal|Composite)` · `height (number) mm` · `material (text)`

**Skirting** [lm · slot]
**Architrave** [lm · slot]
**Cornice** [lm · slot]

---

## 3. Finishes (21 — products)

**Group fields:** `application_area (multi-select: floor, wall, ceiling, exterior wall, soffit, joinery, splashback, benchtop)` · `substrate_required (text)` · `coverage_unit (text)`

**Paint** [m² applied; L purchased]
- brand · range
- colour_name · colour_code
- sheen (select: matt, low-sheen, satin, semi-gloss, gloss)
- system (text) · coats (number) · coverage_per_L (number m²/L)
- LRV (number)
- primer_required (text)

**Wallpaper** [m²]
- brand · range · pattern
- roll_width (number) mm · roll_length (number) m · pattern_repeat (number) cm
- matching_method (select: free, straight, drop)
- paste_type (select: paste-the-wall, paste-the-paper, pre-pasted)

**Tile** [m²]
- brand · range
- format (text) — "300×600"
- finish (select: gloss, satin, matt, anti-slip, structured, polished, lappato)
- slip_rating (select: P0, P1, P2, P3, P4, P5, R9, R10, R11, R12, R13)
- grout_type · grout_colour · grout_width (number) mm
- edge_type (select: rectified, cushion, bevelled)
- suitable_substrate (text)

**Timber** [m²]
- species
- grade (select: select, feature, rustic, character)
- finish (select: oil, lacquer, hard-wax-oil, polyurethane, raw, stained)
- stain_colour
- board_width (number) · board_length (number) · thickness (number) mm
- profile (select: T&G, secret-fix, butt-joint, parquet, end-matched)
- janka_hardness (number)

**Stone** [m²]
- type (select: marble, granite, limestone, travertine, slate, sandstone, quartzite, bluestone, basalt, terrazzo, onyx, soapstone)
- finish (select: polished, honed, brushed, flamed, sandblasted, leathered, aged)
- slab_size (text)
- edge_profile (text)
- sealing_required (boolean)

**Laminate** [m²] · *aliases: HPL, melamine, decor sheet*
- brand · range · decor (text)
- thickness (number) mm
- finish (select: matt, satin, gloss, textured, woodgrain, embossed)
- edge_type (select: PVC, ABS, laser, postformed, square)
- core (select: MR-MDF, particleboard, plywood, compact-laminate)

**Metal** [m²]
- type (select: aluminium, stainless steel, mild steel, brass, copper, zinc, weathering steel, bronze)
- finish (select: anodised, powder-coat, polished, brushed, mill, perforated, embossed, patinated)
- finish_colour
- gauge (text) — e.g. "1.6mm"
- perforation_pattern (text)

**Polished concrete** [m²]
- aggregate_type (select: seeded, exposed-natural, exposed-decorative, integral)
- sheen (select: matt, satin, polished, mirror)
- sealer (text)
- pour_thickness (number) mm
- colour (text)

**Resin floor** [m²]
- system (select: epoxy, polyurethane, MMA, vinyl-ester, cementitious-urethane)
- finish (select: smooth, broadcast, flake, anti-slip)
- colour
- thickness (number) mm
- cove_height (number) mm

**Vinyl** [m²]
- type (select: sheet, plank, tile, LVT, SPC, WPC)
- brand · range · pattern
- plank_size (text) · thickness (number) mm
- wear_layer (number) mm

**Linoleum** [m²]
- brand · range · pattern
- thickness (number) mm
- format (select: sheet, tile)

**Rubber** [m²]
- brand · range
- format (select: sheet, tile, plank)
- thickness (number) mm
- pattern

**Cork** [m²]
- format (select: tile, plank, sheet, roll)
- thickness (number) mm
- finish (select: natural, sealed, stained, painted)

**Terrazzo** [m²]
- type (select: in-situ, precast tile, precast slab)
- base_colour
- aggregate (text)
- sealer (text)
- grout_colour (where tile)

**Polished plaster** [m²]
- type (select: marmorino, venetian, tadelakt, lime-wash, scagliola)
- base_colour
- sheen (select: matt, satin, polished, mirror)
- system_layers (number)
- sealer (text)

**Carpet** [m²]
- type (select: broadloom, tile, plank)
- brand · range
- pile (select: cut, loop, cut-and-loop, twist, level-loop, frieze)
- pile_height (number) mm
- backing (select: action-back, secondary-backing, cushion-back)
- fibre (select: nylon, wool, polyester, polypropylene, blend)

**Textile** [lm]
- brand · range
- composition (text)
- width (number) cm · weight (number) gsm
- fire_rating (text)
- use (select: upholstery, drapery, wallcovering, bed-linen)

**Acoustic panel** [m²]
- brand · range
- core (text)
- facing (select: fabric, wood-veneer, metal, MDF-perforated, gypsum-perforated, PET)
- NRC_rating (number)
- fire_rating (text)
- thickness (number) mm
- format (text)

**Cladding** [m²] · *aliases: external lining*
- brand · profile
- material (select: timber, fibre-cement, metal, composite, masonry, concrete-panel, terracotta)
- finish (text)
- fixing (select: face-fixed, secret-fixed, clip-fixed, rivet-fixed)
- weep_holes_required (boolean)
- cavity_size (number) mm

**Render** [m²]
- system (select: cement, acrylic, lime, polymer-modified)
- finish (select: smooth, sponge, sand, bagged, scratched, textured)
- colour
- thickness (number) mm

**Glazing** [m²]
- type (select: float, low-iron, toughened, laminated, double-glazed, triple-glazed, low-E, fire-rated, acoustic, switchable, obscure)
- thickness (text) — "6/12/6"
- interlayer (text)
- low_E (boolean)
- U_value (number) · SHGC (number) · VLT (number) · Rw (number)
- safety_compliance (text) — AS/NZS 2208 grade
- obscure_pattern (text)

---

## 4. Substrates, barriers & membranes (11)

**Group fields:** `brand` · `thickness (number) mm` · `location_of_use (text)`

**Plasterboard** [m²] · *aliases: Gyprock, GIB, drywall, gypsum board*
- type (select: standard, fire-rated, water-resistant, impact-resistant, acoustic, sound-rated, mould-resistant)
- thickness (number) mm
- sheet_size (text)
- edge (select: square, recessed, tapered)
- fire_rating (text)
- acoustic_Rw (number)

**Fibre cement sheet** [m²] · *aliases: Villaboard, FC sheet, Hardiflex, blueboard*
- type (select: lining, cladding, eaves, compressed, soffit)
- thickness (number) mm
- sheet_size (text)
- finish (select: smooth, textured)

**Cement sheet** [m²]
- thickness (number) mm
- sheet_size (text)
- use (select: lining, soffit, flooring, tile-substrate)

**Plywood lining** [m²]
- species
- thickness (number) mm
- grade (select: A, B, C, D, marine)
- format (text) · finish · structural_rating (text)

**Lining** [m²]
- type (text)
- thickness (number) mm
- sheet_size (text)
- application (select: wall, ceiling, floor, joinery)

**Insulation** [m²] · *aliases: batt, sarking-insulation, ceiling insulation*
- type (select: glasswool, rockwool, polyester, cellulose, EPS, XPS, PIR, PUR, sheep-wool, hemp, mineral-fibre)
- R_value (number)
- thickness (number) mm
- density (number) kg/m³
- acoustic_NRC (number)
- fire_classification (text)

**Membrane** [m²] · *aliases: DPC, sarking, vapour barrier, air barrier, waterproofing, damp-proof course*
- type (select: waterproofing, vapour-barrier, air-barrier, sarking, DPC, roofing, pond-liner, smoke-barrier, root-barrier)
- brand
- thickness (number) mm
- application (text)
- UV_stable (boolean)
- trafficable (boolean)

**Fire stopping** [ea]
- system (text)
- FRL (text)
- brand
- use (select: penetration, joint, collar, pillow, intumescent-strip)

**Sealant** [ea or L]
- type (select: silicone, polyurethane, MS-polymer, acrylic, butyl, fire-rated, hybrid)
- brand · colour · cure_time (text)
- use_class (select: wet-area, expansion, fire, glazing, exterior, structural)

**Sealant joint** [lm]
- joint_width (number) mm · joint_depth (number) mm
- backing_rod (boolean)
- sealant_ref (itemRef → Sealant)
- location (text)

**Movement joint** [lm] · *aliases: expansion joint, control joint, settlement joint*
- joint_type (select: expansion, control, settlement, isolation, structural)
- width (number) mm
- cover_strip (text)
- cover_material (text)

---

## 5. Roof, facade & rainwater (12)

**Group fields:** `material (text)` · `finish (text)` · `AS_compliance (text)` · `fall (text)`

**Roof** [m² · slot]
- extent_of_works (longText)

**Eave** [lm · slot]
- overhang (number) mm
- soffit_finish_ref (itemRef → Finishes)

**Fascia** [lm · slot]
- profile (text)
- depth (number) mm

**Parapet** [lm · slot]
- height (number) mm
- capping_ref (itemRef → Coping)

**Coping** [lm]
- profile (text)
- fall (number) deg
- drip_edge (boolean)

**Bargeboard** [lm]
- profile (text)
- depth (number) mm
- capping (text)

**Gutter** [lm]
- profile (select: quad, half-round, square, box, internal-box, ogee)
- gauge (text)
- size (text)

**Downpipe** [m]
- profile (select: round, rectangular, square)
- size (text)
- fixing (text)

**Rainhead** [ea]
- type (select: standard, overflow, decorative)
- capacity_l_s (number)
- material

**Skylight** *(Skylight is in Group 7 — Doors, windows & openings, not here. Listed there for editor purposes; can be filtered "shows in Roof group" via tags.)*

**Solar PV** [ea or kW]
- panel_wattage (number) W
- panel_dimensions (text)
- mount (select: roof-fixed, roof-integrated, ground, façade)
- inverter (text)
- micro-inverter (boolean)

**Green roof** [m²]
- type (select: extensive, intensive, semi-intensive)
- substrate_depth (number) mm
- drainage_layer (text)
- planting_palette_ref (itemRef multi → Planting)
- waterproofing_ref (itemRef → Membrane)

**Flashing** [lm]
- material (select: zinc, lead, copper, stainless, aluminium, EPDM)
- profile (text)
- gauge (text)
- location (select: pitch-change, valley, ridge, parapet, penetration, sill)

---

## 6. Structure (16)

**Group fields:** `structural_grade (text)` · `engineer_certified (boolean)` · `connection_type (text)`

**Footing** [m³ · slot]
- type (select: pad, strip, raft, piled, screw-pile)
- depth (number) mm
- dimensions (text)

**Slab on ground** [m² · slot]
- thickness (number) mm
- mesh (text)
- vapour_barrier_ref (itemRef → Membrane)
- finish (text)

**Suspended slab** [m² · slot]
- thickness (number) mm
- system (select: PT, RC, formwork, Bondek, hollow-core, voided-slab)
- span (text)

**Column** [ea · slot]
- material
- size (text)
- height (number) mm
- capacity (text)

**Beam** [m · slot]
- material
- profile (text)
- span (number) mm
- capacity (text)

**Structural wall** [m² · slot]
- material
- thickness (number) mm
- capacity (text)

**Lintel** [ea · slot]
- material
- length (number) mm
- span (number) mm
- capacity (text)

**Bracing** [ea · slot]
- type (select: K-brace, X-brace, knee, plywood-shear, strap)
- material

**Framing** [m² · slot]
- material (select: timber, light-gauge-steel, steel, hot-rolled, cold-formed)
- spacing (number) mm
- member_size (text)

**Concrete structure** [m³]
- grade (text) — e.g. N32
- pour_method (select: in-situ, precast, tilt-up)
- reinforcement_ref (itemRef → Reinforcement)
- finish (text)

**Steel structure** [kg or t]
- grade (text)
- section (text)
- connection_type (select: bolted, welded, pinned)
- finish (select: galvanised, painted, primed, weathering, painted-galv)

**Timber structure** [m³]
- species
- grade (text)
- treatment (select: H1, H2, H3, H4, glulam, LVL, CLT, untreated)

**Masonry structure** [m²]
- type (select: brick, blockwork, stone)
- unit_size (text)
- mortar_type (text)

**Reinforcement** [kg or t]
- grade (text) — e.g. N12, R10
- bar_size (text)
- spacing (text)
- mesh_type (text)

**Hob / bund** [lm] · *aliases: kerb-bund, containment-kerb, shower hob*
- type (select: hob, bund)
- height (number) mm
- width (number) mm
- waterproofing_ref (itemRef → Membrane)

**Truss / joist** [ea or lm] · *aliases: rafter, purlin*
- type (select: truss, joist, rafter, purlin)
- material
- depth (number) mm
- spacing (number) mm
- span (number) mm

---

## 7. Doors, windows & openings (8)

**Group fields:** `width (number) mm` · `height (number) mm` · `opening_size (text)` · `performance (multi-tag)`

**Door** [ea]
- opening_type (select: hinged, sliding, cavity-slider, bifold, pivot, barn, pocket, double-hinged, french)
- leaf_material (text or itemRef → Timber|Composite|Metal)
- leaf_thickness (number) mm
- frame_material (text)
- frame_finish (text)
- threshold (text)
- hardware_set (itemRef multi → Joinery hardware)
- glazing_ref (itemRef → Glazing)
- fire_rating (select: none, FRL -/30/30, FRL -/60/60, FRL -/90/90, FRL 60/60/60, FRL 90/90/90)
- acoustic_Rw (number)
- opening_direction (select: LH, RH, double, sliding)
- sill_height (number) mm

**Window** [ea]
- window_type (select: fixed, casement, awning, sliding, double-hung, bifold, louvre, hopper, tilt-turn)
- frame_material (select: aluminium, timber, uPVC, steel, composite)
- frame_finish (text)
- glazing_ref (itemRef → Glazing)
- sill_height (number) mm
- sill_type (text)
- reveal (text)
- cill_finish (text)
- flyscreen (boolean)

**Garage door** [ea]
- type (select: panel-lift, sectional, roller, tilt, side-hinged, bifold)
- material (text)
- finish (text)
- motor (select: belt-drive, chain-drive, screw-drive, manual)
- remote (boolean)
- hardware_set (itemRef multi → Joinery hardware)

**Roller shutter** [ea]
- type (select: security, fire, smoke, insulated, perforated)
- material (text)
- operation (select: manual, motorised)
- slat_profile (text)

**Operable wall** [ea or lm]
- type (select: folding, sliding, demountable, accordion, glass-stack)
- panel_count (number)
- panel_material (text)
- acoustic_Rw (number)
- max_height (number) mm
- stack_arrangement (text)

**Skylight** [ea]
- type (select: fixed, opening, tubular, ventilating)
- size (text)
- glazing_ref (itemRef → Glazing)
- frame_finish (text)
- opening_method (select: manual, electric, solar, rain-sensor)
- flashing_kit_required (boolean)

**Louvre** [ea or m²]
- type (select: fixed, operable, automatic)
- material (text)
- blade_profile (text)
- blade_spacing (number) mm
- opening_drive (select: manual, motorised, BMS-controlled, rain-sensor)

**Access panel** [ea] · *aliases: AP, ceiling hatch, service hatch*
- material (text)
- size (text)
- finish (text)
- fire_rating (text)
- acoustic_rating (number)
- key_required (boolean)

---

## 8. Sanitary, tapware & hydraulic fixtures (14)

**Group fields:** `brand` · `finish` · `WELS_rating (number)` · `connection_type (select: 1/2", 15mm, 20mm, custom)` · `mounting (select: wall, deck, floor, countertop, in-wall)`

**Basin** [ea]
- bowl_shape (select: round, oval, square, rectangle, vessel, semi-recessed, undermount, integral)
- size (text)
- overflow (boolean)
- taphole_count (select: 0, 1, 3)
- drain_type (text)

**Sink** [ea]
- type (select: kitchen, laundry, butlers, prep, bar, bath)
- bowl_count (select: single, 1.5, double, triple)
- size (text)
- drainboard (boolean)
- material (select: stainless, granite-composite, ceramic, copper, fireclay, concrete, solid-surface)
- undermount (boolean)

**WC** [ea] · *aliases: toilet, lavatory, water closet, dunny*
- pan_type (select: wall-faced, close-coupled, back-to-wall, wall-hung, in-wall)
- cistern_type (select: close-coupled, in-wall, exposed, none)
- flush_rating (select: 4.5/3, 4.5/3.5, 6/3)
- trap (select: P, S, skew)
- seat_included (boolean)
- soft_close_seat (boolean)

**Urinal** [ea]
- type (select: bowl, slab, wall-hung, waterless, trough)
- flush_method (select: sensor, manual, timed, none)
- size (text)

**Bath** [ea]
- type (select: freestanding, drop-in, alcove, corner, walk-in, japanese, claw-foot)
- material (select: acrylic, steel-enamel, cast-iron, stone, copper, composite)
- size (text)
- capacity_L (number)
- overflow (boolean)

**Shower** [ea]
- type (select: walk-in, screened, alcove, wet-room, tub-shower)
- base (select: tray, in-situ-floor, raised-deck)
- drainage (select: floor-waste, linear-drain)
- size (text)

**Tapware** [ea]
- type (select: mixer, two-handle, sensor, timed, hose-tap, lever)
- spout_type (select: gooseneck, square, swan, pull-out, waterfall, hidden, none)
- spout_reach (number) mm
- body_material (select: brass, stainless, chrome, plastic)
- handle_count (select: 1, 2, 3)
- WELS_rating (number)

**Floor waste** [ea]
- size (text)
- grate_pattern (text)
- material (select: stainless, brass, chrome, custom-tiled)
- trap_height (number) mm

**Linear drain** [lm] · *aliases: strip drain, channel drain (interior)*
- length (number) mm
- grate_pattern (text)
- material (text)
- trap_depth (number) mm
- slope (select: integrated, site-formed)

**Shower screen** [ea]
- type (select: framed, semi-frameless, frameless, walk-in)
- glass_thickness (number) mm
- glazing_ref (itemRef → Glazing)
- door_type (select: hinged, sliding, pivot, none)

**Mirror** [ea]
- type (select: framed, frameless, demister, illuminated)
- size (text)
- edge (select: bevelled, polished, framed)
- backing (text)
- LED_integrated (boolean)
- demister (boolean)

**Bathroom accessory** [ea] · *aliases: bath fittings*
- type (select: towel-rail, towel-ring, soap-dish, soap-dispenser, toothbrush-holder, toilet-roll-holder, toilet-brush, robe-hook, shelf, basket, grab-rail, shower-niche-shelf)
- finish (text)
- mounting (text)

**Heated towel rail** [ea]
- type (select: hardwired, plug-in, hydronic)
- power_W (number)
- finish (text)
- bar_count (number)
- size (text)

**Niche** [ea · slot]
- size (text)
- location (text)
- finish_ref (itemRef → Finishes)
- waterproofing_required (boolean)

---

## 9. Joinery & casework (10)

**Group fields:** `carcass_material (text)` · `door_finish_ref (itemRef → Finishes)` · `hardware_set_ref (itemRef multi → Joinery hardware)` · `kickboard_height (number) mm` · `soft_close (boolean)`

**Joinery hardware** [ea] · *aliases: ironmongery, cabinet hardware*
- type (select: handle, knob, hinge, drawer-runner, shelf-support, catch, lock, lift-up, drop-down, push-to-open)
- brand
- material (text)
- finish (text)
- soft_close (boolean)
- weight_capacity (number) kg

**Benchtop** [m² or lm]
- material (select: stone, engineered-stone, laminate, timber, stainless, concrete, solid-surface, porcelain, ceramic, glass)
- material_ref (itemRef → Stone|Laminate|Timber|Metal)
- thickness (number) mm
- edge_profile (select: square, eased, bullnose, ogee, mitred, waterfall, chamfered)
- waterfall_ends (select: none, one, both)
- upstand (text)
- joint_locations (text)

**Splashback** [m²]
- material_ref (itemRef → Tile|Glazing|Stone|Metal|Laminate)
- height (number) mm
- grout_or_jointing (text)
- finish (text)

**Vanity** [ea]
- type (select: wall-hung, floor-mounted, semi-recessed, custom)
- basin_ref (itemRef → Basin)
- tapware_ref (itemRef → Tapware)
- drawer_count (number)
- door_count (number)
- size (text)
- interior_finish (text)

**Wardrobe** [ea or lm]
- type (select: built-in, walk-in, freestanding, sliding-door, hinged-door)
- door_type (text)
- interior_fitout (longText)
- drawer_count (number)
- shelf_count (number)
- hanging_count (number)
- mirror (boolean)

**Kitchen joinery** [ea or lm]
- layout (select: galley, L-shape, U-shape, island, single-wall, peninsula)
- base_run_length (number) mm
- wall_run_length (number) mm
- island (boolean)
- pantry_type (select: none, walk-in, butlers, scullery)

**Reception desk** [ea]
- size (text)
- counter_height (select: 720, 900, 1100, custom) mm
- accessible_section (boolean)
- cable_management (boolean)

**Banquette** [lm or ea]
- type (select: built-in, freestanding, modular)
- depth (number) mm
- seat_height (number) mm
- upholstery_ref (itemRef → Textile)
- storage_under (boolean)

**Storage joinery** [ea]
- type (select: shelving, cabinets, lockers, display, mobile)
- open_or_closed (select: open, closed, mixed)
- adjustable_shelves (boolean)

**Lab bench** [lm or ea]
- top_material (select: chemical-resistant-laminate, epoxy, stainless, phenolic)
- service_run (select: above-bench, below-bench, integrated, mobile)
- sink_integrated (boolean)
- gas_outlets (number)
- power_outlets (number)
- fume_extraction_integrated (boolean)

---

## 10. Stairs, ramps & barriers (6)

**Group fields:** `structural_ref (itemRef → Structure)` · `location (text)` · `compliance (multi-tag)`

**Stair** [ea or lm]
- type (select: straight, dog-leg, U-shaped, helical, spiral, cantilevered, half-turn, quarter-turn)
- going (number) mm
- rise (number) mm
- width (number) mm
- tread_material (text or itemRef → Timber|Stone|Metal)
- riser_treatment (text)
- nosing_detail (select: bullnose, square, integral, stair-nosing-strip, contrast-strip)
- stringer_type (select: closed, open, central, twin)
- balustrade_ref (itemRef → Balustrade)
- handrail_ref (itemRef → Handrail)

**Ramp** [m or m²]
- gradient (select: 1:14, 1:20, custom)
- width (number) mm
- surface (text)
- landing_count (number)
- handrail_both_sides (boolean)

**Handrail** [lm]
- profile (select: round, rectangular, oval, square, custom)
- material (text)
- diameter (number) mm
- height (number) mm
- mount_type (select: wall, post, top-mount, side-mount)
- returns (select: full, partial, none)

**Balustrade** [lm]
- type (select: glass-infill, vertical-pickets, horizontal-rails, mesh, perforated-panel, solid-panel, wire-balustrade, post-and-rail)
- infill_material (text or itemRef → Glazing)
- height (number) mm
- post_spacing (number) mm
- top_rail (text)
- base_fixing (text)

**Barrier** [lm]
- type (select: pedestrian, bollard, cable, vehicle)
- material (text)
- height (number) mm
- loading (text)

**Guardrail** [lm]
- type (select: void-edge, balcony, roof-edge, plant)
- material (text)
- height (number) mm — default 1000
- loading (text)

---

## 11. Lighting (11)

**Group fields:** `brand` · `model` · `lumens (number)` · `colour_temperature_K (number)` · `CRI (number)` · `wattage (number)` · `IP_rating` · `dimmable (boolean)` · `control_protocol (select: switch, 0-10V, DALI, Dynalite, KNX, DMX, Casambi, Bluetooth, Zigbee, Wi-Fi, push)` · `finish` · `housing_material (text)`

**Light** [ea] · *aliases: luminaire* — generic; inherits group only

**Downlight** [ea]
- beam_angle (number) deg
- IC_rating (select: IC, IC-F, non-IC)
- cutout_diameter (number) mm
- adjustable (boolean)
- trim_finish (text)

**Pendant** [ea]
- diameter (number) mm
- drop (number) mm
- cord_length (number) mm
- canopy_diameter (number) mm
- canopy_finish (text)
- shade_material (text)

**Wall light** [ea] · *aliases: sconce*
- mount_type (select: surface, recessed, semi-recessed)
- projection (number) mm
- uplight_downlight (select: up, down, both, side)

**Linear light** [lm or ea] · *aliases: LED strip, strip lighting, batten*
- length (number) mm
- profile (select: surface, recessed, suspended, batten, plaster-in)
- joining_method (text)
- diffuser (select: opal, prismatic, frosted, clear)
- LED_strip_density (text)

**Track light** [ea or m]
- track_compatibility (select: single-circuit, 3-circuit, 48V, mag-track)
- head_count (number)
- adjustable (boolean)
- track_finish (text)

**Step light** [ea]
- mount_type (select: recessed, surface)
- IK_rating (text)
- projection_pattern (select: down, side, full)

**Bollard light** [ea]
- height (number) mm
- projection_pattern (select: 360, asymmetric, downlight)
- IK_rating (text)
- vandal_resistant (boolean)

**Emergency light** [ea]
- type (select: maintained, non-maintained, sustained)
- battery_type (select: NiCd, Li-Ion, NiMH)
- runtime_min (number)
- self_test (boolean)

**Exit sign** [ea]
- pictogram_compliance (select: AS-2293, EN-1838)
- running_man (boolean)
- maintained_or_non_maintained (select: maintained, non-maintained)
- viewing_distance (number) m
- double_sided (boolean)

**Lighting control** [ea] · *aliases: dimmer, scene controller, gateway*
- protocol (select: 0-10V, DALI, Dynalite, KNX, DMX, Casambi, Zigbee, Wi-Fi)
- type (select: dimmer, switch, sensor, scene-controller, gateway)
- max_load_W (number)
- scenes_supported (number)
- UI (select: keypad, app, voice, push-button)

---

## 12. Electrical, data & AV (16)

**Group fields:** `brand` · `model` · `finish` · `IP_rating` · `location_zone (select: dry, damp, wet)`

**Switch** [ea]
- gangs (select: 1, 2, 3, 4, 5, 6)
- function (select: on-off, dimmer, fan, motorised, intermediate)
- finish (text)
- plate_material (text)

**Power outlet** [ea] · *aliases: GPO, power point, socket*
- gangs (select: single, double, triple, quad)
- USB_count (number)
- USB_type (select: A, C, A+C, none)
- RCD (boolean)
- earth_leakage_rating (text)

**Data outlet** [ea]
- type (select: Cat6, Cat6A, Cat7, Cat8, fibre-OM3, fibre-OM4)
- port_count (number)
- termination (text)

**Floor box** [ea]
- size (text)
- contents (multi-select: power, data, AV, USB, HDMI)
- finish (text)
- access (select: hinged, slide-out, removable)

**Junction box** [ea]
- size (text)
- IP_rating (text)
- termination_count (number)
- location (select: ceiling, wall, floor, external)

**Switchboard** [ea]
- type (select: distribution, main, sub, meter)
- capacity_A (number)
- phases (select: single, three)
- pole_count (number)
- IP_rating (text)

**Switchgear** [ea]
- type (select: MCB, RCD, RCBO, contactor, isolator, surge-protector)
- rating (text)
- poles (select: 1, 2, 3, 4)

**EV charger** [ea]
- type (select: AC-Type-2, DC-CCS, DC-CHAdeMO)
- power_kW (number)
- cable_length (number) m
- auth (select: app, RFID, plug-and-charge)

**Sensor** [ea]
- type (select: motion, occupancy, daylight, temperature, humidity, CO2, smoke, VOC)
- range (text)
- trigger_logic (text)

**Access control** [ea]
- type (select: card-reader, keypad, biometric, intercom-integrated, magnetic-lock, electric-strike, exit-button)
- protocol (select: HID-iCLASS, MIFARE, DESFire, Bluetooth, NFC)
- power (text)
- monitoring (boolean)

**Intercom** [ea]
- type (select: audio, video, IP, GSM)
- master_count (number)
- station_count (number)
- door_release_integrated (boolean)

**AV equipment** [ea] · *aliases: FCU not applicable; AV processor, matrix*
- type (select: amplifier, processor, matrix, encoder, decoder, microphone, mixer)
- input_count (number)
- output_count (number)
- format (text)
- brand_protocol (text)

**Speaker** [ea]
- type (select: ceiling, wall, surface, in-wall, pendant, subwoofer)
- power_W (number)
- impedance (text)
- frequency_response (text)
- IP_rating (text)

**Display** [ea] · *aliases: monitor, screen, TV*
- type (select: TV, monitor, video-wall, projector, kiosk)
- size_inch (number)
- resolution (text)
- brightness_nits (number)
- mount (text)

**Server rack** [ea]
- size_U (number)
- width (select: 19", 23")
- depth (number) mm
- cooling (select: passive, active, in-rack)
- power_distribution (text)

**Cable tray** [m]
- type (select: ladder, perforated, basket, solid-bottom)
- width (number) mm
- depth (number) mm
- material (select: galvanised, stainless, fibreglass)
- loading_capacity (text)

---

## 13. Mechanical (15)

**Group fields:** `brand` · `model` · `capacity_kW (number)` · `refrigerant (text)` · `controls_protocol (select: BMS, standalone, wireless, BACnet, Modbus, KNX)` · `noise_level_dB (number)`

**AC indoor** [ea]
- type (select: ducted, cassette, wall-mounted, floor-mounted, ceiling-suspended, multi-split-head)
- capacity_kW (number)
- airflow_l_s (number)
- noise_dB (number)
- static_pressure_Pa (number)

**AC outdoor** [ea]
- type (select: split, multi-split, VRF, chiller, packaged, cassette)
- capacity_kW (number)
- refrigerant_type (text)
- COP (number)
- EER (number)
- noise_dB (number)

**Diffuser** [ea]
- type (select: linear-bar, linear-slot, swirl, perforated, jet, displacement, square-egg-crate, round)
- size (text)
- throw_pattern (text)
- flow_rate_l_s (number)
- finish (text)

**Grille** [ea]
- type (select: return, exhaust, transfer, weather, eggcrate)
- size (text)
- free_area_pct (number)
- finish (text)

**Register** [ea]
- type (select: supply, return)
- size (text)
- damper (boolean)
- finish (text)

**Exhaust fan** [ea]
- type (select: ceiling, wall, in-line, roof-mounted)
- airflow_l_s (number)
- static_pressure (text)
- noise_dB (number)
- ducted (boolean)

**Rangehood** [ea]
- type (select: undermount, canopy, integrated, downdraft, recirculating, ducted)
- airflow_l_s (number)
- width (number) mm
- noise_dB (number)
- light_integrated (boolean)

**Ductwork** [m]
- material (select: galvanised, stainless, flexible, fibreglass, fabric)
- diameter_or_dimensions (text)
- insulation_thickness (number) mm
- pressure_class (text)

**Damper** [ea]
- type (select: volume-control, fire, smoke, fire-and-smoke, motorised, gravity, backdraft)
- size (text)
- operation (text)
- FRL (text)

**Hydronic radiator** [ea]
- type (select: panel, column, towel, designer)
- output_W (number)
- dimensions (text)
- connection_type (text)
- finish (text)

**Underfloor heating** [m²]
- system (select: hydronic, electric-cable, electric-mat)
- output_W_m2 (number)
- controls (text)

**HVAC equipment** [ea] · *aliases: FCU, AHU, fan coil unit, air handling unit*
- type (select: AHU, FCU, VAV, CAV, ERV, HRV, chiller, boiler, cooling-tower)
- capacity (text)
- static_pressure (text)
- airflow (text)
- efficiency_rating (text)

**Cool room** [ea]
- type (select: cool-room, freezer, blast-chiller, walk-in)
- internal_size (text)
- panel_thickness (number) mm
- door_size (text)
- refrigeration_unit (text)

**Fume cupboard** [ea]
- type (select: ducted, recirculating, walk-in)
- width (number) mm
- sash_type (text)
- face_velocity (text)
- containment_class (text)

**Medical gas** [ea]
- type (select: oxygen, nitrous-oxide, medical-air, vacuum, scavenging, CO2, nitrogen)
- outlet_type (select: BS-5682, AS-2896-DISS, AGSS)
- pressure_class (text)
- alarm_integrated (boolean)

---

## 14. Hydraulic (5)

**Group fields:** `brand` · `model` · `pressure_rating (text)` · `flow_rate (text)` · `WaterMark (boolean)` · `location (text)`

**Hot water unit** [ea]
- type (select: gas-storage, gas-instant, electric-storage, electric-instant, heat-pump, solar-thermal, solar-with-boost)
- capacity_L (number)
- efficiency_star (number)
- recovery_rate (text)

**Water meter** [ea]
- type (select: domestic, sub-meter, fire, irrigation, recycled)
- size (text)
- pulse_output (boolean)

**Pressure reducing valve** [ea] · *aliases: PRV*
- inlet_pressure_max (number) kPa
- outlet_pressure_set (number) kPa
- size (text)

**Backflow preventer** [ea] · *aliases: RPZ*
- type (select: RPZ, DCV, atmospheric-vacuum-breaker, pressure-vacuum-breaker)
- size (text)
- hazard_class (select: high, medium, low)

**Pump** [ea]
- application (select: irrigation, domestic-water, hot-water-circ, sump, fire-booster, swimming-pool, rainwater-harvest, transfer)
- type (select: centrifugal, submersible, multistage, jet)
- flow_rate (text)
- head (number) m
- power_W (number)

---

## 15. Fire & life safety (12)

**Group fields:** `brand` · `model` · `approval_standard (text)` · `addressable (select: addressable, conventional, hybrid)`

**Smoke detector** [ea]
- detection_type (select: photoelectric, ionisation, dual, aspirating)
- coverage_radius (number) m
- power (select: hardwired, battery, mains-with-battery)

**Heat detector** [ea]
- detection_type (select: rate-of-rise, fixed-temperature, combined)
- temperature_threshold (number) °C

**Sprinkler head** [ea]
- type (select: pendant, upright, sidewall, concealed, in-rack, ESFR, residential)
- K_factor (number)
- response (select: standard, quick, fast)
- finish (text)
- cover_plate_finish (text)

**Hose reel** [ea]
- length_m (number)
- hose_diameter (select: 19mm, 25mm)
- cabinet_finish (text)
- IP_rating (text)

**Hydrant** [ea]
- type (select: landing-valve, fire-plug, booster, monitor)
- pressure (text)
- connection (select: Storz, BIC)

**Extinguisher** [ea]
- type (select: water, foam, dry-powder, CO2, wet-chemical, clean-agent)
- size_kg (number)
- class_rating (multi-select: A, B, C, D, E, F)

**Fire blanket** [ea]
- size (text)
- housing_material (text)

**Fire indicator panel** [ea] · *aliases: FIP*
- zone_count (number)
- type (select: addressable, conventional, hybrid, voice-evac)
- network_protocol (text)

**EWIS / occupant warning** [ea] · *aliases: EWIS*
- type (select: speaker, strobe, combined, beacon)
- power_W (number)
- pattern (text)
- IP_rating (text)

**Fire shutter** [ea]
- FRL (text)
- width (number) mm
- height (number) mm
- operation (select: manual, motorised, fail-safe)
- cyclic_test_compliance (text)

**Fire damper** [ea]
- FRL (text)
- size (text)
- operation (select: thermal, electric, smoke-actuated)

**Fire collar** [ea]
- pipe_size (text)
- pipe_material (select: PVC, copper, steel, multilayer)
- FRL (text)

---

## 16. Vertical transport (6)

**Group fields:** `brand` · `capacity_kg (number)` · `capacity_persons (number)` · `speed_m_s (number)` · `drive_type (select: traction, MRL, hydraulic, geared, gearless)`

**Passenger lift** [ea]
- car_size (text)
- stops (number)
- serving_floors (text)
- car_finish_ref (itemRef → Finishes)
- door_finish (text)
- ride_quality_rating (text)
- accessibility_compliance (boolean)

**Goods lift** [ea]
- platform_size (text)
- capacity (number) kg
- door_size (text)
- car_lining (select: stainless, galvanised, plywood, painted-steel)

**Platform lift** [ea]
- type (select: vertical, inclined, scissor)
- capacity_kg (number)
- max_travel (number) mm
- enclosure (select: open, semi-enclosed, full)

**Escalator** [ea]
- vertical_rise (number) mm
- width (number) mm
- angle (select: 30, 35)
- step_finish (text)
- balustrade (select: glass, panel)

**Travelator** [ea]
- length (number) m
- width (number) mm
- slope (select: 0, 6, 10, 12)
- belt_speed (number) m/s

**Dumbwaiter** [ea]
- car_size (text)
- capacity_kg (number)
- stops (number)
- door_type (select: bi-parting, slide-up, fold-up)

---

## 17. Accessibility & signage (9)

**Group fields:** `AS_1428_compliance (boolean)` · `braille_required (boolean)` · `finish` · `mounting (text)`

**TGSI** [m² or ea] · *aliases: tactile ground surface indicator, hazard tile*
- type (select: directional, hazard)
- format (select: tile, individual-stud, applied)
- colour_contrast_LRV (number)

**Grab rail** [lm or ea]
- diameter (select: 32, 38, 50) mm
- length (number) mm
- finish (text)
- mount_type (text)
- loading_compliance (text)

**Tactile sign** [ea]
- size (text)
- raised_text_height (number) mm
- braille (boolean)
- luminance_contrast (number)
- finish (text)

**Braille sign** [ea]
- text (text)
- braille_format (select: grade-1, grade-2)
- size (text)
- finish (text)
- mount_height (number) mm

**Hearing loop** [ea]
- type (select: room-loop, counter-loop, perimeter)
- coverage_area (text)
- amplifier (text)
- signage_required (boolean)

**Wayfinding sign** [ea]
- type (select: directional, identification, regulatory, informational)
- size (text)
- materials (text)
- illumination (select: none, internal, edge-lit, halo)

**Statutory sign** [ea]
- code_compliance (select: BCA, AS-1319, custom)
- text (text)
- symbol (text)
- size (text)
- luminance (text)
- materials (text)

**Room ID sign** [ea]
- text (text)
- braille (boolean)
- pictogram (boolean)
- finish (text)
- mount_height (number) mm

**Glazing manifestation** [m² or lm] · *aliases: glass decal, frosting, manifestation, decal*
- pattern (select: dots, lines, custom-graphic, frosted-band, full-frost)
- application (select: applied-film, etched, sandblasted, ceramic-frit)
- band_height (number) mm
- contrast_compliance (boolean)

---

## 18. FF&E (12)

**Group fields:** `brand` · `range` · `designer` · `dimensions (text)` · `finish` · `upholstery_ref (itemRef → Textile)`

**Furniture** [ea]
- type (select: chair, armchair, sofa, lounge, stool, bench, ottoman, dining-table, coffee-table, side-table, desk, console, bed, daybed, custom)
- material (text)
- seat_height (number) mm
- weight (number) kg

**Soft furnishing** [ea]
- type (select: cushion, throw, bed-linen, towel, mattress)
- size (text)
- fabric_ref (itemRef → Textile)
- fill (select: feather-down, foam, latex, synthetic)

**Curtain** [m² or m]
- type (select: sheer, blockout, double-curtain)
- fabric_ref (itemRef → Textile)
- heading (select: pinch-pleat, eyelet, S-fold, tab-top, ripple-fold)
- track_or_rod (select: track, rod, motorised)
- drop (number) mm
- operation (select: manual, motorised)

**Blind** [m² or ea]
- type (select: roller, roman, venetian, vertical, panel-glide, honeycomb, motorised)
- fabric_or_material (text)
- operation (select: chain, spring, motorised, cord, wand)
- light_filter (select: blockout, dim-out, sheer, light-filtering)

**Rug** [ea]
- size (text)
- material (text)
- pile (select: cut, loop, hand-knotted, hand-tufted, flat-weave)
- backing (text)
- custom_or_off_the_shelf (select: custom, OTS)

**Art** [ea]
- type (select: painting, print, photograph, sculpture, installation, mirror, mural)
- artist (text)
- year (number)
- medium (text)
- size (text)
- framing (text)
- loan (boolean)

**Workstation** [ea]
- type (select: sit-stand, fixed-height, hot-desk)
- size (text)
- adjustable (boolean)
- cable_management (boolean)
- partitions (boolean)

**Locker** [ea]
- bank_size (text)
- door_count (number)
- lock_type (select: key, combination, RFID, master, padlock-hasp)
- ventilation (boolean)
- material (text)

**Whiteboard** [ea]
- size (text)
- surface (select: porcelain, melamine, glass)
- magnetic (boolean)
- mounting (text)

**Pinboard** [ea]
- size (text)
- material (select: cork, fabric, magnetic)
- framing (text)

**Storage system** [ea or m]
- type (select: open-shelving, modular, flat-file, mobile, vertical-rotating)
- weight_capacity (text)
- adjustability (text)

**Appliance** [ea]
- type (select: oven, cooktop, rangehood, dishwasher, fridge, freezer, washing-machine, dryer, microwave, coffee-machine, warming-drawer, wine-cabinet)
- brand
- model
- energy_star (number)
- capacity (text)
- finish (text)
- integrated_or_freestanding (select: integrated, freestanding, semi-integrated)

---

## 19. Landscape & external works (29)

**Group fields:** `material` · `finish` · `external_grade (boolean — default true)` · `slip_rating (select: P3, P4, P5, R10, R11, R12, R13)`

**Paving** [m²]
- material (select: concrete, granite, sandstone, bluestone, brick, porcelain, asphalt, gravel)
- format (text)
- pattern (text)
- jointing (text)
- sub_base_required (text)

**Decking** [m²]
- material (select: hardwood, softwood-treated, composite, modified-timber, aluminium)
- board_width (number) mm
- pattern (text)
- fixing (select: screw, hidden-clip, secret)
- joist_spacing (number) mm

**Boardwalk** [m² or m]
- material (text)
- width (number) mm
- sub_structure (text)
- handrail_ref (itemRef → Handrail)
- slip_resistance_rating (text)

**Driveway** [m²]
- material (select: concrete, asphalt, exposed-aggregate, paver, gravel)
- finish (text)
- sub_base (text)
- bordering (text)

**Path** [m²]
- material (text)
- width (number) mm
- finish (text)
- edging_ref (itemRef → Edging)
- falls (text)

**External stair** [ea or m]
- material (text)
- tread_finish (text)
- riser (number) mm
- going (number) mm
- drainage (text)

**External ramp** [m or m²]
- gradient (select: 1:14, 1:20, custom)
- surface (text)
- drainage (text)
- handrail_ref (itemRef → Handrail)
- landings (number)

**Kerb** [lm]
- profile (select: barrier, semi-mountable, mountable, dish)
- material (text)
- height (number) mm

**Edging** [lm]
- material (select: steel, aluminium, timber, concrete, stone)
- height (number) mm
- finish (text)

**Retaining wall** [m² or m]
- material (select: masonry, concrete, sleeper, gabion, segmental-block, stone)
- max_height (number) mm
- drainage (text)
- structural_engineer_required (boolean)

**Fence** [lm]
- type (select: paling, capped-paling, slat, picket, palisade, mesh, glass, steel-bar, hedge)
- height (number) mm
- post_centres (number) mm
- gate_locations (text)

**Gate** [ea]
- type (select: pedestrian, vehicle, sliding, swing, automatic)
- width (number) mm
- height (number) mm
- material (text)
- operation (select: manual, motorised)
- access_control_ref (itemRef → Access control)

**Pergola** [ea or m²]
- structure_material (text)
- roof_type (select: open, slat, polycarbonate, retractable, solid)
- footprint (text)
- post_count (number)

**Shade sail** [ea]
- material (text)
- UV_block_pct (number)
- size (text)
- fixing_count (number)
- tensioning (text)

**Outdoor kitchen** [m² or set]
- bench_material (text)
- BBQ_integrated_ref (itemRef → BBQ)
- sink_ref (itemRef → Sink)
- cabinetry_material (text)
- drainage (text)
- gas_or_electric (select: gas, electric, both)

**BBQ** [ea]
- type (select: built-in, freestanding, kettle, wood-fired, hibachi)
- fuel (select: gas, charcoal, electric)
- burners (number)
- size (text)

**Fire pit** [ea]
- type (select: gas, wood-fired, ethanol)
- material (text)
- size (text)
- lid (boolean)

**Pool** [ea or m²]
- type (select: in-ground-concrete, fibreglass, vinyl-liner, infinity, lap, plunge, swim-spa)
- interior_finish (text)
- size (text)
- heating (text)
- filtration (text)

**Spa** [ea]
- type (select: portable, in-ground, swim-spa)
- capacity (number) persons
- jets (number)
- heating (text)

**Water feature** [ea]
- type (select: pond, fountain, waterwall, rill, cascade)
- material (text)
- pump_ref (itemRef → Pump)
- lighting (text)

**Outdoor shower** [ea]
- type (select: wall-mounted, freestanding, ceiling-mounted)
- finish (text)
- floor_grate (text)
- drainage (text)

**Sport court** [m²]
- type (select: tennis, basketball, multi-purpose, futsal, netball)
- surface (select: acrylic, asphalt, synthetic-grass, concrete, hardcourt)
- linemarking (text)
- fencing (text)
- lighting (text)

**Playground** [ea or m²]
- equipment_type (multi-select: combination, slide, swing, climber, balance, sand, water)
- age_range (select: 0-2, 2-5, 5-12, 12+, mixed)
- safety_surface (text)
- perimeter_fence (boolean)

**Outdoor furniture** [ea]
- type (select: bench, chair, table, lounge, daybed, sun-lounge)
- material (text)
- finish (text)
- UV_rated (boolean)
- weight (number) kg

**Bin enclosure** [ea]
- bin_count (number)
- size (text)
- ventilation (boolean)
- gate_type (text)
- material (text)

**Bike rack** [ea]
- type (select: hoop, vertical, two-tier, lockers)
- capacity (number)
- material (text)
- fixing (select: surface-mount, in-ground)

**Letterbox** [ea]
- type (select: standalone, integrated, multi-unit)
- material (text)
- finish (text)
- mail_slot_size (text)

**Clothesline** [ea]
- type (select: rotary, retractable, fixed)
- capacity (text)
- material (text)

**Bollard** [ea]
- type (select: fixed, removable, retractable, illuminated)
- material (text)
- finish (text)
- height (number) mm
- loading (text)

---

## 20. Planting, irrigation & drainage (20)

**Group fields:** `supplier` · `climate_zone (text)` · `season_of_install (text)` · `maturity_age (text)`

**Tree** [ea]
- species_botanical (text)
- species_common (text)
- pot_size_L (number)
- height_at_supply (number) m
- expected_mature_height (number) m
- canopy_spread (number) m
- root_barrier_required (boolean)
- semi_mature_purchase (boolean)

**Shrub** [ea]
- species_botanical (text)
- species_common (text)
- pot_size_L (number)
- height_at_supply (number) m
- expected_mature_height (number) m
- spread (number) m

**Groundcover** [ea or m²]
- species_botanical (text)
- species_common (text)
- pot_size (text)
- plants_per_m2 (number)
- spread (number) m

**Climber** [ea]
- species_botanical (text)
- species_common (text)
- pot_size (text)
- trellis_required (boolean)
- expected_height (number) m

**Hedge** [lm]
- species_botanical (text)
- species_common (text)
- pot_size (text)
- planting_centres (number) mm
- expected_height (number) m

**Lawn / turf** [m²]
- species (select: kikuyu, couch, buffalo, zoysia, fescue, ryegrass, blend)
- format (select: roll, slab, instant, seed)
- sub_base (text)

**Garden bed** [m² · slot]
- planting_palette_ref (itemRef multi → Tree|Shrub|Groundcover|Climber|Hedge)
- soil_ref (itemRef → Soil)
- mulch_ref (itemRef → Mulch|Gravel/stone mulch)
- edging_ref (itemRef → Edging)
- drainage_required (boolean)

**Gravel / stone mulch** [m² or m³]
- type (select: pebble, gravel, scoria, decomposed-granite, stone-chip)
- size (text)
- colour (text)
- depth (number) mm

**Mulch** [m³ or m²]
- type (select: composted-hardwood, sugar-cane, pine-bark, eucalypt, coconut-coir, cypress)
- particle_size (text)
- depth_at_install (number) mm

**Soil** [m³]
- type (select: topsoil, planting-mix, ameliorated, structural-soil, sandy-loam)
- pH (number)
- organic_matter_pct (number)

**Planter** [ea]
- material (select: ceramic, metal, concrete, fibreglass, timber)
- size (text)
- drainage (boolean)
- liner_required (boolean)
- self_watering (boolean)

**Dripline** [m] · *aliases: drip line, drip irrigation*
- emitter_spacing (select: 200, 300, 400, 500) mm
- flow_rate_l_h (number)
- pressure_compensating (boolean)
- sub_surface_or_surface (select: sub-surface, surface)

**Irrigation sprinkler** [ea] · *aliases: sprinkler*
- type (select: pop-up, gear-drive, rotary, micro-spray, mister)
- throw_radius (number) m
- flow_rate (text)
- arc (select: 90, 180, 270, 360, adjustable)

**Irrigation valve** [ea]
- type (select: solenoid, manual, master-valve, anti-siphon)
- size (text)
- pressure_rating (text)
- station_number (number)

**Irrigation controller** [ea] · *aliases: irrigation timer*
- station_count (number)
- expansion_modules (boolean)
- WiFi (boolean)
- weather_sensor_compatible (boolean)

**Hose cock** [ea] · *aliases: garden tap, hose tap*
- type (select: garden-tap, lockable-tap, anti-vandal, sub-meter-equipped)
- finish (text)
- backflow_protection (boolean)

**Water tank** [ea] · *aliases: rainwater tank, detention tank, fire tank*
- type (select: rainwater, detention, fire, potable, stormwater-retention, recycled-water)
- capacity_L (number)
- material (select: poly, concrete, steel, fibreglass, bladder)
- above_or_below_ground (select: above, below, partial)

**Soakwell** [ea]
- size (text)
- capacity_L (number)
- material (select: concrete, plastic, gravel-pit)
- sub_surface_depth (number) mm

**Drainage pit** [ea]
- size (text)
- grate_loading_class (select: A15, B125, C250, D400, E600, F900)
- base_type (select: silt-bucket, full-flow, sediment)
- connection_size (text)

**Sump** [ea]
- size (text)
- pump_ref (itemRef → Pump)
- capacity_L (number)
- alarm (boolean)
- backup_pump (boolean)

---

## Field-id naming conventions

- `snake_case`
- Suffix unit when ambiguous: `coverage_per_L`, `airflow_l_s`, `capacity_kW`, `noise_dB`, `pile_height` (mm implicit when adjacent to other dimensions)
- `_ref` suffix for itemRef fields: `glazing_ref`, `pump_ref`
- Boolean fields use plain ids (no `is_` prefix): `dimmable`, `magnetic`, `automatic`
- Multi-value list-of-strings fields use plural: `aliases`, `tags`

## Open items

- ~20 categories above could use further field detail in Phase 1 (mostly the simpler ones marked "inherits group only").
- A small number of cross-references — e.g. Outdoor kitchen referring to BBQ + Sink + Cabinetry — assume those itemRefs work; verify in Phase 1.
- Tag vocabulary may grow during seed-data drafting; keep in mind it's user-extendable.
- Aliases listed are illustrative; expand with domain knowledge during Phase 1 (Plasterboard especially needs more local variants).

---

**Total field definitions:** common (12) + group fields (~110 across 20 groups) + category-specific (~360) ≈ **~480 distinct field uses**, of which ~120 are unique field-id definitions (many fields reused across categories: brand, model, finish, size, etc.).
