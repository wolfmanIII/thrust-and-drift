/**
 * Weapon definitions for Mongoose Traveller 2e space combat.
 * // MgT2e CRB p.167–168 — Spacecraft Weapons table + Common Modifiers
 * // MgT2e High Guard p.28 — Turret Weapons table
 *
 * Each weapon entry defines:
 *   - id:         Unique key (matches WeaponType union)
 *   - label:      Display name
 *   - attackDM:   Inherent attack roll modifier (CRB p.167 Common Modifiers)
 *   - damageDice: Number of D6 rolled for damage
 *   - damageBonus: Flat bonus added to damage (from Effect, handled separately)
 *   - maxRange:   Maximum range band — cannot attack beyond this (CRB p.167: "cannot attack targets beyond listed Range Band")
 *                 'Special' = no hard cap (missiles, sandcaster)
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
    attackDM: 2,       // CRB p.167 Common Modifiers
    damageDice: 2,     // HG p.28, CRB p.168
    damageBonus: 0,
    maxRange: 'Long',  // HG p.28, CRB p.168
    traits: [],
    turretOnly: false,
    bayOnly: false,
    notes: 'Standard offensive laser. Short-duration pulses.',
  },
  'Beam Laser': {
    id: 'Beam Laser',
    label: 'Beam Laser',
    attackDM: 4,         // CRB p.167 Common Modifiers
    damageDice: 1,       // HG p.28, CRB p.168
    damageBonus: 0,
    maxRange: 'Medium',  // HG p.28, CRB p.168 — shorter ranged than Pulse
    traits: [],
    turretOnly: false,
    bayOnly: false,
    notes: 'Higher accuracy, lower damage. Shorter range than Pulse Laser.',
  },
  'Missile Rack': {
    id: 'Missile Rack',
    label: 'Missile Rack',
    attackDM: 0,
    damageDice: 4,        // HG p.28, CRB p.168
    damageBonus: 0,
    maxRange: 'Special',  // Guided — no hard range cap
    traits: ['Smart'],
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
    maxRange: 'Special',  // Defensive — range not applicable
    traits: ['Defensive'],
    turretOnly: false,
    bayOnly: false,
    notes: 'Defensive only. Provides Armor +1D vs lasers per sandcaster firing.',
  },
  'Particle Beam': {
    id: 'Particle Beam',
    label: 'Particle Beam',
    attackDM: 0,
    damageDice: 3,          // HG p.28
    damageBonus: 0,
    maxRange: 'Very Long',  // HG p.28, CRB p.168
    traits: ['Radiation'],  // HG p.28 — turret version has no AP (only Particle Barbette does)
    turretOnly: false,
    bayOnly: false,
    notes: 'Radiation trait causes crew damage on critical hits.',
  },
  'Railgun': {
    id: 'Railgun',
    label: 'Railgun',
    attackDM: 0,
    damageDice: 2,       // HG p.28
    damageBonus: 0,
    maxRange: 'Short',   // HG p.28 — short-range kinetic weapon
    traits: ['AP 4'],    // HG p.28
    turretOnly: false,
    bayOnly: false,
    notes: 'Kinetic weapon. AP 4. Effective only at Short range and closer.',
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
