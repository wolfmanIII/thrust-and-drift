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

/** @typedef {'Pulse Laser'|'Beam Laser'|'Missile Rack'|'Sandcaster'|'Particle Beam'|'Railgun'|'Fusion Gun'|'Plasma Gun'|'Pulse Laser Barbette'|'Beam Laser Barbette'|'Particle Barbette'|'Fusion Barbette'|'Plasma Barbette'|'Railgun Barbette'|'Missile Barbette'|'Torpedo'|'Ion Cannon'|'Ion Cannon Bay (Small)'|'Ion Cannon Bay (Medium)'|'Ion Cannon Bay (Large)'} WeaponType */

/**
 * Weapon stat table.
 * // MgT2e CRB p.164
 * @type {Record<WeaponType, object>}
 */
export const WEAPONS = {
  'Pulse Laser': {
    id: 'Pulse Laser',
    label: 'Pulse Laser',
    attackDM: 2,          // CRB p.167 Common Modifiers
    damageDice: 2,        // HG p.28, CRB p.168
    damageBonus: 0,
    maxRange: 'Long',     // HG p.28, CRB p.168
    damageMultiple: 1,
    traits: [],
    mount: 'turret',
    turretOnly: false,
    bayOnly: false,
    notes: 'Standard offensive laser. Short-duration pulses.',
  },
  'Beam Laser': {
    id: 'Beam Laser',
    label: 'Beam Laser',
    attackDM: 4,           // CRB p.167 Common Modifiers
    damageDice: 1,         // HG p.28, CRB p.168
    damageBonus: 0,
    maxRange: 'Medium',    // HG p.28, CRB p.168 — shorter ranged than Pulse
    damageMultiple: 1,
    traits: [],
    mount: 'turret',
    turretOnly: false,
    bayOnly: false,
    notes: 'Higher accuracy, lower damage. Shorter range than Pulse Laser.',
  },
  'Missile Rack': {
    id: 'Missile Rack',
    label: 'Missile Rack',
    attackDM: 0,
    damageDice: 4,         // HG p.28, CRB p.168
    damageBonus: 0,
    maxRange: 'Special',   // Guided — no hard range cap
    damageMultiple: 1,
    traits: ['Smart'],
    mount: 'turret',
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
    maxRange: 'Special',   // Defensive — range not applicable
    damageMultiple: 1,
    traits: ['Defensive'],
    mount: 'turret',
    turretOnly: false,
    bayOnly: false,
    notes: 'Defensive only. Provides Armor +1D vs lasers per sandcaster firing.',
  },
  'Particle Beam': {
    id: 'Particle Beam',
    label: 'Particle Beam',
    attackDM: 0,
    damageDice: 3,           // HG p.28
    damageBonus: 0,
    maxRange: 'Very Long',   // HG p.28, CRB p.168
    damageMultiple: 1,
    traits: ['Radiation'],   // HG p.28 — turret version has no AP (only Particle Barbette does)
    mount: 'turret',
    turretOnly: false,
    bayOnly: false,
    notes: 'Radiation trait causes crew damage on critical hits.',
  },
  'Railgun': {
    id: 'Railgun',
    label: 'Railgun',
    attackDM: 0,
    damageDice: 2,         // HG p.28
    damageBonus: 0,
    maxRange: 'Short',     // HG p.28 — short-range kinetic weapon
    damageMultiple: 1,
    traits: ['AP 4'],      // HG p.28
    mount: 'turret',
    turretOnly: false,
    bayOnly: false,
    notes: 'Kinetic weapon. AP 4. Effective only at Short range and closer.',
  },
  'Fusion Gun': {
    id: 'Fusion Gun',
    label: 'Fusion Gun',
    attackDM: 0,
    damageDice: 4,           // HG p.28
    damageBonus: 0,
    maxRange: 'Medium',      // HG p.28
    damageMultiple: 1,
    traits: ['Radiation'],   // HG p.28
    mount: 'turret',
    turretOnly: false,
    bayOnly: false,
    notes: 'Radiation trait: crew damage on critical hits.',
  },
  'Plasma Gun': {
    id: 'Plasma Gun',
    label: 'Plasma Gun',
    attackDM: 0,
    damageDice: 3,         // HG p.28
    damageBonus: 0,
    maxRange: 'Medium',    // HG p.28
    damageMultiple: 1,
    traits: [],
    mount: 'turret',
    turretOnly: false,
    bayOnly: false,
    notes: 'High-energy plasma stream.',
  },

  'Ion Cannon': {
    id: 'Ion Cannon',
    label: 'Ion Cannon',
    attackDM: 0,
    damageDice: 2,           // HG p.30 — 2D, explicit ×10 in Damage column
    damageBonus: 0,
    maxRange: 'Medium',      // HG p.30
    damageMultiple: 10,      // 2D × 10 — overrides standard barbette ×3. // HG p.30
    traits: ['Ion'],
    mount: 'barbette',
    turretOnly: false,
    bayOnly: false,
    ignoresArmour: true,     // HG p.30 — Ion bypasses armour
    notes: 'No hull damage. Roll 2D×10 ignoring armour; deduct from target Power + bandwidth. Duration: 1 round (D3 if Effect ≥ 6). // HG p.30, FAQ HG 2022 p.1',
  },
  'Ion Cannon Bay (Small)': {
    id: 'Ion Cannon Bay (Small)',
    label: 'Ion Cannon Bay (S)',
    attackDM: 0,
    damageDice: 6,           // HG p.32
    damageBonus: 0,
    maxRange: 'Medium',      // HG p.32
    damageMultiple: 10,      // Small Bay damage multiple. // HG p.31
    traits: ['Ion'],
    mount: 'bay',
    barbetteOnly: false,
    turretOnly: false,
    bayOnly: true,
    ignoresArmour: true,
    notes: 'No hull damage. Roll 6D×10 ignoring armour; deduct from target Power + bandwidth. Duration: 1 round (D3 if Effect ≥ 6). // HG p.32, FAQ HG 2022 p.1',
  },
  'Ion Cannon Bay (Medium)': {
    id: 'Ion Cannon Bay (Medium)',
    label: 'Ion Cannon Bay (M)',
    attackDM: 0,
    damageDice: 8,           // HG p.33
    damageBonus: 0,
    maxRange: 'Medium',      // HG p.33
    damageMultiple: 20,      // Medium Bay damage multiple. // HG p.31
    traits: ['Ion'],
    mount: 'bay',
    barbetteOnly: false,
    turretOnly: false,
    bayOnly: true,
    ignoresArmour: true,
    notes: 'No hull damage. Roll 8D×20 ignoring armour; deduct from target Power + bandwidth. Duration: 1 round (D3 if Effect ≥ 6). // HG p.33, FAQ HG 2022 p.1',
  },
  'Ion Cannon Bay (Large)': {
    id: 'Ion Cannon Bay (Large)',
    label: 'Ion Cannon Bay (L)',
    attackDM: 0,
    damageDice: 10,          // HG p.33
    damageBonus: 0,
    maxRange: 'Long',        // HG p.33
    damageMultiple: 100,     // Large Bay damage multiple. // HG p.31
    traits: ['Ion'],
    mount: 'bay',
    barbetteOnly: false,
    turretOnly: false,
    bayOnly: true,
    ignoresArmour: true,
    notes: 'No hull damage. Roll 10D×100 ignoring armour; deduct from target Power + bandwidth. Duration: 1 round (D3 if Effect ≥ 6). // HG p.33, FAQ HG 2022 p.1',
  },
  'Torpedo': {
    id: 'Torpedo',
    label: 'Torpedo',
    attackDM: 0,
    damageDice: 6,         // HG p.30 — 6D per torpedo
    damageBonus: 0,
    maxRange: 'Special',   // Guided — no range cap
    damageMultiple: 1,
    traits: ['Smart'],
    mount: 'barbette',
    turretOnly: false,
    bayOnly: false,
    notes: 'Heavy anti-ship guided munition. 3 per barbette, no reload. // HG p.30–31',
  },
  'Missile Barbette': {
    id: 'Missile Barbette',
    label: 'Missile Barbette',
    attackDM: 0,
    damageDice: 4,          // HG p.30 — 4D per missile, same as Missile Rack
    damageBonus: 0,
    maxRange: 'Special',    // Guided — no range cap
    damageMultiple: 1,      // missile damage is per-missile, not multiplied
    traits: ['Smart'],
    mount: 'barbette',
    turretOnly: false,
    bayOnly: false,
    notes: 'Fixed salvo of 5 missiles. Holds 25 total (5 salvos). // HG p.30–31',
  },

  // ── Barbettes (HG p.30) ────────────────────────────────────────────────────
  // damageMultiple: 3 — applied after armour subtraction. // HG p.29

  'Pulse Laser Barbette': {
    id: 'Pulse Laser Barbette',
    label: 'Pulse Laser Barbette',
    attackDM: 2,          // HG p.31
    damageDice: 3,        // HG p.30
    damageBonus: 0,
    maxRange: 'Long',     // HG p.30
    damageMultiple: 3,
    traits: [],
    mount: 'barbette',
    turretOnly: false,
    bayOnly: false,
    notes: 'Barbette: (3D + Effect − Armour) × 3. Cannot be used for Point Defence.',
  },
  'Beam Laser Barbette': {
    id: 'Beam Laser Barbette',
    label: 'Beam Laser Barbette',
    attackDM: 4,           // HG p.30
    damageDice: 2,         // HG p.30
    damageBonus: 0,
    maxRange: 'Medium',    // HG p.30
    damageMultiple: 3,
    traits: [],
    mount: 'barbette',
    turretOnly: false,
    bayOnly: false,
    notes: 'Barbette: (2D + Effect − Armour) × 3. Cannot be used for Point Defence.',
  },
  'Particle Barbette': {
    id: 'Particle Barbette',
    label: 'Particle Barbette',
    attackDM: 0,
    damageDice: 4,           // HG p.30
    damageBonus: 0,
    maxRange: 'Very Long',   // HG p.30
    damageMultiple: 3,
    traits: ['Radiation'],
    mount: 'barbette',
    turretOnly: false,
    bayOnly: false,
    notes: 'Barbette: (4D + Effect − Armour) × 3. Radiation trait.',
  },
  'Fusion Barbette': {
    id: 'Fusion Barbette',
    label: 'Fusion Barbette',
    attackDM: 0,
    damageDice: 5,         // HG p.30
    damageBonus: 0,
    maxRange: 'Medium',    // HG p.30
    damageMultiple: 3,
    traits: ['AP 3', 'Radiation'],
    mount: 'barbette',
    turretOnly: false,
    bayOnly: false,
    notes: 'Barbette: (5D + Effect − Armour) × 3. AP 3, Radiation.',
  },
  'Plasma Barbette': {
    id: 'Plasma Barbette',
    label: 'Plasma Barbette',
    attackDM: 0,
    damageDice: 4,         // HG p.30
    damageBonus: 0,
    maxRange: 'Medium',    // HG p.30
    damageMultiple: 3,
    traits: ['AP 2'],
    mount: 'barbette',
    turretOnly: false,
    bayOnly: false,
    notes: 'Barbette: (4D + Effect − Armour) × 3. AP 2.',
  },
  'Railgun Barbette': {
    id: 'Railgun Barbette',
    label: 'Railgun Barbette',
    attackDM: 0,
    damageDice: 3,         // HG p.30
    damageBonus: 0,
    maxRange: 'Medium',    // HG p.30
    damageMultiple: 3,
    traits: ['AP 5'],
    mount: 'barbette',
    turretOnly: false,
    bayOnly: false,
    notes: 'Barbette: (3D + Effect − Armour) × 3. AP 5.',
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
