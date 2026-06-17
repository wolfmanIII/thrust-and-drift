/**
 * BasicManoeuvreModal — basic-mode manoeuvre phase: change range band between two ships.
 * Cost: 1 thrust per band change (CRB p.161 non-vectorial — no hex distance scaling).
 * // MgT2e CRB p.161 — Fase di Manovra
 */

import { useState, useMemo } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore }    from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { RANGE_BAND_ORDER } from '../../data/rangeBands.js'

const BAND_CHANGE_COST = 1  // flat thrust cost per range band step (CRB p.161)

function availableThrust(ship) {
  return Math.max(0,
    ship.profile.thrust
    + (ship.thrustBonusThisRound ?? 0)
    - (ship.thrustUsedThisRound ?? 0)
    - (ship.thrustPenalty ?? 0)
  )
}

export function BasicManoeuvreModal() {
  const closeModal  = useUiStore((s) => s.closeModal)
  const payload     = useUiStore((s) => s.modalPayload)
  const ships       = useBattleStore((s) => s.ships)
  const rangeBands  = useBattleStore((s) => s.rangeBands)
  const applyBasicMovement = useBattleStore((s) => s.applyBasicMovement)
  const setRangeBand       = useBattleStore((s) => s.setRangeBand)

  const movingShip = ships.find((s) => s.id === payload?.shipId) ?? null

  const enemies = useMemo(() =>
    ships.filter((s) => s.faction !== movingShip?.faction),
    [ships, movingShip]
  )

  const [targetId, setTargetId]         = useState(enemies[0]?.id ?? null)
  const [direction, setDirection]       = useState('approach')
  const [movingThrust, setMovingThrust] = useState(0)

  const target = ships.find((s) => s.id === targetId) ?? null

  const pKey = movingShip && target
    ? [movingShip.id, target.id].sort().join('_')
    : null
  const currentBand = pKey ? (rangeBands[pKey] ?? 'Very Long') : 'Very Long'
  const currentIdx  = RANGE_BAND_ORDER.indexOf(currentBand)

  const canApproach = currentIdx > 0
  const canFlee     = currentIdx < RANGE_BAND_ORDER.length - 1

  const cost = BAND_CHANGE_COST

  const resultIdx = direction === 'approach'
    ? Math.max(0, currentIdx - 1)
    : Math.min(RANGE_BAND_ORDER.length - 1, currentIdx + 1)
  const resultBand = RANGE_BAND_ORDER[resultIdx]

  const canAfford   = movingThrust >= cost
  const noChange    = currentBand === resultBand
  const canConfirm  = !!target && canAfford && !noChange
  const movingAvail = movingShip ? availableThrust(movingShip) : 0

  const handleConfirm = () => {
    if (!movingShip || !target) return
    applyBasicMovement(movingShip.id, target.id, direction, movingThrust)
    closeModal()
  }

  const handleDirectOverride = () => {
    if (!movingShip || !target) return
    setRangeBand(movingShip.id, target.id, resultBand)
    closeModal()
  }

  if (!movingShip) return null

  return (
    <Modal title={`Manoeuvre — ${movingShip.profile.name}`} onClose={closeModal} width="max-w-md">
      <div className="space-y-4">

        {/* Target selector */}
        <div>
          <p className="font-mono text-xs text-slate-400 mb-1.5">Target ship</p>
          <div className="flex flex-col gap-1">
            {enemies.length === 0 && (
              <p className="font-mono text-xs text-slate-400 italic">No enemy ships.</p>
            )}
            {enemies.map((e) => {
              const key = [movingShip.id, e.id].sort().join('_')
              const band = rangeBands[key] ?? 'Very Long'
              return (
                <button
                  key={e.id}
                  onClick={() => setTargetId(e.id)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded border font-mono text-xs transition-colors ${
                    targetId === e.id
                      ? 'border-(--neon-cyan)/60 bg-(--neon-cyan)/10 text-(--neon-cyan)'
                      : 'border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                  <span className="font-bold">{e.profile.name}</span>
                  <span className="ml-auto text-slate-400">{band}</span>
                </button>
              )
            })}
          </div>
        </div>

        {target && (
          <>
            {/* Direction */}
            <div>
              <p className="font-mono text-xs text-slate-400 mb-1.5">Direction</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: 'approach', label: '⬇ Approach', disabled: !canApproach },
                  { val: 'flee',     label: '⬆ Flee',     disabled: !canFlee },
                ].map(({ val, label, disabled }) => (
                  <button
                    key={val}
                    onClick={() => { if (!disabled) setDirection(val) }}
                    disabled={disabled}
                    className={`py-1.5 font-mono text-xs rounded border transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:cursor-not-allowed ${
                      direction === val
                        ? 'border-(--neon-cyan)/60 bg-(--neon-cyan)/10 text-(--neon-cyan)'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Range display */}
            <div className="bg-slate-800/60 rounded p-3 space-y-1">
              <div className="flex justify-between font-mono text-xs">
                <span className="text-slate-400">Current range</span>
                <span className="text-slate-200">{currentBand}</span>
              </div>
              <div className="flex justify-between font-mono text-xs">
                <span className="text-slate-400">Cost to change band</span>
                <span className="text-yellow-400">{cost} thrust</span>
              </div>
              <div className="flex justify-between font-mono text-xs">
                <span className="text-slate-400">Result if confirmed</span>
                <span className={canAfford ? 'text-green-400' : 'text-slate-400'}>{resultBand}</span>
              </div>
            </div>

            {/* Thrust input */}
            <ThrustInput
              label={`${movingShip.profile.name} (this ship)`}
              color={movingShip.color}
              value={movingThrust}
              max={movingAvail}
              onChange={setMovingThrust}
            />

            {/* Thrust vs cost */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (movingThrust / Math.max(1, cost)) * 100)}%`,
                    backgroundColor: canAfford ? '#4ade80' : '#f87171',
                  }}
                />
              </div>
              <span className={`font-mono text-xs shrink-0 ${canAfford ? 'text-green-400' : 'text-slate-400'}`}>
                {movingThrust}/{cost}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="flex-1 py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-sm tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
              >
                APPLY MANOEUVRE
              </button>
              <button
                onClick={handleDirectOverride}
                title="GM override — set range without spending thrust"
                className="px-3 py-2 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-slate-500 hover:text-slate-300 transition-colors"
              >
                GM SET
              </button>
            </div>
            <p className="font-mono text-xs text-slate-400 text-center">
              GM SET overrides range without spending thrust
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}

function ThrustInput({ label, color, value, max, onChange }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="font-mono text-xs text-slate-400">{label}</span>
        <span className="font-mono text-xs text-slate-400 ml-auto">{value}/{max} avail</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-400"
      />
    </div>
  )
}
