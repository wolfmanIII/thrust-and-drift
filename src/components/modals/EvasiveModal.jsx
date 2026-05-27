/**
 * EvasiveModal — declare evasive thrust for a ship.
 * The GM sets how many thrust points are reserved for evasion this round.
 * Each point applies -(pilotSkill) as DM to all attackers.
 * // MgT2e CRB p.166 — Evasive Action
 */

import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

export function EvasiveModal() {
  const closeModal           = useUiStore((s) => s.closeModal)
  const modalPayload         = useUiStore((s) => s.modalPayload)
  const ships                = useBattleStore((s) => s.ships)
  const declareEvasiveThrust = useBattleStore((s) => s.declareEvasiveThrust)

  const ship = ships.find((s) => s.id === modalPayload?.shipId)

  const maxEvasive  = ship ? ship.profile.thrust - ship.thrustUsedThisRound : 0
  const pilotSkill  = ship?.profile.crew?.pilot ?? 0

  const [amount, setAmount] = useState(() => ship?.evasiveThrust ?? 0)

  if (!ship) return null

  const totalDM = -(pilotSkill * amount)

  const handleConfirm = () => {
    declareEvasiveThrust(ship.id, amount)
    closeModal()
  }

  return (
    <Modal title={`Evasione — ${ship.profile.name}`} onClose={closeModal}>
      <div className="space-y-4">
        <p className="text-slate-400 font-mono text-xs leading-relaxed">
          Ogni punto di thrust evasivo applica −{pilotSkill} DM (abilità Pilota)
          agli attacchi ricevuti questo round. // MgT2e CRB p.166
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
          <div className="bg-slate-800 rounded p-2">
            <p className="text-slate-500 mb-0.5">Thrust disp.</p>
            <p className="text-slate-200 font-bold">{maxEvasive}</p>
          </div>
          <div className="bg-slate-800 rounded p-2">
            <p className="text-slate-500 mb-0.5">Abilità Pilota</p>
            <p className="text-slate-200 font-bold">{pilotSkill}</p>
          </div>
          <div className={`rounded p-2 transition-colors ${
            amount > 0 ? 'bg-[--neon-cyan]/10 border border-[--neon-cyan]/30' : 'bg-slate-800'
          }`}>
            <p className="text-slate-500 mb-0.5">DM attaccanti</p>
            <p className={`font-bold ${amount > 0 ? 'text-[--neon-cyan]' : 'text-slate-400'}`}>
              {totalDM === 0 ? '—' : totalDM}
            </p>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>Thrust evasivo</span>
            <span className={amount > maxEvasive ? 'text-red-400' : 'text-[--neon-cyan]'}>
              {amount} / {maxEvasive}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(maxEvasive, 0)}
            value={amount}
            disabled={maxEvasive === 0}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full accent-sky-400 disabled:opacity-40"
          />
          <div className="flex justify-between text-xs font-mono text-slate-700">
            <span>0 — nessuna evasione</span>
            <span>{maxEvasive} — massima evasione</span>
          </div>
        </div>

        {maxEvasive === 0 && (
          <p className="text-slate-600 font-mono text-xs text-center">
            Nessun thrust disponibile.
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={closeModal}
            className="flex-1 py-2 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-slate-500 transition-colors"
          >
            ANNULLA
          </button>
          <button
            onClick={handleConfirm}
            disabled={maxEvasive === 0}
            className="flex-1 py-2 bg-[--neon-cyan]/10 border border-[--neon-cyan]/40 text-[--neon-cyan] font-mono text-xs tracking-widest rounded hover:bg-[--neon-cyan]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            DICHIARA EVASIONE
          </button>
        </div>
      </div>
    </Modal>
  )
}
