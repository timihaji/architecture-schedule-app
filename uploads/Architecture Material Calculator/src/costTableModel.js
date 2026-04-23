export const STORAGE_KEY = 'architecture-material-calculator-cost-table'
export const UNIT_OPTIONS = ['m2', 'l/m']

const DEFAULT_OPTIONS = [
  { id: 'opt-1', name: 'Melamine-faced MDF' },
  { id: 'opt-2', name: 'Veneer-faced MDF' },
  { id: 'opt-3', name: 'Cedar Castellation' },
  { id: 'opt-4', name: 'Painted VJ MDF' },
]

const DEFAULT_COMPONENTS = [
  { id: 'comp-1', name: 'Base Fronts' },
  { id: 'comp-2', name: 'Base Top' },
  { id: 'comp-3', name: 'Top Sliding Panels' },
  { id: 'comp-4', name: 'Cover Strips' },
  { id: 'comp-5', name: 'Top Sides' },
  { id: 'comp-6', name: 'Top Shelves' },
  { id: 'comp-7', name: 'Top Rear' },
  { id: 'comp-8', name: 'Top Right Shelf Side Panel' },
]

export function createId(prefix) {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function makeInitialDocument() {
  const options = DEFAULT_OPTIONS.map((option) => ({ ...option }))
  const components = DEFAULT_COMPONENTS.map((component) => ({ ...component }))
  const sharedQty = {}
  const unitCosts = {}

  components.forEach((component) => {
    sharedQty[component.id] = { unit: '', subs: [] }
  })

  options.forEach((option) => {
    unitCosts[option.id] = {}
    components.forEach((component) => {
      unitCosts[option.id][component.id] = ''
    })
  })

  return {
    title: 'Materials Cost Schedule',
    options,
    components,
    sharedQty,
    unitCosts,
  }
}

export function normalizeDocument(candidate) {
  const fallback = makeInitialDocument()

  if (!candidate || typeof candidate !== 'object') {
    return fallback
  }

  const options =
    Array.isArray(candidate.options) && candidate.options.length > 0
      ? candidate.options.map((option, index) => normalizeOption(option, index))
      : fallback.options

  const components =
    Array.isArray(candidate.components) && candidate.components.length > 0
      ? candidate.components.map((component, index) =>
          normalizeComponent(component, index),
        )
      : fallback.components

  const sharedQty = {}
  components.forEach((component) => {
    const source =
      candidate.sharedQty?.[component.id] ?? candidate.sharedQty?.[component.name]

    sharedQty[component.id] = {
      unit:
        typeof source?.unit === 'string' && UNIT_OPTIONS.includes(source.unit)
          ? source.unit
          : '',
      subs: Array.isArray(source?.subs)
        ? source.subs.map((sub) => normalizeSub(sub))
        : [],
    }
  })

  const unitCosts = {}
  options.forEach((option) => {
    const optionSource =
      candidate.unitCosts?.[option.id] ?? candidate.unitCosts?.[option.name] ?? {}

    unitCosts[option.id] = {}
    components.forEach((component) => {
      const value = optionSource?.[component.id] ?? optionSource?.[component.name]
      unitCosts[option.id][component.id] = normalizeStringValue(value)
    })
  })

  return {
    title:
      typeof candidate.title === 'string' && candidate.title.trim()
        ? candidate.title
        : fallback.title,
    options,
    components,
    sharedQty,
    unitCosts,
  }
}

export function loadDocument() {
  if (typeof window === 'undefined') {
    return makeInitialDocument()
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      return makeInitialDocument()
    }

    const parsed = JSON.parse(saved)
    if (parsed?.state) {
      return normalizeDocument({ title: parsed.title, ...parsed.state })
    }

    return normalizeDocument(parsed)
  } catch {
    return makeInitialDocument()
  }
}

export function effectiveQuantity(sub) {
  const quantity = parseFloat(sub.quantity)
  const elementValue = parseFloat(sub.elementValue)

  if (Number.isNaN(quantity)) {
    return null
  }

  return Number.isNaN(elementValue) ? quantity : quantity * elementValue
}

