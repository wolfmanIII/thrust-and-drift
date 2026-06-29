/**
 * RenameShipModal — inline rename for a ship instance. REQ-03.
 * Sets ship.name without modifying the underlying profile.
 */

import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

export function RenameShipModal() {
  const closeModal    = useUiStore((s) => s.closeModal)
  const modalPayload  = useUiStore((s) => s.modalPayload)
  const ships         = useBattleStore((s) => s.ships)
  const renameShip    = useBattleStore((s) => s.renameShip)

  const ship = ships.find((s) => s.id === modalPayload?.shipId)

  const [value, setValue] = useState(ship?.name ?? '')

  if (!ship) return null

  const handleConfirm = () => {
    const trimmed = value.trim()
    if (trimmed) renameShip(ship.id, trimmed)
    closeModal()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') closeModal()
  }

  return (
    <Modal title="Rename Ship" onClose={closeModal} width="max-w-sm">
      <div className="space-y-4">
        <p className="text-slate-400 font-mono text-xs">
          Profile: <span className="text-slate-300">{ship.profile.name}</span>
        </p>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={ship.profile.name}
          className="w-full bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm rounded px-3 py-2 focus:outline-none focus:border-(--neon-cyan)"
        />
        <div className="flex gap-2">
          <button
            onClick={closeModal}
            className="flex-1 py-2 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-slate-500 transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirm}
            disabled={!value.trim()}
            className="flex-1 py-2 bg-cyan-900/30 border border-cyan-700/50 text-(--neon-cyan) font-mono text-xs tracking-widest rounded hover:bg-cyan-900/40 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
          >
            RENAME
          </button>
        </div>
      </div>
    </Modal>
  )
}
