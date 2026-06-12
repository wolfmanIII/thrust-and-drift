/**
 * Hex grid math — flat-top, axial coordinates (q, r).
 * Cube coordinate s = -q - r (derived, never stored).
 * // Traveller Companion p.172 — hex grid spatial reference
 */

// === COORDINATE CONVERSION ===

/**
 * Convert axial to cube coordinates.
 * @param {number} q
 * @param {number} r
 * @returns {{ q: number, r: number, s: number }}
 */
export function axialToCube(q, r) {
  return { q, r, s: -q - r }
}

/**
 * Hex distance via cube coordinate Chebyshev.
 * @param {{ q: number, r: number }} a
 * @param {{ q: number, r: number }} b
 * @returns {number}
 */
export function hexDistance(a, b) {
  const dq = Math.abs(a.q - b.q)
  const dr = Math.abs(a.r - b.r)
  const ds = Math.abs((-a.q - a.r) - (-b.q - b.r))
  return Math.max(dq, dr, ds)
}

/**
 * Add two hex vectors.
 * @param {{ q: number, r: number }} a
 * @param {{ q: number, r: number }} b
 * @returns {{ q: number, r: number }}
 */
export function hexAdd(a, b) {
  return { q: a.q + b.q, r: a.r + b.r }
}

/**
 * Scale a hex vector by a scalar factor.
 * @param {{ q: number, r: number }} v
 * @param {number} factor
 * @returns {{ q: number, r: number }}
 */
export function hexScale(v, factor) {
  return { q: v.q * factor, r: v.r * factor }
}

/**
 * Magnitude of a hex vector (distance from origin).
 * @param {{ q: number, r: number }} v
 * @returns {number}
 */
export function hexMagnitude(v) {
  return hexDistance({ q: 0, r: 0 }, v)
}

// === DIRECTIONS ===

/**
 * Six cardinal directions for flat-top hex grid (SE, NE, N, NW, SW, S).
 * // Traveller Companion p.172
 */
export const HEX_DIRECTIONS = [
  { q:  1, r:  0 }, // SE
  { q:  1, r: -1 }, // NE
  { q:  0, r: -1 }, // N
  { q: -1, r:  0 }, // NW
  { q: -1, r:  1 }, // SW
  { q:  0, r:  1 }, // S
]

export const DIRECTION_LABELS = ['SE', 'NE', 'N', 'NW', 'SW', 'S']

/**
 * Return the six neighbors of a hex cell.
 * @param {{ q: number, r: number }} hex
 * @returns {{ q: number, r: number }[]}
 */
export function hexNeighbors(hex) {
  return HEX_DIRECTIONS.map(d => hexAdd(hex, d))
}

// === PIXEL ↔ HEX CONVERSION ===

/**
 * Convert axial hex coordinates to pixel center (flat-top).
 * @param {number} q
 * @param {number} r
 * @param {number} size  Hex radius in pixels
 * @param {number} [offsetX=0]
 * @param {number} [offsetY=0]
 * @returns {{ x: number, y: number }}
 */
export function hexToPixel(q, r, size, offsetX = 0, offsetY = 0) {
  const x = size * (1.5 * q)
  const y = size * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r)
  return { x: x + offsetX, y: y + offsetY }
}

/**
 * Convert pixel coordinates to the nearest hex cell (flat-top).
 * @param {number} px
 * @param {number} py
 * @param {number} size
 * @param {number} [offsetX=0]
 * @param {number} [offsetY=0]
 * @returns {{ q: number, r: number }}
 */
export function pixelToHex(px, py, size, offsetX = 0, offsetY = 0) {
  const x = (px - offsetX) / size
  const y = (py - offsetY) / size
  const q = (2 / 3) * x
  const r = -(1 / 3) * x + (Math.sqrt(3) / 3) * y
  return hexRound({ q, r })
}

/**
 * Round fractional axial coordinates to the nearest integer hex.
 * Uses cube coordinate rounding to ensure correctness.
 * @param {{ q: number, r: number }} hex  Fractional axial coords
 * @returns {{ q: number, r: number }}
 */