export function sumQty(subs) {
  if (!subs?.length) {
    return null
  }

  const values = subs
    .map((sub) => effectiveQuantity(sub))
    .filter((value) => value !== null)

  return values.length ? values.reduce((left, right) => left + right, 0) : null
}

export function calcTotal(qty, cost) {
  const quantity = parseFloat(qty)
  const unitCost = parseFloat(cost)

  return !Number.isNaN(quantity) && !Number.isNaN(unitCost)
    ? quantity * unitCost
    : null
}

export function fmtNum(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  const number = Number(value)
  return number % 1 === 0
    ? number.toString()
    : number.toLocaleString('en-AU', { maximumFractionDigits: 3 })
}

export function fmtCurrency(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  return `$${Number(value).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function moveItem(items, activeId, targetId) {
  if (activeId === targetId) {
    return items
  }

  const fromIndex = items.findIndex((item) => item.id === activeId)
  const toIndex = items.findIndex((item) => item.id === targetId)

  if (fromIndex === -1 || toIndex === -1) {
    return items
  }

  const nextItems = [...items]
  const [moved] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, moved)
  return nextItems
}

export function moveByDirection(items, id, direction) {
  const index = items.findIndex((item) => item.id === id)

  if (index === -1) {
    return items
  }

  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= items.length) {
    return items
  }

  const nextItems = [...items]
  const [moved] = nextItems.splice(index, 1)
  nextItems.splice(targetIndex, 0, moved)
  return nextItems
}

export function historyReducer(state, action) {
  switch (action.type) {
    case 'mutate': {
      const nextPresent = action.updater(state.present)

      if (nextPresent === state.present) {
        return state
      }

      const nextPast = [...state.past, state.present]
      if (nextPast.length > 100) {
        nextPast.shift()
      }

      return {
        past: nextPast,
        present: nextPresent,
        future: [],
      }
    }
    case 'undo': {
      if (state.past.length === 0) {
        return state
      }

      const previous = state.past[state.past.length - 1]
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      }
    }
    case 'redo': {
      if (state.future.length === 0) {
        return state
      }

      const next = state.future[0]
      const nextPast = [...state.past, state.present]
      if (nextPast.length > 100) {
        nextPast.shift()
      }

      return {
        past: nextPast,
        present: next,
        future: state.future.slice(1),
      }
    }
    default:
      return state
  }
}

function normalizeOption(option, index) {
  if (typeof option === 'string') {
    return {
      id: DEFAULT_OPTIONS[index]?.id ?? createId('opt'),
      name: option,
    }
  }

  return {
    id:
      typeof option?.id === 'string' && option.id.trim()
        ? option.id
        : DEFAULT_OPTIONS[index]?.id ?? createId('opt'),
    name:
      typeof option?.name === 'string' && option.name.trim()
        ? option.name
        : DEFAULT_OPTIONS[index]?.name ?? `Option ${index + 1}`,
  }
}

function normalizeComponent(component, index) {
  if (typeof component === 'string') {
    return {
      id: DEFAULT_COMPONENTS[index]?.id ?? createId('comp'),
      name: component,
    }
  }

  return {
    id:
      typeof component?.id === 'string' && component.id.trim()
        ? component.id
        : DEFAULT_COMPONENTS[index]?.id ?? createId('comp'),
    name:
      typeof component?.name === 'string' && component.name.trim()
        ? component.name
        : DEFAULT_COMPONENTS[index]?.name ?? `Component ${index + 1}`,
  }
}

function normalizeSub(sub) {
  return {
    id:
      typeof sub?.id === 'string' && sub.id.trim()
        ? sub.id
        : createId('sub'),
    label: typeof sub?.label === 'string' ? sub.label : '',
    quantity: normalizeStringValue(sub?.quantity),
    elementValue: normalizeStringValue(sub?.elementValue),
  }
}

function normalizeStringValue(value) {
  return typeof value === 'string'
    ? value
    : value !== undefined && value !== null
      ? String(value)
      : ''
}
