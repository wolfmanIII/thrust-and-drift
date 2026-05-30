/**
 * PhaseTracker — top-right collapsible panel showing initiative order.
 * Highlights the current actor.
 */

import { useState } from 'react'
import { useBattleStore } from '../../store/battleStore.js'

export function PhaseTracker() {
  const [collapsed, setCollapsed] = useState(false)

  const initiativeOrder   = useBattleStore((s) => s.initiativeOrder)
  const currentActorIndex = useBattleStore((s) => s.currentActorIndex)
  const ships             = useBattleStore((s) => s.ships)

  if (initiativeOrder.length === 0) return null

  const shipMap = Object.fromEntries(ships.map((s) => [s.id, s]))

  return (
    <div className="absolute top-3 right-3 z-10 w-48">
      <div className="bg-slate-900/80 border border-slate-700 rounded backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span className="font-display text-xs tracking-widest">INITIATIVE</span>
          <span className="text-xs">{collapsed ? '▼' : '▲'}</span>
        </button>

        {/* List */}
        {!collapsed && (
          <ul className="border-t border-slate-700/50">
            {initiativeOrder.map((id, idx) => {
              const ship = shipMap[id]
              if (!ship) return null
              const isActive = idx === currentActorIndex
              return (
                <li
                  key={id}
                  className={`flex items-center gap-2 px-3 py-1 ${isActive ? 'bg-slate-700/60' : ''}`}
                >
                  <span className="text-slate-500 font-mono text-xs w-3">{isActive ? '●' : '○'}</span>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: ship.color }}
                  />
                  <span
                    className={`font-mono text-xs truncate ${isActive ? 'text-[--neon-cyan]' : 'text-slate-400'}`}
                  >
                    {ship.profile.name}
                  </span>
                  <span className="ml-auto font-mono text-xs text-slate-600">{ship.initiative}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
