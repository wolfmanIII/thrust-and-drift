/**
 * DogfightRoundModal — resolves one dogfight micro-round.
 * Flow: declare (escape intent) → escapeCheck (if needed) → rolling (Pilot checks) → result.
 * Opened by the HUD dogfight tracker; receives groupId via uiStore modalPayload.
 * // MgT2e CRB p.138 §6 — Dogfight micro-round mechanics; §6.4 — Escape
 */

import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { DiceInput } from '../forms/DiceInput.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { getEffectiveSkill } from '../../utils/crew.js'
import {
  getTonnageDM,
  rollDogfightPilot,
  resolveDogfightChecks,
  dogfightAttackDM,
  canEscape,
} from '../../utils/dogfight.js'

// ── DM helpers ──────────────────────────────────────────────────────────────

/**
 * Compute Pilot check DMs for a ship in a dogfight micro-round.
 * // MgT2e CRB p.138 §6.1
 */
function computeShipDMs(ship, groupShips, group) {
  const pilotSkill    = getEffectiveSkill(ship.profile.crew, ship.crewAssignments, 'pilot')
  const tonnageDM     = getTonnageDM(ship.profile.tonnage)
  const thrustDM      = Math.max(0, (ship.profile.thrust ?? 0) - (ship.thrustUsedThisRound ?? 0))
  const enemies       = groupShips.filter((s) => s.faction !== ship.faction)
  const extraEnemyDM  = -(Math.max(0, enemies.length - 1))
  const prevRoundBonus = ship.id === group.roundWinnerId ? group.roundWinnerMargin : 0
  return { pilotSkill, tonnageDM, thrustDM, extraEnemyDM, prevRoundBonus }
}

