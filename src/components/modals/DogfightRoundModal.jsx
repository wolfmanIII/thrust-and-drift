/**
 * DogfightRoundModal — resolves one dogfight micro-round.
 * Collects Pilot check dice per ship, shows winner + attack DMs, then advances the counter.
 * Opened by the HUD dogfight tracker; receives groupId via uiStore modalPayload.
 * // MgT2e CRB p.138 §6 — Dogfight micro-round mechanics
 */

import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { DiceInput } from '../forms/DiceInput.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { getCrewSkill } from '../../utils/crew.js'
import { getTonnageDM, resolveDogfightChecks, dogfightAttackDM } from '../../utils/dogfight.js'

// ── DM calculation ──────────────────────────────────────────────────────────

/**
 * Compute all DMs for a ship's Pilot check within a dogfight group.
 * // MgT2e CRB p.138 §6.1
 * @param {object} ship  ShipInstance
 * @param {object[]} groupShips  All ships in the group
 * @param {object} group  DogfightGroup — used for prevRoundBonus
 * @returns {{ pilotSkill: number, tonnageDM: number, thrustDM: number, extraEnemyDM: number, prevRoundBonus: number }}
 */
function computeShipDMs(ship, groupShips, group) {
  const pilotSkill    = getCrewSkill(ship.profile.crew, 'pilot')
  const tonnageDM     = getTonnageDM(ship.profile.tonnage)
  // Ships in dogfight don't use movement thrust; full thrust available for the check
  const thrustDM      = Math.max(0, (ship.profile.thrust ?? 0) - (ship.thrustUsedThisRound ?? 0))
  // Penalty when outnumbered: -(enemy count - 1) // §6.1
  const enemies       = groupShips.filter((s) => s.faction !== ship.faction)
  const extraEnemyDM  = -(Math.max(0, enemies.length - 1))
  // Previous round winner carries their margin as a bonus DM // §6.2
  const prevRoundBonus = ship.id === group.roundWinnerId ? group.roundWinnerMargin : 0
  return { pilotSkill, tonnageDM, thrustDM, extraEnemyDM, prevRoundBonus }
}

// ── Sub-component: ship check row ───────────────────────────────────────────

/**
 * @param {{
 *   ship: object,
 *   dms: object,
 *   dice: object|null,
 *   onDice: (roll: object|null) => void,
 * }} props
 */
