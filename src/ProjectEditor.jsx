// ProjectEditor — modal for creating / editing a project. Extracted from
// App.jsx in Phase 6. Uses bare references to Eyebrow (from primitives.jsx,
// loaded earlier) — they resolve via window at render time.

function ProjectLocationsEditor({ locations, onChange }) {
  const [newName, setNewName] = React.useState('');
  const list = locations || [];

  function addLocation() {
    const name = newName.trim();
    if (!name) return;
    onChange([...list, { id: 'loc-' + Date.now(), name }]);
    setNewName('');
  }
  function renameLocation(id, name) {
    onChange(list.map(r => r.id === id ? { ...r, name } : r));
  }
  function deleteLocation(id) {
    onChange(list.filter(r => r.id !== id));
  }
  function moveLocation(idx, dir) {
    const next = list.slice();
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  }

  return (
    <div className="locations-editor">
      {list.length > 0 && (
        <div className="locations-list">
          {list.map((r, i) => (
            <LocationRowEdit key={r.id} location={r} idx={i} total={list.length}
              onRename={name => renameLocation(r.id, name)}
              onDelete={() => deleteLocation(r.id)}
              onMove={dir => moveLocation(i, dir)} />
          ))}
        </div>
      )}
      <div className="locations-add-row">
        <input
          className="locations-add-input"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Location name"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLocation(); } }}
        />
        <button className="locations-add-btn" onClick={addLocation} disabled={!newName.trim()}>
          + Add
        </button>
      </div>
    </div>
  );
}

function LocationRowEdit({ location, idx, total, onRename, onDelete, onMove }) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState(location.name);

  function commit() {
    const trimmed = val.trim();
    if (trimmed && trimmed !== location.name) onRename(trimmed);
    else setVal(location.name);
    setEditing(false);
  }

  return (
    <div className="location-row">
      <span className="location-row-idx">{String(idx + 1).padStart(2, '0')}</span>
      {editing ? (
        <input
          className="location-name-input"
          value={val}
          autoFocus
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(location.name); setEditing(false); } }}
        />
      ) : (
        <span className="location-row-name" onDoubleClick={() => setEditing(true)} title="Double-click to rename">{location.name}</span>
      )}
      <button className="location-ord-btn" onClick={() => onMove(-1)} disabled={idx === 0} title="Move up">↑</button>
      <button className="location-ord-btn" onClick={() => onMove(1)} disabled={idx === total - 1} title="Move down">↓</button>
      <button className="location-del-btn" onClick={onDelete} title="Remove">×</button>
    </div>
  );
}

function ProjectEditor({ project, onClose, onSave }) {
  const [draft, setDraft] = React.useState({ locations: [], ...project });
  function set(k, v) { setDraft(d => ({ ...d, [k]: v })); }

  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const stages = ['Concept', 'Documentation', 'Construction', 'Handover'];

  return (
    <div className="ae-modal-bg" onClick={onClose}>
      <div className="ae-modal" onClick={e => e.stopPropagation()}>
        <div className="ae-modal-head">
          <div>
            <Eyebrow>{project._isNew ? 'New project' : 'Edit project'}</Eyebrow>
            <span className="ae-modal-head-title">{draft.name || 'Untitled project'}</span>
          </div>
          <button className="ae-modal-close" onClick={onClose}>Close ×</button>
        </div>

        <div className="ae-modal-body">
          <div className="ae-modal-section">
            <div className="ae-modal-section-label">Identity</div>
            <div className="edit-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="edit-label">Project name</div>
                <input className="edit-input" value={draft.name || ''} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <div className="edit-label">Code</div>
                <input className="edit-input mono" value={draft.code || ''} onChange={e => set('code', e.target.value)} placeholder="25·03" />
              </div>
              <div>
                <div className="edit-label">Lead</div>
                <input className="edit-input mono" value={draft.lead || ''} onChange={e => set('lead', e.target.value)} placeholder="initials" />
              </div>
              <div>
                <div className="edit-label">Client</div>
                <input className="edit-input" value={draft.client || ''} onChange={e => set('client', e.target.value)} />
              </div>
              <div>
                <div className="edit-label">Address</div>
                <input className="edit-input" value={draft.address || ''} onChange={e => set('address', e.target.value)} />
              </div>
              <div>
                <div className="edit-label">Stage</div>
                <select className="edit-input" value={draft.stage || 'Concept'} onChange={e => set('stage', e.target.value)}>
                  {stages.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="ae-modal-section">
            <div className="ae-modal-section-label">Programme</div>
            <div className="edit-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="edit-label">Type</div>
                <input className="edit-input" value={draft.type || ''} onChange={e => set('type', e.target.value)} placeholder="New build — single dwelling" />
              </div>
              <div>
                <div className="edit-label">Budget</div>
                <input className="edit-input mono" value={draft.budget || ''} onChange={e => set('budget', e.target.value)} placeholder="A$1.2M" />
              </div>
              <div>
                <div className="edit-label">Commenced</div>
                <input className="edit-input mono" value={draft.commenced || ''} onChange={e => set('commenced', e.target.value)} placeholder="2025-03" />
              </div>
              <div>
                <div className="edit-label">Completion</div>
                <input className="edit-input mono" value={draft.completion || ''} onChange={e => set('completion', e.target.value)} placeholder="2026-12" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="edit-label">Description</div>
                <textarea className="tarea-d" value={draft.description || ''} onChange={e => set('description', e.target.value)} rows={3} />
              </div>
            </div>
          </div>

          <div className="ae-modal-section">
            <div className="ae-modal-section-label">Locations</div>
            <ProjectLocationsEditor
              locations={draft.locations}
              onChange={locations => set('locations', locations)}
            />
          </div>
        </div>

        <div className="ae-modal-foot">
          <button className="edit-cancel" onClick={onClose}>Cancel</button>
          <button className="edit-save" onClick={() => onSave(draft)}>
            {project._isNew ? 'Create project' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProjectEditor, ProjectLocationsEditor, LocationRowEdit });