/** Best pilot among a list of ships (for representative checks). */
function bestPilot(shipList) {
  return shipList.reduce((best, s) => {
    const sk = getEffectiveSkill(s.profile.crew, s.crewAssignments, 'pilot')
    return !best || sk > getEffectiveSkill(best.profile.crew, best.crewAssignments, 'pilot') ? s : best
  }, null)
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ShipCheckRow({ ship, dms, dice, onDice }) {
  const { pilotSkill, tonnageDM, thrustDM, extraEnemyDM, prevRoundBonus } = dms
  const total = dice !== null
    ? dice.total + pilotSkill + tonnageDM + thrustDM + extraEnemyDM + prevRoundBonus
    : null

  const dmParts = [
    `Pilot ${pilotSkill >= 0 ? '+' : ''}${pilotSkill}`,
    `Tonnage ${tonnageDM >= 0 ? '+' : ''}${tonnageDM}`,
    `Thrust +${thrustDM}`,
    extraEnemyDM < 0 && `Extra enemies ${extraEnemyDM}`,
    prevRoundBonus > 0 && `Bonus round +${prevRoundBonus}`,
  ].filter(Boolean).join(' / ')

  return (
    <div className="bg-slate-800/80 rounded px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ship.color }} />
        <span className="text-slate-200 font-mono text-xs font-bold flex-1 min-w-0 truncate">
          {ship.profile.name}
        </span>
        <span className="text-slate-400 font-mono text-xs shrink-0">[{ship.faction}]</span>
      </div>
      <p className="text-slate-400 font-mono text-xs">{dmParts}</p>
      <div className="flex items-center gap-3">
        <DiceInput value={null} onChange={onDice} />
        {total !== null && (
          <span className="text-(--neon-cyan) font-mono text-sm font-bold">= {total}</span>
        )}
      </div>
    </div>
  )
}

/**
 * Compute escape check totals via rollDogfightPilot — single source of truth for
 * both the live preview (EscapeCheckRow) and the commit handler (handleEscapeCheckConfirm).
 * // MgT2e CRB p.138 §3.1
 * @returns {{ fleeTotal: number, pursuerTotal: number, escaped: boolean|null } | null}
 */
function escapeCheckTotals(ship, pursuer, fleeDice, pursuerDice) {
  if (!fleeDice) return null
  const freeThrust = (s) => Math.max(0, (s.profile.thrust ?? 0) - (s.thrustUsedThisRound ?? 0))
  const fleeResult = rollDogfightPilot({
    pilotSkill:   getEffectiveSkill(ship.profile.crew, ship.crewAssignments, 'pilot'),
    tonnage:      ship.profile.tonnage,
    thrustDM:     freeThrust(ship),
    diceOverride: fleeDice,
  })
  if (!pursuer) {
    return { fleeTotal: fleeResult.total, pursuerTotal: 0, escaped: true }
  }
  if (!pursuerDice) {
    // Flee total known, pursuer roll not yet entered — partial result (no verdict yet)
    return { fleeTotal: fleeResult.total, pursuerTotal: null, escaped: null }
  }
  const pursuerResult = rollDogfightPilot({
    pilotSkill:   getEffectiveSkill(pursuer.profile.crew, pursuer.crewAssignments, 'pilot'),
    tonnage:      pursuer.profile.tonnage,
    thrustDM:     freeThrust(pursuer),
    diceOverride: pursuerDice,
  })
  return {
    fleeTotal:    fleeResult.total,
    pursuerTotal: pursuerResult.total,
    escaped:      fleeResult.total > pursuerResult.total,
  }
}

/**
 * One escape check row: fuggitivo dice + inseguitore dice, shows result live.
 * Receives precomputed totals from the parent via escapeCheckTotals — no inline calculation.
 * // MgT2e CRB p.138 §3.1 — same pursuit formula as initial engagement
 */
function EscapeCheckRow({ ship, pursuer, totals, onFleeRoll, onPursuerRoll }) {
  const freeThrust = (s) => Math.max(0, (s.profile.thrust ?? 0) - (s.thrustUsedThisRound ?? 0))
  const fleeDMs = {
    pilot:   getEffectiveSkill(ship.profile.crew, ship.crewAssignments, 'pilot'),
    tonnage: getTonnageDM(ship.profile.tonnage),
    thrust:  freeThrust(ship),
  }
  const pursuerDMs = pursuer ? {
    pilot:   getEffectiveSkill(pursuer.profile.crew, pursuer.crewAssignments, 'pilot'),
    tonnage: getTonnageDM(pursuer.profile.tonnage),
    thrust:  freeThrust(pursuer),
  } : null

  const { fleeTotal = null, pursuerTotal = null, escaped = null } = totals ?? {}
  const resolved = escaped !== null
    ? { escaped, margin: Math.abs((fleeTotal ?? 0) - (pursuerTotal ?? 0)) }
    : null

  return (
    <div className="bg-slate-800/80 rounded px-3 py-2.5 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ship.color }} />
        <span className="text-slate-200 font-mono text-xs font-bold">{ship.profile.name}</span>
        <span className="text-slate-400 font-mono text-xs">attempts escape</span>
      </div>

      {/* Evader row */}
      <div className="flex items-center gap-2 pl-2">
        <span className="text-slate-400 font-mono text-xs w-20 shrink-0">Evader</span>
        <span className="text-slate-400 font-mono text-xs">
          P{fleeDMs.pilot >= 0 ? '+' : ''}{fleeDMs.pilot} / T{fleeDMs.tonnage >= 0 ? '+' : ''}{fleeDMs.tonnage} / Thr+{fleeDMs.thrust}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <DiceInput value={null} onChange={onFleeRoll} />
          {fleeTotal !== null && (
            <span className="text-(--neon-cyan) font-mono text-sm font-bold w-6 text-right">{fleeTotal}</span>
          )}
        </div>
      </div>

      {/* Pursuer row */}
      {pursuer && pursuerDMs && (
        <div className="flex items-center gap-2 pl-2">
          <span className="text-slate-400 font-mono text-xs w-20 shrink-0">
            <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ backgroundColor: pursuer.color }} />
            Pursuer
          </span>
          <span className="text-slate-400 font-mono text-xs">
            P{pursuerDMs.pilot >= 0 ? '+' : ''}{pursuerDMs.pilot} / T{pursuerDMs.tonnage >= 0 ? '+' : ''}{pursuerDMs.tonnage} / Thr+{pursuerDMs.thrust}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <DiceInput value={null} onChange={onPursuerRoll} />
            {pursuerTotal !== null && (
              <span className="text-(--neon-cyan) font-mono text-sm font-bold w-6 text-right">{pursuerTotal}</span>
            )}
          </div>
        </div>
      )}

      {/* Live result */}
      {resolved && (
        <div className={`rounded px-2 py-1 font-mono text-xs border ${
          resolved.escaped
            ? 'bg-slate-700/40 border-slate-500 text-slate-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          {resolved.escaped
            ? `◦ ESCAPED (+${resolved.margin}) — leaves the dogfight.`
            : `⚔ CAUGHT (+${resolved.margin}) — remains in dogfight.`
          }
        </div>
      )}
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
  const escapeDogfight            = useBattleStore((s) => s.escapeDogfight)

  const group      = dogfights.find((g) => g.id === groupId && g.active) ?? null
  const groupShips = group
    ? group.shipIds.map((id) => ships.find((s) => s.id === id)).filter(Boolean)
    : []

  // ── Phase state ──
  // 'declare' → ['escapeCheck'] → 'rolling' → 'result'
  const [phase, setPhase] = useState('declare')

  // declare phase
  const [fleeingIds, setFleeingIds]             = useState(new Set())
  const [enemiesNotPursuing, setEnemiesNotPursuing] = useState(new Set())

  // escapeCheck phase
  // { [shipId]: { fleeRoll: DiceRoll|null, pursuerRoll: DiceRoll|null } }
  const [escapeDice, setEscapeDice] = useState({})
  // { [shipId]: { escaped: boolean, fleeTotal: number, pursuerTotal: number } }
  const [escapeOutcomes, setEscapeOutcomes] = useState({})

  // rolling phase
  const [rolls, setRolls] = useState(() => {
    const map = {}
    if (group) group.shipIds.forEach((id) => { map[id] = null })
    return map
  })

  if (!group) return null

  // ── Derived: declare phase ──

  const getEnemies    = (ship) => groupShips.filter((s) => s.faction !== ship.faction)
  const getEnemyThrusts = (ship) => getEnemies(ship).map((s) => s.profile.thrust ?? 0)

  const isAutoEscape = (ship) =>
    enemiesNotPursuing.has(ship.id) ||
    canEscape(ship.profile.thrust ?? 0, getEnemyThrusts(ship))

  const fleeingShips     = groupShips.filter((s) => fleeingIds.has(s.id))
  const needsCheck       = fleeingShips.filter((s) => !isAutoEscape(s))
  const autoEscapeShips  = fleeingShips.filter((s) => isAutoEscape(s))

  const toggleFleeing = (shipId) =>
    setFleeingIds((prev) => {
      const next = new Set(prev)
      next.has(shipId) ? next.delete(shipId) : next.add(shipId)
      return next
    })

  const toggleEnemiesNotPursuing = (shipId) =>
    setEnemiesNotPursuing((prev) => {
      const next = new Set(prev)
      next.has(shipId) ? next.delete(shipId) : next.add(shipId)
      return next
    })

  const handleDeclareConfirm = () => {
    if (fleeingIds.size === 0) {
      setPhase('rolling')
      return
    }

    // Resolve auto-escapes immediately
    for (const ship of autoEscapeShips) {
      escapeDogfight(ship.id, groupId)
    }

    // Check if group still active after auto-escapes
    const activeGroup = useBattleStore.getState().dogfights.find((g) => g.id === groupId && g.active)
    if (!activeGroup) { closeModal(); return }

    if (needsCheck.length > 0) {
      const initial = {}
      needsCheck.forEach((s) => { initial[s.id] = { fleeRoll: null, pursuerRoll: null } })
      setEscapeDice(initial)
      setPhase('escapeCheck')
    } else {
      setPhase('rolling')
    }
  }

  // ── Derived: escapeCheck phase ──

  const allEscapeChecksEntered = needsCheck.every((s) => {
    const d = escapeDice[s.id]
    const enemies = getEnemies(s)
    // If no enemies remain (all escaped), fuggitivo auto-escapes — no pursuer roll needed
    return d?.fleeRoll !== null && (enemies.length === 0 || d?.pursuerRoll !== null)
  })

  const computeEscape = (ship) => {
    const d = escapeDice[ship.id]
    if (!d?.fleeRoll) return null
    const enemies = getEnemies(ship)
    const pursuer = enemies.length > 0 ? bestPilot(enemies) : null
    return escapeCheckTotals(ship, pursuer, d.fleeRoll, d.pursuerRoll)
  }

  const setEscapeDiceFor = (shipId, key, roll) =>
    setEscapeDice((prev) => ({ ...prev, [shipId]: { ...prev[shipId], [key]: roll } }))

  const handleEscapeCheckConfirm = () => {
    const outcomes = {}
    for (const ship of needsCheck) {
      const result = computeEscape(ship)
      if (!result) continue
      outcomes[ship.id] = result
      if (result.escaped) escapeDogfight(ship.id, groupId)
    }
    setEscapeOutcomes(outcomes)

    const activeGroup = useBattleStore.getState().dogfights.find((g) => g.id === groupId && g.active)
    if (!activeGroup) { closeModal(); return }

    setPhase('rolling')
  }

  // ── Derived: rolling phase ──
  // groupShips is re-derived from store each render — reflects post-escape membership

  const activeGroupShips = group.shipIds
    .map((id) => ships.find((s) => s.id === id))
    .filter(Boolean)

  const setRoll = (shipId, dice) =>
    setRolls((prev) => ({ ...prev, [shipId]: dice }))

  const allRolled = activeGroupShips.every((s) => rolls[s.id] !== null)

  const checkResults = allRolled
    ? activeGroupShips.map((s) => {
        const dms  = computeShipDMs(s, activeGroupShips, group)
        const dice = rolls[s.id]
        const total = dice.total + dms.pilotSkill + dms.tonnageDM + dms.thrustDM + dms.extraEnemyDM + dms.prevRoundBonus
        return { shipId: s.id, total }
      })
    : null

  const resolved = checkResults ? resolveDogfightChecks(checkResults) : null

  const handleAdvance = () => {
    advanceDogfightMicroRound(groupId, checkResults)
    closeModal()
  }

  const isLastRound = group.microRound >= 6

  // ── Shared header ──

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
              {i > 0 && <span className="text-slate-400 font-mono text-xs">↔</span>}
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-slate-300 font-mono text-xs">{s.profile.name}</span>
            </span>
          ))}
        </div>

        {/* Previous round advantage */}
        {group.roundWinnerId && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded px-3 py-1.5 font-mono text-xs text-amber-400">
            ↑ Round {group.microRound - 1}:{' '}
            {ships.find((s) => s.id === group.roundWinnerId)?.profile.name ?? '—'}
            {' '}+{group.roundWinnerMargin} — bonus to current check.
          </div>
        )}

        {/* ── PHASE: DECLARE ── */}
        {phase === 'declare' && (
          <>
            <p className="text-slate-400 font-mono text-xs">
              Dichiara le intenzioni di fuga prima del check Pilot. // MgT2e CRB p.138 §6.4
            </p>
            <div className="space-y-2">
              {groupShips.map((ship) => {
                const autoOk   = isAutoEscape(ship)
                const isFleeing = fleeingIds.has(ship.id)
                const notPursued = enemiesNotPursuing.has(ship.id)
                const enemyThrusts = getEnemyThrusts(ship)
                const thrustAdvantage = canEscape(ship.profile.thrust ?? 0, enemyThrusts)
                return (
                  <div key={ship.id} className="bg-slate-800 rounded px-3 py-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ship.color }} />
                      <span className="text-slate-200 font-mono text-xs flex-1 truncate">{ship.profile.name}</span>
                      <span className="text-slate-400 font-mono text-xs shrink-0">
                        Thrust {ship.profile.thrust} vs max {enemyThrusts.length > 0 ? Math.max(...enemyThrusts) : '—'}
                      </span>
                      <button
                        onClick={() => toggleFleeing(ship.id)}
                        className={`px-2.5 py-1 font-mono text-xs rounded border transition-colors shrink-0 ${
                          isFleeing
                            ? 'bg-slate-600/40 border-slate-400/50 text-slate-300'
                            : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {isFleeing ? '↩ FLEE' : 'STAY'}
                      </button>
                    </div>
                    {isFleeing && (
                      <div className="flex items-center gap-2 pl-4">
                        {thrustAdvantage ? (
                          <span className="text-slate-400 font-mono text-xs">
                            ✓ Thrust advantage — automatic escape
                          </span>
                        ) : (
                          <>
                            <span className="text-amber-400/70 font-mono text-xs">
                              {notPursued ? '✓ Enemies not pursuing — automatic escape' : 'Pursuit check required'}
                            </span>
                            <button
                              onClick={() => toggleEnemiesNotPursuing(ship.id)}
                              className={`ml-auto px-2 py-0.5 font-mono text-xs rounded border transition-colors shrink-0 ${
                                notPursued
                                  ? 'bg-slate-600/40 border-slate-500 text-slate-300'
                                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-400'
                              }`}
                            >
                              {notPursued ? 'NOT PURSUING ✓' : 'PURSUING?'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setFleeingIds(new Set()); setPhase('rolling') }}
                className="flex-1 py-2 border border-slate-600 text-slate-400 font-mono text-xs tracking-widest rounded hover:border-slate-500 transition-colors"
              >
                NO ESCAPE →
              </button>
              {fleeingIds.size > 0 && (
                <button
                  onClick={handleDeclareConfirm}
                  className="flex-1 py-2 bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono text-xs tracking-widest rounded hover:bg-amber-500/20 transition-colors"
                >
                  CONFIRM ESCAPE →
                </button>
              )}
            </div>
          </>
        )}

        {/* ── PHASE: ESCAPE CHECK ── */}
        {phase === 'escapeCheck' && (
          <>
            <p className="text-amber-400 font-mono text-xs tracking-wider uppercase">
              Pursuit check // §3.1 — 2D6 + Pilot + Tonnage + free Thrust
            </p>
            <div className="space-y-3">
              {needsCheck.map((ship) => {
                const enemies  = getEnemies(ship)
                const pursuer  = bestPilot(enemies)
                const d        = escapeDice[ship.id] ?? { fleeRoll: null, pursuerRoll: null }
                return (
                  <EscapeCheckRow
                    key={ship.id}
                    ship={ship}
                    pursuer={pursuer}
                    totals={escapeCheckTotals(ship, pursuer, d.fleeRoll, d.pursuerRoll)}
                    onFleeRoll={(r) => setEscapeDiceFor(ship.id, 'fleeRoll', r)}
                    onPursuerRoll={(r) => setEscapeDiceFor(ship.id, 'pursuerRoll', r)}
                  />
                )
              })}
            </div>
            <button
              onClick={handleEscapeCheckConfirm}
              disabled={!allEscapeChecksEntered}
              className="w-full py-2 bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono text-xs tracking-widest rounded hover:bg-amber-500/20 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
            >
              CONFIRM PURSUIT CHECK →
            </button>
          </>
        )}

        {/* ── PHASE: ROLLING ── */}
        {phase === 'rolling' && (
          <>
            {/* Escape outcomes summary if any */}
            {Object.keys(escapeOutcomes).length > 0 && (
              <div className="space-y-1">
                {Object.entries(escapeOutcomes).map(([shipId, outcome]) => {
                  const ship = ships.find((s) => s.id === shipId)
                  return (
                    <div key={shipId} className={`rounded px-2 py-1 font-mono text-xs border ${
                      outcome.escaped
                        ? 'bg-slate-700/40 border-slate-600 text-slate-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    }`}>
                      {outcome.escaped
                        ? `◦ ${ship?.profile.name ?? shipId} escaped (${outcome.fleeTotal} vs ${outcome.pursuerTotal}).`
                        : `⚔ ${ship?.profile.name ?? shipId} remained in dogfight (${outcome.fleeTotal} vs ${outcome.pursuerTotal}).`
                      }
                    </div>
                  )
                })}
              </div>
            )}

            <p className="text-slate-400 font-mono text-xs">
              2D6 + Pilot + Tonnage + Thrust + DM round precedente // MgT2e CRB p.138
            </p>
            <div className="space-y-3">
              {activeGroupShips.map((ship) => (
                <ShipCheckRow
                  key={ship.id}
                  ship={ship}
                  dms={computeShipDMs(ship, activeGroupShips, group)}
                  dice={rolls[ship.id] ?? null}
                  onDice={(d) => setRoll(ship.id, d)}
                />
              ))}
            </div>
            <button
              onClick={() => setPhase('result')}
              disabled={!allRolled}
              className="w-full py-2 bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono text-xs tracking-widest rounded hover:bg-amber-500/20 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
            >
              CONFIRM CHECK →
            </button>
          </>
        )}

        {/* ── PHASE: RESULT ── */}
        {phase === 'result' && resolved && (
          <>
            <div className="space-y-2">
              {checkResults.map(({ shipId, total }) => {
                const ship     = activeGroupShips.find((s) => s.id === shipId)
                if (!ship) return null
                const isWinner = shipId === resolved.winnerId
                const attackDM = dogfightAttackDM(shipId, resolved.winnerId)
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
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ship.color }} />
                    <span className={`font-mono text-xs flex-1 min-w-0 truncate ${
                      isWinner && !resolved.tied ? 'text-amber-200' : 'text-slate-300'
                    }`}>
                      {ship.profile.name}
                    </span>
                    <span className="text-(--neon-cyan) font-mono text-sm font-bold w-8 text-right">
                      {total}
                    </span>
                    {!resolved.tied && (
                      <span className={`font-mono text-xs font-bold w-24 text-right shrink-0 ${
                        isWinner ? 'text-amber-300' : 'text-rose-400'
                      }`}>
                        Attack DM {attackDM > 0 ? '+' : ''}{attackDM}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className={`rounded px-3 py-2 font-mono text-xs border ${
              resolved.tied
                ? 'bg-slate-700/40 border-slate-600 text-slate-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              {resolved.tied
                ? '◦ TIE — fixed weapons cannot fire; turrets OK. No positional DM.'
                : `⚔ ${ships.find((s) => s.id === resolved.winnerId)?.profile.name ?? '—'} leads (+${resolved.margin}). Advantage carries to the next round.`
              }
            </div>

            {!resolved.tied && (
              <p className="text-slate-400 font-mono text-xs">
                Apply the attack DMs above when opening the Attack panel.
              </p>
            )}

            <button
              onClick={handleAdvance}
              className="w-full py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-xs tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors"
            >
              {isLastRound
                ? 'END DOGFIGHT — CLOSE ⚔'
                : `ADVANCE → MICRO-ROUND ${group.microRound + 1}/6`
              }
            </button>
          </>
        )}

      </div>
    </Modal>
  )
}
