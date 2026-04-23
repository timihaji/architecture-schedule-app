// ───────── Cost Schedule v2 — Drag & drop + FLIP animation ─────────
//
// Two kinds of draggable item: 'row' (individual component rows) and 'category'
// (a whole category group, incl. header + all its rows). Drops happen onto
// indexed zones that the parent wires up (`between` zones between rows, and
// category-boundary zones between groups).
//
// The system is pointer-based (not HTML5 DnD) so styling, cancel, and nested
// drag areas all behave. FLIP animation runs on every render by measuring
// tagged refs before/after.

const DnDCtx = React.createContext(null);

function DnDProvider({ onMove, children }) {
  // Active drag state. `null` when nothing is being dragged.
  //   { kind: 'row' | 'category', id, pointerX, pointerY, startX, startY,
  //     width, height, label, over: null | {kind, id, position} }
  const [drag, setDrag] = React.useState(null);
  const dragRef = React.useRef(null);
  dragRef.current = drag;

  // All registered drop zones: id → { el, kind, data }
  const zonesRef = React.useRef(new Map());

  // Start a drag from a grip. Captures the pointer, shows a floating ghost,
  // and tracks which zone we're hovering.
  function startDrag(kind, id, pointerEvt, { label, width, rowHeight, extras }) {
    const px = pointerEvt.clientX, py = pointerEvt.clientY;
    setDrag({
      kind, id,
      pointerX: px, pointerY: py,
      startX: px, startY: py,
      width: width || 220,
      rowHeight: rowHeight || 44,
      label: label || '',
      extras: extras || {},
      over: null,
    });
    // Prevent text selection while dragging.
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  }

  // Global move / up listeners while dragging.
  React.useEffect(() => {
    if (!drag) return;
    function onMoveEvt(e) {
      const px = e.clientX, py = e.clientY;
      let over = null;
      zonesRef.current.forEach((z, key) => {
        if (!z.el || z.kind !== drag.kind) return;
        const r = z.el.getBoundingClientRect();
        if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) {
          over = { ...z.data, _zoneKey: key };
        }
      });
      setDrag(d => d ? { ...d, pointerX: px, pointerY: py, over } : d);
    }
    function onUp() {
      const d = dragRef.current;
      if (d && d.over && onMove) {
        onMove(d.kind, d.id, d.over);
      }
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      setDrag(null);
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        setDrag(null);
      }
    }
    window.addEventListener('pointermove', onMoveEvt);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointermove', onMoveEvt);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [drag?.kind, drag?.id]); // eslint-disable-line

  // Zone registration API (called from refs in children).
  function registerZone(key, el, kind, data) {
    if (el) zonesRef.current.set(key, { el, kind, data });
    else zonesRef.current.delete(key);
  }

  const value = { drag, startDrag, registerZone };
  return (
    <DnDCtx.Provider value={value}>
      {children}
      {drag && <DragGhost drag={drag} />}
    </DnDCtx.Provider>
  );
}

function useDnD() {
  const ctx = React.useContext(DnDCtx);
  return ctx;
}

