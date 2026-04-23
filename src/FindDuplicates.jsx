// FindDuplicates — scans the full material library for pairs that look
// like duplicates and lets the user merge or dismiss them.
//
// Dismissed pairs are persisted to localStorage so they stay gone across sessions.

const DISMISSED_LEGACY_KEY = 'aml-dismissed-dupes';

function pairKey(idA, idB) {
  return idA < idB ? idA + ':' + idB : idB + ':' + idA;
}

function migrateLegacyDismissed(settingsPairs) {
  // One-time migration from old separate localStorage key into settings array
  try {
    const raw = localStorage.getItem(DISMISSED_LEGACY_KEY);
    if (!raw) return settingsPairs;
    const legacy = JSON.parse(raw);
    const merged = [...new Set([...(settingsPairs || []), ...legacy])];
    localStorage.removeItem(DISMISSED_LEGACY_KEY);
    return merged;
  } catch { return settingsPairs; }
}

// Scan all materials for duplicate pairs. Returns array of
// { key, idA, idB, level } sorted by severity desc.
function scanAllDuplicates(materials, policy) {
  const pol = policy || window.DUPE_PRESET_A;
  const seen = new Set();
  const results = [];

  for (let i = 0; i < materials.length; i++) {
    const m = materials[i];
    const rest = materials.slice(i + 1);
    const { level, matches } = window.detectDuplicates(m, rest, { ...pol, warnOnMaterialDupe: 'warn' });
    if (!level) continue;
    for (const match of matches) {
      const key = pairKey(m.id, match.id);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ key, idA: m.id, idB: match.id, level });
    }
  }

  // Sort: exact > code-supplier > name-supplier
  const rank = { exact: 0, 'code-supplier': 1, 'name-supplier': 2 };
  results.sort((a, b) => (rank[a.level] || 3) - (rank[b.level] || 3));
  return results;
}

