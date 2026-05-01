// src/schema-helpers.jsx — pure accessors for the v5 schema.
//
// Reads the runtime schema from `window.appState?.taxonomies` if present
// (so user edits via the field manager flow through), and falls back to
// `window.DEFAULT_SCHEMA_V5` (Phase 1 default).
//
// Helpers exposed on window:
//   schemaActive()                  → current schema (taxonomies or defaults)
//   commonFields()                  → array of common field defs
//   commonFieldIds()                → array of common field ids
//   groupDef(id)                    → { id, label, fieldIds, ... }
//   categoryDef(id)                 → { id, label, groupId, fieldIds, ... }
//   fieldDef(id)                    → { id, label, type, ... }
//   categoriesByGroup()             → { groupId: [categoryDef, ...] }
//   categoriesInGroup(id)           → [categoryDef, ...]
//   fieldsForCategory(id)           → ordered field defs (common ∪ group ∪ category)
//   tagsForAxis(axis)               → [{ id, label }, ...]
//   defaultTradeForCategory(id)     → string trade
//   searchCategories(query)         → matches label + aliases
//   searchItems(items, query)       → matches name + code + category label + category aliases
//   findReferencesToCategory(id, materials, projects)
//                                   → { materials: [...], rows: [{...}] } for delete protection
//   groupableFields(items)          → field defs suitable for "Group by" UI
//
// All helpers are pure (no I/O, no side effects). Idempotent across calls.

