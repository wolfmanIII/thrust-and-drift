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

/**
 * Resolve the effective weapon definition for a turret slot by weapon NAME
 * rather than index — used wherever selection is (turretSlot, weaponName)
 * pairs, not positional indices (the current selection model everywhere
 * except `weaponOverrides` itself).
 *
 * The override is applied only if `weaponName` occurs exactly once in
 * `turret.weapons`. CRB p.168 (Double and Triple Turrets): weapons of the
 * "same type" fire linked with a combined damage bonus — an override makes
 * an instance mechanically distinct from its unmodified siblings, so when
 * the name is ambiguous (2+ occurrences) applying it would either break
 * that linking or silently apply it to the wrong physical weapon. Falling
 * back to the base def in that case guarantees linking is only ever
 * computed over identical, unmodified weapons — matching the RAW.
 * @param {{weapons: string[], weaponOverrides?: Record<number, object>}} turret
 * @param {string} weaponName
 * @returns {object|null}
 */
export function resolveWeaponForSlot(turret, weaponName) {
  let matchIndex = -1
  let matchCount = 0
  for (let i = 0; i < turret.weapons.length; i++) {
    if (turret.weapons[i] === weaponName) {
      matchIndex = i
      matchCount++
    }
  }
  if (matchCount !== 1) return WEAPONS[weaponName] ?? null
  return resolveTurretWeapon(turret, matchIndex)
}
