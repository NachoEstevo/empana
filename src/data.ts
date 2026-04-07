export type TabId = 'pedido' | 'split' | 'truco'

export type Flavor = {
  id: string
  name: string
  custom: boolean
}

export type Person = {
  id: string
  name: string
  color: string
}

export type SplitField = {
  id: string
  name: string
  amount: number
  payerId: string
}

export type TrucoState = {
  teamAName: string
  teamBName: string
  teamAScore: number
  teamBScore: number
}

export type AppState = {
  activeTab: TabId
  people: Person[]
  selectedPersonId: string
  flavors: Flavor[]
  orderByPerson: Record<string, Record<string, number>>
  empanadasTotalPrice: number
  splitEmpanadasCountOverride: number | null
  empanadasPayerId: string
  splitFields: SplitField[]
  truco: TrucoState
}

export const STORAGE_KEY = 'empana-state-v2'
export const HASH_PREFIX = 'empana2='
export const PERSON_COLORS = ['#8e6a4e', '#466b57', '#7e6ca8', '#7b8c55', '#9b5d5b', '#53708b']

export const DEFAULT_FLAVORS: Flavor[] = [
  { id: 'carne', name: 'Carne', custom: false },
  { id: 'jyq', name: 'Jamón y queso', custom: false },
  { id: 'pollo', name: 'Pollo', custom: false },
  { id: 'humita', name: 'Humita', custom: false },
  { id: 'verdura', name: 'Verdura', custom: false },
  { id: 'caprese', name: 'Caprese', custom: false },
  { id: 'fugazzeta', name: 'Fugazzeta', custom: false },
  { id: 'roquefort', name: 'Roquefort', custom: false },
]

export const DEFAULT_SPLIT_FIELDS: SplitField[] = [
  { id: 'bebida', name: 'Bebida', amount: 0, payerId: '' },
  { id: 'picada', name: 'Picada', amount: 0, payerId: '' },
  { id: 'postre', name: 'Postre', amount: 0, payerId: '' },
]

export const TAB_COPY: Record<TabId, { label: string; title: string; subtitle: string }> = {
  pedido: {
    label: 'Pedido',
    title: 'Cargá el pedido',
    subtitle: 'Elegí una persona, sumá gustos y copiá el resumen.',
  },
  split: {
    label: 'Split',
    title: 'Dividí la cuenta',
    subtitle: 'Poné el total, marcá quién pagó cada cosa y repartí.',
  },
  truco: {
    label: 'Truco',
    title: 'Anotador',
    subtitle: 'Marcador simple con botones grandes.',
  },
}

export function createId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createPerson(name: string, index: number): Person {
  return {
    id: createId('person'),
    name,
    color: PERSON_COLORS[index % PERSON_COLORS.length],
  }
}

export function buildDefaultSplitFields(): SplitField[] {
  return DEFAULT_SPLIT_FIELDS.map((field) => ({ ...field }))
}

export function buildDefaultFlavors(): Flavor[] {
  return DEFAULT_FLAVORS.map((flavor) => ({ ...flavor }))
}

export function buildDefaultState(): AppState {
  const firstPerson = createPerson('Vos', 0)

  return {
    activeTab: 'pedido',
    people: [firstPerson],
    selectedPersonId: firstPerson.id,
    flavors: buildDefaultFlavors(),
    orderByPerson: { [firstPerson.id]: {} },
    empanadasTotalPrice: 0,
    splitEmpanadasCountOverride: null,
    empanadasPayerId: '',
    splitFields: buildDefaultSplitFields(),
    truco: {
      teamAName: 'Nosotros',
      teamBName: 'Ellos',
      teamAScore: 0,
      teamBScore: 0,
    },
  }
}
