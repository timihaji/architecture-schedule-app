// src/migrate-v4.jsx — v3 → v4 schema migration.
//
// Hard-cut migration described in design/INTEGRATION_PLAN.md §A3. Runs once
// per workspace at LoadingGate boot, gated by appState.schemaVersion < 4.
//
// ADDITIVE migration: new fields are added; legacy fields (kind, category,
// componentType, brand, colourCode, sheen, system, paintable, paintedWithId,
// species, etc.) are PRESERVED so v3 UI surfaces (Library, CostScheduleV2,
// ProjectSpecV2) keep working until Phase B/C/D rewrite them. A Phase E
// cleanup migration (v5) drops the duplicates.
//
// What changes per workspace on a successful run:
//   • appState gains: schemaVersion=4, taxonomies (from window.DEFAULT_TAXONOMIES),
//     migrations[] entry with row counts.
//   • materials: each item gains productType + extras (legacy fields untouched).
//   • projects: each gains rooms[] + roomIds[] + archetype.
//   • schedules.{projectId}: cells gain specRef + state + specMode + element;
//     rows[] is populated from spec rows. cells.materialId preserved.
//   • specs.{projectId}: NOT modified. Migration only READS spec rows.
//
// Idempotent. Re-running on an already-migrated workspace is a no-op (every
// transform short-circuits when target fields are already present).
//
// API:
//   window.migrateV4.transform({ appState, materials, projects, specs, schedules })
//     → pure: returns { appState, materials, projects, schedules } v4-shaped
//   window.migrateV4.runLive({ appState, materials, projects, libraries, ...cloudOps })
//     → loads per-project blobs, transforms, writes back, returns result
//   window.migrateV4.runDry({ appState, materials, projects, libraries, ...cloudOps })
//     → loads, transforms, downloads before+after JSON, writes nothing
//   window.migrateV4.snapshot({ appState, materials, projects, libraries, ...cloudOps })
//     → loads everything, force-downloads a single archive JSON, writes nothing

