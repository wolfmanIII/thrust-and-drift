/**
 * InitiativeModal — roll initiative for all ships.
 * Player ships: manual dice entry (physical or opt-in auto-roll). NPC ships: auto-rolled on confirm.
 * // MgT2e CRB p.160 — Initiative
 */

import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { getCrewSkill } from '../../utils/crew.js'
import { DiceInput } from '../forms/DiceInput.jsx'

export function InitiativeModal() {
  const closeModal        = useUiStore((s) => s.closeModal)
  const rollAllInitiative = useBattleStore((s) => s.rollAllInitiative)
  const ships             = useBattleStore((s) => s.ships)
  const initiativeOrder   = useBattleStore((s) => s.initiativeOrder)

  // Manual dice per player ship: null = not yet rolled.
  const [playerDice, setPlayerDice]   = useState(() => {
    const map = {}
    ships.filter((s) => s.faction === 'players').forEach((s) => { map[s.id] = null })
    return map
  })
  const [rerollCount, setRerollCount] = useState(0)
  const [confirmed, setConfirmed]     = useState(false)

  const playerShips = ships.filter((s) => s.faction === 'players')
  const npcShips    = ships.filter((s) => s.faction !== 'players')

  const setShipDice = (shipId, dice) =>
    setPlayerDice((prev) => ({ ...prev, [shipId]: dice }))

  const allEntered = playerShips.every((s) => playerDice[s.id] !== null)

  const handleConfirm = () => {
    rollAllInitiative({}, playerDice)
    setConfirmed(true)
  }

  const handleReroll = () => {
    const map = {}
    playerShips.forEach((s) => { map[s.id] = null })
    setPlayerDice(map)
    setRerollCount((c) => c + 1)
    setConfirmed(false)
  }

  const previewTotal = (ship) => {
    const dice = playerDice[ship.id]
    if (!dice) return '?'
    return dice.total + getCrewSkill(ship.profile.crew, 'pilot') + ship.profile.thrust
  }

  return (
    <Modal title="Initiative Roll" onClose={closeModal}>
      <div className="space-y-4">
        <p className="text-slate-400 font-mono text-xs">
          Formula: 2D6 + Pilot + Thrust // MgT2e CRB p.160
        </p>

        {!confirmed ? (
          <>
            {/* Player ships — manual dice entry */}
            {playerShips.length > 0 && (
              <div>
                <p className="font-mono text-xs text-slate-500 tracking-widest uppercase mb-1.5">
                  Player Ships — roll dice
                </p>
                <div className="space-y-1.5">
                  {playerShips.map((ship) => (
                    <div
                      key={ship.id}
                      className="flex items-center gap-2 bg-slate-800 rounded px-3 py-2"
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ship.color }} />
                      <span className="text-slate-300 font-mono text-xs flex-1 min-w-0 truncate">
                        {ship.profile.name}
                      </span>
                      <DiceInput
                        key={`${ship.id}-${rerollCount}`}
                        value={null}
                        onChange={(d) => setShipDice(ship.id, d)}
                      />
                      <span className="text-slate-600 font-mono text-xs">→</span>
                      <span className={`font-mono text-sm font-bold w-6 text-right ${previewTotal(ship) === '?' ? 'text-slate-600' : 'text-(--neon-cyan)'}`}>
                        {previewTotal(ship)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NPC ships — auto-rolled on confirm */}
            {npcShips.length > 0 && (
              <div>
                <p className="font-mono text-xs text-slate-500 tracking-widest uppercase mb-1.5">
                  NPC Ships — auto
                </p>
                <div className="space-y-1">
                  {npcShips.map((ship) => (
                    <div
                      key={ship.id}
                      className="flex items-center gap-3 bg-slate-800/50 rounded px-3 py-1.5"
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ship.color }} />
                      <span className="text-slate-500 font-mono text-xs flex-1 min-w-0 truncate">
                        {ship.profile.name}
                      </span>
                      <span className="text-slate-700 font-mono text-xs">🎲 auto</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={!allEntered}
              className="w-full py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-sm tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {allEntered ? 'CONFIRM →' : `WAITING — ${playerShips.filter((s) => !playerDice[s.id]).length} ship(s) not rolled`}
            </button>
          </>
        ) : (
          /* Post-confirm: sorted initiative order */
          <div className="space-y-1">
            <p className="text-slate-400 font-mono text-xs mb-2">Initiative order:</p>
            <ol className="space-y-1">
              {initiativeOrder.map((id, idx) => {
                const ship = ships.find((s) => s.id === id)
                if (!ship) return null
                return (
                  <li key={id} className="flex items-center gap-3 bg-slate-800 rounded px-3 py-1.5">
                    <span className="text-slate-500 font-mono text-xs w-4">{idx + 1}.</span>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ship.color }} />
                    <span className="text-slate-200 font-mono text-xs flex-1 truncate">{ship.profile.name}</span>
                    <span className="text-(--neon-cyan) font-mono text-sm font-bold">{ship.initiative}</span>
                  </li>
                )
              })}
            </ol>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleReroll}
                className="flex-1 py-1.5 border border-slate-600 text-slate-400 font-mono text-xs rounded hover:border-slate-500 transition-colors"
              >
                REROLL
              </button>
              <button
                onClick={closeModal}
                className="flex-1 py-1.5 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-xs rounded hover:bg-(--neon-cyan)/20 transition-colors"
              >
                CONFIRM →
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
