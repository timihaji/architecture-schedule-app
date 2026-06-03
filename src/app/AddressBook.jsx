// src/app/AddressBook.jsx — dedicated Address Book manage modal.
//
// Two-pane: a searchable + role-filterable contact list (left) and an edit
// form (right) with the fixed fields plus any global custom fields, role
// custom-value select, custom-field management, and delete-with-usage-count.
//
// Reads/writes appState.addressBook via cs.setAddressBook. `materials` is used
// only to compute how many items link a contact before deleting it.
//
// Props: { open, onClose, focusContactId, materials }

(function () {
  const { useState, useEffect, useMemo, useRef } = React;

  const FIXED = [
    { id: 'company', label: 'Company' },
    { id: 'email',   label: 'Email' },
    { id: 'phone',   label: 'Phone' },
    { id: 'address', label: 'Address' },
  ];

  function emptyBook() {
    return { version: 1, contacts: [], fieldDefs: [], roles: (window.DEFAULT_CONTACT_ROLES || []).slice() };
  }

  function AddressBook({ open, onClose, focusContactId, materials }) {
    const cs = window.useCloudState ? window.useCloudState() : null;
    const book = (cs && cs.addressBook) || emptyBook();
    const setAddressBook = (cs && cs.setAddressBook) || window.setAddressBook;
    const contacts = book.contacts || [];
    const fieldDefs = book.fieldDefs || [];
    const roles = (book.roles && book.roles.length) ? book.roles : (window.DEFAULT_CONTACT_ROLES || []);

    const [selectedId, setSelectedId] = useState(focusContactId || null);
    const [q, setQ] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [draft, setDraft] = useState(null);
    const [roleCustom, setRoleCustom] = useState(false);
    const [manageFields, setManageFields] = useState(false);
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const nameRef = useRef(null);

    // Preselect when opened from a linked field.
    useEffect(() => {
      if (open) setSelectedId(focusContactId || null);
    }, [open, focusContactId]);

    // Sync the local draft when the selection changes.
    const selectedContact = useMemo(
      () => contacts.find(c => c.id === selectedId) || null,
      [contacts, selectedId]
    );
    useEffect(() => {
      if (!selectedContact) { setDraft(null); return; }
      setDraft(Object.assign({ custom: {} }, selectedContact));
      setRoleCustom(!!selectedContact.role && roles.indexOf(selectedContact.role) === -1);
    }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Escape closes.
    useEffect(() => {
      if (!open) return;
      function onKey(e) { if (e.key === 'Escape') onClose && onClose(); }
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    function updateBook(updater) {
      if (typeof setAddressBook !== 'function') return;
      setAddressBook(prev => {
        const base = prev || emptyBook();
        return updater(base);
      });
    }

    // Persist the working draft back into the book.
    function commitDraft(d) {
      const dd = d || draft;
      if (!dd) return;
      updateBook(base => ({
        ...base,
        contacts: (base.contacts || []).map(c => c.id === dd.id ? Object.assign({}, c, dd) : c),
      }));
    }

    function setField(key, val) {
      setDraft(d => Object.assign({}, d, { [key]: val }));
    }
    function setCustomField(defId, val) {
      setDraft(d => Object.assign({}, d, { custom: Object.assign({}, d && d.custom, { [defId]: val }) }));
    }

    function selectContact(id) {
      if (draft && id !== draft.id) commitDraft();
      setSelectedId(id);
    }

    function newContact() {
      if (draft) commitDraft();
      const ids = contacts.map(c => c.id);
      const id = window.makeStableId ? window.makeStableId('contact', ids) : ('c_' + (contacts.length + 1));
      const fresh = { id, name: '', company: '', role: (roleFilter !== 'all' ? roleFilter : ''), email: '', phone: '', address: '', custom: {} };
      updateBook(base => ({ ...base, contacts: (base.contacts || []).concat(fresh) }));
      setSelectedId(id);
      setTimeout(() => nameRef.current && nameRef.current.focus(), 30);
    }

    function deleteContact(id) {
      const n = window.contactUsageCount ? window.contactUsageCount(id, materials) : 0;
      const msg = n > 0
        ? `This contact is linked by ${n} item${n === 1 ? '' : 's'}. Delete anyway? Those items will show as unlinked until you re-pick a contact.`
        : 'Delete this contact?';
      if (!window.confirm(msg)) return;
      updateBook(base => ({ ...base, contacts: (base.contacts || []).filter(c => c.id !== id) }));
      if (selectedId === id) { setSelectedId(null); setDraft(null); }
    }

    function addFieldDef() {
      const label = newFieldLabel.trim();
      if (!label) return;
      const ids = fieldDefs.map(f => f.id);
      const id = window.makeStableId ? window.makeStableId(label, ids) : ('f_' + (fieldDefs.length + 1));
      if (ids.indexOf(id) !== -1) { setNewFieldLabel(''); return; }
      updateBook(base => ({ ...base, fieldDefs: (base.fieldDefs || []).concat({ id, label, type: 'text' }) }));
      setNewFieldLabel('');
    }
    function deleteFieldDef(id) {
      if (!window.confirm('Remove this custom field from all contacts? Stored values are kept but hidden.')) return;
      updateBook(base => ({ ...base, fieldDefs: (base.fieldDefs || []).filter(f => f.id !== id) }));
    }

    // Filtered list.
    const filtered = useMemo(() => {
      const lc = q.trim().toLowerCase();
      return contacts.filter(c => {
        if (roleFilter !== 'all' && (c.role || '') !== roleFilter) return false;
        if (!lc) return true;
        return (c.name || '').toLowerCase().includes(lc)
          || (c.company || '').toLowerCase().includes(lc)
          || (c.email || '').toLowerCase().includes(lc)
          || (c.role || '').toLowerCase().includes(lc);
      });
    }, [contacts, q, roleFilter]);

    const lblStyle = { fontFamily: 'var(--font-sans)', fontSize: 8.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 4, display: 'block' };

    return (
      <div className="lib-modal-bg" onClick={e => { if (e.target === e.currentTarget) { if (draft) commitDraft(); onClose && onClose(); } }}>
        <div style={{
          background: 'var(--paper)', border: '1px solid var(--ink)',
          width: 920, maxWidth: '96vw', height: '82vh', maxHeight: '82vh',
          boxShadow: '0 24px 64px rgba(20,20,20,0.22)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Head */}
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--ink)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 3 }}>Contacts</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>Address Book</div>
            </div>
            <button type="button" onClick={() => { if (draft) commitDraft(); onClose && onClose(); }}
              style={{ background: 'none', border: 'none', fontSize: 24, lineHeight: 1, cursor: 'pointer', color: 'var(--ink-3)' }} aria-label="Close">×</button>
          </div>

          {/* Body: two panes */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            {/* List pane */}
            <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--rule)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--rule)' }}>
                <button type="button" className="btn-add" style={{ width: '100%', marginBottom: 10 }} onClick={newContact}>+ New contact</button>
                <input className="inp-d" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 8 }} />
                <select className="sel-d" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                  <option value="all">All roles</option>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {filtered.length === 0 && (
                  <div style={{ padding: 18, fontSize: 12.5, color: 'var(--ink-4)' }}>
                    No contacts{roleFilter !== 'all' ? ` with role “${roleFilter}”` : ''} yet. Click “+ New contact”.
                  </div>
                )}
                {filtered.map(c => {
                  const on = c.id === selectedId;
                  return (
                    <div key={c.id}
                      onClick={() => selectContact(c.id)}
                      style={{
                        padding: '10px 14px', cursor: 'pointer',
                        borderBottom: '1px solid var(--rule-2)',
                        background: on ? 'var(--tint)' : 'transparent',
                        borderLeft: on ? '2px solid var(--ink)' : '2px solid transparent',
                      }}>
                      <div style={{ fontSize: 13.5, fontFamily: 'var(--font-serif)', color: 'var(--ink)' }}>{c.name || 'Unnamed contact'}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        {c.company && <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{c.company}</span>}
                        {c.role && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.role}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Edit pane */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '18px 22px' }}>
              {!draft && (
                <div style={{ color: 'var(--ink-4)', fontSize: 13, fontStyle: 'italic', paddingTop: 40, textAlign: 'center' }}>
                  Select a contact to edit, or create a new one.
                </div>
              )}
              {draft && (
                <div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={lblStyle}>Name</label>
                    <input ref={nameRef} className="inp-d" value={draft.name || ''}
                      onChange={e => setField('name', e.target.value)} onBlur={() => commitDraft()} placeholder="Full name" />
                  </div>

                  <div className="row-2" style={{ marginBottom: 14 }}>
                    <div>
                      <label style={lblStyle}>Company</label>
                      <input className="inp-d" value={draft.company || ''}
                        onChange={e => setField('company', e.target.value)} onBlur={() => commitDraft()} />
                    </div>
                    <div>
                      <label style={lblStyle}>Role</label>
                      {roleCustom ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input className="inp-d" autoFocus value={draft.role || ''}
                            placeholder="Custom role…"
                            onChange={e => setField('role', e.target.value)}
                            onBlur={() => { const r = (draft.role || '').trim(); if (r && window.addContactRole) window.addContactRole(r); commitDraft(); }} />
                          <button type="button" title="Back to list"
                            onClick={() => { setRoleCustom(false); setField('role', ''); }}
                            style={{ flexShrink: 0, padding: '0 10px', cursor: 'pointer', border: '1px solid var(--rule-2)', background: 'var(--paper)', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>↩</button>
                        </div>
                      ) : (
                        <select className="sel-d" value={draft.role || ''}
                          onChange={e => {
                            if (e.target.value === '__custom__') { setRoleCustom(true); setField('role', ''); return; }
                            setField('role', e.target.value);
                            commitDraft(Object.assign({}, draft, { role: e.target.value }));
                          }}>
                          <option value="">—</option>
                          {roles.map(r => <option key={r} value={r}>{r}</option>)}
                          <option value="__custom__">Other…</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="row-2" style={{ marginBottom: 14 }}>
                    <div>
                      <label style={lblStyle}>Email</label>
                      <input className="inp-d" type="email" value={draft.email || ''}
                        onChange={e => setField('email', e.target.value)} onBlur={() => commitDraft()} />
                    </div>
                    <div>
                      <label style={lblStyle}>Phone</label>
                      <input className="inp-d" value={draft.phone || ''}
                        onChange={e => setField('phone', e.target.value)} onBlur={() => commitDraft()} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={lblStyle}>Address</label>
                    <textarea className="tarea-d" rows={2} value={draft.address || ''}
                      onChange={e => setField('address', e.target.value)} onBlur={() => commitDraft()} />
                  </div>

                  {/* Global custom fields */}
                  {fieldDefs.map(def => (
                    <div key={def.id} style={{ marginBottom: 14 }}>
                      <label style={lblStyle}>{def.label}</label>
                      <input className="inp-d" value={(draft.custom && draft.custom[def.id]) || ''}
                        onChange={e => setCustomField(def.id, e.target.value)} onBlur={() => commitDraft()} />
                    </div>
                  ))}

                  {/* Footer actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 14, borderTop: '1px solid var(--rule)' }}>
                    <button type="button" className="btn-ghost" onClick={() => setManageFields(v => !v)}>
                      {manageFields ? 'Done managing fields' : 'Manage custom fields'}
                    </button>
                    <div style={{ flex: 1 }} />
                    <button type="button" className="btn-ghost" style={{ color: 'var(--danger, #b3261e)', borderColor: 'var(--rule-2)' }}
                      onClick={() => deleteContact(draft.id)}>Delete contact</button>
                  </div>

                  {/* Custom field management */}
                  {manageFields && (
                    <div style={{ marginTop: 14, padding: 14, border: '1px dashed var(--rule-2)', background: 'var(--paper-2)' }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>
                        Custom fields apply to every contact
                      </div>
                      {fieldDefs.length === 0 && (
                        <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 10 }}>No custom fields yet.</div>
                      )}
                      {fieldDefs.map(def => (
                        <div key={def.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ flex: 1, fontSize: 13 }}>{def.label}</span>
                          <button type="button" className="btn-ghost" onClick={() => deleteFieldDef(def.id)}>Remove</button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        <input className="inp-d" placeholder="New field name (e.g. ABN, Territory)…"
                          value={newFieldLabel}
                          onChange={e => setNewFieldLabel(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFieldDef(); } }} />
                        <button type="button" className="btn-add" onClick={addFieldDef}>Add</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.AddressBook = AddressBook;
})();
