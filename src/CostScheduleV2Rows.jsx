// Cost Schedule v2 — row/group/insertion components + formula evaluator.

// Resolve shared DnD helpers (registered on window by CostScheduleDnD.jsx).
const DragGrip = window.DragGrip;
const DropZone = window.DropZone;
const useDnD = window.useDnD;
const useFlipAnimation = window.useFlipAnimation;

// ───────── Formula evaluator (legacy migration only) ─────────
// Used to convert old v2 qty strings like "5 × 2.91" into {count, size}.

function evalFormula(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const norm = s.replace(/[×xX]/g, '*').replace(/\u00d7/g, '*').replace(/,/g, '.');
  if (!/^[\d\s.+\-*/()]+$/.test(norm)) return null;
  try {
    const v = Function('"use strict"; return (' + norm + ')')();
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch { return null; }
}

// Parse legacy qty strings. Returns {count, size} where count may be null.
function parseQtyLegacy(raw) {
  if (raw == null || raw === '') return { count: null, size: '' };
  const s = String(raw).trim();
  // Match simple "a × b" (accept ×, x, *, spaces)
  const mx = s.match(/^(\d+(?:[.,]\d+)?)\s*[×xX*]\s*(\d+(?:[.,]\d+)?)$/);
  if (mx) {
    return { count: mx[1].replace(',', '.'), size: mx[2].replace(',', '.') };
  }
  // Otherwise evaluate whatever it is as the size.
  const v = evalFormula(s);
  if (v !== null) return { count: null, size: String(v) };
  return { count: null, size: s };
}

function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
}

// Evaluate a component's total quantity using its structured count × size.
// count is optional (blank → 1). size is required (blank → null).
function componentQty(c) {
  if (!c) return null;
  const size = parseFloat(String(c.size || '').replace(',', '.'));
  if (!Number.isFinite(size)) return null;
  const countRaw = c.count;
  if (countRaw == null || countRaw === '') return size;
  const count = parseFloat(String(countRaw).replace(',', '.'));
  if (!Number.isFinite(count)) return size;
  return count * size;
}

// ───────── ScheduleGrid ─────────
// Thin wrapper that holds the grid, runs FLIP animation on component reorders,
// and dispatches to CategoryGroup rendering.

