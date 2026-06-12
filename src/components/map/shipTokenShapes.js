/**
 * tokenShapes.js — Ship token silhouette tracers for Thrust & Drift.
 *
 * Each function traces a closed path in LOCAL coordinates:
 *   - nose pointing UP (−y), centered at origin
 *   - does NOT fill or stroke — call those after
 *   - `size` is TOKEN_RADIUS (same unit as tokenRenderers.js)
 *
 * Usage in tokenRenderers.js:
 *
 *   import { getShapeTracer } from './tokenShapes.js'
 *
 *   // inside drawShipToken, replace the traceShipBody(ctx) call with:
 *   const tracer = getShapeTracer(ship.profile.tokenShape ?? 'delta')
 *   tracer(ctx, TOKEN_RADIUS)
 *
 * Spec §9.2 — Token rendering (shape extension)
 */

// ─── DELTA WING ───────────────────────────────────────────────────────────────
// The canonical shape from tokenRenderers.js — fighter, corsair, free trader.
// Narrow nose, swept delta wings with protruding tip "guns", twin engine pods.
/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} size  TOKEN_RADIUS
 */
export function traceShipBodyDelta(ctx, size) {
  ctx.beginPath()

  ctx.moveTo(0,            -size)          // nose tip

  ctx.lineTo( size * 0.15, -size * 0.7)   // right nose edge
  ctx.lineTo( size * 0.3,  -size * 0.1)   // right wing root
  ctx.lineTo( size * 0.8,   size * 0.4)   // right wing leading edge
  ctx.lineTo( size * 0.85,  size * 0.8)   // right wing tip (gun mount)
  ctx.lineTo( size * 0.6,   size * 0.9)   // right wing trailing base
  ctx.lineTo( size * 0.3,   size * 0.5)   // right inner notch
  ctx.lineTo( size * 0.25,  size * 0.95)  // right engine pod

  ctx.lineTo(0,             size * 0.85)  // central exhaust

  ctx.lineTo(-size * 0.25,  size * 0.95)  // left engine pod
  ctx.lineTo(-size * 0.3,   size * 0.5)   // left inner notch
  ctx.lineTo(-size * 0.6,   size * 0.9)   // left wing trailing base
  ctx.lineTo(-size * 0.85,  size * 0.8)   // left wing tip (gun mount)
  ctx.lineTo(-size * 0.8,   size * 0.4)   // left wing leading edge
  ctx.lineTo(-size * 0.3,  -size * 0.1)   // left wing root
  ctx.lineTo(-size * 0.15, -size * 0.7)   // left nose edge

  ctx.closePath()
}

// ─── NEEDLE ──────────────────────────────────────────────────────────────────
// Long, narrow dart — scout, courier, fast patrol vessel.
// Short swept wings, dominant slim fuselage, prominent engine nozzles.
/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} size
 */
export function traceShipBodyNeedle(ctx, size) {
  ctx.beginPath()

  ctx.moveTo(0,            -size)          // needle nose tip

  ctx.lineTo( size * 0.08, -size * 0.65)
  ctx.lineTo( size * 0.2,  -size * 0.2)
  ctx.lineTo( size * 0.55,  size * 0.25)  // short swept wing
  ctx.lineTo( size * 0.5,   size * 0.55)
  ctx.lineTo( size * 0.22,  size * 0.42)
  ctx.lineTo( size * 0.18,  size * 0.95)  // starboard engine nozzle

  ctx.lineTo(0,             size * 0.88)  // central exhaust notch

  ctx.lineTo(-size * 0.18,  size * 0.95)  // port engine nozzle
  ctx.lineTo(-size * 0.22,  size * 0.42)
  ctx.lineTo(-size * 0.5,   size * 0.55)
  ctx.lineTo(-size * 0.55,  size * 0.25)  // port swept wing
  ctx.lineTo(-size * 0.2,  -size * 0.2)
  ctx.lineTo(-size * 0.08, -size * 0.65)

  ctx.closePath()
}

// ─── FREIGHTER ────────────────────────────────────────────────────────────────
// Wide, boxy cargo hull — far trader, merchant, bulk hauler.
// High beam, flat sides, separated engine pods at stern.
/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} size
 */