// Floating preview of the dragged item. Follows pointer with a subtle tilt,
// growing shadow on pickup.
function DragGhost({ drag }) {
  const [age, setAge] = React.useState(0);
  React.useEffect(() => {
    const start = Date.now();
    let raf;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / 140);
      setAge(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const dx = drag.pointerX, dy = drag.pointerY;
  // Smooth shadow growth + rotation settle
  const eased = age * age * (3 - 2 * age); // smoothstep
  const shadowBlur = 12 + eased * 24; // 12 → 36
  const shadowY = 6 + eased * 10;      // 6 → 16
  const shadowAlpha = 0.08 + eased * 0.14; // 0.08 → 0.22
  const rot = -1.2;
  const scale = 1 + eased * 0.01;
  return (
    <div style={{
      position: 'fixed', pointerEvents: 'none', zIndex: 9999,
      left: 0, top: 0,
      transform: `translate(${dx + 14}px, ${dy - 14}px) rotate(${rot}deg) scale(${scale})`,
      transformOrigin: '0 50%',
      background: 'var(--paper)',
      border: '1px solid var(--ink)',
      boxShadow: `0 ${shadowY}px ${shadowBlur}px rgba(20,20,20,${shadowAlpha})`,
      padding: '8px 14px',
      fontFamily: "'Newsreader', serif",
      fontSize: 14, fontStyle: drag.kind === 'category' ? 'italic' : 'normal',
      color: 'var(--ink)',
      maxWidth: 300, whiteSpace: 'nowrap',
      overflow: 'hidden', textOverflow: 'ellipsis',
      opacity: 0.6 + eased * 0.38,
      transition: 'opacity 0.06s',
    }}>
      <span style={{
        ...ui.mono, fontSize: 9, color: 'var(--ink-4)',
        letterSpacing: '0.14em', textTransform: 'uppercase',
        marginRight: 8,
      }}>{drag.kind === 'category' ? 'Group' : 'Row'}</span>
      {drag.label || '(untitled)'}
    </div>
  );
}

// ───────── DragGrip — the ⋮⋮ handle ─────────

function DragGrip({ kind, id, label, title, onPointerDown, disabled, extras }) {
  const { startDrag } = useDnD();
  function handle(e) {
    if (disabled) return;
    if (e.button !== 0) return;
    // Capture the row's width so the ghost can size itself,
    // and its height for the live-shift preview.
    const row = e.currentTarget.closest('[data-dnd-row],[data-dnd-cat]');
    const rect = row ? row.getBoundingClientRect() : null;
    const w = rect ? rect.width : 220;
    const h = rect ? rect.height : 44;
    e.preventDefault();
    e.stopPropagation();
    startDrag(kind, id, e, { label, width: w, rowHeight: h, extras });
    onPointerDown && onPointerDown(e);
  }
  return (
    <button type="button"
      onPointerDown={handle}
      title={title || 'Drag to reorder'}
      aria-label={title || 'Drag to reorder'}
      style={{
        background: 'none', border: 'none',
        cursor: disabled ? 'not-allowed' : 'grab',
        padding: '8px 10px',
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 14, lineHeight: 1,
        color: 'var(--ink-4)',
        opacity: disabled ? 0.3 : 1,
        touchAction: 'none',
        display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        userSelect: 'none',
      }}>
      <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true"
        style={{ display: 'block', pointerEvents: 'none', cursor: 'inherit' }}>
        <circle cx="3" cy="4" r="1.4" fill="currentColor" />
        <circle cx="3" cy="8" r="1.4" fill="currentColor" />
        <circle cx="3" cy="12" r="1.4" fill="currentColor" />
        <circle cx="9" cy="4" r="1.4" fill="currentColor" />
        <circle cx="9" cy="8" r="1.4" fill="currentColor" />
        <circle cx="9" cy="12" r="1.4" fill="currentColor" />
      </svg>
    </button>
  );
}

// ───────── DropZone — a registered + highlight-able drop target ─────────

function DropZone({ zoneKey, kind, data, gridColumns, children }) {
  const { drag, registerZone } = useDnD();
  const ref = React.useRef(null);
  React.useEffect(() => {
    registerZone(zoneKey, ref.current, kind, data);
    return () => registerZone(zoneKey, null, kind, data);
  }, [zoneKey, kind, JSON.stringify(data)]); // eslint-disable-line

  const dragMatches = drag && drag.kind === kind;
  const active = dragMatches && drag.over?._zoneKey === zoneKey;
  const armed = dragMatches && !active; // eligible but not hovered

  return (
    <div ref={ref}
      style={{
        gridColumn: '1 / -1',
        display: 'grid',
        gridTemplateColumns: gridColumns,
        columnGap: 16,
        height: active ? 14 : 10,
        marginTop: active ? -7 : -5,
        marginBottom: active ? -7 : -5,
        position: 'relative',
        zIndex: drag ? 3 : 2,
        transition: 'height 0.08s ease, margin 0.08s ease',
      }}>
      {/* Left gutter: small dot */}
      <div style={{
        display: 'flex', alignItems: 'center', paddingLeft: 6,
      }}>
        <span style={{
          width: active ? 10 : 8, height: active ? 10 : 8,
          borderRadius: 5,
          background: active ? 'var(--accent)' : (armed ? 'var(--rule-2)' : 'transparent'),
          transition: 'background 0.08s ease, width 0.08s ease, height 0.08s ease',
        }} />
      </div>
      {/* Hairline */}
      <div style={{
        gridColumn: '2 / -1',
        alignSelf: 'center',
        height: active ? 2 : 1,
        background: active
          ? 'var(--accent)'
          : (armed ? 'var(--rule-2)' : 'transparent'),
        opacity: active ? 1 : (armed ? 0.7 : 0),
        transition: 'background 0.08s ease, height 0.08s ease, opacity 0.12s ease',
      }} />
      {children}
    </div>
  );
}

// ───────── FLIP animation on list changes ─────────
// Pass a root element and a dependency (e.g. schedule.components). On each
// change, measures all `[data-flip-key]` elements' rects before/after,
// then animates deltas with transform. No layout thrashing — single rAF pass.

function useFlipAnimation(rootRef, deps) {
  const prevRects = React.useRef(new Map());

  // Capture BEFORE the DOM updates (sync, during commit).
  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const next = new Map();
    root.querySelectorAll('[data-flip-key]').forEach(el => {
      const k = el.getAttribute('data-flip-key');
      next.set(k, el.getBoundingClientRect());
    });
    // After commit, compute deltas from prevRects → next and animate.
    const anim = requestAnimationFrame(() => {
      const now = new Map();
      root.querySelectorAll('[data-flip-key]').forEach(el => {
        const k = el.getAttribute('data-flip-key');
        now.set(k, el.getBoundingClientRect());
      });
      now.forEach((r2, k) => {
        const r1 = prevRects.current.get(k);
        if (!r1) return;
        const dy = r1.top - r2.top;
        if (Math.abs(dy) < 1) return;
        const el = root.querySelector(`[data-flip-key="${CSS.escape(k)}"]`);
        if (!el) return;
        el.style.transition = 'none';
        el.style.transform = `translateY(${dy}px)`;
        // Next frame: clear transform so it animates to 0.
        requestAnimationFrame(() => {
          el.style.transition = 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)';
          el.style.transform = '';
          // Clean up after animation finishes.
          setTimeout(() => {
            if (el.style.transform === '') el.style.transition = '';
          }, 240);
        });
      });
      prevRects.current = now;
    });
    return () => cancelAnimationFrame(anim);
    // eslint-disable-next-line
  }, deps);

  // On first mount, capture rects once so next change has a baseline.
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const m = new Map();
    root.querySelectorAll('[data-flip-key]').forEach(el => {
      m.set(el.getAttribute('data-flip-key'), el.getBoundingClientRect());
    });
    prevRects.current = m;
    // eslint-disable-next-line
  }, []);
}

Object.assign(window, {
  DnDProvider, useDnD, DragGrip, DropZone, useFlipAnimation,
});
