// SchemaSections — Phase 7 extension to the v5 schema for the Edit Product v7
// drawer. Adds first-class "sections" (Identity / Visual / Specs / Commercial /
// Notes by default) plus per-field overrides: section assignment, 12-col width,
// hidden / deleted, intra-section order.
//
// Storage shape (overlaid on the live taxonomies blob):
//   sections:          [{ id, label, sortOrder, locked? }, ...]
//   fieldOverrides:    { [fieldId]: { sectionId?, w?, hidden?, deleted? } }
//   sectionFieldOrder: { [sectionId]: [fieldId, fieldId, ...] }
//
// Anything not overridden falls back to a legacy bucket inferred from the
// field id (see DEFAULT_SECTION_RULES). Width defaults to 12 (or 6 for fields
// in the "split-pair" set). Hidden / deleted default to false.
//
// Mutators go through window.setTaxonomies, the same path FieldManager uses.
// All mutators are idempotent and clone before they edit.
//
// Exposed on window:
//   sectionsActive()                 → ordered sections array
//   sectionForField(field|id)        → sectionId for a field
//   widthForField(field|id)          → 3 | 4 | 6 | 8 | 9 | 12
//   isFieldHidden(field|id)          → bool
//   isFieldDeleted(field|id)         → bool
//   sectionedFieldsForCategory(cat)  → [{ section, fields:[fieldDef…] }, …]
//   schemaMutators                   → patch helpers (see bottom of file)

