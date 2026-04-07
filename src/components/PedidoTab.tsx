import { ArrowRight, Copy, Minus, PhoneCall, Plus, Share2, Trash2, Users } from 'lucide-react'
import type { AppState, Flavor, Person } from '../data'

type PersonBreakdown = {
  person: Person
  items: { flavor: Flavor; qty: number }[]
  empanadaCount: number
}

type FlavorTotal = {
  flavor: Flavor
  qty: number
}

type PedidoTabProps = {
  state: AppState
  activePerson: Person
  totalEmpanadas: number
  roundHint: string
  flavorTotals: FlavorTotal[]
  peopleBreakdown: PersonBreakdown[]
  personDraft: string
  flavorDraft: string
  copied: '' | 'summary' | 'link'
  onPersonDraftChange: (value: string) => void
  onFlavorDraftChange: (value: string) => void
  onAddPerson: () => void
  onRemovePerson: (personId: string) => void
  onSelectPerson: (personId: string) => void
  onAddFlavor: () => void
  onRemoveFlavor: (flavorId: string) => void
  onSetFlavorQuantity: (personId: string, flavorId: string, delta: number) => void
  onCopySummary: () => void
  onCopyLink: () => void
  onResetOrder: () => void
}

export function PedidoTab({
  state,
  activePerson,
  totalEmpanadas,
  roundHint,
  flavorTotals,
  peopleBreakdown,
  personDraft,
  flavorDraft,
  copied,
  onPersonDraftChange,
  onFlavorDraftChange,
  onAddPerson,
  onRemovePerson,
  onSelectPerson,
  onAddFlavor,
  onRemoveFlavor,
  onSetFlavorQuantity,
  onCopySummary,
  onCopyLink,
  onResetOrder,
}: PedidoTabProps) {
  const activeLoadingText =
    activePerson.name === 'Vos'
      ? 'Vos estás cargando ahora.'
      : `${activePerson.name} está cargando ahora.`

  return (
    <>
      <div className="workspace">
        <section className="workspace-section">
          <div className="section-topline">
            <span className="icon-label">
              <Users size={16} />
              Mesa
            </span>
            <p>Elegí la persona y cargá su parte.</p>
          </div>

          <div className="people-bar">
            {state.people.map((person) => {
              const personCount = Object.values(state.orderByPerson[person.id] ?? {}).reduce(
                (sum, qty) => sum + qty,
                0,
              )

              return (
                <button
                  key={person.id}
                  type="button"
                  className={person.id === activePerson.id ? 'person-chip active' : 'person-chip'}
                  style={{ ['--person-color' as string]: person.color }}
                  onClick={() => onSelectPerson(person.id)}
                >
                  <span>{person.name}</span>
                  <small>{personCount} emp.</small>
                  {state.people.length > 1 ? (
                    <span
                      className="person-delete"
                      onClick={(event) => {
                        event.stopPropagation()
                        onRemovePerson(person.id)
                      }}
                    >
                      <Trash2 size={14} />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault()
              onAddPerson()
            }}
          >
            <input
              value={personDraft}
              onChange={(event) => onPersonDraftChange(event.target.value)}
              placeholder="Agregar persona"
            />
            <button type="submit" className="primary-button">
              Sumar
            </button>
          </form>
        </section>

        <section className="workspace-section compact-section">
          <div className="overview-grid">
            <div className="overview-card">
              <small>Total cargado</small>
              <strong>{totalEmpanadas || 0}</strong>
              <span>{totalEmpanadas ? roundHint : 'sin pedido'}</span>
            </div>
          </div>

          <div className="action-grid">
            <button
              type="button"
              className="primary-button"
              disabled={!totalEmpanadas}
              onClick={onCopySummary}
            >
              <Copy size={16} />
              {copied === 'summary' ? 'Resumen copiado' : 'Copiar resumen'}
            </button>
            <button type="button" className="ghost-button" onClick={onCopyLink}>
              <Share2 size={16} />
              {copied === 'link' ? 'Link copiado' : 'Copiar link'}
            </button>
          </div>
        </section>

        <section className="workspace-section">
          <div className="section-topline">
            <span className="icon-label">
              <PhoneCall size={16} />
              Gustos
            </span>
            <p>{activeLoadingText}</p>
          </div>

          <form
            className="inline-form muted"
            onSubmit={(event) => {
              event.preventDefault()
              onAddFlavor()
            }}
          >
            <input
              value={flavorDraft}
              onChange={(event) => onFlavorDraftChange(event.target.value)}
              placeholder="Agregar gusto manualmente"
            />
            <button type="submit" className="ghost-button">
              Agregar gusto
            </button>
          </form>

          <div className="flavor-grid">
            {state.flavors.map((flavor) => {
              const currentQty = state.orderByPerson[activePerson.id]?.[flavor.id] ?? 0
              const tableQty = state.people.reduce(
                (sum, person) => sum + (state.orderByPerson[person.id]?.[flavor.id] ?? 0),
                0,
              )

              return (
                <article key={flavor.id} className="flavor-card">
                  <div className="flavor-head">
                    <div>
                      <h3>{flavor.name}</h3>
                    </div>
                    <div className="flavor-meta">
                      <span>Mesa</span>
                      <strong>{tableQty}</strong>
                    </div>
                  </div>

                  <div className="flavor-actions">
                    <div className="stepper">
                      <button
                        type="button"
                        aria-label={`Restar ${flavor.name}`}
                        onClick={() => onSetFlavorQuantity(activePerson.id, flavor.id, -1)}
                      >
                        <Minus size={16} />
                      </button>
                      <strong>{currentQty}</strong>
                      <button
                        type="button"
                        aria-label={`Sumar ${flavor.name}`}
                        onClick={() => onSetFlavorQuantity(activePerson.id, flavor.id, 1)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    {flavor.custom ? (
                      <button type="button" className="ghost-button icon-only" onClick={() => onRemoveFlavor(flavor.id)}>
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>

      <aside className="summary-panel">
        <section className="summary-block">
          <span className="icon-label">
            <ArrowRight size={16} />
            Resumen del pedido
          </span>
          <h3>{totalEmpanadas ? `${totalEmpanadas} empanadas` : 'Todavía no hay pedido'}</h3>
          <p>
            {totalEmpanadas
              ? `Van ${roundHint}. El detalle está agrupado por gusto y por persona.`
              : 'Sumá gustos y acá aparece el resumen.'}
          </p>
        </section>

        <section className="summary-block list-block">
          <h3 className="mini-title">Por gusto</h3>
          {flavorTotals.length ? (
            flavorTotals.map((entry) => (
              <div key={entry.flavor.id} className="summary-row">
                <span>{entry.flavor.name}</span>
                <strong>x{entry.qty}</strong>
              </div>
            ))
          ) : (
            <p className="empty-state">Todavía no hay cantidades cargadas.</p>
          )}
        </section>

        <section className="summary-block list-block">
          <h3 className="mini-title">Por persona</h3>
          {peopleBreakdown.map((entry) => (
            <div key={entry.person.id} className="person-summary">
              <div>
                <span>{entry.person.name}</span>
                <small>
                  {entry.items.length
                    ? entry.items.map((item) => `${item.flavor.name} x${item.qty}`).join(', ')
                    : 'sin gustos cargados'}
                </small>
              </div>
              <strong>{entry.empanadaCount}</strong>
            </div>
          ))}
        </section>

        <button type="button" className="ghost-button danger" onClick={onResetOrder}>
          <Trash2 size={16} />
          Vaciar pedido y extras
        </button>
      </aside>
    </>
  )
}
