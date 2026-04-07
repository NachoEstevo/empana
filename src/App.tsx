import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createId, createPerson, TAB_COPY } from './data'
import { PedidoTab } from './components/PedidoTab'
import { SplitTab } from './components/SplitTab'
import { TrucoTab } from './components/TrucoTab'
import { clampNumber, loadInitialState, persistState } from './state'
import type { AppState, SplitField, TabId } from './data'

function App() {
  const [state, setState] = useState<AppState>(loadInitialState)
  const [personDraft, setPersonDraft] = useState('')
  const [flavorDraft, setFlavorDraft] = useState('')
  const [splitFieldDraft, setSplitFieldDraft] = useState('')
  const [copied, setCopied] = useState<'summary' | 'link' | ''>('')

  useEffect(() => {
    persistState(state)
  }, [state])

  useEffect(() => {
    if (!copied) return
    const timeoutId = window.setTimeout(() => setCopied(''), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  const activePerson = state.people.find((person) => person.id === state.selectedPersonId) ?? state.people[0]

  const flavorTotals = state.flavors
    .map((flavor) => ({
      flavor,
      qty: state.people.reduce((sum, person) => sum + (state.orderByPerson[person.id]?.[flavor.id] ?? 0), 0),
    }))
    .filter((entry) => entry.qty > 0)

  const extraTotal = state.splitFields.reduce((sum, field) => sum + field.amount, 0)
  const extrasShare = state.people.length ? extraTotal / state.people.length : 0

  const rawPeopleBreakdown = state.people.map((person) => {
    const items = state.flavors
      .map((flavor) => ({
        flavor,
        qty: state.orderByPerson[person.id]?.[flavor.id] ?? 0,
      }))
      .filter((entry) => entry.qty > 0)

    const empanadaCount = items.reduce((sum, item) => sum + item.qty, 0)

    return {
      person,
      items,
      empanadaCount,
    }
  })

  const totalEmpanadas = rawPeopleBreakdown.reduce((sum, entry) => sum + entry.empanadaCount, 0)
  const splitEmpanadasCount = state.splitEmpanadasCountOverride ?? totalEmpanadas
  const impliedUnitPrice =
    splitEmpanadasCount > 0 ? state.empanadasTotalPrice / splitEmpanadasCount : 0
  const peopleBreakdown = rawPeopleBreakdown.map((entry) => {
    const empanadaTotal = entry.empanadaCount * impliedUnitPrice
    const extraTotalPerPerson = extrasShare

    return {
      ...entry,
      empanadaTotal,
      extraTotal: extraTotalPerPerson,
      total: empanadaTotal + extraTotalPerPerson,
    }
  })

  const empanadasTotal = state.empanadasTotalPrice
  const grandTotal = state.empanadasTotalPrice + extraTotal
  const unassignedEmpanadasCount = Math.max(splitEmpanadasCount - totalEmpanadas, 0)
  const overAssignedEmpanadasCount = Math.max(totalEmpanadas - splitEmpanadasCount, 0)
  const roundHint = totalEmpanadas >= 12 ? `${(totalEmpanadas / 12).toFixed(1)} docenas` : `${totalEmpanadas}/12`

  const summaryText = [
    'Pedido de empanadas',
    '',
    `Total: ${totalEmpanadas} empanadas (${roundHint})`,
    ...flavorTotals.map((entry) => `- ${entry.flavor.name}: ${entry.qty}`),
    '',
    'Por persona:',
    ...peopleBreakdown.map((entry) => {
      const detail = entry.items.length
        ? entry.items.map((item) => `${item.flavor.name} x${item.qty}`).join(', ')
        : 'sin cargar'
      return `- ${entry.person.name}: ${detail}`
    }),
  ].join('\n')

  const balances = new Map(
    state.people.map((person) => [
      person.id,
      {
        person,
        owed: 0,
        paid: 0,
      },
    ]),
  )

  peopleBreakdown.forEach((entry) => {
    const currentBalance = balances.get(entry.person.id)
    if (!currentBalance) return
    currentBalance.owed += entry.empanadaTotal
  })

  if (state.empanadasPayerId) {
    const payerBalance = balances.get(state.empanadasPayerId)
    if (payerBalance) payerBalance.paid += empanadasTotal
  } else {
    peopleBreakdown.forEach((entry) => {
      const currentBalance = balances.get(entry.person.id)
      if (!currentBalance) return
      currentBalance.paid += entry.empanadaTotal
    })
  }

  state.splitFields.forEach((field) => {
    const share = state.people.length ? field.amount / state.people.length : 0

    state.people.forEach((person) => {
      const currentBalance = balances.get(person.id)
      if (!currentBalance) return
      currentBalance.owed += share
    })

    if (field.payerId) {
      const payerBalance = balances.get(field.payerId)
      if (payerBalance) payerBalance.paid += field.amount
      return
    }

    state.people.forEach((person) => {
      const currentBalance = balances.get(person.id)
      if (!currentBalance) return
      currentBalance.paid += share
    })
  })

  const creditors = Array.from(balances.values())
    .map((entry) => ({
      person: entry.person,
      amount: entry.paid - entry.owed,
    }))
    .filter((entry) => entry.amount > 0.01)

  const debtors = Array.from(balances.values())
    .map((entry) => ({
      person: entry.person,
      amount: entry.owed - entry.paid,
    }))
    .filter((entry) => entry.amount > 0.01)

  const settlements: { from: string; to: string; amount: number }[] = []
  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]
    const amount = Math.min(debtor.amount, creditor.amount)

    if (amount > 0.01) {
      settlements.push({
        from: debtor.person.name,
        to: creditor.person.name,
        amount,
      })
    }

    debtor.amount -= amount
    creditor.amount -= amount

    if (debtor.amount <= 0.01) debtorIndex += 1
    if (creditor.amount <= 0.01) creditorIndex += 1
  }

  const winner =
    state.truco.teamAScore >= 30
      ? state.truco.teamAName
      : state.truco.teamBScore >= 30
        ? state.truco.teamBName
        : ''

  async function copyValue(value: string, kind: 'summary' | 'link') {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
    } catch {
      setCopied('')
    }
  }

  function setFlavorQuantity(personId: string, flavorId: string, delta: number) {
    setState((current) => {
      const nextQty = clampNumber((current.orderByPerson[personId]?.[flavorId] ?? 0) + delta, 0)
      const nextOrder = { ...(current.orderByPerson[personId] ?? {}) }

      if (nextQty === 0) delete nextOrder[flavorId]
      else nextOrder[flavorId] = nextQty

      return {
        ...current,
        orderByPerson: {
          ...current.orderByPerson,
          [personId]: nextOrder,
        },
      }
    })
  }

  function addPerson() {
    const name = personDraft.trim()
    if (!name) return

    setState((current) => {
      const person = createPerson(name, current.people.length)
      return {
        ...current,
        people: [...current.people, person],
        selectedPersonId: person.id,
        orderByPerson: {
          ...current.orderByPerson,
          [person.id]: {},
        },
      }
    })
    setPersonDraft('')
  }

  function removePerson(personId: string) {
    setState((current) => {
      if (current.people.length === 1) return current
      const nextPeople = current.people.filter((person) => person.id !== personId)
      const nextOrder = { ...current.orderByPerson }
      delete nextOrder[personId]

      return {
        ...current,
        people: nextPeople,
        selectedPersonId:
          current.selectedPersonId === personId ? nextPeople[0].id : current.selectedPersonId,
        orderByPerson: nextOrder,
        empanadasPayerId:
          current.empanadasPayerId === personId ? '' : current.empanadasPayerId,
        splitFields: current.splitFields.map((field) => ({
          ...field,
          payerId: field.payerId === personId ? '' : field.payerId,
        })),
      }
    })
  }

  function addFlavor() {
    const name = flavorDraft.trim()
    if (!name) return

    setState((current) => ({
      ...current,
      flavors: [...current.flavors, { id: createId('flavor'), name, custom: true }],
    }))
    setFlavorDraft('')
  }

  function removeFlavor(flavorId: string) {
    setState((current) => ({
      ...current,
      flavors: current.flavors.filter((flavor) => flavor.id !== flavorId),
      orderByPerson: Object.fromEntries(
        current.people.map((person) => {
          const nextOrder = { ...(current.orderByPerson[person.id] ?? {}) }
          delete nextOrder[flavorId]
          return [person.id, nextOrder]
        }),
      ),
    }))
  }

  function updateSplitField(fieldId: string, patch: Partial<SplitField>) {
    setState((current) => ({
      ...current,
      splitFields: current.splitFields.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              ...patch,
              amount:
                patch.amount === undefined ? field.amount : clampNumber(Number(patch.amount), 0),
            }
          : field,
      ),
    }))
  }

  function addSplitField() {
    const name = splitFieldDraft.trim()
    if (!name) return

    setState((current) => ({
      ...current,
      splitFields: [...current.splitFields, { id: createId('split'), name, amount: 0, payerId: '' }],
    }))
    setSplitFieldDraft('')
  }

  function removeSplitField(fieldId: string) {
    setState((current) => ({
      ...current,
      splitFields: current.splitFields.filter((field) => field.id !== fieldId),
    }))
  }

  function resetOrder() {
    setState((current) => ({
      ...current,
      orderByPerson: Object.fromEntries(current.people.map((person) => [person.id, {}])),
      empanadasTotalPrice: 0,
      splitEmpanadasCountOverride: null,
      empanadasPayerId: '',
      splitFields: current.splitFields.map((field) => ({ ...field, amount: 0, payerId: '' })),
    }))
  }

  function updateTruco(team: 'A' | 'B', delta: number) {
    setState((current) => ({
      ...current,
      truco: {
        ...current.truco,
        teamAScore:
          team === 'A' ? clampNumber(current.truco.teamAScore + delta, 0) : current.truco.teamAScore,
        teamBScore:
          team === 'B' ? clampNumber(current.truco.teamBScore + delta, 0) : current.truco.teamBScore,
      },
    }))
  }

  return (
    <div className="shell">
      <nav className="tabs" aria-label="Secciones principales">
        {(Object.keys(TAB_COPY) as TabId[]).map((tabId) => (
          <button
            key={tabId}
            type="button"
            className={tabId === state.activeTab ? 'tab-button active' : 'tab-button'}
            onClick={() => setState((current) => ({ ...current, activeTab: tabId }))}
          >
            {tabId === state.activeTab ? <motion.span className="tab-pill" layoutId="active-tab" /> : null}
            <span>{TAB_COPY[tabId].label}</span>
          </button>
        ))}
      </nav>

      <section className="section-heading">
        <p className="section-kicker">{TAB_COPY[state.activeTab].label}</p>
        <h2>{TAB_COPY[state.activeTab].title}</h2>
        <p>{TAB_COPY[state.activeTab].subtitle}</p>
      </section>

      <AnimatePresence mode="wait">
        <motion.section
          key={state.activeTab}
          className={state.activeTab === 'truco' ? 'truco-layout' : 'panel-grid'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {state.activeTab === 'pedido' ? (
            <PedidoTab
              state={state}
              activePerson={activePerson}
              totalEmpanadas={totalEmpanadas}
              roundHint={roundHint}
              flavorTotals={flavorTotals}
              peopleBreakdown={peopleBreakdown}
              personDraft={personDraft}
              flavorDraft={flavorDraft}
              copied={copied}
              onPersonDraftChange={setPersonDraft}
              onFlavorDraftChange={setFlavorDraft}
              onAddPerson={addPerson}
              onRemovePerson={removePerson}
              onSelectPerson={(personId) =>
                setState((current) => ({ ...current, selectedPersonId: personId }))
              }
              onAddFlavor={addFlavor}
              onRemoveFlavor={removeFlavor}
              onSetFlavorQuantity={setFlavorQuantity}
              onCopySummary={() => copyValue(summaryText, 'summary')}
              onCopyLink={() => copyValue(window.location.href, 'link')}
              onResetOrder={resetOrder}
            />
          ) : null}

          {state.activeTab === 'split' ? (
            <SplitTab
              state={state}
              splitEmpanadasCount={splitEmpanadasCount}
              loadedEmpanadasCount={totalEmpanadas}
              empanadasTotal={empanadasTotal}
              extraTotal={extraTotal}
              extrasShare={extrasShare}
              impliedUnitPrice={impliedUnitPrice}
              grandTotal={grandTotal}
              unassignedEmpanadasCount={unassignedEmpanadasCount}
              overAssignedEmpanadasCount={overAssignedEmpanadasCount}
              peopleBreakdown={peopleBreakdown}
              settlements={settlements}
              splitFieldDraft={splitFieldDraft}
              empanadasPayerId={state.empanadasPayerId}
              onEmpanadasTotalPriceChange={(value) =>
                setState((current) => ({
                  ...current,
                  empanadasTotalPrice: clampNumber(Number(value), 0),
                }))
              }
              onEmpanadasPayerChange={(payerId) =>
                setState((current) => ({
                  ...current,
                  empanadasPayerId: payerId,
                }))
              }
              onSplitEmpanadasCountChange={(value) =>
                setState((current) => ({
                  ...current,
                  splitEmpanadasCountOverride:
                    value.trim() === '' ? null : clampNumber(Number(value), 0),
                }))
              }
              onQuickSetCount={(count) =>
                setState((current) => ({
                  ...current,
                  splitEmpanadasCountOverride: count,
                }))
              }
              onSplitFieldDraftChange={setSplitFieldDraft}
              onUpdateSplitField={updateSplitField}
              onAddSplitField={addSplitField}
              onRemoveSplitField={removeSplitField}
            />
          ) : null}

          {state.activeTab === 'truco' ? (
            <TrucoTab
              state={state}
              winner={winner}
              onUpdateName={(team, value) =>
                setState((current) => ({
                  ...current,
                  truco: {
                    ...current.truco,
                    teamAName: team === 'A' ? value : current.truco.teamAName,
                    teamBName: team === 'B' ? value : current.truco.teamBName,
                  },
                }))
              }
              onUpdateScore={updateTruco}
              onReset={() =>
                setState((current) => ({
                  ...current,
                  truco: {
                    ...current.truco,
                    teamAScore: 0,
                    teamBScore: 0,
                  },
                }))
              }
            />
          ) : null}
        </motion.section>
      </AnimatePresence>

      <footer className="footer">
        <a href="https://nachoestevo.com" target="_blank" rel="noreferrer">
          Hecha por Ignacio Estevo
        </a>
      </footer>
    </div>
  )
}

export default App