(function () {
  // ─── Defaults ──────────────────────────────────────────────────────────────
  const DEFAULT_SECTIONS = [
    { id: 'identity',   label: 'Identity',   sortOrder: 1, locked: true },
    { id: 'visual',     label: 'Visual',     sortOrder: 2, locked: true },
    { id: 'specs',      label: 'Specs',      sortOrder: 3 },
    { id: 'commercial', label: 'Commercial', sortOrder: 4 },
    { id: 'notes',      label: 'Notes',      sortOrder: 5 },
  ];

  // Legacy bucket map: which v5 field id lives in which section by default.
  // The v7 drawer overrides this via fieldOverrides[id].sectionId once the
  // user customises a field, but the rules below cover every untouched field
  // so the drawer renders sensibly from day one.
  const IDENTITY_IDS   = new Set(['code', 'name', 'supplier', 'brand', 'range', 'model']);
  const VISUAL_IDS     = new Set(['swatch', 'colour']);
  const COMMERCIAL_IDS = new Set([
    'unit', 'unit_cost', 'lead_time', 'supplier_code', 'country_of_origin',
    'manufacturer', 'contact', 'product_url', 'warranty',
  ]);
  const NOTES_IDS = new Set(['notes', 'install_notes', 'image_ref']);

  function defaultSectionForField(fieldId) {
    if (IDENTITY_IDS.has(fieldId))   return 'identity';
    if (VISUAL_IDS.has(fieldId))     return 'visual';
    if (COMMERCIAL_IDS.has(fieldId)) return 'commercial';
    if (NOTES_IDS.has(fieldId))      return 'notes';
    return 'specs';
  }

  // Width defaults — a small set of "half by default" fields, everything else
  // is full-width. Matches the v7 prototype.
  const HALF_DEFAULT = new Set([
    'code', 'supplier', 'brand', 'range', 'model', 'subtype', 'finish',
    'finish_colour', 'unit', 'lead_time', 'supplier_code', 'manufacturer',
    'contact', 'warranty', 'country_of_origin', 'unit_cost',
  ]);
  // Thirds for dimensional triplets.
  const THIRD_DEFAULT = new Set(['width', 'height', 'depth', 'length', 'thickness']);

  function defaultWidthForField(field) {
    if (!field) return 12;
    const id = field.id;
    if (THIRD_DEFAULT.has(id)) return 4;
    if (HALF_DEFAULT.has(id))  return 6;
    if (field.type === 'longText') return 12;
    return 12;
  }

  // ─── Active accessors ──────────────────────────────────────────────────────
  function schema() {
    return (window.schemaActive ? window.schemaActive() : window.DEFAULT_SCHEMA_V5) || {};
  }

  function sectionsActive() {
    const s = schema();
    if (Array.isArray(s.sections) && s.sections.length) {
      return s.sections.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }
    return DEFAULT_SECTIONS.slice();
  }

  function fieldOverrides() {
    const s = schema();
    return (s.fieldOverrides && typeof s.fieldOverrides === 'object') ? s.fieldOverrides : {};
  }

  function sectionFieldOrder() {
    const s = schema();
    return (s.sectionFieldOrder && typeof s.sectionFieldOrder === 'object') ? s.sectionFieldOrder : {};
  }

  function _fieldId(fieldOrId) {
    if (!fieldOrId) return null;
    return typeof fieldOrId === 'string' ? fieldOrId : fieldOrId.id;
  }

  function sectionForField(fieldOrId) {
    const id = _fieldId(fieldOrId);
    if (!id) return 'specs';
    const ov = fieldOverrides()[id];
    if (ov && ov.sectionId) return ov.sectionId;
    return defaultSectionForField(id);
  }

  function widthForField(fieldOrId) {
    const id = _fieldId(fieldOrId);
    if (!id) return 12;
    const ov = fieldOverrides()[id];
    if (ov && Number(ov.w) > 0) return Number(ov.w);
    // Need the field def for the type-based default
    const def = window.fieldDef ? window.fieldDef(id) : null;
    return defaultWidthForField(def || { id });
  }

  function isFieldHidden(fieldOrId) {
    const id = _fieldId(fieldOrId);
    if (!id) return false;
    const ov = fieldOverrides()[id];
    return !!(ov && ov.hidden);
  }

  function isFieldDeleted(fieldOrId) {
    const id = _fieldId(fieldOrId);
    if (!id) return false;
    const ov = fieldOverrides()[id];
    return !!(ov && ov.deleted);
  }

  // Group a category's fields by section. Honours sectionFieldOrder when set,
  // otherwise sorts by the natural fieldsForCategory order.
  function sectionedFieldsForCategory(catId, opts) {
    const includeHidden = opts && opts.includeHidden;
    const fields = (window.fieldsForCategory ? window.fieldsForCategory(catId) : []) || [];
    const order = sectionFieldOrder();
    const sections = sectionsActive();
    const bySec = {};
    sections.forEach(s => { bySec[s.id] = []; });

    fields.forEach(f => {
      if (isFieldDeleted(f)) return;
      if (!includeHidden && isFieldHidden(f)) return;
      const sid = sectionForField(f);
      if (!bySec[sid]) bySec[sid] = [];
      bySec[sid].push(f);
    });

    // Apply per-section custom order if present.
    Object.keys(bySec).forEach(sid => {
      const list = bySec[sid];
      const ord  = order[sid];
      if (!ord || !ord.length) return;
      const idx = new Map(ord.map((id, i) => [id, i]));
      list.sort((a, b) => {
        const ai = idx.has(a.id) ? idx.get(a.id) : 9999;
        const bi = idx.has(b.id) ? idx.get(b.id) : 9999;
        if (ai !== bi) return ai - bi;
        return 0;
      });
    });

    return sections.map(s => ({ section: s, fields: bySec[s.id] || [] }));
  }

  // Same as above but returns hidden + deleted fields too, with their flag —
  // for the hidden-bin tray.
  function binFieldsForCategory(catId) {
    const fields = (window.fieldsForCategory ? window.fieldsForCategory(catId) : []) || [];
    const out = [];
    fields.forEach(f => {
      const hidden = isFieldHidden(f);
      const deleted = isFieldDeleted(f);
      if (hidden || deleted) out.push({ field: f, hidden, deleted });
    });
    return out;
  }

  // ─── Mutators ──────────────────────────────────────────────────────────────
  // All go through window.setTaxonomies. Falls back to setting on
  // window.appState.taxonomies if the setter isn't wired (defensive — should
  // always be wired by LoadingGate).
  function _patch(updater) {
    const apply = window.setTaxonomies;
    if (typeof apply === 'function') {
      apply(prev => updater(prev || (window.cloneDefaultSchemaV5 && window.cloneDefaultSchemaV5())));
      return;
    }
    // Fallback — direct mutation. Used only when called pre-mount.
    const next = updater(window.appState && window.appState.taxonomies);
    if (next && window.appState) window.appState.taxonomies = next;
  }

  function _clone(t) {
    if (!t) return null;
    if (typeof structuredClone === 'function') return structuredClone(t);
    return JSON.parse(JSON.stringify(t));
  }

  function _ensureSections(tax) {
    if (!tax.sections || !tax.sections.length) tax.sections = DEFAULT_SECTIONS.slice();
    return tax;
  }

  function _ensureOverrides(tax) {
    if (!tax.fieldOverrides) tax.fieldOverrides = {};
    return tax;
  }

  function _ensureOrder(tax) {
    if (!tax.sectionFieldOrder) tax.sectionFieldOrder = {};
    return tax;
  }

  function patchFieldOverride(fieldId, patch) {
    if (!fieldId) return;
    _patch(prev => {
      const t = _clone(prev) || {};
      _ensureOverrides(t);
      const cur = t.fieldOverrides[fieldId] || {};
      t.fieldOverrides[fieldId] = Object.assign({}, cur, patch);
      return t;
    });
  }

  function setFieldHidden(fieldId, hidden) { patchFieldOverride(fieldId, { hidden: !!hidden }); }
  function setFieldDeleted(fieldId, deleted) { patchFieldOverride(fieldId, { deleted: !!deleted }); }
  function setFieldWidth(fieldId, w) {
    const n = Number(w) || 12;
    patchFieldOverride(fieldId, { w: Math.max(1, Math.min(12, n)) });
  }
  function setFieldSection(fieldId, sectionId) { patchFieldOverride(fieldId, { sectionId }); }

  // Move a field to (sectionId, beforeFieldId | null). Recomputes the
  // section's order array, accounting for the move.
  function moveField(fieldId, targetSectionId, beforeFieldId) {
    if (!fieldId || !targetSectionId) return;
    _patch(prev => {
      const t = _clone(prev) || {};
      _ensureOverrides(t);
      _ensureOrder(t);
      _ensureSections(t);

      // Capture sibling lists for source + target sections.
      const fromSection = (t.fieldOverrides[fieldId] && t.fieldOverrides[fieldId].sectionId)
        || defaultSectionForField(fieldId);
      const baseFields = (window.fieldsForCategory && window.fieldsForCategory(null)) || [];

      function siblings(sid) {
        const list = [];
        baseFields.forEach(f => {
          if (f.id === fieldId) return;
          const sec = (t.fieldOverrides[f.id] && t.fieldOverrides[f.id].sectionId)
            || defaultSectionForField(f.id);
          if (sec === sid) list.push(f.id);
        });
        const ord = t.sectionFieldOrder[sid];
        if (ord && ord.length) {
          const idx = new Map(ord.map((id, i) => [id, i]));
          list.sort((a, b) => (idx.has(a) ? idx.get(a) : 9999) - (idx.has(b) ? idx.get(b) : 9999));
        }
        return list;
      }

      // Build new target order.
      const targetSibs = siblings(targetSectionId).filter(id => id !== fieldId);
      const insertAt = beforeFieldId
        ? targetSibs.indexOf(beforeFieldId)
        : targetSibs.length;
      const next = targetSibs.slice();
      next.splice(insertAt < 0 ? next.length : insertAt, 0, fieldId);
      t.sectionFieldOrder[targetSectionId] = next;

      // Also re-write source order without the field (so the order is canonical).
      if (fromSection !== targetSectionId) {
        const srcSibs = siblings(fromSection).filter(id => id !== fieldId);
        t.sectionFieldOrder[fromSection] = srcSibs;
      }

      // Assign the section override.
      const cur = t.fieldOverrides[fieldId] || {};
      t.fieldOverrides[fieldId] = Object.assign({}, cur, { sectionId: targetSectionId });
      return t;
    });
  }

  function reorderSections(sectionIds) {
    if (!Array.isArray(sectionIds) || !sectionIds.length) return;
    _patch(prev => {
      const t = _clone(prev) || {};
      _ensureSections(t);
      const byId = new Map(t.sections.map(s => [s.id, s]));
      const next = [];
      sectionIds.forEach((id, i) => {
        const s = byId.get(id);
        if (s) { next.push(Object.assign({}, s, { sortOrder: i + 1 })); byId.delete(id); }
      });
      // Append any sections not in the supplied order at the end (defensive).
      let i = next.length;
      byId.forEach(s => { next.push(Object.assign({}, s, { sortOrder: ++i })); });
      t.sections = next;
      return t;
    });
  }

  function renameSection(sectionId, label) {
    _patch(prev => {
      const t = _clone(prev) || {};
      _ensureSections(t);
      t.sections = t.sections.map(s => s.id === sectionId ? Object.assign({}, s, { label }) : s);
      return t;
    });
  }

  function addSection(label) {
    const trimmed = String(label || 'New section').trim() || 'New section';
    let newId = null;
    _patch(prev => {
      const t = _clone(prev) || {};
      _ensureSections(t);
      const existing = t.sections.map(s => s.id);
      newId = window.makeStableId
        ? window.makeStableId(trimmed, existing)
        : 'section_' + Date.now().toString(36);
      const next = t.sections.concat([{
        id: newId, label: trimmed, sortOrder: t.sections.length + 1,
      }]);
      t.sections = next;
      return t;
    });
    return newId;
  }

  function deleteSection(sectionId) {
    _patch(prev => {
      const t = _clone(prev) || {};
      _ensureSections(t);
      // Don't allow deleting locked sections.
      const sec = t.sections.find(s => s.id === sectionId);
      if (!sec || sec.locked) return t;
      t.sections = t.sections.filter(s => s.id !== sectionId);
      // Reassign fields to the first non-locked section (or 'specs' as a fallback).
      _ensureOverrides(t);
      const fallback = (t.sections[0] && t.sections[0].id) || 'specs';
      Object.keys(t.fieldOverrides).forEach(fid => {
        if (t.fieldOverrides[fid].sectionId === sectionId) {
          t.fieldOverrides[fid] = Object.assign({}, t.fieldOverrides[fid], { sectionId: fallback });
        }
      });
      return t;
    });
  }

  // Add a brand-new field to the schema, assigned to a section.
  // Type defaults to text; w defaults to 6.
  function addField(sectionId, label, type, opts) {
    if (!sectionId) return null;
    const lbl = String(label || 'New field').trim() || 'New field';
    let newId = null;
    _patch(prev => {
      const t = _clone(prev) || {};
      _ensureOverrides(t);
      _ensureOrder(t);
      if (!t.fields) t.fields = [];
      if (!t.commonFieldIds) t.commonFieldIds = [];
      const existing = t.fields.map(f => f.id);
      newId = window.makeStableId ? window.makeStableId(lbl, existing) : ('f_' + Date.now().toString(36));
      const fieldDef = Object.assign({
        id: newId, label: lbl, type: type || 'text',
      }, opts || {});
      t.fields = t.fields.concat([fieldDef]);
      // Add to commonFieldIds so it's available in every category.
      if (!t.commonFieldIds.includes(newId)) t.commonFieldIds = t.commonFieldIds.concat([newId]);
      // Assign override
      t.fieldOverrides[newId] = { sectionId, w: 6 };
      // Append to section order
      const ord = (t.sectionFieldOrder[sectionId] || []).slice();
      ord.push(newId);
      t.sectionFieldOrder[sectionId] = ord;
      return t;
    });
    return newId;
  }

  // Replace the entire schema with a fresh blob (used by undo/redo).
  function replaceSchema(nextSchema) {
    if (!nextSchema) return;
    _patch(() => _clone(nextSchema));
  }

  // Snapshot the current schema for undo/redo.
  function snapshotSchema() {
    return _clone(schema());
  }

  // ─── Expose ────────────────────────────────────────────────────────────────
  Object.assign(window, {
    DEFAULT_SECTIONS,
    sectionsActive,
    sectionForField,
    widthForField,
    isFieldHidden,
    isFieldDeleted,
    sectionedFieldsForCategory,
    binFieldsForCategory,
    schemaSectionMutators: {
      setFieldHidden, setFieldDeleted, setFieldWidth, setFieldSection,
      moveField, reorderSections, renameSection, addSection, deleteSection,
      addField, replaceSchema, snapshotSchema,
    },
  });
})();
