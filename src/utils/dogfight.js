/**
 * Dogfight utility functions.
 * Implements close-quarters dogfighting mechanics.
 * @see MgT2e CRB p.138 (vehicle combat) + dogfight-system-design.md §6
 */

import { roll2D6 } from './dice.js'

/**
 * Tonnage DM penalty for dogfight Pilot checks.
 * Larger ships are less agile in close-quarters combat.
 * @param {number} tonnage
 * @returns {number}
 */
export function getTonnageDM(tonnage) {
  if (!tonnage || tonnage < 50)  return  0
  if (tonnage < 100)             return -1
  return -2 - Math.floor((tonnage - 100) / 100)
}

/**
 * Roll dogfight Pilot check for one ship.
 * @param {object} params
 * @param {number}      params.pilotSkill
 * @param {number}      params.tonnage
 * @param {number}      [params.thrustDM=0]       thrust points dedicated to dogfight
 * @param {number}      [params.extraEnemyDM=0]   −1 per additional enemy beyond first
 * @param {object|null} [params.diceOverride=null] pre-rolled {results, total}
 * @returns {{ results: number[], total: number, breakdown: object }}
 */
export function rollDogfightPilot({ pilotSkill, tonnage, thrustDM = 0, extraEnemyDM = 0, diceOverride = null }) {
  const roll       = diceOverride ?? roll2D6()
  const tonnageDM  = getTonnageDM(tonnage)
  const total      = roll.total + pilotSkill + tonnageDM + thrustDM + extraEnemyDM
  return {
    results: roll.results,
    total,
    breakdown: { dice: roll.total, pilotSkill, tonnageDM, thrustDM, extraEnemyDM },
  }
}

/**
 * Determine winner of opposed dogfight Pilot checks.
 * @param {{ shipId: string, total: number }[]} results  — min 2 entries
 * @returns {{ winnerId: string|null, margin: number, tied: boolean }}
 */
export function resolveDogfightChecks(results) {
  const sorted   = [...results].sort((a, b) => b.total - a.total)
  const [first, second] = sorted
  const margin   = first.total - second.total
  if (margin === 0) return { winnerId: null, margin: 0, tied: true }
  return { winnerId: first.shipId, margin, tied: false }
}

/**
 * Attack DM from dogfight check result.
 * Winner +2, loser −2, tie 0 (fixed weapons blocked on tie, MgT2e CRB p.138).
 * @param {string}      shipId
 * @param {string|null} winnerId
 * @returns {number}
 */
export function dogfightAttackDM(shipId, winnerId) {
  if (!winnerId) return 0
  return shipId === winnerId ? 2 : -2
}

/**
 * Whether a ship has sufficient thrust advantage to attempt escape.
 * Escape possible when ship thrust exceeds ALL pursuing enemies' thrust.
 * @param {number}   shipThrust
 * @param {number[]} enemyThrusts
 * @returns {boolean}
 */
export function canEscape(shipThrust, enemyThrusts) {
  if (enemyThrusts.length === 0) return true
  return shipThrust > Math.max(...enemyThrusts)
}
