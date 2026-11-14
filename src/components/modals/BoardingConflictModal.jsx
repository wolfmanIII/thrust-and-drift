/**
 * BoardingConflictModal — Phase 3: Conflict.
 * GM tracks 3 tactical objectives, rolls stacking checks, missed-shot table,
 * and advances to the outcome phase.
 * @see boarding-system-design.md §3.3, §5.3
 * @see HG 2022 pp.131–133
 */

import { useState } from 'react'
import { Modal }          from './Modal.jsx'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore }     from '../../store/uiStore.js'
import { rollStackingCheck, rollMissedShot } from '../../utils/boarding.js'
import { BoardingRosterPanel } from './BoardingRosterPanel.jsx'
import { useConflictTargeting } from './useConflictTargeting.js'

// ---------------------------------------------------------------------------
// Objective row
// ---------------------------------------------------------------------------

/**
 * @param {{ label: string, desc: string, conquered: boolean, onChange: (v: boolean) => void }} props
 */
function ObjectiveRow({ label, desc, conquered, onChange }) {
  return (
    <button
      onClick={() => onChange(!conquered)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded border transition-colors text-left ${
        conquered
          ? 'bg-emerald-900/30 border-emerald-500'
          : 'bg-slate-800 border-slate-600 hover:border-slate-400'
      }`}
    >
      <span className={`text-lg shrink-0 ${conquered ? 'opacity-100' : 'opacity-40'}`}>
        {conquered ? '✅' : '○'}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`font-mono text-xs font-bold ${conquered ? 'text-emerald-400' : 'text-slate-300'}`}>
          {label}
        </p>
        <p className="text-slate-400 font-mono text-2xs">{desc}</p>
      </div>
      <span className={`font-mono text-xs shrink-0 ${conquered ? 'text-emerald-400' : 'text-slate-400'}`}>
        {conquered ? 'CAPTURED' : 'CONTESTED'}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Roll result badge
// ---------------------------------------------------------------------------

function RollResult({ result }) {
  if (!result) return null
  return (
    <div className="bg-slate-900/60 rounded px-3 py-2 space-y-1">
      <p className="text-slate-400 font-mono text-2xs">
        Dice: [{result.results.join(', ')}] → {result.modified ?? result.total}
      </p>
      <p className={`font-mono text-xs font-bold ${
        result.outcome === 'critical_system' ? 'text-red-400' :
        result.outcome === 'attacker_hit'    ? 'text-amber-400' :
        result.outcome === 'success'          ? 'text-emerald-400' :
        'text-slate-300'
      }`}>
        {result.label}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Resolved target from the rosters
// ---------------------------------------------------------------------------

/**
 * @param {{
 *   dice?: string,
 *   heading: string,
 *   side: 'attacker'|'defender',
 *   boarder: { id: string, name: string }|null,
 *   onDamage: (t: { side: string, boarderId: string }) => void,
 * }} props
 */
function TargetResult({ dice, heading, side, boarder, onDamage }) {
  return (
    <div className="bg-slate-900/60 rounded px-3 py-2 space-y-1" data-testid="conflict-target">
      {dice && <p className="text-slate-400 font-mono text-2xs">Dice: {dice}</p>}
      <p className="text-slate-300 font-mono text-xs">{heading}</p>
      {boarder ? (
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-mono text-xs font-bold flex-1 truncate">
            {boarder.name} <span className="text-slate-400 font-normal">({side === 'attacker' ? 'boarders' : 'defenders'})</span>
          </span>
          <button
            onClick={() => onDamage({ side, boarderId: boarder.id })}
            className="px-2 py-0.5 bg-red-900/30 border border-red-500 text-red-400 hover:bg-red-900/50 font-mono text-2xs rounded transition-colors"
          >
            DAMAGE
          </button>
        </div>
      ) : (
        <p className="text-slate-400 font-mono text-2xs">No living boarders defined on that side — resolve manually.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const OBJECTIVES = [
  { key: 'bridge',      label: 'Bridge',      desc: 'Remote control of all systems' },
  { key: 'engineering', label: 'Engineering', desc: 'Propulsion, reactor, life support' },
  { key: 'turrets',     label: 'Turrets',     desc: 'Weapon systems' },
]

export function BoardingConflictModal() {
  const { activeModal, modalPayload, closeModal } = useUiStore()
  const { ships, boardings, setObjective, advanceBoardingPhase } = useBattleStore()

  const [stackResult, setStackResult]   = useState(null)
  const [missedResult, setMissedResult] = useState(null)
  const [armoredBulkhead, setArmoredBulkhead] = useState(false)
  const [damageTarget, setDamageTarget] = useState(null)

  const boarding = boardings.find(
    (b) => b.id === modalPayload?.boardingId && b.phase === 'conflict' && b.outcome === null,
  )
  const targeting = useConflictTargeting(boarding)

  const isOpen = activeModal === 'boarding-conflict'
  if (!isOpen) return null
  if (!boarding) return null

  const attacker = ships.find((s) => s.id === boarding.attackerId)
  const defender = ships.find((s) => s.id === boarding.defenderId)
  if (!attacker || !defender) return null

  const allConquered = OBJECTIVES.every((o) => boarding.objectives[o.key])

  /** Close and drop the pending damage form so it does not reappear on reopen. */
  function handleClose() {
    setDamageTarget(null)
    closeModal()
  }

  function handleAdvance() {
    advanceBoardingPhase(boarding.id)
    handleClose()
  }

  return (
    <Modal title="⚔ CONFLICT" onClose={handleClose}>
      <div className="space-y-4 min-w-80">

        {/* Ships banner */}
        <div className="flex items-center gap-3 bg-slate-800/60 rounded px-3 py-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: attacker.color }} />
            <span className="text-slate-200 font-mono text-xs font-bold truncate">{attacker.name}</span>
          </div>
          <span className="text-red-400 font-mono text-xs shrink-0">⚔ CONFLICT</span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
            <span className="text-slate-200 font-mono text-xs font-bold truncate">{defender.name}</span>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: defender.color }} />
          </div>
        </div>

        {/* Tactical objectives */}
        <div className="space-y-1.5">
          <p className="text-slate-400 font-mono text-xs uppercase">Tactical objectives</p>
          {OBJECTIVES.map((o) => (
            <ObjectiveRow
              key={o.key}
              label={o.label}
              desc={o.desc}
              conquered={boarding.objectives[o.key]}
              onChange={(v) => setObjective(boarding.id, o.key, v)}
            />
          ))}
          {allConquered && (
            <p className="text-center text-emerald-400 font-mono text-xs py-1 font-bold">
              ✅ SHIP TAKEN — all objectives captured
            </p>
          )}
        </div>

        {/* GM-defined rosters for both sides (CRB p.77, HG p.132) */}
        <BoardingRosterPanel
          boarding={boarding}
          attackerName={attacker.name}
          defenderName={defender.name}
          damageTarget={damageTarget}
          setDamageTarget={setDamageTarget}
        />

        {/* Firing side — decides which group is hit by stacking and missed shots */}
        <div className="bg-slate-800/60 rounded px-3 py-2.5 space-y-1.5">
          <p className="text-slate-400 font-mono text-xs uppercase font-bold">Shots fired by</p>
          <div className="flex gap-2">
            {[['attacker', 'BOARDERS'], ['defender', 'DEFENDERS']].map(([side, label]) => (
              <button
                key={side}
                onClick={() => targeting.chooseFiringSide(side)}
                aria-pressed={targeting.firingSide === side}
                className={`flex-1 py-1 font-mono text-xs rounded border transition-colors ${
                  targeting.firingSide === side
                    ? 'bg-(--neon-cyan)/10 border-(--neon-cyan) text-(--neon-cyan)'
                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-slate-400 font-mono text-2xs">
            Front of the {targeting.targetSide === 'attacker' ? 'boarders' : 'defenders'}&apos; line:{' '}
            <span className="text-slate-200">{targeting.frontOfLine?.name ?? '— none defined —'}</span>
          </p>
        </div>

        {/* Stacking check */}
        <div className="bg-slate-800/60 rounded px-3 py-2.5 space-y-2">
          <p className="text-slate-400 font-mono text-xs uppercase font-bold">
            Stacking — targeting non-first combatant
          </p>
          <p className="text-slate-400 font-mono text-2xs">
            To aim at anyone but the front target roll 2D ≥ 10, else the front of the line becomes the target. (HG p.132)
          </p>
          <button
            onClick={() => setStackResult(rollStackingCheck())}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-500 text-slate-200 font-mono text-xs rounded transition-colors"
          >
            ROLL STACKING
          </button>
          {stackResult && (
            <RollResult result={{
              results: stackResult.results,
              total:   stackResult.total,
              outcome: stackResult.success ? 'success' : 'fail',
              label:   stackResult.success
                ? `✅ Success (${stackResult.total}) — target your chosen combatant`
                : `✗ Failure (${stackResult.total}) — first in line becomes the target`,
            }} />
          )}

          <p className="text-slate-400 font-mono text-2xs pt-1">
            Un-aimed attack that hit: roll 2D — 9 or less hits the first in the stack, 10–12 another member. (HG p.132)
          </p>
          <button
            onClick={targeting.rollStackHit}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-500 text-slate-200 font-mono text-xs rounded transition-colors"
          >
            ROLL STACK HIT
          </button>
          {targeting.stackHit && (
            <TargetResult
              dice={`[${targeting.stackHit.results.join(', ')}] → ${targeting.stackHit.total}`}
              heading={targeting.stackHit.total <= 9 ? 'First in the stack is hit' : 'Another member of the group is hit'}
              side={targeting.stackHit.side}
              boarder={targeting.stackHit.boarder}
              onDamage={setDamageTarget}
            />
          )}
        </div>

        {/* Missed shot table */}
        <div className="bg-slate-800/60 rounded px-3 py-2.5 space-y-2">
          <p className="text-slate-400 font-mono text-xs uppercase font-bold">
            Missed shot — where does the bullet go?
          </p>
          <p className="text-slate-400 font-mono text-2xs">
            Every missed attack rolls 2D on this table. (HG p.133)
          </p>
          <label className="flex items-center gap-2 text-slate-400 font-mono text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={armoredBulkhead}
              onChange={(e) => setArmoredBulkhead(e.target.checked)}
              className="accent-(--neon-cyan)"
            />
            Armored bulkhead (DM −1)
          </label>
          <button
            onClick={() => {
              const result = rollMissedShot(armoredBulkhead)
              setMissedResult(result)
              targeting.resolveMissedShot(result.outcome)
            }}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-500 text-slate-200 font-mono text-xs rounded transition-colors"
          >
            ROLL MISSED SHOT
          </button>
          {missedResult && <RollResult result={missedResult} />}
          {missedResult && targeting.missedMember && (
            <TargetResult
              heading="Random member struck — roll 8+ to hit"
              side={targeting.missedMember.side}
              boarder={targeting.missedMember.boarder}
              onDamage={setDamageTarget}
            />
          )}
        </div>

        {/* Weapon DM reminder */}
        <div className="bg-slate-900/40 rounded px-3 py-2">
          <p className="text-slate-400 font-mono text-2xs uppercase mb-1">Weapon DM in tight spaces</p>
          <p className="text-slate-400 font-mono text-xs">Rifles −2 · Heavy weapons −4 · Grenades → 6D+</p>
        </div>

        {/* Advance to security */}
        <button
          onClick={handleAdvance}
          className="w-full py-2 bg-(--neon-cyan)/10 hover:bg-(--neon-cyan)/20 border border-(--neon-cyan) text-(--neon-cyan) font-mono text-xs rounded transition-colors"
        >
          END CONFLICT — ADVANCE TO SECURITY →
        </button>

      </div>
    </Modal>
  )
}
