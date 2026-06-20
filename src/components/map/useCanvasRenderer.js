/**
 * Hook owning the full Canvas render loop.
 * Subscribes to battle/ui store state and redraws on every change.
 * All ctx.draw* calls are centralized here or in tokenRenderers.js.
 * // Spec §9 — Rendering Canvas layer order
 */

import { useEffect, useCallback, useRef } from 'react'
import { hexToPixel, hexAdd, hexDistance, computeClampedDelta } from '../../utils/hex.js'
import { computeIonThrustEffect } from '../../utils/combat.js'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { RANGE_BANDS } from '../../data/rangeBands.js'
import {
  drawShipToken,
  drawShipLabel,
  drawVectorArrow,
  drawGhostToken,
  drawMissileToken,
} from './tokenRenderers.js'

// === RANGE BAND RINGS ===

// Outer boundary of each named band, drawn at maxDistance + 0.5 so the ring
// sits between the last hex of the band and the first hex of the next.
const RING_DEFS = RANGE_BANDS
  .filter((b) => b.maxDistance !== Infinity)
  .map((b) => ({ label: b.label.toUpperCase(), n: b.maxDistance + 0.5 }))

// The 6 axial-direction unit vectors that, scaled by N, give the vertices of
// the hexagonal ring boundary at hex-distance N from the origin.
const RING_CORNERS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
]

/**
 * Draw concentric hexagonal range-band outlines centred on a selected ship.
 * Shown only when a ship is selected and thrust-targeting is inactive.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ position: { q: number, r: number } }} ship
 * @param {number} size  hex size in pixels
 * @param {number} ox    canvas x offset
 * @param {number} oy    canvas y offset
 */
function drawRangeBandRings(ctx, ship, size, ox, oy) {
  const { q: sq, r: sr } = ship.position
  const fontSize = Math.max(10, Math.round(10 * size / 32))
  ctx.save()
  ctx.setLineDash([6, 5])
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.font = `bold ${fontSize}px monospace`

  for (const { label, n } of RING_DEFS) {
    const pts = RING_CORNERS.map(({ q, r }) =>
      hexToPixel(sq + q * n, sr + r * n, size, ox, oy)
    )
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.closePath()
    ctx.stroke()

    // Label at top vertex with dark background pill for legibility
    const lx = pts[2].x
    const ly = pts[2].y - 5
    const tw = ctx.measureText(label).width
    const pad = 3
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'
    ctx.fillRect(lx - tw / 2 - pad, ly - fontSize - pad, tw + pad * 2, fontSize + pad * 2)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.95)'
    ctx.fillText(label, lx, ly)
  }
  ctx.restore()
}

// === ANIMATION UTILITIES ===

/** @param {number} t */
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

/**
 * Linearly interpolates between two hex positions.
 * hexToPixel accepts float coords — no rounding needed.
 * @param {{ q: number, r: number }} start
 * @param {{ q: number, r: number }} end
 * @param {number} t  0..1
 * @returns {{ q: number, r: number }}
 */
function lerpHex(start, end, t) {
  return { q: start.q + (end.q - start.q) * t, r: start.r + (end.r - start.r) * t }
}

// === GRID CONSTANTS ===
const HEX_SIZE = 32
const GRID_COLOR = 'rgba(100, 116, 139, 0.3)'   // slate-500 @ 30%
const GRID_STROKE = 1

/**
 * Compute the six corner pixel coordinates of a flat-top hex.
 * @param {number} cx Center X
 * @param {number} cy Center Y
 * @param {number} size Hex radius
 * @returns {{ x: number, y: number }[]}
 */
function hexCorners(cx, cy, size) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i)
    return { x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) }
  })
}

/**
 * Draw the hex grid for all cells visible within the canvas viewport.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width   Canvas width
 * @param {number} height  Canvas height
 * @param {{ x: number, y: number }} offset  Pan offset
 * @param {number} zoom
 */
function drawGrid(ctx, width, height, offset, zoom) {
  const size = HEX_SIZE * zoom
  // flat-top: x = 1.5*size*q  →  q range from x extents
  const margin = 2
  const qMin = Math.floor((-offset.x / zoom) / (1.5 * HEX_SIZE)) - margin
  const qMax = Math.ceil((width / zoom - offset.x / zoom) / (1.5 * HEX_SIZE)) + margin

  ctx.strokeStyle = GRID_COLOR
  ctx.lineWidth = GRID_STROKE

  for (let q = qMin; q <= qMax; q++) {
    // flat-top: y = sqrt(3)*size*(sqrt(3)/2*q + r)  →  r range depends on q
    const qYShift = (Math.sqrt(3) / 2) * q
    const rMin = Math.floor(((-offset.y / zoom) / HEX_SIZE - qYShift) / Math.sqrt(3)) - margin
    const rMax = Math.ceil(((height / zoom - offset.y / zoom) / HEX_SIZE - qYShift) / Math.sqrt(3)) + margin

    for (let r = rMin; r <= rMax; r++) {
      const { x: cx, y: cy } = hexToPixel(q, r, size, offset.x, offset.y)
      const corners = hexCorners(cx, cy, size)
      ctx.beginPath()
      ctx.moveTo(corners[0].x, corners[0].y)
      for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y)
      ctx.closePath()
      ctx.stroke()

      // Subtle coordinate label for orientation
      if (zoom > 1.2) {
        ctx.font = `${Math.floor(7 * zoom)}px monospace`
        ctx.fillStyle = 'rgba(100,116,139,0.5)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${q},${r}`, cx, cy)
      }
    }
  }
}