function ScheduleGrid({
  gridColumns, schedule, grouped, materials, labelTemplates, categoryNames,
  justInsertedId, menuForCompId, setMenuForCompId,
  editingOptionId, setEditingOptionId,
  optionTotals, lowest,
  renameOption, duplicateOption, removeOption,
  setComp, removeComponent, duplicateComponent, changeComponentCategory,
  moveComponent, moveRowUp, moveRowDown, moveRowToCategoryEdge,
  setPickerFor, cellTotal,
  insertComponentAt, appendComponentToCategory, renameCategory, removeCategory, duplicateCategory, onBlurInsert,
}) {
  const gridRef = React.useRef(null);
  // Animate whenever component order or category identity changes.
  const signature = React.useMemo(
    () => schedule.components.map(c => c.id + ':' + (c.category || 'Uncategorised')).join('|'),
    [schedule.components]
  );
  useFlipAnimation(gridRef, [signature]);

  return (
    <div ref={gridRef} style={{
      display: 'grid', gridTemplateColumns: gridColumns, columnGap: 16, minWidth: 820,
    }}>
      {/* Column header row */}
      <div />
      <Eyebrow style={{ paddingBottom: 10 }}>Component</Eyebrow>
      <Eyebrow style={{ paddingBottom: 10, textAlign: 'right' }}>Count</Eyebrow>
      <Eyebrow style={{ paddingBottom: 10, textAlign: 'right' }}>Size</Eyebrow>
      {schedule.options.map((o, i) => (
        <OptionHeader
          key={o.id}
          index={i}
          option={o}
          canRemove={schedule.options.length > 1}
          editing={editingOptionId === o.id}
          setEditing={(v) => setEditingOptionId(v ? o.id : null)}
          onRename={(name) => renameOption(o.id, name)}
          onDuplicate={() => duplicateOption(o.id)}
          onRemove={() => removeOption(o.id)}
        />
      ))}

      <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--ink)' }} />

      {/* A top-of-document category drop zone (rare, but makes dragging the
          first category above itself a no-op and dragging another above it work). */}
      {grouped.length > 0 && (
        <CategoryDropZone
          zoneKey={'cat-before:' + grouped[0][0]}
          beforeCategory={grouped[0][0]}
          gridColumns={gridColumns}
        />
      )}

      {/* Groups */}
      {grouped.map(([groupName, rows], groupIdx) => (
        <React.Fragment key={groupName + ':' + groupIdx}>
          <CategoryGroup
            groupName={groupName}
            rows={rows}
            allComponents={schedule.components}
            options={schedule.options}
            cells={schedule.cells}
            materials={materials}
            labelTemplates={labelTemplates}
            gridColumns={gridColumns}
            categoryNames={categoryNames}
            justInsertedId={justInsertedId}
            menuForCompId={menuForCompId}
            setMenuForCompId={setMenuForCompId}
            onCompFieldChange={setComp}
            onCompRemove={removeComponent}
            onCompDuplicate={duplicateComponent}
            onCompChangeCategory={changeComponentCategory}
            onCompMoveUp={moveRowUp}
            onCompMoveDown={moveRowDown}
            onCompMoveToEdge={moveRowToCategoryEdge}
            onCellClick={(optionId, componentId) => setPickerFor({ optionId, componentId })}
            cellTotal={cellTotal}
            insertComponentAt={insertComponentAt}
            appendComponentToCategory={appendComponentToCategory}
            renameCategory={renameCategory}
            removeCategory={removeCategory}
            duplicateCategory={duplicateCategory}
            onBlurInsert={onBlurInsert}
          />
          {/* Between-category drop zone (drops a dragged category before the NEXT group) */}
          <CategoryDropZone
            zoneKey={'cat-after:' + groupName}
            beforeCategory={grouped[groupIdx + 1]?.[0] ?? null}
            gridColumns={gridColumns}
          />
        </React.Fragment>
      ))}

      {/* Empty state */}
      {grouped.length === 0 && (
        <div style={{
          gridColumn: '1 / -1', padding: '56px 0', textAlign: 'center',
          borderBottom: '1px solid var(--rule)',
        }}>
          <Mono size={11} color="var(--ink-4)" style={{ display: 'block', marginBottom: 10 }}>
            No components yet
          </Mono>
          <TextButton accent onClick={() => insertComponentAt(0, 'Uncategorised')}>
            ＋ Add first component
          </TextButton>
        </div>
      )}

      {/* Totals */}
      <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--ink)' }} />
      <div />
      <div style={{ ...ui.label, padding: '18px 0' }}>Option Total</div>
      <div />
      <div />
      {schedule.options.map((o, i) => {
        const t = optionTotals[i];
        const isLowest = t > 0 && t === lowest;
        return (
          <div key={o.id} style={{ padding: '18px 0' }}>
            <Mono size={17} color="var(--ink)" style={{ fontWeight: 500 }}>
              {t > 0 ? fmtCurrency(t) : '—'}
            </Mono>
            {t > 0 && (
              <div style={{ marginTop: 4 }}>
                {isLowest ? (
                  <Tag tone="accent">Lowest</Tag>
                ) : (
                  <Mono size={11} color="var(--accent-ink)">+{fmtCurrency(t - lowest)}</Mono>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ───────── Category-reorder drop zone ─────────
// Tall-ish horizontal slot that sits between two category groups.

function CategoryDropZone({ zoneKey, beforeCategory, gridColumns }) {
  return (
    <DropZone
      zoneKey={zoneKey}
      kind="category"
      data={{ kind: 'cat-between', beforeCategory }}
      gridColumns={gridColumns}
    />
  );
}

// ───────── Category group ─────────

function CategoryGroup({
  groupName, rows, allComponents, options, cells, materials, labelTemplates,
  gridColumns, categoryNames,
  justInsertedId, menuForCompId, setMenuForCompId,
  onCompFieldChange, onCompRemove, onCompDuplicate, onCompChangeCategory,
  onCompMoveUp, onCompMoveDown, onCompMoveToEdge,
  onCellClick, cellTotal,
  insertComponentAt, appendComponentToCategory, renameCategory, removeCategory, duplicateCategory, onBlurInsert,
}) {
  const [renamingCategory, setRenamingCategory] = React.useState(false);
  const [catHover, setCatHover] = React.useState(false);
  const [catMenuOpen, setCatMenuOpen] = React.useState(false);

  const dnd = useDnD();
  const catDragging = dnd?.drag?.kind === 'category' && dnd.drag.id === groupName;

  // First & last global indices for this group — used for insertion points.
  const firstGlobalIdx = rows[0]?.globalIndex ?? 0;

  return (
    <>
      {/* Category header */}
      <div
        data-dnd-cat
        data-flip-key={'cat:' + groupName}
        onMouseEnter={() => setCatHover(true)}
        onMouseLeave={() => setCatHover(false)}
        style={{
          gridColumn: '1 / -1',
          padding: '22px 0 8px',
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          borderBottom: '1px dotted var(--rule-2)',
          gap: 16,
          opacity: catDragging ? 0.35 : 1,
          transition: 'opacity 0.12s',
        }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flex: 1, minWidth: 0 }}>
          {/* Category drag grip — fades in on header hover */}
          <div style={{
            display: 'inline-flex', alignSelf: 'center',
            opacity: catHover ? 1 : 0,
            transition: 'opacity 0.12s',
            marginLeft: -2, marginRight: 2,
          }}>
            <DragGrip kind="category" id={groupName}
              label={groupName}
              title="Drag to reorder category" />
          </div>
          {renamingCategory ? (
            <input autoFocus defaultValue={groupName}
              onBlur={e => { renameCategory(groupName, e.target.value); setRenamingCategory(false); }}
              onKeyDown={e => {
                if (e.key === 'Enter') { renameCategory(groupName, e.target.value); setRenamingCategory(false); }
                if (e.key === 'Escape') setRenamingCategory(false);
              }}
              style={{
                ...ui.serif, fontSize: 20, fontStyle: 'italic',
                background: 'transparent', border: 'none',
                borderBottom: '1px solid var(--ink)', outline: 'none',
                flex: 1, padding: '2px 0', color: 'var(--ink)',
              }} />
          ) : (
            <Serif size={20}
              onClick={() => setRenamingCategory(true)}
              style={{
                fontStyle: 'italic', cursor: 'text',
                borderBottom: '1px dotted ' + (catHover ? 'var(--ink-4)' : 'transparent'),
                paddingBottom: 1,
              }}>{groupName}</Serif>
          )}
          <Mono size={10} color="var(--ink-4)">{rows.length} {rows.length === 1 ? 'row' : 'rows'}</Mono>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, position: 'relative' }}>
          <TextButton onClick={() => appendComponentToCategory(groupName)}>
            ＋ Add component
          </TextButton>
          <button type="button"
            onClick={(e) => { e.stopPropagation(); setCatMenuOpen(v => !v); }}
            title="Category actions"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
              fontFamily: "'Inter Tight', sans-serif", fontSize: 16,
              color: 'var(--ink-3)',
              opacity: catHover || catMenuOpen ? 1 : 0,
              transition: 'opacity 0.12s', lineHeight: 1,
              alignSelf: 'center',
            }}>⋯</button>
          {catMenuOpen && (
            <CategoryMenu
              onClose={() => setCatMenuOpen(false)}
              onRename={() => { setCatMenuOpen(false); setRenamingCategory(true); }}
              onDuplicate={() => { setCatMenuOpen(false); duplicateCategory && duplicateCategory(groupName); }}
              onRemove={() => { setCatMenuOpen(false); removeCategory && removeCategory(groupName); }}
            />
          )}
        </div>
      </div>

      {/* Insert + row-drop zone ABOVE first row of this group */}
      <CombinedInsertZone
        insertOnClick={() => insertComponentAt(firstGlobalIdx, groupName)}
        zoneKey={'row-before:' + groupName + ':' + firstGlobalIdx}
        dropData={{ category: groupName, beforeIndex: firstGlobalIdx }}
        gridColumns={gridColumns}
      />

      {/* Rows, each followed by its own "between this and next" zone */}
      {rows.map(({ component, globalIndex }, rowIdx) => (
        <React.Fragment key={component.id}>
          <ComponentRow
            component={component}
            globalIndex={globalIndex}
            rowIdx={rowIdx}
            options={options}
            cells={cells}
            materials={materials}
            labelTemplates={labelTemplates}
            gridColumns={gridColumns}
            categoryNames={categoryNames}
            autoFocus={component.id === justInsertedId}
            onBlurFirstField={onBlurInsert}
            menuOpen={menuForCompId === component.id}
            openMenu={() => setMenuForCompId(menuForCompId === component.id ? null : component.id)}
            closeMenu={() => setMenuForCompId(null)}
            onFieldChange={(field, v) => onCompFieldChange(component.id, field, v)}
            onRemove={() => onCompRemove(component.id)}
            onDuplicate={() => onCompDuplicate(component.id)}
            onChangeCategory={(cat) => onCompChangeCategory(component.id, cat)}
            onMoveUp={() => onCompMoveUp(component.id)}
            onMoveDown={() => onCompMoveDown(component.id)}
            onMoveToEdge={(edge) => onCompMoveToEdge(component.id, edge)}
            onCellClick={(optionId) => onCellClick(optionId, component.id)}
            cellTotal={cellTotal}
          />
          <CombinedInsertZone
            insertOnClick={() => insertComponentAt(globalIndex + 1, groupName)}
            zoneKey={'row-after:' + component.id}
            dropData={{ category: groupName, beforeIndex: globalIndex + 1 }}
            gridColumns={gridColumns}
          />
        </React.Fragment>
      ))}
    </>
  );
}

// ───────── CombinedInsertZone ─────────
// Thin zone that's BOTH an insert-row hover (with + icon) AND a DnD drop
// target for the row being dragged. When no drag is active, shows the
// traditional + / hairline; during a row drag, shows a highlight line.

function CombinedInsertZone({ insertOnClick, zoneKey, dropData, gridColumns }) {
  const dnd = useDnD();
  const isDragging = !!dnd?.drag;
  if (isDragging && dnd.drag.kind === 'row') {
    return (
      <DropZone zoneKey={zoneKey} kind="row" data={dropData} gridColumns={gridColumns} />
    );
  }
  return <InsertLane onInsert={insertOnClick} gridColumns={gridColumns} />;
}

// ───────── Insert lane ─────────
// The thin hover region between rows. A + icon fades in on the left gutter;
// a hairline underline fades in across the row width.

function InsertLane({ onInsert, gridColumns }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onInsert}
      style={{
        gridColumn: '1 / -1',
        display: 'grid',
        gridTemplateColumns: gridColumns,
        columnGap: 16,
        height: 10,
        marginTop: -5, marginBottom: -5,
        cursor: 'pointer',
        position: 'relative',
        zIndex: 2,
      }}
      title="Insert component"
    >
      {/* Left gutter: + icon */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
        paddingLeft: 6,
      }}>
        <span style={{
          width: 18, height: 18, borderRadius: 9,
          background: hov ? 'var(--accent)' : 'transparent',
          color: hov ? 'var(--paper)' : 'transparent',
          border: '1px solid ' + (hov ? 'var(--accent)' : 'transparent'),
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 13, fontWeight: 500, lineHeight: 1,
          transition: 'all 0.12s ease',
        }}>＋</span>
      </div>
      {/* Hairline spanning the remaining columns */}
      <div style={{
        gridColumn: '2 / -1',
        alignSelf: 'center',
        height: 1,
        background: hov ? 'var(--accent)' : 'transparent',
        transition: 'background 0.12s ease',
      }} />
    </div>
  );
}

