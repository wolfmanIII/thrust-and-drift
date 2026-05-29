/**
 * BasicBattleView — battle screen for standard (non-vectorial) combat.
 * No hex map: ships are listed as cards grouped by faction.
 * Right-click a card to open the context menu (thrust/evasive hidden by store).
 * // MgT2e CRB pp.160–168
 */

import { useRef, useCallback } from 'react'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore }     from '../../store/uiStore.js'

function HullBar({ current, max }) {
  const pct = max > 0 ? Math.max(0, current / max) : 0
  const color = pct > 0.6 ? '#22c55e' : pct > 0.3 ? '#eab308' : '#ef4444'
  return (
    <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
    </div>
  )
}

function ShipCard({ ship }) {
  const showContextMenu = useUiStore((s) => s.showContextMenu)
  const cardRef = useRef(null)

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    const rect = cardRef.current?.getBoundingClientRect()
    showContextMenu({ x: rect ? rect.left : e.clientX, y: rect ? rect.bottom + 4 : e.clientY, type: 'ship', targetId: ship.id })
  }, [ship.id, showContextMenu])

  return (
    <div
      ref={cardRef}
      onContextMenu={handleContextMenu}
      className="bg-slate-900 border border-slate-700 rounded-lg p-3 cursor-context-menu hover:border-slate-500 transition-colors select-none"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ship.color }} />
        <span className="font-mono text-sm text-slate-200 font-bold truncate">{ship.profile.name}</span>
        {ship.evasiveThrust > 0 && (
          <span className="ml-auto text-sky-400 font-mono text-xs shrink-0">EVA {ship.evasiveThrust}</span>
        )}
      </div>
      <HullBar current={ship.hullCurrent} max={ship.profile.hull} />
      <div className="flex justify-between mt-1.5">
        <span className="font-mono text-xs text-slate-500">
          Hull {ship.hullCurrent}/{ship.profile.hull}
        </span>
        <span className="font-mono text-xs text-slate-600">
          Ini {ship.initiative}
        </span>
      </div>
      {ship.criticalHits?.length > 0 && (
        <p className="mt-1 font-mono text-xs text-red-400">
          ⚠ {ship.criticalHits.length} colpo/i critico/i
        </p>
      )}
    </div>
  )
}

const FACTION_LABELS = {
  players: 'GIOCATORI',
  npc:     'NPC',
  neutral: 'NEUTRALI',
}

const FACTION_COLORS = {
  players: 'text-[--neon-cyan] border-[--neon-cyan]/30',
  npc:     'text-red-400 border-red-400/30',
  neutral: 'text-slate-400 border-slate-600',
}

export function BasicBattleView() {
  const ships = useBattleStore((s) => s.ships)

  const byFaction = ships.reduce((acc, ship) => {
    const f = ship.faction ?? 'neutral'
    if (!acc[f]) acc[f] = []
    acc[f].push(ship)
    return acc
  }, {})

  return (
    <div className="w-full h-full overflow-y-auto p-6">
      {ships.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="font-mono text-slate-600 text-sm tracking-widest">
            No ships — right-click to add
          </p>
        </div>
      )}
      <div className="max-w-4xl mx-auto space-y-6">
        {Object.entries(byFaction).map(([faction, factionShips]) => (
          <div key={faction}>
            <h2 className={`font-display text-xs tracking-widest mb-3 pb-1.5 border-b ${FACTION_COLORS[faction] ?? FACTION_COLORS.neutral}`}>
              {FACTION_LABELS[faction] ?? faction.toUpperCase()}
              <span className="ml-2 text-slate-600">({factionShips.length})</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {factionShips.map((ship) => (
                <ShipCard key={ship.id} ship={ship} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
