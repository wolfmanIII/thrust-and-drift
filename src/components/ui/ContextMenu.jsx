/**
 * ContextMenu — right-click overlay rendered at canvas pixel position.
 * Dispatches to ShipContextMenu or EmptyContextMenu based on context type.
 * Adding a new type: add a new *ContextMenu component, register in MENU_MAP.
 */

import { useEffect, useRef } from 'react'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

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

function ShipContextMenu({ x, y, menuRef, ship, targetId, close }) {
  const openModal  = useUiStore((s) => s.openModal)
  const removeShip = useBattleStore((s) => s.removeShip)

  return (
    <MenuShell x={x} y={y} menuRef={menuRef}>
      <div className="px-3 py-1.5 bg-slate-800 border-b border-slate-700">
        <p className="font-mono text-xs text-[--neon-cyan] font-bold truncate">{ship.profile.name}</p>
        <p className="font-mono text-xs text-slate-400">
          Hull {ship.hullCurrent}/{ship.profile.hull}
          {ship.evasiveThrust > 0 && (
            <span className="ml-2 text-sky-400">· Evasione {ship.evasiveThrust}</span>
          )}
        </p>
      </div>
      <MenuItem icon="🚀" label="Applica Thrust"       onClick={() => { openModal('thrust',        { shipId: targetId }); close() }} />
      <MenuItem icon="🛡" label="Dichiara Evasione"    onClick={() => { openModal('evasive',       { shipId: targetId }); close() }} />
      <MenuItem icon="🎯" label="Attacca…"             onClick={() => { openModal('attack',        { shipId: targetId }); close() }} />
      {hasMissileRack(ship) && (
        <MenuItem icon="🚀" label="Lancia Missili…"   onClick={() => { openModal('missileLaunch', { shipId: targetId }); close() }} />
      )}
      <MenuItem icon="⚡" label="Azione equipaggio…"  onClick={() => { openModal('action',        { shipId: targetId }); close() }} />
      <MenuDivider />
      <MenuItem icon="📊" label="Scheda nave"          onClick={() => { openModal('shipDetail',    { shipId: targetId }); close() }} />
      <MenuDivider />
      <MenuItem icon="🗑" label="Rimuovi dalla battaglia" danger onClick={() => { removeShip(targetId); close() }} />
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
          Salvo — {missile?.count ?? '?'} missili ({missile?.type ?? 'Standard'})
        </p>
        <p className="font-mono text-xs text-slate-400">
          {launchedBy?.profile.name ?? '?'} → {target?.profile.name ?? '?'}
        </p>
        <p className="font-mono text-xs text-slate-500">
          Thrust rimanente: {missile?.thrustRemaining ?? '?'}/10
        </p>
      </div>
      <MenuItem
        icon="🗑"
        label="Rimuovi salvo"
        danger
        onClick={() => { removeMissile(targetId); close() }}
      />
    </MenuShell>
  )
}

// === EMPTY CELL CONTEXT ===

function EmptyContextMenu({ x, y, menuRef, hex, close }) {
  const openModal         = useUiStore((s) => s.openModal)
  const advancePhase      = useBattleStore((s) => s.advancePhase)
  const rollAllInitiative = useBattleStore((s) => s.rollAllInitiative)

  return (
    <MenuShell x={x} y={y} menuRef={menuRef}>
      <MenuItem icon="➕" label="Aggiungi nave qui"  onClick={() => { openModal('addShip',     { hex }); close() }} />
      <MenuDivider />
      <MenuItem icon="📂" label="Carica profili"     onClick={() => { openModal('shipProfile', { mode: 'import' }); close() }} />
      <MenuItem icon="💾" label="Salva profili"      onClick={() => { openModal('shipProfile', { mode: 'export' }); close() }} />
      <MenuDivider />
      <MenuItem icon="🎲" label="Tira iniziativa"   onClick={() => { rollAllInitiative(); close() }} />
      <MenuItem icon="🔄" label="Fase successiva"   onClick={() => { advancePhase(); close() }} />
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