/**
 * Draw the rubber-band thrust targeting overlay.
 * Dashed line ship→thrustEndpoint, endpoint dot, ghost at next-round position,
 * faint line defaultGhost→newGhost, thrust budget badge.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} ship  ShipInstance
 * @param {{ q: number, r: number }} mouseHex
 * @param {number} size  Scaled hex size
 * @param {number} ox  Canvas x offset
 * @param {number} oy  Canvas y offset
 */
function drawThrustTargeting(ctx, ship, mouseHex, size, ox, oy) {
  const _basePow = ship.basePower ?? ship.profile.maxPower ?? 100
  const _ionCap  = computeIonThrustEffect(ship.profile.thrust, ship.currentPower ?? _basePow, _basePow)
  const thrustAvailable = Math.max(0,
    _ionCap + (ship.thrustBonusThisRound ?? 0)
    - ship.thrustUsedThisRound - (ship.thrustPenalty ?? 0)
  )
  const delta     = computeClampedDelta(mouseHex, ship.position, thrustAvailable)
  const cost      = hexDistance({ q: 0, r: 0 }, delta)
  const atCap     = thrustAvailable > 0 && cost >= thrustAvailable
  const lineColor = atCap ? '#f97316' : '#22d3ee'  // orange-500 : neon-cyan

  const { x: sx, y: sy } = hexToPixel(ship.position.q, ship.position.r, size, ox, oy)
  const thrustEndHex = hexAdd(ship.position, delta)
  const { x: ex, y: ey } = hexToPixel(thrustEndHex.q, thrustEndHex.r, size, ox, oy)

  ctx.save()

  // Dashed line: ship → thrust endpoint
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.moveTo(sx, sy)
  ctx.lineTo(ex, ey)
  ctx.stroke()
  ctx.setLineDash([])

  // Dot at thrust endpoint
  ctx.beginPath()
  ctx.arc(ex, ey, 4, 0, Math.PI * 2)
  ctx.fillStyle = lineColor
  ctx.fill()

  // Ghost at next-round position: ship.pos + ship.vector + delta
  const ghostHex = hexAdd(hexAdd(ship.position, ship.vector), delta)
  const { x: gx, y: gy } = hexToPixel(ghostHex.q, ghostHex.r, size, ox, oy)
  drawGhostToken(ctx, ship, gx, gy)

  // Faint line from default ghost (no thrust) to new ghost
  const defaultGhostHex = hexAdd(ship.position, ship.vector)
  const { x: dgx, y: dgy } = hexToPixel(defaultGhostHex.q, defaultGhostHex.r, size, ox, oy)
  ctx.setLineDash([2, 4])
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.4
  ctx.beginPath()
  ctx.moveTo(dgx, dgy)
  ctx.lineTo(gx, gy)
  ctx.stroke()
  ctx.setLineDash([])

  // Thrust budget badge below ghost
  ctx.globalAlpha = 1
  ctx.font = `bold ${Math.round(9 * (size / 32))}px monospace`
  ctx.fillStyle = atCap ? '#f97316' : '#94a3b8'
  ctx.textAlign = 'center'
  ctx.fillText(`${cost}/${thrustAvailable}`, gx, gy + size * 0.9)

  ctx.restore()
}

/**
 * @param {{
 *   canvasRef: React.RefObject<HTMLCanvasElement>,
 *   offset: React.MutableRefObject<{x:number,y:number}>,
 *   zoom: React.MutableRefObject<number>,
 *   mouseHexRef: React.MutableRefObject<{q:number,r:number}>,
 * }} params
 */
