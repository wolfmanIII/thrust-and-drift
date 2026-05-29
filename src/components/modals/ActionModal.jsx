/**
 * ActionModal — crew actions during the Actions phase.
 * Rolls the check, shows result, and applies the mechanical effect to battle state.
 * // MgT2e CRB p.166–167 — Crew Actions
 */

import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { roll2D6, formatCheckResult } from '../../utils/dice.js'
import { CREW_ACTIONS } from '../../data/crewActions.js'

/**
 * Apply the mechanical effect of a successful action to the battle state.
 * Each action ID maps to a dedicated battleStore action.
 */
function useActionEffects() {
  const applySensorLock    = useBattleStore((s) => s.applySensorLock)
  const clearSensorLock    = useBattleStore((s) => s.clearSensorLock)
  const repairCritical     = useBattleStore((s) => s.repairCritical)
  const applyInitiativeBonus = useBattleStore((s) => s.applyInitiativeBonus)
  const overloadDrive      = useBattleStore((s) => s.overloadDrive)
  const reloadTurret       = useBattleStore((s) => s.reloadTurret)

  return (actionId, shipId, effect, targetShipId) => {
    switch (actionId) {
      case 'sensor_lock':
        if (targetShipId) applySensorLock(shipId, targetShipId, effect)
        break
      case 'electronic_warfare':
        clearSensorLock(shipId)
        break
      case 'repair_system':
        repairCritical(shipId)
        break
      case 'improve_initiative':
        applyInitiativeBonus(shipId, effect)
        break
      case 'overload_drive':
        overloadDrive(shipId, effect)
        break
      case 'reload_turret':
        reloadTurret(shipId)
        break
      default:
        break
    }
  }
}

