/**
 * Space combat mechanical calculations.
 * All functions are pure — no side effects, no store access.
 * // MgT2e CRB p.160–168, Traveller Companion p.169–186
 */

import { roll2D6 } from './dice.js'
import { hexDistance, hexAdd } from './hex.js'

// === INITIATIVE ===

/**
 * Roll initiative for a ship.
 * Formula: 2D6 + Pilot skill + Ship Thrust [+ Tactics(naval) effect]
 * // MgT2e CRB p.160
 * @param {number} pilotSkill
 * @param {number} thrust
 * @param {number} [tacticsEffect=0]  Effect of prior Tactics(naval) check
 * @returns {{ roll: object, total: number, breakdown: object }}
 */
export function rollInitiative(pilotSkill, thrust, tacticsEffect = 0) {
  const roll = roll2D6()
  const total = roll.total + pilotSkill + thrust + tacticsEffect
  return {
    roll,
    total,
    breakdown: { roll: roll.total, pilotSkill, thrust, tacticsEffect },
  }
}

// === ATTACK ===

/**
 * Resolve an attack roll against a target ship.
 * Formula: 2D6 + Gunner + DM_dex + DM_aidGunners + DM_range + DM_weapon + DM_size + DM_evasive + DM_sensorLock
 * Target number: 8+
 * // MgT2e CRB p.163, p.167 (sensor lock bonus)
 * @param {{
 *   gunnerSkill: number,
 *   dexDM: number,
 *   aidGunnersDM: number,
 *   rangeDM: number,
 *   weaponDM: number,
 *   targetSizeDM: number,
 *   evasiveDM: number,
 *   sensorLockDM?: number,
 * }} params
 * @returns {{ roll: object, total: number, effect: number, hit: boolean, breakdown: object }}
 */
export function rollAttack({
  gunnerSkill,
  dexDM,
  aidGunnersDM,
  rangeDM,
  weaponDM,
  targetSizeDM,
  evasiveDM,
  sensorLockDM = 0,
}) {
  const roll = roll2D6()
  const total =
    roll.total +
    gunnerSkill +
    dexDM +
    aidGunnersDM +
    rangeDM +
    weaponDM +
    targetSizeDM +
    evasiveDM +
    sensorLockDM
  return {
    roll,
    total,
    effect: total - 8,
    hit: total >= 8,
    breakdown: {
      roll: roll.total,
      gunnerSkill,
      dexDM,
      aidGunnersDM,
      rangeDM,
      weaponDM,
      targetSizeDM,
      evasiveDM,
      sensorLockDM,
    },
  }
}

/**
 * Get the attack DM for a given range band.
 * // MgT2e CRB p.164 — Range Band DMs table
 * @param {string} rangeBand
 * @returns {number}
 */
export function getRangeDM(rangeBand) {
  const table = {
    Adjacent:   0,
    Short:      1,
    Medium:     0,
    Long:      -2,
    'Very Long': -4,
    Distant:   -6,
  }
  return table[rangeBand] ?? 0
}

/**
 * Get the target size DM based on tonnage.
 * +1 per 1,000 tons, max +6.
 * // MgT2e CRB p.163
 * @param {number} tonnage
 * @returns {number}
 */
export function getTargetSizeDM(tonnage) {
  return Math.min(6, Math.floor((tonnage ?? 0) / 1000))
}

// === CHARACTERISTIC DM ===

/**
 * Convert a characteristic value (2–15) to its DM.
 * // MgT2e CRB p.6
 * @param {number} value
 * @returns {number}
 */
export function getCharDM(value) {
  if (value <= 0)  return -3
  if (value <= 2)  return -2
  if (value <= 5)  return -1
  if (value <= 8)  return  0
  if (value <= 11) return +1
  if (value <= 14) return +2
  return +3
}

// === THRUST / MOVEMENT ===

/**
 * Validate a thrust delta against available thrust.
 * Uses hex distance (Chebyshev) — NOT Manhattan distance.
 * // Traveller Companion p.172 — vectorial thrust constraint
 * @param {{ q: number, r: number }} delta
 * @param {number} thrustAvailable
 * @returns {boolean}
 */
export function isValidThrustDelta(delta, thrustAvailable) {
  return hexDistance({ q: 0, r: 0 }, delta) <= thrustAvailable
}

/**
 * Apply a thrust delta to the current velocity vector.
 * @param {{ q: number, r: number }} currentVector
 * @param {{ q: number, r: number }} delta
 * @returns {{ q: number, r: number }}
 */
export function applyThrust(currentVector, delta) {
  return hexAdd(currentVector, delta)
}

/**
 * Move a ship by its current velocity vector.
 * @param {{ q: number, r: number }} currentPosition
 * @param {{ q: number, r: number }} currentVector
 * @returns {{ q: number, r: number }}
 */
export function applyMovement(currentPosition, currentVector) {
  return hexAdd(currentPosition, currentVector)
}

// === EVASIVE ACTION ===

/**
 * Calculate the evasive action DM imposed on attackers.
 * The pilot declares N thrust points reserved for evasion.
 * Each point applies -(pilotSkill) as DM to attackers.
 * // MgT2e CRB p.166 — Evasive Action
 * @param {number} pilotSkill
 * @param {number} evasiveThrust  Thrust points declared for evasion
 * @returns {number}  Negative DM to apply to attackers
 */
export function getEvasiveDM(pilotSkill, evasiveThrust) {
  if (evasiveThrust <= 0 || pilotSkill === 0) return 0
  return -(pilotSkill * evasiveThrust)
}

// === CRITICAL HITS ===

/**
 * Determine if an attack causes a critical hit.
 * Triggered when Effect >= 6.
 * // MgT2e CRB p.165
 * @param {number} effect  Attack effect (total - 8)
 * @returns {boolean}
 */
export function isCriticalHit(effect) {
  return effect >= 6
}
