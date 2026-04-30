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

  // ─── Group-by helpers ──────────────────────────────────────────────────────
  // Return the field defs that make sense as a "Group by" axis given a set
  // of items. Always includes Category and Group as synthetic axes.
  function groupableFields(items) {
    const synthetic = [
      { id: '_category', label: 'Category', type: 'synthetic' },
      { id: '_group',    label: 'Group',    type: 'synthetic' },
      { id: '_trade',    label: 'Trade',    type: 'synthetic' },
      { id: '_supplier', label: 'Supplier', type: 'synthetic' },
    ];
    const s = schemaActive();
    // Tag axes are always groupable.
    const tagAxes = Object.keys(s.tagAxes || {}).map(axis => ({
      id: '_tag_' + axis,
      label: axis.replace(/^./, c => c.toUpperCase()).replace(/([A-Z])/g, ' $1').trim() + ' tag',
      type: 'tag',
      tagAxis: axis,
    }));
    // Any select field present on the items is groupable.
    const selectFields = (s.fields || []).filter(f => f.type === 'select' && !f.multiple);
    return [].concat(synthetic, tagAxes, selectFields);
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

  // ─── Expose ────────────────────────────────────────────────────────────────
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
})();
