/**
 * Unit tests for obstacle utilities.
 * // Obstacles System Design §2.3, §3.1–3.4, §11
 */

import { describe, it, expect } from 'vitest'
import {
  getHexesInRadius,
  getObstacleAt,
  getObstaclesInPath,
  computeObstacleCoverDM,
  hexLineDraw,
  applyMovementWithObstacles,
} from './obstacles.js'

// === getHexesInRadius ===

describe('getHexesInRadius', () => {
  it('radius 0 returns only the centre hex', () => {
    const hexes = getHexesInRadius({ q: 2, r: -1 }, 0)
    expect(hexes).toHaveLength(1)
    expect(hexes[0]).toEqual({ q: 2, r: -1 })
  })

  it('radius 1 returns 7 hexes (centre + 6 neighbours)', () => {
    expect(getHexesInRadius({ q: 0, r: 0 }, 1)).toHaveLength(7)
  })

  it('radius 2 returns 19 hexes', () => {
    expect(getHexesInRadius({ q: 0, r: 0 }, 2)).toHaveLength(19)
  })

  it('all hexes are within the specified radius (cube distance check)', () => {
    const centre = { q: 3, r: -2 }
    const radius = 3
    const hexes = getHexesInRadius(centre, radius)
    // hex count: 3r²+3r+1
    expect(hexes).toHaveLength(37)
    for (const h of hexes) {
      const dist = Math.max(
        Math.abs(h.q - centre.q),
        Math.abs(h.r - centre.r),
        Math.abs((-h.q - h.r) - (-centre.q - centre.r)),
      )
      expect(dist).toBeLessThanOrEqual(radius)
    }
  })
})

// === getObstacleAt ===

describe('getObstacleAt', () => {
  const obstacle = { id: 'o1', type: 'asteroid_field', position: { q: 0, r: 0 }, radius: 1, density: 'light' }

  it('returns obstacle when hex is the centre', () => {
    expect(getObstacleAt([obstacle], { q: 0, r: 0 })).toBe(obstacle)
  })

  it('returns obstacle when hex is within radius', () => {
    expect(getObstacleAt([obstacle], { q: 1, r: 0 })).toBe(obstacle)
    expect(getObstacleAt([obstacle], { q: 0, r: -1 })).toBe(obstacle)
  })

  it('returns null when hex is beyond radius', () => {
    expect(getObstacleAt([obstacle], { q: 2, r: 0 })).toBeNull()
    expect(getObstacleAt([obstacle], { q: -2, r: 1 })).toBeNull()
  })

  it('returns null on empty obstacles array', () => {
    expect(getObstacleAt([], { q: 0, r: 0 })).toBeNull()
  })

  it('radius 0 — only the centre hex matches', () => {
    const point = { id: 'o2', type: 'gravity_well', position: { q: 3, r: -1 }, radius: 0 }
    expect(getObstacleAt([point], { q: 3, r: -1 })).toBe(point)
    expect(getObstacleAt([point], { q: 3, r: 0 })).toBeNull()
  })

  it('returns first matching obstacle when multiple overlap', () => {
    const a = { id: 'a', type: 'nebula',         position: { q: 0, r: 0 }, radius: 2 }
    const b = { id: 'b', type: 'asteroid_field', position: { q: 1, r: 0 }, radius: 0, density: 'dense' }
    // hex {q:1,r:0} is inside both — returns the first in array
    expect(getObstacleAt([a, b], { q: 1, r: 0 })).toBe(a)
    expect(getObstacleAt([b, a], { q: 1, r: 0 })).toBe(b)
  })
})

// === getObstaclesInPath ===

describe('getObstaclesInPath', () => {
  it('returns empty array when no obstacles intersect path', () => {
    const obs = [{ id: 'o', type: 'nebula', position: { q: 10, r: 10 }, radius: 0 }]
    const path = [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }]
    expect(getObstaclesInPath(obs, path)).toHaveLength(0)
  })

  it('returns obstacles for each intersecting hex (may have duplicates)', () => {
    const obs = [{ id: 'o', type: 'asteroid_field', position: { q: 1, r: 0 }, radius: 1, density: 'light' }]
    // path touches radius 1 field at hex {q:1,r:0} and {q:2,r:0}
    const path = [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }]
    const result = getObstaclesInPath(obs, path)
    // {q:0,r:0} dist=1 (within), {q:1,r:0} dist=0, {q:2,r:0} dist=1 → 3 hits
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(o => o.id === 'o')).toBe(true)
  })
})