// ───────── Component row ─────────

function ComponentRow({
  component, globalIndex, rowIdx, options, cells, materials, labelTemplates,
  gridColumns, categoryNames,
  autoFocus, onBlurFirstField,
  menuOpen, openMenu, closeMenu,
  onFieldChange, onRemove, onDuplicate, onChangeCategory,
  onMoveUp, onMoveDown, onMoveToEdge,
  onCellClick, cellTotal,
}) {
  const c = component;
  const [hov, setHov] = React.useState(false);
  const dnd = useDnD();
  const rowDragging = dnd?.drag?.kind === 'row' && dnd.drag.id === c.id;

  // Live-shift preview: while another row is being dragged, rows between
  // its origin and the current drop target slide out of the way.
  let shiftY = 0;
  if (dnd?.drag?.kind === 'row' && dnd.drag.id !== c.id && dnd.drag.over
      && typeof dnd.drag.extras?.originalIndex === 'number') {
    const fromIdx = dnd.drag.extras.originalIndex;
    const toIdx = dnd.drag.over.beforeIndex;
    const myIdx = globalIndex;
    const h = dnd.drag.rowHeight || 44;
    if (typeof toIdx === 'number') {
      if (fromIdx < toIdx) {
        // Moving down: rows (fromIdx .. toIdx-1) shift UP by h
        if (myIdx > fromIdx && myIdx < toIdx) shiftY = -h;
      } else if (fromIdx > toIdx) {
        // Moving up: rows (toIdx .. fromIdx-1) shift DOWN by h
        if (myIdx >= toIdx && myIdx < fromIdx) shiftY = h;
      }
    }
  }

  const nameRef = React.useRef(null);
  React.useEffect(() => {
    if (autoFocus && nameRef.current) {
      nameRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div
      data-dnd-row
      data-flip-key={'row:' + c.id}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        gridColumn: '1 / -1',
        display: 'grid',
        gridTemplateColumns: gridColumns,
        columnGap: 16,
        padding: 'var(--row-pad) 0',
        borderBottom: '1px solid var(--rule)',
        background: hov ? 'var(--tint)' : 'transparent',
        alignItems: 'center',
        position: 'relative',
        opacity: rowDragging ? 0.35 : 1,
        transform: shiftY ? `translateY(${shiftY}px)` : 'none',
        transition: shiftY !== 0
          ? 'transform 0.18s cubic-bezier(.2,.8,.2,1), opacity 0.12s'
          : 'transform 0.18s cubic-bezier(.2,.8,.2,1), opacity 0.12s',
        willChange: dnd?.drag ? 'transform' : 'auto',
      }}
    >
      {/* Left gutter: row number / [⋮⋮ grip + ⋯ menu] on hover */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        paddingLeft: 2, paddingRight: 12, position: 'relative',
        cursor: 'default',
      }}>
        <Mono size={10} color="var(--ink-4)" style={{
          minWidth: 20, textAlign: 'left',
          opacity: hov ? 0 : 1, transition: 'opacity 0.12s',
          position: 'absolute', left: 2, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}>{String(rowIdx + 1).padStart(2, '0')}</Mono>

        {/* Drag grip (left) */}
        <div style={{
          opacity: hov || menuOpen || rowDragging ? 1 : 0,
          transition: 'opacity 0.12s',
          marginLeft: -2,
        }}>
          <DragGrip kind="row" id={c.id}
            label={c.name || '(untitled)'}
            extras={{ originalIndex: globalIndex }}
            title="Drag to reorder" />
        </div>

        {/* Menu button (right of grip) */}
        <button type="button"
          onClick={(e) => { e.stopPropagation(); openMenu(); }}
          title="Row actions"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px',
            fontFamily: "'Inter Tight', sans-serif", fontSize: 14,
            color: 'var(--ink-3)',
            opacity: hov || menuOpen ? 1 : 0,
            transition: 'opacity 0.12s', lineHeight: 1,
          }}>⋯</button>

        {menuOpen && (
          <RowMenu
            component={c}
            categoryNames={categoryNames}
            onClose={closeMenu}
            onDuplicate={() => { onDuplicate(); closeMenu(); }}
            onRemove={() => { onRemove(); closeMenu(); }}
            onChangeCategory={(cat) => { onChangeCategory(cat); closeMenu(); }}
            onMoveUp={() => { onMoveUp(); closeMenu(); }}
            onMoveDown={() => { onMoveDown(); closeMenu(); }}
            onMoveToEdge={(edge) => { onMoveToEdge(edge); closeMenu(); }}
          />
        )}
      </div>

      {/* Component name */}
      <div>
        <input ref={nameRef}
          value={c.name}
          onChange={e => onFieldChange('name', e.target.value)}
          onBlur={onBlurFirstField}
          placeholder="Component name"
          style={{
            background: 'transparent', border: 'none',
            fontFamily: "'Newsreader', serif", fontSize: 15,
            padding: '2px 0', outline: 'none', width: '100%',
            borderBottom: '1px dotted transparent',
            color: 'var(--ink)',
          }}
          onFocus={e => e.target.style.borderBottomColor = 'var(--ink)'}
          onBlurCapture={e => e.target.style.borderBottomColor = 'transparent'}
        />
      </div>

      {/* Count (optional) */}
      <CountField
        value={c.count}
        onChange={(v) => onFieldChange('count', v)}
      />

      {/* Size + unit */}
      <SizeField
        count={c.count}
        value={c.size}
        unit={c.unit}
        onValueChange={(v) => onFieldChange('size', v)}
        onUnitChange={(u) => onFieldChange('unit', u)}
      />

      {/* Option cells */}
      {options.map(o => {
        const cell = cells[o.id + ':' + c.id];
        const m = cell?.materialId ? materials.find(x => x.id === cell.materialId) : null;
        const total = cellTotal(o.id, c);
        const ScheduleCell = window.ScheduleCell;
        return (
          <ScheduleCell
            key={o.id}
            material={m}
            labelTemplates={labelTemplates}
            total={total}
            onClick={() => onCellClick(o.id)}
          />
        );
      })}
    </div>
  );
}

