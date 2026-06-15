/**
 * Pure Canvas 2D draw functions for one-shot and persistent visual effects.
 * No React, no store access. All functions receive pre-computed pixel coords.
 * Every function saves/restores ctx state to avoid leaking style properties.
 * // Spec §13.4 — Canvas Visual Effects
 */

// Must stay in sync with TOKEN_RADIUS in tokenRenderers.js
const TOKEN_RADIUS  = 18
const MISSILE_RADIUS = 8

/** @param {number} a @param {number} b @param {number} t */
function lerp(a, b, t) { return a + (b - a) * t }

/** Weapon-specific beam colors. */
const LASER_COLORS = {
  'Pulse Laser':   '#7dd3fc',
  'Beam Laser':    '#38bdf8',
  'Particle Beam': '#c084fc',
  'Railgun':       '#fb923c',
}
const LASER_GLOW = {
  'Pulse Laser':   '#0ea5e9',
  'Beam Laser':    '#0284c7',
  'Particle Beam': '#a855f7',
  'Railgun':       '#f97316',
}

// ─── ONE-SHOT EFFECTS ────────────────────────────────────────────────────────

/**
 * Animated beam from attacker to target, fading over duration.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }} fromPx
 * @param {{ x: number, y: number }} toPx
 * @param {string} weaponType
 * @param {number} t  Progress 0→1
 */
