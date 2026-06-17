/**
 * DogfightNotificationModal — shown when useDogfightDetection detects hostile ships in the same hex.
 * GM declares each ship's intent (engage / evade) then resolves pursuit check if intents differ.
 * Processes one detected group at a time; calls onDone when all groups are resolved.
 * // MgT2e CRB p.138 §2.1 — Dogfight engagement; §3.1 — Pursuit check
 */

import { useState, useEffect } from 'react'
import { Modal } from './Modal.jsx'
import { DiceInput } from '../forms/DiceInput.jsx'
import { useBattleStore } from '../../store/battleStore.js'
import { getEffectiveSkill } from '../../utils/crew.js'
import { getTonnageDM, rollDogfightPilot } from '../../utils/dogfight.js'

// ── Sub-component: single-ship pursuit-check row ───────────────────────────

/**
 * @param {{
 *   label: string,
 *   ship: object,
 *   pilotSkill: number,
 *   tonnageDM: number,
 *   thrustFree: number,
 *   dice: object|null,
 *   onDice: (roll: object|null) => void,
 * }} props
 */
function PursuitRow({ label, ship, pilotSkill, tonnageDM, thrustFree, dice, onDice }) {
  const previewTotal = dice !== null ? dice.total + pilotSkill + tonnageDM + thrustFree : null

  return (
    <div className="bg-slate-800/80 rounded px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ship.color }} />
        <span className="text-slate-300 font-mono text-xs font-bold">
          {label}: {ship.profile.name}
        </span>
      </div>
      <p className="text-slate-400 font-mono text-xs">
        Pilot {pilotSkill >= 0 ? '+' : ''}{pilotSkill}
        {' / '}
        Tonnage {tonnageDM >= 0 ? '+' : ''}{tonnageDM}
        {' / '}
        Thrust libero +{Math.max(0, thrustFree)}
      </p>
      <div className="flex items-center gap-3">
        <DiceInput value={null} onChange={onDice} />
        {previewTotal !== null && (
          <span className="text-(--neon-cyan) font-mono text-sm font-bold">= {previewTotal}</span>
        )}
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

/**
 * @param {{
 *   groups: { shipIds: string[] }[],
 *   onDone: () => void,
 * }} props
 * groups — from detectDogfightGroups; each entry has shipIds of co-located hostile ships.
 * onDone — called when all groups have been processed (or modal dismissed).
 *
 * Multi-faction 3+ ship groups with mixed intent are simplified: pursuer-wins → all enter
 * dogfight; evader-wins → no dogfight for this group.
 */
export function DogfightNotificationModal({ groups, onDone }) {
  const ships         = useBattleStore((s) => s.ships)
  const startDogfight = useBattleStore((s) => s.startDogfight)

  const [groupIdx, setGroupIdx]       = useState(0)
  const [intents, setIntents]         = useState({})     // { [shipId]: true | false }
  const [phase, setPhase]             = useState('intent') // 'intent' | 'pursuit' | 'resolved'
  const [pursuitDice, setPursuitDice] = useState({})     // { [shipId]: DiceRoll | null }
  const [outcome, setOutcome]         = useState(null)   // 'dogfight' | 'shortrange'
  const [pursuitData, setPursuitData] = useState(null)   // computed check result

  const safeIdx    = Math.min(groupIdx, groups.length - 1)
  const group      = groups[safeIdx]
  if (!group) return null   // groups became empty (e.g. after undo)
  const groupShips = group.shipIds
    .map((id) => ships.find((s) => s.id === id))
    .filter(Boolean)
  const total = groups.length

  // Reset local state when moving to a new group
  useEffect(() => {
    setIntents({})
    setPhase('intent')
    setPursuitDice({})
    setOutcome(null)
    setPursuitData(null)
  }, [groupIdx])

  const setIntent = (shipId, value) =>
    setIntents((prev) => ({ ...prev, [shipId]: value }))

  const allIntentsSet = groupShips.every((s) => intents[s.id] !== undefined)
  const pursuers      = groupShips.filter((s) => intents[s.id] === true)
  const evaders       = groupShips.filter((s) => intents[s.id] === false)

  // Best representative per side (highest pilot skill → best check odds)
  const bestOf = (list) =>
    list.reduce((best, s) => {
      const sk = getEffectiveSkill(s.profile.crew, s.crewAssignments, 'pilot')
      return !best || sk > getEffectiveSkill(best.profile.crew, best.crewAssignments, 'pilot') ? s : best
    }, null)
  const bestPursuer = bestOf(pursuers)
  const bestEvader  = bestOf(evaders)

  // DM helpers
  const shipDMs = (ship) => ({
    pilotSkill: getEffectiveSkill(ship.profile.crew, ship.crewAssignments, 'pilot'),
    tonnageDM:  getTonnageDM(ship.profile.tonnage),
    thrustFree: Math.max(0, (ship.profile.thrust ?? 0) - (ship.thrustUsedThisRound ?? 0)),
  })

  // Compute pursuit result when both dice entered
  const pursuerDice = bestPursuer ? (pursuitDice[bestPursuer.id] ?? null) : null
  const evaderDice  = bestEvader  ? (pursuitDice[bestEvader.id]  ?? null) : null
  const bothEntered = pursuerDice !== null && evaderDice !== null

  const computedCheck = bothEntered && bestPursuer && bestEvader
    ? (() => {
        const pd = shipDMs(bestPursuer)
        const ed = shipDMs(bestEvader)
        const pResult = rollDogfightPilot({
          pilotSkill: pd.pilotSkill,
          tonnage:    bestPursuer.profile.tonnage,
          thrustDM:   pd.thrustFree,
          diceOverride: pursuerDice,
        })
        const eResult = rollDogfightPilot({
          pilotSkill: ed.pilotSkill,
          tonnage:    bestEvader.profile.tonnage,
          thrustDM:   ed.thrustFree,
          diceOverride: evaderDice,
        })
        const pursuerWins = pResult.total > eResult.total
        return {
          pursuerTotal: pResult.total,
          evaderTotal:  eResult.total,
          pursuerWins,
          margin: Math.abs(pResult.total - eResult.total),
        }
      })()
    : null

  // ── Handlers ──

  const handleIntentConfirm = () => {
    if (!allIntentsSet) return
    if (evaders.length === 0) {
      setOutcome('dogfight')
      setPhase('resolved')
    } else if (pursuers.length === 0) {
      setOutcome('shortrange')
      setPhase('resolved')
    } else {
      setPhase('pursuit')
    }
  }

  const handlePursuitConfirm = () => {
    if (!computedCheck) return
    setPursuitData(computedCheck)
    setOutcome(computedCheck.pursuerWins ? 'dogfight' : 'shortrange')
    setPhase('resolved')
  }

  const handleAdvance = () => {
    if (outcome === 'dogfight') {
      startDogfight(group.shipIds)
    }
    if (groupIdx + 1 < total) {
      setGroupIdx((i) => i + 1)
    } else {
      onDone()
    }
  }

  // ── Title ──

  const modalTitle = total > 1
    ? `⚔️ CONTATTO RAVVICINATO — ${groupIdx + 1}/${total}`
    : '⚔️ CONTATTO RAVVICINATO'

  // ── Render ──

  return (
    <Modal title={modalTitle} onClose={onDone} width="max-w-lg">
      <div className="space-y-4">

        {/* Ships involved */}
        <p className="text-slate-400 font-mono text-xs">
          {groupShips.map((s) => s.profile.name).join(' e ')} si trovano nella stessa cella.
        </p>

        {/* ── PHASE: INTENT ── */}
        {phase === 'intent' && (
          <>
            <div className="space-y-2">
              {groupShips.map((ship) => (
                <div
                  key={ship.id}
                  className="flex items-center gap-2 bg-slate-800 rounded px-3 py-2"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: ship.color }}
                  />
                  <span className="text-slate-200 font-mono text-xs flex-1 min-w-0 truncate">
                    {ship.profile.name}
                  </span>
                  <span className="text-slate-400 font-mono text-xs shrink-0">
                    [{ship.faction}]
                  </span>
                  <span className="text-slate-400 font-mono text-xs shrink-0 ml-1">
                    dogfight?
                  </span>
                  <button
                    onClick={() => setIntent(ship.id, true)}
                    className={`px-2.5 py-1 font-mono text-xs rounded border transition-colors ${
                      intents[ship.id] === true
                        ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                        : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                    }`}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setIntent(ship.id, false)}
                    className={`px-2.5 py-1 font-mono text-xs rounded border transition-colors ${
                      intents[ship.id] === false
                        ? 'bg-slate-600/40 border-slate-400/50 text-slate-300'
                        : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                    }`}
                  >
                    NO
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleIntentConfirm}
              disabled={!allIntentsSet}
              className="w-full py-2 bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono text-xs tracking-widest rounded hover:bg-amber-500/20 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
            >
              CONFIRM INTENTS →
            </button>
          </>
        )}

        {/* ── PHASE: PURSUIT ── */}
        {phase === 'pursuit' && bestPursuer && bestEvader && (
          <>
            <p className="text-amber-400 font-mono text-xs tracking-wider uppercase">
              Pursuit check — one party wants to avoid contact
            </p>
            <p className="text-slate-400 font-mono text-xs">
              Formula: 2D6 + Pilot + Tonnage DM + Thrust libero // MgT2e CRB p.138
            </p>

            <div className="space-y-3">
              <PursuitRow
                label="Pursuer"
                ship={bestPursuer}
                {...shipDMs(bestPursuer)}
                dice={pursuitDice[bestPursuer.id] ?? null}
                onDice={(d) => setPursuitDice((prev) => ({ ...prev, [bestPursuer.id]: d }))}
              />
              <PursuitRow
                label="Evader"
                ship={bestEvader}
                {...shipDMs(bestEvader)}
                dice={pursuitDice[bestEvader.id] ?? null}
                onDice={(d) => setPursuitDice((prev) => ({ ...prev, [bestEvader.id]: d }))}
              />
            </div>

            {/* Live result preview */}
            {computedCheck && (
              <div className={`rounded px-3 py-2 font-mono text-xs border ${
                computedCheck.pursuerWins
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-slate-700/40 border-slate-600 text-slate-300'
              }`}>
                {computedCheck.pursuerWins
                  ? `PURSUER WINS (+${computedCheck.margin}) — DOGFIGHT ACTIVE`
                  : `FUGGITIVO EVADE (+${computedCheck.margin === 0 ? 0 : computedCheck.margin}) — SHORT RANGE`
                }
              </div>
            )}

            <button
              onClick={handlePursuitConfirm}
              disabled={!computedCheck}
              className="w-full py-2 bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono text-xs tracking-widest rounded hover:bg-amber-500/20 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
            >
              CONFIRM CHECK →
            </button>
          </>
        )}

        {/* ── PHASE: RESOLVED ── */}
        {phase === 'resolved' && (
          <>
            {/* Pursuit summary if applicable */}
            {pursuitData && (
              <div className="text-slate-400 font-mono text-xs space-y-0.5">
                <p>
                  Pursuer: <span className="text-slate-300">{pursuitData.pursuerTotal}</span>
                  {' — '}
                  Evader: <span className="text-slate-300">{pursuitData.evaderTotal}</span>
                </p>
              </div>
            )}

            <div className={`rounded px-3 py-2.5 font-mono text-xs border ${
              outcome === 'dogfight'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-slate-700/40 border-slate-600 text-slate-400'
            }`}>
              {outcome === 'dogfight'
                ? '⚔️ DOGFIGHT ACTIVE — close-quarters combat engaged.'
                : '▸ SHORT RANGE — no engagement. Effective distance: 1 hex.'
              }
            </div>

            <button
              onClick={handleAdvance}
              className="w-full py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-xs tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors"
            >
              {groupIdx + 1 < total ? `NEXT CONTACT (${groupIdx + 2}/${total}) →` : 'CONFIRM →'}
            </button>
          </>
        )}

      </div>
    </Modal>
  )
}
