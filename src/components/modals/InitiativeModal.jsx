/**
 * InitiativeModal — roll and display initiative for all ships.
 * // MgT2e CRB p.160 — Initiative
 */

import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

export function InitiativeModal() {
  const closeModal        = useUiStore((s) => s.closeModal)
  const rollAllInitiative = useBattleStore((s) => s.rollAllInitiative)
  const ships             = useBattleStore((s) => s.ships)
  const initiativeOrder   = useBattleStore((s) => s.initiativeOrder)

  const [rolled, setRolled] = useState(false)

  const handleRoll = () => {
    rollAllInitiative()
    setRolled(true)
  }

  const shipMap = Object.fromEntries(ships.map((s) => [s.id, s]))

  return (
    <Modal title="Tiro Iniziativa" onClose={closeModal}>
      <div className="space-y-4">
        <p className="text-slate-400 font-mono text-xs">
          Formula: 2D6 + Pilota + Thrust // MgT2e CRB p.160
        </p>

        {/* Roll button */}
        {!rolled ? (
          <button
            onClick={handleRoll}
            className="w-full py-2 bg-[--neon-cyan]/10 border border-[--neon-cyan]/40 text-[--neon-cyan] font-mono text-sm tracking-widest rounded hover:bg-[--neon-cyan]/20 transition-colors"
          >
            🎲 LANCIA INIZIATIVA
          </button>
        ) : (
          <div className="space-y-1">
            <p className="text-slate-400 font-mono text-xs mb-2">Ordine iniziativa:</p>
            <ol className="space-y-1">
              {initiativeOrder.map((id, idx) => {
                const ship = shipMap[id]
                if (!ship) return null
                return (
                  <li
                    key={id}
                    className="flex items-center gap-3 bg-slate-800 rounded px-3 py-1.5"
                  >
                    <span className="text-slate-500 font-mono text-xs w-4">{idx + 1}.</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: ship.color }}
                    />
                    <span className="text-slate-200 font-mono text-xs flex-1 truncate">
                      {ship.profile.name}
                    </span>
                    <span className="text-[--neon-cyan] font-mono text-sm font-bold">
                      {ship.initiative}
                    </span>
                  </li>
                )
              })}
            </ol>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleRoll}
                className="flex-1 py-1.5 border border-slate-600 text-slate-400 font-mono text-xs rounded hover:border-slate-500 transition-colors"
              >
                RIPETI
              </button>
              <button
                onClick={closeModal}
                className="flex-1 py-1.5 bg-[--neon-cyan]/10 border border-[--neon-cyan]/40 text-[--neon-cyan] font-mono text-xs rounded hover:bg-[--neon-cyan]/20 transition-colors"
              >
                CONFERMA →
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
