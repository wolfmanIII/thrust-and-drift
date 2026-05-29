/**
 * Default ship profiles for quick-start gameplay.
 * // MgT2e CRB — Ship Design section
 * // Spec §12 — Profili Nave Predefiniti
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
    description: 'Mercantile standard. Armed for self-defence.',
    tonnage: 200,
    hull: 22,
    armor: 0,
    thrust: 1,
    jump: 2,
    powerPlant: 1,
    turrets: [
      { slot: 1, weapons: ['Pulse Laser', 'Missile Rack'] },
    ],
    crew: [
      cm('Pilot', { pilot: 1 }),
      cm('Engineer', { engineer: 1 }),
      cm('Gunner', { gunner: 1 }),
    ],
    fuel: 40,
    cargo: 82,
  }),

  makeProfile({
    name: 'Scout/Courier',
    shipClass: 'Scout/Courier',
    description: 'Versatile exploration and courier vessel.',
    tonnage: 100,
    hull: 11,
    armor: 0,
    thrust: 2,
    jump: 2,
    powerPlant: 1,
    turrets: [
      { slot: 1, weapons: ['Pulse Laser', 'Missile Rack'] },
    ],
    crew: [
      cm('Pilot', { pilot: 1 }),
      cm('Engineer', { engineer: 1 }),
      cm('Gunner', { gunner: 1 }),
    ],
    fuel: 20,
    cargo: 3,
  }),

  makeProfile({
    name: 'Fighter Leggero',
    shipClass: 'Light Fighter',
    description: 'High-maneuverability attack craft. Short operational range.',
    tonnage: 10,
    hull: 2,
    armor: 2,
    thrust: 6,
    jump: 0,
    powerPlant: 3,
    turrets: [
      { slot: 1, weapons: ['Pulse Laser'] },
    ],
    crew: [
      cm('Pilot', { pilot: 2, gunner: 2 }),
    ],
    fuel: 0,
    cargo: 0,
  }),

  makeProfile({
    name: 'Patrol Cruiser',
    shipClass: 'Patrol Cruiser',
    description: 'Mid-range military vessel. Multi-turret fire coverage.',
    tonnage: 400,
    hull: 44,
    armor: 6,
    thrust: 4,
    jump: 2,
    powerPlant: 4,
    turrets: [
      { slot: 1, weapons: ['Pulse Laser', 'Pulse Laser', 'Missile Rack'] },
      { slot: 2, weapons: ['Pulse Laser', 'Pulse Laser', 'Sandcaster'] },
    ],
    crew: [
      cm('Pilot', { pilot: 2 }),
      cm('Captain', { captain: 1 }),
      cm('Chief Engineer', { engineer: 2 }),
      cm('Gunner', { gunner: 2 }),
      cm('Sensors Officer', { sensors: 1 }),
    ],
    fuel: 80,
    cargo: 40,
  }),

  makeProfile({
    name: 'Far Trader',
    shipClass: 'Far Trader',
    description: 'Defensive merchantman. Sandcaster fitted for anti-laser protection.',
    tonnage: 200,
    hull: 22,
    armor: 0,
    thrust: 1,
    jump: 2,
    powerPlant: 1,
    turrets: [
      { slot: 1, weapons: ['Sandcaster'] },
    ],
    crew: [
      cm('Pilot', { pilot: 1 }),
      cm('Engineer', { engineer: 1 }),
    ],
    fuel: 40,
    cargo: 73,
  }),
]
