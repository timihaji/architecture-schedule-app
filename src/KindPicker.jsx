// Category picker — shown before the editor opens.
// Left: schema groups. Right: categories in the active group. Pick one → onPick(categoryId).

function KindPicker({ onPick, onClose }) {
  const schema = (window.schemaActive && window.schemaActive()) || window.DEFAULT_SCHEMA_V5 || { groups: [], categories: [] };
  const groups = (schema.groups || []).filter(g => !g.hidden);
  const allCats = schema.categories || [];
  const [activeGroupId, setActiveGroupId] = React.useState((groups[0] && groups[0].id) || '');
  const [hoverCat, setHoverCat] = React.useState(null);

  const groupCats = allCats.filter(c => c.groupId === activeGroupId && !c.hidden);
  const activeGroupDef = groups.find(g => g.id === activeGroupId);

  const leftRail = groups.map(g => {
    const active = g.id === activeGroupId;
    const count = allCats.filter(c => c.groupId === g.id && !c.hidden).length;
    return (
      <button key={g.id} type="button"
        onClick={() => setActiveGroupId(g.id)}
        style={{
          display: 'flex', alignItems: 'baseline',
          justifyContent: 'space-between', gap: 10,
          width: '100%', border: 'none',
          background: active ? 'var(--paper)' : 'transparent',
          padding: '7px 16px', cursor: 'pointer',
          fontFamily: "'Newsreader', serif", fontSize: 13,
          color: active ? 'var(--ink)' : 'var(--ink-3)',
          borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
          textAlign: 'left',
        }}>
        <span>{g.label}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--ink-4)' }}>{count}</span>
      </button>
    );
  });

  const footer = (
    <>
      <span style={{
        fontFamily: "'Newsreader', serif", fontStyle: 'italic',
        fontSize: 12.5, color: 'var(--ink-3)',
      }}>Pick a category — you can change it in the editor.</span>
      <button type="button" onClick={onClose}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--ink-3)', fontWeight: 500,
        }}>Cancel</button>
    </>
  );

  return (
    <ModalPicker
      eyebrow="New entry"
      title="What are you adding?"
      width="min(780px, 100%)"
      leftWidth={200}
      onClose={onClose}
      leftRail={leftRail}
      footer={footer}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--ink-4)', marginBottom: 10,
      }}>
        {activeGroupDef ? activeGroupDef.label : ''}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 8,
      }}>
        {groupCats.map(c => {
          const hovered = hoverCat === c.id;
          const trade = window.defaultTradeForCategory ? window.defaultTradeForCategory(c.id) : '';
          return (
            <button key={c.id} type="button"
              onClick={() => onPick(c.id)}
              onMouseEnter={() => setHoverCat(c.id)}
              onMouseLeave={() => setHoverCat(null)}
              style={{
                background: hovered ? 'var(--paper-2)' : 'var(--paper)',
                border: '1px solid ' + (hovered ? 'var(--ink)' : 'var(--rule-2)'),
                padding: '12px 12px 10px', cursor: 'pointer', textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: 4,
                transition: 'border-color 120ms, background 120ms',
              }}>
              <span style={{
                fontFamily: "'Newsreader', serif", fontSize: 14,
                color: 'var(--ink)', letterSpacing: '-0.005em',
              }}>{c.label}</span>
              {trade && (
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, letterSpacing: '0.05em',
                  color: 'var(--ink-4)', textTransform: 'uppercase',
                }}>{trade}</span>
              )}
            </button>
          );
        })}
      </div>
    </ModalPicker>
  );
}

Object.assign(window, { KindPicker });
