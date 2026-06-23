/**
 * Obstacle utilities — spatial queries, movement budget, cover DM.
 * // Obstacles System Design §2.3, §3.1–3.4
 */

import { hexDistance, hexAdd, hexMagnitude, hexRound } from './hex.js'

/**
 * All hex cells within `radius` of `center` (inclusive).
 * @param {{ q: number, r: number }} center
 * @param {number} radius
 * @returns {{ q: number, r: number }[]}
 */
export function getHexesInRadius(center, radius) {
  const hexes = []
  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius)
    const rMax = Math.min(radius, -q + radius)
    for (let r = rMin; r <= rMax; r++) {
      hexes.push({ q: center.q + q, r: center.r + r })
    }
  }
  return hexes
}

/**
 * First obstacle whose radius includes `hex`, or null.
 * @param {object[]} obstacles  ObstacleToken[]
 * @param {{ q: number, r: number }} hex
 * @returns {object|null}
 */
export function getObstacleAt(obstacles, hex) {
  return obstacles.find((o) => hexDistance(o.position, hex) <= o.radius) ?? null
}

/**
 * All obstacles intersecting any hex in `hexList`.
 * @param {object[]} obstacles
 * @param {{ q: number, r: number }[]} hexList
 * @returns {object[]}
 */
export function getObstaclesInPath(obstacles, hexList) {
  return hexList.flatMap((h) => obstacles.filter((o) => hexDistance(o.position, h) <= o.radius))
}

/**
 * Attack cover DM from the obstacle the target ship is inside.
 * // Obstacles System Design §3.1, §3.4, §8
 * @param {object|null} obstacle
 * @returns {number}
 */
export function computeObstacleCoverDM(obstacle) {
  if (!obstacle) return 0
  switch (obstacle.type) {
    case 'asteroid_field': return obstacle.density === 'dense' ? -2 : -1
    case 'debris_field':   return -2
    case 'nebula':         return -2
    default:               return 0
  }
}

/**
 * Hex cells along the straight line from `a` to `b` (both endpoints included).
 * Standard cube-coordinate lerp + round.
 * @param {{ q: number, r: number }} a
 * @param {{ q: number, r: number }} b
 * @returns {{ q: number, r: number }[]}
 */
export function hexLineDraw(a, b) {
  const n = hexDistance(a, b)
  if (n === 0) return [{ q: a.q, r: a.r }]
  const hexes = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    hexes.push(hexRound({ q: a.q + (b.q - a.q) * t, r: a.r + (b.r - a.r) * t }))
  }
  return hexes
}

/**
 * Apply vector movement honouring obstacle costs and blocking.
 *
 * Field hexes (asteroid_field / debris_field) cost 2 movement points each.
 * Gravity well hexes are impassable — the ship stops at the last safe hex.
 *
 * Returns:
 *   finalPosition — hex where the ship actually ends
 *   collision     — obstacle if finalPosition is inside a field (pilot check needed), else null
 *   gravityImpact — { obstacle, stoppedAt } if path blocked by a gravity well, else null
 *
 * // Obstacles System Design §3.1, §3.3, §4.2
 * @param {{ q: number, r: number }} position  Ship's current hex
 * @param {{ q: number, r: number }} vector     Ship velocity vector
 * @param {object[]} obstacles                  ObstacleToken[]
 * @returns {{ finalPosition: {q:number,r:number}, collision: object|null, gravityImpact: object|null }}
 */
export function applyMovementWithObstacles(position, vector, obstacles) {
  const budget = hexMagnitude(vector)
  if (budget === 0) return { finalPosition: { ...position }, collision: null, gravityImpact: null }

  const target = hexAdd(position, vector)
  const path   = hexLineDraw(position, target)  // path[0] === position

  let spent         = 0
  let finalPosition = { ...position }
  let gravityImpact = null

  for (let i = 1; i < path.length; i++) {
    const hex      = path[i]
    const obstacle = getObstacleAt(obstacles, hex)

    if (obstacle?.type === 'gravity_well') {
      gravityImpact = { obstacle, stoppedAt: { ...finalPosition } }
      break
    }

    const isField = obstacle?.type === 'asteroid_field' || obstacle?.type === 'debris_field'
    const cost    = isField ? 2 : 1

    if (spent + cost > budget) break

    spent += cost
    finalPosition = { ...hex }
  }

  const finalObstacle = getObstacleAt(obstacles, finalPosition)
  const finalInField  = finalObstacle?.type === 'asteroid_field' || finalObstacle?.type === 'debris_field'
  const collision     = finalInField ? { obstacle: finalObstacle, position: { ...finalPosition } } : null

  return { finalPosition, collision, gravityImpact }
}
