/**
 * Pure Canvas 2D draw functions for ship tokens and missile tokens.
 * No React, no store access — receive only the data they draw.
 * All functions receive a CanvasRenderingContext2D as first argument.
 * // Spec §9.2 — Token rendering
 */

import { hexToPixel, hexMagnitude } from '../../utils/hex.js'
import { getShapeTracer, getDetailDrawer } from './shipTokenShapes.js'

// === CONSTANTS ===


const TOKEN_RADIUS = 18
const VECTOR_ARROW_HEAD = 7
const HP_BAR_RADIUS = TOKEN_RADIUS + 5
const LABEL_FONT = 'bold 11px monospace'
const GHOST_ALPHA = 0.35
const MISSILE_RADIUS = 11

// === HELPERS ===

/**
 * Compute canvas rotation angle so a ship token faces its velocity direction.
 * Nose of the shape points up (-y) at rotation 0; adding π/2 aligns it with
 * the atan2 angle convention used by canvas (0 = right, +CW).
 * Returns 0 (pointing up) when vector is stationary.
 * @param {{ q: number, r: number }} vector
 * @returns {number} Radians
 */
function computeShipRotation(vector) {
  if (vector.q === 0 && vector.r === 0) return 0
  // Flat-top hex pixel direction (proportional; no size/offset needed)
  const vx = 1.5 * vector.q
  const vy = Math.sqrt(3) * (0.5 * vector.q + vector.r)
  return Math.atan2(vy, vx) + Math.PI / 2
}


/**
 * Draw an arrowhead at (x, y) pointing in direction (dx, dy).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} dx  Normalized direction x
 * @param {number} dy  Normalized direction y
 * @param {number} size
 */
function drawArrowhead(ctx, x, y, dx, dy, size) {
  const px = -dy
  const py = dx
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x - dx * size + px * size * 0.5, y - dy * size + py * size * 0.5)
  ctx.lineTo(x - dx * size - px * size * 0.5, y - dy * size - py * size * 0.5)
  ctx.closePath()
  ctx.fill()
}

/**
 * Convert a hex vector to pixel direction and magnitude for arrow rendering.
 * @param {{ q: number, r: number }} vector
 * @param {number} hexSize  Hex radius in pixels
 * @returns {{ dx: number, dy: number, len: number }}
 */
function vectorToPixelDirection(vector, hexSize) {
  const end = hexToPixel(vector.q, vector.r, hexSize)
  const len = Math.sqrt(end.x * end.x + end.y * end.y)
  if (len === 0) return { dx: 0, dy: 0, len: 0 }
  return { dx: end.x / len, dy: end.y / len, len }
}

// === SHIP TOKEN ===

/**
 * Draw a ship token at its pixel center.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} ship       ShipInstance
 * @param {number} cx         Pixel center X
 * @param {number} cy         Pixel center Y
 * @param {boolean} selected  Whether this ship is currently selected
 * @param {number} [timestamp=0]  rAF timestamp in ms — drives dogfight pulse animation
 */