// ───────── Count & Size fields ─────────

function CountField({ value, onChange }) {
  const has = value != null && value !== '';
  const num = has ? parseFloat(String(value).replace(',', '.')) : null;
  const invalid = has && !Number.isFinite(num);
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6,
    }}>
      <input
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder="—"
        title="Optional — number of items. Blank means 1."
        style={{
          background: 'transparent', border: 'none',
          borderBottom: '1px dotted ' + (invalid ? 'var(--accent)' : 'var(--rule-2)'),
          fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
          textAlign: 'right', width: '100%', outline: 'none',
          color: invalid ? 'var(--accent-ink)' : (has ? 'var(--ink)' : 'var(--ink-4)'),
          padding: '2px 0',
        }}
        onFocus={e => !invalid && (e.target.style.borderBottomColor = 'var(--ink)')}
        onBlur={e => e.target.style.borderBottomColor = invalid ? 'var(--accent)' : 'var(--rule-2)'}
      />
      <Mono size={11} color="var(--ink-4)" style={{
        opacity: has ? 1 : 0,
        transition: 'opacity 0.12s',
        minWidth: 8, textAlign: 'center',
      }}>×</Mono>
    </div>
  );
}

function SizeField({ count, value, unit, onValueChange, onUnitChange }) {
  const has = value != null && value !== '';
  const num = has ? parseFloat(String(value).replace(',', '.')) : null;
  const invalid = has && !Number.isFinite(num);

  // Readout: only meaningful when both Count and Size are filled and valid.
  // (Size alone needs no readout — it IS the total.)
  const countRaw = count;
  const hasCount = countRaw != null && countRaw !== '';
  const countNum = hasCount ? parseFloat(String(countRaw).replace(',', '.')) : null;
  const canTotal = hasCount && Number.isFinite(countNum) && !invalid && Number.isFinite(num);
  const total = canTotal ? countNum * num : null;
  const totalStr = total !== null
    ? total.toLocaleString(undefined, { maximumFractionDigits: 3 })
    : '';

  return (
    // position: relative so the readout can hang below without
    // changing the cell's intrinsic height (row alignment stays clean).
    <div style={{
      position: 'relative',
      display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6,
    }}>
      <input
        value={value ?? ''}
        onChange={e => onValueChange(e.target.value)}
        placeholder="—"
        title="Size — numeric only"
        style={{
          background: 'transparent', border: 'none',
          borderBottom: '1px dotted ' + (invalid ? 'var(--accent)' : 'var(--rule-2)'),
          fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
          textAlign: 'right', flex: 1, minWidth: 0, outline: 'none',
          color: invalid ? 'var(--accent-ink)' : 'var(--ink)',
          padding: '2px 0',
        }}
        onFocus={e => !invalid && (e.target.style.borderBottomColor = 'var(--ink)')}
        onBlur={e => e.target.style.borderBottomColor = invalid ? 'var(--accent)' : 'var(--rule-2)'}
      />
      <select value={unit} onChange={e => onUnitChange(e.target.value)}
        style={{
          background: 'transparent', border: 'none',
          borderBottom: '1px dotted var(--rule-2)',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          width: 44, outline: 'none',
          color: 'var(--ink-3)', padding: '2px 0', cursor: 'pointer',
        }}>
        {['m²', 'l/m', 'each', 'sheet'].map(u => <option key={u} value={u}>{u}</option>)}
      </select>

      {/* Computed total — absolutely positioned so row alignment is unaffected */}
      <div style={{
        position: 'absolute',
        top: '100%', right: 50,      // clear of the unit dropdown
        marginTop: 1,
        pointerEvents: 'none',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color: 'var(--ink-4)',
        opacity: canTotal ? 1 : 0,
        transition: 'opacity 0.14s ease',
        whiteSpace: 'nowrap',
      }}>
        = {totalStr}
      </div>
    </div>
  );
}

