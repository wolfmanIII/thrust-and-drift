/**
 * ShipTooltip — hover tooltip for ship tokens on the battle map.
 * Rendered via portal to document.body (avoids canvas overflow clipping).
 * Reads hovered ship coordinates from uiStore; hides when context menu is open.
 */

import { createPortal } from 'react-dom'
import { useUiStore }    from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { hexMagnitude }  from '../../utils/hex.js'

const FACTION_LABEL = { players: 'PLAYERS', npc: 'NPC', neutral: 'NEUTRAL' }
const FACTION_COLOR = { players: '#22d3ee', npc: '#f87171', neutral: '#94a3b8' }

// ── Sub-components ────────────────────────────────────────────────────────────

function HullBar({ current, max }) {
  const pct = max > 0 ? Math.max(0, current / max) : 0
  const color = pct > 0.6 ? '#22c55e' : pct > 0.3 ? '#eab308' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-none" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
        {current}/{max}
      </span>
    </div>
  )
}

/** @param {{ label: string, value: string|number, accent?: boolean }} props */
function StatRow({ label, value, accent = false }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="font-mono text-xs text-slate-400 shrink-0">{label}</span>
      <span className={`font-mono text-xs text-right truncate ${accent ? 'text-sky-400' : 'text-slate-300'}`}>
        {value}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ShipTooltip() {
  const hoveredShip = useUiStore((s) => s.hoveredShip)
  const contextMenu = useUiStore((s) => s.contextMenu)
  const ships       = useBattleStore((s) => s.ships)

  if (!hoveredShip || contextMenu) return null

  const ship = ships.find((s) => s.id === hoveredShip.shipId)
  if (!ship) return null

  const thrustAvail = Math.max(0, ship.profile.thrust + (ship.thrustBonusThisRound ?? 0) - ship.thrustUsedThisRound - (ship.thrustPenalty ?? 0))
  const vectorMag   = hexMagnitude(ship.vector)
  const factionColor = FACTION_COLOR[ship.faction] ?? FACTION_COLOR.neutral

  // Flip toward viewport center when cursor is in the right/bottom 35%
  const flipX = hoveredShip.x > window.innerWidth  * 0.65
  const flipY = hoveredShip.y > window.innerHeight * 0.65

  const style = {
    position:      'fixed',
    zIndex:        9999,
    pointerEvents: 'none',
    left:   flipX ? undefined : hoveredShip.x + 14,
    right:  flipX ? window.innerWidth  - hoveredShip.x + 14 : undefined,
    top:    flipY ? undefined : hoveredShip.y + 14,
    bottom: flipY ? window.innerHeight - hoveredShip.y + 14 : undefined,
  }

  return createPortal(
    <div style={style} className="w-56 bg-slate-900/95 border border-slate-700 rounded shadow-xl shadow-black/70 overflow-hidden">

      {/* ── Header: name + faction ─────────────────────────────────────── */}
      <div className="px-3 pt-2.5 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ship.color }} />
          <span className="font-mono font-bold text-xs text-slate-100 truncate">{ship.profile.name}</span>
        </div>
        <span className="font-mono text-xs mt-0.5 block" style={{ color: factionColor }}>
          {FACTION_LABEL[ship.faction] ?? ship.faction.toUpperCase()}
        </span>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="px-3 py-2 space-y-1.5">
        <div>
          <span className="font-mono text-xs text-slate-400 uppercase tracking-widest block mb-0.5">Hull</span>
          <HullBar current={ship.hullCurrent} max={ship.profile.hull} />
        </div>

        <StatRow
          label="Vector"
          value={`(${ship.vector.q}, ${ship.vector.r})  |v|: ${vectorMag}`}
        />
        <StatRow
          label="Thrust"
          value={`${thrustAvail} avail. / ${ship.profile.thrust} max`}
        />
        {ship.evasiveThrust > 0 && (
          <StatRow label="Evading" value={`${ship.evasiveThrust} thrust used`} accent />
        )}
        {ship.initiative > 0 && (
          <StatRow label="Initiative" value={ship.initiative} />
        )}
        {ship.sensorLockOn && (
          <StatRow label="Sensor Lock" value="attivo" accent />
        )}
      </div>

      {/* ── Critical hits ──────────────────────────────────────────────── */}
      {ship.criticalHits?.length > 0 && (
        <div className="px-3 pb-2.5 border-t border-slate-800 pt-2">
          <span className="font-mono text-xs text-red-400 uppercase tracking-widest">
            Critical ({ship.criticalHits.length})
          </span>
          <ul className="mt-1 space-y-0.5">
            {ship.criticalHits.map((c, i) => (
              <li key={i} className="font-mono text-xs text-red-300">
                ⚠ {c.system} <span className="text-red-500/70">Sev.{c.severity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>,
    document.body
  )
}
