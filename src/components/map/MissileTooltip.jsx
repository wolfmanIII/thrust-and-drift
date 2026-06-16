/**
 * MissileTooltip — hover tooltip for missile tokens on the battle map.
 * Rendered via portal to document.body. Reads hoveredMissile from uiStore.
 */

import { createPortal } from 'react-dom'
import { useUiStore }    from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

export function MissileTooltip() {
  const hoveredMissile = useUiStore((s) => s.hoveredMissile)
  const contextMenu    = useUiStore((s) => s.contextMenu)
  const missiles       = useBattleStore((s) => s.missiles)
  const ships          = useBattleStore((s) => s.ships)

  if (!hoveredMissile || contextMenu) return null

  const missile = missiles.find((m) => m.id === hoveredMissile.missileId)
  if (!missile) return null

  const launcher = ships.find((s) => s.id === missile.launchedBy)
  const target   = ships.find((s) => s.id === missile.target)

  const thrustPct = missile.thrustRemaining / 10

  const flipX = hoveredMissile.x > window.innerWidth  * 0.65
  const flipY = hoveredMissile.y > window.innerHeight * 0.65

  const style = {
    position:      'fixed',
    zIndex:        9999,
    pointerEvents: 'none',
    left:   flipX ? undefined : hoveredMissile.x + 14,
    right:  flipX ? window.innerWidth  - hoveredMissile.x + 14 : undefined,
    top:    flipY ? undefined : hoveredMissile.y + 14,
    bottom: flipY ? window.innerHeight - hoveredMissile.y + 14 : undefined,
  }

  return createPortal(
    <div style={style} className="w-48 bg-slate-900/95 border border-yellow-700/50 rounded shadow-xl shadow-black/70 overflow-hidden">

      {/* Header */}
      <div className="px-3 pt-2.5 pb-2 border-b border-slate-800">
        <p className="font-mono text-xs font-bold text-yellow-400">
          🚀 ×{missile.count} {missile.type ?? 'Standard'}
        </p>
      </div>

      {/* Launcher → Target */}
      <div className="px-3 py-2 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-slate-400 shrink-0">From</span>
          {launcher && (
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: launcher.color }} />
          )}
          <span className="font-mono text-xs text-slate-200 truncate">
            {launcher?.profile.name ?? '—'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-slate-400 shrink-0">To</span>
          {target && (
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: target.color }} />
          )}
          <span className="font-mono text-xs text-slate-200 truncate">
            {target?.profile.name ?? '—'}
          </span>
        </div>

        {/* Thrust bar */}
        <div>
          <div className="flex justify-between mb-0.5">
            <span className="font-mono text-xs text-slate-400">Thrust</span>
            <span className="font-mono text-xs text-slate-400">{missile.thrustRemaining}/10</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-none"
              style={{
                width: `${thrustPct * 100}%`,
                backgroundColor: thrustPct > 0.5 ? '#22d3ee' : thrustPct > 0.2 ? '#facc15' : '#f87171',
              }}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
