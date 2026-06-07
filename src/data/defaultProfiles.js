/**
 * Default ship profiles for quick-start gameplay.
 * // MgT2e CRB — Ship Design section
 * // Spec §12 — Default Ship Profiles
 */

import { v7 as uuidv7 } from 'uuid'

/**
 * Generate a default ship profile with a fresh UUID and timestamp.
 * @param {object} overrides  Partial ShipProfile fields
 * @returns {object}  Complete ShipProfile
 */
function makeProfile(overrides) {
  return {
    id: uuidv7(),
    createdAt: new Date().toISOString(),
    shipClass: '',
    description: '',
    cost: 0,
    tonnage: 0,
    jump: 0,
    powerPlant: 0,
    turrets: [],
    bays: [],
    computer: 0,
    sensors: 'Civilian',
    software: [],
    fuel: 0,
    cargo: 0,
    passengers: 0,
    crew: [],
    ...overrides,
  }
}

/** Shorthand to create a crew member object. */
function cm(name, skills) {
  return { id: uuidv7(), name, skills }
}

/**
 * Preset ship profiles.
 * // MgT2e CRB p.164 — standard vessels for space combat examples
 * @type {object[]}
 */
export const DEFAULT_PROFILES = [
  makeProfile({
    name: 'Free Trader (Beowulf)',
    shipClass: 'Free Trader',
    description: 'Mercantile standard. Unarmed. Crystaliron armour.',
    tonnage: 200,
    hull: 80,
    armor: 2,
    thrust: 1,
    jump: 1,
    powerPlant: 1,
    turrets: [],
    crew: [
      cm('Mira Vasquez',  { pilot: 1 }),
      cm('Joko Hendrik',  { engineer: 1 }),
    ],
    fuel: 21,
    cargo: 81,
  }),

  makeProfile({
    name: 'Scout/Courier',
    shipClass: 'Scout/Courier',
    description: 'Versatile exploration and courier vessel. Crystaliron armour, military sensors.',
    tonnage: 100,
    hull: 40,
    armor: 4,
    thrust: 2,
    jump: 2,
    powerPlant: 1,
    sensors: 'Military',
    turrets: [
      { slot: 1, weapons: ['Pulse Laser', 'Missile Rack'] },
    ],
    crew: [
      cm('Dex Rallahan',    { pilot: 1, sensors: 1 }),
      cm('Petra Halvorsen', { engineer: 1 }),
      cm('Yusuf Andare',    { gunner: 1 }),
    ],
    fuel: 20,
    cargo: 3,
  }),

  makeProfile({
    name: 'Light Fighter',
    shipClass: 'Light Fighter',
    description: 'High-maneuverability attack craft. Short operational range.',
    tonnage: 10,
    hull: 4,
    armor: 2,
    thrust: 6,
    jump: 0,
    powerPlant: 3,
    sensors: 'Improved',
    turrets: [
      { slot: 1, weapons: ['Pulse Laser'] },
    ],
    crew: [
      cm('Ren Takahata', { pilot: 2, gunner: 2 }),
    ],
    fuel: 0,
    cargo: 0,
  }),

  makeProfile({
    name: 'Patrol Cruiser',
    shipClass: 'Patrol Cruiser',
    description: 'Mid-range military vessel. Multi-turret fire coverage.',
    tonnage: 400,
    hull: 160,
    armor: 6,
    thrust: 4,
    jump: 2,
    powerPlant: 4,
    turrets: [
      { slot: 1, weapons: ['Pulse Laser', 'Pulse Laser', 'Missile Rack'] },
      { slot: 2, weapons: ['Pulse Laser', 'Pulse Laser', 'Sandcaster'] },
    ],
    crew: [
      cm('Cmdr. Vikram Solari', { leadership: 2, tactics: 1 }),
      cm('Lt. Sura Delacroix',  { pilot: 2 }),
      cm('Olya Fennek',         { engineer: 2 }),
      cm('Brenn Okoro',         { gunner: 2 }),
      cm('Asha Reyes',          { gunner: 2, sensors: 1 }),
    ],
    fuel: 80,
    cargo: 40,
  }),

  makeProfile({
    name: 'Far Trader',
    shipClass: 'Far Trader',
    description: 'Jump-2 far trader. Unarmed. Crystaliron armour.',
    tonnage: 200,
    hull: 80,
    armor: 2,
    thrust: 1,
    jump: 2,
    powerPlant: 1,
    turrets: [],
    crew: [
      cm('Yara Massoud',  { pilot: 1 }),
      cm('Clint Vossler', { engineer: 1 }),
    ],
    fuel: 41,
    cargo: 65,
  }),
]
