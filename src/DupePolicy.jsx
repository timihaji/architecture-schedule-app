// DupePolicy — code series detection, duplicate generation, and conflict detection.
// Pure functions; no React. Exposed as window.DupePolicy and as individual window.*
// globals for convenience.

// ─────────────── Preset bundles ───────────────

const DUPE_PRESET_A = {
  preset: 'A',
  scope: 'project',
  uniquenessProject: 'block',
  uniquenessLibrary: 'warn',
  autoAssign: 'on',
  duplicateName: 'keep',
  duplicateCode: 'series',
  onDelete: 'leave',
  warnOnMaterialDupe: 'warn',
  fuzzyNameMatch: false,
  requireCodeOnSave: false,
};

const DUPE_PRESET_B = {
  ...DUPE_PRESET_A,
  preset: 'B',
  onDelete: 'ask',
};

const DUPE_PRESET_C = {
  ...DUPE_PRESET_A,
  preset: 'C',
  scope: 'library',
  uniquenessProject: 'block',
  uniquenessLibrary: 'block',
  autoAssign: 'off',
  duplicateCode: 'series',
  requireCodeOnSave: true,
};

const DUPE_PRESET_D = {
  ...DUPE_PRESET_A,
  preset: 'D',
  uniquenessProject: 'warn',
  uniquenessLibrary: 'warn',
  autoAssign: 'off',
  duplicateCode: 'copy-suffix',
};

const DUPE_PRESETS = { A: DUPE_PRESET_A, B: DUPE_PRESET_B, C: DUPE_PRESET_C, D: DUPE_PRESET_D };

// ─────────────── Series detection ───────────────

/**
 * Detect the series prefix and trailing number in a code string.
 * Returns { prefix, number, width } or null if no trailing number segment.
 *
 * Examples:
 *   "MAT-01"   → { prefix: "MAT-",   number: 1,   width: 2 }
 *   "BM-HC-172"→ { prefix: "BM-HC-", number: 172, width: 3 }
 *   "101"      → { prefix: "",        number: 101, width: 3 }
 *   "Oak-White"→ null  (no trailing number)
 */
function detectSeries(code) {
  if (!code) return null;
  const m = String(code).match(/^(.*?)(\d+)$/);
  if (!m) return null;
  const prefix = m[1];
  const numStr = m[2];
  return { prefix, number: parseInt(numStr, 10), width: numStr.length };
}

/**
 * Format a series number back into a code string, preserving pad width.
 * Width grows naturally when forced (MAT-99 → MAT-100).
 */
function formatSeriesCode(prefix, number, width) {
  const str = String(number);
  const padded = str.length >= width ? str : str.padStart(width, '0');
  return prefix + padded;
}

/**
 * Given a source code, find the next unused code in its series
 * by incrementing past the current max in the provided materials list.
 * Returns null if the code has no trailing number segment.
 */
function nextInSeries(code, materials) {
  const series = detectSeries(code);
  if (!series) return null;
  const { prefix, width } = series;

  // Collect all existing numbers in this prefix series
  const existing = new Set();
  for (const m of (materials || [])) {
    const s = detectSeries(m.code || '');
    if (s && s.prefix === prefix) existing.add(s.number);
  }

  // Max + 1 (never fill gaps — simpler and safer)
  let max = 0;
  existing.forEach(n => { if (n > max) max = n; });
  const next = max + 1;
  return formatSeriesCode(prefix, next, width);
}

// ─────────────── Code generation ───────────────

/**
 * Generate the code for a newly duplicated material based on policy.
 * policy.duplicateCode controls the strategy.
 */
function generateDuplicateCode(src, materials, policy) {
  const pol = policy || DUPE_PRESET_A;
  const strategy = pol.duplicateCode || 'series';
  const srcCode = src.code || '';

  if (strategy === 'series') {
    return nextInSeries(srcCode, materials) || (srcCode ? srcCode + '-copy' : '');
  }
  if (strategy === 'copy-suffix') {
    return srcCode ? srcCode + '-copy' : '';
  }
  if (strategy === 'same') {
    return srcCode; // intentionally triggers uniqueness warning
  }
  if (strategy === 'project-max' || strategy === 'library-max') {
    const series = detectSeries(srcCode);
    if (!series) return srcCode ? srcCode + '-copy' : '';
    const { prefix, width } = series;
    let max = 0;
    for (const m of (materials || [])) {
      const s = detectSeries(m.code || '');
      if (s && s.prefix === prefix && s.number > max) max = s.number;
    }
    return formatSeriesCode(prefix, max + 1, width);
  }
  if (strategy === 'blank') {
    return '';
  }
  return srcCode ? srcCode + '-copy' : '';
}

