/**
 * Tests for hex grid math utilities.
 * // Traveller Companion p.172 — flat-top axial coordinate system
 */

import { describe, it, expect } from 'vitest'
import {
  axialToCube,
  hexDistance,
  hexAdd,
  hexScale,
  hexMagnitude,
  hexNeighbors,
  hexToPixel,
  pixelToHex,
  hexRound,
  getRangeBand,
  segmentMinDistance,
  computeClampedDelta,
  HEX_DIRECTIONS,
} from './hex.js'

describe('axialToCube', () => {
  it('derives s = -q - r', () => {
    expect(axialToCube(2, 3)).toEqual({ q: 2, r: 3, s: -5 })
    expect(axialToCube(-1, 4)).toEqual({ q: -1, r: 4, s: -3 })
    // axialToCube(0,0).s = -0 in JS — check numerically, not with toEqual
    expect(axialToCube(1, -1)).toEqual({ q: 1, r: -1, s: 0 })
  })
})

describe('hexDistance', () => {
  it('same cell = 0', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0)
    expect(hexDistance({ q: 3, r: -2 }, { q: 3, r: -2 })).toBe(0)
  })

  it('all 6 adjacent directions = 1', () => {
    for (const d of HEX_DIRECTIONS) {
      expect(hexDistance({ q: 0, r: 0 }, d)).toBe(1)
    }
  })

  it('symmetric', () => {
    const a = { q: 2, r: -3 }
    const b = { q: -1, r: 4 }
    expect(hexDistance(a, b)).toBe(hexDistance(b, a))
  })

  it('known positions', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: 0 })).toBe(3)
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: -2 })).toBe(2)
    expect(hexDistance({ q: 1, r: -3 }, { q: -2, r: 2 })).toBe(5)
  })
})

describe('hexAdd', () => {
  it('adds components', () => {
    expect(hexAdd({ q: 1, r: 2 }, { q: 3, r: -1 })).toEqual({ q: 4, r: 1 })
  })

  it('identity with zero vector', () => {
    const v = { q: 5, r: -3 }
    expect(hexAdd(v, { q: 0, r: 0 })).toEqual(v)
  })

  it('commutative', () => {
    const a = { q: 2, r: -1 }
    const b = { q: -3, r: 4 }
    expect(hexAdd(a, b)).toEqual(hexAdd(b, a))
  })
})

describe('hexScale', () => {
  it('scales both components', () => {
    expect(hexScale({ q: 2, r: -3 }, 4)).toEqual({ q: 8, r: -12 })
  })

  it('scale by 0 = origin', () => {
    expect(hexScale({ q: 5, r: 7 }, 0)).toEqual({ q: 0, r: 0 })
  })

  it('scale by 1 = unchanged', () => {
    const v = { q: 3, r: -2 }
    expect(hexScale(v, 1)).toEqual(v)
  })

  it('scale by -1 = negation', () => {
    expect(hexScale({ q: 3, r: -2 }, -1)).toEqual({ q: -3, r: 2 })
  })
})

describe('hexMagnitude', () => {
  it('origin = 0', () => {
    expect(hexMagnitude({ q: 0, r: 0 })).toBe(0)
  })

  it('all unit directions = 1', () => {
    for (const d of HEX_DIRECTIONS) {
      expect(hexMagnitude(d)).toBe(1)
    }
  })

  it('scales with distance', () => {
    expect(hexMagnitude({ q: 3, r: 0 })).toBe(3)
    expect(hexMagnitude({ q: 0, r: 5 })).toBe(5)
  })
})

describe('hexNeighbors', () => {
  it('returns exactly 6 neighbors', () => {
    expect(hexNeighbors({ q: 0, r: 0 })).toHaveLength(6)
    expect(hexNeighbors({ q: 4, r: -2 })).toHaveLength(6)
  })

  it('all neighbors at distance 1 from center', () => {
    const center = { q: 2, r: -1 }
    for (const n of hexNeighbors(center)) {
      expect(hexDistance(center, n)).toBe(1)
    }
  })

  it('no duplicate neighbors', () => {
    const neighbors = hexNeighbors({ q: 0, r: 0 })
    const keys = neighbors.map(({ q, r }) => `${q},${r}`)
    expect(new Set(keys).size).toBe(6)
  })
})

describe('hexRound', () => {
  it('exact integer coords unchanged', () => {
    expect(hexRound({ q: 2, r: -3 })).toEqual({ q: 2, r: -3 })
    expect(hexRound({ q: 0, r: 0 })).toEqual({ q: 0, r: 0 })
  })

  it('fractional near center rounds to (0,0)', () => {
    expect(hexRound({ q: 0.1, r: 0.1 })).toEqual({ q: 0, r: 0 })
    // Math.round(-0.1) = -0 in JS — check with + 0 to normalize sign
    const r = hexRound({ q: -0.1, r: 0.1 })
    expect(r.q + 0).toBe(0)
    expect(r.r + 0).toBe(0)
  })
})

