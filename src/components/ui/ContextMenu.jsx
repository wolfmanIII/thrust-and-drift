/**
 * ContextMenu — right-click overlay rendered at canvas pixel position.
 * Dispatches to ShipContextMenu or EmptyContextMenu based on context type.
 * Adding a new type: add a new *ContextMenu component, register in MENU_MAP.
 */

import { useEffect, useRef } from 'react'
import { useUiStore }    from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { hexDistance }   from '../../utils/hex.js'
import { getObstacleAt } from '../../utils/obstacles.js'
import { DEFENSIVE_WEAPONS } from '../../data/weapons.js'
import { CREW_ACTIONS } from '../../data/crewActions.js'

// === SHARED PRIMITIVES ===

/**
 * @param {{ label: string, icon: string, onClick: Function, danger?: boolean }} props
 */
function MenuItem({ label, icon, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left font-mono text-xs transition-colors
        ${danger
          ? 'text-red-400 hover:bg-red-950/50'
          : 'text-slate-300 hover:bg-slate-700/60 hover:text-slate-100'
        }`}
    >
      <span className="w-4 text-center">{icon}</span>
      {label}
    </button>
  )
}

function MenuItemDisabled({ label, icon, reason }) {
  return (
    <div className="w-full flex items-center gap-2 px-3 py-1.5 font-mono text-xs text-slate-400 cursor-not-allowed select-none">
      <span className="w-4 text-center opacity-40">{icon}</span>
      <span>{label}</span>
      {reason && <span className="ml-auto text-slate-400 text-[10px] shrink-0">{reason}</span>}
    </div>
  )
}

function MenuDivider() {
  return <div className="border-t border-slate-700/50 my-0.5" />
}

function MenuShell({ x, y, menuRef, children }) {
  return (
    <div
      ref={menuRef}
      style={{ left: x, top: y }}
      className="absolute z-50 min-w-44 bg-slate-900 border border-slate-600 rounded shadow-xl overflow-hidden"
    >
      {children}
    </div>
  )
}

// === SHIP CONTEXT ===

/**
 * Returns true if at least one crew member has an available action for the given phase.
 * Phase-aware: Aid Gunners is acceleration-phase, all other actions are actions-phase.
 * // MgT2e CRB p.164 (phase order), p.166–167 (crew actions)
 */
function hasAvailablePhaseCrewAction(ship, currentPhase) {
  const used  = ship.usedCrewMembers ?? []
  const crew  = Array.isArray(ship.profile.crew) ? ship.profile.crew : []
  const asn   = ship.crewAssignments ?? {}
  return crew.some((m) => {
    if (used.includes(m.id)) return false
    return Object.entries(CREW_ACTIONS).some(([role, actions]) => {
      const skill      = m.skills?.[role] ?? 0
      const isAssigned = role === 'gunner'
        ? Object.values(asn.gunners ?? {}).includes(m.id)
        : asn[role] === m.id
      if (skill === 0 && !isAssigned) return false
      return actions.some((a) => (a.phase ?? 'actions') === currentPhase)
    })
  })
}

/** Returns true if the ship has at least one offensive turret that hasn't fired this round. */
function hasUnfiredOffensiveTurret(ship) {
  const fired = ship.firedTurrets ?? []
  return (ship.profile.turrets ?? [])
    .filter((t) => !fired.includes(t.slot))
    .flatMap((t) => t.weapons)
    .some((w) => !DEFENSIVE_WEAPONS.includes(w))
}

/** Phases where only the current initiative actor may act. */
const INITIATIVE_GATED_PHASES = ['acceleration', 'attack', 'actions']

function ShipContextMenu({ x, y, menuRef, ship, targetId, close }) {
  const openModal             = useUiStore((s) => s.openModal)
  const startThrustTargeting  = useUiStore((s) => s.startThrustTargeting)
  const removeShip            = useBattleStore((s) => s.removeShip)
  const combatMode       = useBattleStore((s) => s.combatMode)
  const phase            = useBattleStore((s) => s.phase)
  const ships            = useBattleStore((s) => s.ships)
  const initiativeOrder  = useBattleStore((s) => s.initiativeOrder)
  const currentActorIndex = useBattleStore((s) => s.currentActorIndex)

  // Vectorial only: Acceleration uses reverse initiative order (TC p.174).
  // Basic mode Manoeuvre Step uses normal initiative order (CRB p.164).
  const actorOrder     = (phase === 'acceleration' && combatMode === 'vectorial')
    ? [...initiativeOrder].reverse()
    : initiativeOrder
  const currentActorId = actorOrder[currentActorIndex] ?? null
  const isCurrentActor = !INITIATIVE_GATED_PHASES.includes(phase) || targetId === currentActorId

  const open = (modal, payload) => { openModal(modal, payload); close() }

  const boardingTargets = combatMode === 'vectorial' ? ships.filter((t) => {
    if (t.faction === ship.faction) return false
    if (ship.inBoarding || t.inBoarding) return false
    if (hexDistance(ship.position, t.position) > 1) return false
    const mDriveDisabled = t.criticalHits?.some((c) => c.system === 'm-drive' && c.disabled)
    return mDriveDisabled || ship.profile.thrust >= t.profile.thrust
  }) : []

  return (
    <MenuShell x={x} y={y} menuRef={menuRef}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="px-3 py-1.5 bg-slate-800 border-b border-slate-700">
        <p className="font-mono text-xs text-(--neon-cyan) font-bold truncate">{ship.name}</p>
        {ship.profile.name !== ship.name && (
          <p className="font-mono text-xs text-(--neon-cyan) truncate">{ship.profile.name}</p>
        )}
        <p className="font-mono text-xs text-slate-400">
          Hull {ship.hullCurrent}/{ship.profile.hull}
          {ship.evasiveThrust > 0 && (
            <span className="ml-2 text-sky-400">· Evasion {ship.evasiveThrust}</span>
          )}
        </p>
        {INITIATIVE_GATED_PHASES.includes(phase) && !isCurrentActor && (
          <p className="font-mono text-xs text-slate-400 mt-0.5">Not this ship&apos;s turn</p>
        )}
      </div>

      {/* ── Destroyed wreck — no combat actions available ─────────── */}
      {ship.isDestroyed && (
        <p className="px-3 py-1.5 font-mono text-xs text-red-400">WRECK — no actions available</p>
      )}

      {/* ── Acceleration: thrust (vectorial) or range band change (basic) ── */}
      {!ship.isDestroyed && phase === 'acceleration' && combatMode === 'vectorial' && isCurrentActor && (
        <>
          <MenuItem icon="🚀" label="Apply Thrust" onClick={() => { startThrustTargeting(targetId); close() }} />
          <MenuDivider />
        </>
      )}
      {!ship.isDestroyed && phase === 'acceleration' && combatMode === 'basic' && isCurrentActor && (
        <>
          <MenuItem icon="🧭" label="Manoeuvre…" onClick={() => open('basicManoeuvre', { shipId: targetId })} />
          <MenuDivider />
        </>
      )}

      {/* ── Attack: weapons ───────────────────────────────────────── */}
      {!ship.isDestroyed && phase === 'attack' && isCurrentActor && (
        <>
          {hasUnfiredOffensiveTurret(ship)
            ? <MenuItem icon="🎯" label="Attack…" onClick={() => open('attack', { shipId: targetId })} />
            : <MenuItemDisabled icon="🎯" label="Attack…" reason="All weapons fired" />
          }
          <MenuDivider />
        </>
      )}

      {/* ── Acceleration: Manoeuvre Step crew actions (Aid Gunners) ── */}
      {!ship.isDestroyed && phase === 'acceleration' && isCurrentActor && hasAvailablePhaseCrewAction(ship, 'acceleration') && (
        <>
          <MenuItem icon="⚡" label="Crew Action…" onClick={() => open('action', { shipId: targetId })} />
          <MenuDivider />
        </>
      )}

      {/* ── Actions: Actions Step crew actions ────────────────────── */}
      {!ship.isDestroyed && phase === 'actions' && isCurrentActor && hasAvailablePhaseCrewAction(ship, 'actions') && (
        <>
          <MenuItem icon="⚡" label="Crew Action…" onClick={() => open('action', { shipId: targetId })} />
          <MenuDivider />
        </>
      )}

      {/* ── Boarding: only on current actor's turn ────────────────── */}
      {!ship.isDestroyed && isCurrentActor && boardingTargets.length > 0 && (
        <>
          {boardingTargets.map((t) => (
            <MenuItem
              key={t.id}
              icon="⚔️"
              label={`Board ${t.name}…`}
              onClick={() => open('boarding-setup', { attackerId: targetId })}
            />
          ))}
          <MenuDivider />
        </>
      )}

      {/* ── Always available ──────────────────────────────────────── */}
      {!ship.isDestroyed && (
        <MenuItem icon="👥" label="Assign Crew…" onClick={() => open('crewAssignment', { shipId: targetId })} />
      )}
      <MenuItem icon="✏️" label="Rename…" onClick={() => open('renameShip', { shipId: targetId })} />
      <MenuItem icon="📊" label="Ship Sheet" onClick={() => open('shipDetail', { shipId: targetId })} />
      <MenuDivider />
      {ship.isDestroyed
        ? <MenuItem icon="💀" label="Remove Wreck" danger onClick={() => { removeShip(targetId); close() }} />
        : <MenuItem icon="🗑" label="Remove from battle" danger onClick={() => { removeShip(targetId); close() }} />
      }

    </MenuShell>
  )
}

// === MISSILE CONTEXT ===

function MissileContextMenu({ x, y, menuRef, missile, targetId, close }) {
  const ships         = useBattleStore((s) => s.ships)
  const removeMissile = useBattleStore((s) => s.removeMissile)

  const launchedBy = ships.find((s) => s.id === missile?.launchedBy)
  const target     = ships.find((s) => s.id === missile?.target)

  return (
    <MenuShell x={x} y={y} menuRef={menuRef}>
      <div className="px-3 py-1.5 bg-slate-800 border-b border-slate-700">
        <p className="font-mono text-xs text-yellow-400 font-bold">
          Salvo — {missile?.count ?? '?'} missiles ({missile?.type ?? 'Standard'})
        </p>
        <p className="font-mono text-xs text-slate-400">
          {launchedBy?.name ?? '?'} → {target?.name ?? '?'}
        </p>
        <p className="font-mono text-xs text-slate-400">
          Thrust remaining: {missile?.thrustRemaining ?? '?'}/10
        </p>
      </div>
      <MenuItem
        icon="🗑"
        label="Remove salvo"
        danger
        onClick={() => { removeMissile(targetId); close() }}
      />
    </MenuShell>
  )
}

// === EMPTY CELL CONTEXT ===

function EmptyContextMenu({ x, y, menuRef, hex, close }) {
  const openModal       = useUiStore((s) => s.openModal)
  const advancePhase    = useBattleStore((s) => s.advancePhase)
  const phase           = useBattleStore((s) => s.phase)
  const obstaclesEnabled = useBattleStore((s) => s.obstaclesEnabled)

  return (
    <MenuShell x={x} y={y} menuRef={menuRef}>
      <MenuItem icon="➕" label="Add ship here"    onClick={() => { openModal('addShip',     { hex }); close() }} />
      {obstaclesEnabled && (
        <MenuItem icon="🪨" label="Place obstacle here" onClick={() => { openModal('placeObstacle', { hex }); close() }} />
      )}
      <MenuDivider />
      <MenuItem icon="📂" label="Load profiles"    onClick={() => { openModal('shipProfile', { mode: 'import' }); close() }} />
      <MenuItem icon="💾" label="Save profiles"    onClick={() => { openModal('shipProfile', { mode: 'export' }); close() }} />
      <MenuDivider />
      <MenuItem icon="📖" label="Legend"           onClick={() => { openModal('legend'); close() }} />
      <MenuDivider />
      {phase === 'initiative' && (
        <>
          <MenuItem icon="🎲" label="Roll Initiative…" onClick={() => { openModal('initiative'); close() }} />
          <MenuDivider />
        </>
      )}
      <MenuItem icon="🔄" label="Next phase"       onClick={() => { advancePhase(); close() }} />
    </MenuShell>
  )
}

// === OBSTACLE CONTEXT ===

function ObstacleContextMenu({ x, y, menuRef, obstacle, close }) {
  const openModal      = useUiStore((s) => s.openModal)
  const removeObstacle = useBattleStore((s) => s.removeObstacle)

  const typeLabel = {
    asteroid_field: obstacle.density === 'dense' ? 'Dense Asteroid Field' : 'Light Asteroid Field',
    debris_field:   'Debris Field',
    gravity_well:   'Gravity Well',
    nebula:         'Nebula',
  }[obstacle.type] ?? obstacle.type

  return (
    <MenuShell x={x} y={y} menuRef={menuRef}>
      <div className="px-3 py-2 border-b border-slate-700/50">
        <p className="font-mono text-xs text-slate-200">{typeLabel}{obstacle.label ? ` — ${obstacle.label}` : ''}</p>
        <p className="font-mono text-xs text-slate-500">Radius: {obstacle.radius} hex</p>
      </div>
      <MenuItem icon="✏️" label="Edit obstacle"   onClick={() => { openModal('placeObstacle', { obstacle, hex: obstacle.position }); close() }} />
      <MenuItem icon="🗑️" label="Remove obstacle" danger onClick={() => { removeObstacle(obstacle.id); close() }} />
    </MenuShell>
  )
}

// === DISPATCHER ===

/**
 * Map context type → { component, getProps }.
 * Extend here to support new context types — no other file needs to change.
 * @type {Record<string, { component: Function, getProps: Function }>}
 */
const MENU_MAP = {
  ship:    { component: ShipContextMenu,    getProps: (ctx) => ({ ship: ctx.ship,       targetId: ctx.targetId }) },
  missile: { component: MissileContextMenu, getProps: (ctx) => ({ missile: ctx.missile, targetId: ctx.targetId }) },
  empty:   { component: EmptyContextMenu,   getProps: (ctx) => ({ hex: ctx.hex }) },
}

export function ContextMenu() {
  const contextMenu      = useUiStore((s) => s.contextMenu)
  const hideContextMenu  = useUiStore((s) => s.hideContextMenu)
  const ships            = useBattleStore((s) => s.ships)
  const missiles         = useBattleStore((s) => s.missiles)
  const obstacles        = useBattleStore((s) => s.obstacles)
  const obstaclesEnabled = useBattleStore((s) => s.obstaclesEnabled)
  const menuRef          = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        hideContextMenu()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu, hideContextMenu])

  if (!contextMenu) return null

  const { x, y, type, targetId, hex } = contextMenu
  const ship    = ships.find((s) => s.id === targetId)    ?? null
  const missile = missiles.find((m) => m.id === targetId) ?? null
  const close   = () => hideContextMenu()

  // Obstacle right-click takes priority over empty-cell menu when obstaclesEnabled
  if (type === 'empty' && obstaclesEnabled && hex) {
    const obstacle = getObstacleAt(obstacles, hex)
    if (obstacle) {
      return <ObstacleContextMenu x={x} y={y} menuRef={menuRef} close={close} obstacle={obstacle} />
    }
  }

  const entry = MENU_MAP[type]
  if (!entry) return null

  const { component: MenuComponent, getProps } = entry
  const shared = { x, y, menuRef, close }
  const typeCtx = { ship, missile, targetId, hex }

  return <MenuComponent {...shared} {...getProps(typeCtx)} />
}
