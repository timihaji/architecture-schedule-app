// Shared Library toolbar — single canonical row used by every mode (Gallery
// / Register / Table / Split). DOM order is fixed so universal controls don't
// jump when switching layouts. Only `columnsButton` is mode-gated (Register +
// Table). Reference: ~/Downloads/Library _Standalone_.html. CSS lives in
// index.html under the `.toolbar` / `.search` / `.filter-sel` block.

function LibraryToolbar({
  query, setQuery,
  sort, setSort,
  filterCategory, setFilterCategory, categories = [],
  group, setGroup,
  groupBy, setGroupBy,
  groupableItems,
  count, total,
  onFindDupes,
  searchPlaceholder = 'Search name, code, supplier, finish…',
  columnsButton = null,
}) {
  // Phase 4: groupBy axis dropdown — replaces the boolean Group toggle when
  // setGroupBy is provided. Falls back to the boolean toggle for legacy
  // call-sites that still pass setGroup.
  const groupByOptions = React.useMemo(() => {
    if (!setGroupBy || !window.groupableFields) return [];
    return window.groupableFields(groupableItems || []);
  }, [setGroupBy, groupableItems]);
  const showCount = (count != null) ? (
    total != null && count !== total
      ? `${count} of ${total}`
      : `${count} ${count === 1 ? 'item' : 'items'}`
  ) : null;

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
      <select className="filter-sel"
        value={filterCategory || 'All'}
        onChange={e => setFilterCategory(e.target.value)}>
        <option value="All">All categories</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <div className="vbar"></div>

      <span className="tb-lbl">Sort</span>
      <select className="filter-sel"
        value={sort || 'code'}
        onChange={e => setSort(e.target.value)}>
        <option value="code">Code</option>
        <option value="name">Name</option>
        <option value="cost">Cost</option>
        <option value="lead">Lead time</option>
      </select>

      {setGroupBy ? (
        <>
          <span className="tb-lbl">Group by</span>
          <select className="filter-sel"
            value={groupBy || ''}
            onChange={e => setGroupBy(e.target.value)}>
            <option value="">None</option>
            {groupByOptions.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
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

Object.assign(window, { LibraryToolbar });
