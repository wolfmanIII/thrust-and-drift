/**
 * BattleLog — collapsible bottom-overlay event log.
 * Shows the last N entries; auto-scrolls to bottom on new entries.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore }     from '../../store/uiStore.js'

const MAX_VISIBLE = 60
const DEFAULT_HEIGHT = 160
const MIN_HEIGHT     = 80
const MAX_HEIGHT     = 600

const TYPE_COLORS = {
  move:   'text-blue-400',
  attack: 'text-red-400',
  damage: 'text-orange-400',
  action: 'text-purple-400',
  system: 'text-slate-400',
  info:   'text-slate-300',
}

const TYPE_PREFIX = {
  move:   '→',
  attack: '⚡',
  damage: '💥',
  action: '⚙',
  system: '·',
  info:   '»',
}

export function BattleLog() {
  const [collapsed, setCollapsed] = useState(true)
  const [height, setHeight]       = useState(DEFAULT_HEIGHT)
  const log                   = useBattleStore((s) => s.log)
  const clearLog              = useBattleStore((s) => s.clearLog)
  const reopenMissileImpact   = useBattleStore((s) => s.reopenMissileImpact)
  const pendingMissileImpacts = useBattleStore((s) => s.pendingMissileImpacts)
  const activeModal           = useUiStore((s) => s.activeModal)
  const impactBusy            = pendingMissileImpacts.length > 0 || activeModal !== null
  const listRef               = useRef(null)
  const dragState             = useRef(null) // { startY, startH }

  const visible = log.slice(-MAX_VISIBLE)

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (!collapsed && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [log.length, collapsed])

  const onDragStart = useCallback((e) => {
    dragState.current = { startY: e.clientY, startH: height }
    e.preventDefault()
  }, [height])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragState.current) return
      const delta = dragState.current.startY - e.clientY
      setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, dragState.current.startH + delta)))
    }
    const onUp = () => { dragState.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <div
      className="absolute bottom-7 left-0 z-10 w-1/3 transition-[height] duration-200"
      style={{ height: collapsed ? 32 : height }}
    >
      <div className="h-full bg-slate-950/85 border-t border-slate-700 backdrop-blur-sm flex flex-col">
        {/* Resize handle — drag upward to expand */}
        {!collapsed && (
          <div
            onMouseDown={onDragStart}
            className="shrink-0 h-1.5 w-full cursor-ns-resize group"
            title="Drag to resize"
          >
            <div className="mx-auto mt-px w-10 h-0.5 rounded-full bg-slate-700 group-hover:bg-slate-500 transition-colors" />
          </div>
        )}

        {/* Header bar */}
        <div className="flex items-center gap-3 px-3 py-1 border-b border-slate-800 shrink-0">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors font-mono text-xs tracking-widest"
          >
            <span>{collapsed ? '▲' : '▼'}</span>
            <span>BATTLE LOG</span>
            <span className="text-slate-400">({log.length})</span>
          </button>
          <button
            onClick={clearLog}
            className="ml-auto text-slate-400 hover:text-red-400 font-mono text-xs transition-colors"
          >
            CLEAR
          </button>
        </div>

        {/* Entries */}
        {!collapsed && (
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-1 space-y-px">
            {visible.length === 0 && (
              <p className="text-slate-400 font-mono text-xs italic">No events recorded.</p>
            )}
            {visible.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2 font-mono text-xs leading-relaxed">
                <span className={`shrink-0 ${TYPE_COLORS[entry.type] ?? 'text-slate-400'}`}>
                  {TYPE_PREFIX[entry.type] ?? '·'}
                </span>
                <span className="text-slate-400 shrink-0">R{entry.round}</span>
                <span className="text-slate-300 flex-1">{entry.message}</span>
                {entry.details?.recoverable && (
                  <button
                    disabled={impactBusy}
                    onClick={() => reopenMissileImpact(entry.details.impact)}
                    className={`shrink-0 leading-none transition-colors ${
                      impactBusy
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-amber-500 hover:text-amber-300'
                    }`}
                    title={impactBusy ? 'Resolve pending modals first' : 'Re-open impact resolution'}
                  >
                    ↩
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
