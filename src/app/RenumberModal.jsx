// RenumberModal — confirms gap-close behaviour after deleting a coded material.
// Extracted from App.jsx in Phase 6.

function RenumberModal({ state, onLeaveGap, onCloseGap, onCancel }) {
  const { toRenumber } = state;
  return (
    <div className="rn-backdrop" onClick={onCancel}>
      <div className="rn-card" onClick={e => e.stopPropagation()}>
        <div className="rn-head">
          <div className="rn-head-title">Close gap?</div>
          <div className="rn-head-sub">
            {toRenumber.length} material{toRenumber.length !== 1 ? 's' : ''} in this series will be renumbered.
            Previously exported PDFs will not update.
          </div>
        </div>
        <div className="rn-list">
          {toRenumber.map(r => (
            <div key={r.id} className="rn-row">
              <span className="rn-row-from">{r.from}</span>
              <span className="rn-row-sep">&rarr;</span>
              <span>{r.to}</span>
            </div>
          ))}
        </div>
        <div className="rn-foot">
          <button className="rn-btn" onClick={onCancel}>Cancel</button>
          <button className="rn-btn" onClick={onLeaveGap}>Leave gap</button>
          <button className="rn-btn-pri" onClick={onCloseGap}>Close gap</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RenumberModal });
