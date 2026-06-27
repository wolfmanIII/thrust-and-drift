import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore }     from '../../store/uiStore.js'
import { Modal }          from './Modal.jsx'

const FACTION_LABEL = { players: 'Players', npc: 'NPC', neutral: 'Neutral' }
const PHASE_LABEL = {
  setup:        'Setup',
  initiative:   'Initiative',
  acceleration: 'Acceleration',
  movement:     'Movement',
  attack:       'Attack',
  actions:      'Actions',
  end:          'End',
}

export function BattleReportModal() {
  const closeModal = useUiStore((s) => s.closeModal)
  const ships      = useBattleStore((s) => s.ships)
  const log        = useBattleStore((s) => s.log)
  const round      = useBattleStore((s) => s.round)
  const combatMode = useBattleStore((s) => s.combatMode)

  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const logByRound = {}
  for (const entry of log) {
    const r = entry.round ?? 1
    ;(logByRound[r] ??= []).push(entry)
  }
  const sortedRounds = Object.keys(logByRound).map(Number).sort((a, b) => a - b)

  return (
    <Modal title="BATTLE REPORT" onClose={closeModal} variant="dialog" width="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-xs text-slate-500">
          Round {round} · {combatMode === 'vectorial' ? 'Vectorial' : 'Basic'} · {ships.length} vessel{ships.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => window.print()}
          className="font-mono text-xs border border-cyan-700 text-cyan-400 hover:bg-cyan-950 px-3 py-1 rounded transition-colors"
        >
          ⎙ Print / Save PDF
        </button>
      </div>

      <div id="battle-report-print" className="space-y-6 font-mono text-xs text-slate-200">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="border-b border-slate-600 pb-3">
          <div data-print-accent className="text-base font-bold tracking-widest text-cyan-400">
            THRUST &amp; DRIFT
          </div>
          <div className="text-slate-400 mt-0.5">BATTLE REPORT — {dateStr}</div>
          <div className="flex gap-6 mt-2 text-slate-300">
            <span>Round {round}</span>
            <span>{combatMode === 'vectorial' ? 'Vectorial Combat' : 'Basic Combat'}</span>
          </div>
        </div>

        {/* ── Ship Roster ─────────────────────────────────────────── */}
        <div>
          <div className="text-slate-500 uppercase tracking-widest text-[10px] mb-2">
            Ship Roster — Final State
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-700">
                <th className="py-1 pr-4 font-normal">Vessel</th>
                <th className="py-1 pr-4 font-normal">Faction</th>
                <th className="py-1 pr-4 font-normal">Hull</th>
                <th className="py-1 pr-4 font-normal">Criticals</th>
                <th className="py-1 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {ships.map((ship) => {
                const isWreck = ship.hullCurrent <= 0
                const crits   = ship.criticalHits ?? []
                return (
                  <tr key={ship.id} className="border-b border-slate-800">
                    <td className="py-1.5 pr-4">{ship.profile.name}</td>
                    <td className="py-1.5 pr-4 text-slate-400">
                      {FACTION_LABEL[ship.faction] ?? ship.faction}
                    </td>
                    <td className="py-1.5 pr-4 tabular-nums">
                      <span
                        {...(isWreck ? { 'data-print-red': '' } : {})}
                        className={isWreck ? 'text-red-400' : ''}
                      >
                        {ship.hullCurrent}
                      </span>
                      <span className="text-slate-600">/{ship.profile.hull}</span>
                    </td>
                    <td className="py-1.5 pr-4">
                      {crits.length === 0
                        ? <span className="text-slate-600">—</span>
                        : crits.map((c, i) => (
                            <span key={i} data-print-red className="text-red-400 mr-2">
                              {c.system} Sev-{c.severity}
                            </span>
                          ))
                      }
                    </td>
                    <td className="py-1.5">
                      {isWreck
                        ? <span data-print-red className="text-red-400 font-bold">WRECK</span>
                        : <span data-print-green className="text-green-400">Active</span>
                      }
                    </td>
                  </tr>
                )
              })}
              {ships.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-slate-600 text-center">
                    No vessels in battle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Battle Log ──────────────────────────────────────────── */}
        <div>
          <div className="text-slate-500 uppercase tracking-widest text-[10px] mb-2">
            Battle Log
          </div>
          {sortedRounds.length === 0 && (
            <p className="text-slate-600">No log entries.</p>
          )}
          {sortedRounds.map((r) => (
            <div key={r} className="mb-4">
              <div data-print-accent className="text-cyan-600 font-bold mb-1">
                ── Round {r} ──
              </div>
              <table className="w-full border-collapse">
                <tbody>
                  {logByRound[r].map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-800/40">
                      <td className="py-0.5 pr-4 text-slate-500 w-28 align-top">
                        {PHASE_LABEL[entry.phase] ?? entry.phase}
                      </td>
                      <td className="py-0.5 text-slate-300 align-top">
                        {entry.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

      </div>
    </Modal>
  )
}
