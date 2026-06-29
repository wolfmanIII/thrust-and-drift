/**
 * HUD — minimal top-left overlay showing round, phase, and current actor.
 * Read-only display; phase advancement is via the button.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { Tooltip } from './Tooltip.jsx'
import { Modal } from '../modals/Modal.jsx'
import tdLogo from '../../assets/TD-logo-transparent.png'

/** Phases during which an actor turn control is shown. */
const ACTOR_TURN_PHASES = new Set(['acceleration', 'attack', 'actions'])

const PHASE_LABELS = {
  setup:        'SETUP',
  initiative:   'INITIATIVE',
  acceleration: 'ACCELERATION',
  movement:     'MOVEMENT',
  attack:       'ATTACK',
  actions:      'ACTIONS',
  end:          'END OF ROUND',
}

export function HUD() {
  const round               = useBattleStore((s) => s.round)
  const phase               = useBattleStore((s) => s.phase)
  const initiativeOrder     = useBattleStore((s) => s.initiativeOrder)
  const currentActorIndex   = useBattleStore((s) => s.currentActorIndex)
  const ships               = useBattleStore((s) => s.ships)
  const advancePhase           = useBattleStore((s) => s.advancePhase)
  const forceInitiativePhase   = useBattleStore((s) => s.forceInitiativePhase)
  const advanceActor        = useBattleStore((s) => s.advanceActor)
  const exportBattleState   = useBattleStore((s) => s.exportBattleState)
  const combatMode          = useBattleStore((s) => s.combatMode)
  const undoLastAction      = useBattleStore((s) => s.undoLastAction)
  const redoLastAction      = useBattleStore((s) => s.redoLastAction)
  const canUndo                = useBattleStore((s) => s.undoStack.length > 0)
  const canRedo                = useBattleStore((s) => s.redoStack.length > 0)
  const pendingMissileImpacts  = useBattleStore((s) => s.pendingMissileImpacts)
  const gotoScreen          = useUiStore((s) => s.gotoScreen)
  const openModal           = useUiStore((s) => s.openModal)
  const audioEnabled        = useUiStore((s) => s.audioEnabled)
  const toggleAudio         = useUiStore((s) => s.toggleAudio)
  const dogfights               = useBattleStore((s) => s.dogfights)
  const boardings               = useBattleStore((s) => s.boardings)
  const obstaclesEnabled        = useBattleStore((s) => s.obstaclesEnabled)
  const toggleObstaclesEnabled  = useBattleStore((s) => s.toggleObstaclesEnabled)

  const activeDogfights  = dogfights.filter((g) => g.active)
  const activeBoardings  = boardings.filter((b) => b.outcome === null)

  const [showExitWarning, setShowExitWarning] = useState(false)
  const [phaseBlockMsg,   setPhaseBlockMsg]   = useState(null)

  // true when advancing to the next phase is allowed
  const canAdvancePhase = useMemo(() => {
    if (pendingMissileImpacts.length > 0) return false
    if (activeDogfights.length > 0) return false
    if (phase === 'setup')      return ships.length > 0
    if (phase === 'initiative') return initiativeOrder.length > 0
    if (ACTOR_TURN_PHASES.has(phase)) return currentActorIndex >= initiativeOrder.length
    return true
  }, [phase, ships, currentActorIndex, initiativeOrder, pendingMissileImpacts, activeDogfights])

  // clear the warning once the condition is satisfied
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clears stale block message when advance becomes possible
    if (canAdvancePhase) setPhaseBlockMsg(null)
  }, [canAdvancePhase])

  const handleAdvancePhase = useCallback(() => {
    if (!canAdvancePhase) {
      if (pendingMissileImpacts.length > 0) {
        setPhaseBlockMsg(`Resolve ${pendingMissileImpacts.length} pending missile impact${pendingMissileImpacts.length !== 1 ? 's' : ''} first.`)
      } else if (activeDogfights.length > 0) {
        setPhaseBlockMsg(`Resolve ${activeDogfights.length} active dogfight${activeDogfights.length !== 1 ? 's' : ''} first.`)
      } else if (phase === 'setup') {
        setPhaseBlockMsg('Place at least one ship first.')
      } else if (phase === 'initiative') {
        setPhaseBlockMsg('Roll initiative before advancing.')
      } else {
        const remaining = initiativeOrder.length - currentActorIndex
        setPhaseBlockMsg(`${remaining} actor${remaining !== 1 ? 's' : ''} still to act.`)
      }
      return
    }
    setPhaseBlockMsg(null)
    advancePhase()
  }, [canAdvancePhase, advancePhase, phase, initiativeOrder, currentActorIndex, pendingMissileImpacts, activeDogfights])

  const handleUndo = useCallback(() => {
    if (canUndo) undoLastAction()
  }, [canUndo, undoLastAction])

  const handleRedo = useCallback(() => {
    if (canRedo) redoLastAction()
  }, [canRedo, redoLastAction])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      if ((e.ctrlKey && e.key === 'y') || ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey)) {
        e.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleUndo, handleRedo])

  // Vectorial only: Acceleration uses reverse initiative order (TC p.174 — lowest acts first,
  // so higher-initiative ships can react to slower ships' declared vectors).
  // Basic mode Manoeuvre Step uses normal initiative order (CRB p.164).
  const actorOrder     = (phase === 'acceleration' && combatMode === 'vectorial')
    ? [...initiativeOrder].reverse()
    : initiativeOrder
  const currentActorId = actorOrder[currentActorIndex] ?? null
  const currentActor   = ships.find((s) => s.id === currentActorId)

  const phaseLabel = PHASE_LABELS[phase] ?? phase.toUpperCase()
  const showActorControl = ACTOR_TURN_PHASES.has(phase)

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start pointer-events-none max-h-[calc(100vh-3.5rem)] overflow-y-auto">
      {/* Round + phase badge */}
      <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded px-3 py-1.5 backdrop-blur-sm">
        <img src={tdLogo} alt="" className="w-5 h-5" />
        <span className="text-slate-400 text-xs">│</span>
        <span className="text-slate-400 text-xs font-display tracking-widest">ROUND</span>
        <span className="text-(--neon-cyan) font-mono font-bold text-lg leading-none">{round}</span>
        <span className="text-slate-400 text-xs">│</span>
        <span className="text-slate-200 font-display text-xs tracking-widest">{phaseLabel}</span>
        {/* GM override: re-roll initiative when it was auto-skipped (CRB p.160, REQ-13) */}
        {phase === 'acceleration' && round > 1 && (
          <button
            onClick={forceInitiativePhase}
            className="pointer-events-auto ml-1 text-slate-500 font-mono text-xs hover:text-amber-400 transition-colors"
            title="Re-roll initiative this round"
          >
            ↺
          </button>
        )}
      </div>

      {/* Current actor */}
      {showActorControl && currentActor && (
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded px-3 py-1.5 backdrop-blur-sm pointer-events-auto">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: currentActor.color }}
          />
          <span className="text-slate-200 font-mono text-xs truncate max-w-32">
            {currentActor.name}
          </span>
          <span className="text-slate-400 text-xs">{currentActorIndex + 1}/{initiativeOrder.length}</span>
          <button
            onClick={advanceActor}
            className="ml-1 text-(--neon-cyan) font-display text-xs border border-(--neon-cyan)/40 rounded px-1.5 py-0.5 hover:bg-(--neon-cyan)/10 transition-colors"
          >
            NEXT →
          </button>
        </div>
      )}

      {/* Initiative roll call-to-action */}
      {phase === 'initiative' && initiativeOrder.length === 0 && (
        <button
          onClick={() => openModal('initiative')}
          className="pointer-events-auto bg-(--neon-cyan)/10 border border-(--neon-cyan)/50 hover:bg-(--neon-cyan)/20 text-(--neon-cyan) font-mono text-xs tracking-widest rounded px-3 py-1.5 backdrop-blur-sm transition-colors"
        >
          🎲 ROLL INITIATIVE →
        </button>
      )}

      {/* Pending missile impacts alert */}
      {pendingMissileImpacts.length > 0 && (
        <p className="font-mono text-xs text-amber-400 animate-pulse pointer-events-none">
          ⚡ {pendingMissileImpacts.length} impact{pendingMissileImpacts.length !== 1 ? 's' : ''} unresolved
        </p>
      )}

      {/* Obstacles toggle — setup phase + vectorial mode only */}
      {phase === 'setup' && combatMode === 'vectorial' && (
        <button
          onClick={toggleObstaclesEnabled}
          className={`pointer-events-auto bg-slate-800/80 border rounded px-3 py-1.5 backdrop-blur-sm transition-colors font-mono text-xs tracking-widest ${
            obstaclesEnabled
              ? 'border-amber-600/60 text-amber-400 hover:border-amber-500/70'
              : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
          }`}
        >
          {obstaclesEnabled ? '🪨 OBSTACLES ON' : '🪨 OBSTACLES OFF'}
        </button>
      )}

      {/* Phase advance — skip movement phase in basic mode (no vectors) */}
      {(combatMode === 'vectorial' || phase !== 'movement') && (
        <>
          <button
            onClick={handleAdvancePhase}
            className={`pointer-events-auto bg-slate-800/80 border rounded px-3 py-1.5 backdrop-blur-sm transition-colors text-left font-mono text-xs tracking-widest ${
              canAdvancePhase
                ? 'border-slate-600 hover:border-(--neon-cyan)/60 text-slate-300 hover:text-(--neon-cyan)'
                : 'border-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            NEXT PHASE ⟶
          </button>
          {phaseBlockMsg && (
            <p className="font-mono text-xs text-amber-400/90 pl-1 pointer-events-none">
              🚨 {phaseBlockMsg}
            </p>
          )}
        </>
      )}

      {/* Battle utilities */}
      <div className="pointer-events-auto flex gap-1 mt-0.5">
        {canUndo && (
          <Tooltip label="Undo last action (Ctrl+Z)" position="bottom">
            <button
              onClick={handleUndo}
              aria-label="Undo last action (Ctrl+Z)"
              className="bg-slate-800/80 border border-slate-700 font-mono text-sm rounded px-2 py-1 backdrop-blur-sm transition-colors text-slate-400 hover:text-slate-300 hover:border-slate-500"
            >
              ↩️
            </button>
          </Tooltip>
        )}
        {canRedo && (
          <Tooltip label="Redo last action (Ctrl+Y)" position="bottom">
            <button
              onClick={handleRedo}
              aria-label="Redo last action (Ctrl+Y)"
              className="bg-slate-800/80 border border-slate-700 font-mono text-sm rounded px-2 py-1 backdrop-blur-sm transition-colors text-slate-400 hover:text-slate-300 hover:border-slate-500"
            >
              ↪️
            </button>
          </Tooltip>
        )}
        <Tooltip label="Save session to file" position="bottom">
          <button
            onClick={exportBattleState}
            className="flex-1 bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-500 font-mono text-xs rounded px-2 py-1 backdrop-blur-sm transition-colors"
          >
            💾 SAVE
          </button>
        </Tooltip>
        <Tooltip label={audioEnabled ? 'Mute sound effects' : 'Unmute sound effects'} position="bottom">
          <button
            onClick={toggleAudio}
            aria-label={audioEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
            className={`bg-slate-800/80 border font-mono text-xs rounded px-2 py-1 backdrop-blur-sm transition-colors ${
              audioEnabled
                ? 'border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-500'
                : 'border-slate-700 text-slate-400 hover:text-slate-400'
            }`}
          >
            {audioEnabled ? '🔊' : '🔇'}
          </button>
        </Tooltip>
        <Tooltip label="Return to main menu" position="bottom">
          <button
            onClick={() => setShowExitWarning(true)}
            className="bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-500 font-mono text-base rounded px-2 py-1 backdrop-blur-sm transition-colors"
          >
            🏠
          </button>
        </Tooltip>
      </div>

      {/* ── Dogfight trackers ──────────────────────────────────────── */}
      {activeDogfights.map((group, idx) => {
        const groupShips = group.shipIds
          .map((id) => ships.find((s) => s.id === id))
          .filter(Boolean)
        const winnerShip = group.roundWinnerId
          ? ships.find((s) => s.id === group.roundWinnerId)
          : null
        return (
          <div
            key={group.id}
            className="bg-slate-900/80 border border-amber-500/30 rounded px-3 py-2 backdrop-blur-sm pointer-events-auto space-y-1.5 min-w-48"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-amber-400 font-mono text-xs font-bold shrink-0">
                ⚔ DOGFIGHT {idx + 1}
              </span>
              <span className="text-slate-400 font-mono text-xs truncate">
                {groupShips.map((s) => s.name).join(' ↔ ')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
              <span>Micro-round {group.microRound}/6</span>
              {winnerShip && (
                <>
                  <span className="text-slate-400">│</span>
                  <span className="text-amber-300 truncate">
                    ↑ {winnerShip.name} +{group.roundWinnerMargin}
                  </span>
                </>
              )}
            </div>
            <button
              onClick={() => openModal('dogfightRound', { groupId: group.id })}
              className="w-full py-1 bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono text-xs tracking-widest rounded hover:bg-amber-500/20 transition-colors"
            >
              MICRO-ROUND {group.microRound} →
            </button>
          </div>
        )
      })}

      {/* Boarding badges */}
      {activeBoardings.map((boarding) => {
        const attacker = ships.find((s) => s.id === boarding.attackerId)
        const defender = ships.find((s) => s.id === boarding.defenderId)
        const phaseLabel = { contact: 'CONTACT', conflict: 'CONFLICT', security: 'SECURITY' }[boarding.phase] ?? boarding.phase.toUpperCase()
        const modalId = boarding.phase === 'contact'
          ? 'boarding-contact'
          : boarding.phase === 'conflict'
            ? 'boarding-conflict'
            : 'boarding-outcome'
        return (
          <div
            key={boarding.id}
            className="bg-slate-900/80 border border-red-500/30 rounded px-3 py-2 backdrop-blur-sm pointer-events-auto space-y-1.5 min-w-48"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-red-400 font-mono text-xs font-bold shrink-0">⚔ BOARDING</span>
              <span className="text-slate-400 font-mono text-xs truncate">
                {attacker?.name ?? '?'} → {defender?.name ?? '?'}
              </span>
            </div>
            <button
              onClick={() => openModal(modalId, { boardingId: boarding.id })}
              className="w-full py-1 bg-red-500/10 border border-red-500/40 text-red-300 font-mono text-xs tracking-widest rounded hover:bg-red-500/20 transition-colors"
            >
              {phaseLabel} →
            </button>
          </div>
        )
      })}

      {showExitWarning && (
        <Modal title="ABANDON SESSION" onClose={() => setShowExitWarning(false)} width="max-w-sm" variant="dialog">
          <div className="space-y-4">
            <p className="font-mono text-sm text-slate-300 leading-relaxed">
              Unsaved data will be lost.
            </p>
            <p className="font-mono text-xs text-slate-400">
              Save the session before leaving to resume later.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowExitWarning(false); gotoScreen('dashboard') }}
                className="flex-1 py-2 bg-red-900/30 border border-red-700/50 text-red-400 font-display text-xs tracking-widest rounded hover:bg-red-900/50 transition-colors"
              >
                EXIT WITHOUT SAVING
              </button>
              <button
                onClick={() => setShowExitWarning(false)}
                className="flex-1 py-2 border border-slate-600 text-slate-300 font-display text-xs tracking-widest rounded hover:border-slate-400 transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