export function traceShipBodyFreighter(ctx, size) {
  ctx.beginPath()

  ctx.moveTo(0,            -size)          // prow

  ctx.lineTo( size * 0.22, -size * 0.75)
  ctx.lineTo( size * 0.55, -size * 0.55)  // forward cargo shoulder
  ctx.lineTo( size * 0.9,  -size * 0.1)   // wide beam
  ctx.lineTo( size * 0.9,   size * 0.35)  // flat side
  ctx.lineTo( size * 0.65,  size * 0.6)
  ctx.lineTo( size * 0.4,   size * 0.95)  // starboard engine pod
  ctx.lineTo( size * 0.18,  size * 0.82)
  ctx.lineTo(0,             size * 0.7)   // central stern

  ctx.lineTo(-size * 0.18,  size * 0.82)
  ctx.lineTo(-size * 0.4,   size * 0.95)  // port engine pod
  ctx.lineTo(-size * 0.65,  size * 0.6)
  ctx.lineTo(-size * 0.9,   size * 0.35)
  ctx.lineTo(-size * 0.9,  -size * 0.1)
  ctx.lineTo(-size * 0.55, -size * 0.55)
  ctx.lineTo(-size * 0.22, -size * 0.75)

  ctx.closePath()
}

// ─── GUNSHIP ─────────────────────────────────────────────────────────────────
// Blunt medium warship — escort, patrol cruiser.
// Heavy forward profile, protruding weapon sponsons amidships.
/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} size
 */
export function traceShipBodyGunship(ctx, size) {
  ctx.beginPath()

  ctx.moveTo(0,            -size)

  ctx.lineTo( size * 0.28, -size * 0.72)
  ctx.lineTo( size * 0.55, -size * 0.45)
  ctx.lineTo( size * 0.85, -size * 0.05)  // sponson start
  ctx.lineTo( size * 0.95,  size * 0.18)  // weapon sponson tip
  ctx.lineTo( size * 0.75,  size * 0.35)  // sponson base
  ctx.lineTo( size * 0.65,  size * 0.75)
  ctx.lineTo( size * 0.35,  size * 0.9)
  ctx.lineTo(0,             size * 0.78)  // central exhaust

  ctx.lineTo(-size * 0.35,  size * 0.9)
  ctx.lineTo(-size * 0.65,  size * 0.75)
  ctx.lineTo(-size * 0.75,  size * 0.35)
  ctx.lineTo(-size * 0.95,  size * 0.18)
  ctx.lineTo(-size * 0.85, -size * 0.05)
  ctx.lineTo(-size * 0.55, -size * 0.45)
  ctx.lineTo(-size * 0.28, -size * 0.72)

  ctx.closePath()
}

// ─── CRUISER ─────────────────────────────────────────────────────────────────
// Elongated capital-class hull — heavy cruiser, subsidised liner.
// Long central body, prominent side nacelles/engine pods.
/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} size
 */
export function traceShipBodyCruiser(ctx, size) {
  ctx.beginPath()

  ctx.moveTo(0,            -size)          // prow

  ctx.lineTo( size * 0.12, -size * 0.8)
  ctx.lineTo( size * 0.18, -size * 0.4)   // neck
  ctx.lineTo( size * 0.55, -size * 0.35)  // starboard nacelle forward
  ctx.lineTo( size * 0.7,  -size * 0.05)
  ctx.lineTo( size * 0.55,  size * 0.3)   // nacelle aft
  ctx.lineTo( size * 0.18,  size * 0.25)
  ctx.lineTo( size * 0.22,  size * 0.75)  // engine cluster
  ctx.lineTo( size * 0.1,   size * 0.95)
  ctx.lineTo(0,             size * 0.82)  // central exhaust

  ctx.lineTo(-size * 0.1,   size * 0.95)
  ctx.lineTo(-size * 0.22,  size * 0.75)
  ctx.lineTo(-size * 0.18,  size * 0.25)
  ctx.lineTo(-size * 0.55,  size * 0.3)
  ctx.lineTo(-size * 0.7,  -size * 0.05)
  ctx.lineTo(-size * 0.55, -size * 0.35)
  ctx.lineTo(-size * 0.18, -size * 0.4)
  ctx.lineTo(-size * 0.12, -size * 0.8)

  ctx.closePath()
}

