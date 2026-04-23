import React, { useEffect, useReducer, useRef, useState } from 'react'
import { EditCell, TH, TD, UnitSelect } from './costTableCells.jsx'
import {
  STORAGE_KEY,
  calcTotal,
  createId,
  effectiveQuantity,
  fmtCurrency,
  fmtNum,
  historyReducer,
  loadDocument,
  moveByDirection,
  moveItem,
  sumQty,
} from './costTableModel.js'

function CostTable() {
  const [historyState, dispatch] = useReducer(historyReducer, {
    past: [],
    present: loadDocument(),
    future: [],
  })
  const [editingTitle, setEditingTitle] = useState(false)
  const [newComponentName, setNewComponentName] = useState('')
  const [draggedComponentId, setDraggedComponentId] = useState(null)
  const [dropComponentId, setDropComponentId] = useState(null)
  const titleRef = useRef()

  const document = historyState.present
  const { title, options, components, sharedQty, unitCosts } = document

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus()
      titleRef.current.select()
    }
  }, [editingTitle])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(document))
    } catch {
      // Keep the UI usable even if storage is unavailable.
    }
  }, [document])

  function mutate(updater) {
    dispatch({ type: 'mutate', updater })
  }

  function setTitleValue(value) {
    mutate((current) => ({ ...current, title: value }))
  }

  function setUnit(componentId, value) {
    mutate((current) => ({
      ...current,
      sharedQty: {
        ...current.sharedQty,
        [componentId]: { ...current.sharedQty[componentId], unit: value },
      },
    }))
  }

  function setSubField(componentId, subId, field, value) {
    mutate((current) => ({
      ...current,
      sharedQty: {
        ...current.sharedQty,
        [componentId]: {
          ...current.sharedQty[componentId],
          subs: current.sharedQty[componentId].subs.map((sub) =>
            sub.id === subId ? { ...sub, [field]: value } : sub,
          ),
        },
      },
    }))
  }

  function addSub(componentId) {
    mutate((current) => ({
      ...current,
      sharedQty: {
        ...current.sharedQty,
        [componentId]: {
          ...current.sharedQty[componentId],
          subs: [
            ...current.sharedQty[componentId].subs,
            {
              id: createId('sub'),
              label: '',
              elementValue: '',
              quantity: '',
            },
          ],
        },
      },
    }))
  }

  function removeSub(componentId, subId) {
    mutate((current) => ({
      ...current,
      sharedQty: {
        ...current.sharedQty,
        [componentId]: {
          ...current.sharedQty[componentId],
          subs: current.sharedQty[componentId].subs.filter((sub) => sub.id !== subId),
        },
      },
    }))
  }

  function setCost(optionId, componentId, value) {
    mutate((current) => ({
      ...current,
      unitCosts: {
        ...current.unitCosts,
        [optionId]: {
          ...current.unitCosts[optionId],
          [componentId]: value,
        },
      },
    }))
  }

  function addComponent() {
    const name = newComponentName.trim()
    if (!name) {
      return
    }

    mutate((current) => {
      const newComponent = {
        id: createId('comp'),
        name,
      }

      const nextUnitCosts = {}
      current.options.forEach((option) => {
        nextUnitCosts[option.id] = {
          ...current.unitCosts[option.id],
          [newComponent.id]: '',
        }
      })

      return {
        ...current,
        components: [...current.components, newComponent],
        sharedQty: {
          ...current.sharedQty,
          [newComponent.id]: { unit: '', subs: [] },
        },
        unitCosts: {
          ...current.unitCosts,
          ...nextUnitCosts,
        },
      }
    })

    setNewComponentName('')
  }

  function removeComponent(componentId) {
    mutate((current) => {
      const nextComponents = current.components.filter(
        (component) => component.id !== componentId,
      )

      const { [componentId]: removedSharedQty, ...remainingSharedQty } = current.sharedQty
      const nextUnitCosts = {}

      current.options.forEach((option) => {
        const { [componentId]: removedCost, ...remainingCosts } = current.unitCosts[option.id]
        nextUnitCosts[option.id] = remainingCosts
      })

      return {
        ...current,
        components: nextComponents,
        sharedQty: remainingSharedQty,
        unitCosts: nextUnitCosts,
      }
    })
  }

  function reorderComponents(activeId, targetId) {
    mutate((current) => ({
      ...current,
      components: moveItem(current.components, activeId, targetId),
    }))
  }

  function moveOption(optionId, direction) {
    mutate((current) => ({
      ...current,
      options: moveByDirection(current.options, optionId, direction),
    }))
  }

  function optionTotal(optionId) {
    return components.reduce((sum, component) => {
      const total = calcTotal(
        sumQty(sharedQty[component.id]?.subs ?? []),
        unitCosts[optionId]?.[component.id] ?? '',
      )

      return total !== null ? sum + total : sum
    }, 0)
  }

  function hasData(optionId) {
    return components.some((component) => unitCosts[optionId]?.[component.id])
  }

  const totals = options.map((option) => optionTotal(option.id))
  const anyData = options.some((option) => hasData(option.id))

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f4f0',
        fontFamily: "'EB Garamond', Georgia, serif",
        color: '#1a1a1a',
        padding: '52px 44px',
        maxWidth: 980,
        margin: '0 auto',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Lato:wght@300;400&display=swap');
        * { box-sizing: border-box; }
        .asb { background: none; border: none; cursor: pointer; padding: 0; font-family: 'Lato', sans-serif; font-weight: 300; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #bbb; transition: color 0.15s; }
        .asb:hover { color: #555; }
        .dsb { background: none; border: none; cursor: pointer; padding: 0 0 0 6px; font-size: 11px; color: transparent; transition: color 0.15s; }
        tr:hover .dsb { color: #ccc; }
        .dsb:hover { color: #b85c3a !important; }
        .mini-btn { background: none; border: 1px solid #d4d1c8; color: #777; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; padding: 5px 8px; }
        .mini-btn:disabled { opacity: 0.35; cursor: default; }
        .icon-btn { background: none; border: none; color: #999; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; padding: 0; }
        .icon-btn:hover { color: #444; }
        .danger-btn:hover { color: #b85c3a; }
        .option-arrow { background: none; border: none; color: #999; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; padding: 0 4px; }
        .option-arrow:disabled { opacity: 0.25; cursor: default; }
        .drag-handle { color: #b6b0a0; font-family: 'Lato', sans-serif; font-size: 10px; letter-spacing: 0.1em; margin-right: 10px; cursor: grab; user-select: none; }
      `}</style>

      <div style={{ marginBottom: 44 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            {editingTitle ? (
              <input
                ref={titleRef}
                value={title}
                onChange={(event) => setTitleValue(event.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === 'Escape') {
                    setEditingTitle(false)
                  }
                }}
                style={{
                  fontSize: 22,
                  fontFamily: "'EB Garamond', Georgia, serif",
                  fontWeight: 400,
                  letterSpacing: '0.04em',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #1a1a1a',
                  outline: 'none',
                  color: '#1a1a1a',
                  width: '100%',
                }}
              />
            ) : (
              <h1
                onClick={() => setEditingTitle(true)}
                style={{
                  fontSize: 22,
                  fontWeight: 400,
                  letterSpacing: '0.04em',
                  margin: 0,
                  cursor: 'text',
                }}
              >
                {title}
              </h1>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="mini-btn"
              onClick={() => dispatch({ type: 'undo' })}
              disabled={historyState.past.length === 0}
            >
              Undo
            </button>
            <button
              className="mini-btn"
              onClick={() => dispatch({ type: 'redo' })}
              disabled={historyState.future.length === 0}
            >
              Redo
            </button>
          </div>
        </div>

        <div style={{ marginTop: 8, height: 1, background: '#1a1a1a' }} />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          alignItems: 'end',
          marginBottom: 26,
          flexWrap: 'wrap',
        }}
      >
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 300,
            fontSize: 11,
            letterSpacing: '0.08em',
            color: '#999',
            margin: 0,
            fontStyle: 'italic',
          }}
        >
          Quantities and units are shared across all options. Drag component rows
          to reorder them.
        </p>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 300 }}>
          <input
            value={newComponentName}
            onChange={(event) => setNewComponentName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                addComponent()
              }
            }}
            placeholder="Add new component"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid #b9b2a1',
              fontFamily: "'Lato', sans-serif",
              fontSize: 12,
              color: '#1a1a1a',
              padding: '6px 0',
              outline: 'none',
            }}
          />
          <button className="mini-btn" onClick={addComponent}>
            Add Component
          </button>
        </div>
      </div>

      {options.map((option, optionIndex) => (
        <div key={option.id} style={{ marginBottom: 52 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
            <span
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: 10,
                letterSpacing: '0.14em',
                color: '#aaa',
                textTransform: 'uppercase',
                minWidth: 22,
              }}
            >
              {String(optionIndex + 1).padStart(2, '0')}
            </span>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 400,
                fontFamily: "'EB Garamond', Georgia, serif",
                margin: 0,
                letterSpacing: '0.02em',
              }}
            >
              {option.name}
            </h2>
            <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
              <button
                className="option-arrow"
                onClick={() => moveOption(option.id, 'up')}
                disabled={optionIndex === 0}
                title="Move option up"
              >
                Up
              </button>
              <button
                className="option-arrow"
                onClick={() => moveOption(option.id, 'down')}
                disabled={optionIndex === options.length - 1}
                title="Move option down"
              >
                Down
              </button>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...TH, textAlign: 'left', width: '29%' }}>Component</th>
                <th
                  style={{
                    ...TH,
                    width: '18%',
                    background: 'rgba(0,0,0,0.015)',
                    textAlign: 'left',
                    paddingLeft: 8,
                  }}
                >
                  Element
                </th>
                <th
                  style={{
                    ...TH,
                    width: '12%',
                    background: 'rgba(0,0,0,0.015)',
                  }}
                >
                  Value
                </th>
                <th
                  style={{
                    ...TH,
                    width: '10%',
                    background: 'rgba(0,0,0,0.015)',
                  }}
                >
                  Qty
                </th>
                <th
                  style={{
                    ...TH,
                    width: '8%',
                    textAlign: 'left',
                    paddingLeft: 8,
                    background: 'rgba(0,0,0,0.015)',
                  }}
                >
                  Unit
                </th>
                <th style={{ ...TH, width: '11%' }}>Unit Cost</th>
                <th style={{ ...TH, width: '10%' }}>Total</th>
                <th style={{ width: 36 }} />
              </tr>
            </thead>

            <tbody>
              {components.map((component) => {
                const componentState = sharedQty[component.id] ?? { unit: '', subs: [] }
                const unit = componentState.unit
                const subs = componentState.subs
                const totalQty = sumQty(subs)
                const unitCost = unitCosts[option.id]?.[component.id] ?? ''
                const total = calcTotal(totalQty, unitCost)
                const hasSubs = subs.length > 0

                return (
                  <React.Fragment key={component.id}>
                    <tr
                      style={{
                        borderTop: '1px solid #e0e0db',
                        background:
                          dropComponentId === component.id && draggedComponentId !== component.id
                            ? 'rgba(0,0,0,0.03)'
                            : 'transparent',
                      }}
                      draggable
                      onDragStart={() => {
                        setDraggedComponentId(component.id)
                        setDropComponentId(component.id)
                      }}
                      onDragOver={(event) => {
                        event.preventDefault()
                        setDropComponentId(component.id)
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        if (draggedComponentId) {
                          reorderComponents(draggedComponentId, component.id)
                        }
                        setDraggedComponentId(null)
                        setDropComponentId(null)
                      }}
                      onDragEnd={() => {
                        setDraggedComponentId(null)
                        setDropComponentId(null)
                      }}
                    >
                      <td
                        style={{
                          ...TD,
                          fontFamily: "'EB Garamond', Georgia, serif",
                          fontSize: 14,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="drag-handle">drag</span>
                            <span>{component.name}</span>
                          </div>
                          <button
                            className="icon-btn danger-btn"
                            onClick={() => removeComponent(component.id)}
                            title="Remove component"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                      <td style={{ ...TD, background: 'rgba(0,0,0,0.02)', paddingLeft: 8 }}>
                        {!hasSubs && (
                          <button className="asb" onClick={() => addSub(component.id)}>
                            + add element
                          </button>
                        )}
                      </td>
                      <td style={{ ...TD, background: 'rgba(0,0,0,0.02)' }} />
                      <td style={{ ...TD, textAlign: 'right', background: 'rgba(0,0,0,0.02)' }}>
                        <span
                          style={{
                            fontFamily: "'Lato', sans-serif",
                            fontWeight: hasSubs ? 400 : 300,
                            fontSize: 13,
                            color: totalQty !== null ? '#333' : '#ccc',
                          }}
                        >
                          {totalQty !== null ? fmtNum(totalQty) : '-'}
                        </span>
                      </td>
                      {optionIndex === 0 ? (
                        <UnitSelect
                          value={unit}
                          onChange={(value) => setUnit(component.id, value)}
                        />
                      ) : (
                        <td
                          style={{
                            ...TD,
                            paddingLeft: 8,
                            background: 'rgba(0,0,0,0.02)',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'Lato', sans-serif",
                              fontWeight: 300,
                              fontSize: 12,
                              color: unit ? '#444' : '#ccc',
                            }}
                          >
                            {unit || '-'}
                          </span>
                        </td>
                      )}
                      <EditCell
                        value={unitCost}
                        onChange={(value) => setCost(option.id, component.id, value)}
                        align="right"
                      />
                      <td style={{ ...TD, textAlign: 'right' }}>
                        <span
                          style={{
                            fontFamily: "'Lato', sans-serif",
                            fontWeight: total !== null ? 400 : 300,
                            fontSize: 13,
                            color: total !== null ? '#1a1a1a' : '#ccc',
                          }}
                        >
                          {total !== null ? fmtCurrency(total) : '-'}
                        </span>
                      </td>
                      <td />
                    </tr>

                    {hasSubs &&
                      subs.map((sub, subIndex) => {
                        const subMeasure = effectiveQuantity(sub)
                        const subTotal = calcTotal(subMeasure, unitCost)

                        return (
                          <tr key={sub.id} style={{ background: 'rgba(0,0,0,0.012)' }}>
                            <td style={{ padding: '5px 0', paddingLeft: 16, verticalAlign: 'middle' }}>
                              <span
                                style={{
                                  fontFamily: "'Lato', sans-serif",
                                  fontWeight: 300,
                                  fontSize: 11,
                                  color: '#bbb',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                {String(subIndex + 1).padStart(2, '0')}
                              </span>
                            </td>
                            <EditCell
                              value={sub.label}
                              onChange={(value) =>
                                setSubField(component.id, sub.id, 'label', value)
                              }
                              align="left"
                              tinted
                              placeholder="element name"
                            />
                            <EditCell
                              value={sub.elementValue}
                              onChange={(value) =>
                                setSubField(component.id, sub.id, 'elementValue', value)
                              }
                              align="right"
                              tinted
                              placeholder="value"
                            />
                            <EditCell
                              value={sub.quantity}
                              onChange={(value) =>
                                setSubField(component.id, sub.id, 'quantity', value)
                              }
                              align="right"
                              tinted
                            />
                            <td
                              style={{
                                padding: '5px 0',
                                paddingLeft: 8,
                                background: 'rgba(0,0,0,0.02)',
                                verticalAlign: 'middle',
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "'Lato', sans-serif",
                                  fontWeight: 300,
                                  fontSize: 11,
                                  color: '#bbb',
                                }}
                              >
                                {unit || '-'}
                              </span>
                            </td>
                            <td style={{ padding: '5px 0' }} />
                            <td style={{ padding: '5px 0', textAlign: 'right', verticalAlign: 'middle' }}>
                              <span
                                style={{
                                  fontFamily: "'Lato', sans-serif",
                                  fontWeight: 300,
                                  fontSize: 11,
                                  color: subTotal !== null ? '#888' : '#ddd',
                                }}
                              >
                                {subTotal !== null ? fmtCurrency(subTotal) : '-'}
                              </span>
                            </td>
                            <td style={{ padding: '5px 0', verticalAlign: 'middle' }}>
                              <button
                                className="dsb"
                                onClick={() => removeSub(component.id, sub.id)}
                              >
                                x
                              </button>
                            </td>
                          </tr>
                        )
                      })}

                    {hasSubs && (
                      <tr>
                        <td colSpan={8} style={{ padding: '4px 0 10px 16px' }}>
                          <button className="asb" onClick={() => addSub(component.id)}>
                            + add element
                          </button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>

            <tfoot>
              <tr>
                <td colSpan={5} style={{ borderTop: '1px solid #ccc', paddingTop: 12 }} />
                <td
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 300,
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#888',
                    textAlign: 'right',
                    paddingTop: 12,
                    borderTop: '1px solid #ccc',
                  }}
                >
                  Option Total
                </td>
                <td
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 400,
                    fontSize: 14,
                    textAlign: 'right',
                    paddingTop: 12,
                    borderTop: '1px solid #ccc',
                  }}
                >
                  {hasData(option.id) ? fmtCurrency(optionTotal(option.id)) : '-'}
                </td>
                <td style={{ borderTop: '1px solid #ccc' }} />
              </tr>
            </tfoot>
          </table>
        </div>
      ))}

      {anyData && (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 1, background: '#1a1a1a', marginBottom: 24 }} />
          <h3
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#888',
              margin: '0 0 18px',
            }}
          >
            Option Comparison
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...TH, textAlign: 'left', width: '38%' }}>Option</th>
                <th style={TH}>Total Cost</th>
                <th style={TH}>vs. Lowest</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const withData = totals.filter((total) => total > 0)
                const lowest = withData.length ? Math.min(...withData) : null

                return options.map((option, optionIndex) => {
                  const total = totals[optionIndex]
                  const diff = lowest !== null && total > 0 ? total - lowest : null
                  const isLowest = diff === 0

                  return (
                    <tr key={option.id} style={{ borderBottom: '1px solid #e8e8e4' }}>
                      <td
                        style={{
                          ...TD,
                          fontFamily: "'EB Garamond', Georgia, serif",
                          fontSize: 14,
                        }}
                      >
                        {option.name}
                        {isLowest && (
                          <span
                            style={{
                              fontFamily: "'Lato', sans-serif",
                              fontSize: 9,
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                              color: '#aaa',
                              marginLeft: 10,
                            }}
                          >
                            lowest
                          </span>
                        )}
                      </td>
                      <td style={{ ...TD, textAlign: 'right' }}>
                        <span
                          style={{
                            fontFamily: "'Lato', sans-serif",
                            fontWeight: 300,
                            fontSize: 13,
                          }}
                        >
                          {total > 0 ? fmtCurrency(total) : '-'}
                        </span>
                      </td>
                      <td style={{ ...TD, textAlign: 'right' }}>
                        <span
                          style={{
                            fontFamily: "'Lato', sans-serif",
                            fontWeight: 300,
                            fontSize: 13,
                            color: diff === null ? '#ccc' : isLowest ? '#aaa' : '#b85c3a',
                          }}
                        >
                          {diff === null ? '-' : isLowest ? '-' : `+${fmtCurrency(diff)}`}
                        </span>
                      </td>
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 48, borderTop: '1px solid #ccc', paddingTop: 14 }}>
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 300,
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#bbb',
            margin: 0,
          }}
        >
          Click any cell to edit - component totals use qty x value when a value is
          entered - drag component rows to reorder - undo and redo are saved in this
          session
        </p>
      </div>
    </div>
  )
}

export default CostTable
