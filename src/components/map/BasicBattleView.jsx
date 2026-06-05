/**
 * BasicBattleView — battle screen for standard (non-vectorial) combat.
 * No hex map: ships are listed as cards grouped by faction.
 * Right-click a card to open the context menu (thrust/evasive hidden by store).
 * // MgT2e CRB pp.160–168
 */

import { useRef, useCallback, useMemo } from 'react'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore }     from '../../store/uiStore.js'
import { RANGE_BAND_ORDER } from '../../data/rangeBands.js'

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
    e.stopPropagation()
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
  players: 'text-(--neon-cyan) border-(--neon-cyan)/30',
  npc:     'text-red-400 border-red-400/30',
  neutral: 'text-slate-400 border-slate-600',
}

function RangeBandRow({ ship1, ship2, band, onSet }) {
  const openModal = useUiStore((s) => s.openModal)
  const idx = RANGE_BAND_ORDER.indexOf(band)
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ship1.color }} />
      <span className="font-mono text-xs text-slate-300 truncate">{ship1.profile.name}</span>
      <span className="text-slate-600 mx-1">↔</span>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ship2.color }} />
      <span className="font-mono text-xs text-slate-300 truncate">{ship2.profile.name}</span>
      <span className="ml-auto font-mono text-xs text-yellow-400 shrink-0">{band}</span>
      <div className="flex gap-1 shrink-0">
        <button
          disabled={idx <= 0}
          onClick={() => onSet(RANGE_BAND_ORDER[idx - 1])}
          title="Closer"
          className="w-5 h-5 flex items-center justify-center border border-slate-700 text-slate-400 rounded text-xs hover:border-slate-500 hover:text-slate-200 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
        >▼</button>
        <button
          disabled={idx >= RANGE_BAND_ORDER.length - 1}
          onClick={() => onSet(RANGE_BAND_ORDER[idx + 1])}
          title="Further"
          className="w-5 h-5 flex items-center justify-center border border-slate-700 text-slate-400 rounded text-xs hover:border-slate-500 hover:text-slate-200 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
        >▲</button>
      </div>
    </div>
  )
}

export function BasicBattleView() {
  const ships           = useBattleStore((s) => s.ships)
  const rangeBands      = useBattleStore((s) => s.rangeBands)
  const setRangeBand    = useBattleStore((s) => s.setRangeBand)
  const showContextMenu = useUiStore((s) => s.showContextMenu)

  const handleContainerContextMenu = useCallback((e) => {
    e.preventDefault()
    showContextMenu({ x: e.clientX, y: e.clientY, type: 'empty', hex: null })
  }, [showContextMenu])

  const byFaction = ships.reduce((acc, ship) => {
    const f = ship.faction ?? 'neutral'
    if (!acc[f]) acc[f] = []
    acc[f].push(ship)
    return acc
  }, {})

  // Build list of tracked ship pairs (cross-faction only)
  const trackedPairs = useMemo(() => {
    const pairs = []
    const seen = new Set()
    for (const s1 of ships) {
      for (const s2 of ships) {
        if (s1.id === s2.id || s1.faction === s2.faction) continue
        const key = [s1.id, s2.id].sort().join('_')
        if (seen.has(key)) continue
        seen.add(key)
        const band = rangeBands[key]
        if (band) pairs.push({ s1, s2, band, key })
      }
    }
    return pairs
  }, [ships, rangeBands])

  return (
    <div className="w-full h-full overflow-y-auto p-6" onContextMenu={handleContainerContextMenu}>
      {ships.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="font-mono text-slate-600 text-sm tracking-widest">
            No ships — right-click to add
          </p>
        </div>
      )}
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Range bands matrix */}
        {trackedPairs.length > 0 && (
          <div>
            <h2 className="font-display text-xs tracking-widest mb-3 pb-1.5 border-b text-slate-400 border-slate-700">
              DISTANCES
            </h2>
            <div className="divide-y divide-slate-800">
              {trackedPairs.map(({ s1, s2, band, key }) => (
                <RangeBandRow
                  key={key}
                  ship1={s1}
                  ship2={s2}
                  band={band}
                  onSet={(newBand) => setRangeBand(s1.id, s2.id, newBand)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Ships by faction */}
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