/**
 * Auto-assign a code for a NEW material (not a duplicate).
 * Pass `kind` and optionally `category` to narrow the search pool.
 * Tries category-scoped first, falls back to kind-scoped.
 * Returns a suggested code string, or null if ambiguous or policy is off.
 */
function autoAssignCode(materials, policy, kind, category) {
  const pol = policy || DUPE_PRESET_A;
  if (pol.autoAssign === 'off' || pol.autoAssign === 'none') return null;

  function pluralityNext(pool) {
    const counts = {};
    for (const m of pool) {
      const s = detectSeries(m.code || '');
      if (s !== null) counts[s.prefix] = (counts[s.prefix] || 0) + 1;
    }
    const prefixes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    if (prefixes.length === 0) return null;
    // Require a clear winner — top must beat second by at least 1
    if (prefixes.length > 1 && counts[prefixes[0]] === counts[prefixes[1]]) return null;
    const dominant = prefixes[0];
    let max = 0, maxWidth = 2;
    for (const m of pool) {
      const s = detectSeries(m.code || '');
      if (s && s.prefix === dominant && s.number > max) { max = s.number; maxWidth = s.width; }
    }
    return formatSeriesCode(dominant, max + 1, maxWidth);
  }

  const all = materials || [];
  const kindPool = kind ? all.filter(m => m.category === kind) : all;

  // Try category-scoped first (most specific), then kind-scoped
  if (category) {
    const catPool = kindPool.filter(m => m.category === category);
    const result = pluralityNext(catPool);
    if (result) return result;
  }

  return pluralityNext(kindPool);
}

// ─────────────── Duplicate detection ───────────────

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

/**
 * Detect whether a material conflicts with existing materials.
 *
 * Returns { level: 'exact' | 'code-supplier' | 'name-supplier' | 'name-fuzzy' | null, matches: Material[] }
 *
 * Only the highest-severity match is returned.
 */
function detectDuplicates(material, materials, policy) {
  const pol = policy || DUPE_PRESET_A;
  if (pol.warnOnMaterialDupe === 'off') return { level: null, matches: [] };

  const fv = window.getFieldValue || ((m, k) => (m.fields && m.fields[k]) ?? m[k]);
  const supplier = (m) => String(fv(m, 'supplier') || '');

  const others = (materials || []).filter(m => m.id !== material.id);

  // 1. Exact: all key identity fields identical (excluding id, timestamps, history)
  const exactMatches = others.filter(m =>
    (m.code || '') === (material.code || '') &&
    (m.name || '') === (material.name || '') &&
    (m.category || '') === (material.category || '') &&
    supplier(m) === supplier(material)
  );
  if (exactMatches.length > 0) return { level: 'exact', matches: exactMatches };

  // 2. Same code + same supplier
  if (material.code) {
    const codeSupplierMatches = others.filter(m =>
      m.code === material.code && supplier(m) === supplier(material)
    );
    if (codeSupplierMatches.length > 0) return { level: 'code-supplier', matches: codeSupplierMatches };
  }

  // 3. Same name + same supplier
  if (material.name) {
    const nameSupplierMatches = others.filter(m =>
      (m.name || '').toLowerCase() === material.name.toLowerCase() &&
      supplier(m) === supplier(material)
    );
    if (nameSupplierMatches.length > 0) return { level: 'name-supplier', matches: nameSupplierMatches };
  }

  // 4. Fuzzy name + same supplier (opt-in, Levenshtein distance <= 2)
  if (pol.fuzzyNameMatch && material.name) {
    const nameLower = material.name.toLowerCase();
    const fuzzyMatches = others.filter(m =>
      m.name &&
      supplier(m) === supplier(material) &&
      levenshtein(nameLower, m.name.toLowerCase()) <= 2
    );
    if (fuzzyMatches.length > 0) return { level: 'name-fuzzy', matches: fuzzyMatches };
  }

  return { level: null, matches: [] };
}

/**
 * Check if a code is already used by another material in the list.
 * Returns the conflicting material or null.
 */
function findCodeConflict(code, materialId, materials) {
  if (!code) return null;
  return (materials || []).find(m => m.code === code && m.id !== materialId) || null;
}

// ─────────────── Row code helpers (v6) ───────────────
//
// Schedule rows now own their own `code`. These helpers operate on row pools,
// not material pools. They share the plurality-prefix algorithm with
// autoAssignCode but accept rows directly (rows have a top-level `category`
// field; see CostScheduleV2.jsx row shape).
//
// Public surface:
//   nextRowCodeFor(rows, material, policy, taxonomies, allRows)
//   findRowCodeConflict(code, rowId, rows, policy)
//   expectedPrefixFor(scopedRows)
//   isAutoGeneratedCode(code, scopedRows)
//   isOfficeMode(policy)

/**
 * Internal: plurality prefix detection over a pool of rows (or materials).
 * Returns the dominant prefix string (possibly '') or null when there's no
 * clear winner.
 */
