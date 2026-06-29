/**
 * BasicBattleView — battle screen for standard (non-vectorial) combat.
 * No hex map: ships are listed as bento cards grouped by faction.
 * Right-click a card to open the context menu.
 * // MgT2e CRB pp.160–168
 */

import { useRef, useCallback, useMemo } from 'react'
import { useBattleStore }    from '../../store/battleStore.js'
import { useUiStore }        from '../../store/uiStore.js'
import { countMissileAmmoCapacity, countSandcasters } from '../../utils/combat.js'
import { RANGE_BAND_ORDER, RANGE_BAND_MOVE_COST }  from '../../data/rangeBands.js'

const MISSILE_BASIC_THRUST = 10  // MgT2e CRB p.162

/** Estimate rounds until a basic-mode missile impacts its target. */
function estimateRoundsToImpact(missile) {
  if (!missile.basicRangeBand) return null
  let band = missile.basicRangeBand
  let accumulated = missile.basicThrustAccumulated ?? 0
  let rounds = 0
  const MAX = 99
  while (band !== 'Adjacent' && rounds < MAX) {
    rounds++
    let budget = MISSILE_BASIC_THRUST
    while (budget > 0) {
      const idx = RANGE_BAND_ORDER.indexOf(band)
      if (idx <= 0) { band = 'Adjacent'; break }
      const cost  = RANGE_BAND_MOVE_COST[band] ?? 1
      const total = accumulated + budget
      if (total >= cost) { budget = total - cost; accumulated = 0; band = RANGE_BAND_ORDER[idx - 1] }
      else { accumulated = total; budget = 0 }
    }
  }
  return rounds
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function HullBar({ current, max }) {
  const pct   = max > 0 ? Math.max(0, current / max) : 0
  const color = pct > 0.6 ? '#22c55e' : pct > 0.3 ? '#eab308' : '#ef4444'
  return (
    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
    </div>
  )
}

// ── ShipBentoCard ─────────────────────────────────────────────────────────────

/**
 * @param {{ ship: object, ships: object[], missiles: object[], onContextMenu: Function }} props
 */
function ShipBentoCard({ ship, ships, missiles, onContextMenu }) {
  const cardRef = useRef(null)

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = cardRef.current?.getBoundingClientRect()
    onContextMenu({ x: rect ? rect.left : e.clientX, y: rect ? rect.bottom + 4 : e.clientY, type: 'ship', targetId: ship.id })
  }, [ship.id, onContextMenu])

  const inbound  = useMemo(() => missiles.filter((m) => m.target    === ship.id), [missiles, ship.id])
  const launched = useMemo(() => missiles.filter((m) => m.launchedBy === ship.id), [missiles, ship.id])

  const ammoMax     = countMissileAmmoCapacity(ship.profile)
  const sandAmmoMax = countSandcasters(ship.profile)

  const lockerName = ship.sensorLockedBy
    ? (ships.find((s) => s.id === ship.sensorLockedBy)?.name ?? '?')
    : null
  const lockTargetName = ship.sensorLockOn
    ? (ships.find((s) => s.id === ship.sensorLockOn)?.name ?? '?')
    : null

  // Group inbound missiles by launcher; track ETA per group
  const inboundByLauncher = useMemo(() => {
    const map = {}
    inbound.forEach((m) => {
      const name = ships.find((s) => s.id === m.launchedBy)?.name ?? '?'
      const eta  = estimateRoundsToImpact(m)
      if (!map[name]) map[name] = { count: 0, type: m.type ?? 'Missile', eta }
      map[name].count += m.count
      if (eta !== null && (map[name].eta === null || eta < map[name].eta)) map[name].eta = eta
    })
    return Object.entries(map)
  }, [inbound, ships])

  // Group launched missiles by target; track ETA per group
  const launchedByTarget = useMemo(() => {
    const map = {}
    launched.forEach((m) => {
      const name = ships.find((s) => s.id === m.target)?.name ?? '?'
      const eta  = estimateRoundsToImpact(m)
      if (!map[name]) map[name] = { count: 0, type: m.type ?? 'Missile', eta }
      map[name].count += m.count
      if (eta !== null && (map[name].eta === null || eta < map[name].eta)) map[name].eta = eta
    })
    return Object.entries(map)
  }, [launched, ships])

  const hasStatus =
    ship.sensorLockOn ||
    lockerName ||
    inbound.length > 0 ||
    launched.length > 0 ||
    (ship.turretsNeedingReload ?? 0) > 0 ||
    (ship.criticalHits?.length > 0 && !ship.isDestroyed) ||
    ammoMax > 0 ||
    sandAmmoMax > 0 ||
    (ship.ionRoundsLeft ?? 0) > 0

  return (
    <div
      ref={cardRef}
      onContextMenu={handleContextMenu}
      className={`bg-slate-900 border rounded-lg cursor-context-menu transition-colors select-none ${
        ship.isDestroyed
          ? 'border-red-900/50 opacity-40'
          : 'border-slate-700 hover:border-slate-600'
      }`}
    >
      {/* ── Zona A — Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ship.color }} />
        <span className="font-mono text-sm text-slate-200 font-bold truncate">{ship.name}</span>
        <div className="ml-auto flex items-center gap-1 shrink-0 flex-wrap justify-end">
          {ship.isDestroyed && (
            <Badge label="☠ WRECK" className="text-red-400 border-red-800" />
          )}
          {ship.inDogfight && (
            <Badge label="DOGFIGHT" className="text-yellow-400 border-yellow-700" />
          )}
          {ship.inBoarding && (
            <Badge label="BOARDING" className="text-orange-400 border-orange-700" />
          )}
          {!ship.isDestroyed && ship.evasiveThrust > 0 && (
            <Badge label={`EVA ${ship.evasiveThrust}`} className="text-sky-400 border-sky-700" />
          )}
          {(ship.ionRoundsLeft ?? 0) > 0 && (
            <Badge label={`ION ${ship.ionRoundsLeft}R`} className="text-blue-400 border-blue-700" />
          )}
          {lockerName && (
            <Badge label="LOCKED" className="text-red-300 border-red-700" />
          )}
        </div>
      </div>

      {/* ── Zona B — Hull ────────────────────────────────────────────────── */}
      <div className="px-3 pb-2">
        <HullBar current={ship.hullCurrent} max={ship.profile.hull} />
        <div className="flex justify-between mt-1.5">
          <span className="font-mono text-xs text-slate-400">
            Hull {ship.hullCurrent}/{ship.profile.hull}
          </span>
          <span className="font-mono text-xs text-slate-400">
            Ini {ship.initiative}
          </span>
        </div>
      </div>

      {/* ── Zona C — Status ──────────────────────────────────────────────── */}
      {hasStatus && (
        <div className="border-t border-slate-800 bg-slate-950/40 px-3 py-2 rounded-b-lg space-y-1">

          {ship.sensorLockOn && (
            <StatusRow icon="🎯" className="text-(--neon-cyan)">
              Lock → <span className="text-(--neon-cyan) font-semibold">{lockTargetName}</span>
              {ship.sensorLockDM > 0 && (
                <span className="ml-1 text-slate-400">DM +{ship.sensorLockDM}</span>
              )}
            </StatusRow>
          )}

          {lockerName && (
            <StatusRow icon="🔒" className="text-red-300">
              Locked by <span className="font-semibold">{lockerName}</span>
            </StatusRow>
          )}

          {inboundByLauncher.map(([name, { count, type, eta }]) => (
            <StatusRow key={name} icon="⚡" className="text-amber-400">
              <span className="font-semibold">{count}× {type}</span>
              <span className="text-slate-400"> inbound ← {name}</span>
              {eta !== null && <span className="ml-1 text-slate-500 text-[10px]">~{eta}r</span>}
            </StatusRow>
          ))}

          {launchedByTarget.map(([name, { count, type, eta }]) => (
            <StatusRow key={name} icon="🚀" className="text-slate-300">
              <span className="font-semibold">{count}× {type}</span>
              <span className="text-slate-400"> away → {name}</span>
              {eta !== null && <span className="ml-1 text-slate-500 text-[10px]">~{eta}r</span>}
            </StatusRow>
          ))}

          {(ship.turretsNeedingReload ?? 0) > 0 && (
            <StatusRow icon="🔄" className="text-slate-400">
              {ship.turretsNeedingReload} turret{ship.turretsNeedingReload !== 1 ? 's' : ''} reloading
            </StatusRow>
          )}

          {ship.criticalHits?.length > 0 && !ship.isDestroyed && (
            <StatusRow icon="🚨" className="text-red-400">
              <span className="text-red-300">
                {ship.criticalHits.map((c) => `${c.system} Sev.${c.severity}`).join(' · ')}
              </span>
            </StatusRow>
          )}

          {(ship.ionRoundsLeft ?? 0) > 0 && (
            <StatusRow icon="⚡" className="text-blue-400">
              ION {ship.ionRoundsLeft}R — -{ship.ionPowerReduction ?? 0} PWR
              {(ship.baseBandwidth ?? 0) > 0 && (ship.currentBandwidth ?? ship.baseBandwidth ?? 0) <= 0 && ' · COMMS DOWN'}
            </StatusRow>
          )}

          {ammoMax > 0 && (
            <StatusRow icon="🚀" className={
              (ship.missileAmmoTotal ?? ammoMax) === 0 ? 'text-red-400'
              : (ship.missileAmmoTotal ?? ammoMax) <= ammoMax * 0.25 ? 'text-yellow-400'
              : 'text-slate-300'
            }>
              Ammo {ship.missileAmmoTotal ?? ammoMax}/{ammoMax}
            </StatusRow>
          )}

          {sandAmmoMax > 0 && (
            <StatusRow icon="🪨" className={
              (ship.sandAmmoTotal ?? sandAmmoMax) === 0 ? 'text-red-400'
              : (ship.sandAmmoTotal ?? sandAmmoMax) <= sandAmmoMax * 0.25 ? 'text-yellow-400'
              : 'text-slate-300'
            }>
              Sand {ship.sandAmmoTotal ?? sandAmmoMax}/{sandAmmoMax}
            </StatusRow>
          )}

        </div>
      )}
    </div>
  )
}

