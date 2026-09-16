/**
 * AddShipModal — select a profile, faction, color, then place on map.
 * Initiates pendingPlacement mode; user clicks a hex cell to confirm position.
 */

import { useState, useEffect, useRef } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useProfilesStore } from '../../store/profilesStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { FACTIONS } from '../../data/factions.js'
import { getShapeTracer, getDetailDrawer, SHIP_SHAPES } from '../map/shipTokenShapes.js'
import { computeShipRotation } from '../map/tokenRenderers.js'
import { HEX_DIRECTIONS } from '../../utils/hex.js'

/**
 * Compass step button — a filled triangle pointing in the travel direction (same rotation
 * math as the ship token itself, via computeShipRotation) instead of a text label, for a
 * cleaner sci-fi HUD look. `name` stays as the accessible name (title/aria-label) so the
 * direction is still identifiable to screen readers and in tests.
 * `composite` (E/W shortcuts, no true single hex-step on a flat-top grid) renders amber
 * instead of cyan-on-hover, matching the app's existing colour convention for house-rule/
 * shortcut deviations (e.g. the Missile Barbette salvo stepper).
 */
function DirButton({ name, angle, onClick, composite = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      aria-label={name}
      className="group w-9 h-6 bg-slate-800 border border-slate-600 rounded hover:border-(--neon-cyan)/60 transition-colors flex items-center justify-center"
    >
      <span
        style={{ transform: `rotate(${angle}rad)` }}
        className={`block w-0 h-0 border-l-[3px] border-r-[3px] border-b-[10px] border-l-transparent border-r-transparent transition-colors ${
          composite
            ? 'border-b-amber-500/70 group-hover:border-b-amber-400'
            : 'border-b-slate-300 group-hover:border-b-(--neon-cyan)'
        }`}
      />
    </button>
  )
}

/**
 * Flat-top hexes have no true East/West neighbour — only the 6 real directions
 * (N/NE/SE/S/SW/NW). E and W are composite shortcuts: one click applying two hex-steps
 * at once (NE+SE / NW+SW), same net result as clicking both in sequence.
 */
const EAST_STEP = { q: HEX_DIRECTIONS[1].q + HEX_DIRECTIONS[0].q, r: HEX_DIRECTIONS[1].r + HEX_DIRECTIONS[0].r }
const WEST_STEP = { q: HEX_DIRECTIONS[3].q + HEX_DIRECTIONS[4].q, r: HEX_DIRECTIONS[3].r + HEX_DIRECTIONS[4].r }

const COMPASS_PREVIEW_SIZE = 48

/**
 * Center of the compass — the chosen token shape/colour, drawn inside a hex frame and
 * rotated to face the vector currently being set. Doubles as the RST button (click to
 * reset to (0, 0)); the ↺ badge in the corner marks it as clickable.
 */
function CompassTokenPreview({ shape, color, vectorQ, vectorR, onClick }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio ?? 1
    canvas.width  = COMPASS_PREVIEW_SIZE * dpr
    canvas.height = COMPASS_PREVIEW_SIZE * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, COMPASS_PREVIEW_SIZE, COMPASS_PREVIEW_SIZE)
    ctx.save()
    ctx.translate(COMPASS_PREVIEW_SIZE / 2, COMPASS_PREVIEW_SIZE / 2)

    // Hex frame (flat-top), decorative — matches the map's hex grid orientation
    // (same corner formula as hexCorners() in useCanvasRenderer.js, no angle offset)
    const hexR = COMPASS_PREVIEW_SIZE * 0.47
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i
      const x = hexR * Math.cos(angle)
      const y = hexR * Math.sin(angle)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(30,41,59,0.85)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(100,116,139,0.5)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Token, rotated to face the vector being set
    ctx.rotate(computeShipRotation({ q: vectorQ, r: vectorR }))
    const shapeSize = COMPASS_PREVIEW_SIZE * 0.28
    getShapeTracer(shape)(ctx, shapeSize)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1
    ctx.stroke()
    getDetailDrawer(shape)?.(ctx, shapeSize)

    ctx.restore()
  }, [shape, color, vectorQ, vectorR])

  return (
    <button
      type="button"
      onClick={onClick}
      title="Reset vector to (0, 0)"
      aria-label="Reset vector to (0, 0)"
      className="relative hover:opacity-80 transition-opacity"
    >
      <canvas
        ref={canvasRef}
        style={{ width: COMPASS_PREVIEW_SIZE, height: COMPASS_PREVIEW_SIZE }}
      />
      <span className="absolute bottom-0 right-0 text-slate-400 text-2xs leading-none">↺</span>
    </button>
  )
}

const SHAPE_LABELS = {
  delta:     'Delta',
  needle:    'Needle',
  freighter: 'Freighter',
  gunship:   'Gunship',
  cruiser:   'Cruiser',
  capital:   'Capital',
}