// === computeObstacleCoverDM ===

describe('computeObstacleCoverDM', () => {
  it('null → 0', () => {
    expect(computeObstacleCoverDM(null)).toBe(0)
  })

  it('asteroid_field light → −1', () => {
    expect(computeObstacleCoverDM({ type: 'asteroid_field', density: 'light' })).toBe(-1)
  })

  it('asteroid_field dense → −2', () => {
    expect(computeObstacleCoverDM({ type: 'asteroid_field', density: 'dense' })).toBe(-2)
  })

  it('debris_field → −2', () => {
    expect(computeObstacleCoverDM({ type: 'debris_field' })).toBe(-2)
  })

  it('nebula → −2', () => {
    expect(computeObstacleCoverDM({ type: 'nebula' })).toBe(-2)
  })

  it('gravity_well → 0 (impassable, not a cover modifier)', () => {
    expect(computeObstacleCoverDM({ type: 'gravity_well' })).toBe(0)
  })
})

// === hexLineDraw ===

describe('hexLineDraw', () => {
  it('same hex → single-element array', () => {
    expect(hexLineDraw({ q: 2, r: -1 }, { q: 2, r: -1 })).toEqual([{ q: 2, r: -1 }])
  })

  it('adjacent hex → two elements including both endpoints', () => {
    const line = hexLineDraw({ q: 0, r: 0 }, { q: 1, r: 0 })
    expect(line).toHaveLength(2)
    expect(line[0]).toEqual({ q: 0, r: 0 })
    expect(line[1]).toEqual({ q: 1, r: 0 })
  })

  it('straight-line distance N → N+1 elements', () => {
    const line = hexLineDraw({ q: 0, r: 0 }, { q: 5, r: 0 })
    expect(line).toHaveLength(6)
    expect(line[0]).toEqual({ q: 0, r: 0 })
    expect(line[5]).toEqual({ q: 5, r: 0 })
  })

  it('diagonal produces correct intermediate hexes', () => {
    // q:0,r:0 → q:2,r:-2 (two steps NE in flat-top axial)
    const line = hexLineDraw({ q: 0, r: 0 }, { q: 2, r: -2 })
    expect(line).toHaveLength(3)
    expect(line[1]).toEqual({ q: 1, r: -1 })
  })

  it('all hexes are integer coordinates (hexRound applied)', () => {
    const line = hexLineDraw({ q: 0, r: 0 }, { q: 3, r: -1 })
    for (const h of line) {
      expect(Number.isInteger(h.q)).toBe(true)
      expect(Number.isInteger(h.r)).toBe(true)
    }
  })
})

// === applyMovementWithObstacles ===

describe('applyMovementWithObstacles — no obstacles', () => {
  it('zero vector → stays in place', () => {
    const { finalPosition, collision, gravityImpact } = applyMovementWithObstacles(
      { q: 2, r: 1 }, { q: 0, r: 0 }, [],
    )
    expect(finalPosition).toEqual({ q: 2, r: 1 })
    expect(collision).toBeNull()
    expect(gravityImpact).toBeNull()
  })

  it('non-zero vector in open space → full displacement', () => {
    const { finalPosition, collision, gravityImpact } = applyMovementWithObstacles(
      { q: 0, r: 0 }, { q: 3, r: 0 }, [],
    )
    expect(finalPosition).toEqual({ q: 3, r: 0 })
    expect(collision).toBeNull()
    expect(gravityImpact).toBeNull()
  })
})

