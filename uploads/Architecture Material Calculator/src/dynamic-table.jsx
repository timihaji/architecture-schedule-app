import React, { useState } from 'react'

const COLORS = {
  bg: '#0f1117',
  surface: '#1a1d27',
  border: '#2a2d3a',
  accent: '#e8c84a',
  text: '#e8eaf0',
  textMuted: '#7a7e90',
  danger: '#e84a4a',
}

const FONT = "'DM Mono', 'Fira Mono', 'Courier New', monospace"
const FONT_DISPLAY = "'Syne', 'Space Grotesk', sans-serif"

function parse(value) {
  const number = Number(value)
  return !Number.isNaN(number) && value !== '' ? number : value
}

function DynamicTable() {
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('Paste or type your data below, then click Add.')
  const [editCell, setEditCell] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [newColName, setNewColName] = useState('')
  const [addColOpen, setAddColOpen] = useState(false)

  function flash(message) {
    setStatus(message)
    setTimeout(() => setStatus('Ready. Add more data, edit cells, or manage columns.'), 3000)
  }

  function detectDelimiter(text) {
    const tabs = (text.match(/\t/g) || []).length
    const commas = (text.match(/,/g) || []).length
    const pipes = (text.match(/\|/g) || []).length
    const semicolons = (text.match(/;/g) || []).length

    return [tabs, '\t', commas, ',', pipes, '|', semicolons, ';'].reduce(
      (current, value, index, array) =>
        index % 2 === 0 && value > current[0] ? [value, array[index + 1]] : current,
      [0, ','],
    )[1]
  }

  function handleAdd() {
    const text = input.trim()
    if (!text) {
      return
    }

    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    const delimiter = detectDelimiter(text)
    const parsed = lines.map((line) =>
      line.split(delimiter).map((cell) => cell.trim().replace(/^["']|["']$/g, '')),
    )

    if (columns.length === 0) {
      const headers = parsed[0]
      setColumns(headers)

      const newRows = parsed.slice(1).map((row) => {
        const object = {}
        headers.forEach((header, index) => {
          object[header] = parse(row[index] ?? '')
        })
        return object
      })

      setRows(newRows)
      flash(`Table created: ${headers.length} columns, ${newRows.length} rows.`)
    } else {
      const firstRowMatchesHeaders = parsed[0].some((cell) =>
        columns.map((column) => column.toLowerCase()).includes(cell.toLowerCase()),
      )
      const dataRows = firstRowMatchesHeaders ? parsed.slice(1) : parsed
      const headerMap = firstRowMatchesHeaders
        ? parsed[0].map(
            (cell) => columns.find((column) => column.toLowerCase() === cell.toLowerCase()) ?? cell,
          )
        : columns

      let updatedColumns = [...columns]

      if (firstRowMatchesHeaders) {
        parsed[0].forEach((cell) => {
          if (!updatedColumns.find((column) => column.toLowerCase() === cell.toLowerCase())) {
            updatedColumns.push(cell)
          }
        })
      }

      const newRows = dataRows.map((row) => {
        const object = {}
        updatedColumns.forEach((column) => {
          object[column] = ''
        })
        headerMap.forEach((header, index) => {
          object[header] = parse(row[index] ?? '')
        })
        return object
      })

      setColumns(updatedColumns)
      setRows((previous) =>
        previous
          .map((row) => {
            const updated = { ...row }
            updatedColumns.forEach((column) => {
              if (!(column in updated)) {
                updated[column] = ''
              }
            })
            return updated
          })
          .concat(newRows),
      )
      flash(`Added ${newRows.length} row(s).`)
    }

    setInput('')
  }

  function handleCellClick(rowIndex, column) {
    setEditCell({ row: rowIndex, col: column })
    setEditVal(String(rows[rowIndex][column] ?? ''))
  }

  function handleCellBlur() {
    if (!editCell) {
      return
    }

    setRows((previous) =>
      previous.map((row, index) =>
        index === editCell.row ? { ...row, [editCell.col]: parse(editVal) } : row,
      ),
    )
    setEditCell(null)
  }

  function handleDeleteRow(index) {
    setRows((previous) => previous.filter((_, rowIndex) => rowIndex !== index))
    flash('Row deleted.')
  }

  function handleAddCol() {
    const name = newColName.trim()
    if (!name || columns.includes(name)) {
      return
    }

    setColumns((previous) => [...previous, name])
    setRows((previous) => previous.map((row) => ({ ...row, [name]: '' })))
    setNewColName('')
    setAddColOpen(false)
    flash(`Column "${name}" added.`)
  }

  function handleDeleteCol(column) {
    setColumns((previous) => previous.filter((name) => name !== column))
    setRows((previous) =>
      previous.map((row) => {
        const { [column]: omitted, ...rest } = row
        return rest
      }),
    )
    flash(`Column "${column}" removed.`)
  }

  function handleReset() {
    setColumns([])
    setRows([])
    setInput('')
    setStatus('Table cleared. Paste new data to start fresh.')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLORS.bg,
        fontFamily: FONT,
        color: COLORS.text,
        padding: '32px 24px',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { height: 6px; width: 6px; background: ${COLORS.surface}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
        textarea:focus, input:focus, button:focus { outline: none; }
        .cell-edit { background: transparent; border: none; color: ${COLORS.accent}; font: inherit; width: 100%; padding: 0; }
        .del-col { opacity: 0; transition: opacity 0.15s; cursor: pointer; color: ${COLORS.danger}; font-size: 11px; margin-left: 6px; background: none; border: none; padding: 0; }
        th:hover .del-col { opacity: 1; }
        tr:hover .del-row-btn { opacity: 1 !important; }
      `}</style>

      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 28,
            fontWeight: 800,
            color: COLORS.accent,
            margin: 0,
            letterSpacing: '-0.5px',
          }}
        >
          LIVE TABLE
        </h1>
        <p style={{ color: COLORS.textMuted, fontSize: 13, margin: '6px 0 0' }}>{status}</p>
      </div>

      <div
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.metaKey) {
              handleAdd()
            }
          }}
          placeholder={
            columns.length === 0
              ? 'Paste data here (CSV, TSV, pipe-delimited).\nFirst row = column headers.\n\nExample:\nName, Age, City\nAlice, 30, Brisbane'
              : 'Paste more rows here (with or without a header row)...'
          }
          style={{
            width: '100%',
            minHeight: 90,
            background: 'transparent',
            border: 'none',
            color: COLORS.text,
            fontFamily: FONT,
            fontSize: 13,
            resize: 'vertical',
            lineHeight: 1.6,
          }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <button onClick={handleAdd} style={btnStyle(COLORS.accent, COLORS.bg)}>
            + ADD DATA
          </button>
          {columns.length > 0 && (
            <>
              <button
                onClick={() => setAddColOpen((open) => !open)}
                style={btnStyle(COLORS.border, COLORS.text)}
              >
                + COLUMN
              </button>
              <button onClick={handleReset} style={btnStyle(COLORS.border, COLORS.danger)}>
                RESET
              </button>
            </>
          )}
        </div>
        {addColOpen && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              value={newColName}
              onChange={(event) => setNewColName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleAddCol()
                }
              }}
              placeholder="New column name..."
              style={{
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.text,
                fontFamily: FONT,
                fontSize: 13,
                padding: '6px 10px',
                borderRadius: 4,
                flex: 1,
              }}
            />
            <button onClick={handleAddCol} style={btnStyle(COLORS.accent, COLORS.bg)}>
              ADD
            </button>
          </div>
        )}
      </div>

      {columns.length > 0 ? (
        <div
          style={{
            overflowX: 'auto',
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.surface }}>
                {columns.map((column) => (
                  <th
                    key={column}
                    style={{
                      padding: '11px 14px',
                      textAlign: 'left',
                      color: COLORS.accent,
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      borderBottom: `1px solid ${COLORS.border}`,
                      whiteSpace: 'nowrap',
                      position: 'relative',
                    }}
                  >
                    {column}
                    <button
                      className="del-col"
                      onClick={() => handleDeleteCol(column)}
                      title={`Remove "${column}"`}
                    >
                      x
                    </button>
                  </th>
                ))}
                <th
                  style={{
                    width: 32,
                    borderBottom: `1px solid ${COLORS.border}`,
                    background: COLORS.surface,
                  }}
                />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      color: COLORS.textMuted,
                      fontStyle: 'italic',
                    }}
                  >
                    No rows yet - paste data above to populate the table.
                  </td>
                </tr>
              ) : (
                rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    style={{
                      borderBottom: `1px solid ${COLORS.border}`,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = '#21253388'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {columns.map((column) => (
                      <td
                        key={column}
                        style={{
                          padding: '9px 14px',
                          color:
                            editCell?.row === rowIndex && editCell?.col === column
                              ? COLORS.accent
                              : typeof row[column] === 'number'
                                ? '#a0d4ff'
                                : COLORS.text,
                          cursor: 'text',
                          minWidth: 80,
                        }}
                        onClick={() => handleCellClick(rowIndex, column)}
                      >
                        {editCell?.row === rowIndex && editCell?.col === column ? (
                          <input
                            autoFocus
                            className="cell-edit"
                            value={editVal}
                            onChange={(event) => setEditVal(event.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                handleCellBlur()
                              }
                            }}
                          />
                        ) : (
                          <span>
                            {row[column] === '' || row[column] === undefined ? (
                              <span style={{ color: COLORS.textMuted }}>-</span>
                            ) : (
                              String(row[column])
                            )}
                          </span>
                        )}
                      </td>
                    ))}
                    <td style={{ padding: '9px 8px', textAlign: 'center' }}>
                      <button
                        className="del-row-btn"
                        onClick={() => handleDeleteRow(rowIndex)}
                        style={{
                          opacity: 0,
                          background: 'none',
                          border: 'none',
                          color: COLORS.danger,
                          cursor: 'pointer',
                          fontSize: 13,
                          padding: '2px 4px',
                          transition: 'opacity 0.15s',
                        }}
                        title="Delete row"
                      >
                        x
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div
            style={{
              background: COLORS.surface,
              padding: '8px 14px',
              display: 'flex',
              gap: 16,
              borderTop: `1px solid ${COLORS.border}`,
              fontSize: 11,
              color: COLORS.textMuted,
            }}
          >
            <span>
              {rows.length} row{rows.length !== 1 ? 's' : ''}
            </span>
            <span>
              {columns.length} column{columns.length !== 1 ? 's' : ''}
            </span>
            <span style={{ marginLeft: 'auto' }}>Click any cell to edit - Hover row to delete</span>
          </div>
        </div>
      ) : (
        <div
          style={{
            border: `1px dashed ${COLORS.border}`,
            borderRadius: 8,
            padding: '48px 24px',
            textAlign: 'center',
            color: COLORS.textMuted,
            fontSize: 13,
          }}
        >
          Your table will appear here once you add data.
        </div>
      )}
    </div>
  )
}

export default DynamicTable

function btnStyle(background, color) {
  return {
    background,
    color,
    border: 'none',
    padding: '8px 16px',
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '1px',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  }
}
