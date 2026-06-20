/**
 * ActionModal — crew actions during the Actions phase.
 * Flow: select crew member → select action → roll → result.
 * // MgT2e CRB p.166–167 — Crew Actions
 */

import { useState, useMemo } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { roll2D6, formatCheckResult } from '../../utils/dice.js'
import { CREW_ACTIONS } from '../../data/crewActions.js'
import { migrateCrew, CREW_SKILLS } from '../../utils/crew.js'
import { DiceInput } from '../forms/DiceInput.jsx'

/**
 * Apply the mechanical effect of a successful action to the battle state.
 */
function useActionEffects() {
  const applySensorLock      = useBattleStore((s) => s.applySensorLock)
  const clearSensorLock      = useBattleStore((s) => s.clearSensorLock)
  const repairCritical       = useBattleStore((s) => s.repairCritical)
  const applyInitiativeBonus = useBattleStore((s) => s.applyInitiativeBonus)
  const overloadDrive        = useBattleStore((s) => s.overloadDrive)
  const reloadTurret         = useBattleStore((s) => s.reloadTurret)
  const applyMissileEW       = useBattleStore((s) => s.applyMissileEW)

  return (actionId, shipId, effect, targetShipId, targetImpactId) => {
    switch (actionId) {
      case 'sensor_lock':
        if (targetShipId) applySensorLock(shipId, targetShipId)
        break
      case 'electronic_warfare':
        clearSensorLock(shipId)
        break
      case 'missile_ew':
        if (targetImpactId) applyMissileEW(shipId, targetImpactId, effect)
        break
      case 'repair_system':
        repairCritical(shipId)
        break
      case 'improve_initiative':
        applyInitiativeBonus(shipId, effect)
        break
      case 'overload_drive':
        overloadDrive(shipId, 1)  // fixed +1 per CRB p.171 — not +Effect
        break
      case 'reload_turret':
        reloadTurret(shipId)
        break
      default:
        break
    }
  }
}

/** Derive available actions for a crew member based on their skills. */
function getActionsForMember(member) {
  return Object.entries(CREW_ACTIONS).flatMap(([role, actions]) => {
    const skillLevel = member.skills[role] ?? 0
    if (skillLevel === 0) return []
    return actions.map((a) => ({ ...a, skillLevel }))
  })
}

/** Compact skill badge list for a crew member row. */
function SkillBadges({ skills }) {
  const present = CREW_SKILLS.filter((s) => (skills[s] ?? 0) > 0)
  if (present.length === 0) return <span className="text-slate-400 font-mono text-xs">no skills</span>
  return (
    <span className="flex flex-wrap gap-1">
      {present.map((s) => (
        <span key={s} className="font-mono text-xs text-slate-400">
          {s} {skills[s]}
        </span>
      ))}
    </span>
  )
}

