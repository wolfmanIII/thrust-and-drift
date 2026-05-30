/**
 * ContextMenu — right-click overlay rendered at canvas pixel position.
 * Dispatches to ShipContextMenu or EmptyContextMenu based on context type.
 * Adding a new type: add a new *ContextMenu component, register in MENU_MAP.
 */

import { useEffect, useRef } from 'react'
import { useUiStore }    from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { hexDistance }   from '../../utils/hex.js'
import { DEFENSIVE_WEAPONS } from '../../data/weapons.js'

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

/** Returns true if the ship has at least one Missile Rack. */
function hasMissileRack(ship) {
  return (ship.profile.turrets ?? [])
    .flatMap((t) => t.weapons)
    .includes('Missile Rack')
}

/** Returns true if the ship has at least one offensive turret that hasn't fired this round. */
function hasUnfiredOffensiveTurret(ship) {
  const fired = ship.firedTurrets ?? []
  return (ship.profile.turrets ?? [])
    .filter((t) => !fired.includes(t.slot))
    .flatMap((t) => t.weapons)
    .some((w) => !DEFENSIVE_WEAPONS.includes(w))
}

function ShipContextMenu({ x, y, menuRef, ship, targetId, close }) {
  const openModal  = useUiStore((s) => s.openModal)
  const removeShip = useBattleStore((s) => s.removeShip)
  const combatMode = useBattleStore((s) => s.combatMode)
  const phase      = useBattleStore((s) => s.phase)
  const ships      = useBattleStore((s) => s.ships)

  const open = (modal, payload) => { openModal(modal, payload); close() }

  const boardingTargets = ships.filter((t) => {
    if (t.faction === ship.faction) return false
    if (hexDistance(ship.position, t.position) > 1) return false
    const mDriveDisabled = t.criticalHits?.some((c) => c.system === 'm-drive' && c.disabled)
    return mDriveDisabled || ship.profile.thrust >= t.profile.thrust
  })

  return (
    <MenuShell x={x} y={y} menuRef={menuRef}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="px-3 py-1.5 bg-slate-800 border-b border-slate-700">
        <p className="font-mono text-xs text-(--neon-cyan) font-bold truncate">{ship.profile.name}</p>
        <p className="font-mono text-xs text-slate-400">
          Hull {ship.hullCurrent}/{ship.profile.hull}
          {ship.evasiveThrust > 0 && (
            <span className="ml-2 text-sky-400">· Evasion {ship.evasiveThrust}</span>
          )}
        </p>
      </div>

      {/* ── Acceleration: thrust + evasion (vectorial only) ──────── */}
      {phase === 'acceleration' && combatMode === 'vectorial' && (
        <>
          <MenuItem icon="🚀" label="Apply Thrust"     onClick={() => open('thrust',  { shipId: targetId })} />
          <MenuItem icon="🛡" label="Declare Evasion" onClick={() => open('evasive', { shipId: targetId })} />
          <MenuDivider />
        </>
      )}

      {/* ── Attack: weapons + missiles ────────────────────────────── */}
      {phase === 'attack' && (
        <>
          {hasUnfiredOffensiveTurret(ship) && (
            <MenuItem icon="🎯" label="Attack…"           onClick={() => open('attack',        { shipId: targetId })} />
          )}
          {hasMissileRack(ship) && (
            <MenuItem icon="🚀" label="Launch Missiles…" onClick={() => open('missileLaunch', { shipId: targetId })} />
          )}
          <MenuDivider />
        </>
      )}

      {/* ── Actions: crew actions ─────────────────────────────────── */}
      {phase === 'actions' && (
        <>
          <MenuItem icon="⚡" label="Crew Action…" onClick={() => open('action', { shipId: targetId })} />
          <MenuDivider />
        </>
      )}

      {/* ── Boarding: available when adjacent to a valid enemy ───── */}
      {boardingTargets.length > 0 && (
        <>
          {boardingTargets.map((t) => (
            <MenuItem
              key={t.id}
              icon="⚔"
              label={`Board ${t.profile.name}…`}
              onClick={() => open('boarding-setup', { attackerId: targetId })}
            />
          ))}
          <MenuDivider />
        </>
      )}

      {/* ── Always available ──────────────────────────────────────── */}
      <MenuItem icon="📊" label="Ship Sheet"           onClick={() => open('shipDetail', { shipId: targetId })} />
      <MenuDivider />
      <MenuItem icon="🗑" label="Remove from battle" danger onClick={() => { removeShip(targetId); close() }} />

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
          {launchedBy?.profile.name ?? '?'} → {target?.profile.name ?? '?'}
        </p>
        <p className="font-mono text-xs text-slate-500">
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
  const openModal    = useUiStore((s) => s.openModal)
  const advancePhase = useBattleStore((s) => s.advancePhase)
  const phase        = useBattleStore((s) => s.phase)

  return (
    <MenuShell x={x} y={y} menuRef={menuRef}>
      <MenuItem icon="➕" label="Add ship here"    onClick={() => { openModal('addShip',     { hex }); close() }} />
      <MenuDivider />
      <MenuItem icon="📂" label="Load profiles"    onClick={() => { openModal('shipProfile', { mode: 'import' }); close() }} />
      <MenuItem icon="💾" label="Save profiles"    onClick={() => { openModal('shipProfile', { mode: 'export' }); close() }} />
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
  const contextMenu     = useUiStore((s) => s.contextMenu)
  const hideContextMenu = useUiStore((s) => s.hideContextMenu)
  const ships           = useBattleStore((s) => s.ships)
  const missiles        = useBattleStore((s) => s.missiles)
  const menuRef         = useRef(null)

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

  const entry = MENU_MAP[type]
  if (!entry) return null

  const { component: MenuComponent, getProps } = entry
  const shared = { x, y, menuRef, close }
  const typeCtx = { ship, missile, targetId, hex }

  return <MenuComponent {...shared} {...getProps(typeCtx)} />
}
