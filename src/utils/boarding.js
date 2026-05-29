/**
 * Boarding system utility functions.
 * Implements the boarding action mechanics for Thrust & Drift.
 * @see High Guard Update 2022 pp.125–135
 * @see MgT2e CRB p.175 (abstract resolution, not used here)
 */

import { roll2D6 } from './dice.js'

// ---------------------------------------------------------------------------
// Entry methods — Fase 2 Contatto
// HG 2022 pp.127–130
// ---------------------------------------------------------------------------

/** @type {Record<string, { label: string, check: string|null, difficulty: number|null, time: string, dm: number, decompression: boolean }>} */
export const ENTRY_METHODS = {
  airlock_voluntary: {
    label:         'Airlock (cooperativo)',
    check:         null,
    difficulty:    null,
    time:          'Istantaneo',
    dm:            0,
    decompression: false,
  },
  airlock_forced: {
    label:         'Airlock (forzato)',
    check:         'Mechanic (STR)',
    difficulty:    14,   // Formidable
    time:          '2D round + 1D per apertura',
    dm:            0,
    decompression: false,
  },
  maintenance_hatch: {
    label:         'Portellone/Manutenzione',
    check:         'Mechanic (STR)',
    difficulty:    12,   // Very Difficult
    time:          '2D round',
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
    time:          'Immediato se successo',
    dm:            2,    // DM +2 ai check Contatto successivi
    decompression: false,
  },
  hull_cut: {
    label:         'Taglio scafo',
    check:         'Mechanic (DEX)',
    difficulty:    8,    // Average per round
    time:          'Per round (riduce Resilienza)',
    dm:            0,
    decompression: true,
  },
}

// ---------------------------------------------------------------------------
// Cutting tools — Fase 2 Taglio scafo
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
// Hull resilience — Fase 2 Taglio scafo
// HG 2022 p.130 (tabella Resilienza componenti nave)
// ---------------------------------------------------------------------------

/**
 * Returns block (deny access) and breach (passable hole) resilience values
 * for a hull component, adjusted for ship armor.
 * @param {'portello'|'airlock'|'scafo'} component
 * @param {number} armor
 * @param {boolean} [armored=false]  true if component has armor plating
 * @returns {{ block: number, breach: number }}
 */
export function getHullResilience(component, armor, armored = false) {
  switch (component) {
    case 'portello':
      return armored
        ? { block: 6  + armor,       breach: 25  + armor }
        : { block: 4,                breach: 15 }
    case 'airlock':
      return armored
        ? { block: 10 + armor,       breach: 35  + armor }
        : { block: 6,                breach: 25 }
    case 'scafo':
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
// Stacking check — Fase 3 Conflitto
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
// Missed shot table — Fase 3 Conflitto
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
    label   = 'Colpisce membro casuale — squadra ATTACCANTE (8+)'
  } else if (modified <= 5) {
    outcome = 'defender_hit'
    label   = 'Colpisce membro casuale — squadra DIFENSORE (8+)'
  } else if (modified <= 8) {
    outcome = 'minor_system'
    label   = 'Sistema minore danneggiato (luci, controllo porta, ecc.)'
  } else if (modified <= 10) {
    outcome = 'no_effect'
    label   = 'Nessun danno critico (mobili, pannello non critico)'
  } else {
    outcome = 'critical_system'
    label   = 'Sistema critico danneggiato (airlock, tubazione carburante, consolle)'
  }

  return { results: roll.results, modified, outcome, label }
}

// ---------------------------------------------------------------------------
// Boarding DM helpers — Fase 2 + 3
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
