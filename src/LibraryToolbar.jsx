// Shared Library toolbar — single canonical row used by every mode (Gallery
// / Register / Table / Split). DOM order is fixed so universal controls don't
// jump when switching layouts. Only `columnsButton` is mode-gated (Register +
// Table). Reference: ~/Downloads/Library _Standalone_.html. CSS lives in
// index.html under the `.toolbar` / `.search` / `.dd-*` blocks.

// Build sectioned options for the Group by dropdown. Splits the flat axis list
// returned by groupableFields() into Recent / Built-in / Tags / Fields, with
// a "None" option pinned to the top of Built-in. Each option is annotated
// with a bucket count via window.bucketCountForAxis.
function buildGroupBySections(axes, recentIds, items) {
  const byId = new Map();
  (axes || []).forEach(a => byId.set(a.id, a));
  const count = window.bucketCountForAxis || (() => null);
  const toOpt = (a) => ({ value: a.id, label: a.label, count: count(a, items) });

  const recentAxes = (recentIds || [])
    .map(id => byId.get(id))
    .filter(Boolean);

  const synthetic = (axes || []).filter(a => a.type === 'synthetic');
  const tagAxes   = (axes || []).filter(a => a.type === 'tag');
  const fieldAxes = (axes || []).filter(a => a.type !== 'synthetic' && a.type !== 'tag');

  const sections = [];
  if (recentAxes.length) {
    sections.push({ title: 'Recent', options: recentAxes.map(toOpt) });
  }
  sections.push({
    title: 'Built-in',
    options: [{ value: '', label: 'None' }].concat(synthetic.map(toOpt)),
  });
  if (tagAxes.length) sections.push({ title: 'Tags', options: tagAxes.map(toOpt) });
  if (fieldAxes.length) sections.push({ title: 'Fields', options: fieldAxes.map(toOpt) });
  return sections;
}

function LibraryToolbar({
  query, setQuery,
  sort, setSort,
  filterCategory, setFilterCategory, categories = [],
  group, setGroup,
  groupBy, setGroupBy,
  groupableItems,
  recentGroupByAxes,
  count, total,
  onFindDupes,
  searchPlaceholder = 'Search name, code, supplier, finish…',
  columnsButton = null,
}) {
  // Filter dropdown sections: "All categories" pinned, then per-group sections
  // with item-count annotations.
  const filterSections = React.useMemo(() => {
    const counts = (window.itemCountByCategory && window.itemCountByCategory(groupableItems || [])) || {};
    const groupSections = (window.categorySectionsForIds && window.categorySectionsForIds(categories)) || [];
    return [
      { title: null, options: [{ value: 'All', label: 'All categories', count: total != null ? total : (groupableItems || []).length }] },
      ...groupSections.map(s => ({
        title: s.title,
        options: s.options.map(o => ({ ...o, count: counts[o.value] || 0 })),
      })),
    ];
  }, [categories, groupableItems, total]);

  // Group by dropdown sections.
  const groupBySections = React.useMemo(() => {
    if (!setGroupBy || !window.groupableFields) return [];
    const axes = window.groupableFields(groupableItems || []);
    return buildGroupBySections(axes, recentGroupByAxes || [], groupableItems || []);
  }, [setGroupBy, groupableItems, recentGroupByAxes]);

  const showCount = (count != null) ? (
    total != null && count !== total
      ? `${count} of ${total}`
      : `${count} ${count === 1 ? 'item' : 'items'}`
  ) : null;

  const Dropdown = window.Dropdown;

  return (
    <div className="toolbar">
      {/* Search */}
      <div className="search">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          style={{ color: 'var(--ink-4)', flexShrink: 0 }}>
          <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="1.6" />
          <line x1="15" y1="15" x2="20" y2="20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          value={query || ''}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
        />
        {query && (
          <button type="button" onClick={() => setQuery('')}
            aria-label="Clear search"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-4)', fontSize: 13, padding: 0, lineHeight: 1,
            }}>×</button>
        )}
      </div>

      <div className="vbar"></div>

      <span className="tb-lbl">Filter</span>
      <Dropdown
        value={filterCategory || 'All'}
        onChange={setFilterCategory}
        defaultValue="All"
        placeholder="All categories"
        sections={filterSections}
        searchable={categories.length > 12}
        ariaLabel="Filter by category"
      />

      <div className="vbar"></div>

      <span className="tb-lbl">Sort</span>
      <Dropdown
        value={sort || 'code'}
        onChange={setSort}
        defaultValue="code"
        options={[
          { value: 'code', label: 'Code' },
          { value: 'name', label: 'Name' },
          { value: 'cost', label: 'Cost' },
          { value: 'lead', label: 'Lead time' },
        ]}
        ariaLabel="Sort"
      />

      {setGroupBy ? (
        <>
          <span className="tb-lbl">Group by</span>
          <Dropdown
            value={groupBy || ''}
            onChange={setGroupBy}
            defaultValue="_category"
            placeholder="None"
            sections={groupBySections}
            searchable
            ariaLabel="Group by"
          />
        </>
      ) : (
        <button type="button"
          className={'btn-ghost' + (group ? ' on' : '')}
          onClick={() => setGroup(!group)}
          title="Group by category">
          Group
        </button>
      )}

      {onFindDupes && (
        <button type="button" className="btn-ghost"
          onClick={onFindDupes}
          title="Find duplicates">
          Find dupes
        </button>
      )}

      {columnsButton}

      <div className="tb-grow"></div>

      {showCount && <span className="tb-count">{showCount}</span>}
    </div>
  );
}

Object.assign(window, { LibraryToolbar, buildGroupBySections });
