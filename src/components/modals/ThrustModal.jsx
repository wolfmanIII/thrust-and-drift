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
import { isValidThrustDelta, computeIonThrustEffect } from '../../utils/combat.js'
import { emitEffect } from '../../utils/effectQueue.js'
import { getObstacleAt, hexLineDraw } from '../../utils/obstacles.js'

export function ThrustModal() {
  const closeModal   = useUiStore((s) => s.closeModal)
  const modalPayload = useUiStore((s) => s.modalPayload)
  const ships        = useBattleStore((s) => s.ships)
  const applyShipThrust = useBattleStore((s) => s.applyShipThrust)

  const obstacles        = useBattleStore((s) => s.obstacles)
  const obstaclesEnabled = useBattleStore((s) => s.obstaclesEnabled)

  const ship = ships.find((s) => s.id === modalPayload?.shipId)

  const [delta, setDelta] = useState(() => ship?.lastThrustDelta ?? { q: 0, r: 0 })

  if (!ship) return null

  const _basePow = ship.basePower ?? ship.profile.maxPower ?? 100
  const _ionCap  = computeIonThrustEffect(ship.profile.thrust, ship.currentPower ?? _basePow, _basePow)
  const thrustAvailable = Math.max(0, _ionCap + (ship.thrustBonusThisRound ?? 0) - ship.thrustUsedThisRound - (ship.thrustPenalty ?? 0))
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
    emitEffect('thrust_plume', {
      duration: 2500,
      hex:       ship.position,
      delta,
      shipColor: ship.color,
    })
    closeModal()
  }

  const handleReset = () => setDelta({ q: 0, r: 0 })

  // Obstacle path analysis — only in vectorial mode with obstacles enabled
  // // Obstacles System Design §7
  let obstacleWarning = null  // null | 'field' | 'gravity_approach' | 'gravity_collision'
  let gravityWellLabel = null
  if (obstaclesEnabled && newVector && ship.position) {
    const ghostPos  = hexAdd(ship.position, newVector)
    const pathHexes = hexLineDraw(ship.position, ghostPos)

    for (const hex of pathHexes) {
      const obstacle = getObstacleAt(obstacles, hex)
      if (obstacle?.type === 'gravity_well') {
        obstacleWarning = 'gravity_collision'
        gravityWellLabel = obstacle.label ?? 'gravity well'
        break
      }
      // Warning ring: hex within radius+1 but outside radius
      const nearGravity = obstacles.find(
        (o) => o.type === 'gravity_well' &&
          hexDistance(hex, o.position) === o.radius + 1
      )
      if (nearGravity && obstacleWarning !== 'gravity_collision') {
        obstacleWarning = 'gravity_approach'
        gravityWellLabel = nearGravity.label ?? 'exclusion zone'
      }
      if (!obstacle && obstacleWarning !== 'gravity_approach' && obstacleWarning !== 'gravity_collision') {
        // pass — no field obstacle
      }
      if ((obstacle?.type === 'asteroid_field' || obstacle?.type === 'debris_field') &&
          obstacleWarning === null) {
        obstacleWarning = 'field'
      }
    }
  }

  const gravityCollisionBlocks = obstacleWarning === 'gravity_collision'

  return (
    <Modal title={`Thrust — ${ship.name}`} onClose={closeModal}>
      <div className="space-y-4">
        {/* Thrust availability bar */}
        <div>
          <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
            <span>Thrust available</span>
            <span className={cost > thrustAvailable ? 'text-red-400' : 'text-(--neon-cyan)'}>
              {cost} / {thrustAvailable}
            </span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isValid ? 'bg-(--neon-cyan)' : 'bg-red-500'}`}
              style={{ width: `${Math.min(100, thrustAvailable > 0 ? (cost / thrustAvailable) * 100 : 0)}%` }}
            />
          </div>
        </div>

        {/* Vector display */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
          <div className="bg-slate-800 rounded p-2">
            <p className="text-slate-400 text-xs mb-1">Current vector</p>
            <p className="text-slate-200">({ship.vector.q}, {ship.vector.r})</p>
          </div>
          <div className="flex items-center justify-center text-slate-400 text-lg">→</div>
          <div className={`rounded p-2 ${isValid ? 'bg-slate-800' : 'bg-red-950/40 border border-red-700/50'}`}>
            <p className="text-slate-400 text-xs mb-1">New vector</p>
            <p className={isValid ? 'text-(--neon-cyan)' : 'text-red-400'}>
              ({newVector.q}, {newVector.r})
            </p>
          </div>
        </div>

        {/* Delta display */}
        <div className="text-center font-mono text-xs text-slate-400">
          Δ ({delta.q}, {delta.r}) — costo: {cost} thrust
        </div>

        {/* Directional buttons — flat-top hex layout (N/S axis, NE/SE/NW/SW diagonals) */}
        <div className="flex flex-col items-center gap-1">
          {/* NW N NE */}
          <div className="flex gap-2">
            <DirButton label="NW" onClick={() => applyDirectionStep(3, 1)} />
            <DirButton label="N"  onClick={() => applyDirectionStep(2, 1)} />
            <DirButton label="NE" onClick={() => applyDirectionStep(1, 1)} />
          </div>
          {/* RST */}
          <div className="flex items-center justify-center">
            <button
              onClick={handleReset}
              className="w-10 h-10 rounded-full border border-slate-600 text-slate-400 font-mono text-xs hover:border-slate-400 hover:text-slate-300 transition-colors"
            >
              RST
            </button>
          </div>
          {/* SW S SE */}
          <div className="flex gap-2">
            <DirButton label="SW" onClick={() => applyDirectionStep(4, 1)} />
            <DirButton label="S"  onClick={() => applyDirectionStep(5, 1)} />
            <DirButton label="SE" onClick={() => applyDirectionStep(0, 1)} />
          </div>
        </div>

        {/* Manual Δq / Δr inputs */}
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="font-mono text-xs text-slate-400">Δq</span>
            <input
              type="number"
              value={delta.q}
              onChange={(e) => setDelta((d) => ({ ...d, q: parseInt(e.target.value) || 0 }))}
              className="w-full bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm rounded px-2 py-1 focus:outline-none focus:border-(--neon-cyan)/60"
            />
          </label>
          <label className="space-y-1">
            <span className="font-mono text-xs text-slate-400">Δr</span>
            <input
              type="number"
              value={delta.r}
              onChange={(e) => setDelta((d) => ({ ...d, r: parseInt(e.target.value) || 0 }))}
              className="w-full bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm rounded px-2 py-1 focus:outline-none focus:border-(--neon-cyan)/60"
            />
          </label>
        </div>

        {/* Error */}
        {!isValid && cost > 0 && (
          <p className="text-red-400 font-mono text-xs text-center">
            🚨 Insufficient thrust ({cost} required, {thrustAvailable} available)
          </p>
        )}

        {/* Obstacle warnings */}
        {obstacleWarning === 'field' && (
          <p className="text-amber-400 font-mono text-xs text-center">
            ⚠ Asteroid field — movement cost ×2 per field hex
          </p>
        )}
        {obstacleWarning === 'gravity_approach' && (
          <p className="text-orange-400 font-mono text-xs text-center">
            ⚠ Approaching {gravityWellLabel} — exclusion zone ahead
          </p>
        )}
        {obstacleWarning === 'gravity_collision' && (
          <p className="text-red-400 font-mono text-xs text-center animate-pulse">
            🚨 COLLISION — trajectory enters exclusion zone of {gravityWellLabel}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={closeModal}
            className="flex-1 py-2 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-slate-500 transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || cost === 0 || gravityCollisionBlocks}
            className="flex-1 py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-xs rounded hover:bg-(--neon-cyan)/20 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
          >
            APPLY THRUST
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
      className="w-12 h-8 bg-slate-800 border border-slate-600 text-slate-300 font-mono text-xs rounded hover:border-(--neon-cyan)/60 hover:text-(--neon-cyan) transition-colors"
    >
      {label}
    </button>
  )
}
