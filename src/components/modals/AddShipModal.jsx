/**
 * AddShipModal — select a profile, faction, color, then place on map.
 * Initiates pendingPlacement mode; user clicks a hex cell to confirm position.
 */

import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useProfilesStore } from '../../store/profilesStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { FACTIONS } from '../../data/factions.js'

const PRESET_COLORS = [
  '#60a5fa', '#f87171', '#4ade80', '#facc15',
  '#c084fc', '#fb923c', '#22d3ee', '#f472b6',
]

export function AddShipModal() {
  const closeModal     = useUiStore((s) => s.closeModal)
  const modalPayload   = useUiStore((s) => s.modalPayload)
  const startPlacement = useUiStore((s) => s.startPlacement)
  const addShip        = useBattleStore((s) => s.addShip)
  const combatMode     = useBattleStore((s) => s.combatMode)
  const profiles       = useProfilesStore((s) => s.profiles)

  const initialHex = modalPayload?.hex ?? null
  const isBasicMode = combatMode === 'basic'

  const [selectedProfileId, setSelectedProfileId] = useState(profiles[0]?.id ?? null)
  const [faction, setFaction] = useState('npc')
  const [color, setColor]     = useState('#f87171')
  const [filter, setFilter]   = useState('')

  const filtered = profiles.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  )

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId)

  const handleConfirm = () => {
    if (!selectedProfile) return
    if (initialHex) {
      addShip(selectedProfile, initialHex, faction, color)
      closeModal()
    } else if (isBasicMode) {
      // Basic mode has no hex map — position is irrelevant, use origin
      addShip(selectedProfile, { q: 0, r: 0 }, faction, color)
      closeModal()
    } else {
      // Vectorial mode: enter placement mode — user clicks a hex cell
      startPlacement({ profile: selectedProfile, faction, color })
      closeModal()
    }
  }

  return (
    <Modal title="Add Ship" onClose={closeModal}>
      <div className="space-y-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Search profile…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 text-slate-200 font-mono text-xs rounded px-3 py-1.5 focus:outline-none focus:border-(--neon-cyan)/60"
        />

        {/* Profile list */}
        <div className="max-h-40 overflow-y-auto space-y-0.5 border border-slate-700 rounded">
          {filtered.length === 0 && (
            <p className="text-slate-600 font-mono text-xs italic px-3 py-2">No profiles found.</p>
          )}
          {filtered.map((p) => {
            const isSelected = p.id === selectedProfileId
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProfileId(p.id)}
                className={`w-full text-left px-3 py-1.5 font-mono text-xs transition-colors flex items-center gap-2 border-l-2 ${
                  isSelected
                    ? 'bg-sky-950 text-sky-200 border-sky-400'
                    : 'text-slate-300 hover:bg-slate-800 border-transparent'
                }`}
              >
                <span className={`w-3 shrink-0 text-center ${isSelected ? 'text-sky-400' : 'text-transparent'}`}>▶</span>
                <span className="font-bold">{p.name}</span>
                {p.shipClass && <span className={`ml-1 ${isSelected ? 'text-sky-400/60' : 'text-slate-500'}`}>{p.shipClass}</span>}
              </button>
            )
          })}
        </div>

        {/* Faction */}
        <div>
          <p className="text-slate-500 font-mono text-xs mb-1.5">Faction</p>
          <div className="flex gap-2">
            {FACTIONS.map((f) => (
              <button
                key={f.id}
                onClick={() => { setFaction(f.id); setColor(f.color) }}
                className={`flex-1 py-1.5 font-mono text-xs rounded border transition-colors ${
                  faction === f.id
                    ? 'border-(--neon-cyan)/60 bg-(--neon-cyan)/10 text-(--neon-cyan)'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <p className="text-slate-500 font-mono text-xs mb-1.5">Token color</p>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  color === c ? 'border-white scale-125' : 'border-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Confirm */}
        <button
          onClick={handleConfirm}
          disabled={!selectedProfile}
          className="w-full py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-sm tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {initialHex ? 'PLACE SHIP' : isBasicMode ? 'ADD SHIP' : 'SELECT HEX ON MAP →'}
        </button>
      </div>
    </Modal>
  )
}