function Badge({ label, className }) {
  return (
    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${className}`}>
      {label}
    </span>
  )
}

function StatusRow({ icon, className, children }) {
  return (
    <div className={`flex items-baseline gap-1.5 font-mono text-xs ${className}`}>
      <span className="shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

// ── Faction constants ─────────────────────────────────────────────────────────

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

// ── RangeBandRow ──────────────────────────────────────────────────────────────

function RangeBandRow({ ship1, ship2, band, onSet }) {
  const idx = RANGE_BAND_ORDER.indexOf(band)
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ship1.color }} />
      <span className="font-mono text-xs text-slate-300 truncate">{ship1.name}</span>
      <span className="text-slate-400 mx-1">↔</span>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ship2.color }} />
      <span className="font-mono text-xs text-slate-300 truncate">{ship2.name}</span>
      <span className="ml-auto font-mono text-xs text-yellow-400 shrink-0">{band}</span>
      <div className="flex gap-1 shrink-0">
        <button
          disabled={idx <= 0}
          onClick={() => onSet(RANGE_BAND_ORDER[idx - 1])}
          title="Closer"
          className="w-5 h-5 flex items-center justify-center border border-slate-700 text-slate-400 rounded text-xs hover:border-slate-500 hover:text-slate-200 disabled:text-slate-400 disabled:border-slate-600/50 disabled:cursor-not-allowed transition-colors"
        >▼</button>
        <button
          disabled={idx >= RANGE_BAND_ORDER.length - 1}
          onClick={() => onSet(RANGE_BAND_ORDER[idx + 1])}
          title="Further"
          className="w-5 h-5 flex items-center justify-center border border-slate-700 text-slate-400 rounded text-xs hover:border-slate-500 hover:text-slate-200 disabled:text-slate-400 disabled:border-slate-600/50 disabled:cursor-not-allowed transition-colors"
        >▲</button>
      </div>
    </div>
  )
}

// ── BasicBattleView ───────────────────────────────────────────────────────────

export function BasicBattleView() {
  const ships           = useBattleStore((s) => s.ships)
  const missiles        = useBattleStore((s) => s.missiles)
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

  const trackedPairs = useMemo(() => {
    const pairs = []
    const seen  = new Set()
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
          <p className="font-mono text-slate-400 text-sm tracking-widest">
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
              <span className="ml-2 text-slate-400">({factionShips.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {factionShips.map((ship) => (
                <ShipBentoCard
                  key={ship.id}
                  ship={ship}
                  ships={ships}
                  missiles={missiles}
                  onContextMenu={showContextMenu}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