function ShipCheckRow({ ship, dms, dice, onDice }) {
  const { pilotSkill, tonnageDM, thrustDM, extraEnemyDM, prevRoundBonus } = dms
  const total = dice !== null
    ? dice.total + pilotSkill + tonnageDM + thrustDM + extraEnemyDM + prevRoundBonus
    : null

  const dmParts = [
    `Pilot ${pilotSkill >= 0 ? '+' : ''}${pilotSkill}`,
    `Tonnage ${tonnageDM >= 0 ? '+' : ''}${tonnageDM}`,
    `Thrust +${thrustDM}`,
    extraEnemyDM < 0 && `Nemici extra ${extraEnemyDM}`,
    prevRoundBonus > 0 && `Bonus round +${prevRoundBonus}`,
  ].filter(Boolean).join(' / ')

  return (
    <div className="bg-slate-800/80 rounded px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ship.color }} />
        <span className="text-slate-200 font-mono text-xs font-bold flex-1 min-w-0 truncate">
          {ship.profile.name}
        </span>
        <span className="text-slate-600 font-mono text-xs shrink-0">[{ship.faction}]</span>
      </div>
      <p className="text-slate-500 font-mono text-xs">{dmParts}</p>
      <div className="flex items-center gap-3">
        <DiceInput value={null} onChange={onDice} />
        {total !== null && (
          <span className="text-[--neon-cyan] font-mono text-sm font-bold">= {total}</span>
        )}
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function DogfightRoundModal() {
  const closeModal = useUiStore((s) => s.closeModal)
  const groupId    = useUiStore((s) => s.modalPayload?.groupId)

  const ships                     = useBattleStore((s) => s.ships)
  const dogfights                 = useBattleStore((s) => s.dogfights)
  const advanceDogfightMicroRound = useBattleStore((s) => s.advanceDogfightMicroRound)

  const group      = dogfights.find((g) => g.id === groupId && g.active) ?? null
  const groupShips = group
    ? group.shipIds.map((id) => ships.find((s) => s.id === id)).filter(Boolean)
    : []

  // rolls: { [shipId]: DiceRoll | null }
  const [rolls, setRolls] = useState(() => {
    const map = {}
    if (group) group.shipIds.forEach((id) => { map[id] = null })
    return map
  })
  const [phase, setPhase] = useState('rolling') // 'rolling' | 'result'

  if (!group) return null

  const setRoll = (shipId, dice) =>
    setRolls((prev) => ({ ...prev, [shipId]: dice }))

  const allRolled = groupShips.every((s) => rolls[s.id] !== null)

  // Build check results with totals for store action
  const checkResults = allRolled
    ? groupShips.map((s) => {
        const dms = computeShipDMs(s, groupShips, group)
        const dice = rolls[s.id]
        const total = dice.total + dms.pilotSkill + dms.tonnageDM + dms.thrustDM + dms.extraEnemyDM + dms.prevRoundBonus
        return { shipId: s.id, total }
      })
    : null

  // Local preview of the resolution (same logic as the store's resolveDogfightChecks)
  const resolved = checkResults ? resolveDogfightChecks(checkResults) : null

  const handleConfirmCheck = () => setPhase('result')

  const handleAdvance = () => {
    advanceDogfightMicroRound(groupId, checkResults)
    closeModal()
  }

  const isLastRound = group.microRound >= 6

  return (
    <Modal
      title={`⚔ DOGFIGHT — MICRO-ROUND ${group.microRound}/6`}
      onClose={closeModal}
      width="max-w-xl"
    >
      <div className="space-y-4">

        {/* Participants */}
        <div className="flex items-center gap-2 flex-wrap">
          {groupShips.map((s, i) => (
            <span key={s.id} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-slate-600 font-mono text-xs">↔</span>}
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-slate-300 font-mono text-xs">{s.profile.name}</span>
            </span>
          ))}
        </div>

        {/* Previous round advantage banner */}
        {group.roundWinnerId && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded px-3 py-1.5 font-mono text-xs text-amber-400">
            ↑ Round {group.microRound - 1}:{' '}
            {ships.find((s) => s.id === group.roundWinnerId)?.profile.name ?? '—'}
            {' '}vince con margine +{group.roundWinnerMargin} — bonus al check corrente.
          </div>
        )}

        {/* ── PHASE: ROLLING ── */}
        {phase === 'rolling' && (
          <>
            <p className="text-slate-500 font-mono text-xs">
              2D6 + Pilot + Tonnage + Thrust + DM round precedente // MgT2e CRB p.138
            </p>

            <div className="space-y-3">
              {groupShips.map((ship) => (
                <ShipCheckRow
                  key={ship.id}
                  ship={ship}
                  dms={computeShipDMs(ship, groupShips, group)}
                  dice={rolls[ship.id]}
                  onDice={(d) => setRoll(ship.id, d)}
                />
              ))}
            </div>

            <button
              onClick={handleConfirmCheck}
              disabled={!allRolled}
              className="w-full py-2 bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono text-xs tracking-widest rounded hover:bg-amber-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              CONFERMA CHECK →
            </button>
          </>
        )}

        {/* ── PHASE: RESULT ── */}
        {phase === 'result' && resolved && (
          <>
            {/* Per-ship check totals + attack DMs */}
            <div className="space-y-2">
              {checkResults.map(({ shipId, total }) => {
                const ship = groupShips.find((s) => s.id === shipId)
                if (!ship) return null
                const isWinner  = shipId === resolved.winnerId
                const attackDM  = dogfightAttackDM(shipId, resolved.winnerId)
                return (
                  <div
                    key={shipId}
                    className={`flex items-center gap-3 rounded px-3 py-2 border ${
                      resolved.tied
                        ? 'bg-slate-800 border-slate-700'
                        : isWinner
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-slate-800/50 border-slate-700/50'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: ship.color }}
                    />
                    <span className={`font-mono text-xs flex-1 min-w-0 truncate ${
                      isWinner && !resolved.tied ? 'text-amber-200' : 'text-slate-300'
                    }`}>
                      {ship.profile.name}
                    </span>
                    <span className="text-[--neon-cyan] font-mono text-sm font-bold w-8 text-right">
                      {total}
                    </span>
                    {!resolved.tied && (
                      <span className={`font-mono text-xs font-bold w-24 text-right shrink-0 ${
                        isWinner ? 'text-amber-300' : 'text-rose-400'
                      }`}>
                        Attacchi {attackDM > 0 ? '+' : ''}{attackDM}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Outcome banner */}
            <div className={`rounded px-3 py-2 font-mono text-xs border ${
              resolved.tied
                ? 'bg-slate-700/40 border-slate-600 text-slate-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              {resolved.tied
                ? '◦ PARITÀ — armi fisse non sparano; torrette OK. Nessun DM posizionale.'
                : `⚔ ${ships.find((s) => s.id === resolved.winnerId)?.profile.name ?? '—'} domina (+${resolved.margin}). Vantaggio portato al prossimo round.`
              }
            </div>

            {/* Attack DM reminder */}
            {!resolved.tied && (
              <p className="text-slate-500 font-mono text-xs">
                Applica i DM attacco sopra all&apos;apertura del pannello Attacchi.
              </p>
            )}

            {/* Advance button */}
            <button
              onClick={handleAdvance}
              className="w-full py-2 bg-[--neon-cyan]/10 border border-[--neon-cyan]/40 text-[--neon-cyan] font-mono text-xs tracking-widest rounded hover:bg-[--neon-cyan]/20 transition-colors"
            >
              {isLastRound
                ? 'FINE DOGFIGHT — CHIUDI ⚔'
                : `AVANZA → MICRO-ROUND ${group.microRound + 1}/6`
              }
            </button>
          </>
        )}

      </div>
    </Modal>
  )
}