describe('hexToPixel / pixelToHex round-trip', () => {
  const SIZE = 40
  const CASES = [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: 3, r: -2 },
    { q: -2, r: 4 },
    { q: -1, r: -1 },
  ]

  it.each(CASES)('hex (%o) survives pixel round-trip', (hex) => {
    const px = hexToPixel(hex.q, hex.r, SIZE)
    const back = pixelToHex(px.x, px.y, SIZE)
    expect(back).toEqual(hex)
  })

  it('offset shifts pixel coords, not hex result', () => {
    const offsetX = 100, offsetY = 80
    const px = hexToPixel(2, -1, SIZE, offsetX, offsetY)
    const back = pixelToHex(px.x, px.y, SIZE, offsetX, offsetY)
    expect(back).toEqual({ q: 2, r: -1 })
  })
})

// === RANGE BANDS ===
// // MgT2e CRB p.164

// === segmentMinDistance ===
// // Traveller Companion p.172 — Ships That Pass in the Night

describe('segmentMinDistance', () => {
  it('ships crossing head-on reach distance 0', () => {
    // A: (0,0) → (4,0),  B: (4,0) → (0,0)  — they swap positions, minDist = 0
    const d = segmentMinDistance({ q: 0, r: 0 }, { q: 4, r: 0 }, { q: 4, r: 0 }, { q: 0, r: 0 })
    expect(d).toBe(0)
  })

  it('ships stationary at same position = 0', () => {
    expect(segmentMinDistance({ q: 2, r: 1 }, { q: 2, r: 1 }, { q: 2, r: 1 }, { q: 2, r: 1 })).toBe(0)
  })

  it('ships moving in parallel lanes 3 hexes apart stay at 3', () => {
    // A: (0,0) → (5,0),  B: (0,3) → (5,3) — lane separation stays constant
    const d = segmentMinDistance({ q: 0, r: 0 }, { q: 5, r: 0 }, { q: 0, r: 3 }, { q: 5, r: 3 })
    expect(d).toBe(3)
  })

  it('ships converging reach Short range (≤ 2)', () => {
    // A starts far left and moves right; B starts far right and moves left
    // They pass each other at t=0.5
    const d = segmentMinDistance({ q: 0, r: 0 }, { q: 6, r: 0 }, { q: 6, r: 2 }, { q: 0, r: 2 })
    expect(d).toBeLessThanOrEqual(2)
  })

  it('ships moving away from each other: min is the starting distance', () => {
    // A at (0,0) moving further left; B at (3,0) moving further right
    const d = segmentMinDistance({ q: 0, r: 0 }, { q: -3, r: 0 }, { q: 3, r: 0 }, { q: 6, r: 0 })
    expect(d).toBe(3) // starting distance, monotonically increasing
  })

  it('ships already adjacent at start stay adjacent throughout = 1', () => {
    // A: (0,0) → (3,0),  B: (1,0) → (4,0) — same direction, same speed, always 1 apart
    const d = segmentMinDistance({ q: 0, r: 0 }, { q: 3, r: 0 }, { q: 1, r: 0 }, { q: 4, r: 0 })
    expect(d).toBe(1)
  })

  it('is symmetric (swap A and B)', () => {
    const a0 = { q: 0, r: 0 }, a1 = { q: 5, r: -2 }
    const b0 = { q: 4, r: 1 }, b1 = { q: -1, r: 3 }
    expect(segmentMinDistance(a0, a1, b0, b1)).toBe(segmentMinDistance(b0, b1, a0, a1))
  })
})

describe('getRangeBand', () => {
  const CASES = [
    [0,   'Adjacent'],
    [1,   'Short'],
    [2,   'Short'],
    [3,   'Medium'],
    [15,  'Medium'],
    [16,  'Long'],
    [38,  'Long'],
    [39,  'Very Long'],
    [77,  'Very Long'],
    [78,  'Distant'],
    [200, 'Distant'],
  ]

  it.each(CASES)('distance %i → "%s"', (d, expected) => {
    expect(getRangeBand(d)).toBe(expected)
  })
})

describe('computeClampedDelta', () => {
  it('returns rawDelta when within budget', () => {
    const delta = computeClampedDelta({ q: 3, r: 0 }, { q: 0, r: 0 }, 4)
    expect(hexDistance({ q: 0, r: 0 }, delta)).toBeLessThanOrEqual(4)
    expect(delta).toEqual({ q: 3, r: 0 })
  })

  it('clamps magnitude to thrustAvailable when over budget', () => {
    const delta = computeClampedDelta({ q: 10, r: 0 }, { q: 0, r: 0 }, 3)
    expect(hexDistance({ q: 0, r: 0 }, delta)).toBeLessThanOrEqual(3)
  })

  it('returns {0,0} when thrustAvailable is 0', () => {
    expect(computeClampedDelta({ q: 5, r: 0 }, { q: 0, r: 0 }, 0)).toEqual({ q: 0, r: 0 })
  })

  it('returns {0,0} when target equals ship position', () => {
    expect(computeClampedDelta({ q: 2, r: 2 }, { q: 2, r: 2 }, 4)).toEqual({ q: 0, r: 0 })
  })
})