// Shim kept so any external code that referenced CountSizeField doesn't break.
function CountSizeField(props) {
  return (
    <React.Fragment>
      <CountField value={props.count} onChange={props.onCountChange} />
      <SizeField count={props.count} value={props.size} unit={props.unit} onValueChange={props.onSizeChange} onUnitChange={props.onUnitChange} />
    </React.Fragment>
  );
}

// ───────── Row action menu ─────────

function RowMenu({ component, categoryNames, onClose,
  onDuplicate, onRemove, onChangeCategory,
  onMoveUp, onMoveDown, onMoveToEdge }) {
  const ref = React.useRef();
  const [addingCategory, setAddingCategory] = React.useState(false);
  const [newCat, setNewCat] = React.useState('');

  React.useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div ref={ref}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: '100%', left: 0, zIndex: 40, marginTop: 2,
        background: 'var(--paper)',
        border: '1px solid var(--ink)',
        boxShadow: '0 8px 24px rgba(20,20,20,0.14)',
        width: 240, padding: '10px 0',
        textAlign: 'left',
      }}>
      <RowMenuItem onClick={onDuplicate}>Duplicate row</RowMenuItem>
      <div style={{ borderTop: '1px dotted var(--rule-2)', margin: '6px 0' }} />
      <div style={{ padding: '4px 14px 6px' }}>
        <Eyebrow>Move</Eyebrow>
      </div>
      {onMoveUp && <RowMenuItem onClick={onMoveUp}>↑  Move up</RowMenuItem>}
      {onMoveDown && <RowMenuItem onClick={onMoveDown}>↓  Move down</RowMenuItem>}
      {onMoveToEdge && <RowMenuItem onClick={() => onMoveToEdge('top')}>⇞  To top of category</RowMenuItem>}
      {onMoveToEdge && <RowMenuItem onClick={() => onMoveToEdge('bottom')}>⇟  To bottom of category</RowMenuItem>}
      <div style={{ borderTop: '1px dotted var(--rule-2)', margin: '6px 0' }} />
      <div style={{ padding: '4px 14px 6px' }}>
        <Eyebrow>Category</Eyebrow>
      </div>
      <div style={{ maxHeight: 160, overflowY: 'auto' }}>
        {categoryNames.map(cat => (
          <RowMenuItem key={cat}
            onClick={() => onChangeCategory(cat)}
            active={cat === (component.category || 'Uncategorised')}>
            {cat}
          </RowMenuItem>
        ))}
      </div>
      <div style={{ borderTop: '1px dotted var(--rule-2)', margin: '6px 0' }} />
      {addingCategory ? (
        <div style={{ padding: '4px 14px 10px', display: 'flex', gap: 8 }}>
          <input autoFocus value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newCat.trim()) {
                onChangeCategory(newCat.trim()); setAddingCategory(false); setNewCat('');
              }
              if (e.key === 'Escape') { setAddingCategory(false); setNewCat(''); }
            }}
            placeholder="New category…"
            style={{
              flex: 1, background: 'transparent',
              border: 'none', borderBottom: '1px solid var(--ink)',
              fontFamily: "'Newsreader', serif", fontSize: 13, fontStyle: 'italic',
              padding: '2px 0', outline: 'none', color: 'var(--ink)',
            }} />
        </div>
      ) : (
        <RowMenuItem onClick={() => setAddingCategory(true)} accent>＋ New category…</RowMenuItem>
      )}
      <div style={{ borderTop: '1px dotted var(--rule-2)', margin: '6px 0' }} />
      <RowMenuItem onClick={onRemove} danger>Remove row</RowMenuItem>
    </div>
  );
}

