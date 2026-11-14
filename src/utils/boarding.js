/**
 * Boarding system utility functions.
 * Implements the boarding action mechanics for Thrust & Drift.
 * @see High Guard Update 2022 pp.125–135
 * @see MgT2e CRB p.175 (abstract resolution, not used here)
 */

import { roll2D6, rollDice } from './dice.js'

// ---------------------------------------------------------------------------
// Entry methods — Phase 2 Contact
// HG 2022 pp.127–130
// ---------------------------------------------------------------------------

/** @type {Record<string, { label: string, check: string|null, difficulty: number|null, time: string, dm: number, decompression: boolean }>} */
export const ENTRY_METHODS = {
  airlock_voluntary: {
    label:         'Airlock (cooperative)',
    check:         null,
    difficulty:    null,
    time:          'Instant',
    dm:            0,
    decompression: false,
  },
  airlock_forced: {
    label:         'Airlock (forced)',
    check:         'Mechanic (STR)',
    difficulty:    14,   // Formidable
    time:          '2D rounds + 1D to open',
    dm:            0,
    decompression: false,
  },
  maintenance_hatch: {
    label:         'Maintenance Hatch',
    check:         'Mechanic (STR)',
    difficulty:    12,   // Very Difficult
    time:          '2D rounds',
    dm:            0,
    decompression: true,
  },
  breaching_tube: {
    label:         'Breaching Tube',
    check:         null,
    difficulty:    null,
    time:          '< 2 min',
    dm:            0,
    decompression: false,
  },
  forced_linkage: {
    label:         'Forced Linkage Apparatus',
    check:         'Pilot (DEX)',
    difficulty:    8,    // Average
    time:          'Immediate on success',
    dm:            2,    // DM +2 to subsequent Contact checks
    decompression: false,
  },
  hull_cut: {
    label:         'Hull Cut',
    check:         'Mechanic (DEX)',
    difficulty:    8,    // Average per round
    time:          'Per round (reduces Resilience)',
    dm:            0,
    decompression: true,
  },
}

// ---------------------------------------------------------------------------
// Cutting tools — Phase 2 Hull Cut
// HG 2022 p.129 (tabella strumenti da taglio)
// ---------------------------------------------------------------------------

/** @type {Record<string, { label: string, tl: number, cutRate: number }>} */
export const CUT_TOOLS = {
  emergency: { label: 'Emergency Cutter',   tl: 10, cutRate: 1 },
  rescue:    { label: 'Rescue Cutter',       tl:  9, cutRate: 3 },
  heavy:     { label: 'Heavy-Duty Cutter',  tl: 11, cutRate: 6 },
  assault:   { label: 'Assault Cutter',      tl: 12, cutRate: 8 },
}

// ---------------------------------------------------------------------------
// Hull resilience — Phase 2 Hull Cut
// HG 2022 p.130 (ship component resilience table)
// ---------------------------------------------------------------------------

/**
 * Returns block (deny access) and breach (passable hole) resilience values
 * for a hull component, adjusted for ship armor.
 * @param {'hatch'|'airlock'|'hull'} component
 * @param {number} armor
 * @param {boolean} [armored=false]  true if component has armor plating
 * @returns {{ block: number, breach: number }}
 */
export function getHullResilience(component, armor, armored = false) {
  switch (component) {
    case 'hatch':
      return armored
        ? { block: 6  + armor,       breach: 25  + armor }
        : { block: 4,                breach: 15 }
    case 'airlock':
      return armored
        ? { block: 10 + armor,       breach: 35  + armor }
        : { block: 6,                breach: 25 }
    case 'hull':
      return armored
        ? { block: 100 + armor * 10, breach: 400 + armor * 20 }
        : { block: 50,               breach: 250 }
    default:
      return { block: 4, breach: 15 }
  }
}

/**
 * Compute damage dealt by one cutting round.
 * @param {string} toolKey  key from CUT_TOOLS
 * @param {number} effect   check Effect (total − difficulty)
 * @returns {number}
 */
export function cuttingDamage(toolKey, effect) {
  const tool = CUT_TOOLS[toolKey]
  if (!tool) return 0
  return tool.cutRate + Math.max(0, effect)
}

// ---------------------------------------------------------------------------
// Stacking check — Phase 3 Conflict
// HG 2022 p.131
// ---------------------------------------------------------------------------

/**
 * Roll stacking check to target someone beyond the first in a corridor.
 * @returns {{ results: number[], total: number, success: boolean }}
 */
export function rollStackingCheck() {
  const roll = roll2D6()
  return { ...roll, success: roll.total >= 10 }
}

// ---------------------------------------------------------------------------
// Missed shot table — Phase 3 Conflict
// HG 2022 p.132
// ---------------------------------------------------------------------------