describe('applyMovementWithObstacles — asteroid field', () => {
  // Light field at {q:2,r:0} radius 0. Movement budget = |v|.

  it('ship with sufficient budget traverses field and exits cleanly', () => {
    const field = { id: 'f', type: 'asteroid_field', position: { q: 2, r: 0 }, radius: 0, density: 'light' }
    // budget = hexMagnitude({q:4,r:0}) = 4
    // Path: 0→1(cost1)→2(field,cost2)→3(cost1) — total spent=4=budget, stops at q:3 outside field
    const { finalPosition, collision, gravityImpact } = applyMovementWithObstacles(
      { q: 0, r: 0 }, { q: 4, r: 0 }, [field],
    )
    expect(finalPosition).toEqual({ q: 3, r: 0 })
    expect(collision).toBeNull()
    expect(gravityImpact).toBeNull()
  })

  it('ship runs out of budget inside field → collision event, correct final position', () => {
    const field = { id: 'f', type: 'asteroid_field', position: { q: 1, r: 0 }, radius: 0, density: 'light' }
    // Path: 0→1(field,cost2) — budget=1: can't pay cost 2, stops at q:0
    const { finalPosition, collision, gravityImpact } = applyMovementWithObstacles(
      { q: 0, r: 0 }, { q: 1, r: 0 }, [field],
    )
    // budget=1, field costs 2 → can't enter
    expect(finalPosition).toEqual({ q: 0, r: 0 })
    expect(collision).toBeNull()   // final hex not in field
    expect(gravityImpact).toBeNull()
  })

  it('ship with budget=2 enters field and ends inside → collision flagged', () => {
    const field = { id: 'f', type: 'asteroid_field', position: { q: 1, r: 0 }, radius: 1, density: 'dense' }
    // budget=2: path 0→1(field,cost2) pays exactly 2, stops at q:1 which is inside field
    const { finalPosition, collision, gravityImpact } = applyMovementWithObstacles(
      { q: 0, r: 0 }, { q: 2, r: 0 }, [field],
    )
    expect(finalPosition).toEqual({ q: 1, r: 0 })
    expect(collision).not.toBeNull()
    expect(collision.obstacle.id).toBe('f')
    expect(gravityImpact).toBeNull()
  })
})

describe('applyMovementWithObstacles — gravity well', () => {
  it('path blocked by gravity well → ship stops before it, gravityImpact set', () => {
    const gw = { id: 'gw', type: 'gravity_well', position: { q: 3, r: 0 }, radius: 0 }
    // Path: 0→1→2→3(gw) — ship stops at q:2, gravityImpact set
    const { finalPosition, collision, gravityImpact } = applyMovementWithObstacles(
      { q: 0, r: 0 }, { q: 4, r: 0 }, [gw],
    )
    expect(finalPosition).toEqual({ q: 2, r: 0 })
    expect(collision).toBeNull()
    expect(gravityImpact).not.toBeNull()
    expect(gravityImpact.obstacle.id).toBe('gw')
    expect(gravityImpact.stoppedAt).toEqual({ q: 2, r: 0 })
  })

  it('gravity well at radius 2 blocks the first hex that enters the zone', () => {
    const gw = { id: 'gw', type: 'gravity_well', position: { q: 5, r: 0 }, radius: 2 }
    // hex {q:3,r:0} is within radius 2 of {q:5,r:0} (dist=2) → blocked
    const { finalPosition, gravityImpact } = applyMovementWithObstacles(
      { q: 0, r: 0 }, { q: 6, r: 0 }, [gw],
    )
    expect(finalPosition).toEqual({ q: 2, r: 0 })
    expect(gravityImpact).not.toBeNull()
    expect(gravityImpact.stoppedAt).toEqual({ q: 2, r: 0 })
  })

  it('gravity well directly on starting hex does not block movement (ship is already there)', () => {
    const gw = { id: 'gw', type: 'gravity_well', position: { q: 0, r: 0 }, radius: 0 }
    // Starting hex is path[0] which is skipped in the loop (i starts at 1)
    const { finalPosition, gravityImpact } = applyMovementWithObstacles(
      { q: 0, r: 0 }, { q: 1, r: 0 }, [gw],
    )
    // path[1] = {q:1,r:0} — no obstacle there — ship moves freely
    expect(finalPosition).toEqual({ q: 1, r: 0 })
    expect(gravityImpact).toBeNull()
  })
})

describe('applyMovementWithObstacles — nebula', () => {
  it('nebula has no effect on movement budget (ship traverses freely)', () => {
    const nebula = { id: 'n', type: 'nebula', position: { q: 2, r: 0 }, radius: 1 }
    const { finalPosition, collision, gravityImpact } = applyMovementWithObstacles(
      { q: 0, r: 0 }, { q: 3, r: 0 }, [nebula],
    )
    expect(finalPosition).toEqual({ q: 3, r: 0 })
    expect(collision).toBeNull()
    expect(gravityImpact).toBeNull()
  })
})