// ───────── Category action menu ─────────
// Small dropdown anchored to the ⋯ button on a category header.

function CategoryMenu({ onClose, onRename, onDuplicate, onRemove }) {
  const ref = React.useRef();
  React.useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <div ref={ref}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: '100%', right: 0, zIndex: 40, marginTop: 6,
        background: 'var(--paper)',
        border: '1px solid var(--ink)',
        boxShadow: '0 8px 24px rgba(20,20,20,0.14)',
        width: 200, padding: '10px 0',
        textAlign: 'left',
      }}>
      <RowMenuItem onClick={onRename}>Rename category</RowMenuItem>
      <RowMenuItem onClick={onDuplicate}>Duplicate category</RowMenuItem>
      <div style={{ borderTop: '1px dotted var(--rule-2)', margin: '6px 0' }} />
      <RowMenuItem onClick={onRemove} danger>Delete category</RowMenuItem>
    </div>
  );
}

function RowMenuItem({ children, onClick, active, danger, accent }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: hov ? 'var(--tint)' : (active ? 'var(--paper-2)' : 'transparent'),
        border: 'none', cursor: 'pointer',
        padding: '6px 14px',
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 12,
        color: danger ? 'var(--accent-ink)' : (accent ? 'var(--accent-ink)' : 'var(--ink)'),
        fontWeight: active ? 500 : 400,
      }}>{children}</button>
  );
}

