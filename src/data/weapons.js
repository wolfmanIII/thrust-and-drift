/**
 * Weapon definitions for Mongoose Traveller 2e space combat.
 * // MgT2e CRB p.164–165 — Spacecraft Weapons table
 * // MgT2e High Guard p.42–55 — Extended weapon options
 *
 * Each weapon entry defines:
 *   - id:         Unique key (matches WeaponType union)
 *   - label:      Display name
 *   - attackDM:   Inherent attack roll modifier
 *   - damageDice: Number of D6 rolled for damage
 *   - damageBonus: Flat bonus added to damage (from Effect, handled separately)
 *   - traits:     Array of special rules strings
 *   - turretOnly: true if cannot be installed in a bay
 *   - bayOnly:    true if bay weapon only
 *   - notes:      Short rule clarification
 */

/** @typedef {'Pulse Laser'|'Beam Laser'|'Missile Rack'|'Sandcaster'|'Particle Beam'|'Railgun'} WeaponType */

/**
 * Weapon stat table.
 * // MgT2e CRB p.164
 * @type {Record<WeaponType, object>}
 */
export const WEAPONS = {
  'Pulse Laser': {
    id: 'Pulse Laser',
    label: 'Pulse Laser',
    attackDM: 2,
    damageDice: 2,
    damageBonus: 0,
    traits: [],
    turretOnly: false,
    bayOnly: false,
    notes: 'Standard offensive laser. Short-duration pulses.',
  },
  'Beam Laser': {
    id: 'Beam Laser',
    label: 'Beam Laser',
    attackDM: 4,
    damageDice: 1,
    damageBonus: 0,
    traits: [],
    turretOnly: false,
    bayOnly: false,
    notes: 'Higher accuracy, lower damage. Sustained beam.',
  },
  'Missile Rack': {
    id: 'Missile Rack',
    label: 'Missile Rack',
    attackDM: 0,
    damageDice: 2,
    damageBonus: 0,
    traits: ['Smart', 'AP 0'],
    turretOnly: false,
    bayOnly: false,
    notes: 'Guided munitions. Each missile in the salvo rolls damage independently.',
  },
  'Sandcaster': {
    id: 'Sandcaster',
    label: 'Sandcaster',
    attackDM: 0,
    damageDice: 0,
    damageBonus: 0,
    traits: ['Defensive'],
    turretOnly: false,
    bayOnly: false,
    notes: 'Defensive only. Provides Armor +1D vs lasers per sandcaster firing.',
  },
  'Particle Beam': {
    id: 'Particle Beam',
    label: 'Particle Beam',
    attackDM: 0,
    damageDice: 3,
    damageBonus: 0,
    traits: ['Radiation', 'AP'],
    turretOnly: false,
    bayOnly: false,
    notes: 'Ignores standard armor. Radiation trait causes crew damage on critical hits.',
  },
  'Railgun': {
    id: 'Railgun',
    label: 'Railgun',
    attackDM: 0,
    damageDice: 4,
    damageBonus: 0,
    traits: ['AP'],
    turretOnly: false,
    bayOnly: false,
    notes: 'Kinetic weapon. Ignores screens. High damage, no range DM penalty at Long.',
  },
}

/**
 * Ordered list of all available weapon IDs for UI iteration.
 * @type {WeaponType[]}
 */
export const WEAPON_IDS = Object.keys(WEAPONS)

/**
 * Weapons that have a defensive function only (cannot attack).
 * @type {WeaponType[]}
 */
export const DEFENSIVE_WEAPONS = Object.values(WEAPONS)
  .filter(w => w.traits.includes('Defensive'))
  .map(w => w.id)
