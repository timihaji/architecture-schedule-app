// src/data/addressbook-helpers.jsx — Address Book (contacts) helpers.
//
// The contact field on a material stores a *reference* (a contact id). The
// actual contact records live in a top-level appState.addressBook singleton
// (NOT in taxonomies — taxonomies gets clobbered by _reseedVersion bumps).
//
//   appState.addressBook = {
//     version: 1,
//     contacts:  [ { id, name, company, role, email, phone, address, custom:{} } ],
//     fieldDefs: [ { id, label, type:'text' } ],   // global user-defined fields
//     roles:     [ 'Sales Rep', 'Supplier', ... ], // preset + custom
//   }
//
// Persistence is via window.setAddressBook (LoadingGate setter — do NOT spread
// window._appState). These helpers read the live blob off window.appState so
// non-React callers (FieldRenderer, ContactPicker) stay in sync.

(function () {
  const DEFAULT_CONTACT_ROLES = [
    'Sales Rep', 'Supplier', 'Consultant', 'Installer', 'Manufacturer',
  ];

  function emptyBook() {
    return { version: 1, contacts: [], fieldDefs: [], roles: DEFAULT_CONTACT_ROLES.slice() };
  }

  // Live address book off window.appState, with a safe default shape.
  function addressBookActive() {
    const ab = window.appState && window.appState.addressBook;
    if (!ab) return emptyBook();
    return {
      version: ab.version || 1,
      contacts: Array.isArray(ab.contacts) ? ab.contacts : [],
      fieldDefs: Array.isArray(ab.fieldDefs) ? ab.fieldDefs : [],
      roles: (Array.isArray(ab.roles) && ab.roles.length) ? ab.roles : DEFAULT_CONTACT_ROLES.slice(),
    };
  }

  function contactById(id) {
    if (!id) return null;
    return addressBookActive().contacts.find(c => c.id === id) || null;
  }

  // "Name · phone / email" — the convention the old free-text field documented.
  // Gracefully omits missing pieces.
  function contactDisplay(c) {
    if (!c) return '';
    const name = (c.name || '').trim() || 'Unnamed contact';
    const detail = [c.phone, c.email].map(s => (s || '').trim()).filter(Boolean).join(' / ');
    return detail ? `${name} · ${detail}` : name;
  }

  // Append a role to the address book's role list (preset + custom). Dedupes
  // case-insensitively; returns the canonical role string either way.
  function addContactRole(rawLabel) {
    const label = String(rawLabel || '').trim();
    if (!label) return null;
    const roles = addressBookActive().roles;
    const match = roles.find(r => r.toLowerCase() === label.toLowerCase());
    if (match) return match;
    if (typeof window.setAddressBook !== 'function') {
      console.warn('[addContactRole] window.setAddressBook not yet available');
      return label;
    }
    window.setAddressBook(prev => {
      const base = prev || emptyBook();
      const list = (base.roles || DEFAULT_CONTACT_ROLES.slice()).slice();
      if (!list.some(r => r.toLowerCase() === label.toLowerCase())) list.push(label);
      return Object.assign({}, base, { roles: list });
    });
    return label;
  }

  // How many materials link this contact. Schedule rows inherit via their
  // material reference, so counting materials is authoritative.
  function contactUsageCount(contactId, materials) {
    if (!contactId || !Array.isArray(materials)) return 0;
    const get = window.getFieldValue || ((m, id) => m && m.fields && m.fields[id]);
    let n = 0;
    for (const m of materials) {
      if (get(m, 'contact') === contactId) n++;
    }
    return n;
  }

  window.DEFAULT_CONTACT_ROLES = DEFAULT_CONTACT_ROLES;
  window.addressBookActive = addressBookActive;
  window.contactById = contactById;
  window.contactDisplay = contactDisplay;
  window.addContactRole = addContactRole;
  window.contactUsageCount = contactUsageCount;
})();
