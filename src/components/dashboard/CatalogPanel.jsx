/**
 * CatalogPanel — official ship browser for the Dashboard.
 * Displays all entries from SHIP_CATALOG (HG/CRB source data).
 * The GM can filter by category and search by name, then add any ship
 * to their session profile list with a single click.
 *
 * Does NOT modify catalog data — IDs are assigned on addProfile().
 */

import { useState, useMemo } from 'react'
import { v7 as uuidv7 }      from 'uuid'
import { SHIP_CATALOG, CATALOG_CATEGORIES } from '../../data/shipCatalog.js'
import { useProfilesStore }  from '../../store/profilesStore.js'

// ── Weapon summary ─────────────────────────────────────────────────────────

/**
 * Build a compact, deduplicated weapon summary string from a ship's turrets and bays.
 * Examples: "6× Beam Laser, 3× Missile Rack"  |  "Torpedo Barbette"  |  "—"
 * @param {{ turrets: object[], bays: object[] }} ship
 * @returns {string}
 */
function weaponSummary(ship) {
  const parts = []

  // Turret weapons: count by weapon type
  const weaponCounts = {}
  for (const turret of (ship.turrets ?? [])) {
    for (const w of (turret.weapons ?? [])) {
      if (!w) continue
      weaponCounts[w] = (weaponCounts[w] ?? 0) + 1
    }
  }
  for (const [w, n] of Object.entries(weaponCounts)) {
    parts.push(n > 1 ? `${n}× ${w}` : w)
  }

  // Bay weapons
  for (const bay of (ship.bays ?? [])) {
    if (bay.type) {
      const label = bay.size ? `${bay.size} ${bay.type}` : bay.type
      parts.push(label)
    }
  }

  return parts.length > 0 ? parts.join(', ') : '—'
}

// ── Stat badge ─────────────────────────────────────────────────────────────

/** @param {{ label: string, value: string|number, dim?: boolean }} props */
function StatBadge({ label, value, dim = false }) {
  return (
    <span className={`inline-flex items-baseline gap-0.5 ${dim ? 'text-slate-600' : ''}`}>
      <span className="font-mono text-slate-500 text-xs">{label}</span>
      <span className="font-mono text-slate-300 text-xs font-bold">{value}</span>
    </span>
  )
}

// ── Ship row ───────────────────────────────────────────────────────────────

/**
 * @param {{
 *   entry:      object,
 *   added:      boolean,
 *   onAdd:      (entry: object) => void,
 * }} props
 */
function ShipRow({ entry, added, onAdd }) {
  const weapons = weaponSummary(entry)
  const hasWeapons = weapons !== '—'

  return (
    <div className="group flex items-start gap-3 px-4 py-3 border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">

      {/* Left: name + meta */}
      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-mono font-bold text-xs text-slate-200 truncate">
            {entry.name}
          </span>
          {entry.shipType && (
            <span className="font-mono text-xs text-slate-500">Type {entry.shipType}</span>
          )}
          <span className="font-mono text-xs text-slate-700">TL{entry.techLevel}</span>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          <StatBadge label="T"   value={`${entry.tonnage}t`} />
          <StatBadge label="Hull" value={entry.hull} />
          <StatBadge label="M"   value={`${entry.thrust}G`} />
          {entry.jump > 0 && <StatBadge label="J" value={entry.jump} />}
          {entry.armor > 0 && <StatBadge label="Armour" value={entry.armor} />}
          <StatBadge label="" value={entry.sensors} dim />
        </div>

        {/* Weapons */}
        <p className={`font-mono text-xs mt-0.5 truncate ${
          hasWeapons ? 'text-slate-400' : 'text-slate-700'
        }`}>
          {weapons}
        </p>

        {/* Description */}
        <p className="font-mono text-xs text-slate-500 mt-0.5 leading-tight line-clamp-1">
          {entry.description}
        </p>
      </div>

      {/* Right: add button */}
      <div className="shrink-0 pt-0.5">
        {added ? (
          <span className="font-mono text-xs text-green-500 whitespace-nowrap">✓ Added</span>
        ) : (
          <button
            onClick={() => onAdd(entry)}
            className="px-2 py-1 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-(--neon-cyan)/50 hover:text-(--neon-cyan) transition-colors whitespace-nowrap"
          >
            + Profile
          </button>
        )}
      </div>

    </div>
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────

export function CatalogPanel() {
  const addProfile = useProfilesStore((s) => s.addProfile)

  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch]                 = useState('')
  /** @type {[Set<string>, Function]} Set of recently-added entry names (cleared after 1.5s) */
  const [addedNames, setAddedNames]         = useState(() => new Set())

  // Filter entries by category + search
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return SHIP_CATALOG.filter((e) => {
      const matchCat  = activeCategory === 'all' || e.category === activeCategory
      const matchText = !term ||
        e.name.toLowerCase().includes(term) ||
        (e.shipClass ?? '').toLowerCase().includes(term)
      return matchCat && matchText
    })
  }, [activeCategory, search])

  /** Add a catalog entry to the user's profile list with a fresh UUID. */
  const handleAdd = (entry) => {
    addProfile({
      ...entry,
      id:        uuidv7(),
      createdAt: new Date().toISOString(),
    })
    // Brief "Aggiunto" confirmation — auto-clears after 1.5s
    setAddedNames((prev) => {
      const next = new Set(prev)
      next.add(entry.name)
      return next
    })
    setTimeout(() => {
      setAddedNames((prev) => {
        const next = new Set(prev)
        next.delete(entry.name)
        return next
      })
    }, 1500)
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-slate-800 shrink-0">
        <h2 className="font-mono text-xs text-slate-400 tracking-widest uppercase">
          Official Catalog
          <span className="ml-2 text-slate-500">HG 2022</span>
          <span className="ml-2 text-slate-700">({filtered.length}/{SHIP_CATALOG.length})</span>
        </h2>
      </div>

      {/* ── Category tabs ──────────────────────────────────────────────── */}
      <div className="px-4 pt-2 pb-0 shrink-0">
        <div className="flex flex-wrap gap-1">
          {CATALOG_CATEGORIES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className={`px-2 py-0.5 font-mono text-xs rounded transition-colors ${
                activeCategory === id
                  ? 'bg-(--neon-cyan)/15 border border-(--neon-cyan)/40 text-(--neon-cyan)'
                  : 'border border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-2 pb-1 shrink-0">
        <input
          type="text"
          placeholder="Search ship…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs rounded px-3 py-1.5 focus:outline-none focus:border-(--neon-cyan)/60 placeholder:text-slate-600"
        />
      </div>

      {/* ── Ship list ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-slate-600 font-mono text-xs italic px-4 py-3">
            No ships found.
          </p>
        )}
        {filtered.map((entry) => (
          <ShipRow
            key={entry.name}
            entry={entry}
            added={addedNames.has(entry.name)}
            onAdd={handleAdd}
          />
        ))}
      </div>

      {/* ── Footer hint ────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-slate-800 shrink-0">
        <p className="font-mono text-xs text-slate-700">
          Source: High Guard Update 2022 pp.135–199. Added profiles can be edited.
        </p>
      </div>

    </div>
  )
}