export function drawLaserRay(ctx, fromPx, toPx, weaponType, t) {
  const color = LASER_COLORS[weaponType] ?? '#7dd3fc'
  const glow  = LASER_GLOW[weaponType]  ?? '#0ea5e9'
  // Hold full brightness for first 30%, then fade
  const alpha = t < 0.3 ? 1 : Math.pow(1 - (t - 0.3) / 0.7, 1.8)

  ctx.save()

  // Outer glow pass — wide soft halo
  ctx.globalAlpha = alpha * 0.35
  ctx.shadowColor = glow
  ctx.shadowBlur  = lerp(28, 6, t)
  ctx.strokeStyle = glow
  ctx.lineWidth   = lerp(10, 2, t)
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(fromPx.x, fromPx.y)
  ctx.lineTo(toPx.x, toPx.y)
  ctx.stroke()

  // Core beam — bright and sharp
  ctx.globalAlpha = alpha
  ctx.shadowColor = glow
  ctx.shadowBlur  = lerp(16, 4, t)
  ctx.strokeStyle = color
  ctx.lineWidth   = lerp(3.5, 0.8, t)
  ctx.beginPath()
  ctx.moveTo(fromPx.x, fromPx.y)
  ctx.lineTo(toPx.x, toPx.y)
  ctx.stroke()

  // White-hot center line on early frames
  if (t < 0.4) {
    const coreAlpha = (1 - t / 0.4) * alpha
    ctx.globalAlpha = coreAlpha
    ctx.shadowBlur  = 4
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth   = lerp(1.5, 0, t / 0.4)
    ctx.beginPath()
    ctx.moveTo(fromPx.x, fromPx.y)
    ctx.lineTo(toPx.x, toPx.y)
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * Radial spark burst on hit token, expands outward and fades.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {string} color  Ship faction color
 * @param {number} t
 */
export function drawImpactBurst(ctx, cx, cy, color, t) {
  // Peak brightness at t≈0.2, then fade
  const alpha = t < 0.2 ? t / 0.2 : Math.pow(1 - (t - 0.2) / 0.8, 1.5)
  if (alpha <= 0) return

  const r0 = TOKEN_RADIUS + 2
  const r1 = r0 + t * 28

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowColor = color
  ctx.shadowBlur  = lerp(8, 2, t)
  ctx.strokeStyle = color
  ctx.lineWidth   = lerp(2.5, 0.5, t)

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + i * 0.25
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0)
    ctx.lineTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1)
    ctx.stroke()
  }

  // Central flash on early frames
  if (t < 0.25) {
    const flashAlpha = 1 - t / 0.25
    ctx.globalAlpha = flashAlpha * 0.5
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(cx, cy, TOKEN_RADIUS * (1 - t * 2), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * Exhaust plume in the direction opposite to the applied thrust delta.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} thrustDx  Normalized pixel direction of delta-v
 * @param {number} thrustDy
 * @param {string} shipColor
 * @param {number} t
 */
export function drawThrustPlume(ctx, cx, cy, thrustDx, thrustDy, shipColor, t) {
  // Plume flies opposite to thrust
  const pdx = -thrustDx
  const pdy = -thrustDy
  // Perpendicular spread direction (rotate plume dir 90°)
  const perpX = -pdy
  const perpY =  pdx

  const alpha  = Math.pow(1 - t, 1.2)
  if (alpha <= 0) return

  const len    = lerp(0, 40, Math.min(t * 2.5, 1)) * (1 - t * 0.6)
  const spread = lerp(7, 3, t)

  const tipX = cx + pdx * len
  const tipY = cy + pdy * len

  ctx.save()
  ctx.globalAlpha = alpha

  const grad = ctx.createLinearGradient(cx, cy, tipX, tipY)
  grad.addColorStop(0, shipColor)
  grad.addColorStop(0.5, '#fbbf24')
  grad.addColorStop(1,   'rgba(251,191,36,0)')

  ctx.fillStyle  = grad
  ctx.shadowColor = '#f59e0b'
  ctx.shadowBlur  = 10

  ctx.beginPath()
  ctx.moveTo(cx + perpX * spread, cy + perpY * spread)
  ctx.lineTo(tipX, tipY)
  ctx.lineTo(cx - perpX * spread, cy - perpY * spread)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/**
 * Expanding red ring + system label on critical hit token.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {string} system  Damaged system name (e.g. "M-Drive")
 * @param {number} t
 */
export function drawCriticalFlash(ctx, cx, cy, system, t) {
  const alpha = Math.pow(1 - t, 1.2)
  if (alpha <= 0) return

  const radius = lerp(TOKEN_RADIUS + 2, TOKEN_RADIUS + 36, t)
  const width  = lerp(5, 1, t)

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowColor = '#ef4444'
  ctx.shadowBlur  = lerp(20, 4, t)
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth   = width
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.stroke()

  // Inner ring
  ctx.globalAlpha = alpha * 0.4
  ctx.beginPath()
  ctx.arc(cx, cy, lerp(TOKEN_RADIUS - 4, TOKEN_RADIUS + 16, t), 0, Math.PI * 2)
  ctx.stroke()

  // System label — visible only in first third
  if (t < 0.4) {
    const labelAlpha = 1 - t / 0.4
    ctx.globalAlpha = labelAlpha * alpha
    ctx.shadowColor = '#ef4444'
    ctx.shadowBlur  = 6
    ctx.font        = 'bold 10px monospace'
    ctx.fillStyle   = '#fca5a5'
    ctx.textAlign   = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`[CRIT: ${system}]`, cx, cy - TOKEN_RADIUS - 10)
  }
  ctx.restore()
}

/**
 * Fading dashed trail along a missile's movement path.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }} fromPx
 * @param {{ x: number, y: number }} toPx
 * @param {number} t
 */
export function drawMissileTrail(ctx, fromPx, toPx, t) {
  const alpha = Math.pow(1 - t, 1.5) * 0.8

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = '#fb923c'
  ctx.lineWidth   = lerp(2.5, 0.5, t)
  ctx.shadowColor = '#f97316'
  ctx.shadowBlur  = lerp(6, 0, t)
  ctx.setLineDash([4, 3])
  ctx.lineDashOffset = t * 20
  ctx.beginPath()
  ctx.moveTo(fromPx.x, fromPx.y)
  ctx.lineTo(toPx.x, toPx.y)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

/**
 * Scatter-burst of chaff fragments when a sandcaster fires.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} t
 */
export function drawChaff(ctx, cx, cy, t) {
  const alpha = Math.pow(1 - t, 2)
  if (alpha <= 0) return

  ctx.save()
  ctx.globalAlpha = alpha

  // 24 fragments scattered at pseudo-random angles (deterministic via index)
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2 + i * 0.4
    const radFactor = (((i * 7 + 3) % 13) / 13) * 0.5 + 0.5
    const r = t * 50 * radFactor
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    const size = lerp(2, 0.5, t)

    ctx.fillStyle = i % 3 === 0 ? '#cbd5e1' : '#94a3b8'
    ctx.beginPath()
    ctx.rect(x - size / 2, y - size / 2, size, size)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * Expanding burst + radiating sparks at the launching ship token on missile launch.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} t
 */
export function drawMissileLaunch(ctx, cx, cy, t) {
  const alpha = Math.pow(1 - t, 1.4)
  if (alpha <= 0) return

  ctx.save()
  ctx.globalAlpha = alpha

  // Expanding ring
  ctx.shadowColor = '#f97316'
  ctx.shadowBlur  = lerp(16, 2, t)
  ctx.strokeStyle = '#fb923c'
  ctx.lineWidth   = lerp(3, 0.5, t)
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.arc(cx, cy, lerp(TOKEN_RADIUS, TOKEN_RADIUS + 42, t), 0, Math.PI * 2)
  ctx.stroke()

  // 6 spark trails radiating outward
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    const r0 = lerp(TOKEN_RADIUS, TOKEN_RADIUS + 22, Math.min(t * 2.2, 1))
    const r1 = r0 + lerp(12, 3, t)
    ctx.strokeStyle = i % 2 === 0 ? '#fbbf24' : '#fb923c'
    ctx.lineWidth   = lerp(2, 0.5, t)
    ctx.shadowBlur  = lerp(8, 0, t)
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0)
    ctx.lineTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1)
    ctx.stroke()
  }

  // Central flash on early frames
  if (t < 0.3) {
    ctx.globalAlpha = (1 - t / 0.3) * 0.4
    ctx.fillStyle   = '#fbbf24'
    ctx.beginPath()
    ctx.arc(cx, cy, TOKEN_RADIUS * (1 - t * 0.8), 0, Math.PI * 2)
    ctx.fill()
  }

  // "LAUNCH" label, fades in first half
  if (t < 0.45) {
    ctx.globalAlpha    = (1 - t / 0.45) * alpha
    ctx.shadowColor    = '#f97316'
    ctx.shadowBlur     = 8
    ctx.font           = 'bold 10px monospace'
    ctx.fillStyle      = '#fed7aa'
    ctx.textAlign      = 'center'
    ctx.textBaseline   = 'bottom'
    ctx.fillText('LAUNCH', cx, cy - TOKEN_RADIUS - 8)
  }

  ctx.restore()
}

