/**
 * Hook owning the full Canvas render loop.
 * Subscribes to battle/ui store state and redraws on every change.
 * All ctx.draw* calls are centralized here or in tokenRenderers.js.
 * // Spec §9 — Rendering Canvas layer order
 */

import { useEffect, useCallback, useRef } from 'react'
import { hexToPixel, hexAdd } from '../../utils/hex.js'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore } from '../../store/uiStore.js'
import {
  drawShipToken,
  drawShipLabel,
  drawVectorArrow,
  drawGhostToken,
  drawMissileToken,
} from './tokenRenderers.js'

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
 * @param {{
 *   canvasRef: React.RefObject<HTMLCanvasElement>,
 *   offset: React.MutableRefObject<{x:number,y:number}>,
 *   zoom: React.MutableRefObject<number>,
 * }} params
 */
export function useCanvasRenderer({ canvasRef, offset, zoom }) {
  const ships   = useBattleStore((s) => s.ships)
  const missiles = useBattleStore((s) => s.missiles)
  const phase   = useBattleStore((s) => s.phase)
  const selectedShipId = useUiStore((s) => s.selectedShipId)

  /** rAF timestamp in ms — used for dogfight pulse animation. */
  const timestampRef = useRef(0)

  const hasActiveDogfight = ships.some((s) => s.inDogfight !== null)

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

    // --- Layer 3: Ghost positions — only during acceleration (thrust preview) ---
    if (phase === 'acceleration') {
      for (const ship of ships) {
        if (ship.inDogfight !== null) continue
        const next = hexAdd(ship.position, ship.vector)
        const { x: gx, y: gy } = hexToPixel(next.q, next.r, size, ox, oy)
        drawGhostToken(ctx, ship, gx, gy)
      }
    }

    // --- Layer 4: Vector arrows — skip for dogfight ships (no movement during dogfight) ---
    for (const ship of ships) {
      if (ship.inDogfight !== null) continue
      const { x: cx, y: cy } = hexToPixel(ship.position.q, ship.position.r, size, ox, oy)
      drawVectorArrow(ctx, ship, cx, cy, size)
    }

    // --- Layer 5: Missile tokens ---
    for (const missile of missiles) {
      const { x: cx, y: cy } = hexToPixel(missile.position.q, missile.position.r, size, ox, oy)
      drawMissileToken(ctx, missile, cx, cy)
    }

    // --- Layer 6 + 7: Ship tokens + labels ---
    for (const ship of ships) {
      const { x: cx, y: cy } = hexToPixel(ship.position.q, ship.position.r, size, ox, oy)
      drawShipToken(ctx, ship, cx, cy, ship.id === selectedShipId, timestampRef.current)
      drawShipLabel(ctx, ship, cx, cy)
    }
  }, [canvasRef, ships, missiles, selectedShipId, offset, zoom, timestampRef])

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

  // rAF animation loop — active only when ships are in dogfight (drives pulse ring)
  useEffect(() => {
    if (!hasActiveDogfight) return
    let frameId
    const loop = (ts) => {
      timestampRef.current = ts
      render()
      frameId = requestAnimationFrame(loop)
    }
    frameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameId)
  }, [render, hasActiveDogfight, timestampRef])
}

export { HEX_SIZE }
