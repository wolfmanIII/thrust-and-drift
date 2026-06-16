/**
 * MissileLaunchModal — configure and launch a missile salvo.
 * Inherits the launching ship's velocity vector as initial missile vector.
 * // MgT2e CRB p.167 — Missiles; Traveller Companion p.176 — Missile thrust
 */

import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

/** Count Missile Rack weapons across all turrets of a profile. */
function countMissileRacks(profile) {
  return (profile.turrets ?? [])
    .flatMap((t) => t.weapons)
    .filter((w) => w === 'Missile Rack')
    .length
}

export function MissileLaunchModal() {
  const closeModal    = useUiStore((s) => s.closeModal)
  const modalPayload  = useUiStore((s) => s.modalPayload)
  const ships         = useBattleStore((s) => s.ships)
  const launchMissile = useBattleStore((s) => s.launchMissile)

  const attacker = ships.find((s) => s.id === modalPayload?.shipId)

  const rackCount = attacker ? countMissileRacks(attacker.profile) : 0
  const ammoLeft  = attacker ? (attacker.missileAmmoTotal ?? rackCount * 12) : 0
  const enemies   = attacker ? ships.filter((s) => s.id !== attacker.id) : []

  const [targetId, setTargetId] = useState('')
  const [count, setCount]       = useState(Math.min(rackCount > 0 ? rackCount : 1, ammoLeft))

  if (!attacker) return null

  const handleLaunch = () => {
    if (!targetId) return
    launchMissile(
      attacker.id,
      targetId,
      count,
      attacker.position,
      attacker.vector,
      'Standard',
    )
    closeModal()
  }

  return (
    <Modal title={`Missile Launch — ${attacker.profile.name}`} onClose={closeModal}>
      <div className="space-y-4">
        <p className="text-slate-400 font-mono text-xs">
          Missile Rack turrets: <span className="text-(--neon-cyan)">{rackCount}</span>
          {' · '}Ammo remaining: <span className={ammoLeft === 0 ? 'text-red-400' : 'text-(--neon-cyan)'}>{ammoLeft}</span>
          {' · '}Salvo inherits the ship&apos;s current vector.
        </p>

        {/* Target */}
        <div>
          <p className="text-slate-400 font-mono text-xs mb-1.5">Target</p>
          <div className="space-y-0.5">
            {enemies.length === 0 && (
              <p className="text-slate-600 font-mono text-xs italic">No ships on the field.</p>
            )}
            {enemies.map((e) => (
              <button
                key={e.id}
                onClick={() => setTargetId(e.id)}
                className={`w-full flex items-center gap-2 text-left px-3 py-1.5 rounded font-mono text-xs border transition-colors ${
                  targetId === e.id
                    ? 'border-(--neon-cyan)/60 bg-(--neon-cyan)/10 text-(--neon-cyan)'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                {e.profile.name}
              </button>
            ))}
          </div>
        </div>

        {/* Missile count */}
        <div>
          <p className="text-slate-400 font-mono text-xs mb-1.5">
            Missiles in salvo (1–{ammoLeft})
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              disabled={ammoLeft === 0}
              className="w-8 h-8 bg-slate-800 border border-slate-600 text-slate-300 font-mono rounded hover:border-slate-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              −
            </button>
            <span className="text-(--neon-cyan) font-mono font-bold text-xl w-8 text-center">
              {count}
            </span>
            <button
              onClick={() => setCount((c) => Math.min(ammoLeft, c + 1))}
              disabled={ammoLeft === 0}
              className="w-8 h-8 bg-slate-800 border border-slate-600 text-slate-300 font-mono rounded hover:border-slate-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              +
            </button>
            <span className="text-slate-500 font-mono text-xs ml-2">
              missiles · vector ({attacker.vector.q}, {attacker.vector.r})
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={closeModal}
            className="flex-1 py-2 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-slate-500 transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleLaunch}
            disabled={!targetId || ammoLeft === 0}
            className="flex-1 py-2 bg-red-900/30 border border-red-700/50 text-red-400 font-mono text-xs tracking-widest rounded hover:bg-red-900/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {ammoLeft === 0 ? '⚠ NO AMMO' : '🚀 LAUNCH SALVO'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
