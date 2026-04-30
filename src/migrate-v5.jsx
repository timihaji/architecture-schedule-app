// src/migrate-v5.jsx — v4 → v5 → v6 schema migration runner.
//
// Hard-cut migration described in /Users/timihajnady/.claude/plans/eventual-popping-axolotl.md §Phase 3.
// Runs at LoadingGate boot, gated by appState.schemaVersion < MIGRATION_VERSION.
//
// v4 → v5: REWRITES every material to the v5 shape, renames project.rooms →
// locations, etc. (See lower in file for full details.)
//
// v5 → v6 (new): adds `row.code` to every schedule row.
//   - When dupePolicy.scope === 'library': seed row.code from the resolved
//     material.code (preserves the office's existing catalog).
//   - When dupePolicy.scope === 'project' (or unset): regenerate codes from
//     scratch per-category, per-project (PT-01, PT-02, … TL-01, TL-02, …).
//   Also collapses dupePolicy.autoAssign from {none|series|project-max|library-max}
//   to {off|on}. See plan should-codes-be-removed-twinkling-blum.md.
//
// Idempotent: re-running on an already-current workspace is a no-op (every
// transform short-circuits when target shape is already present).
//
// API:
//   window.migrateV5.transform({ appState, materials, projects, schedulesByProjectId })
//     → pure: returns { appState, materials, projects, schedules, summary, unmapped }
//   window.migrateV5.runLive({ appState, materials, projects, libraries, ...cloudOps })
//     → loads schedule blobs, transforms, writes back, returns result

