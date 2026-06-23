/**
 * App — root layout.
 * Switches between Dashboard (pre-battle) and Battle (combat map) screens.
 * Battle screen wires the canvas map with HUD overlays, context menu, and
 * modal layer. Modal dispatch uses MODAL_MAP lookup (OCP).
 */

import { Dashboard }          from './components/dashboard/Dashboard.jsx'
import { BattleMap }          from './components/map/BattleMap.jsx'
import { BasicBattleView }    from './components/map/BasicBattleView.jsx'
import { HUD }             from './components/ui/HUD.jsx'
import { PhaseTracker }    from './components/ui/PhaseTracker.jsx'
import { BattleLog }       from './components/ui/BattleLog.jsx'
import { ContextMenu }     from './components/ui/ContextMenu.jsx'
import { AddShipModal }    from './components/modals/AddShipModal.jsx'
import { AttackModal }     from './components/modals/AttackModal.jsx'
import { ActionModal }     from './components/modals/ActionModal.jsx'
import { InitiativeModal } from './components/modals/InitiativeModal.jsx'
import { ShipDetailModal } from './components/modals/ShipDetailModal.jsx'
import { ShipProfileModal }   from './components/modals/ShipProfileModal.jsx'
import { DogfightNotificationModal } from './components/modals/DogfightNotificationModal.jsx'
import { DogfightRoundModal }        from './components/modals/DogfightRoundModal.jsx'
import { PassingAttackModal }        from './components/modals/PassingAttackModal.jsx'
import { MissileImpactModal }        from './components/modals/MissileImpactModal.jsx'
import { ObstacleCollisionModal }   from './components/modals/ObstacleCollisionModal.jsx'
import { PlaceObstacleModal }       from './components/modals/PlaceObstacleModal.jsx'
import { BoardingSetupModal }    from './components/modals/BoardingSetupModal.jsx'
import { BoardingContactModal }  from './components/modals/BoardingContactModal.jsx'
import { BoardingConflictModal } from './components/modals/BoardingConflictModal.jsx'
import { BoardingOutcomeModal }  from './components/modals/BoardingOutcomeModal.jsx'
import { LegendModal }            from './components/modals/LegendModal.jsx'
import { CrewAssignmentModal }   from './components/modals/CrewAssignmentModal.jsx'
import { BasicManoeuvreModal }  from './components/modals/BasicManoeuvreModal.jsx'
import { HelpScreen }       from './components/help/HelpScreen.jsx'
import { ChangelogScreen }  from './components/help/ChangelogScreen.jsx'
import { LegalFooter }     from './components/ui/LegalFooter.jsx'
import { useUiStore }      from './store/uiStore.js'
import { useBattleStore }  from './store/battleStore.js'
import { useAutosave }     from './hooks/useAutosave.js'
import { useDogfightDetection } from './components/map/useDogfightDetection.js'
import './App.css'

/**
 * Maps modal IDs (as stored in uiStore.activeModal) to their components.
 * Extend here to add new modals without touching the render logic.
 * @type {Record<string, React.ComponentType>}
 */
const MODAL_MAP = {
  addShip:       AddShipModal,
  attack:        AttackModal,
  action:        ActionModal,
  dogfightRound: DogfightRoundModal,
  initiative:    InitiativeModal,
  shipDetail:    ShipDetailModal,
  shipProfile:   ShipProfileModal,
  legend:           LegendModal,
  crewAssignment:   CrewAssignmentModal,
  basicManoeuvre:   BasicManoeuvreModal,
  placeObstacle:    PlaceObstacleModal,
}

function LegendButton() {
  const openModal = useUiStore((s) => s.openModal)
  return (
    <button
      onClick={() => openModal('legend')}
      className="absolute top-3 right-3 z-10 bg-slate-900/80 border border-slate-700 rounded backdrop-blur-sm px-2.5 py-1 font-mono text-xs text-slate-400 hover:text-(--neon-cyan) hover:border-slate-500 transition-colors"
    >
      📖 Legend
    </button>
  )
}

export function App() {
  useAutosave()

  const screen           = useUiStore((s) => s.screen)
  const activeModal      = useUiStore((s) => s.activeModal)
  const pendingPlacement = useUiStore((s) => s.pendingPlacement)
  const combatMode       = useBattleStore((s) => s.combatMode)

  const { detectedGroups, clearDetected } = useDogfightDetection()

  /** @type {React.ComponentType|null} */
  const ActiveModal = activeModal ? (MODAL_MAP[activeModal] ?? null) : null

  if (screen === 'dashboard') {
    return (
      <>
        <div className="h-[calc(100%-1.75rem)]">
          <Dashboard />
        </div>
        <LegalFooter />
      </>
    )
  }

  if (screen === 'help') {
    return (
      <>
        <div className="h-[calc(100%-1.75rem)]">
          <HelpScreen />
        </div>
        <LegalFooter />
      </>
    )
  }

  if (screen === 'changelog') {
    return (
      <>
        <div className="h-[calc(100%-1.75rem)]">
          <ChangelogScreen />
        </div>
        <LegalFooter />
      </>
    )
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">

      {/* ── Canvas / battle layer ────────────────────────────────────── */}
      {combatMode === 'vectorial' ? <BattleMap /> : <BasicBattleView />}

      {/* ── HUD overlays ─────────────────────────────────────────────── */}
      <HUD />
      <LegendButton />
      <PhaseTracker />
      <BattleLog />

      {/* ── Context menu ─────────────────────────────────────────────── */}
      <ContextMenu />

{/* ── Placement mode banner ────────────────────────────────────── */}
      {pendingPlacement && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none
            bg-slate-900/90 border border-(--neon-cyan)/40 text-(--neon-cyan)
            font-mono text-xs tracking-widest px-4 py-2 rounded whitespace-nowrap"
        >
          ✨ CLICK ON MAP TO PLACE — {pendingPlacement.profile.name}
        </div>
      )}

      {/* ── Passing encounter window ─────────────────────────────────── */}
      <PassingAttackModal />

      {/* ── Missile impact resolution ────────────────────────────────── */}
      <MissileImpactModal />

      {/* ── Obstacle field collision resolution ──────────────────────── */}
      <ObstacleCollisionModal />

      {/* ── Boarding modals ──────────────────────────────────────────── */}
      <BoardingSetupModal />
      <BoardingContactModal />
      <BoardingConflictModal />
      <BoardingOutcomeModal />

      {/* ── Dogfight engagement notification ────────────────────────── */}
      {detectedGroups.length > 0 && (
        <DogfightNotificationModal groups={detectedGroups} onDone={clearDetected} />
      )}

      {/* ── Modal layer ──────────────────────────────────────────────── */}
      {ActiveModal && <ActiveModal />}

      {/* ── Legal footer ─────────────────────────────────────────────── */}
      <LegalFooter />
    </div>
  )
}

export default App
