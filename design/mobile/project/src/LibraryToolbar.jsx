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
  const [sheetOpen, setSheetOpen] = React.useState(false);

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

  // Count active non-default filters for the mobile badge
  const activeFilterCount = [
    (filterCategory && filterCategory !== 'All') ? 1 : 0,
    (sort && sort !== 'name') ? 1 : 0,
    (groupBy && groupBy !== '_category') ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const Dropdown = window.Dropdown;

  const sortOptions = [
    ...(!!(window.isOfficeMode && window.isOfficeMode(window.appState?.settings?.dupePolicy))
      ? [{ value: 'code', label: 'Code' }] : []),
    { value: 'name', label: 'Name' },
    { value: 'cost', label: 'Cost' },
    { value: 'lead', label: 'Lead time' },
  ];

  return (
    <>
      <div className="toolbar">
        {/* Search — always visible */}
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
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* Desktop controls */}
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
          value={sort || 'name'}
          onChange={setSort}
          defaultValue="name"
          options={sortOptions}
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
          <button type="button" className="btn-ghost" onClick={onFindDupes} title="Find duplicates">
            Find dupes
          </button>
        )}

        {columnsButton}

        {/* Mobile: single filter button */}
        <button
          type="button"
          className={'mobile-filter-btn' + (activeFilterCount > 0 ? ' has-active' : '')}
          onClick={() => setSheetOpen(true)}
          aria-label="Open filters"
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="mobile-filter-badge">{activeFilterCount}</span>
          )}
        </button>

        <div className="tb-grow"></div>
        {showCount && <span className="tb-count">{showCount}</span>}
      </div>

      {/* Mobile filter sheet */}
      {sheetOpen && (
        <div className="mobile-filter-sheet-bg" onClick={() => setSheetOpen(false)}>
          <div className="mobile-filter-sheet" onClick={e => e.stopPropagation()}>
            <div className="mobile-filter-sheet-handle" />

            <div className="mobile-filter-sheet-row">
              <span className="mobile-filter-sheet-lbl">Filter by category</span>
              <Dropdown
                value={filterCategory || 'All'}
                onChange={v => { setFilterCategory(v); }}
                defaultValue="All"
                placeholder="All categories"
                sections={filterSections}
                searchable={categories.length > 8}
                ariaLabel="Filter by category"
              />
            </div>

            <div className="mobile-filter-sheet-row">
              <span className="mobile-filter-sheet-lbl">Sort by</span>
              <Dropdown
                value={sort || 'name'}
                onChange={setSort}
                defaultValue="name"
                options={sortOptions}
                ariaLabel="Sort"
              />
            </div>

            {setGroupBy && (
              <div className="mobile-filter-sheet-row">
                <span className="mobile-filter-sheet-lbl">Group by</span>
                <Dropdown
                  value={groupBy || ''}
                  onChange={setGroupBy}
                  defaultValue="_category"
                  placeholder="None"
                  sections={groupBySections}
                  searchable
                  ariaLabel="Group by"
                />
              </div>
            )}

            {showCount && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {showCount}
              </div>
            )}

            <button
              type="button"
              className="mobile-filter-sheet-done"
              onClick={() => setSheetOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
Object.assign(window, { LibraryToolbar, buildGroupBySections });
