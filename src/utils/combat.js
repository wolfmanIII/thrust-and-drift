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
/**
 * @param {number} pilotSkill
 * @param {number} thrust
 * @param {number} [tacticsEffect=0]
 * @param {{ results: number[], total: number }|null} [diceOverride]  Pre-rolled dice (player manual entry)
 */
export function rollInitiative(pilotSkill, thrust, tacticsEffect = 0, diceOverride = null) {
  const roll = diceOverride ?? roll2D6()
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
  dogfightDM = 0,
  obstacleCoverDM = 0,
  torpedoSmallShipDM = 0,
  diceOverride = null,
}) {
  const roll = diceOverride ?? roll2D6()
  const total =
    roll.total +
    gunnerSkill +
    dexDM +
    aidGunnersDM +
    rangeDM +
    weaponDM +
    targetSizeDM +
    evasiveDM +
    sensorLockDM +
    dogfightDM +
    obstacleCoverDM +
    torpedoSmallShipDM
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
      dogfightDM,
      obstacleCoverDM,
      torpedoSmallShipDM,
    },
  }
}

/**
 * Ordered range bands from closest to furthest.
 * // MgT2e CRB p.165 — Range Bands table
 * @type {string[]}
 */
export const RANGE_ORDER = ['Adjacent', 'Short', 'Medium', 'Long', 'Very Long', 'Distant']

/**
 * Return true if currentRangeBand is beyond a weapon's maxRange.
 * 'Special' maxRange (missiles, sandcaster) is never out of range.
 * // MgT2e CRB p.167 — "cannot attack targets beyond listed Range Band"
 * @param {string} maxRange        Weapon's maximum range band
 * @param {string} currentRangeBand  Actual range band to the target
 * @returns {boolean}
 */
