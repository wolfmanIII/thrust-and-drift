/**
 * Custom weapon/ordnance overrides (GitHub #21, iteration 1).
 * Turret slots may carry a sparse `weaponOverrides` map keyed by the
 * positional index into `turret.weapons[]`, overriding only cosmetic
 * fields (label, notes) and damage (damageDice, damageBonus) on top of
 * the base `WEAPONS` entry. Range, salvo, ammo, and traits are untouched
 * in this iteration — see issue #21 for the full proposal.
 */

import { WEAPONS } from '../data/weapons.js'

/**
 * Resolve the effective weapon definition for a turret slot, merging any
 * GM override on top of the base `WEAPONS` entry.
 * @param {string} weaponName  Base weapon key (turret.weapons[index])
 * @param {{label?: string, damageDice?: number, damageBonus?: number, notes?: string}|undefined} override
 * @returns {object|null}  Merged weapon def, or null if weaponName is not a known base weapon
 */
export function resolveWeapon(weaponName, override) {
  const base = WEAPONS[weaponName] ?? null
  if (!base) return null
  if (!override) return base
  return { ...base, ...override }
}

/**
 * Resolve the effective weapon definition for a specific weapon slot within a turret.
 * @param {{weapons: string[], weaponOverrides?: Record<number, object>}} turret
 * @param {number} index  Positional index into turret.weapons
 * @returns {object|null}
 */
export function resolveTurretWeapon(turret, index) {
  return resolveWeapon(turret.weapons[index], turret.weaponOverrides?.[index])
}
