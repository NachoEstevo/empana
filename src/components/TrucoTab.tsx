import type { AppState } from '../data'

type TrucoTabProps = {
  state: AppState
  winner: string
  onUpdateName: (team: 'A' | 'B', value: string) => void
  onUpdateScore: (team: 'A' | 'B', delta: number) => void
  onReset: () => void
}

export function TrucoTab({
  state,
  winner,
  onUpdateName,
  onUpdateScore,
  onReset,
}: TrucoTabProps) {
  return (
    <>
      <section className="workspace truco-board">
        {[
          ['A', state.truco.teamAName, state.truco.teamAScore],
          ['B', state.truco.teamBName, state.truco.teamBScore],
        ].map(([teamKey, teamName, score]) => (
          <article key={teamKey} className="truco-card">
            <input
              value={teamName}
              onChange={(event) => onUpdateName(teamKey === 'A' ? 'A' : 'B', event.target.value)}
            />
            <strong>{score}</strong>
            <small>{Number(score) >= 15 ? 'Buenas' : 'Malas'}</small>
            <div className="truco-actions">
              {[-1, 1].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  className={delta < 0 ? 'ghost-button danger' : 'primary-button'}
                  onClick={() => onUpdateScore(teamKey === 'A' ? 'A' : 'B', delta)}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <aside className="summary-panel">
        <section className="summary-block">
          <span className="icon-label">Anotador</span>
          <h3>{winner ? `${winner} ganó la partida` : 'Primero a 30'}</h3>
          <p>Botones grandes para sumar rápido.</p>
        </section>

        <button type="button" className="primary-button" onClick={onReset}>
          Reiniciar marcador
        </button>
      </aside>
    </>
  )
}
