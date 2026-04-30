// Projects list — index view

function Projects({ projects, materials, onOpen, onAdd, onEdit, onDelete }) {
  return (
    <div>
      <div className="sched-page-header">
        <div>
          <div className="sched-page-eyebrow">Projects</div>
          <span className="sched-page-title" style={{ fontSize: 36 }}>Projects</span>
          <div className="sched-page-meta">
            <span className="sched-meta-mono">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'} on the board
            </span>
          </div>
        </div>
        <button className="sched-add-btn" onClick={onAdd}>＋ New project</button>
      </div>

      <div className="proj-reg-cols">
        <div />
        <span className="sched-page-eyebrow">Code</span>
        <span className="sched-page-eyebrow">Project</span>
        <span className="sched-page-eyebrow">Client · Location</span>
        <span className="sched-page-eyebrow">Stage</span>
        <span className="sched-page-eyebrow" style={{ textAlign: 'right' }}>Budget</span>
        <span className="sched-page-eyebrow" style={{ textAlign: 'right' }}>Materials</span>
        <div />
      </div>
      <Rule />

      {projects.length === 0 && (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <Mono size={12} color="var(--ink-4)" style={{ display: 'block', marginBottom: 14 }}>
            No projects yet
          </Mono>
          <button className="sched-add-btn" onClick={onAdd}>＋ Create the first project</button>
        </div>
      )}

      {projects.map((p, i) => {
        const mats = materials.filter(m => (m.projects || []).includes(p.id));
        return (
          <ProjectRow key={p.id} project={p} materials={mats}
            onOpen={() => onOpen(p.id)}
            onEdit={() => onEdit(p)}
            onDelete={() => onDelete(p.id)}
            index={i} />
        );
      })}
    </div>
  );
}

function ProjectRow({ project: p, materials, onOpen, onEdit, onDelete }) {
  return (
    <div className="reg-row">
      <div className="proj-reg-row-grid" onClick={onOpen}>
        {/* TODO: wire drag-and-drop reordering for project rows */}
        <div className="reg-row-drag proj-drag-handle">⠿</div>
        <Mono size={11} color="var(--ink-4)">{p.code || '—'}</Mono>
        <div>
          <Serif size={18} style={{ fontWeight: 400, display: 'block', lineHeight: 1.15 }}>{p.name}</Serif>
          {p.description && (
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3, maxWidth: '44ch', textWrap: 'pretty' }}>
              {p.description}
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.4 }}>
          <div>{p.client || '—'}</div>
          <div style={{ color: 'var(--ink-4)' }}>{p.address || p.location || ''}</div>
        </div>
        <StageIndicator stage={p.stage} />
        <Mono size={12} color="var(--ink)" style={{ textAlign: 'right' }}>{p.budget || '—'}</Mono>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3 }}>
          {materials.length > 0 ? (
            <>
              <div style={{ display: 'flex' }}>
                {materials.slice(0, 4).map((m, j) => (
                  <Swatch
                    key={m.id}
                    swatch={m.swatch}
                    size="xs"
                    seed={parseInt(m.id.slice(2)) || 1}
                    style={{ marginLeft: j === 0 ? 0 : -6, outline: '1px solid var(--paper)' }}
                  />
                ))}
              </div>
              <Mono size={11} color="var(--ink-3)" style={{ marginLeft: 6 }}>
                {String(materials.length).padStart(2, '0')}
              </Mono>
            </>
          ) : (
            <Mono size={11} color="var(--ink-4)">—</Mono>
          )}
        </div>
        <div className="reg-actions" onClick={e => e.stopPropagation()}>
          <button type="button" className="proj-reg-action-btn" onClick={onEdit} title="Edit">edit</button>
          <button type="button" className="proj-reg-action-del" onClick={onDelete} title="Delete">×</button>
        </div>
      </div>
    </div>
  );
}

function StageIndicator({ stage }) {
  const stages = ['Concept', 'Documentation', 'Construction', 'Handover'];
  const idx = stages.indexOf(stage);
  return (
    <div>
      <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
        {stages.map((s, i) => (
          <div key={s} style={{
            flex: 1,
            height: 2,
            background: i <= idx ? 'var(--ink)' : 'var(--rule-2)',
          }} />
        ))}
      </div>
      <Mono size={10} color="var(--ink-3)" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {stage}
      </Mono>
    </div>
  );
}

Object.assign(window, { Projects });
