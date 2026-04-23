import React, { useEffect, useRef, useState } from 'react'
import { UNIT_OPTIONS } from './costTableModel.js'

export const TH = {
  fontFamily: "'Lato', sans-serif",
  fontWeight: 300,
  fontSize: 10,
  letterSpacing: '0.13em',
  textTransform: 'uppercase',
  color: '#888',
  paddingBottom: 8,
  paddingLeft: 0,
  paddingRight: 0,
  borderBottom: '1px solid #ccc',
  textAlign: 'right',
}

export const TD = {
  padding: '10px 0',
  verticalAlign: 'middle',
}

export function EditCell({
  value,
  onChange,
  align = 'right',
  tinted = false,
  placeholder = '-',
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef()

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus()
      ref.current.select()
    }
  }, [editing])

  const background = tinted ? 'rgba(0,0,0,0.02)' : 'transparent'
  const hoverBackground = tinted ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.025)'

  function open() {
    setDraft(value)
    setEditing(true)
  }

  function commit() {
    setEditing(false)
    onChange(draft)
  }

  return (
    <td
      onClick={() => {
        if (!editing) {
          open()
        }
      }}
      style={{
        padding: '8px 0',
        textAlign: align,
        cursor: 'text',
        background,
        paddingLeft: align === 'left' ? 8 : 0,
        verticalAlign: 'middle',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(event) => {
        if (!editing) {
          event.currentTarget.style.background = hoverBackground
        }
      }}
      onMouseLeave={(event) => {
        if (!editing) {
          event.currentTarget.style.background = background
        }
      }}
    >
      {editing ? (
        <input
          ref={ref}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commit()
            }
            if (event.key === 'Escape') {
              setEditing(false)
            }
          }}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid #1a1a1a',
            fontFamily: "'Lato', sans-serif",
            fontSize: 12,
            fontWeight: 300,
            color: '#1a1a1a',
            padding: 0,
            width: '100%',
            outline: 'none',
            textAlign: align,
          }}
        />
      ) : (
        <span
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 300,
            fontSize: 12,
            color: value ? '#444' : '#ccc',
          }}
        >
          {value || placeholder}
        </span>
      )}
    </td>
  )
}

export function UnitSelect({ value, onChange }) {
  return (
    <td
      style={{
        ...TD,
        paddingLeft: 8,
        background: 'rgba(0,0,0,0.02)',
      }}
    >
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid #1a1a1a',
          fontFamily: "'Lato', sans-serif",
          fontSize: 12,
          fontWeight: 300,
          color: '#1a1a1a',
          padding: '0 0 2px',
          outline: 'none',
        }}
      >
        <option value="">-</option>
        {UNIT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </td>
  )
}
