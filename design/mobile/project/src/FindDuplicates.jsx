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

  const officeMode = !!(window.isOfficeMode && window.isOfficeMode(policy));
  const groupLabels = {
    'exact': 'Exact matches',
    'code-supplier': 'Same code & supplier',
    'name-supplier': 'Same name & supplier',
    'name-fuzzy': 'Similar names',
  };
  const groups = ['exact', ...(officeMode ? ['code-supplier'] : []), 'name-supplier', 'name-fuzzy'];

  const byLevel = {};
  for (const p of pairs) {
    if (!byLevel[p.level]) byLevel[p.level] = [];
    byLevel[p.level].push(p);
  }

  return (
    <div className="fd-panel-bg" onClick={onClose}>
      <div className="fd-panel" onClick={e => e.stopPropagation()}>

        <div className="fd-panel-head">
          <div>
            <div className="fd-panel-eyebrow">Codes &amp; duplicates</div>
            <div className="fd-panel-title">Find duplicates</div>
            <div className="fd-panel-sub">
              {pairs.length === 0 ? 'No duplicates found' : `${pairs.length} pair${pairs.length !== 1 ? 's' : ''} found`}
              {dismissed.size > 0 && ` · ${dismissed.size} dismissed`}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="fd-panel-close">×</button>
        </div>

        <div className="fd-panel-body">
          {pairs.length === 0 ? (
            <div className="fd-empty">Your library looks clean.</div>
          ) : (
            groups.map(level => {
              const group = byLevel[level];
              if (!group?.length) return null;
              return (
                <div key={level} className="fd-group">
                  <div className="fd-group-head">
                    <span>{groupLabels[level]} &middot; {group.length}</span>
                    {level === 'exact' && group.length > 1 && (
                      <button type="button" className="fd-merge-all-btn" onClick={() => mergeAll(group)}>
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
  return (
    <div className="fd-pair">
      <div className="fd-pair-cols">
        <MaterialCard mat={matA} side="left" />
        <MaterialCard mat={matB} side="right" />
      </div>
      <div className="fd-pair-actions">
        <button className="fd-merge-btn" onClick={onMergeLeft} title="Keep left, remove right">
          Merge into left
        </button>
        <button className="fd-merge-btn" onClick={onMergeRight} title="Keep right, remove left">
          Merge into right
        </button>
        <div style={{ flex: 1 }} />
        <button className="fd-dismiss-btn" onClick={onKeepBoth}>
          Not a duplicate
        </button>
      </div>
    </div>
  );
}

function MaterialCard({ mat, side }) {
  const label = window.formatLabel ? window.formatLabel(mat, window._labelTemplatesCache) : mat.name;
  const officeMode = !!(window.isOfficeMode && window.isOfficeMode(window.appState?.settings?.dupePolicy));
  return (
    <div className={'fd-mat-card' + (side === 'left' ? ' left' : '')}>
      <div className="fd-mat-top">
        {mat.swatch && (
          <div className="fd-mat-swatch"
            style={{ background: mat.swatch.tone || 'var(--paper-2)' }} />
        )}
        {officeMode && <span className="fd-mat-code">{mat.code}</span>}
      </div>
      <div className="fd-mat-name">{label}</div>
      {mat.supplier && <div className="fd-mat-supplier">{mat.supplier}</div>}
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
