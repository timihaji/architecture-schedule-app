// ProductFieldBlocks — five drawer sections for Add Product / Edit Product.
//
// Phase 2 (Library Field System v5): every section is schema-driven via
// window.fieldsForCategory(category) + window.FieldRenderer. Kind-conditional
// ladders (isPaint / isAppliance / isLighting / isFFE) are gone — what fields
// render comes from the v5 schema, not from `draft.kind`.
//
// Pre-migration items: when draft.category isn't a v5 id, derive one via
// window.legacyCategoryFor(draft). The helper goes away in Phase 5.
//
// Visual section keeps its bespoke SwatchEditor (paint vs solid vs woodgrain
// vs image is a UI affordance, not a field). Identity also keeps its custom
// Code + Name row because they pre-date the schema and are required fields.

function PFB_Section({ num, label, children }) {
  return (
    <>
      <div className="section-h">
        <span>{label}</span>
        <span className="num">{num}</span>
      </div>
      {children}
    </>
  );
}

// Resolve the active v5 category id off the draft. Prefers the draft's
// category if it's a known v5 id, falls back to legacyCategoryFor() so old
// items still render fields during the Phase 2 transition.
function activeCategoryId(draft) {
  if (!draft) return 'other';
  if (draft.category && window.categoryDef && window.categoryDef(draft.category)) {
    return draft.category;
  }
  return (window.legacyCategoryFor && window.legacyCategoryFor(draft)) || 'other';
}

// Render a labelled field cell (.lbl-d + control via FieldRenderer).
function PFB_Field({ field, draft, set, materials, mode = 'edit', hideLabel = false, labelOverride }) {
  if (!field || field.hidden || !window.FieldRenderer) return null;
  const value = window.getFieldValue ? window.getFieldValue(draft, field.id) : draft[field.id];
  const onChange = (v) => window.setFieldOnDraft(set, field.id, v, draft);
  const u = field.unit;
  const lbl = labelOverride || (u ? `${field.label} (${u})` : field.label);
  if (hideLabel) {
    return <window.FieldRenderer field={field} value={value} onChange={onChange} mode={mode} materials={materials} draft={draft} />;
  }
  return (
    <div>
      <label className="lbl-d">{lbl}</label>
      <window.FieldRenderer field={field} value={value} onChange={onChange} mode={mode} materials={materials} draft={draft} />
    </div>
  );
}

// Pick out a subset of fields from the category's field list by id, in the
// order they appear in `fieldsForCategory`. Returns the field defs.
function pickFields(fields, ids) {
  const set = new Set(ids);
  return fields.filter(f => set.has(f.id));
}
function omitFields(fields, ids) {
  const set = new Set(ids);
  return fields.filter(f => !set.has(f.id));
}

// Field id buckets for the 5 sections. Anything not in another bucket lands
// in Specs by default.
const IDENTITY_IDS    = ['code', 'name', 'supplier', 'brand', 'range', 'model'];
const COMMERCIAL_IDS  = [
  'unit', 'unit_cost', 'lead_time',
  'supplier_code', 'country_of_origin',
  'manufacturer', 'contact', 'product_url', 'warranty',
];
const NOTES_IDS       = ['notes', 'image_ref', 'install_notes'];
const VISUAL_IDS      = ['swatch']; // SwatchEditor handles this directly
const SPECS_EXCLUDE   = new Set([].concat(IDENTITY_IDS, COMMERCIAL_IDS, NOTES_IDS, VISUAL_IDS));

function categoryPickerOptions() {
  const out = [];
  if (window.categoriesByGroup) {
    const byGroup = window.categoriesByGroup();
    const schema = window.schemaActive ? window.schemaActive() : window.DEFAULT_SCHEMA_V5;
    (schema.groups || []).forEach(g => {
      if (g.hidden) return;
      const cats = byGroup[g.id] || [];
      cats.forEach(c => {
        out.push({ id: c.id, label: c.label, group: g.label });
      });
    });
  }
  return out;
}