// ───────── Schedule persistence ─────────

function migrateComponents(components) {
  return (components || []).map(c => {
    // Already migrated?
    if (c && ('size' in c || 'count' in c)) return c;
    // Convert legacy qty string → {count, size}
    const { count, size } = parseQtyLegacy(c.qty);
    const { qty, ...rest } = c;
    return { ...rest, count, size };
  });
}

function loadScheduleV2(storageKey, project) {
  try {
    const v = localStorage.getItem(storageKey);
    if (v) {
      const parsed = JSON.parse(v);
      if (parsed?.options && parsed?.components && parsed?.cells) {
        return {
          title: parsed.title || 'Materials Cost Schedule',
          ...parsed,
          components: migrateComponents(parsed.components),
        };
      }
    }
  } catch {}
  if (project.id === 'p-brunswick' && window.brunswickSeed) {
    const seed = window.brunswickSeed();
    return { ...seed, components: migrateComponents(seed.components) };
  }
  return {
    title: 'Materials Cost Schedule',
    options: [{ id: 'o-1', name: 'Option 1' }],
    components: [], cells: {},
  };
}

Object.assign(window, {
  componentQty, parseQtyLegacy, evalFormula,
  CategoryGroup, ScheduleGrid, InsertLane, CombinedInsertZone, CategoryDropZone,
  ComponentRow, CountSizeField, RowMenu, RowMenuItem, CategoryMenu,
  loadScheduleV2,
});