(function () {
  const MIGRATION_VERSION = 6;

  // ─── Idempotency gates ────────────────────────────────────────────────────
  function isMaterialV5(m) {
    if (!m) return true;
    if (!m.fields || !m.category) return false;
    if (window.categoryDef && !window.categoryDef(m.category)) return false;
    return true;
  }

  function isProjectV5(p) {
    if (!p) return true;
    return Array.isArray(p.locations) && Array.isArray(p.locationIds);
  }

  function isScheduleBlobCurrent(blob) {
    if (!blob) return true;
    if ((blob.schemaVersion | 0) >= MIGRATION_VERSION) return true;
    return false;
  }
  // Back-compat alias retained so any external caller doesn't break.
  const isScheduleBlobV5 = isScheduleBlobCurrent;

  // ─── Legacy → v5 category map ─────────────────────────────────────────────
  // Deterministic. Returns a v5 category id that exists in DEFAULT_SCHEMA_V5.
  // If nothing matches, returns 'wall' (a slot category) and the caller is
  // expected to record the item id in appState.migrations[v5].unmapped.
  function legacyToV5Category(material) {
    if (!material) return 'wall';

    // Already v5? Trust it if the id resolves.
    if (material.category && window.categoryDef && window.categoryDef(material.category)) {
      return material.category;
    }

    const k = String(material.kind || 'material').toLowerCase();
    const legacyCat = String(material.category || '').toLowerCase();
    const subtype   = String(material.subtype || '').toLowerCase();
    const productType = String(material.productType || '').toLowerCase();

    // Paint
    if (k === 'paint' || legacyCat === 'paint' || productType === 'paint') return 'paint';

    // Lighting (kind: 'light')
    if (k === 'light') {
      if (subtype === 'pendant') return 'pendant';
      if (subtype === 'downlight') return 'downlight';
      if (subtype === 'sconce' || subtype === 'wall') return 'wall_light';
      if (subtype === 'strip' || subtype === 'linear') return 'linear_light';
      if (subtype === 'track') return 'track_light';
      if (subtype === 'step') return 'step_light';
      if (subtype === 'bollard') return 'bollard_light';
      if (subtype === 'emergency') return 'emergency_light';
      if (subtype === 'exit') return 'exit_sign';
      return 'light';
    }

    // Doors / windows
    if (k === 'door') return 'door';
    if (k === 'window') return 'window';

    // Joinery hardware (handles, runners, hinges, latches all collapse)
    if (k === 'joinery') return 'joinery_hardware';

    // Appliances — all kitchen white-goods collapse to 'appliance' in v5.
    if (k === 'appliance') {
      if (subtype === 'rangehood') return 'rangehood';
      // oven / cooktop / dishwasher / fridge → all 'appliance'
      return 'appliance';
    }

    // Sanitary fittings
    if (k === 'fitting') {
      if (subtype === 'mixer' || subtype === 'tap')   return 'tapware';
      if (subtype === 'shower')                        return 'shower';
      if (subtype === 'basin')                         return 'basin';
      if (subtype === 'toilet' || subtype === 'wc')    return 'wc';
      if (subtype === 'bath')                          return 'bath';
      if (subtype === 'urinal')                        return 'urinal';
      return 'tapware';
    }

    // FF&E
    if (k === 'ffe-art') {
      if (subtype === 'mirror') return 'mirror';
      return 'art';
    }
    if (k === 'ffe-soft') {
      if (subtype === 'rug')     return 'rug';
      if (subtype === 'curtain') return 'curtain';
      if (subtype === 'blind')   return 'blind';
      return 'soft_furnishing';
    }
    if (k === 'ffe-lighting') {
      // Decorative table / floor lamps → pendant is the closest catch-all in v5.
      return 'pendant';
    }
    if (k && k.startsWith('ffe-')) {
      // ffe-seating, ffe-tables, ffe-storage, ffe-beds → 'furniture'
      return 'furniture';
    }

    // Finishes (kind: 'material' + sub-bucket on legacy `category`)
    if (k === 'material' || k === '') {
      if (legacyCat === 'timber')    return 'timber';
      if (legacyCat === 'stone')     return 'stone';
      if (legacyCat === 'metal')     return 'metal';
      if (legacyCat === 'textile')   return 'textile';
      if (legacyCat === 'tile')      return 'tile';
      if (legacyCat === 'composite') return 'laminate';
      if (legacyCat === 'paint')     return 'paint';
    }

    // Productive fallback chain — try v4 productType.
    if (productType) {
      if (window.categoryDef && window.categoryDef(productType)) return productType;
      // Common productType prefixes
      if (productType.startsWith('paint'))   return 'paint';
      if (productType.startsWith('timber'))  return 'timber';
      if (productType.startsWith('stone'))   return 'stone';
      if (productType.startsWith('metal'))   return 'metal';
      if (productType.startsWith('textile')) return 'textile';
      if (productType.startsWith('tile'))    return 'tile';
      if (productType.startsWith('appliance')) return 'appliance';
      if (productType.startsWith('light'))   return 'light';
      if (productType.startsWith('joinery')) return 'joinery_hardware';
      if (productType.startsWith('furniture')) return 'furniture';
    }

    // Last resort — 'wall' is a slot category guaranteed to exist.
    return 'wall';
  }

  // ─── Legacy field aliases ─────────────────────────────────────────────────
  // Every legacy top-level key that maps to a different v5 field id.
  const LEGACY_TO_V5 = {
    unitCost:        'unit_cost',
    leadTime:        'lead_time',
    origin:          'country_of_origin',
    image:           'image_ref',
    paintedWithId:   'paintedWith',
    colourName:      'colour_name',
    colourCode:      'colour_code',
    sheen:           'sheen_paint',
    system:          'paint_system',
    coveragePerL:    'coverage_per_l',
    pricePerL:       'price_per_l',
    substrates:      'substrate_required',
    wattage:         'wattage_w',
    kelvin:          'colour_temperature_k',
    spec:            'notes',           // legacy 'spec' free-text → notes
  };

  // Same name on both sides — copy across as-is.
  const SAME_NAMES = [
    'supplier', 'brand', 'range', 'model', 'finish', 'dimensions',
    'thickness', 'width', 'height', 'depth', 'length',
    'mounting', 'profile', 'pattern', 'grade', 'material', 'colour',
    'notes', 'species', 'coats', 'lamp', 'fabric', 'paintable',
    'dimmable',
  ];

  // Unit coercion: legacy values that aren't in v5 unit enum.
  const V5_UNIT_ENUM = ['ea', 'm²', 'm', 'lm', 'kg', 'set', 'item', 'L', 'm³'];
  const UNIT_COERCE = {
    'each':  'ea',
    'pcs':   'ea',
    'pc':    'ea',
    'sheet': 'item',
    'l/m':   'lm',
    'pair':  'set',
    'roll':  'item',
  };
  function coerceUnit(u) {
    if (u == null || u === '') return null;
    const s = String(u).trim();
    if (V5_UNIT_ENUM.indexOf(s) !== -1) return s;
    const lc = s.toLowerCase();
    if (UNIT_COERCE[lc]) return UNIT_COERCE[lc];
    // Some codes (m2 → m²)
    if (lc === 'm2') return 'm²';
    if (lc === 'm3') return 'm³';
    return s; // leave as-is if we don't recognize it
  }

  // ─── Tag bucketing ────────────────────────────────────────────────────────
  function bucketTags(legacyTags, schema) {
    const out = { performance: [], location: [], materialFamily: [] };
    if (!Array.isArray(legacyTags) || legacyTags.length === 0) return out;
    const axes = (schema && schema.tagAxes) || (window.DEFAULT_SCHEMA_V5 && window.DEFAULT_SCHEMA_V5.tagAxes);
    if (!axes) return out;

    function findAxis(tag) {
      const t = String(tag).toLowerCase();
      for (const axis of ['performance', 'location', 'materialFamily']) {
        const list = axes[axis] || [];
        for (const entry of list) {
          if (entry.id === t) return axis;
          if (String(entry.label || '').toLowerCase() === t) return axis;
        }
      }
      return null;
    }

    for (const raw of legacyTags) {
      if (!raw) continue;
      const axis = findAxis(raw);
      if (axis) out[axis].push(String(raw).toLowerCase());
      else out.performance.push(String(raw)); // unmatched → performance (sticky)
    }
    return out;
  }

  // ─── Material migration ───────────────────────────────────────────────────
  function migrateMaterial(material, schema, unmappedSink) {
    if (!material) return material;
    if (isMaterialV5(material)) return material;

    const v5Cat = legacyToV5Category(material);
    if (window.categoryDef && !window.categoryDef(v5Cat)) {
      // Mapping table is broken; record but still output 'wall' so renderers cope.
      if (unmappedSink) {
        unmappedSink.push({
          id: material.id,
          kind: material.kind || null,
          productType: material.productType || null,
          subtype: material.subtype || null,
          legacyCategory: material.category || null,
          mappedTo: v5Cat,
        });
      }
    }

    // Build fields: start from existing fields (Phase 2 partial writes), then
    // overlay legacy aliases + same-name keys. Existing fields take priority.
    const fields = Object.assign({}, material.fields || {});

    // Apply same-name keys (only fill if absent).
    for (const k of SAME_NAMES) {
      const v = material[k];
      if (v !== undefined && v !== null && v !== '' && !(k in fields)) {
        fields[k] = v;
      }
    }

    // Apply renamed aliases (only fill if absent).
    for (const [legacyKey, v5Key] of Object.entries(LEGACY_TO_V5)) {
      const v = material[legacyKey];
      if (v !== undefined && v !== null && v !== '' && !(v5Key in fields)) {
        fields[v5Key] = v;
      }
    }

    // v4-era extras blob: spread unknown keys into fields.
    if (material.extras && typeof material.extras === 'object') {
      for (const [k, v] of Object.entries(material.extras)) {
        if (v === undefined || v === null || v === '') continue;
        const v5Key = LEGACY_TO_V5[k] || k;
        if (!(v5Key in fields)) fields[v5Key] = v;
      }
    }

    // Unit coercion (write last so it overrides anything).
    if (material.unit !== undefined && material.unit !== null) {
      const u = coerceUnit(material.unit);
      if (u) fields.unit = u;
    } else if (fields.unit) {
      fields.unit = coerceUnit(fields.unit);
    }

    // Tags: object-by-axis on fields.tags. Bucket legacy flat string[].
    if (Array.isArray(material.tags) && material.tags.length > 0) {
      // Merge with anything Phase 2 might have written under fields.tags.
      const bucketed = bucketTags(material.tags, schema);
      const existing = (fields.tags && typeof fields.tags === 'object') ? fields.tags : {};
      fields.tags = {
        performance:    Array.from(new Set([...(existing.performance || []),    ...bucketed.performance])),
        location:       Array.from(new Set([...(existing.location || []),       ...bucketed.location])),
        materialFamily: Array.from(new Set([...(existing.materialFamily || []), ...bucketed.materialFamily])),
      };
    } else if (!fields.tags || typeof fields.tags !== 'object') {
      fields.tags = { performance: [], location: [], materialFamily: [] };
    }

    // Trade: explicit field, with _touched.trade flag indicating user override.
    const defaultTrade = (window.defaultTradeForCategory && window.defaultTradeForCategory(v5Cat)) || null;
    const legacyTrade  = (material.trade && String(material.trade).trim()) || null;
    const _touched = Object.assign({}, material._touched || {});
    if (legacyTrade) {
      fields.trade = legacyTrade;
      if (defaultTrade && legacyTrade !== defaultTrade) _touched.trade = true;
    } else if (defaultTrade) {
      fields.trade = defaultTrade;
    }

    // Build the canonical v5 material.
    return {
      id:         material.id,
      code:       material.code,
      name:       material.name,
      category:   v5Cat,
      fields,
      _touched,
      swatch:     material.swatch || null,
      libraryIds: Array.isArray(material.libraryIds) ? material.libraryIds : [],
      projects:   Array.isArray(material.projects) ? material.projects : [],
    };
  }

  // ─── Project migration ────────────────────────────────────────────────────
  function migrateProject(project) {
    if (!project) return project;
    if (isProjectV5(project)) {
      // Already v5. Still ensure project.address exists if legacy 'location' is around.
      if (!project.address && typeof project.location === 'string' && project.location) {
        return Object.assign({}, project, { address: project.location, location: undefined });
      }
      return project;
    }

    const next = Object.assign({}, project);

    // Rename rooms[] → locations[], roomIds[] → locationIds[].
    if (Array.isArray(project.rooms) && !Array.isArray(project.locations)) {
      next.locations = project.rooms;
      delete next.rooms;
    }
    if (Array.isArray(project.roomIds) && !Array.isArray(project.locationIds)) {
      next.locationIds = project.roomIds;
      delete next.roomIds;
    }
    if (!Array.isArray(next.locations))   next.locations = [];
    if (!Array.isArray(next.locationIds)) next.locationIds = next.locations.map(l => l && l.id).filter(Boolean);

    // Rename project.location (address string) → project.address. The old key
    // collides with the new locations array semantically; clear it.
    if (typeof next.location === 'string' && next.location && !next.address) {
      next.address = next.location;
    }
    if ('location' in next) delete next.location;

    return next;
  }

  // ─── Schedule row migration ───────────────────────────────────────────────
  function migrateScheduleRow(row, materialsById) {
    if (!row) return row;

    const next = Object.assign({}, row);
    let changed = false;

    // roomId → locationId
    if ('roomId' in row) {
      next.locationId = row.roomId;
      delete next.roomId;
      changed = true;
    } else if (next.locationId === undefined) {
      next.locationId = null;
      changed = true;
    }

    // isInstance → typeOrInstance ('instance' | 'type')
    if ('isInstance' in row) {
      next.typeOrInstance = row.isInstance ? 'type' : 'instance';
      delete next.isInstance;
      changed = true;
    } else if (!next.typeOrInstance) {
      next.typeOrInstance = 'instance';
      changed = true;
    }

    // state default
    if (!next.state) {
      next.state = 'new';
      changed = true;
    }

    // specMode default + normalize short codes to long forms (storage-side rule).
    if (!next.specMode) {
      next.specMode = 'proprietary';
      changed = true;
    } else if (next.specMode === 'prop')      { next.specMode = 'proprietary'; changed = true; }
      else if (next.specMode === 'demolish')  { next.specMode = 'demolished';  changed = true; }

    // category from material if absent.
    if (next.category === undefined) {
      const matId = next.specRef && next.specRef.id;
      const mat = matId && materialsById ? materialsById.get(matId) : null;
      next.category = (mat && mat.category) || null;
      changed = true;
    }

    // v6: row owns its own code. Default to null; regen pass below fills it.
    if (next.code === undefined) {
      next.code = null;
      changed = true;
    }

    return changed ? next : row;
  }

  // ─── v6 row code regeneration ─────────────────────────────────────────────
  // Per the plan: scope 'library' seeds row.code from material.code; scope
  // 'project' (default) regenerates codes per-category, per-project starting
  // at PREFIX-01.
  //
  // Prefix derivation mirrors DupePolicy._categoryFallbackPrefix (kept inline
  // here since that helper is private to DupePolicy.jsx).
  function _regenPrefixFor(material) {
    if (!material || !material.category) return '';
    const def = (typeof window !== 'undefined' && window.categoryDef)
      ? window.categoryDef(material.category)
      : null;
    if (def && def.code) return String(def.code).toUpperCase();
    return String(material.category).slice(0, 2).toUpperCase();
  }

  function regenerateRowCodes(rows, materialsById, scope) {
    if (!Array.isArray(rows) || rows.length === 0) return rows;

    if (scope === 'library') {
      // Seed each row.code from the resolved material's code.
      return rows.map(r => {
        if (!r) return r;
        const matId = r.specRef && r.specRef.id;
        const mat = matId && materialsById ? materialsById.get(matId) : null;
        const seed = (mat && mat.code) ? String(mat.code) : null;
        return Object.assign({}, r, { code: seed });
      });
    }

    // project mode: walk each category in array order, assign sequential codes.
    const newCodes = new Map(); // row.id → code
    const counters = new Map(); // category id → next number
    const prefixes = new Map(); // category id → prefix

    for (const r of rows) {
      if (!r || !r.id) continue;
      const matId = r.specRef && r.specRef.id;
      const mat = matId && materialsById ? materialsById.get(matId) : null;
      const cat = (mat && mat.category) || r.category || null;
      if (!cat || !mat) continue; // unresolved rows stay null
      if (!prefixes.has(cat)) prefixes.set(cat, _regenPrefixFor(mat));
      const n = (counters.get(cat) || 0) + 1;
      counters.set(cat, n);
      const prefix = prefixes.get(cat) || '';
      const numStr = String(n).padStart(2, '0');
      newCodes.set(r.id, prefix ? `${prefix}-${numStr}` : numStr);
    }

    return rows.map(r => {
      if (!r) return r;
      if (newCodes.has(r.id)) return Object.assign({}, r, { code: newCodes.get(r.id) });
      // Unresolved row: preserve any existing value, else null.
      if (r.code === undefined) return Object.assign({}, r, { code: null });
      return r;
    });
  }

  function migrateScheduleBlob(blob, materialsById, opts) {
    if (!blob) return blob;
    if (isScheduleBlobCurrent(blob)) return blob;
    const prevVersion = blob.schemaVersion | 0;
    let rows = Array.isArray(blob.rows)
      ? blob.rows.map(r => migrateScheduleRow(r, materialsById))
      : [];
    // v5 → v6: regenerate codes once.
    if (prevVersion < 6) {
      const scope = (opts && opts.scope) || 'project';
      rows = regenerateRowCodes(rows, materialsById, scope);
    }
    return Object.assign({}, blob, { rows, schemaVersion: MIGRATION_VERSION });
  }

  // ─── Settings migration (v5 → v6) ─────────────────────────────────────────
  // Collapse dupePolicy.autoAssign from 4-value enum to 'on'/'off'.
  function migrateSettings(settings) {
    if (!settings) return settings;
    const dp = settings.dupePolicy;
    if (!dp) return settings;
    let nextDp = dp;
    if (dp.autoAssign === 'series' || dp.autoAssign === 'project-max' || dp.autoAssign === 'library-max') {
      nextDp = Object.assign({}, dp, { autoAssign: 'on' });
    } else if (dp.autoAssign === 'none') {
      nextDp = Object.assign({}, dp, { autoAssign: 'off' });
    }
    if (nextDp === dp) return settings;
    return Object.assign({}, settings, { dupePolicy: nextDp });
  }

  // ─── Post-migration validation ────────────────────────────────────────────
  // Logs (does NOT block) when row codes within a schedule collide and the
  // policy says we should care about it.
  function validateRowCodes(schedules, policy) {
    if (!policy) return;
    const level = (policy.scope === 'library')
      ? policy.uniquenessLibrary
      : policy.uniquenessProject;
    if (!level || level === 'off') return;
    for (const [pid, sched] of Object.entries(schedules || {})) {
      if (!sched || !Array.isArray(sched.rows)) continue;
      const counts = new Map();
      for (const r of sched.rows) {
        const c = r && r.code;
        if (!c) continue;
        counts.set(c, (counts.get(c) || 0) + 1);
      }
      const dupes = [];
      for (const [code, n] of counts.entries()) if (n > 1) dupes.push(code);
      if (dupes.length > 0) {
        console.warn(`[migrateV6] WARN: duplicate codes in project ${pid}:`, dupes);
      }
    }
  }

  // ─── Top-level pure transform ─────────────────────────────────────────────
  function transform({ appState, materials, projects, schedulesByProjectId }) {
    const schema = window.DEFAULT_SCHEMA_V5;
    const unmapped = [];

    // v6 settings migration runs first so the resulting policy drives the
    // schedule blob regen scope.
    const migratedSettings = migrateSettings(appState && appState.settings);
    const policy = (migratedSettings && migratedSettings.dupePolicy) || null;
    const scope = (policy && policy.scope) || 'project';

    const nextMaterials = (materials || []).map(m => migrateMaterial(m, schema, unmapped));

    // Build a v5-shape lookup so schedule rows resolve material.category cleanly.
    const matById = new Map();
    for (const m of nextMaterials) if (m && m.id) matById.set(m.id, m);

    const nextProjects = (projects || []).map(migrateProject);

    const nextSchedules = {};
    for (const [pid, blob] of Object.entries(schedulesByProjectId || {})) {
      nextSchedules[pid] = migrateScheduleBlob(blob, matById, { scope });
    }

    // Counts for the migrations[] entry.
    let totalRows = 0;
    for (const s of Object.values(nextSchedules)) {
      totalRows += (s && Array.isArray(s.rows) ? s.rows.length : 0);
    }

    const summary = {
      materials: nextMaterials.length,
      projects:  nextProjects.length,
      schedules: Object.keys(nextSchedules).length,
      schedule_rows: totalRows,
      unmapped: unmapped.length,
    };

    const nextAppState = Object.assign({}, appState || {}, {
      schemaVersion: MIGRATION_VERSION,
    });
    if (migratedSettings && migratedSettings !== (appState && appState.settings)) {
      nextAppState.settings = migratedSettings;
    }

    return {
      appState:  nextAppState,
      materials: nextMaterials,
      projects:  nextProjects,
      schedules: nextSchedules,
      summary,
      unmapped,
    };
  }

  // ─── Cloud I/O wrappers ───────────────────────────────────────────────────
  async function loadAllSchedules(projectIds, loadSchedule) {
    const out = {};
    for (const id of projectIds) {
      try {
        const blob = await loadSchedule(id);
        if (blob) out[id] = blob;
      } catch (err) {
        console.error('[migrateV5] loadSchedule failed for', id, err);
      }
    }
    return out;
  }

  async function runLive({ appState, materials, projects, libraries,
                            loadSchedule, saveSchedule, upsertItem, saveAppStateNow }) {
    const projectIds = (projects || []).map(p => p.id);
    const projectsById = new Map((projects || []).map(p => [p.id, p]));

    console.log(`[migrateV6] starting migration: ${projectIds.length} projects`);

    // 1. Load per-project schedules.
    const schedulesByProjectId = await loadAllSchedules(projectIds, loadSchedule);

    // 1.5. Pre-v6 backup of every blob that will be mutated this run.
    //      Stored in localStorage; cleared once the entire run succeeds.
    const backupKeys = [];
    if (typeof localStorage !== 'undefined') {
      for (const [pid, blob] of Object.entries(schedulesByProjectId)) {
        if (!blob) continue;
        if ((blob.schemaVersion | 0) >= MIGRATION_VERSION) continue;
        try {
          const key = `_v5_backup_${pid}`;
          localStorage.setItem(key, JSON.stringify(blob));
          backupKeys.push(key);
        } catch (err) {
          console.warn('[migrateV6] backup failed for', pid, err);
        }
      }
    }

    // 2. Transform.
    const result = transform({ appState, materials, projects, schedulesByProjectId });

    // 3. Write per-project schedules.
    let savedSchedules = 0;
    let idx = 0;
    const total = Object.keys(result.schedules).length;
    for (const [pid, sched] of Object.entries(result.schedules)) {
      idx++;
      const proj = projectsById.get(pid);
      const name = (proj && proj.name) || pid;
      const rowCount = (sched && Array.isArray(sched.rows)) ? sched.rows.length : 0;
      console.log(`[migrateV6] project ${idx}/${total}: ${name} (${rowCount} rows)`);
      try {
        await saveSchedule(pid, sched);
        savedSchedules++;
      } catch (err) {
        console.error('[migrateV5] saveSchedule failed for', pid, err);
        throw new Error(`schedule save failed for project ${pid}: ${err.message || err}`);
      }
    }

    // 4. Write materials.
    let savedMaterials = 0;
    for (const m of result.materials) {
      try {
        await upsertItem('materials', m.id, m);
        savedMaterials++;
      } catch (err) {
        console.error('[migrateV5] upsertItem materials failed for', m.id, err);
        throw new Error(`material save failed for ${m.id}: ${err.message || err}`);
      }
    }

    // 5. Write projects.
    let savedProjects = 0;
    for (const p of result.projects) {
      try {
        await upsertItem('projects', p.id, p);
        savedProjects++;
      } catch (err) {
        console.error('[migrateV5] upsertItem projects failed for', p.id, err);
        throw new Error(`project save failed for ${p.id}: ${err.message || err}`);
      }
    }

    // 6. Append migrations entry + save appState.
    const migrationsEntry = {
      version: MIGRATION_VERSION,
      ranAt: new Date().toISOString(),
      mode: 'live',
      counts: {
        materials:     savedMaterials,
        projects:      savedProjects,
        schedules:     savedSchedules,
        schedule_rows: result.summary.schedule_rows,
      },
      unmapped: result.unmapped,
      error: null,
    };
    const finalAppState = Object.assign({}, result.appState, {
      migrations: [...(result.appState.migrations || []), migrationsEntry],
    });
    if (saveAppStateNow) {
      try {
        await saveAppStateNow(finalAppState);
      } catch (err) {
        console.error('[migrateV5] saveAppStateNow failed:', err);
      }
    }

    // 7. Post-migration validation pass (logs duplicate codes; non-blocking).
    try {
      const policy = (finalAppState && finalAppState.settings && finalAppState.settings.dupePolicy) || null;
      validateRowCodes(result.schedules, policy);
    } catch (err) {
      console.warn('[migrateV6] validation pass failed:', err);
    }

    // 8. Clear backup keys now that everything succeeded.
    if (typeof localStorage !== 'undefined') {
      for (const key of backupKeys) {
        try { localStorage.removeItem(key); } catch (err) { /* ignore */ }
      }
    }
    console.log(`[migrateV6] complete (${projectIds.length} projects)`);

    return {
      appState:  finalAppState,
      materials: result.materials,
      projects:  result.projects,
      schedules: result.schedules,
      summary:   migrationsEntry.counts,
      unmapped:  result.unmapped,
    };
  }

  // ─── Expose ───────────────────────────────────────────────────────────────
  window.migrateV5 = {
    transform,
    runLive,
    MIGRATION_VERSION,
    _internals: {
      legacyToV5Category,
      migrateMaterial,
      migrateProject,
      migrateScheduleRow,
      migrateScheduleBlob,
      regenerateRowCodes,
      migrateSettings,
      validateRowCodes,
      bucketTags,
      coerceUnit,
      LEGACY_TO_V5,
      SAME_NAMES,
    },
  };
})();
