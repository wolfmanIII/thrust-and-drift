/**
 * HUD — minimal top-left overlay showing round, phase, and current actor.
 * Read-only display; phase advancement is via the button.
 */

import { useState } from 'react'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { Tooltip } from './Tooltip.jsx'
import { Modal } from '../modals/Modal.jsx'

/** Phases during which an actor turn control is shown. */
const ACTOR_TURN_PHASES = new Set(['acceleration', 'attack', 'actions'])

const PHASE_LABELS = {
  setup:        'SETUP',
  initiative:   'INIZIATIVA',
  acceleration: 'ACCELERAZIONE',
  movement:     'MOVIMENTO',
  attack:       'ATTACCO',
  actions:      'AZIONI',
  end:          'FINE ROUND',
}

export function HUD() {
  const round               = useBattleStore((s) => s.round)
  const phase               = useBattleStore((s) => s.phase)
  const initiativeOrder     = useBattleStore((s) => s.initiativeOrder)
  const currentActorIndex   = useBattleStore((s) => s.currentActorIndex)
  const ships               = useBattleStore((s) => s.ships)
  const advancePhase        = useBattleStore((s) => s.advancePhase)
  const advanceActor        = useBattleStore((s) => s.advanceActor)
  const exportBattleState   = useBattleStore((s) => s.exportBattleState)
  const combatMode          = useBattleStore((s) => s.combatMode)
  const gotoScreen          = useUiStore((s) => s.gotoScreen)

  const [showExitWarning, setShowExitWarning] = useState(false)

  const currentActorId = initiativeOrder[currentActorIndex] ?? null
  const currentActor   = ships.find((s) => s.id === currentActorId)
  const actorsLeft     = initiativeOrder.length - currentActorIndex

  const phaseLabel = PHASE_LABELS[phase] ?? phase.toUpperCase()
  const showActorControl = ACTOR_TURN_PHASES.has(phase)

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 pointer-events-none">
      {/* Round + phase badge */}
      <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded px-3 py-1.5 backdrop-blur-sm">
        <span className="text-slate-400 text-xs font-display tracking-widest">ROUND</span>
        <span className="text-[--neon-cyan] font-mono font-bold text-lg leading-none">{round}</span>
        <span className="text-slate-600 text-xs">│</span>
        <span className="text-slate-200 font-display text-xs tracking-widest">{phaseLabel}</span>
      </div>

      {/* Current actor */}
      {showActorControl && currentActor && (
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded px-3 py-1.5 backdrop-blur-sm pointer-events-auto">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: currentActor.color }}
          />
          <span className="text-slate-200 font-mono text-xs truncate max-w-32">
            {currentActor.profile.name}
          </span>
          <span className="text-slate-500 text-xs">({actorsLeft} rimasti)</span>
          <button
            onClick={advanceActor}
            className="ml-1 text-[--neon-cyan] font-display text-xs border border-[--neon-cyan]/40 rounded px-1.5 py-0.5 hover:bg-[--neon-cyan]/10 transition-colors"
          >
            AVANTI →
          </button>
        </div>
      )}

      {/* Phase advance — skip movement phase in basic mode (no vectors) */}
      {(combatMode === 'vectorial' || phase !== 'movement') && (
        <button
          onClick={advancePhase}
          className="pointer-events-auto bg-slate-800/80 border border-slate-600 hover:border-[--neon-cyan]/60 text-slate-300 hover:text-[--neon-cyan] font-mono text-xs tracking-widest rounded px-3 py-1.5 backdrop-blur-sm transition-colors text-left"
        >
          FASE SUCCESSIVA ⟶
        </button>
      )}

      {/* Battle utilities */}
      <div className="pointer-events-auto flex gap-1 mt-0.5">
        <Tooltip label="Salva sessione su file">
          <button
            onClick={exportBattleState}
            className="flex-1 bg-slate-800/80 border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 font-mono text-xs rounded px-2 py-1 backdrop-blur-sm transition-colors"
          >
            💾 SALVA
          </button>
        </Tooltip>
        <Tooltip label="Torna al menu principale">
          <button
            onClick={() => setShowExitWarning(true)}
            className="bg-slate-800/80 border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 font-mono text-xs rounded px-2 py-1 backdrop-blur-sm transition-colors"
          >
            ⌂
          </button>
        </Tooltip>
      </div>

      {showExitWarning && (
        <Modal title="ABBANDONA SESSIONE" onClose={() => setShowExitWarning(false)} width="max-w-sm">
          <div className="space-y-4">
            <p className="font-mono text-sm text-slate-300 leading-relaxed">
              I dati non salvati andranno perduti.
            </p>
            <p className="font-mono text-xs text-slate-500">
              Salva la sessione prima di uscire per riprendere in seguito.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowExitWarning(false); gotoScreen('dashboard') }}
                className="flex-1 py-2 bg-red-900/30 border border-red-700/50 text-red-400 font-display text-xs tracking-widest rounded hover:bg-red-900/50 transition-colors"
              >
                ESCI SENZA SALVARE
              </button>
              <button
                onClick={() => setShowExitWarning(false)}
                className="flex-1 py-2 border border-slate-600 text-slate-300 font-display text-xs tracking-widest rounded hover:border-slate-400 transition-colors"
              >
                ANNULLA
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