function PFB_Identity({ draft, set, codeError = false, showCode = false }) {
  const cat = activeCategoryId(draft);
  const catDef = window.categoryDef ? window.categoryDef(cat) : null;
  const grpDef = catDef && window.groupDef ? window.groupDef(catDef.groupId) : null;
  const cats = React.useMemo(categoryPickerOptions, []);
  const tradeValue = (window.getFieldValue ? window.getFieldValue(draft, 'trade') : draft.trade) || '';

  const fields = window.fieldsForCategory ? window.fieldsForCategory(cat) : [];
  // Identity-bucket fields, minus ones we render bespoke (code/name/supplier).
  const idFields = pickFields(fields, IDENTITY_IDS)
    .filter(f => f.id !== 'code' && f.id !== 'name' && f.id !== 'supplier');

  return (
    <PFB_Section num="02" label="Identity">
      {/* Row 1 — Code (office mode only) + Name */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: showCode ? '1fr 2fr' : '1fr',
        gap: '10px 14px', marginBottom: 10,
      }}>
        {showCode && (
          <div>
            <label className="lbl-d">Code<span className="req-d">*</span></label>
            <input
              className="inp-d mono"
              value={draft.code || ''}
              onChange={e => set('code', e.target.value)}
              style={codeError ? { borderColor: 'var(--accent)' } : undefined}
            />
          </div>
        )}
        <div>
          <label className="lbl-d">Name<span className="req-d">*</span></label>
          <input
            className="inp-d"
            value={draft.name || ''}
            onChange={e => set('name', e.target.value)}
          />
        </div>
      </div>

      {/* Row 2 — Group (read-only display) + Category picker */}
      <div className="row-2" style={{ marginBottom: 10 }}>
        <div>
          <label className="lbl-d">Group</label>
          <div className="sel-d"
            style={{ cursor: 'default', color: 'var(--ink-2)', backgroundImage: 'none', paddingRight: 10 }}
            title="Group is derived from the chosen category.">
            {grpDef ? grpDef.label : '—'}
          </div>
        </div>
        <div>
          <label className="lbl-d">Category</label>
          <select
            className="sel-d"
            value={cat}
            onChange={e => {
              const newCat = e.target.value;
              set('category', newCat);
              // Auto-derive trade unless user has explicitly overridden it.
              const touched = (draft._touched && draft._touched.trade) === true;
              if (!touched && window.defaultTradeForCategory) {
                window.setFieldOnDraft(set, 'trade', window.defaultTradeForCategory(newCat), draft);
              }
            }}>
            {cats.map(c => (
              <option key={c.id} value={c.id}>{c.label} — {c.group}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 3 — Supplier + Trade (Trade kept bespoke for the datalist + _touched flag) */}
      <div className="row-2" style={{ marginBottom: 10 }}>
        <div>
          <label className="lbl-d">Supplier</label>
          <input
            className="inp-d"
            value={(window.getFieldValue ? window.getFieldValue(draft, 'supplier') : draft.supplier) || ''}
            onChange={e => window.setFieldOnDraft(set, 'supplier', e.target.value, draft)}
          />
        </div>
        <div>
          <label className="lbl-d">Trade</label>
          <input
            className="inp-d"
            list="aml-trades"
            value={tradeValue}
            onChange={e => {
              window.setFieldOnDraft(set, 'trade', e.target.value, draft);
              set('_touched', Object.assign({}, draft._touched || {}, { trade: true }));
            }}
            placeholder="auto from category — override if needed"
          />
          <datalist id="aml-trades">
            {(window.TRADES || []).map(t => <option key={t} value={t} />)}
          </datalist>
        </div>
      </div>

      {/* Remaining identity fields from the schema (brand, range, model) */}
      {idFields.length > 0 && (
        <div className="row-2" style={{ marginBottom: 10 }}>
          {idFields.slice(0, 2).map(f => (
            <PFB_Field key={f.id} field={f} draft={draft} set={set} />
          ))}
        </div>
      )}
      {idFields.length > 2 && (
        <div className="row-2" style={{ marginBottom: 10 }}>
          {idFields.slice(2, 4).map(f => (
            <PFB_Field key={f.id} field={f} draft={draft} set={set} />
          ))}
        </div>
      )}
    </PFB_Section>
  );
}

function PFB_Visual({ draft, set, setSwatch, materials = [] }) {
  const cat = activeCategoryId(draft);
  const isPaint = cat === 'paint';
  const seed = parseInt((draft.id || '').slice(2)) || 1;
  // Linked-paint inheritance — looks up the itemRef stored in fields.paintedWith
  // (or legacy paintedWithId).
  const paintedWithId = window.getFieldValue ? window.getFieldValue(draft, 'paintedWith') : draft.paintedWithId;
  const linkedPaint = (draft.paintable || paintedWithId) && paintedWithId
    ? materials.find(x => x.id === paintedWithId)
    : null;
  const hex = (draft.swatch && draft.swatch.tone) || (isPaint ? '#e5e2d8' : '#b8aa94');

  return (
    <PFB_Section num="01" label="Visual">
      {window.SwatchEditor && (
        <window.SwatchEditor
          swatch={draft.swatch}
          setSwatch={setSwatch}
          seed={seed}
          category={isPaint ? 'Paint' : null}
          sheen={(window.getFieldValue && window.getFieldValue(draft, 'sheen')) || draft.sheen}
          linkedPaint={linkedPaint}
          inheritPaintTone={!!draft.inheritPaintTone}
          setInheritPaintTone={v => set('inheritPaintTone', v)}
        />
      )}
      {isPaint && (
        <div style={{ marginTop: 12 }}>
          <label className="lbl-d">Colour (hex)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="color"
              value={hex}
              onChange={e => {
                setSwatch('kind', 'paint');
                setSwatch('tone', e.target.value);
              }}
              style={{
                width: 44, height: 32, flexShrink: 0,
                border: '1px solid var(--rule-2)',
                background: 'var(--paper)',
                padding: 0, cursor: 'pointer',
              }}
            />
            <input
              className="inp-d mono"
              value={hex}
              onChange={e => {
                setSwatch('kind', 'paint');
                setSwatch('tone', e.target.value);
              }}
            />
          </div>
        </div>
      )}
    </PFB_Section>
  );
}

// Progressive disclosure: a value is "empty" if null/undefined/'' or an empty
// array. Filled fields stay visible by default; empty ones hide behind a
// chevron until the user reveals them.
function isFieldEmpty(draft, fieldId) {
  const v = window.getFieldValue ? window.getFieldValue(draft, fieldId) : draft[fieldId];
  if (v == null || v === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

// Pack fields into rows of 2, except wide types (longText, multi-select,
// tag-axis, itemRef) which take a full row.
function packIntoRows(fields) {
  const rows = [];
  let bucket = [];
  function flush() {
    if (bucket.length === 0) return;
    rows.push(bucket);
    bucket = [];
  }
  fields.forEach(f => {
    const isWide = f.type === 'longText' || (f.type === 'select' && f.multiple) || f.tagAxis || f.type === 'itemRef';
    if (isWide) { flush(); rows.push([f]); }
    else {
      bucket.push(f);
      if (bucket.length === 2) flush();
    }
  });
  flush();
  return rows;
}

function PFB_Specs({ draft, set, materials = [] }) {
  const cat = activeCategoryId(draft);
  const fields = window.fieldsForCategory ? window.fieldsForCategory(cat) : [];
  const specsFields = fields.filter(f => !SPECS_EXCLUDE.has(f.id));

  // Auto-inherit paint finish + tone when a paint is linked. paintedWith id
  // lives on draft.fields.paintedWith (or legacy paintedWithId).
  const paintedWithId = window.getFieldValue ? window.getFieldValue(draft, 'paintedWith') : draft.paintedWithId;
  const linkedPaint = paintedWithId ? materials.find(p => p.id === paintedWithId) : null;
  React.useEffect(() => {
    if (linkedPaint && draft.inheritPaintTone) {
      const paintTone = linkedPaint.swatch && linkedPaint.swatch.tone;
      if (paintTone && (!draft.swatch || draft.swatch.tone !== paintTone)) {
        set('swatch', Object.assign({}, draft.swatch || {}, { tone: paintTone }));
      }
    }
  }, [linkedPaint && linkedPaint.swatch && linkedPaint.swatch.tone, draft.inheritPaintTone]);

  const filled = specsFields.filter(f => !isFieldEmpty(draft, f.id));
  const empty  = specsFields.filter(f =>  isFieldEmpty(draft, f.id));
  const [showAll, setShowAll] = React.useState(false);

  const filledRows = packIntoRows(filled);
  const emptyRows  = packIntoRows(empty);

  return (
    <PFB_Section num="03" label="Specs">
      {filledRows.map((row, i) => (
        <div key={`f-${i}`} className={row.length === 2 ? 'row-2' : ''} style={{ marginBottom: 10 }}>
          {row.map(f => <PFB_Field key={f.id} field={f} draft={draft} set={set} materials={materials} />)}
        </div>
      ))}
      {showAll && emptyRows.map((row, i) => (
        <div key={`e-${i}`} className={row.length === 2 ? 'row-2' : ''} style={{ marginBottom: 10 }}>
          {row.map(f => <PFB_Field key={f.id} field={f} draft={draft} set={set} materials={materials} />)}
        </div>
      ))}
      {empty.length > 0 && (
        <button type="button"
          onClick={() => setShowAll(v => !v)}
          style={{
            marginTop: filled.length > 0 ? 6 : 0,
            padding: '4px 10px',
            fontSize: 11,
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            border: '1px dashed var(--rule-2)',
            background: 'transparent',
            color: 'var(--ink-3)',
            cursor: 'pointer',
          }}>
          {showAll
            ? `▴ Hide ${empty.length} empty field${empty.length === 1 ? '' : 's'}`
            : `▾ + ${empty.length} more field${empty.length === 1 ? '' : 's'}`}
        </button>
      )}
    </PFB_Section>
  );
}

function PFB_Commercial({ draft, set }) {
  const cat = activeCategoryId(draft);
  const fields = window.fieldsForCategory ? window.fieldsForCategory(cat) : [];
  const cFields = pickFields(fields, COMMERCIAL_IDS);

  // Pair fields into rows of 2.
  const rows = [];
  for (let i = 0; i < cFields.length; i += 2) rows.push(cFields.slice(i, i + 2));

  return (
    <PFB_Section num="05" label="Commercial">
      {rows.map((row, i) => (
        <div key={i} className="row-2" style={{ marginBottom: 10 }}>
          {row.map(f => <PFB_Field key={f.id} field={f} draft={draft} set={set} />)}
        </div>
      ))}

      <div className="row-2" style={{ marginBottom: 10 }}>
        <div>
          <label className="lbl-d">Currency</label>
          <select className="sel-d"
            value={draft.currency || 'AUD'}
            onChange={e => set('currency', e.target.value)}>
            {['AUD', 'USD', 'EUR', 'GBP', 'NZD'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
    </PFB_Section>
  );
}

function PFB_Notes({ draft, set }) {
  const cat = activeCategoryId(draft);
  const fields = window.fieldsForCategory ? window.fieldsForCategory(cat) : [];
  const notesFields = pickFields(fields, NOTES_IDS);

  return (
    <PFB_Section num="04" label="Notes">
      {notesFields.map(f => (
        <div key={f.id} style={{ marginBottom: 14 }}>
          <PFB_Field field={f} draft={draft} set={set} />
        </div>
      ))}
    </PFB_Section>
  );
}

window.ProductFieldBlocks = {
  Identity: PFB_Identity,
  Visual: PFB_Visual,
  Specs: PFB_Specs,
  Commercial: PFB_Commercial,
  Notes: PFB_Notes,
};