export function drawShipToken(ctx, ship, cx, cy, selected, timestamp = 0) {
  const { color, profile, hullCurrent, isDestroyed } = ship
  const hullFraction = profile.hull > 0 ? hullCurrent / profile.hull : 0
  const inDogfight   = ship.inDogfight !== null && ship.inDogfight !== undefined
  const rotation     = computeShipRotation(ship.vector)

  if (isDestroyed) {
    ctx.save()
    ctx.globalAlpha = 0.35
  }

  // Dogfight pulsing ring — circular, drawn before selection ring
  if (inDogfight) {
    // Oscillates between alpha 0.4 and 1.0 at ~0.67 Hz (≈1.5 s per cycle)
    const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(timestamp * 0.0042))
    ctx.beginPath()
    ctx.arc(cx, cy, TOKEN_RADIUS + 7, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(251, 191, 36, ${pulse})`   // amber-400
    ctx.lineWidth = 2.5
    ctx.stroke()
  }

  // Selection ring — circular
  if (selected) {
    ctx.beginPath()
    ctx.arc(cx, cy, TOKEN_RADIUS + 4, 0, Math.PI * 2)
    ctx.strokeStyle = '#7dd3fc'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 3])
    ctx.stroke()
    ctx.setLineDash([])
  }

  // HP arc — circular (green→yellow→red)
  const hpColor = hullFraction > 0.6 ? '#4ade80' : hullFraction > 0.3 ? '#facc15' : '#f87171'
  const hpAngle = Math.PI * 2 * hullFraction
  ctx.beginPath()
  ctx.arc(cx, cy, HP_BAR_RADIUS, -Math.PI / 2, -Math.PI / 2 + hpAngle)
  ctx.strokeStyle = hpColor
  ctx.lineWidth = 3
  ctx.stroke()

  // Ship body — rotated to face velocity direction
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotation)

  const shape = ship.profile.tokenShape ?? 'delta'
  getShapeTracer(shape)(ctx, TOKEN_RADIUS)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 1
  ctx.stroke()

  getDetailDrawer(shape)?.(ctx, TOKEN_RADIUS)

  ctx.restore()

  // Dogfight ⚔ badge — fixed canvas-space position (top-right)
  if (inDogfight) {
    ctx.font = 'bold 22px monospace'
    ctx.fillStyle = '#fbbf24'   // amber-400
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⚔', cx + TOKEN_RADIUS * 0.75, cy - TOKEN_RADIUS * 0.75)
  }

  if (isDestroyed) {
    ctx.restore()
    // ☠ badge — drawn at full opacity outside the semi-transparent save block
    ctx.font = 'bold 18px monospace'
    ctx.fillStyle = '#f87171'   // red-400
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('☠', cx + TOKEN_RADIUS * 0.75, cy - TOKEN_RADIUS * 0.75)
  }
}

/**
 * Draw the ship's name label below its token.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} ship
 * @param {number} cx
 * @param {number} cy
 */
export function drawShipLabel(ctx, ship, cx, cy) {
  const label = `${ship.profile.name}  ${ship.hullCurrent}/${ship.profile.hull}`
  ctx.font = LABEL_FONT
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(label, cx, cy + TOKEN_RADIUS + HP_BAR_RADIUS - TOKEN_RADIUS + 4)
}

/**
 * Draw the velocity vector arrow from the ship's center.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} ship
 * @param {number} cx
 * @param {number} cy
 * @param {number} hexSize
 */
export function drawVectorArrow(ctx, ship, cx, cy, hexSize) {
  const mag = hexMagnitude(ship.vector)
  if (mag === 0) return

  const { dx, dy, len } = vectorToPixelDirection(ship.vector, hexSize)
  const arrowLen = Math.min(len * 0.6, hexSize * mag * 0.8)
  const ex = cx + dx * arrowLen
  const ey = cy + dy * arrowLen

  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(ex, ey)
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.8)'
  ctx.lineWidth = 2
  ctx.setLineDash([4, 2])
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = 'rgba(125, 211, 252, 0.8)'
  drawArrowhead(ctx, ex, ey, dx, dy, VECTOR_ARROW_HEAD)
}

/**
 * Draw a ghost (semi-transparent) token at the predicted next position.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} ship
 * @param {number} cx  Ghost pixel center X
 * @param {number} cy  Ghost pixel center Y
 */
export function drawGhostToken(ctx, ship, cx, cy) {
  const rotation = computeShipRotation(ship.vector)
  ctx.save()
  ctx.globalAlpha = GHOST_ALPHA
  ctx.translate(cx, cy)
  ctx.rotate(rotation)
  getShapeTracer(ship.profile.tokenShape ?? 'delta')(ctx, TOKEN_RADIUS)
  ctx.fillStyle = ship.color
  ctx.fill()
  ctx.strokeStyle = '#7dd3fc'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  ctx.stroke()
  ctx.restore()
}

// === MISSILE TOKEN ===

/**
 * Trace a single missile silhouette at offset (ox, oy) from (cx, cy).
 * Nose points up (-y). Slim body (r=0.9px) with rounded nose via arc.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx  Token center X
 * @param {number} cy  Token center Y
 * @param {number} ox  Horizontal offset
 * @param {number} oy  Vertical offset
 */
function traceMissileShape(ctx, cx, cy, ox, oy) {
  const x = cx + ox, y = cy + oy
  const r = 0.9   // body half-width = nose radius
  ctx.beginPath()
  ctx.moveTo(x - r, y + 4.5)         // left tail
  ctx.lineTo(x - r, y - 3)           // left body up
  ctx.arc(x, y - 3, r, Math.PI, 0)   // rounded nose (clockwise = curves upward)
  ctx.lineTo(x + r, y + 4.5)         // right body down
  ctx.closePath()
}

/**
 * Draw a missile salvo token — three staggered missile silhouettes.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} missile  MissileToken
 * @param {number} cx
 * @param {number} cy
 */
export function drawMissileToken(ctx, missile, cx, cy) {
  const OFFSETS = [[-3, 1.5], [0, -1.5], [3, 1.5]]
  const rotation = computeShipRotation(missile.vector)

  // Silhouettes — rotated to face velocity direction (same convention as ship token)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotation)
  ctx.fillStyle = '#fbbf24'
  OFFSETS.forEach(([ox, oy]) => { traceMissileShape(ctx, 0, 0, ox, oy); ctx.fill() })
  ctx.strokeStyle = '#92400e'
  ctx.lineWidth = 0.8
  OFFSETS.forEach(([ox, oy]) => { traceMissileShape(ctx, 0, 0, ox, oy); ctx.stroke() })
  ctx.restore()

  // Count label and thrust arc — canvas-space, unrotated (same as ship name label)
  ctx.font = 'bold 7px monospace'
  ctx.fillStyle = '#fbbf24'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(`×${missile.count}`, cx, cy + 6)

  const thrustFraction = missile.thrustRemaining / 10
  ctx.beginPath()
  ctx.arc(cx, cy, MISSILE_RADIUS + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * thrustFraction)
  ctx.strokeStyle = '#7dd3fc'
  ctx.lineWidth = 2
  ctx.stroke()
}
