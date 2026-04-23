// Projects list — index view

function Projects({ projects, materials, onOpen, onAdd, onEdit, onDelete }) {
  return (
    <div>
      <header style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <Eyebrow>Volume II · Projects</Eyebrow>
            <h1 style={{
              fontFamily: "'Newsreader', serif",
              fontWeight: 300,
              fontSize: 52,
              letterSpacing: '-0.015em',
              lineHeight: 1,
              margin: '10px 0 6px',
            }}>Projects</h1>
            <div style={{ ...ui.mono, fontSize: 11.5, color: 'var(--ink-3)' }}>
              {projects.length} {projects.length === 1 ? 'project' : 'projects'} on the board
            </div>
          </div>
          <TextButton onClick={onAdd} accent>＋ New project</TextButton>
        </div>
        <Rule heavy style={{ marginTop: 20 }} />
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '72px 56px 2fr 1.4fr 1fr 0.9fr 120px 60px',
        columnGap: 16,
        padding: '12px 0',
      }}>
        <Eyebrow>Code</Eyebrow>
        <Eyebrow>Lead</Eyebrow>
        <Eyebrow>Project</Eyebrow>
        <Eyebrow>Client · Location</Eyebrow>
        <Eyebrow>Stage</Eyebrow>
        <Eyebrow style={{ textAlign: 'right' }}>Budget</Eyebrow>
        <Eyebrow style={{ textAlign: 'right' }}>Materials</Eyebrow>
        <div />
      </div>
      <Rule />

      {projects.length === 0 && (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <Mono size={12} color="var(--ink-4)" style={{ display: 'block', marginBottom: 14 }}>
            No projects yet
          </Mono>
          <TextButton onClick={onAdd} accent>＋ Create the first project</TextButton>
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

function ProjectRow({ project: p, materials, onOpen, onEdit, onDelete, index }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '72px 56px 2fr 1.4fr 1fr 0.9fr 120px 60px',
        columnGap: 16,
        padding: '20px 0 22px',
        borderBottom: '1px solid var(--rule)',
        alignItems: 'center',
        cursor: 'pointer',
        background: hov ? 'var(--tint)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <Mono size={11} color="var(--ink-4)">{p.code || '—'}</Mono>
      <Mono size={11} color="var(--ink-3)" style={{ letterSpacing: '0.08em' }}>{p.lead || '—'}</Mono>
      <div>
        <Serif size={20} style={{ fontWeight: 400, display: 'block', lineHeight: 1.1 }}>{p.name}</Serif>
        {p.description && (
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, maxWidth: '48ch', textWrap: 'pretty' }}>
            {p.description}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.35 }}>
        <div>{p.client || '—'}</div>
        <div style={{ color: 'var(--ink-4)' }}>{p.location || ''}</div>
      </div>
      <StageIndicator stage={p.stage} />
      <Mono size={13} color="var(--ink)" style={{ textAlign: 'right' }}>{p.budget || '—'}</Mono>
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
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end',
        opacity: hov ? 1 : 0, transition: 'opacity 0.12s' }}
        onClick={e => e.stopPropagation()}>
        <button type="button" onClick={onEdit} title="Edit"
          style={iconBtn()}>edit</button>
        <button type="button" onClick={onDelete} title="Delete"
          style={iconBtn(true)}>×</button>
      </div>
    </div>
  );
}

function iconBtn(danger) {
  return {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: 0,
    fontFamily: "'Inter Tight', sans-serif",
    fontSize: danger ? 14 : 10,
    letterSpacing: danger ? 0 : '0.1em',
    textTransform: danger ? 'none' : 'uppercase',
    color: 'var(--ink-4)',
    fontWeight: 500,
  };
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