function _dominantPrefix(pool) {
  const counts = {};
  for (const r of (pool || [])) {
    const s = detectSeries(r.code || '');
    if (s !== null) counts[s.prefix] = (counts[s.prefix] || 0) + 1;
  }
  const prefixes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  if (prefixes.length === 0) return null;
  if (prefixes.length > 1 && counts[prefixes[0]] === counts[prefixes[1]]) return null;
  return prefixes[0];
}

/**
 * Internal: derive a 2-letter fallback prefix from a category id when no
 * dominant prefix exists in the pool. Honours an explicit category.code if
 * one is ever added to the schema.
 */
function _categoryFallbackPrefix(material) {
  if (!material || !material.category) return '';
  const def = (typeof window !== 'undefined' && window.categoryDef)
    ? window.categoryDef(material.category)
    : null;
  if (def && def.code) return String(def.code).toUpperCase();
  return String(material.category).slice(0, 2).toUpperCase();
}

/**
 * Suggest the next code for a new schedule row.
 *
 * Honors:
 *   - policy.autoAssign === 'off' (or legacy 'none') → returns ''
 *   - policy.scope: 'project' uses `rows`; 'library' uses `allRows`
 *
 * Algorithm:
 *   1. Filter the chosen pool to the new material's category.
 *   2. If the pool has a dominant prefix, take its max number + 1 (preserving
 *      width). Honors flat numbering: dominant prefix may be '' (e.g. "01",
 *      "02", "03") and the algorithm continues numerically.
 *   3. If pool empty / no winner, fall back to category-derived prefix +
 *      "-01".
 */
function nextRowCodeFor(rows, material, policy, taxonomies, allRows) {
  const pol = policy || DUPE_PRESET_A;
  if (pol.autoAssign === 'off' || pol.autoAssign === 'none') return '';
  if (!material) return '';

  const pool = (pol.scope === 'library' ? allRows : rows) || [];
  const catRows = pool.filter(r => r && r.category === material.category);

  const dominant = _dominantPrefix(catRows);
  if (dominant !== null) {
    let max = 0, maxWidth = 2;
    for (const r of catRows) {
      const s = detectSeries(r.code || '');
      if (s && s.prefix === dominant && s.number > max) {
        max = s.number;
        maxWidth = s.width;
      }
    }
    return formatSeriesCode(dominant, max + 1, maxWidth);
  }

  // Empty / split pool → fall back to category prefix
  const fallback = _categoryFallbackPrefix(material);
  if (fallback) return formatSeriesCode(fallback + '-', 1, 2);
  return '01';
}

/**
 * The "expected prefix" used by the auto-vs-user heuristic — the same
 * dominant prefix the suggester would use. Returns null when ambiguous.
 *
 * Caller passes a pre-scoped pool (rows in the relevant category, excluding
 * the row being checked).
 */
function expectedPrefixFor(scopedRows) {
  return _dominantPrefix(scopedRows);
}

/**
 * Heuristic: is this code consistent with the suggester's prefix for this
 * pool? If yes, treat as auto-generated (re-suggestable on category swap and
 * eligible for bulk renumber). If no, treat as user-typed (never overwrite).
 *
 * Edge cases:
 *   - Empty/null code → true (no code present; safe to assign)
 *   - Code has no detectable series (e.g. "PT-CUSTOM") → false (user-typed)
 *   - Pool has no dominant prefix → true (best effort; can't distinguish)
 */
function isAutoGeneratedCode(code, scopedRows) {
  if (!code) return true;
  const series = detectSeries(code);
  if (!series) return false;
  const dominant = _dominantPrefix(scopedRows);
  if (dominant === null) return true;
  return series.prefix === dominant;
}

/**
 * Check if a row's code conflicts with another row's code in the relevant
 * scope. Returns 'block' | 'warn' | null per policy.uniquenessProject (or
 * uniquenessLibrary in office mode). Returns null when uniqueness is 'off'
 * or there's no conflict.
 */
function findRowCodeConflict(code, rowId, scopedRows, policy) {
  if (!code) return null;
  const pol = policy || DUPE_PRESET_A;
  const key = pol.scope === 'library' ? 'uniquenessLibrary' : 'uniquenessProject';
  const level = pol[key];
  if (!level || level === 'off') return null;
  const hit = (scopedRows || []).find(r => r && r.id !== rowId && (r.code || '') === code);
  return hit ? level : null;
}

/**
 * Single source of truth for "is the workspace running in office-catalog
 * mode?" — drives library code UI visibility and row-code seeding behavior.
 */
function isOfficeMode(policy) {
  return !!(policy && policy.scope === 'library');
}

