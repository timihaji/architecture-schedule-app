// DupePolicy — code series detection, duplicate generation, and conflict detection.
// Pure functions; no React. Exposed as window.DupePolicy and as individual window.*
// globals for convenience.

// ─────────────── Preset bundles ───────────────

const DUPE_PRESET_A = {
  preset: 'A',
  scope: 'project',
  uniquenessProject: 'block',
  uniquenessLibrary: 'warn',
  autoAssign: 'series',
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
  autoAssign: 'none',
  duplicateCode: 'series',
  requireCodeOnSave: true,
};

const DUPE_PRESET_D = {
  ...DUPE_PRESET_A,
  preset: 'D',
  uniquenessProject: 'warn',
  uniquenessLibrary: 'warn',
  autoAssign: 'none',
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
  if (pol.autoAssign === 'none') return null;

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
  const kindPool = kind ? all.filter(m => (m.kind || 'material') === kind) : all;

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

  const others = (materials || []).filter(m => m.id !== material.id);

  // 1. Exact: all key identity fields identical (excluding id, timestamps, history)
  const exactFields = ['code', 'name', 'category', 'supplier'];
  const exactMatches = others.filter(m =>
    exactFields.every(f => (m[f] || '') === (material[f] || ''))
  );
  if (exactMatches.length > 0) return { level: 'exact', matches: exactMatches };

  // 2. Same code + same supplier
  if (material.code) {
    const codeSupplierMatches = others.filter(m =>
      m.code === material.code &&
      (m.supplier || '') === (material.supplier || '')
    );
    if (codeSupplierMatches.length > 0) return { level: 'code-supplier', matches: codeSupplierMatches };
  }

  // 3. Same name + same supplier
  if (material.name) {
    const nameSupplierMatches = others.filter(m =>
      (m.name || '').toLowerCase() === material.name.toLowerCase() &&
      (m.supplier || '') === (material.supplier || '')
    );
    if (nameSupplierMatches.length > 0) return { level: 'name-supplier', matches: nameSupplierMatches };
  }

  // 4. Fuzzy name + same supplier (opt-in, Levenshtein distance <= 2)
  if (pol.fuzzyNameMatch && material.name) {
    const nameLower = material.name.toLowerCase();
    const fuzzyMatches = others.filter(m =>
      m.name &&
      (m.supplier || '') === (material.supplier || '') &&
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
  getDupePolicy,
  DUPE_PRESETS,
  DUPE_PRESET_A,
});