/**
 * Ship destruction — white flash, double shockwave ring, debris scatter, DESTROYED label.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} t
 */
export function drawShipDestroyed(ctx, cx, cy, t) {
  if (t >= 1) return

  ctx.save()

  // White flash (first 15%)
  if (t < 0.15) {
    const ft = t / 0.15
    ctx.globalAlpha = (1 - ft) * 0.9
    ctx.fillStyle   = '#ffffff'
    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur  = 30
    ctx.beginPath()
    ctx.arc(cx, cy, lerp(TOKEN_RADIUS, TOKEN_RADIUS * 2.8, ft), 0, Math.PI * 2)
    ctx.fill()
  }

  // Primary shockwave ring
  const r1    = lerp(TOKEN_RADIUS + 2, TOKEN_RADIUS + 90, t)
  const alpha1 = Math.pow(1 - t, 1.2)
  ctx.globalAlpha = alpha1
  ctx.shadowColor = '#f97316'
  ctx.shadowBlur  = lerp(28, 4, t)
  ctx.strokeStyle = '#fb923c'
  ctx.lineWidth   = lerp(5, 0.5, t)
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.arc(cx, cy, r1, 0, Math.PI * 2)
  ctx.stroke()

  // Secondary ring — starts at t=0.12, faster fade
  if (t > 0.12) {
    const t2     = (t - 0.12) / 0.88
    const r2     = lerp(TOKEN_RADIUS + 2, TOKEN_RADIUS + 56, t2)
    const alpha2 = Math.pow(1 - t2, 2) * 0.7
    ctx.globalAlpha = alpha2
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth   = lerp(3, 0.5, t2)
    ctx.shadowColor = '#f59e0b'
    ctx.shadowBlur  = lerp(14, 2, t2)
    ctx.beginPath()
    ctx.arc(cx, cy, r2, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Debris particles — 14 fragments
  const debrisAlpha = Math.pow(1 - t, 1.4)
  ctx.shadowBlur = 4
  for (let i = 0; i < 14; i++) {
    const angle     = (i / 14) * Math.PI * 2 + i * 0.35
    const radFactor = (((i * 5 + 2) % 7) / 7) * 0.55 + 0.45
    const r         = t * 75 * radFactor
    const size      = lerp(3, 0.3, t)
    const col       = i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#fb923c' : '#ef4444'
    ctx.globalAlpha = debrisAlpha
    ctx.fillStyle   = col
    ctx.shadowColor = col
    ctx.beginPath()
    ctx.rect(cx + Math.cos(angle) * r - size / 2, cy + Math.sin(angle) * r - size / 2, size, size)
    ctx.fill()
  }

  // "DESTROYED" label — visible first 40%
  if (t < 0.4) {
    ctx.globalAlpha  = (1 - t / 0.4) * Math.pow(1 - t, 1.2)
    ctx.shadowColor  = '#ef4444'
    ctx.shadowBlur   = 8
    ctx.font         = 'bold 11px monospace'
    ctx.fillStyle    = '#fca5a5'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('DESTROYED', cx, cy - TOKEN_RADIUS - 12)
  }

  ctx.restore()
}

// ─── PERSISTENT EFFECTS ──────────────────────────────────────────────────────

/**
 * Animated dashed cyan line from attacker to sensor-locked target,
 * with a pulsing ring around the target token.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }} fromPx
 * @param {{ x: number, y: number }} toPx
 * @param {number} timestamp  rAF timestamp (ms)
 */
export function drawSensorLockRing(ctx, fromPx, toPx, timestamp) {
  const dashOffset = (timestamp / 35) % 9

  ctx.save()
  ctx.strokeStyle  = '#22d3ee'
  ctx.lineWidth    = 1.5
  ctx.globalAlpha  = 0.65
  ctx.shadowColor  = '#22d3ee'
  ctx.shadowBlur   = 4
  ctx.setLineDash([5, 4])
  ctx.lineDashOffset = -dashOffset
  ctx.beginPath()
  ctx.moveTo(fromPx.x, fromPx.y)
  ctx.lineTo(toPx.x, toPx.y)
  ctx.stroke()
  ctx.setLineDash([])

  // Pulsing ring around target
  const pulse = Math.sin(timestamp / 320) * 0.2 + 0.8
  ctx.globalAlpha  = pulse * 0.75
  ctx.shadowBlur   = 6
  ctx.setLineDash([3, 2])
  ctx.beginPath()
  ctx.arc(toPx.x, toPx.y, TOKEN_RADIUS + 9, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

/**
 * Pulsing yellow glow around a ship token declaring evasive action.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} timestamp
 */
export function drawEvasiveAura(ctx, cx, cy, timestamp) {
  const pulse = Math.sin(timestamp / 260) * 0.3 + 0.7

  ctx.save()
  ctx.shadowColor = '#facc15'
  ctx.shadowBlur  = 18 * pulse
  ctx.strokeStyle = `rgba(250,204,21,${0.55 * pulse})`
  ctx.lineWidth   = 2.5
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.arc(cx, cy, TOKEN_RADIUS + 7, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

/**
 * Greyed-out overlay on a missile token with zero thrust remaining.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 */
export function drawMissileExhausted(ctx, cx, cy) {
  ctx.save()
  ctx.globalAlpha = 0.6
  ctx.fillStyle   = '#334155'
  ctx.beginPath()
  ctx.arc(cx, cy, MISSILE_RADIUS + 1, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalAlpha = 0.5
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth   = 1.5
  ctx.setLineDash([2, 2])
  ctx.beginPath()
  ctx.arc(cx, cy, MISSILE_RADIUS + 4, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

/**
 * Pulsing "DOGFIGHT" alert above ships sharing the same hex cell.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} timestamp
 */
export function drawDogfightAlert(ctx, cx, cy, timestamp) {
  const pulse = Math.sin(timestamp / 190) * 0.35 + 0.65

  ctx.save()
  ctx.globalAlpha  = pulse
  ctx.shadowColor  = '#f97316'
  ctx.shadowBlur   = 10
  ctx.font         = 'bold 11px monospace'
  ctx.fillStyle    = '#fdba74'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText('DOGFIGHT', cx, cy - TOKEN_RADIUS - 22)

  // Connecting circle around both tokens
  ctx.globalAlpha  = pulse * 0.3
  ctx.strokeStyle  = '#f97316'
  ctx.lineWidth    = 1.5
  ctx.setLineDash([4, 3])
  ctx.beginPath()
  ctx.arc(cx, cy, TOKEN_RADIUS + 14, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}
