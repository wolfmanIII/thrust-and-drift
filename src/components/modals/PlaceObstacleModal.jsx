/**
 * PlaceObstacleModal — two-step modal for placing or editing obstacle tokens.
 *
 * Step 1: select obstacle type.
 * Step 2: configure radius, density (asteroid), label.
 *
 * Opened from EmptyContextMenu (new obstacle at hex) or ObstacleContextMenu (edit).
 * Payload: { hex: HexCoord, obstacle?: ObstacleToken }
 *
 * // Obstacles System Design §6.3
 */

import { useState } from 'react'
import { Modal }    from './Modal.jsx'
import { useUiStore }    from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

const TYPES = [
  { value: 'asteroid_field', label: 'Asteroid Field', icon: '🪨' },
  { value: 'debris_field',   label: 'Debris Field',   icon: '💀' },
  { value: 'gravity_well',   label: 'Gravity Well',   icon: '🌑' },
  { value: 'nebula',         label: 'Nebula',         icon: '🌫' },
]

const TYPE_DESC = {
  asteroid_field: 'Movement ×2/hex — Pilot check on collision — Cover DM −1/−2',
  debris_field:   'Movement ×2/hex — Pilot check (10+) on collision — Cover DM −2',
  gravity_well:   'Impassable zone — 4D6 impact damage (Armor applies)',
  nebula:         'No sensor lock — Cover DM −2 — No movement penalty',
}

const RADIUS_RANGE = {
  asteroid_field: [1, 4],
  debris_field:   [1, 3],
  gravity_well:   [2, 5],
  nebula:         [3, 8],
}

export function PlaceObstacleModal() {
  const modalPayload   = useUiStore((s) => s.modalPayload)
  const closeModal     = useUiStore((s) => s.closeModal)
  const addObstacle    = useBattleStore((s) => s.addObstacle)
  const updateObstacle = useBattleStore((s) => s.updateObstacle)

  const existing = modalPayload?.obstacle ?? null
  const hex      = modalPayload?.hex ?? { q: 0, r: 0 }
  const isEdit   = !!existing

  const [step, setStep]       = useState('type')
  const [type, setType]       = useState(existing?.type ?? 'asteroid_field')
  const [density, setDensity] = useState(existing?.density ?? 'light')
  const [radius, setRadius]   = useState(existing?.radius ?? RADIUS_RANGE[existing?.type ?? 'asteroid_field'][0])
  const [label, setLabel]     = useState(existing?.label ?? '')

  function handleSelectType(t) {
    setType(t)
    const [min] = RADIUS_RANGE[t]
    setRadius(min)
    setStep('config')
  }

  function handleConfirm() {
    const fields = {
      type,
      position: existing?.position ?? hex,
      radius,
      label: label.trim() || undefined,
      ...(type === 'asteroid_field' ? { density } : {}),
    }
    if (isEdit) {
      updateObstacle(existing.id, fields)
    } else {
      addObstacle(fields)
    }
    closeModal()
  }

  const [rMin, rMax] = RADIUS_RANGE[type]
  const clampedRadius = Math.max(rMin, Math.min(rMax, radius))

  return (
    <Modal title={isEdit ? 'EDIT OBSTACLE' : 'PLACE OBSTACLE'} onClose={closeModal} variant="dialog" width="max-w-sm">
      {step === 'type' ? (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs text-slate-400">Select obstacle type:</p>
          {TYPES.map(({ value, label: tlabel, icon }) => (
            <button
              key={value}
              onClick={() => handleSelectType(value)}
              className="flex flex-col gap-1 text-left px-4 py-3 rounded border
                border-slate-700 hover:border-(--neon-cyan)/50 hover:bg-slate-800/60
                transition-colors"
            >
              <span className="font-mono text-sm text-slate-200">
                {icon} {tlabel}
              </span>
              <span className="font-mono text-xs text-slate-500">
                {TYPE_DESC[value]}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ── Type badge ────────────────────────────────────────── */}
          <button
            onClick={() => setStep('type')}
            className="self-start font-mono text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← {TYPES.find((t) => t.value === type)?.icon} {TYPES.find((t) => t.value === type)?.label}
          </button>

          {/* ── Hex ───────────────────────────────────────────────── */}
          <div className="flex justify-between font-mono text-xs">
            <span className="text-slate-400">HEX</span>
            <span className="text-slate-300">
              ({(existing?.position ?? hex).q}, {(existing?.position ?? hex).r})
            </span>
          </div>

          {/* ── Density (asteroid field only) ─────────────────────── */}
          {type === 'asteroid_field' && (
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-xs text-slate-400">DENSITY</span>
              <div className="flex gap-2">
                {['light', 'dense'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDensity(d)}
                    className={`flex-1 py-2 font-mono text-xs rounded border transition-colors ${
                      density === d
                        ? 'border-(--neon-cyan)/60 text-(--neon-cyan) bg-slate-800/60'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Radius ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="font-mono text-xs text-slate-400">RADIUS</span>
              <span className="font-mono text-xs text-slate-300">{clampedRadius} hex</span>
            </div>
            <input
              type="range"
              min={rMin} max={rMax}
              value={clampedRadius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <div className="flex justify-between font-mono text-[10px] text-slate-600">
              <span>{rMin}</span>
              <span>{rMax}</span>
            </div>
          </div>

          {/* ── Label ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-xs text-slate-400">LABEL (optional)</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Alpha Belt"
              maxLength={24}
              className="bg-slate-900 border border-slate-600 focus:border-(--neon-cyan)/60
                rounded px-3 py-2 font-mono text-sm text-white outline-none"
            />
          </div>

          {/* ── Confirm ───────────────────────────────────────────── */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={closeModal}
              className="flex-1 py-2 font-mono text-xs rounded border border-slate-700
                text-slate-400 hover:bg-slate-800/60 transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2 font-mono text-xs rounded border
                border-(--neon-cyan)/60 text-(--neon-cyan) hover:bg-slate-800/60 transition-colors"
            >
              {isEdit ? 'SAVE' : 'PLACE'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