// ─── CAPITAL SHIP ─────────────────────────────────────────────────────────────
// Massive dreadnought / battleship — maximum tonnage.
// Long needle prow, then dramatic beam expansion, forward + aft weapon battery
// protrusions, command tower blister at midship, triple engine pods at stern.
// NOTE: this tracer is paired with extra draw steps (command tower, bridge
// windows, engine glow) that must be added after filling — see drawShipToken.
/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} size
 */
export function traceShipBodyCapital(ctx, size) {
  ctx.beginPath()

  ctx.moveTo(0,             -size)          // needle prow tip

  ctx.lineTo( size * 0.08,  -size * 0.82)
  ctx.lineTo( size * 0.12,  -size * 0.55)  // narrow neck
  ctx.lineTo( size * 0.28,  -size * 0.48)  // shoulder — widens fast
  ctx.lineTo( size * 0.72,  -size * 0.22)  // forward battery platform
  ctx.lineTo( size * 0.92,   size * 0.02)  // max beam — forward sponson tip
  ctx.lineTo( size * 0.88,   size * 0.22)  // sponson trailing edge
  ctx.lineTo( size * 0.62,   size * 0.3)   // hull return
  ctx.lineTo( size * 0.55,   size * 0.55)  // mid battery blister start
  ctx.lineTo( size * 0.72,   size * 0.68)  // aft battery protrusion
  ctx.lineTo( size * 0.65,   size * 0.84)
  ctx.lineTo( size * 0.38,   size * 0.78)
  ctx.lineTo( size * 0.28,   size * 0.95)  // starboard engine pod outer
  ctx.lineTo( size * 0.15,   size * 0.88)
  ctx.lineTo(0,              size * 0.76)  // central exhaust

  ctx.lineTo(-size * 0.15,   size * 0.88)
  ctx.lineTo(-size * 0.28,   size * 0.95)  // port engine pod outer
  ctx.lineTo(-size * 0.38,   size * 0.78)
  ctx.lineTo(-size * 0.65,   size * 0.84)
  ctx.lineTo(-size * 0.72,   size * 0.68)
  ctx.lineTo(-size * 0.55,   size * 0.55)
  ctx.lineTo(-size * 0.62,   size * 0.3)
  ctx.lineTo(-size * 0.88,   size * 0.22)
  ctx.lineTo(-size * 0.92,   size * 0.02)
  ctx.lineTo(-size * 0.72,  -size * 0.22)
  ctx.lineTo(-size * 0.28,  -size * 0.48)
  ctx.lineTo(-size * 0.12,  -size * 0.55)
  ctx.lineTo(-size * 0.08,  -size * 0.82)

  ctx.closePath()
}

/**
 * Extra draw steps for the Capital Ship token — call AFTER filling the body,
 * while the canvas transform is still ctx.save()/translate/rotate'd to (cx,cy).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} size  TOKEN_RADIUS
 */
export function drawCapitalShipDetail(ctx, size) {
  // Command tower blister — oval raised section at midship
  ctx.beginPath()
  ctx.ellipse(0, -size * 0.18, size * 0.14, size * 0.09, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Bridge windows — row of 5 lit portholes
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath()
    ctx.rect(i * size * 0.045 - size * 0.015, -size * 0.22, size * 0.03, size * 0.05)
    ctx.fillStyle = 'rgba(125,211,252,0.65)'
    ctx.fill()
  }
}

// ─── TOKEN DETAILS ────────────────────────────────────────────────────────────
// Per-shape overlay drawn AFTER fill+stroke, while transform is still active.
// Each function receives the same (ctx, size) contract as the tracers.

/** Delta — narrow fuselage stripe + cockpit dot near nose. */
export function drawDeltaDetail(ctx, size) {
  ctx.beginPath()
  ctx.moveTo(0,            -size * 0.90)
  ctx.lineTo( size * 0.09, -size * 0.52)
  ctx.lineTo( size * 0.09,  size * 0.50)
  ctx.lineTo(0,             size * 0.68)
  ctx.lineTo(-size * 0.09,  size * 0.50)
  ctx.lineTo(-size * 0.09, -size * 0.52)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(0, -size * 0.62, size * 0.13, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.32)'
  ctx.fill()
}

