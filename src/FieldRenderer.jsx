// src/FieldRenderer.jsx — Phase 2 of the v5 Library Field System.
//
// One component handles all 11 v5 field types in both edit and read modes,
// driven by the field def from window.DEFAULT_SCHEMA_V5 / fieldDef(id).
//
// Types: text · longText · number · currency · boolean · select (incl.
// multi-select + tag-axis) · date · url · color · swatchRef · itemRef.
//
// Also exposes three legacy-tolerance helpers used during Phase 2 (until
// migrate-v5 lands in Phase 3):
//   • legacyCategoryFor(item)     → derives a v5 category id from old
//                                   kind/category/productType so renderers
//                                   work on un-migrated items
//   • getFieldValue(item, fieldId)→ reads m.fields[id] first, then a small
//                                   alias map on legacy top-level keys
//   • setFieldOnDraft(setRaw, fieldId, value)
//                                 → writes to draft.fields[id] AND to the
//                                   legacy top-level alias so old code
//                                   paths keep reading the right value

(function () {
  const { useState, useMemo, useEffect, useRef } = React;

  // ─── Legacy aliasing ───────────────────────────────────────────────────────
  // Map v5 field ids → legacy top-level keys (where they differ). Ids that are
  // identical on both sides don't need entries.
  const LEGACY_ALIASES = {
    unit_cost: 'unitCost',
    lead_time: 'leadTime',
    country_of_origin: 'origin',
    image_ref: 'image',
    paintedWith: 'paintedWithId',
    // tags is structurally different (object-by-axis vs flat array) — handled
    // explicitly in getFieldValue.
  };

  // Read a field value off an item. Prefers the new shape (m.fields[id]) then
  // falls back to the legacy top-level shape via the alias map. Tags are
  // returned as { performance: [], location: [], materialFamily: [] } when
  // any axis-specific id is requested.
  function getFieldValue(item, fieldId) {
    if (!item) return undefined;
    if (fieldId === 'tags_performance' || fieldId === 'tags_location' || fieldId === 'tags_material_family') {
      const axis = fieldId === 'tags_performance' ? 'performance'
                 : fieldId === 'tags_location'    ? 'location'
                 :                                  'materialFamily';
      const fieldsBucket = item.fields && item.fields.tags && item.fields.tags[axis];
      if (Array.isArray(fieldsBucket)) return fieldsBucket;
      // Legacy: m.tags is a flat string[]; surface only on the performance
      // axis so the array isn't duplicated across all three pickers.
      if (axis === 'performance' && Array.isArray(item.tags)) return item.tags;
      return [];
    }
    if (item.fields && fieldId in item.fields) return item.fields[fieldId];
    const legacy = LEGACY_ALIASES[fieldId];
    if (legacy && item[legacy] !== undefined) return item[legacy];
    return item[fieldId];
  }

  // Write a field on a draft via the editor's `set(key, value)` callback.
  // Writes new shape (fields[id]) AND the legacy alias so unmigrated readers
  // keep working. set() is the editor's existing setter — typically of the
  // form (key, value) => setDraft(d => ({ ...d, [key]: value })).
  function setFieldOnDraft(set, fieldId, value, draft) {
    // Tags by axis: replace the right slot inside fields.tags = { axis: [] }.
    if (fieldId === 'tags_performance' || fieldId === 'tags_location' || fieldId === 'tags_material_family') {
      const axis = fieldId === 'tags_performance' ? 'performance'
                 : fieldId === 'tags_location'    ? 'location'
                 :                                  'materialFamily';
      const prevTags = (draft && draft.fields && draft.fields.tags) || {};
      const nextTags = Object.assign({}, prevTags, { [axis]: value || [] });
      const prevFields = (draft && draft.fields) || {};
      set('fields', Object.assign({}, prevFields, { tags: nextTags }));
      // Also keep legacy m.tags (flat) loosely in sync — union of all axes.
      const flat = [].concat(nextTags.performance || [], nextTags.location || [], nextTags.materialFamily || []);
      set('tags', Array.from(new Set(flat)));
      return;
    }
    const prevFields = (draft && draft.fields) || {};
    set('fields', Object.assign({}, prevFields, { [fieldId]: value }));
    // Legacy aliases: also write to the legacy key so old read paths see the
    // value during the Phase 2 transition.
    const legacy = LEGACY_ALIASES[fieldId];
    if (legacy) set(legacy, value);
    else set(fieldId, value);
  }

  // ─── Atom shortcuts ────────────────────────────────────────────────────────
  function lbl(field) {
    const u = field && field.unit;
    return u ? `${field.label} (${u})` : (field && field.label) || field.id;
  }

  function emDash() {
    return React.createElement('span', { style: { color: 'var(--ink-4)' } }, '—');
  }

  // ─── itemRef picker (uses PickerDrawer) ────────────────────────────────────
  function ItemRefField({ field, value, onChange, materials, mode }) {
    const [open, setOpen] = useState(false);
    const target = field.targetCategory;
    const choices = useMemo(() => {
      if (!Array.isArray(materials)) return [];
      if (!target) return materials;
      const wanted = Array.isArray(target) ? target : [target];
      return materials.filter(m => wanted.indexOf(m.category) !== -1);
    }, [materials, target]);
    const selected = Array.isArray(value)
      ? choices.filter(m => value.indexOf(m.id) !== -1)
      : (value ? [choices.find(m => m.id === value)].filter(Boolean) : []);

    if (mode === 'read') {
      if (selected.length === 0) return emDash();
      return React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
        selected.map(m =>
          React.createElement('span', { key: m.id, style: { display: 'inline-flex', gap: 6, alignItems: 'center' } },
            React.createElement('span', { style: {
              width: 14, height: 14, flexShrink: 0,
              background: (m.swatch && m.swatch.tone) || '#ddd',
              outline: '1px solid rgba(20,20,20,0.15)',
            } }),
            React.createElement('span', { style: { fontSize: 13 } }, m.name || m.code)
          )
        )
      );
    }

    function pick(picked) {
      // PickerDrawer returns id (single) or [ids] (multi).
      onChange(picked);
      setOpen(false);
    }

    return React.createElement(React.Fragment, null,
      React.createElement('button', {
        type: 'button',
        className: 'sel-d',
        onClick: () => setOpen(true),
        style: {
          display: 'flex', alignItems: 'center', gap: 8,
          textAlign: 'left', cursor: 'pointer',
          backgroundImage: 'none', paddingRight: 28, position: 'relative',
        }
      },
        selected.length > 0
          ? selected.map(m =>
              React.createElement('span', { key: m.id, style: { display: 'inline-flex', gap: 4, alignItems: 'center' } },
                React.createElement('span', { style: {
                  width: 12, height: 12, flexShrink: 0,
                  background: (m.swatch && m.swatch.tone) || '#ddd',
                  outline: '1px solid rgba(20,20,20,0.15)',
                } }),
                React.createElement('span', { style: { fontSize: 12.5 } }, m.name || m.code)
              ))
          : React.createElement('span', { style: { color: 'var(--ink-4)', fontSize: 13 } }, '— pick from library —'),
        React.createElement('span', { style: {
          fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)',
          position: 'absolute', right: 10
        } }, '▾')
      ),
      window.PickerDrawer && React.createElement(window.PickerDrawer, {
        open,
        eyebrow: field.label,
        title: 'Pick from Library',
        materials: choices,
        selectionMode: field.multiple ? 'multi' : 'single',
        initialSelected: Array.isArray(value) ? value : (value ? [value] : []),
        onPick: pick,
        onClose: () => setOpen(false),
      })
    );
  }

  // ─── Tag / multi-select chip picker ────────────────────────────────────────
  function ChipMultiSelect({ field, value, onChange, mode }) {
    const options = useMemo(() => {
      if (field.tagAxis && window.tagsForAxis) {
        return (window.tagsForAxis(field.tagAxis) || []).map(t => ({ value: t.id, label: t.label }));
      }
      return field.options || [];
    }, [field]);
    const arr = Array.isArray(value) ? value : [];

    if (mode === 'read') {
      if (arr.length === 0) return emDash();
      return React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
        arr.map(v => {
          const opt = options.find(o => o.value === v);
          return React.createElement('span', { key: v, style: {
            fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 5px',
            letterSpacing: '0.05em', textTransform: 'uppercase',
            border: '1px solid var(--rule-2)',
            background: 'var(--paper-2)', color: 'var(--ink-3)',
          } }, opt ? opt.label : v);
        })
      );
    }

    function toggle(v) {
      const has = arr.indexOf(v) !== -1;
      onChange(has ? arr.filter(x => x !== v) : arr.concat(v));
    }

    return React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
      options.map(o => {
        const on = arr.indexOf(o.value) !== -1;
        return React.createElement('button', {
          key: o.value,
          type: 'button',
          onClick: () => toggle(o.value),
          style: {
            padding: '4px 10px',
            fontSize: 11,
            fontFamily: 'var(--font-sans)',
            border: '1px solid ' + (on ? 'var(--ink)' : 'var(--rule-2)'),
            background: on ? 'var(--tint)' : 'var(--paper)',
            color: on ? 'var(--ink)' : 'var(--ink-3)',
            cursor: 'pointer',
          }
        }, o.label);
      })
    );
  }

  // ─── Main component ────────────────────────────────────────────────────────
  // Props:
  //   field      — field def from fieldDef(id) / fieldsForCategory(...).
  //   value      — current value (from getFieldValue).
  //   onChange   — (newValue) => void
  //   mode       — 'edit' (default) | 'read'
  //   materials  — array of materials, needed for itemRef pickers
  //   draft      — optional; if provided, signals editor context
  function FieldRenderer({ field, value, onChange, mode = 'edit', materials = [], draft }) {
    if (!field) return null;
    const isRead = mode === 'read';
    const t = field.type;

    // ── Read mode: always render a value or em-dash ──────────────────────────
    if (isRead) {
      // Multi-select / tag axis renders as chips.
      if ((t === 'select' && field.multiple) || field.tagAxis) {
        return React.createElement(ChipMultiSelect, { field, value, onChange, mode });
      }
      if (t === 'itemRef') {
        return React.createElement(ItemRefField, { field, value, onChange, materials, mode });
      }
      if (t === 'boolean') {
        return React.createElement('span', { style: { fontSize: 13 } }, value ? 'Yes' : 'No');
      }
      if (t === 'currency') {
        if (value == null || value === '') return emDash();
        const n = Number(value);
        return React.createElement('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 13 } },
          isFinite(n) ? `$${n.toFixed(2)}` : String(value));
      }
      if (t === 'color' || t === 'swatchRef') {
        const tone = (value && (value.tone || value)) || null;
        return React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
          React.createElement('span', { style: {
            width: 14, height: 14, flexShrink: 0,
            background: typeof tone === 'string' ? tone : ((value && value.tone) || '#ddd'),
            outline: '1px solid rgba(20,20,20,0.15)',
          } }),
          React.createElement('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 11 } },
            (typeof tone === 'string' && tone) || (value && value.tone) || '—')
        );
      }
      if (t === 'url') {
        if (!value) return emDash();
        return React.createElement('a', {
          href: String(value), target: '_blank', rel: 'noreferrer',
          style: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-ink)' }
        }, String(value));
      }
      if (value == null || value === '') return emDash();
      const isMono = t === 'number' || t === 'date';
      return React.createElement('span', { style: {
        fontFamily: isMono ? 'var(--font-mono)' : 'var(--font-serif)',
        fontSize: 13,
      } }, String(value) + (field.unit ? ` ${field.unit}` : ''));
    }

    // ── Edit mode ────────────────────────────────────────────────────────────
    if ((t === 'select' && field.multiple) || field.tagAxis) {
      return React.createElement(ChipMultiSelect, { field, value, onChange, mode });
    }

    if (t === 'itemRef') {
      return React.createElement(ItemRefField, { field, value, onChange, materials, mode });
    }

    if (t === 'boolean') {
      return React.createElement('label', {
        style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }
      },
        React.createElement('input', {
          type: 'checkbox',
          checked: !!value,
          onChange: e => onChange(e.target.checked),
          style: { accentColor: 'var(--accent)', margin: 0 },
        }),
        React.createElement('span', { className: 'lbl-d', style: { marginBottom: 0 } }, field.helpText || '')
      );
    }

    if (t === 'select') {
      return React.createElement('select', {
        className: 'sel-d',
        value: value == null ? '' : value,
        onChange: e => onChange(e.target.value || null),
      },
        React.createElement('option', { value: '' }, '—'),
        (field.options || []).map(o =>
          React.createElement('option', { key: o.value, value: o.value }, o.label || o.value))
      );
    }

    if (t === 'longText') {
      return React.createElement('textarea', {
        className: 'tarea-d',
        rows: 4,
        value: value || '',
        onChange: e => onChange(e.target.value),
      });
    }

    if (t === 'number') {
      return React.createElement('input', {
        className: 'inp-d mono',
        type: 'number',
        value: value == null ? '' : value,
        onChange: e => onChange(e.target.value === '' ? null : Number(e.target.value)),
        placeholder: field.unit ? field.unit : undefined,
      });
    }

    if (t === 'currency') {
      return React.createElement('input', {
        className: 'inp-d mono',
        type: 'number',
        step: '0.01',
        value: value == null ? '' : value,
        onChange: e => onChange(e.target.value === '' ? null : Number(e.target.value)),
        placeholder: '0.00',
      });
    }

    if (t === 'url') {
      return React.createElement('input', {
        className: 'inp-d mono',
        type: 'url',
        value: value || '',
        onChange: e => onChange(e.target.value),
        placeholder: 'https://…',
      });
    }

    if (t === 'date') {
      return React.createElement('input', {
        className: 'inp-d mono',
        type: 'date',
        value: value || '',
        onChange: e => onChange(e.target.value),
      });
    }

    if (t === 'color' || t === 'swatchRef') {
      // For now both render as a simple colour swatch. swatchRef in v1 also
      // links to a Swatch component; the Phase 4 field manager will add
      // dedicated handling for the linked-swatch flavour.
      const hex = (value && (value.tone || value)) || '#cccccc';
      return React.createElement('div', { style: { display: 'flex', gap: 6 } },
        React.createElement('input', {
          type: 'color',
          value: typeof hex === 'string' ? hex : '#cccccc',
          onChange: e => onChange(t === 'swatchRef' ? Object.assign({}, value || {}, { tone: e.target.value }) : e.target.value),
          style: { width: 44, height: 32, flexShrink: 0, border: '1px solid var(--rule-2)', background: 'var(--paper)', padding: 0, cursor: 'pointer' },
        }),
        React.createElement('input', {
          className: 'inp-d mono',
          value: typeof hex === 'string' ? hex : (hex || ''),
          onChange: e => onChange(t === 'swatchRef' ? Object.assign({}, value || {}, { tone: e.target.value }) : e.target.value),
        })
      );
    }

    // text — default
    return React.createElement('input', {
      className: 'inp-d',
      type: 'text',
      value: value || '',
      onChange: e => onChange(e.target.value),
      placeholder: field.helpText || '',
    });
  }

  // ─── Convenience: render a labelled field row (label + control) ────────────
  function FieldRow({ field, value, onChange, mode = 'edit', materials = [], draft, hideLabel = false }) {
    if (!field || field.hidden) return null;
    const ctrl = React.createElement(FieldRenderer, { field, value, onChange, mode, materials, draft });
    if (hideLabel) return ctrl;
    return React.createElement('div', null,
      React.createElement('label', { className: 'lbl-d' }, lbl(field)),
      ctrl
    );
  }

  // ─── Expose ────────────────────────────────────────────────────────────────
  window.FieldRenderer = FieldRenderer;
  window.FieldRow = FieldRow;
  window.getFieldValue = getFieldValue;
  window.setFieldOnDraft = setFieldOnDraft;
})();