export function useCanvasRenderer({ canvasRef, offset, zoom, mouseHexRef }) {
  const ships          = useBattleStore((s) => s.ships)
  const missiles       = useBattleStore((s) => s.missiles)
  const phase          = useBattleStore((s) => s.phase)
  const selectedShipId  = useUiStore((s) => s.selectedShipId)
  const thrustTargeting = useUiStore((s) => s.thrustTargeting)

  /** rAF timestamp in ms — used for dogfight pulse animation. */
  const timestampRef = useRef(0)

  const hasActiveDogfight = ships.some((s) => s.inDogfight !== null)
  const movementAnimation = useUiStore((s) => s.movementAnimation)

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    // --- Layer 1: Hex grid ---
    drawGrid(ctx, width, height, offset.current, zoom.current)

    const z = zoom.current
    const ox = offset.current.x
    const oy = offset.current.y
    const size = HEX_SIZE * z

    const anim = useUiStore.getState().movementAnimation
    const now = performance.now()

    // Read ships and missiles fresh from the store — avoids stale-closure race where
    // startMovementAnimation (uiStore) fires before the battleStore set() that moves
    // the tokens, causing lerpHex(pre, pre, t) → no visible movement.
    const { ships: liveShips, missiles: liveMissiles } = useBattleStore.getState()

    // --- Layer 2: Range band rings (selected ship, non-targeting mode) ---
    if (selectedShipId && !thrustTargeting) {
      const sel = liveShips.find((s) => s.id === selectedShipId)
      if (sel) drawRangeBandRings(ctx, sel, size, ox, oy)
    }

    // --- Layer 3: Ghost positions — only during acceleration (thrust preview) ---
    if (phase === 'acceleration') {
      for (const ship of liveShips) {
        if (ship.isDestroyed) continue
        if (ship.inDogfight !== null) continue
        // Skip default ghost for the ship in targeting mode — drawThrustTargeting draws its own
        if (thrustTargeting?.shipId === ship.id) continue
        const next = hexAdd(ship.position, ship.vector)
        const { x: gx, y: gy } = hexToPixel(next.q, next.r, size, ox, oy)
        drawGhostToken(ctx, ship, gx, gy)
      }
    }

    // --- Layer 3b: Thrust targeting overlay ---
    if (thrustTargeting && phase === 'acceleration') {
      const targetingShip = liveShips.find((s) => s.id === thrustTargeting.shipId)
      if (targetingShip && targetingShip.inDogfight === null) {
        drawThrustTargeting(ctx, targetingShip, mouseHexRef.current, size, ox, oy)
      }
    }

    // --- Layer 4: Vector arrows — skip for dogfight/destroyed ships ---
    for (const ship of liveShips) {
      if (ship.isDestroyed) continue
      if (ship.inDogfight !== null) continue
      const { x: cx, y: cy } = hexToPixel(ship.position.q, ship.position.r, size, ox, oy)
      drawVectorArrow(ctx, ship, cx, cy, size)
    }

    // --- Layer 5: Missile tokens ---
    for (const missile of liveMissiles) {
      let renderPos = missile.position
      if (anim?.startPositions[missile.id]) {
        const t = easeInOut(Math.min(1, (now - anim.startTime) / anim.duration))
        renderPos = lerpHex(anim.startPositions[missile.id], missile.position, t)
      }
      const { x: cx, y: cy } = hexToPixel(renderPos.q, renderPos.r, size, ox, oy)
      drawMissileToken(ctx, missile, cx, cy)
    }

    // --- Layer 6 + 7: Ship tokens + labels ---
    for (const ship of liveShips) {
      let renderPos = ship.position
      if (anim?.startPositions[ship.id]) {
        const t = easeInOut(Math.min(1, (now - anim.startTime) / anim.duration))
        renderPos = lerpHex(anim.startPositions[ship.id], ship.position, t)
      }
      const { x: cx, y: cy } = hexToPixel(renderPos.q, renderPos.r, size, ox, oy)
      drawShipToken(ctx, ship, cx, cy, ship.id === selectedShipId, timestampRef.current)
      drawShipLabel(ctx, ship, cx, cy)
    }

    // Clear animation state once complete
    if (anim && (now - anim.startTime) >= anim.duration) {
      useUiStore.getState().clearMovementAnimation()
    }
  }, [canvasRef, ships, missiles, selectedShipId, offset, zoom, timestampRef, thrustTargeting, mouseHexRef])

  // Render on state changes
  useEffect(() => {
    render()
  }, [render])

  // Render on pan/zoom (dispatched via custom event from useMapInteraction)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = () => render()
    canvas.addEventListener('map:redraw', handler)
    return () => canvas.removeEventListener('map:redraw', handler)
  }, [canvasRef, render])

  // Resize observer — redraw when canvas dimensions change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      render()
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [canvasRef, render])

  // rAF animation loop — active during dogfight pulse or movement animation
  useEffect(() => {
    if (!hasActiveDogfight && !movementAnimation) return
    let frameId
    const loop = (ts) => {
      timestampRef.current = ts
      render()
      frameId = requestAnimationFrame(loop)
    }
    frameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameId)
  }, [render, hasActiveDogfight, movementAnimation, timestampRef])
}

export { HEX_SIZE }