(function () {
  // ─── Pure transforms (deterministic, no I/O) ─────────────────────────────

  // ─ deriveProductType ─
  // Maps a v3 material's (kind, category, subtype) to a v4 productType id.
  // Matches the ids declared in src/taxonomy-defaults.jsx.
  function deriveProductType(material) {
    if (material && material.productType) return material.productType;  // already migrated
    const k = (window.inferKind && window.inferKind(material)) || material?.kind || 'material';
    const cat = String(material?.category || '').toLowerCase();
    const sub = material?.subtype;

    if (k === 'paint') return 'paint';

    if (k === 'material') {
      const map = {
        timber:    'timber',
        stone:     'stone',
        composite: 'composite',
        metal:     'metal',
        textile:   'textile',
        tile:      'tile',
        paint:     'paint',
      };
      return map[cat] || 'material_other';
    }

    if (['appliance', 'fitting', 'light', 'joinery', 'door', 'window'].includes(k)) {
      return sub ? `${k}_${sub}` : k;
    }

    if (k.startsWith('ffe-')) {
      const ffe = k.replace('ffe-', '');
      return sub ? `furniture_${ffe}_${sub}` : `furniture_${ffe}`;
    }

    return 'other';
  }

  // ─ deriveExtras ─
  // For productTypes with declared extras (currently only paint and composite),
  // copy any matching top-level fields into a fresh extras object. Source
  // fields are NOT removed from the material (additive migration).
  function deriveExtras(material, productType) {
    if (material && material.extras && Object.keys(material.extras).length > 0) {
      return material.extras;  // already migrated
    }
    const known = {
      paint:     ['brand', 'colourName', 'colourCode', 'sheen', 'system',
                  'coats', 'coveragePerL', 'pricePerL', 'substrates'],
      composite: ['paintable', 'paintedWithId', 'species'],
    };
    const fields = known[productType] || [];
    const out = {};
    for (const f of fields) {
      const v = material?.[f];
      if (v !== undefined && v !== null && v !== '') out[f] = v;
    }
    return out;
  }

  function migrateMaterial(material) {
    if (!material) return material;
    const productType = deriveProductType(material);
    const extras = deriveExtras(material, productType);
    return { ...material, productType, extras };
  }

  // ─ slugify ─ (for room id generation)
  function slugify(s) {
    return String(s || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'room';
  }

  // ─ buildRoomsForProject ─
  // From a project's spec rows (each carrying a string-array `rooms` tag
  // list), derive a unique ordered list of Room records.
  function buildRoomsForProject(projectId, specRows) {
    const seen = new Set();
    for (const r of specRows || []) {
      for (const name of (r?.rooms || [])) {
        const trimmed = String(name || '').trim();
        if (trimmed) seen.add(trimmed);
      }
    }
    const sorted = Array.from(seen).sort((a, b) => a.localeCompare(b));
    return sorted.map((name, order) => ({
      id: `room-${projectId}-${slugify(name)}-${order}`,
      name,
      order,
    }));
  }

  function migrateProject(project, specBlob) {
    if (!project) return project;
    // If already migrated AND rooms were derived, return as-is.
    if (project.rooms && project.roomIds && typeof project.archetype === 'string') {
      return project;
    }
    const specRows = specBlobToRowsArray(specBlob);
    const rooms = (project.rooms && project.roomIds)
      ? project.rooms
      : buildRoomsForProject(project.id, specRows);
    return {
      ...project,
      rooms,
      roomIds: rooms.map(r => r.id),
      archetype: project.archetype || '',
    };
  }

  // Spec blob shape: { sections: [{trade, rowIds: [...]}], rows: { rowId: {...} } }
  // Flatten to an array of spec row objects (each enriched with trade).
  function specBlobToRowsArray(specBlob) {
    if (!specBlob || !Array.isArray(specBlob.sections)) return [];
    const out = [];
    for (const sec of specBlob.sections) {
      for (const rid of (sec.rowIds || [])) {
        const r = specBlob.rows && specBlob.rows[rid];
        if (r) out.push({ ...r, rowId: rid, trade: sec.trade });
      }
    }
    return out;
  }

  // Status (v3 spec) → state (v4 schedule). 'submitted'/'approved'/'on-order'
  // are pre-installation states → 'new'. Only 'installed' indicates the row
  // is in place → 'existing'.
  const STATUS_TO_STATE = {
    specified:  'new',
    submitted:  'new',
    approved:   'new',
    'on-order': 'new',
    installed:  'existing',
  };

  // Loose mapping from spec section trade → element id. Best effort; if no
  // match, returns null so the row shows in an "unassigned element" bucket.
  // The legacy ProjectSpecV2 doesn't tag rows with element/componentType, so
  // this is the only signal available at migration time.
  const TRADE_TO_ELEMENT = {
    'Paints & Finishes': 'wall',
    'Tiling':            'floor',
    'Flooring':          'floor',
    'Stonework':         'countertop',
    'Joinery':           'joinery-body',
    'Carpentry':         'door',
    'Electrical':        'light',
    'Plumbing':          'tap',
    'Glazing':           'window',
    'Doors & Windows':   'door',
    'Hardware':          'hardware',
    'FFE':               'furniture',
  };

  function migrateSpecRowToScheduleRow(specRow, project, roomLookup) {
    const status = specRow.status || 'specified';
    return {
      id: 'sr-' + (specRow.rowId || (Math.random().toString(36).slice(2, 10))),
      specRef:  { kind: 'product', id: specRow.materialId },
      element:  TRADE_TO_ELEMENT[specRow.trade] || null,
      roomId:   roomLookup(specRow.rooms?.[0]),
      state:    STATUS_TO_STATE[status] || 'new',
      specMode: 'proprietary',
      isInstance: false,
      qty: null,
      unit: null,
      revision:        specRow.revision || null,
      approvalComment: specRow.approvalComment || null,
      note:            specRow.note || null,
      source: 'spec',
    };
  }

  // Reshape a v3 schedule cell to v4 (additive — keep materialId).
  // Cells live at schedule.cells["optId:compId"] = { materialId }.
  function migrateScheduleCell(cell, component) {
    if (!cell) return cell;
    if (cell.specRef) return cell;  // already migrated
    const next = { ...cell };
    if (cell.materialId) {
      next.specRef = { kind: 'product', id: cell.materialId };
    }
    next.state = next.state || 'new';
    next.specMode = next.specMode || 'proprietary';
    if (next.isInstance == null) next.isInstance = false;
    if (next.element == null) {
      next.element = (component && component.componentType)
        || (window.inferComponentType && component && window.inferComponentType(component))
        || null;
    }
    return next;
  }

  function migrateScheduleBlob(scheduleBlob, specBlob, project) {
    if (!scheduleBlob) {
      // No existing schedule — create a fresh v4 one with rows from specs.
      const specRows = specBlobToRowsArray(specBlob);
      if (specRows.length === 0) return null;  // nothing to migrate; skip
      const rooms = (project && project.rooms) || [];
      const roomLookup = (name) => {
        if (!name) return null;
        const r = rooms.find(x => x.name === String(name).trim());
        return r ? r.id : null;
      };
      return {
        title: 'Schedule',
        options: [],
        components: [],
        cells: {},
        rows: specRows.map(sr => migrateSpecRowToScheduleRow(sr, project, roomLookup)),
        schemaVersion: 4,
      };
    }
    if (scheduleBlob.schemaVersion === 4 && Array.isArray(scheduleBlob.rows)) {
      return scheduleBlob;  // already migrated
    }

    // Upgrade existing schedule.
    const componentsById = {};
    for (const c of (scheduleBlob.components || [])) componentsById[c.id] = c;

    const nextCells = {};
    for (const [key, cell] of Object.entries(scheduleBlob.cells || {})) {
      const compId = key.split(':')[1];
      nextCells[key] = migrateScheduleCell(cell, componentsById[compId]);
    }

    // Build rows from spec rows.
    const specRows = specBlobToRowsArray(specBlob);
    const rooms = (project && project.rooms) || [];
    const roomLookup = (name) => {
      if (!name) return null;
      const r = rooms.find(x => x.name === String(name).trim());
      return r ? r.id : null;
    };
    const rows = specRows.map(sr => migrateSpecRowToScheduleRow(sr, project, roomLookup));

    return {
      ...scheduleBlob,
      cells: nextCells,
      rows,
      schemaVersion: 4,
    };
  }

  // ─── Top-level pure transform ─────────────────────────────────────────────
  // Inputs are loaded snapshots; this is pure (no cloud calls).
  function transform({ appState, materials, projects, specsByProjectId, schedulesByProjectId }) {
    const next = { migrations: appState?.migrations || [], summary: {} };

    // 1. Backfill taxonomies + bump schemaVersion.
    next.appState = {
      ...(appState || {}),
      schemaVersion: 4,
      taxonomies: (appState?.taxonomies && appState.taxonomies.productTypes?.length)
        ? appState.taxonomies
        : (window.DEFAULT_TAXONOMIES || { productTypes: [], elements: [], state: [], specMode: [], typeTemplates: [] }),
    };

    // 2. Migrate materials.
    next.materials = (materials || []).map(migrateMaterial);

    // 3. Migrate projects (carries spec rooms inline).
    next.projects = (projects || []).map(p => migrateProject(p, specsByProjectId?.[p.id]));

    // 4. Migrate per-project schedules.
    next.schedules = {};
    for (const p of next.projects) {
      const before = schedulesByProjectId?.[p.id];
      const next4 = migrateScheduleBlob(before, specsByProjectId?.[p.id], p);
      if (next4) next.schedules[p.id] = next4;
    }

    // 5. Counts.
    let totalRows = 0, totalCells = 0;
    for (const s of Object.values(next.schedules)) {
      totalRows  += (s.rows  || []).length;
      totalCells += Object.keys(s.cells || {}).length;
    }
    next.summary = {
      materials:       next.materials.length,
      projects:        next.projects.length,
      schedules:       Object.keys(next.schedules).length,
      schedule_rows:   totalRows,
      schedule_cells:  totalCells,
      rooms:           next.projects.reduce((a, p) => a + (p.rooms?.length || 0), 0),
      taxonomy_types:  next.appState.taxonomies.productTypes?.length || 0,
    };

    return next;
  }

  // ─── Cloud I/O wrappers ───────────────────────────────────────────────────

  async function loadAllSpecs(projectIds, loadSpec) {
    const out = {};
    for (const id of projectIds) {
      try {
        const blob = await loadSpec(id);
        if (blob) out[id] = blob;
      } catch (err) {
        console.error('[migrateV4] loadSpec failed for', id, err);
      }
    }
    return out;
  }

  async function loadAllSchedules(projectIds, loadSchedule) {
    const out = {};
    for (const id of projectIds) {
      try {
        const blob = await loadSchedule(id);
        if (blob) out[id] = blob;
      } catch (err) {
        console.error('[migrateV4] loadSchedule failed for', id, err);
      }
    }
    return out;
  }

  // Build a downloadable archive JSON (snapshot or after-image).
  function buildArchivePayload({ appState, materials, projects, libraries,
                                  schedules, specs, labelTemplates, label, version }) {
    return {
      _type: 'hollis-arne-archive',
      _version: 2,
      _label: label || null,
      _exportedAt: new Date().toISOString(),
      _schemaVersion: version,
      settings: appState?.settings || {},
      ui: appState?.ui || {},
      seed_version: appState?.seed_version,
      taxonomies: appState?.taxonomies,
      migrations: appState?.migrations,
      materials: materials || [],
      projects:  projects || [],
      libraries: libraries || [],
      labelTemplates: labelTemplates || appState?.label_templates || {},
      schedules: schedules || {},
      specs:     specs || {},
    };
  }

  function downloadJson(payload, filename) {
    const blob = new Blob([JSON.stringify(payload, null, 2)],
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  // ─ snapshot ─
  // Loads everything from cloud, force-downloads one archive JSON. No writes.
  async function snapshot({ appState, materials, projects, libraries,
                            loadSpec, loadSchedule, label }) {
    const projectIds = (projects || []).map(p => p.id);
    const [specs, schedules] = await Promise.all([
      loadAllSpecs(projectIds, loadSpec),
      loadAllSchedules(projectIds, loadSchedule),
    ]);
    const payload = buildArchivePayload({
      appState, materials, projects, libraries,
      schedules, specs,
      labelTemplates: appState?.label_templates,
      label: label || 'snapshot',
      version: appState?.schemaVersion || 3,
    });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadJson(payload, `hollis-arne-snapshot-${label || 'pre-v4'}-${stamp}.json`);
    return payload;
  }

  // ─ runDry ─
  // Loads everything, transforms in memory, downloads BEFORE + AFTER JSONs.
  // Writes nothing back to cloud. Appends a 'dry' migrations entry locally
  // (does not save it).
  async function runDry({ appState, materials, projects, libraries,
                          loadSpec, loadSchedule }) {
    const projectIds = (projects || []).map(p => p.id);
    const [specsByProjectId, schedulesByProjectId] = await Promise.all([
      loadAllSpecs(projectIds, loadSpec),
      loadAllSchedules(projectIds, loadSchedule),
    ]);

    const before = buildArchivePayload({
      appState, materials, projects, libraries,
      schedules: schedulesByProjectId, specs: specsByProjectId,
      labelTemplates: appState?.label_templates,
      label: 'before-v4',
      version: appState?.schemaVersion || 3,
    });

    const result = transform({ appState, materials, projects,
                                specsByProjectId, schedulesByProjectId });

    const after = buildArchivePayload({
      appState: result.appState,
      materials: result.materials,
      projects: result.projects,
      libraries,
      schedules: result.schedules,
      specs: specsByProjectId,
      labelTemplates: result.appState.label_templates,
      label: 'after-v4',
      version: 4,
    });

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadJson(before, `hollis-arne-DRY-before-v4-${stamp}.json`);
    downloadJson(after,  `hollis-arne-DRY-after-v4-${stamp}.json`);

    return { summary: result.summary, before, after };
  }

  // ─ runLive ─
  // The real thing: loads, snapshots, transforms, writes back, bumps
  // schemaVersion. Used by LoadingGate and Settings → Re-run.
  async function runLive({ appState, materials, projects, libraries,
                            loadSpec, loadSchedule, saveSchedule, upsertItem,
                            saveAppStateNow }) {
    const projectIds = (projects || []).map(p => p.id);

    // 1. Load per-project blobs.
    const [specsByProjectId, schedulesByProjectId] = await Promise.all([
      loadAllSpecs(projectIds, loadSpec),
      loadAllSchedules(projectIds, loadSchedule),
    ]);

    // 2. Snapshot — force download + localStorage stash.
    let snapshotPayload = null;
    try {
      snapshotPayload = buildArchivePayload({
        appState, materials, projects, libraries,
        schedules: schedulesByProjectId, specs: specsByProjectId,
        labelTemplates: appState?.label_templates,
        label: 'pre-v4',
        version: appState?.schemaVersion || 3,
      });
      try {
        localStorage.setItem('aml-pre-v4-snapshot', JSON.stringify(snapshotPayload));
      } catch (_) { /* over quota — fine, we're also downloading */ }
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadJson(snapshotPayload, `hollis-arne-pre-v4-${stamp}.json`);
    } catch (err) {
      console.error('[migrateV4] snapshot failed (non-fatal, continuing):', err);
    }

    // 3. Transform.
    const result = transform({ appState, materials, projects,
                                specsByProjectId, schedulesByProjectId });

    // 4. Write per-project schedules.
    let savedSchedules = 0;
    for (const [pid, sched] of Object.entries(result.schedules)) {
      try {
        await saveSchedule(pid, sched);
        savedSchedules++;
      } catch (err) {
        console.error('[migrateV4] saveSchedule failed for', pid, err);
        throw new Error(`schedule save failed for project ${pid}: ${err.message || err}`);
      }
    }

    // 5. Write materials (each one independently to keep version concurrency).
    let savedMaterials = 0;
    for (const m of result.materials) {
      try {
        await upsertItem('materials', m.id, m);
        savedMaterials++;
      } catch (err) {
        console.error('[migrateV4] upsertItem materials failed for', m.id, err);
        throw new Error(`material save failed for ${m.id}: ${err.message || err}`);
      }
    }

    // 6. Write projects.
    let savedProjects = 0;
    for (const p of result.projects) {
      try {
        await upsertItem('projects', p.id, p);
        savedProjects++;
      } catch (err) {
        console.error('[migrateV4] upsertItem projects failed for', p.id, err);
        throw new Error(`project save failed for ${p.id}: ${err.message || err}`);
      }
    }

    // 7. Append migrations entry + save appState.
    const migrationsEntry = {
      version: 4,
      ranAt: new Date().toISOString(),
      mode: 'live',
      counts: {
        materials:      savedMaterials,
        projects:       savedProjects,
        schedules:      savedSchedules,
        schedule_rows:  result.summary.schedule_rows,
        schedule_cells: result.summary.schedule_cells,
        rooms:          result.summary.rooms,
        taxonomy_types: result.summary.taxonomy_types,
      },
      error: null,
    };
    const finalAppState = {
      ...result.appState,
      migrations: [...(result.appState.migrations || []), migrationsEntry],
    };
    if (saveAppStateNow) {
      try {
        await saveAppStateNow(finalAppState);
      } catch (err) {
        console.error('[migrateV4] saveAppStateNow failed:', err);
        // Non-fatal: returned appState is what LoadingGate uses; next save
        // attempt (any user edit) will retry.
      }
    }

    // 8. Clear snapshot from localStorage on success — user has the download.
    try { localStorage.removeItem('aml-pre-v4-snapshot'); } catch (_) {}

    return {
      appState:  finalAppState,
      materials: result.materials,
      projects:  result.projects,
      schedules: result.schedules,
      summary:   migrationsEntry.counts,
    };
  }

  // ─── Expose ───────────────────────────────────────────────────────────────
  window.migrateV4 = {
    transform,
    runLive,
    runDry,
    snapshot,
    buildArchivePayload,
    downloadJson,
    // Exposed for tests / re-use
    _internals: {
      deriveProductType, deriveExtras, migrateMaterial,
      buildRoomsForProject, slugify, specBlobToRowsArray,
      migrateSpecRowToScheduleRow, migrateScheduleCell, migrateScheduleBlob,
      STATUS_TO_STATE, TRADE_TO_ELEMENT,
    },
  };
})();
