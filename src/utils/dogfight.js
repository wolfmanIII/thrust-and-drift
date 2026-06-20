/**
 * Dogfight utility functions.
 * Implements close-quarters dogfighting mechanics.
 * @see MgT2e CRB p.138 (vehicle combat) + dogfight-system-design.md §6
 */

import { roll2D6 } from './dice.js'
import { getEffectiveSkill } from './crew.js'

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
export function rollDogfightPilot({ pilotSkill, tonnage, thrustDM = 0, extraEnemyDM = 0, dexDM = 0, diceOverride = null }) {
  const roll       = diceOverride ?? roll2D6()
  const tonnageDM  = getTonnageDM(tonnage)
  const total      = roll.total + pilotSkill + tonnageDM + thrustDM + extraEnemyDM + dexDM
  return {
    results: roll.results,
    total,
    breakdown: { dice: roll.total, pilotSkill, tonnageDM, thrustDM, extraEnemyDM, dexDM },
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
 * Remaining free thrust after movement spending.
 * @param {object} ship
 * @returns {number}
 */
export function freeThrust(ship) {
  return Math.max(0, (ship.profile.thrust ?? 0) - (ship.thrustUsedThisRound ?? 0))
}

/**
 * Compute Pilot check DMs for a ship in a dogfight micro-round.
 * // MgT2e CRB p.138 §6.1
 * @param {object}   ship
 * @param {object[]} groupShips  All ships in the dogfight group
 * @param {object}   group       Dogfight group state
 * @returns {{ pilotSkill: number, tonnageDM: number, thrustDM: number, dexDM: number, extraEnemyDM: number, prevRoundBonus: number }}
 */
export function computeShipDMs(ship, groupShips, group) {
  const pilotSkill     = getEffectiveSkill(ship.profile.crew, ship.crewAssignments, 'pilot')
  const tonnageDM      = getTonnageDM(ship.profile.tonnage)
  const thrustDM       = freeThrust(ship)
  const dexDM          = ship.profile.dexDM ?? 0
  const enemies        = groupShips.filter((s) => s.faction !== ship.faction)
  const extraEnemyDM   = -(Math.max(0, enemies.length - 1))
  const prevRoundBonus = ship.id === group.roundWinnerId ? group.roundWinnerMargin : 0
  return { pilotSkill, tonnageDM, thrustDM, dexDM, extraEnemyDM, prevRoundBonus }
}

/**
 * Return the ship with the highest pilot skill from a list.
 * @param {object[]} shipList
 * @returns {object|null}
 */
export function bestPilot(shipList) {
  return shipList.reduce((best, s) => {
    const sk = getEffectiveSkill(s.profile.crew, s.crewAssignments, 'pilot')
    return !best || sk > getEffectiveSkill(best.profile.crew, best.crewAssignments, 'pilot') ? s : best
  }, null)
}

/**
 * Compute escape check totals for the fleeing ship and its pursuer.
 * // MgT2e CRB p.138 §3.1
 * @param {object}      ship        Fleeing ship
 * @param {object|null} pursuer     Best-pilot pursuer
 * @param {object|null} fleeDice    Pre-rolled dice for fleer
 * @param {object|null} pursuerDice Pre-rolled dice for pursuer
 * @returns {{ fleeTotal: number, pursuerTotal: number|null, escaped: boolean|null } | null}
 */
export function escapeCheckTotals(ship, pursuer, fleeDice, pursuerDice) {
  if (!fleeDice) return null
  const fleeResult = rollDogfightPilot({
    pilotSkill:   getEffectiveSkill(ship.profile.crew, ship.crewAssignments, 'pilot'),
    tonnage:      ship.profile.tonnage,
    thrustDM:     freeThrust(ship),
    diceOverride: fleeDice,
  })
  if (!pursuer) {
    return { fleeTotal: fleeResult.total, pursuerTotal: 0, escaped: true }
  }
  if (!pursuerDice) {
    return { fleeTotal: fleeResult.total, pursuerTotal: null, escaped: null }
  }
  const pursuerResult = rollDogfightPilot({
    pilotSkill:   getEffectiveSkill(pursuer.profile.crew, pursuer.crewAssignments, 'pilot'),
    tonnage:      pursuer.profile.tonnage,
    thrustDM:     freeThrust(pursuer),
    diceOverride: pursuerDice,
  })
  return {
    fleeTotal:    fleeResult.total,
    pursuerTotal: pursuerResult.total,
    escaped:      fleeResult.total > pursuerResult.total,
  }
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
