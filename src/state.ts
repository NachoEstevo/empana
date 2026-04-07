import {
  buildDefaultFlavors,
  buildDefaultSplitFields,
  buildDefaultState,
  createId,
  HASH_PREFIX,
  STORAGE_KEY,
} from './data'
import type { AppState, Flavor, SplitField } from './data'

export function clampNumber(value: number, min = 0): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, value)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

export function encodeState(state: AppState): string {
  const bytes = new TextEncoder().encode(JSON.stringify(state))
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function sanitizeFlavors(value: unknown): Flavor[] {
  if (!Array.isArray(value) || value.length === 0) return buildDefaultFlavors()

  const flavors = value
    .filter((item): item is Flavor => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : createId('flavor'),
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Sin nombre',
      custom: Boolean(item.custom),
    }))

  return flavors.length ? flavors : buildDefaultFlavors()
}

function sanitizeSplitFields(value: unknown): SplitField[] {
  if (!Array.isArray(value) || value.length === 0) return buildDefaultSplitFields()

  const fields = value
    .filter((item): item is SplitField => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : createId('split'),
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Extra',
      amount: clampNumber(Number(item.amount), 0),
    }))

  return fields.length ? fields : buildDefaultSplitFields()
}

export function sanitizeState(state: AppState): AppState {
  const fallback = buildDefaultState()
  const safePeople = Array.isArray(state.people) && state.people.length ? state.people : fallback.people
  const safeFlavors = sanitizeFlavors(state.flavors)
  const safeFlavorIds = new Set(safeFlavors.map((flavor) => flavor.id))
  const safeOrder = Object.fromEntries(
    safePeople.map((person) => {
      const order = Object.entries(state.orderByPerson?.[person.id] ?? {})
        .filter(([flavorId]) => safeFlavorIds.has(flavorId))
        .map(([flavorId, qty]) => [flavorId, clampNumber(Number(qty), 0)])
      return [person.id, Object.fromEntries(order)]
    }),
  )
  const loadedEmpanadasCount = Object.values(
    safeOrder as Record<string, Record<string, number>>,
  ).reduce(
    (sum, order) =>
      sum + Object.values(order as Record<string, number>).reduce((personSum, qty) => personSum + Number(qty), 0),
    0,
  )
  const legacyUnitPrice = clampNumber(Number((state as AppState & { empanadaUnitPrice?: number }).empanadaUnitPrice), 0)
  const nextTotalPrice =
    typeof state.empanadasTotalPrice === 'number'
      ? clampNumber(Number(state.empanadasTotalPrice), 0)
      : legacyUnitPrice * loadedEmpanadasCount
  const nextCountOverrideRaw = (state as AppState & { splitEmpanadasCountOverride?: unknown }).splitEmpanadasCountOverride
  const nextCountOverride =
    typeof nextCountOverrideRaw === 'number'
      ? nextCountOverrideRaw
      : Number.NaN

  return {
    activeTab:
      state.activeTab === 'split' || state.activeTab === 'truco' ? state.activeTab : 'pedido',
    people: safePeople,
    selectedPersonId: safePeople.some((person) => person.id === state.selectedPersonId)
      ? state.selectedPersonId
      : safePeople[0].id,
    flavors: safeFlavors,
    orderByPerson: safeOrder,
    empanadasTotalPrice: nextTotalPrice,
    splitEmpanadasCountOverride:
      nextCountOverrideRaw === null ||
      nextCountOverrideRaw === undefined ||
      Number.isNaN(nextCountOverride)
        ? null
        : clampNumber(nextCountOverride, 0),
    splitFields: sanitizeSplitFields(state.splitFields),
    payerId: safePeople.some((person) => person.id === state.payerId) ? state.payerId : '',
    truco: {
      teamAName: state.truco?.teamAName || 'Nosotros',
      teamBName: state.truco?.teamBName || 'Ellos',
      teamAScore: clampNumber(Number(state.truco?.teamAScore), 0),
      teamBScore: clampNumber(Number(state.truco?.teamBScore), 0),
    },
  }
}

function decodeState(encoded: string): AppState | null {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padding = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4))
    const binary = atob(`${base64}${padding}`)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return sanitizeState(JSON.parse(new TextDecoder().decode(bytes)) as AppState)
  } catch {
    return null
  }
}

export function loadInitialState(): AppState {
  if (typeof window === 'undefined') return buildDefaultState()

  if (window.location.hash.startsWith(`#${HASH_PREFIX}`)) {
    const fromHash = decodeState(window.location.hash.slice(HASH_PREFIX.length + 1))
    if (fromHash) return fromHash
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? sanitizeState(JSON.parse(raw) as AppState) : buildDefaultState()
  } catch {
    return buildDefaultState()
  }
}

export function persistState(state: AppState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  const nextUrl = `${window.location.pathname}${window.location.search}#${HASH_PREFIX}${encodeState(state)}`
  window.history.replaceState(null, '', nextUrl)
}