export function isOutOfRange(maxRange, currentRangeBand) {
  if (!maxRange || maxRange === 'Special') return false
  return RANGE_ORDER.indexOf(currentRangeBand) > RANGE_ORDER.indexOf(maxRange)
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
 * Effective thrust ceiling given current Ion Power reduction.
 * Linear scaling: floor(baseThrust × currentPower / maxPower).
 * Returns baseThrust unchanged when maxPower is 0 or falsy (not tracked).
 * // HG p.30 — Ion reduces Power; T&D maps Power → Thrust proportionally (design decision)
 * @param {number} baseThrust
 * @param {number} currentPower
 * @param {number} maxPower
 * @returns {number}
 */
export function computeIonThrustEffect(baseThrust, currentPower, maxPower) {
  if (!maxPower || maxPower <= 0) return baseThrust
  return Math.min(baseThrust, Math.floor(baseThrust * Math.max(0, currentPower) / maxPower))
}

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

// === MISSILES ===

/**
 * Count missile (non-torpedo) ammo capacity across all turrets.
 * Missile Rack: 12 rounds each. Missile Barbette: 25 rounds.
 * Torpedo ammo is tracked separately — see countTorpedoAmmoCapacity.
 * // MgT2e CRB p.162, HG p.30–31
 * @param {{ turrets?: Array<{ weapons: string[] }> }} profile
 * @returns {number}
 */
export function countMissileAmmoCapacity(profile) {
  const all = (profile.turrets ?? []).flatMap((t) => t.weapons)
  return (
    all.filter((w) => w === 'Missile Rack').length * 12 +
    all.filter((w) => w === 'Missile Barbette').length * 25
  )
}

/**
 * Count torpedo ammo capacity across all turrets.
 * Each Torpedo weapon holds 3 rounds — HG p.31 (3 per barbette).
 * @param {{ turrets?: Array<{ weapons: string[] }> }} profile
 * @returns {number}
 */
export function countTorpedoAmmoCapacity(profile) {
  const all = (profile.turrets ?? []).flatMap((t) => t.weapons)
  return all.filter((w) => w === 'Torpedo').length * 3
}

/** @deprecated Use countMissileAmmoCapacity */
export function countMissileRacks(profile) {
  return countMissileAmmoCapacity(profile)
}

/**
 * Count total sandcaster canister capacity across all turrets.
 * 20 canisters per sandcaster weapon slot. // MgT2e HG p.28
 * @param {{ turrets?: Array<{ weapons: string[] }> }} profile
 * @returns {number}
 */
export function countSandcasters(profile) {
  return (profile.turrets ?? []).flatMap((t) => t.weapons).filter((w) => w === 'Sandcaster').length * 20
}

// === EVASIVE ACTION ===

/**
 * Calculate the evasive action DM imposed on attackers.
 * The pilot declares N thrust points reserved for evasion.
 * DM is fixed at −pilotSkill per dodged attack; thrust determines how many attacks can be dodged, not the magnitude.
 * // MgT2e CRB p.171 — Evasive Action: "DM negativo pari al livello di Pilot skill del pilota (fisso — non si moltiplica per il Thrust speso)"
 * @param {number} pilotSkill
 * @param {number} evasiveThrust  Thrust points declared for evasion (≥1 = evasion active)
 * @returns {number}  Negative DM to apply to a single dodged attack
 */
export function getEvasiveDM(pilotSkill, evasiveThrust) {
  if (evasiveThrust <= 0 || pilotSkill === 0) return 0
  return -pilotSkill
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

/**
 * Compute the severity of a critical hit from the attack Effect.
 * Severity = Effect − 5, clamped to 1–6.
 * // MgT2e CRB p.169
 * @param {number} effect  Attack effect (total − 8)
 * @returns {number}  1–6
 */
export function getCriticalSeverity(effect) {
  return Math.max(1, Math.min(6, effect - 5))
}

/**
 * Count how many 10%-threshold criticals a damage event triggers.
 * Each full 10%-of-maxHull chunk newly crossed triggers one Severity-1 critical.
 * // MgT2e CRB p.169 — Sustained Damage
 * @param {number} prevHull
 * @param {number} newHull
 * @param {number} maxHull
 * @returns {number}
 */
export function getThresholdCriticalCount(prevHull, newHull, maxHull) {
  if (maxHull <= 0 || newHull >= prevHull) return 0
  const threshold = maxHull * 0.1
  const prevCrossed = Math.floor((maxHull - prevHull) / threshold)
  const newCrossed  = Math.floor((maxHull - newHull)  / threshold)
  return Math.max(0, newCrossed - prevCrossed)
}

/**
 * Parse the AP (Armor Piercing) value from a weapon's traits array.
 * // MgT2e HG p.28 — "subtract AP value from effective armour before damage"
 * @param {string[]} traits  e.g. ['AP 4', 'Radiation']
 * @returns {number}  AP reduction (0 if trait absent)
 */
export function getApValue(traits) {
  for (const t of traits) {
    const m = t.match(/^AP\s+(\d+)$/)
    if (m) return parseInt(m[1], 10)
  }
  return 0
}

// === MISSILE IMPACT ===

/**
 * Compute the total attack DM for a missile salvo impact roll.
 * DM+1/missile (salvo size) + DM+2 (Smart trait, requires launcher TL 9+) − Pilot (evasive action).
 *
 * Smart guidance requires TL9+ on the firing ship (CRB p.79). All missile/torpedo weapons
 * carry the Smart trait in the weapon table, but the trait is only active when the launcher's
 * tech level meets the threshold. This avoids giving anachronistic DMs to pre-TL9 vessels.
 *
 * // MgT2e CRB p.173 (IMPACT), p.79 (Smart trait)
 * @param {number}  count         Missiles remaining in salvo
 * @param {boolean} hasSmart      True if launcher ship TL ≥ 9 (default true for safety)
 * @param {number}  evasivePilot  Pilot skill of evading target (0 = not evading)
 * @returns {number}
 */
export function computeMissileAttackDM(count, hasSmart = true, evasivePilot = 0) {
  return count + (hasSmart ? 2 : 0) - evasivePilot   // salvoSize + Smart − evasive
}

/**
 * Compute net missile salvo damage per CRB p.173 IMPACT formula.
 * A successful attack (effect ≥ 0) always multiplies by at least 1 —
 * Effect 0 is a hit, not a miss; multiplying by 0 makes no mechanical sense.
 * // MgT2e CRB p.173
 * @param {number} roll    Damage roll for one missile/torpedo
 * @param {number} armour  Target armour value
 * @param {number} effect  Attack Effect (total − 8), must be ≥ 0
 * @param {number} count   Number of missiles/torpedoes in salvo
 * @returns {number}
 */
export function computeMissileImpactDamage(roll, armour, effect, count) {
  return Math.max(0, roll - armour) * Math.max(1, Math.min(effect, count))
}

/**
 * Map the Effect of the first check in a task chain to the DM granted to the next check.
 * // MgT2e CRB p.63 — Task Chains table
 * @param {number} effect  Effect of the preceding check (total − difficulty)
 * @returns {number}  DM applied to the linked check (negative on failure)
 */
export function taskChainDM(effect) {
  if (effect <= -6) return -3
  if (effect <= -2) return -2   // Effect -2 to -5
  if (effect < 0)   return -1   // Effect -1
  if (effect === 0) return 1
  if (effect <= 5)  return 2
  return 3
}
