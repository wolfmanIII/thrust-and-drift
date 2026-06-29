/**
 * ObstacleCollisionModal — resolves field collision pilot checks from resolveMovement.
 *
 * Triggered when a ship's movement budget runs out inside an asteroid or debris field.
 * GM rolls Pilot (DEX) check; on failure, damage is applied reduced by Armor.
 *
 * Check difficulty and damage:
 *   asteroid_field light  → Average (8+)  — 1D6 reduced by Armor
 *   asteroid_field dense  → Difficult (10+) — 2D6 reduced by Armor
 *   debris_field          → Difficult (10+) — 2D6 reduced by Armor
 *
 * // Obstacles System Design §3.1–3.2
 */

import { useState, useEffect } from 'react'
import { Modal }               from './Modal.jsx'
import { useBattleStore }      from '../../store/battleStore.js'
import { rollDice }            from '../../utils/dice.js'

function fieldParams(obstacle) {
  const isDense = obstacle.type === 'debris_field' || obstacle.density === 'dense'
  return {
    target:     isDense ? 10 : 8,
    difficulty: isDense ? 'Difficult (10+)' : 'Average (8+)',
    damageDice: isDense ? 2 : 1,
    label:      isDense ? '2D6 − Armor' : '1D6 − Armor',
  }
}

function obstacleDisplayName(obstacle) {
  if (obstacle.label) return obstacle.label
  if (obstacle.type === 'debris_field') return 'Debris Field'
  const density = obstacle.density === 'dense' ? 'Dense ' : 'Light '
  return `${density}Asteroid Field`
}

export function ObstacleCollisionModal() {
  const pendingObstacleCollisions = useBattleStore((s) => s.pendingObstacleCollisions)
  const ships                     = useBattleStore((s) => s.ships)
  const dismissObstacleCollision  = useBattleStore((s) => s.dismissObstacleCollision)
  const applyDamage               = useBattleStore((s) => s.applyDamage)

  const [step, setStep]   = useState('check')    // 'check' | 'damage'
  const [rolled, setRolled] = useState('')

  const event = pendingObstacleCollisions[0]

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional batch reset on collision event change
    setStep('check')
    setRolled('')
  }, [event?.id])

  if (!event) return null

  const ship = ships.find((s) => s.id === event.shipId)

  // Ship removed (undo) — auto-dismiss
  if (!ship) {
    dismissObstacleCollision(event.id)
    return null
  }

  const pending = pendingObstacleCollisions.length
  const { difficulty, damageDice, label } = fieldParams(event.obstacle)
  const armor   = ship.profile.armor ?? 0
  const rawRoll = parseInt(rolled, 10)
  const net     = isNaN(rawRoll) ? null : Math.max(0, rawRoll - armor)

  function handleSuccess() {
    dismissObstacleCollision(event.id)
  }

  function handleFailed() {
    setStep('damage')
  }

  function handleApply() {
    if (net === null) return
    applyDamage(ship.id, net, `${obstacleDisplayName(event.obstacle)} collision`)
    dismissObstacleCollision(event.id)
  }

  function handleAutoRoll() {
    setRolled(String(rollDice(damageDice, 6).total))
  }

  return (
    <Modal>
      <div className="flex flex-col gap-5 min-w-80">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-amber-400 tracking-widest text-sm">
            🪨 FIELD COLLISION{step === 'damage' ? ' — DAMAGE' : ''}
          </h2>
          {pending > 1 && (
            <span className="font-mono text-xs text-slate-400">{pending} PENDING</span>
          )}
        </div>

        {/* ── Collision info ───────────────────────────────────────── */}
        <div className="bg-slate-800/60 border border-slate-700 rounded px-4 py-3 flex flex-col gap-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">SHIP</span>
            <span style={{ color: ship.color }} className="font-semibold">{ship.name}</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">OBSTACLE</span>
            <span className="text-slate-200">{obstacleDisplayName(event.obstacle)}</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">HULL</span>
            <span className="text-slate-300">{ship.hullCurrent}/{ship.profile.hull}</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">ARMOR</span>
            <span className="text-slate-300">{armor}</span>
          </div>
        </div>

        {step === 'check' ? (
          <>
            {/* ── Pilot check info ────────────────────────────────── */}
            <div className="bg-slate-800/40 border border-slate-700 rounded px-3 py-3 flex flex-col gap-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">CHECK</span>
                <span className="text-slate-200">Pilot (DEX)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">TARGET</span>
                <span className="text-amber-300">{difficulty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">FAILURE DAMAGE</span>
                <span className="text-red-400">{label}</span>
              </div>
            </div>

            {/* ── Resolution buttons ──────────────────────────────── */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSuccess}
                className="w-full font-mono text-xs tracking-widest py-2.5 rounded
                  bg-emerald-900/30 border border-emerald-600/50 text-emerald-400
                  hover:bg-emerald-800/40 transition-colors"
              >
                PILOT SUCCESS — No damage
              </button>
              <button
                onClick={handleFailed}
                className="w-full font-mono text-xs tracking-widest py-2.5 rounded
                  bg-red-900/30 border border-red-700/50 text-red-400
                  hover:bg-red-800/40 transition-colors"
              >
                PILOT FAILED — Roll damage
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ── Damage roll ─────────────────────────────────────── */}
            <div className="flex flex-col gap-2">
              <p className="font-mono text-xs text-slate-400">
                Roll <span className="text-red-400">{damageDice}D6</span> — subtract Armor{' '}
                <span className="text-slate-500">({armor})</span>
              </p>
              <div className="flex gap-2">
                <input
                  type="number" min="0"
                  value={rolled} onChange={(e) => setRolled(e.target.value)}
                  placeholder="0"
                  className="flex-1 bg-slate-900 border border-slate-600
                    focus:border-(--neon-cyan)/60 rounded px-3 py-2
                    font-mono text-sm text-white outline-none"
                />
                <button
                  type="button" onClick={handleAutoRoll}
                  className="px-3 py-2 bg-slate-800 border border-slate-600 text-slate-300
                    font-mono text-sm rounded hover:border-(--neon-cyan)/60 hover:text-(--neon-cyan)
                    transition-colors"
                  title={`Auto-roll ${damageDice}D6`}
                >
                  🎲
                </button>
              </div>

              <div className="flex flex-col gap-1 bg-slate-800/40 rounded px-3 py-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Roll ({damageDice}D6)</span>
                  <span className="text-slate-300">{isNaN(rawRoll) ? '—' : rawRoll}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Armor</span>
                  <span className="text-slate-300">−{armor}</span>
                </div>
                <div className="flex justify-between border-t border-slate-700 pt-1 mt-0.5">
                  <span className="text-slate-300 tracking-widest">NET DAMAGE</span>
                  <span className={net === null ? 'text-slate-400' : net > 0 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                    {net === null ? '—' : net}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                disabled={net === null}
                onClick={handleApply}
                className={`w-full font-mono text-xs tracking-widest py-2.5 rounded transition-colors ${
                  net === null
                    ? 'bg-slate-800/40 border border-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-red-900/40 border border-red-600/60 text-red-300 hover:bg-red-800/50'
                }`}
              >
                APPLY {net !== null ? net : '—'} DAMAGE
              </button>
              <button
                onClick={() => setStep('check')}
                className="w-full bg-slate-800/60 border border-slate-600 text-slate-400
                  font-mono text-xs tracking-widest py-2 rounded hover:bg-slate-700/60 transition-colors"
              >
                ← BACK TO CHECK
              </button>
            </div>
          </>
        )}

      </div>
    </Modal>
  )
}
