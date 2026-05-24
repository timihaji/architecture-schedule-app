// Dropdown — reusable trigger-button + popover replacement for native <select>.
// Used by LibraryToolbar (Filter/Sort/Group by) and CostScheduleV2 (Group by /
// Project switcher). Two option shapes:
//   options: [{ value, label, count? }]                — flat list
//   sections: [{ title, options: [{ value, label, count? }] }]   — grouped
// Pick exactly one. Searchable mode adds a filter input above the options.
// Active-state styling + tiny × clear button trigger when value !== defaultValue.

function Dropdown({
  value,
  onChange,
  defaultValue = '',
  options,
  sections,
  placeholder = '',
  searchable = false,
  align = 'left',
  maxWidth = 180,
  ariaLabel,
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);

  // Normalise to sections-shaped data so render is uniform.
  const normSections = React.useMemo(() => {
    if (Array.isArray(sections)) return sections;
    if (Array.isArray(options)) return [{ title: null, options }];
    return [];
  }, [sections, options]);

  // Filter options against the live query (case-insensitive substring on label).
  const filteredSections = React.useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return normSections;
    return normSections
      .map(sec => ({
        ...sec,
        options: (sec.options || []).filter(o =>
          String(o.label || '').toLowerCase().includes(q)
        ),
      }))
      .filter(sec => sec.options.length > 0);
  }, [normSections, query]);

  // Flat list of all currently-visible options — used for keyboard nav and
  // to find the selected option's label for the trigger.
  const flatOptions = React.useMemo(() => {
    const out = [];
    filteredSections.forEach(sec => (sec.options || []).forEach(o => out.push(o)));
    return out;
  }, [filteredSections]);

  const allOptionsFlat = React.useMemo(() => {
    const out = [];
    normSections.forEach(sec => (sec.options || []).forEach(o => out.push(o)));
    return out;
  }, [normSections]);

  const selectedOption = React.useMemo(() => {
    return allOptionsFlat.find(o => o.value === value) || null;
  }, [allOptionsFlat, value]);

  const isActive = value !== defaultValue;
  const triggerLabel = (selectedOption && selectedOption.label) || placeholder;

  // Outside click + ESC close.
  React.useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') { setOpen(false); }
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Reset transient state on close.
  React.useEffect(() => {
    if (!open) { setQuery(''); setActiveIdx(-1); }
  }, [open]);

  // Auto-focus search when opened (if searchable).
  React.useEffect(() => {
    if (open && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, searchable]);

  function pick(v) {
    if (typeof onChange === 'function') onChange(v);
    setOpen(false);
  }

  function onTriggerKey(e) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min((flatOptions.length - 1), (i < 0 ? 0 : i + 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(0, (i < 0 ? 0 : i - 1)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = flatOptions[activeIdx];
      if (opt) pick(opt.value);
    }
  }

  // Track flat index across sections for keyboard highlight.
  let runningIdx = -1;

  return (
    <div className="dd-wrap" ref={wrapRef}>
      <button
        type="button"
        className={'dd-btn' + (isActive ? ' is-active' : '') + (open ? ' is-open' : '')}
        style={{ maxWidth }}
        onClick={() => setOpen(o => !o)}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="dd-btn-label">{triggerLabel}</span>
        {isActive && (
          <span
            className="dd-btn-clear"
            role="button"
            tabIndex={-1}
            aria-label="Clear"
            onClick={(e) => {
              e.stopPropagation();
              if (typeof onChange === 'function') onChange(defaultValue);
            }}
          >×</span>
        )}
        <svg className="dd-btn-chev" width="9" height="9" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5 L6 7.5 L9 4.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className={'dd-pop' + (align === 'right' ? ' is-right' : '')} role="listbox">
          {searchable && (
            <input
              ref={inputRef}
              className="dd-search"
              type="text"
              placeholder="Filter…"
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
              onKeyDown={onTriggerKey}
            />
          )}
          <div className="dd-list">
            {filteredSections.length === 0 && (
              <div className="dd-empty">No matches</div>
            )}
            {filteredSections.map((sec, si) => (
              <div className="dd-section" key={(sec.title || '_') + si}>
                {sec.title && <div className="dd-section-hdr">{sec.title}</div>}
                {(sec.options || []).map(opt => {
                  runningIdx += 1;
                  const isSel = opt.value === value;
                  const isHi = runningIdx === activeIdx;
                  return (
                    <div
                      key={opt.value}
                      className={'dd-opt' + (isSel ? ' is-selected' : '') + (isHi ? ' is-active' : '')}
                      role="option"
                      aria-selected={isSel}
                      onMouseEnter={() => setActiveIdx(runningIdx)}
                      onClick={() => pick(opt.value)}
                    >
                      <span className="dd-opt-label">{opt.label}</span>
                      {(opt.count != null) && (
                        <span className="dd-opt-count">{opt.count}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Dropdown });