/** Needle — sensor dot near nose tip + slim spine line. */
export function drawNeedleDetail(ctx, size) {
  ctx.beginPath()
  ctx.moveTo(0, -size * 0.88)
  ctx.lineTo(0,  size * 0.82)
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(0, -size * 0.72, size * 0.10, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fill()
}

/** Freighter — raised bridge tower below the prow with porthole row. */
export function drawFreighterDetail(ctx, size) {
  const bw = size * 0.24
  const bh = size * 0.18
  const by = -size * 0.58
  ctx.beginPath()
  ctx.rect(-bw / 2, by - bh / 2, bw, bh)
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 0.8
  ctx.stroke()

  for (let i = -1; i <= 1; i++) {
    ctx.beginPath()
    ctx.arc(i * size * 0.07, by, size * 0.03, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(125,211,252,0.60)'
    ctx.fill()
  }
}

/** Gunship — armored CIC dome amidships-forward + targeting sensor on top. */
export function drawGunshipDetail(ctx, size) {
  ctx.beginPath()
  ctx.ellipse(0, -size * 0.38, size * 0.18, size * 0.11, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(0, -size * 0.50, size * 0.05, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.30)'
  ctx.fill()
}

/** Cruiser — elongated command bridge on central spine with twin portholes. */
export function drawCruiserDetail(ctx, size) {
  ctx.beginPath()
  ctx.moveTo(0,            -size * 0.78)
  ctx.lineTo( size * 0.06, -size * 0.55)
  ctx.lineTo( size * 0.06,  size * 0.18)
  ctx.lineTo(0,             size * 0.60)
  ctx.lineTo(-size * 0.06,  size * 0.18)
  ctx.lineTo(-size * 0.06, -size * 0.55)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,255,255,0.11)'
  ctx.fill()

  ctx.beginPath()
  ctx.ellipse(0, -size * 0.60, size * 0.09, size * 0.14, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.20)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.32)'
  ctx.lineWidth = 0.8
  ctx.stroke()

  for (let i = -1; i <= 1; i += 2) {
    ctx.beginPath()
    ctx.arc(i * size * 0.04, -size * 0.60, size * 0.025, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(125,211,252,0.55)'
    ctx.fill()
  }
}

/**
 * Map of detail draw functions, keyed by shape.
 * Capital uses drawCapitalShipDetail (already exported above).
 * @type {Record<string, (ctx: CanvasRenderingContext2D, size: number) => void>}
 */
export const SHIP_DETAILS = {
  delta:     drawDeltaDetail,
  needle:    drawNeedleDetail,
  freighter: drawFreighterDetail,
  gunship:   drawGunshipDetail,
  cruiser:   drawCruiserDetail,
  capital:   drawCapitalShipDetail,
}

/**
 * Return the detail drawer for a given shape key, or null if none registered.
 * @param {string} key
 * @returns {((ctx: CanvasRenderingContext2D, size: number) => void) | null}
 */
export function getDetailDrawer(key) {
  return SHIP_DETAILS[key] ?? null
}

// ─── SHAPE MAP ────────────────────────────────────────────────────────────────

/**
 * Registered shape keys — used as `ship.profile.tokenShape`.
 * @type {Record<string, (ctx: CanvasRenderingContext2D, size: number) => void>}
 */
export const SHIP_SHAPES = {
  delta:    traceShipBodyDelta,
  needle:   traceShipBodyNeedle,
  freighter: traceShipBodyFreighter,
  gunship:  traceShipBodyGunship,
  cruiser:  traceShipBodyCruiser,
  capital:  traceShipBodyCapital,
}

/**
 * Return the tracer for a given shape key, falling back to delta.
 * @param {string} key
 * @returns {(ctx: CanvasRenderingContext2D, size: number) => void}
 */
export function getShapeTracer(key) {
  return SHIP_SHAPES[key] ?? traceShipBodyDelta
}