/**
 * @typedef {'attacker_hit'|'defender_hit'|'minor_system'|'no_effect'|'critical_system'} MissedShotResult
 */

/**
 * Roll on the missed-shot table and return the result category.
 * @param {boolean} [armoredBulkhead=false]  DM −1 from armored bulkhead (HG p.43)
 * @returns {{ results: number[], modified: number, outcome: MissedShotResult, label: string }}
 */
export function rollMissedShot(armoredBulkhead = false) {
  const roll     = roll2D6()
  const modified = roll.total + (armoredBulkhead ? -1 : 0)

  let outcome
  let label
  if (modified <= 3) {
    outcome = 'attacker_hit'
    label   = 'Hits random member — ATTACKER squad (8+ to hit)'
  } else if (modified <= 5) {
    outcome = 'defender_hit'
    label   = 'Hits random member — DEFENDER squad (8+ to hit)'
  } else if (modified <= 8) {
    outcome = 'minor_system'
    label   = 'Minor system damaged (lights, door controls, etc.)'
  } else if (modified <= 10) {
    outcome = 'no_effect'
    label   = 'No critical damage (furniture, non-critical panel)'
  } else {
    outcome = 'critical_system'
    label   = 'Critical system hit (airlock, fuel line, command console)'
  }

  return { results: roll.results, modified, outcome, label }
}

// ---------------------------------------------------------------------------
// Boarding DM helpers — Phase 2 + 3
// HG 2022 pp.128–131
// ---------------------------------------------------------------------------

/**
 * Aggregate contact-phase DM from boarding state.
 * @param {{ forcedLinkage: boolean, defenderRotating: boolean }} boarding
 * @returns {number}
 */
export function getContactDM(boarding) {
  let dm = 0
  if (boarding.forcedLinkage)    dm += 2   // HG p.128 — forced linkage apparatus
  if (boarding.defenderRotating) dm -= 1   // HG p.128 — tumbling ship
  return dm
}

/**
 * Weapon DM in tight shipboard spaces.
 * @param {'rifle'|'heavy'|'other'} weaponClass
 * @returns {number}
 */
export function getWeaponSpaceDM(weaponClass) {
  // HG 2022 p.131
  if (weaponClass === 'rifle') return -2
  if (weaponClass === 'heavy') return -4
  return 0
}

// ---------------------------------------------------------------------------
// Sandcaster canisters vs. boarding parties — Phase 2 Contact
// ---------------------------------------------------------------------------

/**
 * Canister rounds a sandcaster can direct at an incoming boarding party.
 * Damage is Ground scale (not multiplied by the Spacecraft scale) and is rolled
 * once for each target in the party.
 * `multiplier` is the Destructive (DD) ×10 applied to the total rolled.
 * @type {Record<'sand'|'pebble', { label: string, diceCount: number, multiplier: number, source: string }>}
 */
export const BOARDER_CANISTERS = {
  // MgT2e CRB p.171 — Disperse Sand: "each target in the boarding party suffers 8D point of damage at Ground scale (so do not multiply it)"
  sand:   { label: 'Sand',   diceCount: 8, multiplier: 1,  source: 'CRB p.171' },
  // MgT2e HG p.38 — Pebble Canister: "1DD damage (Ground scale)"; CRB p.78 — Destructive multiplies the total rolled by 10
  pebble: { label: 'Pebble', diceCount: 1, multiplier: 10, source: 'HG p.38, CRB p.78' },
}

/**
 * Gunner (turret) check against an incoming boarding party: 2D6 + Gunner ≥ 8 (Average).
 * Difficulty is not stated for this use of Disperse Sand; Average matches the laser reaction.
 * // MgT2e CRB p.171
 * @param {number} diceTotal  2D6 total
 * @param {number} gunnerSkill
 * @returns {{ total: number, effect: number, success: boolean }}
 */
export function resolveBoarderCanisterCheck(diceTotal, gunnerSkill) {
  const total  = diceTotal + gunnerSkill
  const effect = total - 8
  return { total, effect, success: effect >= 0 }
}

/**
 * Roll Ground-scale canister damage for one target in the boarding party.
 * @param {'sand'|'pebble'} type
 * @param {(n: number, sides: number) => { results: number[], total: number }} [rng]  injectable for tests
 * @returns {{ results: number[], total: number, damage: number }}
 */
export function rollBoarderCanisterDamage(type, rng = rollDice) {
  const canister = BOARDER_CANISTERS[type]
  if (!canister) throw new Error(`Unknown boarder canister type: ${type}`)
  const { results, total } = rng(canister.diceCount, 6)
  return { results, total, damage: total * canister.multiplier }
}
