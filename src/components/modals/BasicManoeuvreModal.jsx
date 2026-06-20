/**
 * BasicManoeuvreModal — basic-mode manoeuvre phase: contribute thrust toward a range band change.
 * Cost per band step follows the Ship Movement table (CRB p.166). Thrust accumulates across
 * rounds and across ships approaching each other; band advances when threshold is met.
 * // MgT2e CRB p.166 — Ship Movement table
 */

import { useState, useMemo } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore }     from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { RANGE_BAND_ORDER, RANGE_BAND_MOVE_COST } from '../../data/rangeBands.js'
import { computeIonThrustEffect } from '../../utils/combat.js'

function availableThrust(ship) {
  const basePow = ship.basePower ?? ship.profile.maxPower ?? 100
  const ionCap  = computeIonThrustEffect(ship.profile.thrust, ship.currentPower ?? basePow, basePow)
  return Math.max(0,
    ionCap
    + (ship.thrustBonusThisRound ?? 0)
    - (ship.thrustUsedThisRound ?? 0)
    - (ship.thrustPenalty ?? 0)
  )
}

export function BasicManoeuvreModal() {
  const closeModal         = useUiStore((s) => s.closeModal)
  const payload            = useUiStore((s) => s.modalPayload)
  const ships              = useBattleStore((s) => s.ships)
  const rangeBands         = useBattleStore((s) => s.rangeBands)
  const basicBandPool      = useBattleStore((s) => s.basicBandPool)
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
  const cost        = RANGE_BAND_MOVE_COST[currentBand] ?? 1

  const poolNow      = pKey ? (basicBandPool[pKey] ?? 0) : 0
  const delta        = direction === 'approach' ? movingThrust : -movingThrust
  const proposedPool = poolNow + delta

  const canApproach = currentIdx > 0
  const canFlee     = currentIdx < RANGE_BAND_ORDER.length - 1

  // Does the proposed contribution push the pool over the threshold?
  const bandClosing = proposedPool >= cost && canApproach
  const bandOpening = proposedPool <= -cost && canFlee

  const resultBand = bandClosing
    ? RANGE_BAND_ORDER[currentIdx - 1]
    : bandOpening
      ? RANGE_BAND_ORDER[currentIdx + 1]
      : currentBand

  // Progress bar: net pool toward the chosen direction after this action
  const poolForDisplay  = direction === 'approach' ? proposedPool : -proposedPool
  const progressRatio   = Math.min(1, Math.max(0, poolForDisplay / cost))
  const willChangeBand  = bandClosing || bandOpening
  const movingAvail     = movingShip ? availableThrust(movingShip) : 0

  // Any non-zero thrust contribution is valid; even partial progress toward the cost is useful.
  const canConfirm = !!target && movingThrust > 0

  // Rounds until band change at the current rate (informational)
  const roundsToChange = movingThrust > 0
    ? Math.ceil(Math.max(0, cost - poolForDisplay) / movingThrust)
    : null

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
              const key  = [movingShip.id, e.id].sort().join('_')
              const band = rangeBands[key] ?? 'Very Long'
              const pool = basicBandPool[key] ?? 0
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
                  {pool !== 0 && (
                    <span className={`text-[10px] ${pool > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pool > 0 ? `+${pool}` : pool}
                    </span>
                  )}
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
                    className={`py-1.5 font-mono text-xs rounded border transition-colors disabled:text-slate-600 disabled:border-slate-700 disabled:cursor-not-allowed ${
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

            {/* Range + cost breakdown */}
            <div className="bg-slate-800/60 rounded p-3 space-y-1">
              <div className="flex justify-between font-mono text-xs">
                <span className="text-slate-400">Current range</span>
                <span className="text-slate-200">{currentBand}</span>
              </div>
              <div className="flex justify-between font-mono text-xs">
                <span className="text-slate-400">Thrust to change band</span>
                <span className="text-yellow-400">{cost} thrust</span>
              </div>
              <div className="flex justify-between font-mono text-xs">
                <span className="text-slate-400">Pool accumulated</span>
                <span className={poolNow === 0 ? 'text-slate-500' : poolNow > 0 ? 'text-green-400' : 'text-red-400'}>
                  {poolNow > 0 ? `+${poolNow}` : poolNow} ({direction === 'approach' ? Math.max(0, poolNow) : Math.max(0, -poolNow)}/{cost})
                </span>
              </div>
              <div className="flex justify-between font-mono text-xs border-t border-slate-700 pt-1 mt-1">
                <span className="text-slate-400">Result if confirmed</span>
                <span className={willChangeBand ? 'text-green-400' : 'text-slate-300'}>
                  {resultBand}
                  {willChangeBand && <span className="ml-1 text-green-400">✓</span>}
                  {!willChangeBand && roundsToChange !== null && roundsToChange > 1 && (
                    <span className="ml-1 text-slate-500">~{roundsToChange}r</span>
                  )}
                </span>
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

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progressRatio * 100}%`,
                    backgroundColor: willChangeBand ? '#4ade80' : '#22d3ee',
                  }}
                />
              </div>
              <span className={`font-mono text-xs shrink-0 ${willChangeBand ? 'text-green-400' : 'text-slate-400'}`}>
                {Math.round(progressRatio * 100)}%
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="flex-1 py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-sm tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
              >
                {willChangeBand ? 'APPLY MANOEUVRE' : 'ALLOCATE THRUST'}
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
