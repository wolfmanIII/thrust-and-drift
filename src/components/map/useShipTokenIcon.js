/**
 * useShipTokenIcon — draws a static ship-token icon (silhouette + HP arc) onto
 * a small canvas. Reuses the same shape tracers as the tactical map renderer
 * (shipTokenShapes.js) so non-map surfaces — e.g. Basic mode bento cards —
 * stay visually consistent with the map token without duplicating draw logic.
 * No rotation/animation: static, nose-up icon for list contexts.
 */

import { useRef, useEffect } from 'react'
import { getShapeTracer, getDetailDrawer } from './shipTokenShapes.js'

/**
 * @param {object} ship  ShipInstance — needs profile.tokenShape, profile.hull, hullCurrent, color
 * @param {number} [size=28]  Canvas size in CSS px (square)
 * @returns {import('react').RefObject<HTMLCanvasElement>} Ref to attach to a <canvas>
 */
export function useShipTokenIcon(ship, size = 28) {
  const canvasRef = useRef(null)

  const { tokenShape, hull } = ship.profile
  const { hullCurrent, color } = ship

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
    const radius = size * 0.32

    const hullFraction = hull > 0 ? Math.max(0, hullCurrent / hull) : 0
    const hpColor = hullFraction > 0.6 ? '#4ade80' : hullFraction > 0.3 ? '#facc15' : '#f87171'

    ctx.beginPath()
    ctx.arc(cx, cy, radius + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hullFraction)
    ctx.strokeStyle = hpColor
    ctx.lineWidth = 2
    ctx.stroke()

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
  }, [tokenShape, hull, hullCurrent, color, size])

  return canvasRef
}
