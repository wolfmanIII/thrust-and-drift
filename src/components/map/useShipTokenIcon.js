/**
 * useShipTokenIcon — draws a static ship-token silhouette onto a small canvas.
 * Reuses the same shape tracers as the tactical map renderer
 * (shipTokenShapes.js) so non-map surfaces — e.g. Basic mode bento cards —
 * stay visually consistent with the map token without duplicating draw logic.
 * No rotation/animation, no HP arc (hull state is shown by the card's own
 * HP bar): static, nose-up shape only.
 */

import { useRef, useEffect } from 'react'
import { getShapeTracer, getDetailDrawer } from './shipTokenShapes.js'

/**
 * @param {object} ship  ShipInstance — needs profile.tokenShape, color
 * @param {number} [size=28]  Canvas size in CSS px (square)
 * @returns {import('react').RefObject<HTMLCanvasElement>} Ref to attach to a <canvas>
 */
export function useShipTokenIcon(ship, size = 28) {
  const canvasRef = useRef(null)

  const { tokenShape } = ship.profile
  const { color } = ship

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width  = size * dpr
    canvas.height = size * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size, size)

    const cx     = size / 2
    const cy     = size / 2
    const radius = size * 0.42

    ctx.save()
    ctx.translate(cx, cy)
    const shape = tokenShape ?? 'delta'
    getShapeTracer(shape)(ctx, radius)
    ctx.fillStyle = color ?? '#64748b'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    ctx.stroke()
    getDetailDrawer(shape)?.(ctx, radius)
    ctx.restore()
  }, [tokenShape, color, size])

  return canvasRef
}