export function ActionModal() {
  const closeModal   = useUiStore((s) => s.closeModal)
  const modalPayload = useUiStore((s) => s.modalPayload)
  const ships        = useBattleStore((s) => s.ships)
  const addLogEntry  = useBattleStore((s) => s.addLogEntry)

  const applyEffect  = useActionEffects()

  const ship = ships.find((s) => s.id === modalPayload?.shipId)

  const [selectedAction, setSelectedAction]   = useState(null)
  const [targetShipId, setTargetShipId]       = useState(null)
  const [rollResult, setRollResult]           = useState(null)

  if (!ship) return null

  const crew = ship.profile.crew ?? {}

  // Other ships that can be targeted for sensor lock
  const otherShips = ships.filter((s) => s.id !== ship.id)

  // Build available actions based on crew skills present
  const availableActions = Object.entries(CREW_ACTIONS).flatMap(([role, actions]) => {
    const skillLevel = crew[role] ?? 0
    if (skillLevel === 0 && role !== 'gunner') return []
    return actions.map((a) => ({ ...a, skillLevel }))
  })

  const handleSelectAction = (action) => {
    setSelectedAction(action)
    setRollResult(null)
    setTargetShipId(null)
  }

  const handleRoll = () => {
    if (!selectedAction) return
    if (selectedAction.requiresTarget && !targetShipId) return

    let result
    if (selectedAction.difficulty === 'auto') {
      result = { display: 'Automatico', success: true, effect: 0, finalTotal: 8 }
    } else {
      const roll = roll2D6()
      const dm   = selectedAction.skillLevel
      result = formatCheckResult(roll, dm, selectedAction.difficulty)
    }

    setRollResult(result)
    addLogEntry(
      `${ship.profile.name}: ${selectedAction.label} — ${result.display} (${result.success ? 'SUCCESS' : 'FAILED'})`
    )

    if (result.success) {
      applyEffect(selectedAction.id, ship.id, result.effect, targetShipId)
    }
  }

  const canRoll = selectedAction &&
    (!selectedAction.requiresTarget || targetShipId)

  return (
    <Modal title={`Actions — ${ship.profile.name}`} onClose={closeModal}>
      <div className="space-y-4">
        {/* Action list */}
        {!rollResult && (
          <>
            <div className="space-y-1">
              {availableActions.length === 0 && (
                <p className="text-slate-600 font-mono text-xs italic">No actions available.</p>
              )}
              {availableActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleSelectAction(action)}
                  className={`w-full text-left px-3 py-2 rounded font-mono text-xs border transition-colors ${
                    selectedAction?.id === action.id
                      ? 'border-[--neon-cyan]/60 bg-[--neon-cyan]/10 text-[--neon-cyan]'
                      : 'border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="font-bold">{action.label}</span>
                  <span className="text-slate-500 ml-2">
                    {action.difficulty === 'auto' ? 'Automatic' : `Target ${action.difficulty}+`}
                    {' · '}Skill {action.skillLevel}
                  </span>
                </button>
              ))}
            </div>

            {/* Target selector — shown only for actions that require a target */}
            {selectedAction?.requiresTarget && (
              <div>
                <p className="text-slate-500 font-mono text-xs mb-1.5">Target</p>
                <div className="space-y-0.5">
                  {otherShips.length === 0 && (
                    <p className="text-slate-600 font-mono text-xs italic">No ships available.</p>
                  )}
                  {otherShips.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setTargetShipId(s.id)}
                      className={`w-full flex items-center gap-2 text-left px-3 py-1.5 rounded font-mono text-xs border transition-colors ${
                        targetShipId === s.id
                          ? 'border-[--neon-cyan]/60 bg-[--neon-cyan]/10 text-[--neon-cyan]'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      {s.profile.name}
                      {s.sensorLockedBy === ship.id && (
                        <span className="ml-auto text-[--neon-cyan] text-xs">🔒 locked</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedAction && (
              <p className="text-slate-500 font-mono text-xs leading-relaxed border-l-2 border-slate-700 pl-3">
                {selectedAction.description}
              </p>
            )}

            <button
              onClick={handleRoll}
              disabled={!canRoll}
              className="w-full py-2 bg-[--neon-cyan]/10 border border-[--neon-cyan]/40 text-[--neon-cyan] font-mono text-sm tracking-widest rounded hover:bg-[--neon-cyan]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              🎲 EXECUTE ACTION
            </button>
          </>
        )}

        {/* Result */}
        {rollResult && (
          <div className="space-y-3">
            <div className="bg-slate-800 rounded p-4 text-center font-mono">
              <p className="text-slate-400 text-xs mb-1">{selectedAction?.label}</p>
              <p className="text-slate-300 text-sm">{rollResult.display}</p>
            </div>

            <div className={`text-center py-2 rounded font-mono font-bold text-sm ${
              rollResult.success ? 'bg-green-950/40 text-green-400' : 'bg-red-950/40 text-red-400'
            }`}>
              {rollResult.success
                ? `SUCCESS — Effect +${rollResult.effect}`
                : `FAILED — Effect ${rollResult.effect}`}
            </div>

            {/* Effect description */}
            {rollResult.success && selectedAction && (
              <p className="text-slate-400 font-mono text-xs text-center">
                {selectedAction.id === 'sensor_lock'        && `Sensor lock acquired on ${ships.find(s => s.id === targetShipId)?.profile.name ?? '?'}.`}
                {selectedAction.id === 'electronic_warfare' && 'Enemy sensor lock removed.'}
                {selectedAction.id === 'repair_system'      && 'Critical hit removed.'}
                {selectedAction.id === 'improve_initiative' && `+${rollResult.effect} to initiative next round.`}
                {selectedAction.id === 'overload_drive'     && `+${rollResult.effect} Thrust available this round.`}
                {selectedAction.id === 'reload_turret'      && 'Turret reloaded.'}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setRollResult(null); setTargetShipId(null) }}
                className="flex-1 py-2 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-slate-500"
              >
                ANOTHER ACTION
              </button>
              <button
                onClick={closeModal}
                className="flex-1 py-2 bg-[--neon-cyan]/10 border border-[--neon-cyan]/40 text-[--neon-cyan] font-mono text-xs rounded hover:bg-[--neon-cyan]/20"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
