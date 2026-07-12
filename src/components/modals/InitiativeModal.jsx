/**
 * InitiativeModal — roll initiative for all ships.
 * Player ships: manual dice entry. NPC ships: auto-rolled on confirm.
 * Tactics(naval) check is optional — Effect added to initiative if entered.
 * // MgT2e CRB p.160 — Initiative
 */

import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { getEffectiveSkill } from '../../utils/crew.js'
import { DiceInput } from '../forms/DiceInput.jsx'

export function InitiativeModal() {
  const closeModal        = useUiStore((s) => s.closeModal)
  const rollAllInitiative = useBattleStore((s) => s.rollAllInitiative)
  const ships             = useBattleStore((s) => s.ships)
  const initiativeOrder   = useBattleStore((s) => s.initiativeOrder)

  // Manual initiative dice per player ship: null = not yet rolled.
  const [playerDice, setPlayerDice]   = useState(() => {
    const map = {}
    ships.filter((s) => s.faction === 'players').forEach((s) => { map[s.id] = null })
    return map
  })
  // Optional Tactics(naval) check dice per player ship (only ships with tactics > 0).
  const [tacticsDice, setTacticsDice] = useState(() => {
    const map = {}
    ships
      .filter((s) => s.faction === 'players' && getEffectiveSkill(s.profile.crew, s.crewAssignments, 'tactics') > 0)
      .forEach((s) => { map[s.id] = null })
    return map
  })
  const [rerollCount, setRerollCount] = useState(0)
  const [confirmed, setConfirmed]     = useState(false)

  const playerShips = ships.filter((s) => s.faction === 'players')
  const npcShips    = ships.filter((s) => s.faction !== 'players')

  const setShipDice    = (shipId, dice) => setPlayerDice((prev) => ({ ...prev, [shipId]: dice }))
  const setShipTactics = (shipId, dice) => setTacticsDice((prev) => ({ ...prev, [shipId]: dice }))

  /** Tactics Effect = 2D6 + tactics skill − 8 (CRB p.160). */
  const tacticsEffect = (ship) => {
    const dice = tacticsDice[ship.id]
    if (!dice) return 0
    return dice.total + getEffectiveSkill(ship.profile.crew, ship.crewAssignments, 'tactics') - 8
  }

  const allEntered = playerShips.every((s) => playerDice[s.id] !== null)

  const previewTotal = (ship) => {
    const dice = playerDice[ship.id]
    if (!dice) return '?'
    return dice.total + getEffectiveSkill(ship.profile.crew, ship.crewAssignments, 'pilot') + ship.profile.thrust + tacticsEffect(ship) + (ship.initiativeBonusNextRound ?? 0) + (ship.profile.holographicControls ? 2 : 0)
  }

  const handleConfirm = () => {
    // Build tactics effects map for all ships (player entries + NPC auto via store).
    const playerTacticsEffects = {}
    playerShips.forEach((ship) => {
      const effect = tacticsEffect(ship)
      if (effect !== 0) playerTacticsEffects[ship.id] = effect
    })
    rollAllInitiative(playerTacticsEffects, playerDice)
    setConfirmed(true)
  }

  const handleReroll = () => {
    const diceMap = {}
    playerShips.forEach((s) => { diceMap[s.id] = null })
    const tacticsMap = {}
    playerShips
      .filter((s) => getEffectiveSkill(s.profile.crew, s.crewAssignments, 'tactics') > 0)
      .forEach((s) => { tacticsMap[s.id] = null })
    setPlayerDice(diceMap)
    setTacticsDice(tacticsMap)
    setRerollCount((c) => c + 1)
    setConfirmed(false)
  }

  return (
    <Modal title="Initiative Roll" onClose={closeModal}>
      <div className="space-y-4">
        <p className="text-slate-400 font-mono text-xs">
          Formula: 2D6 + Pilot + Thrust [+ Tactics Effect] [+2 Holo Controls] // MgT2e CRB p.160, p.186
        </p>

        {!confirmed ? (
          <>
            {/* Player ships — manual dice entry */}
            {playerShips.length > 0 && (
              <div>
                <p className="font-mono text-xs text-slate-400 tracking-widest uppercase mb-1.5">
                  Player Ships — roll dice
                </p>
                <div className="space-y-2">
                  {playerShips.map((ship) => {
                    const tacticsSkill = getEffectiveSkill(ship.profile.crew, ship.crewAssignments, 'tactics')
                    const effect       = tacticsEffect(ship)
                    return (
                      <div key={ship.id} className="bg-slate-800 rounded px-3 py-2 space-y-1.5">
                        {/* Initiative row */}
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ship.color }} />
                          <span className="text-slate-300 font-mono text-xs flex-1 min-w-0 truncate">
                            {ship.name}
                          </span>
                          <DiceInput
                            key={`init-${ship.id}-${rerollCount}`}
                            value={null}
                            onChange={(d) => setShipDice(ship.id, d)}
                          />
                          <span className="text-slate-400 font-mono text-xs">→</span>
                          <span className={`font-mono text-sm font-bold w-6 text-right ${previewTotal(ship) === '?' ? 'text-slate-400' : 'text-(--neon-cyan)'}`}>
                            {previewTotal(ship)}
                          </span>
                        </div>
                        {/* Tactics check row — appears after main dice are entered */}
                        {tacticsSkill > 0 && playerDice[ship.id] !== null && (
                          <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
                            <span className="text-slate-400 font-mono text-xs shrink-0">
                              Tactics {tacticsSkill} (opt.)
                            </span>
                            <div className="ml-auto flex items-center gap-2">
                              <DiceInput
                                key={`tac-${ship.id}-${rerollCount}`}
                                value={null}
                                onChange={(d) => setShipTactics(ship.id, d)}
                              />
                              {tacticsDice[ship.id] && (
                                <span className={`font-mono text-xs font-bold w-14 ${effect >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  Effect {effect >= 0 ? '+' : ''}{effect}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* NPC ships — auto-rolled on confirm */}
            {npcShips.length > 0 && (
              <div>
                <p className="font-mono text-xs text-slate-400 tracking-widest uppercase mb-1.5">
                  NPC Ships — auto
                </p>
                <div className="space-y-1">
                  {npcShips.map((ship) => {
                    const tacticsSkill = getEffectiveSkill(ship.profile.crew, ship.crewAssignments, 'tactics')
                    return (
                      <div
                        key={ship.id}
                        className="flex items-center gap-3 bg-slate-800/50 rounded px-3 py-1.5"
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ship.color }} />
                        <span className="text-slate-400 font-mono text-xs flex-1 min-w-0 truncate">
                          {ship.name}
                        </span>
                        <span className="text-slate-400 font-mono text-xs">
                          🎲 auto{tacticsSkill > 0 ? ` + tactics ${tacticsSkill}` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={!allEntered}
              className="w-full py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-sm tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
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
                const bd = ship.initiativeBreakdown
                return (
                  <li key={id} className="bg-slate-800 rounded px-3 py-1.5">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono text-xs w-4">{idx + 1}.</span>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ship.color }} />
                      <span className="text-slate-200 font-mono text-xs flex-1 truncate">{ship.name}</span>
                      <span className="text-(--neon-cyan) font-mono text-sm font-bold">{ship.initiative}</span>
                    </div>
                    {bd && (
                      <div className="flex items-center gap-1 mt-0.5 ml-7 font-mono text-[10px] text-slate-500">
                        <span>2D:{bd.roll}</span>
                        <span>+ Pilot:{bd.pilotSkill}</span>
                        <span>+ T{bd.thrust}</span>
                        {bd.tacticsEffect !== 0 && (
                          <span className="text-green-400">+ Tac:{bd.tacticsEffect}</span>
                        )}
                        {bd.holographicControlsDM > 0 && (
                          <span className="text-(--neon-cyan)">+ Holo:{bd.holographicControlsDM}</span>
                        )}
                      </div>
                    )}
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