/**
 * Bulk renumber: walk `candidateRowIds` (in display order) and reassign
 * `row.code` for each row whose current code is auto-generated (per
 * isAutoGeneratedCode). Manually-typed codes (prefix mismatch) survive.
 *
 * Per-category gap-closing: codes are reassigned starting at 1 within the
 * dominant prefix of each category, skipping any numeric slot already locked
 * by a non-candidate row in the same series.
 *
 * Returns a new rows array with the same length and order.
 */
function renumberRows(originalRows, candidateRowIds, policy, materials) {
  const pol = policy || DUPE_PRESET_A;
  if (pol.autoAssign === 'off' || pol.autoAssign === 'none') return originalRows;
  const candidateSet = new Set(candidateRowIds || []);
  const result = (originalRows || []).map(r => ({ ...r }));
  const matsById = new Map((materials || []).map(m => [m.id, m]));

  const byCategory = new Map();
  result.forEach((r, idx) => {
    if (!candidateSet.has(r.id)) return;
    const m = r.specRef && r.specRef.id ? matsById.get(r.specRef.id) : null;
    if (!m) return;
    const scopedExcludingSelf = result.filter(p => p.id !== r.id && p.category === r.category);
    if (!isAutoGeneratedCode(r.code, scopedExcludingSelf)) return;
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category).push({ idx, m });
  });

  byCategory.forEach((items, category) => {
    if (!items.length) return;
    const catRows = result.filter(r => r.category === category);
    let dominant = _dominantPrefix(catRows);
    let width = 2;
    if (dominant !== null) {
      catRows.forEach(r => {
        const s = detectSeries(r.code || '');
        if (s && s.prefix === dominant && s.width > width) width = s.width;
      });
    } else {
      const probe = items[0].m;
      const fallback = _categoryFallbackPrefix(probe);
      dominant = fallback ? fallback + '-' : '';
    }

    const lockedNumbers = new Set();
    catRows.forEach(r => {
      if (candidateSet.has(r.id)) return;
      const series = detectSeries(r.code || '');
      if (series && series.prefix === dominant) lockedNumbers.add(series.number);
    });

    let n = 1;
    for (const { idx } of items) {
      while (lockedNumbers.has(n)) n++;
      const code = formatSeriesCode(dominant, n, width);
      result[idx] = { ...result[idx], code };
      n++;
    }
  });

  return result;
}

/**
 * Count rows eligible for renumbering — used to show accurate confirm
 * dialog text. A row is eligible iff it has a resolvable material AND its
 * current code is auto-generated.
 */
function countRenumberCandidates(rows, policy, materials) {
  const pol = policy || DUPE_PRESET_A;
  if (pol.autoAssign === 'off' || pol.autoAssign === 'none') return 0;
  const matsById = new Map((materials || []).map(m => [m.id, m]));
  let n = 0;
  for (const r of (rows || [])) {
    const m = r.specRef && r.specRef.id ? matsById.get(r.specRef.id) : null;
    if (!m) continue;
    const scopedExcludingSelf = (rows || []).filter(p => p.id !== r.id && p.category === r.category);
    if (isAutoGeneratedCode(r.code, scopedExcludingSelf)) n++;
  }
  return n;
}

// ─────────────── Policy resolver ───────────────

/**
 * Resolve the effective policy from settings.
 * If preset is 'custom', returns the stored knobs directly.
 * Otherwise merges the preset bundle so callers always get a full object.
 */
function getDupePolicy(settings) {
  const stored = (settings && settings.dupePolicy) || DUPE_PRESET_A;
  if (stored.preset === 'custom') return { ...DUPE_PRESET_A, ...stored };
  const bundle = DUPE_PRESETS[stored.preset] || DUPE_PRESET_A;
  return { ...bundle, ...stored };
}

// ─────────────── Export ───────────────

const DupePolicy = {
  DUPE_PRESET_A, DUPE_PRESET_B, DUPE_PRESET_C, DUPE_PRESET_D, DUPE_PRESETS,
  detectSeries, formatSeriesCode, nextInSeries,
  generateDuplicateCode, autoAssignCode,
  detectDuplicates, findCodeConflict,
  nextRowCodeFor, findRowCodeConflict,
  expectedPrefixFor, isAutoGeneratedCode, isOfficeMode,
  renumberRows, countRenumberCandidates,
  getDupePolicy,
};

Object.assign(window, {
  DupePolicy,
  detectSeries,
  nextInSeries,
  generateDuplicateCode,
  autoAssignCode,
  detectDuplicates,
  findCodeConflict,
  nextRowCodeFor,
  findRowCodeConflict,
  expectedPrefixFor,
  isAutoGeneratedCode,
  isOfficeMode,
  renumberRows,
  countRenumberCandidates,
  getDupePolicy,
  DUPE_PRESETS,
  DUPE_PRESET_A,
});
