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
