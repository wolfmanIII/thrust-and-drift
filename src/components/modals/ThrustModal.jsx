/**
 * ThrustModal — apply thrust delta to a ship's velocity vector.
 * Shows current/resulting vector and validates against available thrust.
 * // Traveller Companion p.172 — Vectorial Thrust
 */

import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { hexDistance, hexAdd, HEX_DIRECTIONS } from '../../utils/hex.js'
import { isValidThrustDelta } from '../../utils/combat.js'

export function ThrustModal() {
  const closeModal   = useUiStore((s) => s.closeModal)
  const modalPayload = useUiStore((s) => s.modalPayload)
  const ships        = useBattleStore((s) => s.ships)
  const applyShipThrust = useBattleStore((s) => s.applyShipThrust)

  const ship = ships.find((s) => s.id === modalPayload?.shipId)

  const [delta, setDelta] = useState({ q: 0, r: 0 })

  if (!ship) return null

  const thrustAvailable = ship.profile.thrust - ship.thrustUsedThisRound
  const cost = hexDistance({ q: 0, r: 0 }, delta)
  const isValid = isValidThrustDelta(delta, thrustAvailable)
  const newVector = hexAdd(ship.vector, delta)

  /** Apply one step in a cardinal direction. */
  const applyDirectionStep = (dirIndex, sign) => {
    const d = HEX_DIRECTIONS[dirIndex]
    const candidate = { q: delta.q + d.q * sign, r: delta.r + d.r * sign }
    const candidateCost = hexDistance({ q: 0, r: 0 }, candidate)
    if (candidateCost <= thrustAvailable) {
      setDelta(candidate)
    }
  }

  const handleConfirm = () => {
    if (!isValid || cost === 0) { closeModal(); return }
    applyShipThrust(ship.id, delta, cost)
    closeModal()
  }

  const handleReset = () => setDelta({ q: 0, r: 0 })

  return (
    <Modal title={`Thrust — ${ship.profile.name}`} onClose={closeModal}>
      <div className="space-y-4">
        {/* Thrust availability bar */}
        <div>
          <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
            <span>Thrust disponibile</span>
            <span className={cost > thrustAvailable ? 'text-red-400' : 'text-[--neon-cyan]'}>
              {cost} / {thrustAvailable}
            </span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isValid ? 'bg-[--neon-cyan]' : 'bg-red-500'}`}
              style={{ width: `${Math.min(100, thrustAvailable > 0 ? (cost / thrustAvailable) * 100 : 0)}%` }}
            />
          </div>
        </div>

        {/* Vector display */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
          <div className="bg-slate-800 rounded p-2">
            <p className="text-slate-500 text-xs mb-1">Vettore attuale</p>
            <p className="text-slate-200">({ship.vector.q}, {ship.vector.r})</p>
          </div>
          <div className="flex items-center justify-center text-slate-600 text-lg">→</div>
          <div className={`rounded p-2 ${isValid ? 'bg-slate-800' : 'bg-red-950/40 border border-red-700/50'}`}>
            <p className="text-slate-500 text-xs mb-1">Nuovo vettore</p>
            <p className={isValid ? 'text-[--neon-cyan]' : 'text-red-400'}>
              ({newVector.q}, {newVector.r})
            </p>
          </div>
        </div>

        {/* Delta display */}
        <div className="text-center font-mono text-xs text-slate-500">
          Δ ({delta.q}, {delta.r}) — costo: {cost} thrust
        </div>

        {/* Directional buttons — hex layout */}
        <div className="flex flex-col items-center gap-1">
          {/* NW NE */}
          <div className="flex gap-8">
            <DirButton label="NW" onClick={() => applyDirectionStep(2, 1)} />
            <DirButton label="NE" onClick={() => applyDirectionStep(1, 1)} />
          </div>
          {/* W E */}
          <div className="flex gap-20 items-center">
            <DirButton label="W" onClick={() => applyDirectionStep(3, 1)} />
            <button
              onClick={handleReset}
              className="w-10 h-10 rounded-full border border-slate-600 text-slate-500 font-mono text-xs hover:border-slate-400 hover:text-slate-300 transition-colors"
            >
              RST
            </button>
            <DirButton label="E" onClick={() => applyDirectionStep(0, 1)} />
          </div>
          {/* SW SE */}
          <div className="flex gap-8">
            <DirButton label="SW" onClick={() => applyDirectionStep(4, 1)} />
            <DirButton label="SE" onClick={() => applyDirectionStep(5, 1)} />
          </div>
        </div>

        {/* Manual Δq / Δr inputs */}
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="font-mono text-xs text-slate-500">Δq</span>
            <input
              type="number"
              value={delta.q}
              onChange={(e) => setDelta((d) => ({ ...d, q: parseInt(e.target.value) || 0 }))}
              className="w-full bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm rounded px-2 py-1 focus:outline-none focus:border-[--neon-cyan]/60"
            />
          </label>
          <label className="space-y-1">
            <span className="font-mono text-xs text-slate-500">Δr</span>
            <input
              type="number"
              value={delta.r}
              onChange={(e) => setDelta((d) => ({ ...d, r: parseInt(e.target.value) || 0 }))}
              className="w-full bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm rounded px-2 py-1 focus:outline-none focus:border-[--neon-cyan]/60"
            />
          </label>
        </div>

        {/* Error */}
        {!isValid && cost > 0 && (
          <p className="text-red-400 font-mono text-xs text-center">
            ⚠ Thrust insufficiente ({cost} richiesto, {thrustAvailable} disponibile)
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={closeModal}
            className="flex-1 py-2 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-slate-500 transition-colors"
          >
            ANNULLA
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || cost === 0}
            className="flex-1 py-2 bg-[--neon-cyan]/10 border border-[--neon-cyan]/40 text-[--neon-cyan] font-mono text-xs rounded hover:bg-[--neon-cyan]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            APPLICA THRUST
          </button>
        </div>
      </div>
    </Modal>
  )
}

function DirButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-12 h-8 bg-slate-800 border border-slate-600 text-slate-300 font-mono text-xs rounded hover:border-[--neon-cyan]/60 hover:text-[--neon-cyan] transition-colors"
    >
      {label}
    </button>
  )
}
