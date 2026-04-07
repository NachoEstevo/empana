import { ArrowRight, HandCoins, Trash2 } from 'lucide-react'
import { formatCurrency } from '../state'
import type { AppState, Person, SplitField } from '../data'

type PersonBreakdown = {
  person: Person
  empanadaCount: number
  empanadaTotal: number
  extraTotal: number
  total: number
}

type Settlement = {
  from: string
  to: string
  amount: number
}

type SplitTabProps = {
  state: AppState
  splitEmpanadasCount: number
  loadedEmpanadasCount: number
  empanadasTotal: number
  extraTotal: number
  extrasShare: number
  impliedUnitPrice: number
  grandTotal: number
  unassignedEmpanadasCount: number
  overAssignedEmpanadasCount: number
  peopleBreakdown: PersonBreakdown[]
  settlements: Settlement[]
  splitFieldDraft: string
  empanadasPayerId: string
  onEmpanadasTotalPriceChange: (value: string) => void
  onEmpanadasPayerChange: (payerId: string) => void
  onSplitEmpanadasCountChange: (value: string) => void
  onQuickSetCount: (count: number) => void
  onSplitFieldDraftChange: (value: string) => void
  onUpdateSplitField: (fieldId: string, patch: Partial<SplitField>) => void
  onAddSplitField: () => void
  onRemoveSplitField: (fieldId: string) => void
}

export function SplitTab({
  state,
  splitEmpanadasCount,
  loadedEmpanadasCount,
  empanadasTotal,
  extraTotal,
  extrasShare,
  impliedUnitPrice,
  grandTotal,
  unassignedEmpanadasCount,
  overAssignedEmpanadasCount,
  peopleBreakdown,
  settlements,
  splitFieldDraft,
  empanadasPayerId,
  onEmpanadasTotalPriceChange,
  onEmpanadasPayerChange,
  onSplitEmpanadasCountChange,
  onQuickSetCount,
  onSplitFieldDraftChange,
  onUpdateSplitField,
  onAddSplitField,
  onRemoveSplitField,
}: SplitTabProps) {
  const hasSelectedPayers = Boolean(empanadasPayerId || state.splitFields.some((field) => field.payerId))

  return (
    <>
      <div className="workspace">
        <section className="workspace-section">
          <div className="section-topline">
            <span className="icon-label">
              <HandCoins size={16} />
              Empanadas
            </span>
            <p>El cálculo se hace por cantidad.</p>
          </div>

          <label className="field">
            <span>Total de las empanadas</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="100"
              value={state.empanadasTotalPrice}
              onChange={(event) => onEmpanadasTotalPriceChange(event.target.value)}
            />
          </label>

          <div className="split-count-block">
            <label className="field">
              <span>Cantidad de empanadas</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={splitEmpanadasCount}
                onChange={(event) => onSplitEmpanadasCountChange(event.target.value)}
              />
            </label>

            <div className="quick-actions split-quick-actions">
              <button type="button" className="ghost-button quick-button" onClick={() => onQuickSetCount(12)}>
                1 docena
              </button>
              <button type="button" className="ghost-button quick-button" onClick={() => onQuickSetCount(24)}>
                2 docenas
              </button>
            </div>
          </div>

          <label className="field">
            <span>Quién pagó las empanadas</span>
            <select value={empanadasPayerId} onChange={(event) => onEmpanadasPayerChange(event.target.value)}>
              <option value="">Sin marcar</option>
              {state.people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>

          <div className="overview-grid">
            <div className="overview-card">
              <small>Total de empanadas</small>
              <strong>{formatCurrency(empanadasTotal)}</strong>
              <span>{splitEmpanadasCount} unidades</span>
            </div>
            <div className="overview-card">
              <small>Precio por empanada</small>
              <strong>{formatCurrency(impliedUnitPrice)}</strong>
              <span>{loadedEmpanadasCount} cargadas en pedido</span>
            </div>
          </div>
        </section>

        <section className="workspace-section">
          <div className="section-topline">
            <span className="icon-label">
              <HandCoins size={16} />
              Extras compartidos
            </span>
            <p>Cada extra también puede tener su propio pagador.</p>
          </div>

          <div className="split-fields">
            {state.splitFields.map((field) => (
              <div key={field.id} className="split-field-card">
                <div className="split-field-main">
                  <input
                    value={field.name}
                    onChange={(event) => onUpdateSplitField(field.id, { name: event.target.value })}
                  />

                  <div className="split-field-amount">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="100"
                      value={field.amount}
                      onChange={(event) =>
                        onUpdateSplitField(field.id, { amount: Number(event.target.value) })
                      }
                    />
                    <button type="button" className="ghost-button icon-only" onClick={() => onRemoveSplitField(field.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <label className="field compact-field">
                  <span>Pagó</span>
                  <select
                    value={field.payerId}
                    onChange={(event) => onUpdateSplitField(field.id, { payerId: event.target.value })}
                  >
                    <option value="">Sin marcar</option>
                    {state.people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>

          <form
            className="inline-form muted"
            onSubmit={(event) => {
              event.preventDefault()
              onAddSplitField()
            }}
          >
            <input
              value={splitFieldDraft}
              onChange={(event) => onSplitFieldDraftChange(event.target.value)}
              placeholder="Agregar otro campo"
            />
            <button type="submit" className="ghost-button">
              Añadir campo
            </button>
          </form>
        </section>

      </div>

      <aside className="summary-panel">
        <section className="summary-block">
          <span className="icon-label">
            <HandCoins size={16} />
            Total general
          </span>
          <h3>{formatCurrency(grandTotal)}</h3>
          <p>
            {overAssignedEmpanadasCount
              ? `Hay ${overAssignedEmpanadasCount} emp. cargadas de más respecto al total que pusiste.`
              : unassignedEmpanadasCount
                ? `Hay ${unassignedEmpanadasCount} emp. sin asignar. Abajo se reparte lo que ya está cargado.`
                : extraTotal
                  ? `${formatCurrency(extrasShare)} de extras por persona, además de sus empanadas.`
                  : 'Cada persona paga sus empanadas al mismo valor.'}
          </p>
        </section>

        <section className="summary-block list-block">
          <h3 className="mini-title">Cada persona</h3>
          {peopleBreakdown.map((entry) => (
            <div key={entry.person.id} className="person-summary money">
              <div>
                <span>{entry.person.name}</span>
                <small>
                  {extrasShare
                    ? `${entry.empanadaCount} emp. + ${formatCurrency(entry.extraTotal)} extras`
                    : `${entry.empanadaCount} emp.`}
                </small>
              </div>
              <strong>{formatCurrency(entry.total)}</strong>
            </div>
          ))}
        </section>

        <section className="summary-block list-block">
          <h3 className="mini-title">Transferencias</h3>
          {settlements.length ? (
            settlements.map((entry) => (
              <div key={`${entry.from}-${entry.to}`} className="settlement-row">
                <span>
                  {entry.from} <ArrowRight size={14} /> {entry.to}
                </span>
                <strong>{formatCurrency(entry.amount)}</strong>
              </div>
            ))
          ) : (
            <p className="empty-state">
              {hasSelectedPayers
                ? 'Con la configuración actual no quedan transferencias pendientes.'
                : 'Marcá quién pagó las empanadas o algún extra para ver las transferencias.'}
            </p>
          )}
        </section>
      </aside>
    </>
  )
}