(function () {
  function schemaActive() {
    const ts = (typeof window !== 'undefined') && window.appState && window.appState.taxonomies;
    if (ts && ts.schemaVersion === 5) return ts;
    return window.DEFAULT_SCHEMA_V5;
  }

  function commonFieldIds() {
    return schemaActive().commonFieldIds || [];
  }
  function commonFields() {
    const s = schemaActive();
    return commonFieldIds().map(id => fieldDef(id, s)).filter(Boolean);
  }

  function groupDef(id, s) {
    s = s || schemaActive();
    return (s.groups || []).find(g => g.id === id) || null;
  }

  function categoryDef(id, s) {
    s = s || schemaActive();
    return (s.categories || []).find(c => c.id === id) || null;
  }

  function fieldDef(id, s) {
    s = s || schemaActive();
    return (s.fields || []).find(f => f.id === id) || null;
  }

  function categoriesByGroup() {
    const s = schemaActive();
    const out = {};
    (s.groups || []).forEach(g => { out[g.id] = []; });
    (s.categories || []).forEach(c => {
      if (c.hidden) return;
      const arr = out[c.groupId] || (out[c.groupId] = []);
      arr.push(c);
    });
    Object.keys(out).forEach(k => out[k].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    return out;
  }

  function categoriesInGroup(id) {
    const s = schemaActive();
    return (s.categories || []).filter(c => c.groupId === id && !c.hidden)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  // Three-layer inheritance: common → group → category.
  // Returns ordered array of field defs (no duplicates; later layers don't
  // override earlier layers — they just don't re-add the id).
  function fieldsForCategory(catId) {
    const s = schemaActive();
    const cat = categoryDef(catId, s);
    if (!cat) return commonFields();
    const group = groupDef(cat.groupId, s);
    const seen = new Set();
    const ids = [];
    const push = (idList) => {
      (idList || []).forEach(id => {
        if (!seen.has(id)) { seen.add(id); ids.push(id); }
      });
    };
    push(s.commonFieldIds);
    if (group) push(group.fieldIds);
    push(cat.fieldIds);
    return ids.map(id => fieldDef(id, s)).filter(Boolean);
  }

  function tagsForAxis(axis) {
    const s = schemaActive();
    return ((s.tagAxes || {})[axis] || []).filter(t => !t.hidden);
  }

  // Deterministic Trade default per category. Uses category's group as the
  // primary signal. Migration v5 also calls this. User can always override
  // (sticky via _touched.trade).
  const TRADE_BY_GROUP = {
    surfaces:        'Painters & Finishes',
    trims:           'Carpentry',
    finishes:        'Painters & Finishes',
    substrates:      'Carpentry',
    roof:            'Roofers',
    structure:       'Builders',
    openings:        'Windows & Doors',
    sanitary:        'Plumbing',
    joinery:         'Joinery',
    stairs:          'Carpentry',
    lighting:        'Electrical',
    electrical:      'Electrical',
    mechanical:      'Mechanical',
    hydraulic:       'Plumbing',
    fire:            'Fire Services',
    vertical_transport: 'Vertical Transport',
    accessibility:   'Signage & Accessibility',
    ffe:             'FF&E Supply',
    landscape:       'Landscape',
    planting:        'Landscape',
  };
  function defaultTradeForCategory(id) {
    const cat = categoryDef(id);
    if (!cat) return '';
    return TRADE_BY_GROUP[cat.groupId] || '';
  }

  // ─── Search ────────────────────────────────────────────────────────────────
  function _normaliseQuery(q) {
    return (q || '').toLowerCase().trim();
  }
  function _matchesAlias(text, q) {
    return (text || '').toLowerCase().includes(q);
  }

  function searchCategories(query) {
    const q = _normaliseQuery(query);
    if (!q) return [];
    const s = schemaActive();
    return (s.categories || []).filter(c => {
      if (c.hidden) return false;
      if (_matchesAlias(c.label, q)) return true;
      if (_matchesAlias(c.id, q)) return true;
      return (c.aliases || []).some(a => _matchesAlias(a, q));
    });
  }

  // Match items against q against: name, code, category label, category aliases.
  function searchItems(items, query) {
    const q = _normaliseQuery(query);
    if (!q) return items;
    return (items || []).filter(item => {
      if (_matchesAlias(item.name, q)) return true;
      if (_matchesAlias(item.code, q)) return true;
      const cat = categoryDef(item.category);
      if (cat) {
        if (_matchesAlias(cat.label, q)) return true;
        if ((cat.aliases || []).some(a => _matchesAlias(a, q))) return true;
      }
      return false;
    });
  }

  // ─── Reference protection (delete safety) ──────────────────────────────────
  // Given a category id, find every material AND every schedule row that
  // references it. UI uses this to block destructive deletes.
  function findReferencesToCategory(id, materials, projects) {
    const refs = { materials: [], rows: [] };
    (materials || []).forEach(m => {
      if (m.category === id) refs.materials.push(m);
    });
    (projects || []).forEach(p => {
      const rows = (p.schedule && p.schedule.rows) || p.rows || [];
      rows.forEach(r => {
        if (r.category === id) {
          refs.rows.push({ projectId: p.id, projectName: p.name, rowId: r.id, row: r });
        }
      });
    });
    return refs;
  }

  // ─── Empty-bucket label ────────────────────────────────────────────────────
  // Single source of truth for the "no value" bucket label. bucketItems falls
  // back to this for missing keys; CostSchedule consumers use it directly.
  const EMPTY_BUCKET_LABEL = 'Unspecified';

  // ─── Group-by helpers ──────────────────────────────────────────────────────
  // Return the field defs that make sense as a "Group by" axis given a set
  // of items. Always includes Category and Group as synthetic axes. Schema
  // select fields are only returned if at least one of the passed items has
  // a non-empty value for that field — keeps the menu scannable instead of
  // dumping the entire field catalogue.
  function groupableFields(items) {
    const synthetic = [
      { id: '_category', label: 'Category', type: 'synthetic' },
      { id: '_group',    label: 'Group',    type: 'synthetic' },
      { id: '_trade',    label: 'Trade',    type: 'synthetic' },
      { id: '_supplier', label: 'Supplier', type: 'synthetic' },
    ];
    const s = schemaActive();
    const fv = window.getFieldValue;
    const itemList = items || [];
    // Tag axes — surface as soon as ANY item has any tag value for the axis.
    // The axis is then a meaningful split between tagged / untagged items
    // even if everything tagged shares one value (only 2 buckets — still
    // informative). Hidden entirely only when zero items have touched the
    // axis, so the dormant axes don't clutter the menu.
    const tagAxes = Object.keys(s.tagAxes || {}).map(axis => ({
      id: '_tag_' + axis,
      label: axis.replace(/^./, c => c.toUpperCase()).replace(/([A-Z])/g, ' $1').trim() + ' tag',
      type: 'tag',
      tagAxis: axis,
    })).filter(ax => {
      for (let i = 0; i < itemList.length; i++) {
        const it = itemList[i];
        const tags = (it && it.fields && it.fields.tags && it.fields.tags[ax.tagAxis]) || [];
        if (tags.length > 0) return true;
      }
      return false;
    });
    // Only schema select fields with:
    //   • not in the hardcoded NEVER_GROUPABLE blacklist (catches measurement-y
    //     fields whether or not the live taxonomies got the `groupable: false`
    //     flag — appState.taxonomies is cloud-synced and may pre-date the
    //     flag), AND
    //   • opt-in via `groupable !== false` flag (clean contract for future
    //     fields), AND
    //   • value isn't the same on every item (distinct count > 1 — a single-
    //     bucket axis isn't actually grouping anything), AND
    //   • populated on at least MIN_FIELD_COVERAGE share of the visible items
    //     — a field where 95% of items would land in "Unspecified" isn't a
    //     useful grouping axis even if the populated 5% have varied values.
    //     This is what makes group-by adapt to filterCategory: on "All" only
    //     broadly-populated fields surface; on a specific category, that
    //     category's fields become useful because they're widely populated
    //     within the filtered scope.
    const fieldStats = (id) => {
      const set = new Set();
      let withValue = 0;
      for (let i = 0; i < itemList.length; i++) {
        const v = fv ? fv(itemList[i], id) : (itemList[i] && itemList[i].fields && itemList[i].fields[id]);
        if (v != null && v !== '') {
          set.add(String(v));
          withValue++;
        }
      }
      return {
        distinct: set.size,
        coverage: itemList.length > 0 ? withValue / itemList.length : 0,
      };
    };
    const selectFields = (s.fields || [])
      .filter(f => f.type === 'select' && !f.multiple && !f.tagAxis)
      .filter(f => !NEVER_GROUPABLE.has(f.id))
      .filter(f => f.groupable !== false)
      .filter(f => {
        const stats = fieldStats(f.id);
        return stats.distinct > 1 && stats.coverage >= MIN_FIELD_COVERAGE;
      });
    return [].concat(synthetic, tagAxes, selectFields);
  }
  // Minimum share of visible items that must have a non-empty value for a
  // schema select field to surface as a Group-by axis. 0.2 = 20%. Tune up if
  // the menu still feels noisy, down if useful axes are getting hidden.
  const MIN_FIELD_COVERAGE = 0.2;
  // Field ids that should never appear as a Group-by axis regardless of the
  // schema flag or item cardinality. Measurement-y / count-y / dimension-y
  // fields where the bucket label ("ea", "1 gang", "4° angle", "20mm") is
  // meaningless to a designer. Future-prune rule: ids ending in
  // _mm / _count / _gangs / _poles / _diameter / _slope / _angle usually
  // belong here; ids ending in _type / _material / _finish / _profile /
  // _pattern / _grade / _mounting / _fixing usually don't.
  const NEVER_GROUPABLE = new Set([
    // Measurement scale
    'unit',
    // Counts / cardinality
    'basin_taphole_count', 'outlet_gangs', 'phases', 'poles',
    'rack_width', 'sink_bowl_count', 'switch_gangs', 'tapware_handle_count',
    // Dimensions
    'counter_height_mm', 'emitter_spacing_mm',
    'grab_rail_diameter', 'hose_diameter',
    // Geometric scalars
    'escalator_angle', 'irrigation_arc', 'linear_drain_slope',
    'playground_age_range', 'ramp_gradient', 'travelator_slope',
    // Power
    'smoke_det_power',
  ]);

  // Number of distinct buckets a given axis would produce over `items`.
  // Used to annotate group-by options with "(N buckets)".
  function bucketCountForAxis(axis, items) {
    if (!axis) return 0;
    const set = new Set();
    (items || []).forEach(item => {
      const keys = bucketKeysFor(axis, item);
      const arr = Array.isArray(keys) ? keys : [keys];
      if (arr.length === 0) { set.add(EMPTY_BUCKET_LABEL); return; }
      arr.forEach(k => set.add((k == null || k === '') ? EMPTY_BUCKET_LABEL : String(k)));
    });
    return set.size;
  }

  // Count of items per category id. Used by the Filter dropdown to annotate
  // each category option with "(N)".
  function itemCountByCategory(items) {
    const out = {};
    (items || []).forEach(it => {
      const c = it && it.category;
      if (!c) return;
      out[c] = (out[c] || 0) + 1;
    });
    return out;
  }

  // Given an array of category ids, return Dropdown-shaped sections grouped by
  // the parent group, ordered by group sortOrder. Categories not in the schema
  // are dropped silently. Used by the Filter dropdown.
  function categorySectionsForIds(catIds) {
    const s = schemaActive();
    const groups = (s.groups || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const seen = new Set(catIds || []);
    const out = [];
    groups.forEach(g => {
      const cats = (s.categories || [])
        .filter(c => c.groupId === g.id && !c.hidden && seen.has(c.id))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      if (!cats.length) return;
      out.push({
        title: g.label,
        options: cats.map(c => ({ value: c.id, label: c.label })),
      });
    });
    return out;
  }

  // Given an axis spec from groupableFields() and an item, return the bucket
  // key(s) it belongs to. Multi-value (tags) returns an array; single returns
  // a string. Used by the view layer to bucket items for group-by display.
  function bucketKeysFor(axis, item) {
    if (!item) return [];
    if (axis.id === '_category') return [item.category || ''];
    if (axis.id === '_group') {
      const cat = categoryDef(item.category);
      return [cat ? cat.groupId : ''];
    }
    if (axis.id === '_trade')    return [(item.fields && item.fields.trade) || ''];
    if (axis.id === '_supplier') return [(item.fields && item.fields.supplier) || item.supplier || ''];
    if (axis.tagAxis) {
      const tags = (item.fields && item.fields.tags) || {};
      return tags[axis.tagAxis] || [];
    }
    if (axis.type === 'select') {
      return [(item.fields && item.fields[axis.id]) || ''];
    }
    return [];
  }

  // ─── Group-by bucketing (Phase 4) ──────────────────────────────────────────
  // Bucket items by an axis id (from groupableFields()) into ordered groups.
  // Multi-value axes (tags, multi-select fields) expand: an item with two
  // values appears under both groups. Empty/missing values land in '—'.
  // Returns [[label, items], ...] in first-appearance order.
  function bucketItems(items, axisId) {
    if (!axisId) return [['', items || []]];
    const fields = (schemaActive().fields || []);
    const tagAxes = schemaActive().tagAxes || {};
    let axis = null;
    if (axisId === '_category' || axisId === '_group' || axisId === '_trade' || axisId === '_supplier') {
      axis = { id: axisId, type: 'synthetic' };
    } else if (axisId.indexOf('_tag_') === 0) {
      const t = axisId.substring(5);
      axis = { id: axisId, tagAxis: t, type: 'tag' };
    } else {
      const f = fields.find(x => x.id === axisId);
      if (f) axis = { id: f.id, type: f.type, multiple: f.multiple };
    }
    if (!axis) return [['', items || []]];

    const out = new Map();
    function push(key, item) {
      const k = (key == null || key === '') ? EMPTY_BUCKET_LABEL : String(key);
      if (!out.has(k)) out.set(k, []);
      out.get(k).push(item);
    }

    (items || []).forEach(item => {
      const keys = bucketKeysFor(axis, item);
      const arr = Array.isArray(keys) ? keys : [keys];
      if (arr.length === 0) push(EMPTY_BUCKET_LABEL, item);
      else arr.forEach(k => push(k, item));
    });

    // Pretty-label the keys for known axes.
    const out2 = [];
    out.forEach((arr, k) => {
      let label = k;
      if (axis.id === '_category') {
        const cat = categoryDef(k);
        if (cat) label = cat.label;
      } else if (axis.id === '_group') {
        const g = groupDef(k);
        if (g) label = g.label;
      } else if (axis.tagAxis) {
        const t = (tagAxes[axis.tagAxis] || []).find(x => x.id === k);
        if (t) label = t.label;
      } else if (axis.type === 'select') {
        const f = fields.find(x => x.id === axis.id);
        const opt = f && (f.options || []).find(o => o.value === k);
        if (opt) label = opt.label;
      }
      out2.push([label, arr]);
    });
    return out2;
  }

  // ─── Clone helpers (Phase 4 — Field Manager) ───────────────────────────────
  // Returns a structuredClone-deep copy of DEFAULT_SCHEMA_V5. Used by the
  // taxonomies setter to seed appState.taxonomies the first time the user
  // opens the Field Manager (so edits don't mutate the shared default).
  function cloneDefaultSchemaV5() {
    if (!window.DEFAULT_SCHEMA_V5) return null;
    if (typeof structuredClone === 'function') return structuredClone(window.DEFAULT_SCHEMA_V5);
    return JSON.parse(JSON.stringify(window.DEFAULT_SCHEMA_V5));
  }

  // Stable id maker — slugifies a label, ensures uniqueness within a list of
  // existing ids by appending _2, _3, …
  function makeStableId(label, existingIds) {
    const base = String(label || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'item';
    if (!existingIds || !existingIds.includes(base)) return base;
    let n = 2;
    while (existingIds.includes(base + '_' + n)) n++;
    return base + '_' + n;
  }

  // ─── Inline tag-axis create ────────────────────────────────────────────────
  // Adds a new entry to a tag axis (used by ChipMultiSelect's create-on-Enter
  // flow). Reads existing axis entries via schemaActive(), generates a stable
  // id (slug + dedupe), and persists via window.setTaxonomies (LoadingGate
  // setter — do NOT spread window._appState).
  //
  // If an existing entry's id or label matches the trimmed input (case-
  // insensitive), no-op-and-return that id so callers can simply toggle it on.
  function addTagToAxis(axis, rawLabel) {
    if (!axis) return null;
    const label = String(rawLabel || '').trim();
    if (!label) return null;
    const existing = (((schemaActive().tagAxes || {})[axis]) || []);
    const lc = label.toLowerCase();
    const match = existing.find(t =>
      String(t.id).toLowerCase() === lc ||
      String(t.label || '').toLowerCase() === lc
    );
    if (match) return match.id;
    const id = makeStableId(label, existing.map(t => t.id));
    if (typeof window.setTaxonomies !== 'function') {
      console.warn('[addTagToAxis] window.setTaxonomies not yet available');
      return null;
    }
    window.setTaxonomies(prev => {
      const base = prev || cloneDefaultSchemaV5() || { tagAxes: {} };
      const tagAxes = Object.assign({}, base.tagAxes || {});
      const list = (tagAxes[axis] || []).slice();
      list.push({ id, label, sortOrder: list.length + 1, hidden: false });
      tagAxes[axis] = list;
      return Object.assign({}, base, { tagAxes });
    });
    return id;
  }

  // ─── Expose ────────────────────────────────────────────────────────────────
  window.cloneDefaultSchemaV5 = cloneDefaultSchemaV5;
  window.makeStableId = makeStableId;
  window.addTagToAxis = addTagToAxis;
  window.bucketItems = bucketItems;
  window.schemaActive = schemaActive;
  window.commonFields = commonFields;
  window.commonFieldIds = commonFieldIds;
  window.groupDef = groupDef;
  window.categoryDef = categoryDef;
  window.fieldDef = fieldDef;
  window.categoriesByGroup = categoriesByGroup;
  window.categoriesInGroup = categoriesInGroup;
  window.fieldsForCategory = fieldsForCategory;
  window.tagsForAxis = tagsForAxis;
  window.defaultTradeForCategory = defaultTradeForCategory;
  window.searchCategories = searchCategories;
  window.searchItems = searchItems;
  window.findReferencesToCategory = findReferencesToCategory;
  window.groupableFields = groupableFields;
  window.bucketKeysFor = bucketKeysFor;
  window.bucketCountForAxis = bucketCountForAxis;
  window.itemCountByCategory = itemCountByCategory;
  window.categorySectionsForIds = categorySectionsForIds;
  window.EMPTY_BUCKET_LABEL = EMPTY_BUCKET_LABEL;
})();
