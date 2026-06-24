/**
 * Canvas draw functions for obstacle tokens.
 * Each obstacle type has distinct fill/stroke; gravity wells include a warning ring.
 * // Obstacles System Design §5.2–5.3
 */

import { hexToPixel, hexDistance } from '../../utils/hex.js'
import { getHexesInRadius } from '../../utils/obstacles.js'

// Per-type visual constants (fill + stroke). // Obstacles System Design §5.2
const FILL = {
  asteroid_field_light: 'rgba(161,138,104,0.18)',
  asteroid_field_dense: 'rgba(161,138,104,0.30)',
  debris_field:         'rgba(100,100,120,0.28)',
  gravity_well:         'rgba(139,92,246,0.20)',
  nebula:               'rgba(56,189,248,0.10)',
}
const STROKE = {
  asteroid_field_light: 'rgba(161,138,104,0.50)',
  asteroid_field_dense: 'rgba(161,138,104,0.70)',
  debris_field:         'rgba(150,150,180,0.60)',
  gravity_well:         'rgba(139,92,246,0.70)',
  nebula:               'rgba(56,189,248,0.30)',
}
const DASH = {
  asteroid_field_light: [4, 3],
  asteroid_field_dense: [4, 3],
  debris_field:         [4, 3],
  gravity_well:         [],       // solid
  nebula:               [4, 3],
}

function obstacleKey(obstacle) {
  if (obstacle.type === 'asteroid_field') {
    return obstacle.density === 'dense' ? 'asteroid_field_dense' : 'asteroid_field_light'
  }
  return obstacle.type
}

/**
 * Trace the outline of a flat-top hex centred at (cx, cy) into the current path.
 */
function traceHexPath(ctx, cx, cy, size) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i
    const px = cx + size * Math.cos(angle)
    const py = cy + size * Math.sin(angle)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

/**
 * Draw a single obstacle zone and, for gravity wells, the warning ring and core token.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} obstacle   ObstacleToken
 * @param {number} size       Scaled hex size in pixels
 * @param {number} ox         Canvas x pan offset
 * @param {number} oy         Canvas y pan offset
 */
export function drawObstacle(ctx, obstacle, size, ox, oy) {
  const key = obstacleKey(obstacle)
  const fill   = FILL[key]
  const stroke = STROKE[key]
  const dash   = DASH[key]

  ctx.save()

  // Fill and outline every hex in the obstacle radius
  const hexes = getHexesInRadius(obstacle.position, obstacle.radius)
  hexes.forEach((hex) => {
    const { x, y } = hexToPixel(hex.q, hex.r, size, ox, oy)
    traceHexPath(ctx, x, y, size)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.setLineDash(dash)
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1.2
    ctx.stroke()
    ctx.setLineDash([])
  })

  if (obstacle.type === 'gravity_well') {
    // Warning ring at radius + 1 (only the outer shell of that ring)
    getHexesInRadius(obstacle.position, obstacle.radius + 1)
      .filter((h) => hexDistance(h, obstacle.position) === obstacle.radius + 1)
      .forEach((hex) => {
        const { x, y } = hexToPixel(hex.q, hex.r, size, ox, oy)
        traceHexPath(ctx, x, y, size)
        ctx.fillStyle = 'rgba(251,146,60,0.10)'
        ctx.fill()
        ctx.setLineDash([3, 3])
        ctx.strokeStyle = 'rgba(251,146,60,0.40)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.setLineDash([])
      })

    // Core token: filled circle at the obstacle's centre hex
    const { x: cx, y: cy } = hexToPixel(obstacle.position.q, obstacle.position.r, size, ox, oy)
    ctx.beginPath()
    ctx.arc(cx, cy, Math.max(8, size * 0.44), 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(139,92,246,0.85)'
    ctx.fill()

    // Label inside the core
    if (obstacle.label) {
      const fs = Math.max(8, Math.round(size * 0.28))
      ctx.font = `bold ${fs}px monospace`
      ctx.fillStyle = 'rgba(245,240,255,0.95)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(obstacle.label.slice(0, 6), cx, cy)
    }
  } else {
    // Type abbreviation always visible at centre hex; label appended if set
    const TYPE_ABBR = {
      asteroid_field: obstacle.density === 'dense' ? 'AST-D' : 'AST',
      debris_field:   'DEB',
      nebula:         'NEB',
    }
    const abbr = TYPE_ABBR[obstacle.type] ?? ''
    const text = obstacle.label ? `${abbr} · ${obstacle.label.slice(0, 8)}` : abbr
    if (text) {
      const { x: cx, y: cy } = hexToPixel(obstacle.position.q, obstacle.position.r, size, ox, oy)
      const fs = Math.max(8, Math.round(size * 0.24))
      ctx.font = `${fs}px monospace`
      ctx.fillStyle = stroke
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, cx, cy)
    }
  }

  ctx.restore()
}

/**
 * Draw all obstacles in the layer pass.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object[]} obstacles  ObstacleToken[]
 * @param {number} size
 * @param {number} ox
 * @param {number} oy
 */
export function drawObstacleLayer(ctx, obstacles, size, ox, oy) {
  obstacles.forEach((o) => drawObstacle(ctx, o, size, ox, oy))
}
