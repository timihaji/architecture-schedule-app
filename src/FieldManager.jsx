// src/FieldManager.jsx — Phase 4 of the v5 Library Field System.
//
// Settings → Library fields. Three tabs:
//   1. Categories   — groups (collapsible) + categories + per-category fields
//   2. Common       — workspace-level common field ids
//   3. Tags         — 3 axes: performance / location / materialFamily
//
// Persistence: every edit goes through cs.setTaxonomies (LoadingGate). The
// schema-helpers' schemaActive() reads window.appState.taxonomies first, so
// edits are visible to every consumer (renderers, group-by, search) on the
// next render.
//
// Reorder: ↑/↓ buttons (kept simple over drag — accessible, less brittle).
// Reset-to-default: scoped per-entity. Restores from DEFAULT_SCHEMA_V5; if
// the entity wasn't in defaults (user-added) we prompt to delete instead.
// Delete protection on categories: blocked while materials or schedule rows
// reference the id.

(function () {
  const { useState, useMemo, useEffect, useCallback } = React;

  // ─── Editing helpers ───────────────────────────────────────────────────────
  // Pure transforms on a v5 taxonomies blob. Each returns a new blob.

  function clone(t) {
    return typeof structuredClone === 'function' ? structuredClone(t) : JSON.parse(JSON.stringify(t));
  }

  function moveItem(arr, fromIdx, toIdx) {
    const next = arr.slice();
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    return next;
  }

  function reorderById(list, id, delta) {
    const idx = list.findIndex(x => x.id === id);
    if (idx < 0) return list;
    const next = idx + delta;
    if (next < 0 || next >= list.length) return list;
    return moveItem(list, idx, next);
  }

  function reorderStringId(list, id, delta) {
    const idx = list.indexOf(id);
    if (idx < 0) return list;
    const next = idx + delta;
    if (next < 0 || next >= list.length) return list;
    return moveItem(list, idx, next);
  }

  // ─── Top-level component ───────────────────────────────────────────────────
  function FieldManager() {
    const cs = window.useCloudState();
    const [tab, setTab] = useState('categories');
    const [editingField, setEditingField] = useState(null); // {fieldId} | null
    const [creatingFieldFor, setCreatingFieldFor] = useState(null); // {scope:'common'|'group'|'category', id?} | null

    const tax = (cs.taxonomies && cs.taxonomies.schemaVersion === 5)
      ? cs.taxonomies
      : window.DEFAULT_SCHEMA_V5;

    function patch(updater) {
      cs.setTaxonomies(prev => updater(prev || window.cloneDefaultSchemaV5()));
    }

    // Sub-tab content
    const tabs = [
      { id: 'categories', label: 'Categories' },
      { id: 'common',     label: 'Common fields' },
      { id: 'tags',       label: 'Tags' },
    ];

    return (
      <>
        <div className="st-sec-head">
          <div className="st-sec-head-kicker">13</div>
          <span className="st-sec-head-title">Library fields</span>
          <div className="st-sec-head-sub">
            Manage groups, categories, fields, and tags. Edits apply immediately
            to every Library view, the editor, and the schedule.
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 0, marginBottom: 24,
          borderBottom: '1px solid var(--rule)',
        }}>
          {tabs.map(t => (
            <button key={t.id} type="button"
              onClick={() => setTab(t.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 18px',
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: tab === t.id ? 'var(--ink)' : 'var(--ink-4)',
                fontWeight: tab === t.id ? 500 : 400,
                borderBottom: '2px solid ' + (tab === t.id ? 'var(--ink)' : 'transparent'),
                marginBottom: -1,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'categories' && (
          <CategoriesTab tax={tax} patch={patch}
            materials={cs.materials} projects={cs.projects}
            onEditField={fid => setEditingField({ fieldId: fid })}
            onCreateField={(scope) => setCreatingFieldFor(scope)} />
        )}
        {tab === 'common' && (
          <CommonTab tax={tax} patch={patch}
            onEditField={fid => setEditingField({ fieldId: fid })}
            onCreateField={() => setCreatingFieldFor({ scope: 'common' })} />
        )}
        {tab === 'tags' && (
          <TagsTab tax={tax} patch={patch} />
        )}

        {(editingField || creatingFieldFor) && (
          <FieldEditor
            tax={tax}
            field={editingField ? (tax.fields || []).find(f => f.id === editingField.fieldId) : null}
            scope={creatingFieldFor}
            onClose={() => { setEditingField(null); setCreatingFieldFor(null); }}
            onSave={(field, scope) => {
              patch(prev => {
                const next = clone(prev);
                next.fields = next.fields || [];
                const i = next.fields.findIndex(f => f.id === field.id);
                if (i < 0) next.fields.push(field);
                else next.fields[i] = field;
                if (scope) attachFieldToScope(next, field.id, scope);
                return next;
              });
              setEditingField(null); setCreatingFieldFor(null);
            }} />
        )}
      </>
    );
  }

  function attachFieldToScope(tax, fieldId, scope) {
    if (!scope) return;
    if (scope.scope === 'common') {
      tax.commonFieldIds = tax.commonFieldIds || [];
      if (!tax.commonFieldIds.includes(fieldId)) tax.commonFieldIds.push(fieldId);
    } else if (scope.scope === 'group') {
      const g = (tax.groups || []).find(g => g.id === scope.id);
      if (g) {
        g.fieldIds = g.fieldIds || [];
        if (!g.fieldIds.includes(fieldId)) g.fieldIds.push(fieldId);
      }
    } else if (scope.scope === 'category') {
      const c = (tax.categories || []).find(c => c.id === scope.id);
      if (c) {
        c.fieldIds = c.fieldIds || [];
        if (!c.fieldIds.includes(fieldId)) c.fieldIds.push(fieldId);
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORIES TAB
  // ───────────────────────────────────────────────────────────────────────────
  function CategoriesTab({ tax, patch, materials, projects, onEditField, onCreateField }) {
    const cs = window.useCloudState ? window.useCloudState() : null;
    // Deep-link target from the editor footer link (PFB_ReorderFieldsLink).
    // Read once on mount and clear so it doesn't keep re-selecting on every
    // unrelated UI change.
    const deepLinkCat = cs && cs.ui && cs.ui.fieldManagerCategory;
    const initial = React.useMemo(() => {
      if (deepLinkCat) {
        const cat = (tax.categories || []).find(c => c.id === deepLinkCat);
        if (cat) return { groupId: cat.groupId, selection: { type: 'category', id: cat.id } };
      }
      return null;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [openGroup, setOpenGroup] = useState(() =>
      (initial && initial.groupId) || (tax.groups[0] && tax.groups[0].id) || null);
    const [selection, setSelection] = useState(initial ? initial.selection : null); // {type:'group'|'category', id}

    // Clear the deep-link key after we've consumed it so a later visit to
    // Library fields doesn't re-jump to the same category.
    React.useEffect(() => {
      if (deepLinkCat && cs && cs.setUi) {
        cs.setUi({ fieldManagerCategory: null });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const groups = useMemo(() =>
      (tax.groups || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
      [tax.groups]);

    const categoriesByGroup = useMemo(() => {
      const out = {};
      groups.forEach(g => out[g.id] = []);
      (tax.categories || []).forEach(c => {
        const arr = out[c.groupId] || (out[c.groupId] = []);
        arr.push(c);
      });
      Object.keys(out).forEach(k =>
        out[k].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
      return out;
    }, [tax.categories, groups]);

    function addGroup() {
      const label = window.prompt('New group label?');
      if (!label) return;
      const id = window.makeStableId(label, (tax.groups || []).map(g => g.id));
      patch(prev => {
        const next = clone(prev);
        next.groups = (next.groups || []).concat([{
          id, label, fieldIds: [], sortOrder: (next.groups || []).length,
        }]);
        return next;
      });
      setOpenGroup(id);
      setSelection({ type: 'group', id });
    }

    function addCategory(groupId) {
      const label = window.prompt('New category label?');
      if (!label) return;
      const id = window.makeStableId(label, (tax.categories || []).map(c => c.id));
      patch(prev => {
        const next = clone(prev);
        next.categories = (next.categories || []).concat([{
          id, label, groupId, defaultUnit: 'ea',
          sortOrder: (next.categories || []).filter(c => c.groupId === groupId).length,
          flavour: 'product', fieldIds: [], aliases: [],
        }]);
        return next;
      });
      setSelection({ type: 'category', id });
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24, alignItems: 'start' }}>
        {/* LEFT: groups + categories */}
        <div style={{ border: '1px solid var(--rule-2)', minHeight: 400 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderBottom: '1px solid var(--rule-2)',
            background: 'var(--paper-2)',
          }}>
            <span style={{ ...window.ui.label, color: 'var(--ink-2)' }}>Groups · Categories</span>
            <button type="button" className="btn-ghost" onClick={addGroup}>+ Group</button>
          </div>
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {groups.map(g => {
              const isOpen = openGroup === g.id;
              const isSel = selection && selection.type === 'group' && selection.id === g.id;
              const cats = categoriesByGroup[g.id] || [];
              return (
                <div key={g.id} style={{ borderBottom: '1px dotted var(--rule-2)' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '8px 10px',
                    background: isSel ? 'var(--tint)' : (g.hidden ? 'transparent' : 'transparent'),
                    opacity: g.hidden ? 0.55 : 1,
                  }}>
                    <button type="button"
                      onClick={() => setOpenGroup(isOpen ? null : g.id)}
                      title={isOpen ? 'Collapse' : 'Expand'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                        padding: '2px 6px', fontFamily: 'var(--font-mono)',
                        fontSize: 11, color: 'var(--ink-3)' }}>
                      {isOpen ? '▾' : '▸'}
                    </button>
                    <button type="button"
                      onClick={() => setSelection({ type: 'group', id: g.id })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                        flex: 1, textAlign: 'left',
                        ...window.ui.serif, fontSize: 14, color: 'var(--ink)',
                        padding: '2px 0' }}>
                      {g.label} <span style={{ ...window.ui.mono, fontSize: 9.5, color: 'var(--ink-4)', marginLeft: 6 }}>{cats.length}</span>
                    </button>
                    <SmallReorder list={tax.groups || []} id={g.id} compare="id"
                      onMove={delta => patch(prev => {
                        const next = clone(prev);
                        next.groups = reorderById(next.groups, g.id, delta).map((x, i) => ({ ...x, sortOrder: i }));
                        return next;
                      })} />
                    <button type="button" className="fm-mini-btn"
                      title={g.hidden ? 'Unhide' : 'Hide'}
                      onClick={() => patch(prev => {
                        const next = clone(prev);
                        const i = next.groups.findIndex(x => x.id === g.id);
                        next.groups[i] = { ...next.groups[i], hidden: !next.groups[i].hidden };
                        return next;
                      })}>
                      {g.hidden ? '◐' : '◯'}
                    </button>
                    <button type="button" className="fm-mini-btn"
                      title="Rename group"
                      onClick={() => {
                        const label = window.prompt('Rename group', g.label);
                        if (!label || label === g.label) return;
                        patch(prev => {
                          const next = clone(prev);
                          const i = next.groups.findIndex(x => x.id === g.id);
                          next.groups[i] = { ...next.groups[i], label };
                          return next;
                        });
                      }}>
                      ✎
                    </button>
                    <button type="button" className="fm-mini-btn danger"
                      title="Delete group"
                      onClick={() => {
                        const visibleCats = cats.filter(c => !c.hidden);
                        if (visibleCats.length > 0) {
                          window.alert('Cannot delete group "' + g.label + '" — it still has ' + visibleCats.length + ' visible categories. Hide or move them first.');
                          return;
                        }
                        if (!window.confirm('Delete group "' + g.label + '"?')) return;
                        patch(prev => {
                          const next = clone(prev);
                          next.groups = (next.groups || []).filter(x => x.id !== g.id);
                          // Hidden categories under the group become orphans —
                          // also remove (they were already hidden from views).
                          next.categories = (next.categories || []).filter(c => c.groupId !== g.id);
                          return next;
                        });
                        if (openGroup === g.id) setOpenGroup(null);
                        if (selection && selection.id === g.id) setSelection(null);
                      }}>
                      ×
                    </button>
                  </div>
                  {isOpen && (
                    <div style={{ paddingBottom: 6, background: 'var(--paper)' }}>
                      {cats.map(c => {
                        const isCatSel = selection && selection.type === 'category' && selection.id === c.id;
                        return (
                          <div key={c.id} style={{
                            display: 'flex', alignItems: 'center', gap: 2,
                            padding: '4px 10px 4px 32px',
                            background: isCatSel ? 'var(--tint)' : 'transparent',
                            opacity: c.hidden ? 0.5 : 1,
                          }}>
                            <button type="button"
                              onClick={() => setSelection({ type: 'category', id: c.id })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer',
                                flex: 1, textAlign: 'left',
                                ...window.ui.serif, fontSize: 13, color: 'var(--ink-2)',
                                padding: '2px 0' }}>
                              {c.label}
                              <span style={{ ...window.ui.mono, fontSize: 9, color: 'var(--ink-4)', marginLeft: 8 }}>
                                {c.id}
                              </span>
                            </button>
                            <SmallReorder
                              list={(tax.categories || []).filter(x => x.groupId === g.id)}
                              id={c.id} compare="id"
                              onMove={delta => patch(prev => {
                                const next = clone(prev);
                                const sub = (next.categories || []).filter(x => x.groupId === g.id);
                                const reordered = reorderById(sub, c.id, delta).map((x, i) => ({ ...x, sortOrder: i }));
                                const others = (next.categories || []).filter(x => x.groupId !== g.id);
                                next.categories = others.concat(reordered);
                                return next;
                              })} />
                            <button type="button" className="fm-mini-btn"
                              title={c.hidden ? 'Unhide' : 'Hide'}
                              onClick={() => patch(prev => {
                                const next = clone(prev);
                                const i = next.categories.findIndex(x => x.id === c.id);
                                next.categories[i] = { ...next.categories[i], hidden: !next.categories[i].hidden };
                                return next;
                              })}>
                              {c.hidden ? '◐' : '◯'}
                            </button>
                            <DeleteCategoryButton cat={c} tax={tax} patch={patch}
                              materials={materials} projects={projects}
                              onDeleted={() => { if (selection && selection.id === c.id) setSelection(null); }} />
                          </div>
                        );
                      })}
                      <div style={{ padding: '4px 10px 4px 32px' }}>
                        <button type="button" className="btn-ghost"
                          onClick={() => addCategory(g.id)}
                          style={{ fontSize: 10.5 }}>
                          + Category in {g.label}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: selection detail */}
        <div style={{ minWidth: 0 }}>
          {!selection && (
            <EmptyDetail msg="Pick a group or category to edit its fields." />
          )}
          {selection && selection.type === 'group' && (
            <GroupDetail tax={tax} patch={patch}
              group={(tax.groups || []).find(g => g.id === selection.id)}
              onEditField={onEditField} onCreateField={onCreateField} />
          )}
          {selection && selection.type === 'category' && (
            <CategoryDetail tax={tax} patch={patch}
              category={(tax.categories || []).find(c => c.id === selection.id)}
              onEditField={onEditField} onCreateField={onCreateField} />
          )}
        </div>
      </div>
    );
  }

  function DeleteCategoryButton({ cat, tax, patch, materials, projects, onDeleted }) {
    return (
      <button type="button" className="fm-mini-btn danger"
        title="Delete category"
        onClick={() => {
          const refs = window.findReferencesToCategory
            ? window.findReferencesToCategory(cat.id, materials || [], projects || [])
            : { materials: [], rows: [] };
          if (refs.materials.length > 0 || refs.rows.length > 0) {
            const msg =
              `Cannot delete category "${cat.label}" — still referenced.\n\n` +
              `Materials (${refs.materials.length}):\n` +
              refs.materials.slice(0, 10).map(m => `  • ${m.code || m.id} — ${m.name || ''}`).join('\n') +
              (refs.materials.length > 10 ? `\n  …and ${refs.materials.length - 10} more` : '') +
              `\n\nSchedule rows (${refs.rows.length}):\n` +
              refs.rows.slice(0, 10).map(r => `  • ${r.projectName || r.projectId} · row ${r.rowId}`).join('\n') +
              (refs.rows.length > 10 ? `\n  …and ${refs.rows.length - 10} more` : '') +
              '\n\nReassign these to a different category first.';
            window.alert(msg);
            return;
          }
          if (!window.confirm('Delete category "' + cat.label + '"?')) return;
          patch(prev => {
            const next = clone(prev);
            next.categories = (next.categories || []).filter(c => c.id !== cat.id);
            return next;
          });
          onDeleted && onDeleted();
        }}>
        ×
      </button>
    );
  }

  function EmptyDetail({ msg }) {
    return (
      <div style={{
        border: '1px dashed var(--rule-2)',
        padding: '40px 24px', textAlign: 'center',
        ...window.ui.serif, fontSize: 14, fontStyle: 'italic',
        color: 'var(--ink-4)',
      }}>{msg}</div>
    );
  }

  function GroupDetail({ tax, patch, group, onEditField, onCreateField }) {
    if (!group) return <EmptyDetail msg="Group not found." />;
    const ids = group.fieldIds || [];
    return (
      <div style={{ border: '1px solid var(--rule-2)' }}>
        <SectionBar
          eyebrow="Group"
          title={group.label}
          extra={`${(tax.categories || []).filter(c => c.groupId === group.id).length} categories · group fields applied to all of them`}
          onReset={() => resetGroupFields(group.id, patch)}
        />
        <FieldList
          listIds={ids} tax={tax}
          onMove={(id, delta) => patch(prev => {
            const next = clone(prev);
            const i = next.groups.findIndex(x => x.id === group.id);
            next.groups[i] = { ...next.groups[i], fieldIds: reorderStringId(next.groups[i].fieldIds || [], id, delta) };
            return next;
          })}
          onRemove={id => patch(prev => {
            const next = clone(prev);
            const i = next.groups.findIndex(x => x.id === group.id);
            next.groups[i] = { ...next.groups[i], fieldIds: (next.groups[i].fieldIds || []).filter(x => x !== id) };
            return next;
          })}
          onEdit={onEditField} />
        <div style={{ padding: '10px 14px', borderTop: '1px dotted var(--rule-2)',
          display: 'flex', gap: 8 }}>
          <button type="button" className="btn-ghost"
            onClick={() => onCreateField({ scope: 'group', id: group.id })}>
            + New field
          </button>
          <AttachExistingField tax={tax}
            onPick={fieldId => patch(prev => {
              const next = clone(prev);
              const i = next.groups.findIndex(x => x.id === group.id);
              next.groups[i] = { ...next.groups[i], fieldIds: (next.groups[i].fieldIds || []).concat([fieldId]) };
              return next;
            })}
            disabledIds={ids} />
        </div>
      </div>
    );
  }

  function CategoryDetail({ tax, patch, category, onEditField, onCreateField }) {
    if (!category) return <EmptyDetail msg="Category not found." />;
    const ids = category.fieldIds || [];
    const grp = (tax.groups || []).find(g => g.id === category.groupId);
    const groupFieldIds = (grp && grp.fieldIds) || [];
    const commonFieldIds = tax.commonFieldIds || [];
    const ownIds = ids;
    const inheritedCount = commonFieldIds.length + groupFieldIds.length;

    return (
      <div style={{ border: '1px solid var(--rule-2)' }}>
        <SectionBar
          eyebrow={`Category · ${grp ? grp.label : 'No group'}`}
          title={category.label}
          extra={`${ownIds.length} category-specific field${ownIds.length === 1 ? '' : 's'} · ${inheritedCount} inherited (common + group)`}
          onReset={() => resetCategoryFields(category.id, patch)} />

        {/* Aliases */}
        <div style={{ padding: '10px 14px', borderBottom: '1px dotted var(--rule-2)' }}>
          <div style={{ ...window.ui.label, marginBottom: 4 }}>Aliases (search synonyms)</div>
          <input type="text"
            defaultValue={(category.aliases || []).join(', ')}
            placeholder="comma-separated, e.g. Gyprock, GIB, drywall"
            onBlur={e => {
              const aliases = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
              patch(prev => {
                const next = clone(prev);
                const i = next.categories.findIndex(x => x.id === category.id);
                next.categories[i] = { ...next.categories[i], aliases };
                return next;
              });
            }}
            style={fieldStyle()} />
        </div>

        {/* Group reassignment */}
        <div style={{ padding: '10px 14px', borderBottom: '1px dotted var(--rule-2)' }}>
          <div style={{ ...window.ui.label, marginBottom: 4 }}>Move to group</div>
          <select
            value={category.groupId}
            onChange={e => patch(prev => {
              const next = clone(prev);
              const i = next.categories.findIndex(x => x.id === category.id);
              next.categories[i] = { ...next.categories[i], groupId: e.target.value };
              return next;
            })}
            style={fieldStyle()}>
            {(tax.groups || []).map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </div>

        {/* Default unit */}
        <div style={{ padding: '10px 14px', borderBottom: '1px dotted var(--rule-2)' }}>
          <div style={{ ...window.ui.label, marginBottom: 4 }}>Default unit</div>
          <select
            value={category.defaultUnit || 'ea'}
            onChange={e => patch(prev => {
              const next = clone(prev);
              const i = next.categories.findIndex(x => x.id === category.id);
              next.categories[i] = { ...next.categories[i], defaultUnit: e.target.value };
              return next;
            })}
            style={fieldStyle()}>
            {['ea','m²','m³','lm','L','kg','set','item'].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <FieldList
          listIds={ownIds} tax={tax}
          inheritedTitle="Inherited fields (common + group)"
          inheritedIds={[].concat(commonFieldIds, groupFieldIds.filter(id => !commonFieldIds.includes(id)))}
          onMove={(id, delta) => patch(prev => {
            const next = clone(prev);
            const i = next.categories.findIndex(x => x.id === category.id);
            next.categories[i] = { ...next.categories[i], fieldIds: reorderStringId(next.categories[i].fieldIds || [], id, delta) };
            return next;
          })}
          onRemove={id => patch(prev => {
            const next = clone(prev);
            const i = next.categories.findIndex(x => x.id === category.id);
            next.categories[i] = { ...next.categories[i], fieldIds: (next.categories[i].fieldIds || []).filter(x => x !== id) };
            return next;
          })}
          onEdit={onEditField} />
        <div style={{ padding: '10px 14px', borderTop: '1px dotted var(--rule-2)',
          display: 'flex', gap: 8 }}>
          <button type="button" className="btn-ghost"
            onClick={() => onCreateField({ scope: 'category', id: category.id })}>
            + New field
          </button>
          <AttachExistingField tax={tax}
            onPick={fieldId => patch(prev => {
              const next = clone(prev);
              const i = next.categories.findIndex(x => x.id === category.id);
              next.categories[i] = { ...next.categories[i], fieldIds: (next.categories[i].fieldIds || []).concat([fieldId]) };
              return next;
            })}
            disabledIds={[].concat(ownIds, commonFieldIds, groupFieldIds)} />
        </div>
      </div>
    );
  }

  function SectionBar({ eyebrow, title, extra, onReset }) {
    return (
      <div style={{
        padding: '12px 14px', borderBottom: '1px solid var(--rule-2)',
        background: 'var(--paper-2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div>
            <div style={{ ...window.ui.label, color: 'var(--ink-4)' }}>{eyebrow}</div>
            <div style={{ ...window.ui.serif, fontSize: 18, color: 'var(--ink)' }}>{title}</div>
          </div>
          {onReset && (
            <button type="button" className="btn-ghost" onClick={onReset}
              title="Restore this entity's defaults from DEFAULT_SCHEMA_V5">
              Reset to default
            </button>
          )}
        </div>
        {extra && (
          <div style={{
            marginTop: 6, ...window.ui.mono, fontSize: 10, color: 'var(--ink-4)',
            letterSpacing: '0.06em',
          }}>{extra}</div>
        )}
      </div>
    );
  }

  // Reusable field list with reorder + edit + remove (for own ids) and a
  // greyed inherited block (read-only).
  function FieldList({ listIds, tax, onMove, onRemove, onEdit, inheritedIds, inheritedTitle }) {
    const fields = (tax.fields || []);
    return (
      <>
        {(listIds || []).length === 0 && (
          <div style={{
            padding: '14px 14px', ...window.ui.serif, fontStyle: 'italic',
            fontSize: 13, color: 'var(--ink-4)',
          }}>
            No specific fields yet. Add or attach one below.
          </div>
        )}
        {(listIds || []).map(fid => {
          const f = fields.find(x => x.id === fid);
          if (!f) return (
            <div key={fid} style={{
              padding: '8px 14px', borderBottom: '1px dotted var(--rule-2)',
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)',
            }}>
              [missing field def: {fid}]
              <button type="button" className="fm-mini-btn"
                onClick={() => onRemove(fid)} style={{ marginLeft: 'auto' }}>×</button>
            </div>
          );
          return (
            <div key={fid} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderBottom: '1px dotted var(--rule-2)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  ...window.ui.serif, fontSize: 13.5, color: 'var(--ink)',
                }}>
                  {f.label}
                  {f.unit && <span style={{ color: 'var(--ink-4)', fontSize: 12 }}> ({f.unit})</span>}
                </div>
                <div style={{
                  ...window.ui.mono, fontSize: 9.5, color: 'var(--ink-4)',
                  letterSpacing: '0.06em', marginTop: 2,
                }}>
                  {f.type}{f.multiple ? ' · multi' : ''}{f.targetCategory ? ` → ${f.targetCategory}` : ''} · {f.id}
                </div>
              </div>
              <SmallReorder list={(listIds || []).map(id => ({ id }))} id={fid} compare="id"
                onMove={delta => onMove(fid, delta)} />
              <button type="button" className="fm-mini-btn"
                onClick={() => onEdit(fid)} title="Edit field">✎</button>
              <button type="button" className="fm-mini-btn danger"
                onClick={() => {
                  if (window.confirm('Remove "' + f.label + '" from this list? (Field def stays in fields[].)')) {
                    onRemove(fid);
                  }
                }} title="Remove from this list">×</button>
            </div>
          );
        })}
        {inheritedIds && inheritedIds.length > 0 && (
          <>
            <div style={{
              padding: '10px 14px 4px',
              ...window.ui.label, color: 'var(--ink-4)',
              borderTop: '1px dotted var(--rule-2)',
            }}>
              {inheritedTitle || 'Inherited'}
            </div>
            {inheritedIds.map(fid => {
              const f = fields.find(x => x.id === fid);
              if (!f) return null;
              return (
                <div key={'inh-' + fid} style={{
                  padding: '5px 14px', borderBottom: '1px dotted var(--rule-2)',
                  ...window.ui.serif, fontSize: 12.5, color: 'var(--ink-3)',
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>{f.label}</span>
                  <span style={{ ...window.ui.mono, fontSize: 9.5, color: 'var(--ink-4)' }}>
                    {f.type} · {f.id}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </>
    );
  }

  function AttachExistingField({ tax, onPick, disabledIds }) {
    const [open, setOpen] = useState(false);
    const dis = new Set(disabledIds || []);
    const fields = (tax.fields || []).filter(f => !dis.has(f.id));
    return (
      <div style={{ position: 'relative' }}>
        <button type="button" className="btn-ghost" onClick={() => setOpen(o => !o)}>
          + Attach existing
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0,
            background: 'var(--paper)', border: '1px solid var(--ink)',
            zIndex: 30, width: 280, maxHeight: 320, overflowY: 'auto',
            padding: '6px 0',
          }}>
            {fields.length === 0 && (
              <div style={{ padding: '10px 14px', ...window.ui.serif, fontStyle: 'italic',
                color: 'var(--ink-4)', fontSize: 12.5 }}>
                Every field is already attached.
              </div>
            )}
            {fields.map(f => (
              <button key={f.id} type="button"
                onClick={() => { onPick(f.id); setOpen(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '6px 14px',
                  ...window.ui.serif, fontSize: 13, color: 'var(--ink)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--tint)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {f.label}
                <span style={{ ...window.ui.mono, fontSize: 9.5, color: 'var(--ink-4)', marginLeft: 8 }}>
                  {f.type} · {f.id}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // COMMON TAB
  // ───────────────────────────────────────────────────────────────────────────
  function CommonTab({ tax, patch, onEditField, onCreateField }) {
    const allIds = tax.commonFieldIds || [];
    const officeMode = !!(window.isOfficeMode && window.isOfficeMode(window.appState?.settings?.dupePolicy));
    const ids = officeMode ? allIds : allIds.filter(id => id !== 'code');
    return (
      <div style={{ maxWidth: 720, border: '1px solid var(--rule-2)' }}>
        <SectionBar
          eyebrow="Workspace"
          title="Common fields"
          extra={`${ids.length} field${ids.length === 1 ? '' : 's'} on every Library item, regardless of category.`}
          onReset={() => resetCommonFields(patch)} />
        <FieldList
          listIds={ids} tax={tax}
          onMove={(id, delta) => patch(prev => {
            const next = clone(prev);
            next.commonFieldIds = reorderStringId(next.commonFieldIds || [], id, delta);
            return next;
          })}
          onRemove={id => patch(prev => {
            const next = clone(prev);
            next.commonFieldIds = (next.commonFieldIds || []).filter(x => x !== id);
            return next;
          })}
          onEdit={onEditField} />
        <div style={{ padding: '10px 14px', borderTop: '1px dotted var(--rule-2)',
          display: 'flex', gap: 8 }}>
          <button type="button" className="btn-ghost"
            onClick={() => onCreateField({ scope: 'common' })}>
            + New common field
          </button>
          <AttachExistingField tax={tax}
            onPick={fieldId => patch(prev => {
              const next = clone(prev);
              next.commonFieldIds = (next.commonFieldIds || []).concat([fieldId]);
              return next;
            })}
            disabledIds={ids} />
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAGS TAB
  // ───────────────────────────────────────────────────────────────────────────
  function TagsTab({ tax, patch }) {
    const axes = [
      { id: 'performance',    label: 'Performance' },
      { id: 'area',           label: 'Area' },
      { id: 'materialFamily', label: 'Material family' },
    ];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {axes.map(axis => (
          <TagAxisPanel key={axis.id} axisId={axis.id} axisLabel={axis.label}
            tax={tax} patch={patch} />
        ))}
      </div>
    );
  }

  function TagAxisPanel({ axisId, axisLabel, tax, patch }) {
    const tags = ((tax.tagAxes || {})[axisId] || []).slice()
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    function addTag() {
      const label = window.prompt(`New ${axisLabel} tag label?`);
      if (!label) return;
      const id = window.makeStableId(label, tags.map(t => t.id));
      patch(prev => {
        const next = clone(prev);
        next.tagAxes = next.tagAxes || {};
        next.tagAxes[axisId] = (next.tagAxes[axisId] || []).concat([{ id, label, sortOrder: tags.length }]);
        return next;
      });
    }
    return (
      <div style={{ border: '1px solid var(--rule-2)' }}>
        <SectionBar
          eyebrow="Tag axis"
          title={axisLabel}
          extra={`${tags.length} option${tags.length === 1 ? '' : 's'} · multi-select on materials and rows`}
          onReset={() => resetTagAxis(axisId, patch)} />
        {tags.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 12px', borderBottom: '1px dotted var(--rule-2)',
            opacity: t.hidden ? 0.5 : 1,
          }}>
            <span style={{ flex: 1, minWidth: 0,
              ...window.ui.serif, fontSize: 13, color: 'var(--ink)' }}>
              {t.label}
              <span style={{ ...window.ui.mono, fontSize: 9, color: 'var(--ink-4)', marginLeft: 6 }}>
                {t.id}
              </span>
            </span>
            <SmallReorder list={tags} id={t.id} compare="id"
              onMove={delta => patch(prev => {
                const next = clone(prev);
                const reordered = reorderById(next.tagAxes[axisId] || [], t.id, delta).map((x, i) => ({ ...x, sortOrder: i }));
                next.tagAxes[axisId] = reordered;
                return next;
              })} />
            <button type="button" className="fm-mini-btn"
              title={t.hidden ? 'Unhide' : 'Hide'}
              onClick={() => patch(prev => {
                const next = clone(prev);
                const i = (next.tagAxes[axisId] || []).findIndex(x => x.id === t.id);
                next.tagAxes[axisId][i] = { ...next.tagAxes[axisId][i], hidden: !next.tagAxes[axisId][i].hidden };
                return next;
              })}>{t.hidden ? '◐' : '◯'}</button>
            <button type="button" className="fm-mini-btn"
              title="Rename"
              onClick={() => {
                const label = window.prompt('Rename tag', t.label);
                if (!label || label === t.label) return;
                patch(prev => {
                  const next = clone(prev);
                  const i = next.tagAxes[axisId].findIndex(x => x.id === t.id);
                  next.tagAxes[axisId][i] = { ...next.tagAxes[axisId][i], label };
                  return next;
                });
              }}>✎</button>
            <button type="button" className="fm-mini-btn danger"
              title="Delete tag"
              onClick={() => {
                if (!window.confirm('Delete tag "' + t.label + '"? Existing items keep the value but it won\'t appear in pickers.')) return;
                patch(prev => {
                  const next = clone(prev);
                  next.tagAxes[axisId] = (next.tagAxes[axisId] || []).filter(x => x.id !== t.id);
                  return next;
                });
              }}>×</button>
          </div>
        ))}
        <div style={{ padding: '10px 12px' }}>
          <button type="button" className="btn-ghost" onClick={addTag}>+ Add tag</button>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FIELD EDITOR DRAWER
  // ───────────────────────────────────────────────────────────────────────────
  function FieldEditor({ tax, field, scope, onClose, onSave }) {
    const isNew = !field;
    const [draft, setDraft] = useState(() => field ? { ...field } : {
      id: '', label: '', type: 'text',
      options: [], helpText: '', sectionId: '', unit: '',
      targetCategory: '', multiple: false, hidden: false, defaultValue: '',
    });
    const [labelTouched, setLabelTouched] = useState(false);

    // Auto-derive id from label until user edits id manually (only on create).
    useEffect(() => {
      if (!isNew) return;
      if (labelTouched) return;
      const id = window.makeStableId(draft.label || 'field', (tax.fields || []).map(f => f.id));
      setDraft(d => ({ ...d, id }));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft.label]);

    function set(k, v) { setDraft(d => ({ ...d, [k]: v })); }

    useEffect(() => {
      function onKey(e) { if (e.key === 'Escape') onClose(); }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    function handleSave() {
      const id = (draft.id || '').trim();
      if (!id) { window.alert('Field id required.'); return; }
      if (!draft.label || !draft.label.trim()) { window.alert('Label required.'); return; }
      if (isNew && (tax.fields || []).find(f => f.id === id)) {
        window.alert('A field with id "' + id + '" already exists.');
        return;
      }
      // Strip empty options on non-select.
      const out = { ...draft, id, label: draft.label.trim() };
      if (out.type !== 'select') { delete out.options; delete out.multiple; }
      else { out.options = (out.options || []).filter(o => o && o.value && o.label); }
      if (out.type !== 'itemRef') delete out.targetCategory;
      if (!out.unit) delete out.unit;
      if (!out.helpText) delete out.helpText;
      if (!out.sectionId) delete out.sectionId;
      if (!out.subSection) delete out.subSection;
      if (!out.defaultValue && out.defaultValue !== false && out.defaultValue !== 0) delete out.defaultValue;
      onSave(out, isNew ? scope : null);
    }

    return (
      <>
        <div className="drw-bg" onClick={onClose} />
        <div className="drw-panel" role="dialog" aria-label={isNew ? 'New field' : 'Edit field'}
          onClick={e => e.stopPropagation()}>
          <div className="drw-head">
            <div style={{ ...window.ui.label, color: 'var(--ink-4)' }}>
              I · Library / Field {isNew ? 'New' : 'Edit'}
            </div>
            <div className="drw-head-row" style={{ marginTop: 4 }}>
              <span style={{ ...window.ui.serif, fontSize: 22, display: 'block' }}>
                {isNew ? 'New field' : 'Edit field'}
              </span>
              <button type="button" className="drw-close" onClick={onClose} aria-label="Close">×</button>
            </div>
          </div>

          <div className="drw-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Row label="Label">
              <input type="text" value={draft.label} autoFocus
                onChange={e => set('label', e.target.value)}
                style={fieldStyle()} />
            </Row>
            <Row label="ID" hint={isNew ? 'auto-derived from label, unique. You can edit until save.' : 'locked after create'}>
              <input type="text" value={draft.id}
                disabled={!isNew}
                onChange={e => { setLabelTouched(true); set('id', e.target.value); }}
                style={{ ...fieldStyle(), opacity: isNew ? 1 : 0.5 }} />
            </Row>
            <Row label="Type" hint={isNew ? '' : 'locked after create — change requires deleting and recreating'}>
              <select value={draft.type}
                disabled={!isNew}
                onChange={e => set('type', e.target.value)}
                style={{ ...fieldStyle(), opacity: isNew ? 1 : 0.5 }}>
                {['text','longText','number','currency','boolean','select','date','url','color','swatchRef','itemRef'].map(t =>
                  <option key={t} value={t}>{t}</option>)}
              </select>
            </Row>

            {draft.type === 'select' && (
              <>
                <Row label="Multi-select">
                  <input type="checkbox" checked={!!draft.multiple}
                    onChange={e => set('multiple', e.target.checked)}
                    style={{ accentColor: 'var(--ink)' }} />
                </Row>
                <Row label="Options" hint="value | label per line">
                  <textarea
                    value={(draft.options || []).map(o => `${o.value} | ${o.label}`).join('\n')}
                    onChange={e => set('options', e.target.value.split('\n').map(line => {
                      const [value, ...rest] = line.split('|').map(s => s.trim());
                      const label = rest.join('|').trim() || value;
                      return { value, label };
                    }).filter(o => o.value))}
                    rows={6}
                    style={{ ...fieldStyle(), fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.5 }} />
                </Row>
              </>
            )}

            {draft.type === 'itemRef' && (
              <Row label="Target category" hint="filters the picker — leave blank for any">
                <select value={draft.targetCategory || ''}
                  onChange={e => set('targetCategory', e.target.value)}
                  style={fieldStyle()}>
                  <option value="">(any)</option>
                  {(tax.categories || []).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Row>
            )}

            {(draft.type === 'number' || draft.type === 'currency') && (
              <Row label="Unit" hint="e.g. mm, kW, L — appended to the value">
                <input type="text" value={draft.unit || ''}
                  onChange={e => set('unit', e.target.value)}
                  style={fieldStyle()} />
              </Row>
            )}

            <Row label="Default value">
              <input type="text" value={draft.defaultValue == null ? '' : String(draft.defaultValue)}
                onChange={e => set('defaultValue', e.target.value)}
                style={fieldStyle()} />
            </Row>
            <Row label="Help text" hint="shown beneath the input in the editor">
              <input type="text" value={draft.helpText || ''}
                onChange={e => set('helpText', e.target.value)}
                style={fieldStyle()} />
            </Row>
            <Row label="Specs sub-section" hint="which sub-heading in the Specs section this field shows under. Leave on (auto) to use the default rule.">
              <select value={draft.subSection || ''}
                onChange={e => set('subSection', e.target.value)}
                style={fieldStyle()}>
                <option value="">(auto)</option>
                {(window.SPEC_SUB_SECTIONS || []).map(s =>
                  <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Row>
            <Row label="Section" hint="optional grouping in the editor">
              <input type="text" value={draft.sectionId || ''}
                onChange={e => set('sectionId', e.target.value)}
                style={fieldStyle()} />
            </Row>
            <Row label="Hidden">
              <input type="checkbox" checked={!!draft.hidden}
                onChange={e => set('hidden', e.target.checked)}
                style={{ accentColor: 'var(--ink)' }} />
            </Row>
          </div>

          <div className="drw-foot">
            <button type="button" className="btn-sec-d" onClick={onClose}>Cancel</button>
            <span style={{ flex: 1 }} />
            <button type="button" className="btn-pri-d" onClick={handleSave}>
              {isNew ? 'Create field' : 'Save changes'}
            </button>
          </div>
        </div>
      </>
    );
  }

  function Row({ label, hint, children }) {
    return (
      <div>
        <div style={{ ...window.ui.label, marginBottom: 4 }}>{label}</div>
        {children}
        {hint && (
          <div style={{
            marginTop: 4, ...window.ui.serif, fontStyle: 'italic',
            fontSize: 12, color: 'var(--ink-4)',
          }}>{hint}</div>
        )}
      </div>
    );
  }

  function fieldStyle() {
    return {
      width: '100%', background: 'transparent',
      border: '1px solid var(--rule-2)',
      padding: '6px 10px',
      fontFamily: "'Inter Tight', sans-serif",
      fontSize: 13, color: 'var(--ink)', outline: 'none',
    };
  }

  // ─── Reorder mini-button pair ──────────────────────────────────────────────
  function SmallReorder({ list, id, compare = 'id', onMove }) {
    const idx = compare === 'id'
      ? (list || []).findIndex(x => x.id === id)
      : (list || []).indexOf(id);
    const canUp = idx > 0;
    const canDown = idx >= 0 && idx < (list || []).length - 1;
    return (
      <>
        <button type="button" className="fm-mini-btn"
          disabled={!canUp} onClick={() => onMove(-1)}
          style={{ opacity: canUp ? 1 : 0.25 }}
          title="Move up">↑</button>
        <button type="button" className="fm-mini-btn"
          disabled={!canDown} onClick={() => onMove(1)}
          style={{ opacity: canDown ? 1 : 0.25 }}
          title="Move down">↓</button>
      </>
    );
  }

  // ─── Reset helpers (compare slice vs DEFAULT_SCHEMA_V5) ────────────────────
  function resetCommonFields(patch) {
    if (!window.DEFAULT_SCHEMA_V5) return;
    if (!window.confirm('Reset Common fields to default? Custom additions will be removed.')) return;
    patch(prev => {
      const next = clone(prev);
      next.commonFieldIds = window.DEFAULT_SCHEMA_V5.commonFieldIds.slice();
      return next;
    });
  }
  function resetGroupFields(groupId, patch) {
    const g = (window.DEFAULT_SCHEMA_V5.groups || []).find(g => g.id === groupId);
    if (!g) {
      if (window.confirm('"' + groupId + '" is not in defaults — delete it instead?')) {
        patch(prev => {
          const next = clone(prev);
          next.groups = (next.groups || []).filter(x => x.id !== groupId);
          next.categories = (next.categories || []).filter(c => c.groupId !== groupId);
          return next;
        });
      }
      return;
    }
    if (!window.confirm('Reset "' + g.label + '" group to default fields?')) return;
    patch(prev => {
      const next = clone(prev);
      const i = next.groups.findIndex(x => x.id === groupId);
      if (i >= 0) next.groups[i] = { ...next.groups[i], fieldIds: g.fieldIds.slice(), label: g.label, hidden: false };
      return next;
    });
  }
  function resetCategoryFields(catId, patch) {
    const c = (window.DEFAULT_SCHEMA_V5.categories || []).find(c => c.id === catId);
    if (!c) {
      if (window.confirm('"' + catId + '" is not in defaults — delete it instead?')) {
        patch(prev => {
          const next = clone(prev);
          next.categories = (next.categories || []).filter(x => x.id !== catId);
          return next;
        });
      }
      return;
    }
    if (!window.confirm('Reset "' + c.label + '" category to default fields, aliases, group?')) return;
    patch(prev => {
      const next = clone(prev);
      const i = next.categories.findIndex(x => x.id === catId);
      if (i >= 0) next.categories[i] = {
        ...next.categories[i],
        label: c.label, groupId: c.groupId, defaultUnit: c.defaultUnit,
        flavour: c.flavour, fieldIds: (c.fieldIds || []).slice(),
        aliases: (c.aliases || []).slice(), hidden: false,
      };
      return next;
    });
  }
  function resetTagAxis(axisId, patch) {
    const def = (window.DEFAULT_SCHEMA_V5.tagAxes || {})[axisId];
    if (!def) return;
    if (!window.confirm('Reset ' + axisId + ' tags to default? Custom additions will be removed.')) return;
    patch(prev => {
      const next = clone(prev);
      next.tagAxes = next.tagAxes || {};
      next.tagAxes[axisId] = def.map((t, i) => ({ ...t, sortOrder: i }));
      return next;
    });
  }

  window.FieldManager = FieldManager;
})();