function FindDuplicatesPanel({ materials, libraries, settings, onMerge, onUpdateDismissed, onClose }) {
  const policy = settings?.dupePolicy || window.DUPE_PRESET_A;

  // Migrate legacy localStorage key on first open, then use settings
  const [dismissed, setDismissed] = React.useState(() => {
    const migrated = migrateLegacyDismissed(settings?.dismissedDuplicatePairs || []);
    if (migrated !== (settings?.dismissedDuplicatePairs || [])) {
      // Persist migration result immediately
      onUpdateDismissed && onUpdateDismissed(migrated);
    }
    return new Set(migrated);
  });

  const allPairs = React.useMemo(() => scanAllDuplicates(materials, policy), [materials]);
  const pairs = allPairs.filter(p => !dismissed.has(p.key));

  function dismiss(key) {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(key);
      onUpdateDismissed && onUpdateDismissed([...next]);
      return next;
    });
  }

  function merge(survivorId, loserId, key) {
    onMerge(survivorId, loserId);
    dismiss(key);
  }

  function mergeAll(group) {
    for (const pair of group) {
      onMerge(pair.idA, pair.idB);
      dismiss(pair.key);
    }
  }

  const groupLabels = {
    'exact': 'Exact matches',
    'code-supplier': 'Same code & supplier',
    'name-supplier': 'Same name & supplier',
    'name-fuzzy': 'Similar names',
  };
  const groups = ['exact', 'code-supplier', 'name-supplier', 'name-fuzzy'];

  const byLevel = {};
  for (const p of pairs) {
    if (!byLevel[p.level]) byLevel[p.level] = [];
    byLevel[p.level].push(p);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(20,20,20,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      zIndex: 8000,
    }} onClick={onClose}>
      <div style={{
        width: 680, height: '100vh', background: 'var(--paper)',
        boxShadow: '-16px 0 48px rgba(20,20,20,0.14)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '18px 24px 14px',
          borderBottom: '1px solid var(--rule)',
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14 }}>
              Find duplicates
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic',
              fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>
              {pairs.length === 0 ? 'No duplicates found' : `${pairs.length} pair${pairs.length !== 1 ? 's' : ''} found`}
              {dismissed.size > 0 && ` · ${dismissed.size} dismissed`}
            </div>
          </div>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, color: 'var(--ink-3)', padding: '0 4px' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {pairs.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic',
              fontSize: 14, color: 'var(--ink-3)', marginTop: 32, textAlign: 'center' }}>
              Your library looks clean.
            </div>
          ) : (
            groups.map(level => {
              const group = byLevel[level];
              if (!group?.length) return null;
              return (
                <div key={level} style={{ marginBottom: 32 }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9.5,
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: 'var(--ink-4)', paddingBottom: 8,
                    borderBottom: '1px solid var(--rule)', marginBottom: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span>{groupLabels[level]} &middot; {group.length}</span>
                    {level === 'exact' && group.length > 1 && (
                      <button type="button" onClick={() => mergeAll(group)}
                        style={{
                          padding: '3px 9px', fontSize: 10, cursor: 'pointer',
                          border: '1px solid var(--ink)', background: 'var(--ink)',
                          color: 'var(--paper)', fontFamily: 'var(--font-sans)',
                          letterSpacing: '0.04em', textTransform: 'none',
                        }}>
                        Merge all ({group.length})
                      </button>
                    )}
                  </div>
                  {group.map(pair => (
                    <DupePair
                      key={pair.key}
                      pair={pair}
                      matA={materials.find(m => m.id === pair.idA)}
                      matB={materials.find(m => m.id === pair.idB)}
                      onMergeLeft={() => merge(pair.idA, pair.idB, pair.key)}
                      onMergeRight={() => merge(pair.idB, pair.idA, pair.key)}
                      onKeepBoth={() => dismiss(pair.key)}
                    />
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function DupePair({ pair, matA, matB, onMergeLeft, onMergeRight, onKeepBoth }) {
  if (!matA || !matB) return null;

  const btnStyle = {
    padding: '5px 10px', fontSize: 11.5, cursor: 'pointer',
    border: '1px solid var(--rule-2)', background: 'transparent',
    fontFamily: 'var(--font-sans)', letterSpacing: '0.01em',
    color: 'var(--ink-3)',
  };
  const mergeBtnStyle = {
    ...btnStyle, background: 'var(--ink)', color: 'var(--paper)',
    border: '1px solid var(--ink)',
  };

  return (
    <div style={{
      border: '1px solid var(--rule)', marginBottom: 10,
      background: 'var(--paper)',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--rule)' }}>
        <MaterialCard mat={matA} side="left" />
        <MaterialCard mat={matB} side="right" />
      </div>
      <div style={{
        display: 'flex', gap: 6, padding: '8px 12px',
        alignItems: 'center', background: 'var(--tint)',
      }}>
        <button style={mergeBtnStyle} onClick={onMergeLeft} title="Keep left, remove right">
          Merge into left
        </button>
        <button style={mergeBtnStyle} onClick={onMergeRight} title="Keep right, remove left">
          Merge into right
        </button>
        <div style={{ flex: 1 }} />
        <button style={btnStyle} onClick={onKeepBoth}>
          Not a duplicate
        </button>
      </div>
    </div>
  );
}

function MaterialCard({ mat, side }) {
  const label = window.formatLabel ? window.formatLabel(mat, window._labelTemplatesCache) : mat.name;
  const borderSide = side === 'left'
    ? { borderRight: '1px solid var(--rule)' }
    : {};
  return (
    <div style={{ padding: '10px 14px', ...borderSide, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {mat.swatch && (
          <div style={{
            width: 16, height: 16, flexShrink: 0,
            background: mat.swatch.tone || 'var(--paper-2)',
            border: '1px solid var(--rule-2)',
          }} />
        )}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5,
          color: 'var(--ink-3)', flexShrink: 0 }}>{mat.code}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 500,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </div>
      {mat.supplier && (
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5,
          color: 'var(--ink-3)', marginTop: 2 }}>{mat.supplier}</div>
      )}
    </div>
  );
}

// Count duplicates in a materials list (for import summary banner).
function countDuplicatesInList(materials, policy) {
  const pairs = scanAllDuplicates(materials, policy);
  const ids = new Set();
  for (const p of pairs) { ids.add(p.idA); ids.add(p.idB); }
  return ids.size;
}

Object.assign(window, { FindDuplicatesPanel, countDuplicatesInList });
