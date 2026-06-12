/**
 * MissileImpactModal — shown when a missile salvo reaches its target hex during the
 * movement phase. GM enters the damage rolled; modal computes net after armour and
 * calls applyDamage. Resolves one salvo at a time; stacks if multiple arrive.
 * // MgT2e CRB p.162–165, HG p.28 (Missile Rack: 4D6 per missile)
 */

import { useState } from 'react'
import { Modal }          from './Modal.jsx'
import { useBattleStore } from '../../store/battleStore.js'

const DICE_PER_MISSILE = 4 // HG p.28 — Missile Rack 4D6

export function MissileImpactModal() {
  const pendingMissileImpacts = useBattleStore((s) => s.pendingMissileImpacts)
  const ships                 = useBattleStore((s) => s.ships)
  const dismissMissileImpact  = useBattleStore((s) => s.dismissMissileImpact)
  const applyDamage           = useBattleStore((s) => s.applyDamage)

  const [damageRolled, setDamageRolled] = useState('')

  const impact = pendingMissileImpacts[0]
  if (!impact) return null

  const target   = ships.find((s) => s.id === impact.target)
  const launcher = ships.find((s) => s.id === impact.launchedBy)

  // Stale impact (target removed via undo) — auto-dismiss
  if (!target) {
    dismissMissileImpact(impact.id)
    return null
  }

  const armor       = target.profile.armor ?? 0
  const totalDice   = impact.count * DICE_PER_MISSILE
  const rolled      = parseInt(damageRolled, 10)
  const netDamage   = isNaN(rolled) ? null : Math.max(0, rolled - armor)
  const pending     = pendingMissileImpacts.length

  function handleApply() {
    if (netDamage === null) return
    applyDamage(
      impact.target,
      netDamage,
      `${impact.count}× ${impact.type ?? 'Missile'} salvo (${launcher?.profile.name ?? '?'})`,
    )
    dismissMissileImpact(impact.id)
    setDamageRolled('')
  }

  function handleMiss() {
    dismissMissileImpact(impact.id)
    setDamageRolled('')
  }

  return (
    <Modal>
      <div className="flex flex-col gap-5 min-w-[340px]">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-amber-400 tracking-widest text-sm">
            ⚡ MISSILE IMPACT
          </h2>
          {pending > 1 && (
            <span className="font-mono text-xs text-slate-400">
              {pending} PENDING
            </span>
          )}
        </div>

        {/* ── Salvo info ──────────────────────────────────────────── */}
        <div className="bg-slate-800/60 border border-slate-700 rounded px-4 py-3 flex flex-col gap-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">LAUNCHER</span>
            <span className="text-slate-200">{launcher?.profile.name ?? '?'}</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">TARGET</span>
            <span style={{ color: target.color }} className="font-semibold">
              {target.profile.name}
            </span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">SALVO</span>
            <span className="text-amber-300">{impact.count}× {impact.type ?? 'Missile'}</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">HULL</span>
            <span className="text-slate-300">
              {target.hullCurrent}/{target.profile.hull}
            </span>
          </div>
        </div>

        {/* ── Damage roll ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs text-slate-400 leading-relaxed">
            Roll <span className="text-amber-300">{totalDice}D6</span> ({impact.count} missile{impact.count !== 1 ? 's' : ''} × {DICE_PER_MISSILE}D6).
            Armour applies per missile independently.
          </p>

          <label className="flex flex-col gap-1">
            <span className="font-mono text-xs text-slate-500 tracking-widest">
              DAMAGE ROLLED (total)
            </span>
            <input
              type="number"
              min="0"
              value={damageRolled}
              onChange={(e) => setDamageRolled(e.target.value)}
              placeholder="0"
              className="bg-slate-900 border border-slate-600 focus:border-(--neon-cyan)/60 rounded px-3 py-2 font-mono text-sm text-white outline-none w-full"
            />
          </label>

          {/* Armour & net */}
          <div className="flex justify-between items-center bg-slate-800/40 rounded px-3 py-2 font-mono text-xs">
            <span className="text-slate-500">
              ARMOUR
            </span>
            <span className="text-slate-300">{armor}</span>
          </div>
          <div className="flex justify-between items-center bg-slate-800/40 rounded px-3 py-2 font-mono text-sm">
            <span className="text-slate-400 tracking-widest">NET DAMAGE</span>
            <span className={netDamage === null ? 'text-slate-600' : netDamage > 0 ? 'text-red-400 font-bold' : 'text-slate-400'}>
              {netDamage === null ? '—' : netDamage}
            </span>
          </div>
        </div>

        {/* ── Action buttons ──────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <button
            disabled={netDamage === null}
            onClick={handleApply}
            className={`w-full font-mono text-xs tracking-widest py-2.5 rounded transition-colors ${
              netDamage === null
                ? 'bg-slate-800/40 border border-slate-700 text-slate-600 cursor-not-allowed'
                : 'bg-red-900/40 border border-red-600/60 text-red-300 hover:bg-red-800/50'
            }`}
          >
            APPLY {netDamage !== null ? netDamage : '—'} DAMAGE
          </button>
          <button
            onClick={handleMiss}
            className="w-full bg-slate-800/60 border border-slate-600 text-slate-400
              font-mono text-xs tracking-widest py-2 rounded
              hover:bg-slate-700/60 transition-colors"
          >
            MISS / INTERCEPTED — DISMISS
          </button>
        </div>

      </div>
    </Modal>
  )
}
