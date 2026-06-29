/**
 * PhaseTracker — top-right collapsible panel showing initiative order.
 * Highlights the current actor.
 */

import { useState } from 'react'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore } from '../../store/uiStore.js'

export function PhaseTracker() {
  const [collapsed, setCollapsed] = useState(false)

  const initiativeOrder   = useBattleStore((s) => s.initiativeOrder)
  const currentActorIndex = useBattleStore((s) => s.currentActorIndex)
  const phase             = useBattleStore((s) => s.phase)
  const combatMode        = useBattleStore((s) => s.combatMode)
  const ships             = useBattleStore((s) => s.ships)
  const shipAddedThisRound = useBattleStore((s) => s.shipAddedThisRound)
  const requestCenterOn   = useUiStore((s) => s.requestCenterOn)

  if (initiativeOrder.length === 0) return null

  // Vectorial only: Acceleration uses reverse initiative order (TC p.174).
  // Basic mode Manoeuvre Step uses normal initiative order (CRB p.164).
  const displayOrder = (phase === 'acceleration' && combatMode === 'vectorial')
    ? [...initiativeOrder].reverse()
    : initiativeOrder
  const shipMap = Object.fromEntries(ships.map((s) => [s.id, s]))

  return (
    <div className="absolute top-10 right-3 z-10 w-48">
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
            {displayOrder.map((id, idx) => {
              const ship = shipMap[id]
              if (!ship) return null
              const isActive = idx === currentActorIndex
              return (
                <li
                  key={id}
                  className={`flex items-center gap-2 px-3 py-1 ${isActive ? 'bg-slate-700/60' : ''}`}
                >
                  <span className="text-slate-400 font-mono text-xs w-3">{isActive ? '●' : '○'}</span>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: ship.color }}
                  />
                  <button
                    onClick={() => requestCenterOn(ship.position)}
                    className={`font-mono text-xs truncate text-left hover:text-slate-200 transition-colors ${isActive ? 'text-(--neon-cyan)' : 'text-slate-400'}`}
                    title="Centre map on this ship"
                  >
                    {ship.profile.name}
                  </button>
                  <span className="ml-auto font-mono text-xs text-slate-400 flex items-center gap-1">
                    {ship.initiative === 0
                      ? <span title="Initiative not yet rolled — re-roll pending at round start" className="text-slate-600">—</span>
                      : ship.initiative
                    }
                    {(ship.initiativeTemporaryBonus ?? 0) > 0 && (
                      <span className="text-amber-400 text-[10px]">↑ini</span>
                    )}
                  </span>
                </li>
              )
            })}
            {shipAddedThisRound && (
              <li className="px-3 py-1 border-t border-slate-700/30">
                <span className="font-mono text-[10px] text-amber-400/70" title="A ship was added mid-battle — all ships re-roll initiative at the start of the next round">
                  ↺ re-roll next round
                </span>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