const PREVIEW_SIZE = 40

function ShapePreview({ shape, selected, onClick }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio ?? 1
    canvas.width  = PREVIEW_SIZE * dpr
    canvas.height = PREVIEW_SIZE * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE)
    ctx.save()
    ctx.translate(PREVIEW_SIZE / 2, PREVIEW_SIZE / 2)
    getShapeTracer(shape)(ctx, PREVIEW_SIZE * 0.42)
    ctx.fillStyle = selected ? 'rgba(34,211,238,0.75)' : 'rgba(148,163,184,0.5)'
    ctx.fill()
    ctx.strokeStyle = selected ? 'rgba(34,211,238,0.9)' : 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    ctx.stroke()
    getDetailDrawer(shape)?.(ctx, PREVIEW_SIZE * 0.42)
    ctx.restore()
  }, [shape, selected])

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-1.5 rounded border transition-colors ${
        selected
          ? 'border-(--neon-cyan)/60 bg-(--neon-cyan)/10'
          : 'border-slate-700 hover:border-slate-500'
      }`}
    >
      <canvas
        ref={canvasRef}
        style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
      />
      <span className={`font-mono text-2xs ${selected ? 'text-(--neon-cyan)' : 'text-slate-400'}`}>
        {SHAPE_LABELS[shape]}
      </span>
    </button>
  )
}

const PRESET_COLORS = [
  '#60a5fa', '#f87171', '#4ade80', '#facc15',
  '#c084fc', '#fb923c', '#22d3ee', '#f472b6',
]

export function AddShipModal() {
  const closeModal     = useUiStore((s) => s.closeModal)
  const modalPayload   = useUiStore((s) => s.modalPayload)
  const startPlacement = useUiStore((s) => s.startPlacement)
  const addShip        = useBattleStore((s) => s.addShip)
  const combatMode     = useBattleStore((s) => s.combatMode)
  const profiles       = useProfilesStore((s) => s.profiles)

  const initialHex  = modalPayload?.hex ?? null
  const isBasicMode = combatMode === 'basic'

  const [selectedProfileId, setSelectedProfileId] = useState(profiles[0]?.id ?? null)
  const [faction, setFaction]     = useState('npc')
  const [color, setColor]         = useState('#f87171')
  const [filter, setFilter]       = useState('')
  const [tokenShape, setTokenShape] = useState('delta')
  const [vectorQ, setVectorQ]     = useState(0)
  const [vectorR, setVectorR]     = useState(0)

  const filtered = profiles.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  )

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId)

  const handleConfirm = () => {
    if (!selectedProfile) return
    const profile = { ...selectedProfile, tokenShape }
    const vector  = isBasicMode ? null : { q: vectorQ, r: vectorR }
    if (initialHex) {
      addShip(profile, initialHex, faction, color, vector)
      closeModal()
    } else if (isBasicMode) {
      addShip(profile, { q: 0, r: 0 }, faction, color)
      closeModal()
    } else {
      startPlacement({ profile, faction, color, vector })
      closeModal()
    }
  }

  return (
    <Modal title="Add Ship" onClose={closeModal}>
      <div className="space-y-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Search profile…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 text-slate-200 font-mono text-xs rounded px-3 py-1.5 focus:outline-none focus:border-(--neon-cyan)/60"
        />

        {/* Profile list */}
        <div className="max-h-40 overflow-y-auto space-y-0.5 border border-slate-700 rounded">
          {filtered.length === 0 && (
            <p className="text-slate-400 font-mono text-xs italic px-3 py-2">No profiles found.</p>
          )}
          {filtered.map((p) => {
            const isSelected = p.id === selectedProfileId
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProfileId(p.id)}
                className={`w-full text-left px-3 py-1.5 font-mono text-xs transition-colors flex items-center gap-2 border-l-2 ${
                  isSelected
                    ? 'bg-sky-950 text-sky-200 border-sky-400'
                    : 'text-slate-300 hover:bg-slate-800 border-transparent'
                }`}
              >
                <span className={`w-3 shrink-0 text-center ${isSelected ? 'text-sky-400' : 'text-transparent'}`}>▶</span>
                <span className="font-bold">{p.name}</span>
                {p.shipClass && <span className={`ml-1 ${isSelected ? 'text-sky-400/60' : 'text-slate-400'}`}>{p.shipClass}</span>}
              </button>
            )
          })}
        </div>

        {/* Faction */}
        <div>
          <p className="text-slate-400 font-mono text-xs mb-1.5">Faction</p>
          <div className="flex gap-2">
            {FACTIONS.map((f) => (
              <button
                key={f.id}
                onClick={() => { setFaction(f.id); setColor(f.color) }}
                className={`flex-1 py-1.5 font-mono text-xs rounded border transition-colors ${
                  faction === f.id
                    ? 'border-(--neon-cyan)/60 bg-(--neon-cyan)/10 text-(--neon-cyan)'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <p className="text-slate-400 font-mono text-xs mb-1.5">Token color</p>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  color === c ? 'border-white scale-125' : 'border-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Token shape */}
        <div>
          <p className="text-slate-400 font-mono text-xs mb-1.5">Token shape</p>
          <div className="grid grid-cols-6 gap-1.5">
            {Object.keys(SHIP_SHAPES).map((shape) => (
              <ShapePreview
                key={shape}
                shape={shape}
                selected={tokenShape === shape}
                onClick={() => setTokenShape(shape)}
              />
            ))}
          </div>
        </div>

        {/* Initial vector — vectorial mode only */}
        {!isBasicMode && (
          <div>
            <p className="text-slate-400 font-mono text-xs mb-1.5">
              Initial vector
              <span className="text-slate-600 ml-2">— leave at (0, 0) if stationary</span>
            </p>

            {/* Compass (left) + live readout/manual Δq/Δr (right) side by side — keeps the
                panel shorter than stacking everything in one column. Compass click a
                direction to step the vector one hex that way (#41-adjacent UX improvement:
                raw Δq/Δr math isn't intuitive, so it's the primary input; the fields on the
                right are the fallback for an exact/large vector). */}
            <div className="flex items-center gap-4 mb-2">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="flex gap-1.5">
                  <DirButton name="NW" angle={computeShipRotation(HEX_DIRECTIONS[3])} onClick={() => { const d = HEX_DIRECTIONS[3]; setVectorQ((q) => q + d.q); setVectorR((r) => r + d.r) }} />
                  <DirButton name="N"  angle={computeShipRotation(HEX_DIRECTIONS[2])} onClick={() => { const d = HEX_DIRECTIONS[2]; setVectorQ((q) => q + d.q); setVectorR((r) => r + d.r) }} />
                  <DirButton name="NE" angle={computeShipRotation(HEX_DIRECTIONS[1])} onClick={() => { const d = HEX_DIRECTIONS[1]; setVectorQ((q) => q + d.q); setVectorR((r) => r + d.r) }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <DirButton name="W" angle={computeShipRotation(WEST_STEP)} composite onClick={() => { setVectorQ((q) => q + WEST_STEP.q); setVectorR((r) => r + WEST_STEP.r) }} />
                  <CompassTokenPreview
                    shape={tokenShape}
                    color={color}
                    vectorQ={vectorQ}
                    vectorR={vectorR}
                    onClick={() => { setVectorQ(0); setVectorR(0) }}
                  />
                  <DirButton name="E" angle={computeShipRotation(EAST_STEP)} composite onClick={() => { setVectorQ((q) => q + EAST_STEP.q); setVectorR((r) => r + EAST_STEP.r) }} />
                </div>
                <div className="flex gap-1.5">
                  <DirButton name="SW" angle={computeShipRotation(HEX_DIRECTIONS[4])} onClick={() => { const d = HEX_DIRECTIONS[4]; setVectorQ((q) => q + d.q); setVectorR((r) => r + d.r) }} />
                  <DirButton name="S"  angle={computeShipRotation(HEX_DIRECTIONS[5])} onClick={() => { const d = HEX_DIRECTIONS[5]; setVectorQ((q) => q + d.q); setVectorR((r) => r + d.r) }} />
                  <DirButton name="SE" angle={computeShipRotation(HEX_DIRECTIONS[0])} onClick={() => { const d = HEX_DIRECTIONS[0]; setVectorQ((q) => q + d.q); setVectorR((r) => r + d.r) }} />
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                {/* Live readout */}
                <p className="text-center font-mono text-xs text-slate-400">
                  Vector: <span className="text-(--neon-cyan)">({vectorQ}, {vectorR})</span>
                </p>

                {/* Manual Δq/Δr — precise or large vectors */}
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-slate-500 w-5 shrink-0">Δq</span>
                  <input
                    type="number"
                    value={vectorQ}
                    onChange={(e) => setVectorQ(Number(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-600 text-(--neon-cyan) font-mono text-xs rounded px-2 py-1 text-center focus:outline-none focus:border-(--neon-cyan)/60"
                    aria-label="Initial vector Δq"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-slate-500 w-5 shrink-0">Δr</span>
                  <input
                    type="number"
                    value={vectorR}
                    onChange={(e) => setVectorR(Number(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-600 text-(--neon-cyan) font-mono text-xs rounded px-2 py-1 text-center focus:outline-none focus:border-(--neon-cyan)/60"
                    aria-label="Initial vector Δr"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirm */}
        <button
          onClick={handleConfirm}
          disabled={!selectedProfile}
          className="w-full py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-sm tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
        >
          {initialHex ? 'PLACE SHIP' : isBasicMode ? 'ADD SHIP' : 'SELECT HEX ON MAP →'}
        </button>
      </div>
    </Modal>
  )
}
