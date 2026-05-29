/**
 * App — root layout.
 * Switches between Dashboard (pre-battle) and Battle (combat map) screens.
 * Battle screen wires the canvas map with HUD overlays, context menu, and
 * modal layer. Modal dispatch uses MODAL_MAP lookup (OCP).
 */

import tdLogo                 from './assets/TD-logo-transparent.png'
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
import { ThrustModal }        from './components/modals/ThrustModal.jsx'
import { EvasiveModal }       from './components/modals/EvasiveModal.jsx'
import { MissileLaunchModal } from './components/modals/MissileLaunchModal.jsx'
import { useUiStore }      from './store/uiStore.js'
import { useBattleStore }  from './store/battleStore.js'
import { useAutosave }     from './hooks/useAutosave.js'
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
  evasive:       EvasiveModal,
  initiative:    InitiativeModal,
  missileLaunch: MissileLaunchModal,
  shipDetail:    ShipDetailModal,
  shipProfile:   ShipProfileModal,
  thrust:        ThrustModal,
}

export function App() {
  useAutosave()

  const screen           = useUiStore((s) => s.screen)
  const activeModal      = useUiStore((s) => s.activeModal)
  const pendingPlacement = useUiStore((s) => s.pendingPlacement)
  const combatMode       = useBattleStore((s) => s.combatMode)

  /** @type {React.ComponentType|null} */
  const ActiveModal = activeModal ? (MODAL_MAP[activeModal] ?? null) : null

  if (screen === 'dashboard') {
    return <Dashboard />
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">

      {/* ── Canvas / battle layer ────────────────────────────────────── */}
      {combatMode === 'vectorial' ? <BattleMap /> : <BasicBattleView />}

      {/* ── HUD overlays ─────────────────────────────────────────────── */}
      <HUD />
      <PhaseTracker />
      <BattleLog />

      {/* ── Context menu ─────────────────────────────────────────────── */}
      <ContextMenu />

      {/* ── Brand watermark ──────────────────────────────────────────── */}
      <div className="absolute bottom-3 right-3 z-5 pointer-events-none flex items-center gap-1.5 opacity-30">
        <img src={tdLogo} alt="" className="w-6 h-6" />
        <span className="font-display text-[10px] text-slate-400 tracking-widest leading-none">
          THRUST &amp; DRIFT
        </span>
      </div>

      {/* ── Placement mode banner ────────────────────────────────────── */}
      {pendingPlacement && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none
            bg-slate-900/90 border border-[--neon-cyan]/40 text-[--neon-cyan]
            font-mono text-xs tracking-widest px-4 py-2 rounded whitespace-nowrap"
        >
          ✦ CLICK ON MAP TO PLACE — {pendingPlacement.profile.name}
        </div>
      )}

      {/* ── Modal layer ──────────────────────────────────────────────── */}
      {ActiveModal && <ActiveModal />}
    </div>
  )
}

export default App