export function ActionModal() {
  const closeModal   = useUiStore((s) => s.closeModal)
  const modalPayload = useUiStore((s) => s.modalPayload)
  const ships                  = useBattleStore((s) => s.ships)
  const pendingMissileImpacts  = useBattleStore((s) => s.pendingMissileImpacts)
  const missiles               = useBattleStore((s) => s.missiles)
  const addLogEntry            = useBattleStore((s) => s.addLogEntry)
  const markCrewMemberUsed     = useBattleStore((s) => s.markCrewMemberUsed)

  const applyEffect  = useActionEffects()

  const ship = ships.find((s) => s.id === modalPayload?.shipId)

  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [selectedAction, setSelectedAction]     = useState(null)
  const [targetShipId, setTargetShipId]         = useState(null)
  const [targetImpactId, setTargetImpactId]     = useState(null)
  const [rollResult, setRollResult]             = useState(null)
  const [manualDice, setManualDice]             = useState(null)
  const [skillOverride, setSkillOverride]       = useState(null)

  // Memoised — migrateCrew calls uuidv7() so must not run on every render
  const crewArray = useMemo(() => {
    if (!ship) return []
    return Array.isArray(ship.profile.crew)
      ? ship.profile.crew
      : migrateCrew(ship.profile.crew ?? {})
  }, [ship?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ship) return null

  const isPlayer = ship.faction === 'players'

  const usedCrewMembers = ship.usedCrewMembers ?? []
  const availableCrew   = crewArray.filter((m) => !usedCrewMembers.includes(m.id))

  const selectedMember = crewArray.find((m) => m.id === selectedMemberId) ?? null
  const memberActions  = selectedMember ? getActionsForMember(selectedMember) : []
  const otherShips     = ships.filter((s) => s.id !== ship.id)

  const handleSelectMember = (member) => {
    setSelectedMemberId(member.id)
    setSelectedAction(null)
    setRollResult(null)
    setTargetShipId(null)
    setTargetImpactId(null)
  }

  const handleSelectAction = (action) => {
    setSelectedAction(action)
    setRollResult(null)
    setTargetShipId(null)
    setTargetImpactId(null)
    setManualDice(null)
    setSkillOverride(action.skillLevel)
  }

  const handleRoll = () => {
    if (!selectedAction) return
    if (selectedAction.requiresTarget && !targetShipId) return
    if (selectedAction.requiresSalvoTarget && !targetImpactId) return

    let result
    if (selectedAction.difficulty === 'auto') {
      result = { display: 'Automatic', success: true, effect: 0, finalTotal: 8 }
    } else {
      const roll = isPlayer ? manualDice : roll2D6()
      const dm   = skillOverride ?? selectedAction.skillLevel
      result = formatCheckResult(roll, dm, selectedAction.difficulty)
    }

    if (selectedMember) markCrewMemberUsed(ship.id, selectedMember.id)
    setRollResult(result)
    addLogEntry(
      `${ship.profile.name} / ${selectedMember?.name ?? '?'}: ${selectedAction.label} — ${result.display} (${result.success ? 'SUCCESS' : 'FAILED'})`
    )

    if (result.success) {
      applyEffect(selectedAction.id, ship.id, result.effect, targetShipId, targetImpactId)
    }
  }

  const canRoll = selectedAction &&
    (!selectedAction.requiresTarget || targetShipId) &&
    (!selectedAction.requiresSalvoTarget || targetImpactId) &&
    !(isPlayer && selectedAction.difficulty !== 'auto' && !manualDice)

  return (
    <Modal title={`Actions — ${ship.profile.name}`} onClose={closeModal}>
      <div className="space-y-4">

        {/* Roll result view */}
        {rollResult && (
          <div className="space-y-3">
            <div className="bg-slate-800 rounded p-4 text-center font-mono">
              <p className="text-slate-400 text-xs mb-1">
                {selectedMember?.name} — {selectedAction?.label}
              </p>
              <p className="text-slate-300 text-sm">{rollResult.display}</p>
            </div>

            <div className={`text-center py-2 rounded font-mono font-bold text-sm ${
              rollResult.success ? 'bg-green-950/40 text-green-400' : 'bg-red-950/40 text-red-400'
            }`}>
              {rollResult.success
                ? `SUCCESS — Effect +${rollResult.effect}`
                : `FAILED — Effect ${rollResult.effect}`}
            </div>

            {rollResult.success && selectedAction && (
              <p className="text-slate-400 font-mono text-xs text-center">
                {selectedAction.id === 'sensor_lock'        && `Sensor lock acquired on ${ships.find(s => s.id === targetShipId)?.profile.name ?? '?'}.`}
                {selectedAction.id === 'electronic_warfare' && 'Enemy sensor lock removed.'}
                {selectedAction.id === 'missile_ew'         && (() => {
                  const removed = Math.max(1, rollResult.effect)
                  return `${removed} missile(s) removed from salvo.`
                })()}
                {selectedAction.id === 'repair_system'      && 'Critical hit removed.'}
                {selectedAction.id === 'improve_initiative' && `+${rollResult.effect} to initiative next round.`}
                {selectedAction.id === 'overload_drive'     && `+1 Thrust next round.${rollResult.effect <= -6 ? ' ⚠ Effect ≤ −6: apply M-Drive critical Severity 1.' : ''}`}
                {selectedAction.id === 'reload_turret'      && 'Turret reloaded.'}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRollResult(null)
                  setSelectedMemberId(null)
                  setSelectedAction(null)
                  setTargetShipId(null)
                  setTargetImpactId(null)
                  setManualDice(null)
                  setSkillOverride(null)
                }}
                className="flex-1 py-2 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-slate-500"
              >
                ANOTHER ACTION
              </button>
              <button
                onClick={closeModal}
                className="flex-1 py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-xs rounded hover:bg-(--neon-cyan)/20"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}

        {/* Selection view */}
        {!rollResult && (
          <>
            {/* Crew member list */}
            <div>
              <p className="font-mono text-xs text-slate-400 tracking-widest uppercase mb-1.5">
                Crew Member
              </p>
              {crewArray.length === 0 && (
                <p className="text-slate-400 font-mono text-xs italic">No crew assigned to this ship.</p>
              )}
              {crewArray.length > 0 && availableCrew.length === 0 && (
                <p className="text-slate-400 font-mono text-xs italic">All crew members have already acted this round.</p>
              )}
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {availableCrew.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleSelectMember(member)}
                    className={`w-full text-left px-3 py-2 rounded font-mono text-xs border transition-colors ${
                      selectedMemberId === member.id
                        ? 'border-(--neon-cyan)/60 bg-(--neon-cyan)/10 text-(--neon-cyan)'
                        : 'border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span className="font-bold mr-2">{member.name || '(unnamed)'}</span>
                    <SkillBadges skills={member.skills} />
                  </button>
                ))}
              </div>
            </div>

            {/* Action list for selected member */}
            {selectedMember && (
              <div>
                <p className="font-mono text-xs text-slate-400 tracking-widest uppercase mb-1.5">
                  Actions
                </p>
                {memberActions.length === 0 && (
                  <p className="text-slate-400 font-mono text-xs italic">No actions available for this crew member.</p>
                )}
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {memberActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleSelectAction(action)}
                      className={`w-full text-left px-3 py-2 rounded font-mono text-xs border transition-colors ${
                        selectedAction?.id === action.id
                          ? 'border-(--neon-cyan)/60 bg-(--neon-cyan)/10 text-(--neon-cyan)'
                          : 'border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="font-bold">{action.label}</span>
                      <span className="text-slate-400 ml-2">
                        {action.difficulty === 'auto' ? 'Automatic' : `Target ${action.difficulty}+`}
                        {' · '}Skill {action.skillLevel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Target ship selector */}
            {selectedAction?.requiresTarget && (
              <div>
                <p className="font-mono text-xs text-slate-400 tracking-widest uppercase mb-1.5">Target</p>
                <div className="space-y-0.5">
                  {otherShips.length === 0 && (
                    <p className="text-slate-400 font-mono text-xs italic">No ships available.</p>
                  )}
                  {otherShips.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setTargetShipId(s.id)}
                      className={`w-full flex items-center gap-2 text-left px-3 py-1.5 rounded font-mono text-xs border transition-colors ${
                        targetShipId === s.id
                          ? 'border-(--neon-cyan)/60 bg-(--neon-cyan)/10 text-(--neon-cyan)'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      {s.profile.name}
                      {s.sensorLockedBy === ship.id && (
                        <span className="ml-auto text-(--neon-cyan) text-xs">🔒 locked</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Salvo selector — missile EW target */}
            {selectedAction?.requiresSalvoTarget && (
              <div>
                <p className="font-mono text-xs text-slate-400 tracking-widest uppercase mb-1.5">Target Salvo</p>
                <div className="space-y-0.5">
                  {missiles.length === 0 && pendingMissileImpacts.length === 0 && (
                    <p className="text-slate-400 font-mono text-xs italic">No in-flight salvos.</p>
                  )}
                  {[
                    ...missiles.map((m) => ({ ...m, isPending: false })),
                    ...pendingMissileImpacts.map((i) => ({ ...i, isPending: true })),
                  ].map((salvo) => {
                    const launcher  = ships.find((s) => s.id === salvo.launchedBy)
                    const target    = ships.find((s) => s.id === salvo.target)
                    const alreadyEW = salvo.ewAppliedThisRound
                    return (
                      <button
                        key={salvo.id}
                        onClick={() => !alreadyEW && setTargetImpactId(salvo.id)}
                        disabled={alreadyEW}
                        className={`w-full text-left px-3 py-1.5 rounded font-mono text-xs border transition-colors ${
                          targetImpactId === salvo.id
                            ? 'border-(--neon-cyan)/60 bg-(--neon-cyan)/10 text-(--neon-cyan)'
                            : alreadyEW
                              ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                              : 'border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        <span className="font-bold">{salvo.count}× {salvo.type}</span>
                        <span className="text-slate-500 ml-2">
                          {launcher?.profile.name ?? '?'} → {target?.profile.name ?? '?'}
                        </span>
                        {salvo.isPending && !alreadyEW && (
                          <span className="ml-2 text-orange-400 text-[10px] uppercase tracking-wider">⚡ impact</span>
                        )}
                        {alreadyEW && <span className="ml-auto float-right text-slate-600">EW this round</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Action description */}
            {selectedAction && (
              <p className="text-slate-400 font-mono text-xs leading-relaxed border-l-2 border-slate-700 pl-3">
                {selectedAction.description}
              </p>
            )}

            {/* Skill level override — always shown when non-auto action selected */}
            {selectedAction && selectedAction.difficulty !== 'auto' && (
              <div className="flex items-center gap-2 bg-slate-800/60 rounded px-3 py-1.5">
                <span className="text-slate-400 font-mono text-xs flex-1">Skill DM</span>
                <input
                  type="number"
                  min={-3}
                  max={5}
                  value={skillOverride ?? selectedAction.skillLevel}
                  onChange={(e) => setSkillOverride(Math.max(-3, Math.min(5, Number(e.target.value) || 0)))}
                  className="w-12 bg-slate-700 border border-slate-600 text-(--neon-cyan) font-mono text-sm rounded text-center px-1 py-0.5 focus:outline-none focus:border-(--neon-cyan)/60"
                  aria-label="Skill level override"
                />
                {skillOverride !== selectedAction.skillLevel && (
                  <button
                    type="button"
                    onClick={() => setSkillOverride(selectedAction.skillLevel)}
                    className="text-slate-400 hover:text-slate-400 font-mono text-xs transition-colors"
                    title="Reset to base skill"
                  >
                    🔄
                  </button>
                )}
              </div>
            )}

            {/* Player manual dice entry — shown when an action requiring a roll is selected */}
            {isPlayer && selectedAction && selectedAction.difficulty !== 'auto' && (
              <div className="flex items-center gap-3 bg-slate-800 rounded px-3 py-2">
                <span className="text-slate-400 font-mono text-xs">2D6:</span>
                <DiceInput
                  key={selectedAction.id}
                  value={null}
                  onChange={setManualDice}
                />
              </div>
            )}

            <button
              onClick={handleRoll}
              disabled={!canRoll}
              className="w-full py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-sm tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
            >
              {isPlayer && selectedAction?.difficulty !== 'auto' ? 'CONFIRM ROLL' : '🎲 EXECUTE ACTION'}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