export function hexRound(hex) {
  const rq = Math.round(hex.q)
  const rr = Math.round(hex.r)
  const rs = Math.round(-hex.q - hex.r)
  const dq = Math.abs(rq - hex.q)
  const dr = Math.abs(rr - hex.r)
  const ds = Math.abs(rs - (-hex.q - hex.r))
  if (dq > dr && dq > ds) return { q: -rr - rs, r: rr }
  if (dr > ds) return { q: rq, r: -rq - rs }
  return { q: rq, r: rr }
}

// === SEGMENT DISTANCE ===

/**
 * Minimum hex distance between two simultaneous linear paths over t ∈ [0,1].
 * Models "ships that pass in the night": both ships move from their start to end
 * positions at the same rate. Returns the closest approach in hex units.
 * // Traveller Companion p.172 — simultaneous movement
 *
 * Uses analytic breakpoint search on cube coordinates: hexDist(t) =
 * max(|dq(t)|, |dr(t)|, |ds(t)|) is piecewise-linear, so its minimum
 * occurs at t=0, t=1, or where one component crosses zero.
 *
 * @param {{ q: number, r: number }} a0  Ship A start position
 * @param {{ q: number, r: number }} a1  Ship A end position
 * @param {{ q: number, r: number }} b0  Ship B start position
 * @param {{ q: number, r: number }} b1  Ship B end position
 * @returns {number}
 */
export function segmentMinDistance(a0, a1, b0, b1) {
  const dq0 = a0.q - b0.q
  const dr0 = a0.r - b0.r
  const dvq = (a1.q - a0.q) - (b1.q - b0.q)
  const dvr = (a1.r - a0.r) - (b1.r - b0.r)
  // ds component: s = -q - r, so dvs = -(dvq + dvr)
  const dvs = -(dvq + dvr)
  const ds0 = -(dq0 + dr0)

  const candidates = [0, 1]
  if (dvq !== 0) candidates.push(-dq0 / dvq)
  if (dvr !== 0) candidates.push(-dr0 / dvr)
  if (dvs !== 0) candidates.push(-ds0 / dvs)

  let minDist = Infinity
  for (const t of candidates) {
    if (t < 0 || t > 1) continue
    const dq = dq0 + t * dvq
    const dr = dr0 + t * dvr
    minDist = Math.min(minDist, Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)))
  }
  return minDist
}

// === THRUST TARGETING ===

/**
 * Compute a thrust delta from shipPos toward targetHex, clamped to thrustAvailable.
 * Returns the largest integer-hex delta in that direction with magnitude ≤ thrustAvailable.
 * @param {{ q: number, r: number }} targetHex
 * @param {{ q: number, r: number }} shipPos
 * @param {number} thrustAvailable
 * @returns {{ q: number, r: number }}
 */
export function computeClampedDelta(targetHex, shipPos, thrustAvailable) {
  const rawDelta = { q: targetHex.q - shipPos.q, r: targetHex.r - shipPos.r }
  const rawMag   = hexDistance({ q: 0, r: 0 }, rawDelta)
  if (rawMag === 0 || thrustAvailable === 0) return { q: 0, r: 0 }
  if (rawMag <= thrustAvailable) return rawDelta

  let scale = (thrustAvailable - 0.5) / rawMag
  let delta = hexRound({ q: rawDelta.q * scale, r: rawDelta.r * scale })
  while (hexDistance({ q: 0, r: 0 }, delta) > thrustAvailable && scale > 0) {
    scale -= 1 / rawMag
    delta = hexRound({ q: rawDelta.q * scale, r: rawDelta.r * scale })
  }
  return delta
}

// === RANGE BANDS ===

/**
 * Map hex distance to Traveller range band label.
 * // MgT2e CRB p.164 — Space Combat range bands
 * @param {number} distance  Hex distance
 * @returns {string}
 */
export function getRangeBand(distance) {
  if (distance <= 0)  return 'Adjacent'
  if (distance <= 2)  return 'Short'
  if (distance <= 15) return 'Medium'
  if (distance <= 38) return 'Long'
  if (distance <= 77) return 'Very Long'
  return 'Distant'
}
