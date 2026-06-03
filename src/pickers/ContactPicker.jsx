// src/pickers/ContactPicker.jsx — Address Book picker for the contactRef field.
//
// A focused single-select drawer that reuses PickerDrawer's CSS classes
// (pdrw-*) so it matches visually with zero new CSS. Supports search, a role
// filter strip, and inline quick-add (type a name not in the list → create it
// and select it in one click). Full add/edit/delete lives in the Address Book
// modal, reachable via the footer "Manage" button (onManage).
//
// Props: { open, eyebrow, value, onPick(id), onClose, onManage }

(function () {
  const { useState, useEffect, useRef, useMemo } = React;

  function ContactPicker({ open, eyebrow, value, onPick, onClose, onManage }) {
    const [q, setQ] = useState('');
    const [role, setRole] = useState('all');
    const searchRef = useRef(null);

    // Read from context so a freshly quick-added contact shows immediately.
    let cs = null;
    try { cs = window.useCloudState ? window.useCloudState() : null; }
    catch (_) { cs = null; }
    const book = (cs && cs.addressBook) || (window.addressBookActive ? window.addressBookActive() : { contacts: [], roles: [] });
    const contacts = book.contacts || [];
    const roles = (book.roles && book.roles.length) ? book.roles : (window.DEFAULT_CONTACT_ROLES || []);

    // Reset query on open; focus search.
    useEffect(() => {
      if (!open) return;
      setQ('');
      const t = setTimeout(() => searchRef.current && searchRef.current.focus(), 60);
      return () => clearTimeout(t);
    }, [open]);

    // Escape closes.
    useEffect(() => {
      if (!open) return;
      function onKey(e) { if (e.key === 'Escape') onClose && onClose(); }
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    const filtered = useMemo(() => {
      const lc = q.trim().toLowerCase();
      return contacts.filter(c => {
        if (role !== 'all' && (c.role || '') !== role) return false;
        if (!lc) return true;
        return (c.name || '').toLowerCase().includes(lc)
          || (c.company || '').toLowerCase().includes(lc)
          || (c.email || '').toLowerCase().includes(lc)
          || (c.role || '').toLowerCase().includes(lc);
      });
    }, [contacts, q, role]);

    if (!open) return null;

    const trimmed = q.trim();
    const exactMatch = trimmed && contacts.some(c => (c.name || '').toLowerCase() === trimmed.toLowerCase());
    const canQuickAdd = trimmed && !exactMatch;

    function quickAdd() {
      if (!trimmed) return;
      const setAb = (cs && cs.setAddressBook) || window.setAddressBook;
      if (typeof setAb !== 'function') return;
      const existing = contacts.map(c => c.id);
      const newId = window.makeStableId ? window.makeStableId(trimmed, existing) : ('c_' + trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
      const newContact = {
        id: newId, name: trimmed,
        company: '', role: (role !== 'all' ? role : ''),
        email: '', phone: '', address: '', custom: {},
      };
      setAb(prev => {
        const base = prev || { version: 1, contacts: [], fieldDefs: [], roles: (window.DEFAULT_CONTACT_ROLES || []).slice() };
        return Object.assign({}, base, { contacts: (base.contacts || []).concat(newContact) });
      });
      onPick && onPick(newId);
      onClose && onClose();
    }

    function pick(id) {
      onPick && onPick(id);
      onClose && onClose();
    }

    return (
      <div className="pdrw-overlay" onClick={e => { if (e.target === e.currentTarget) onClose && onClose(); }}>
        <div className="pdrw" role="dialog" aria-modal="true">
          {/* Head */}
          <div className="pdrw-head">
            <div className="pdrw-head-row">
              <div style={{ minWidth: 0 }}>
                {eyebrow && <div className="pdrw-eyebrow">{eyebrow}</div>}
                <span className="pdrw-title">Pick a contact</span>
              </div>
              <button type="button" className="pdrw-close" onClick={onClose} aria-label="Close">×</button>
            </div>
            {roles.length >= 1 && (
              <div className="pdrw-filter-strip">
                <button type="button"
                  className={`pdrw-filter-btn${role === 'all' ? ' active' : ''}`}
                  onClick={() => setRole('all')}>
                  All
                </button>
                {roles.map(r => (
                  <button key={r} type="button"
                    className={`pdrw-filter-btn${role === r ? ' active' : ''}`}
                    onClick={() => setRole(role === r ? 'all' : r)}>
                    {r}
                  </button>
                ))}
              </div>
            )}
            <div className="pdrw-search">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                style={{ color: 'var(--ink-4)', flexShrink: 0 }}>
                <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="1.5" />
                <line x1="15.2" y1="15.2" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input ref={searchRef} placeholder="Search name, company, email…"
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canQuickAdd && filtered.length === 0) { e.preventDefault(); quickAdd(); } }} />
              {q && (
                <button type="button" className="pdrw-search-clear"
                  onClick={() => setQ('')} aria-label="Clear search">×</button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="pdrw-body">
            <div className="pdrw-dsec-head products">
              <div>
                <div className="pdrw-dsec-eyebrow">Contacts</div>
                <div className="pdrw-dsec-explain">Pick one · details autofill from the address book</div>
              </div>
              <span className="pdrw-dsec-count">{filtered.length}</span>
            </div>

            {filtered.length === 0 && !canQuickAdd && (
              <div className="pdrw-empty">
                <div className="pdrw-empty-msg">No contacts{role !== 'all' ? ` with role “${role}”` : ''} yet.</div>
                <div className="pdrw-empty-sub">Type a name above to quick-add one, or use Manage below.</div>
              </div>
            )}

            {canQuickAdd && (
              <button type="button" className="pdrw-prow-product" onClick={quickAdd}
                style={{ borderLeft: '2px solid var(--accent)' }}>
                <div className="pdrw-prow-product-thumb"
                  style={{ background: 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: 16 }}>+</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pdrw-prow-product-name">Add new contact “{trimmed}”</div>
                  <div className="pdrw-prow-product-meta">
                    <span>Creates a contact{role !== 'all' ? ` · ${role}` : ''} and selects it</span>
                  </div>
                </div>
              </button>
            )}

            {filtered.map(c => {
              const isSel = c.id === value;
              return (
                <button key={c.id} type="button"
                  className={`pdrw-prow-product${isSel ? ' selected' : ''}`}
                  onClick={() => pick(c.id)}>
                  <div className="pdrw-prow-product-thumb"
                    style={{ background: 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                    {(c.name || '?').trim().charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pdrw-prow-product-name">{c.name || 'Unnamed'}</div>
                    <div className="pdrw-prow-product-meta">
                      {c.company && <span>{c.company}</span>}
                      {c.role && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>{c.role}</span>}
                      {!c.company && c.email && <span>{c.email}</span>}
                    </div>
                  </div>
                  <div className="pdrw-prow-product-check">{isSel && <span>✓</span>}</div>
                </button>
              );
            })}
          </div>

          {/* Foot */}
          <div className="pdrw-foot">
            <button type="button" className="pdrw-add acc" onClick={onManage}>
              Manage address book →
            </button>
            <button type="button" className="pdrw-confirm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  window.ContactPicker = ContactPicker;
})();
