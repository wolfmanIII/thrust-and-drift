/**
 * Official ship catalog — Mongoose Traveller 2e vessels.
 * Source: High Guard Update 2022, chapter "Spaceships of the Third Imperium" (pp.135–199).
 *
 * Catalog entries are ShipProfile-compatible objects WITHOUT id/createdAt.
 * UUIDs and timestamps are assigned by profilesStore.addProfile() when the GM
 * adds a ship to their session profile list.
 *
 * Hull formula: Tonnage / 2.5 (round down). Some ships have reinforced or
 * dispersed structure hulls that deviate; values below match book stat blocks exactly.
 * // MgT2e HG p.12 — Hull Points
 *
 * Additional catalog-only metadata (not used by combat engine):
 *   source     — 'HG' | 'CRB'
 *   sourcePage — page in source PDF (small craft pages are approximate)
 *   category   — 'small-craft' | 'scout' | 'civilian' | 'military' | 'paramilitary'
 *   techLevel  — TL rating of the ship design
 *   shipType   — Imperial type designation letter (A, R, T …), or null
 */

/**
 * Populate defaults for fields common to all catalog entries.
 * @param {object} fields
 * @returns {object}
 */
function makeEntry(fields) {
  return {
    shipClass:   fields.name,
    description: '',
    cost:        0,
    jump:        0,
    powerPlant:  0,
    turrets:     [],
    bays:        [],
    computer:    0,
    sensors:     'Basic',
    software:    [],
    fuel:        0,
    cargo:       0,
    passengers:  0,
    armor:       0,
    crew: { pilot: 1, leadership: 0, engineer: 0, gunner: 0, sensors: 0 },
    // catalog metadata
    source:     'HG',
    sourcePage: 0,
    category:   'civilian',
    techLevel:  12,
    shipType:   null,
    ...fields,
  }
}

/**
 * Complete official ship catalog.
 * // MgT2e HG pp.135–199 — Spaceships of the Third Imperium
 * @type {object[]}
 */
export const SHIP_CATALOG = [

  // ── SMALL CRAFT (under 100t, no jump drive) ──────────────────────────────
  // // MgT2e HG pp.136–163

  makeEntry({
    name:        'Ultralight Fighter',
    shipClass:   'Ultralight Fighter',
    description: 'Minimal 6-ton carrier fighter. Designed for deployment aboard capital ships.',
    category:    'small-craft',
    sourcePage:  136,
    techLevel:   12,
    tonnage:  6,
    hull:     2,
    armor:    3,    // Crystaliron
    thrust:   6,
    sensors:  'Civilian',
    turrets:  [{ slot: 1, weapons: ['Pulse Laser'] }],
    crew:     { pilot: 1, leadership: 0, engineer: 0, gunner: 0, sensors: 0 },
    fuel:     0,
    cargo:    0,
  }),

  makeEntry({
    name:        'Light Fighter',
    shipClass:   'Light Fighter',
    description: 'Standard light fighter. Fast and agile; limited operational range.',
    category:    'small-craft',
    sourcePage:  138,
    techLevel:   12,
    tonnage:  10,
    hull:     4,
    armor:    2,    // Crystaliron
    thrust:   6,
    sensors:  'Improved',
    turrets:  [{ slot: 1, weapons: ['Pulse Laser'] }],
    crew:     { pilot: 1, leadership: 0, engineer: 0, gunner: 0, sensors: 0 },
    fuel:     0,
    cargo:    0,
  }),

  makeEntry({
    name:        'Military Gig',
    shipClass:   'Military Gig',
    description: 'TL14 armed fast courier. Bonded Superdense armour, high thrust.',
    category:    'small-craft',
    sourcePage:  140,
    techLevel:   14,
    tonnage:  20,
    hull:     8,
    armor:    4,    // Bonded Superdense
    thrust:   8,
    sensors:  'Basic',
    turrets:  [{ slot: 1, weapons: ['Pulse Laser'] }],
    crew:     { pilot: 1, leadership: 0, engineer: 0, gunner: 1, sensors: 0 },
    fuel:     0,
    cargo:    2,
  }),

  makeEntry({
    name:        'Launch',
    shipClass:   'Launch',
    description: 'Utility shuttle. Crew transfers and supply runs. No armament.',
    category:    'small-craft',
    sourcePage:  142,
    techLevel:   12,
    tonnage:  20,
    hull:     8,
    armor:    0,
    thrust:   1,
    sensors:  'Basic',
    turrets:  [],
    crew:     { pilot: 1, leadership: 0, engineer: 0, gunner: 0, sensors: 0 },
    fuel:     0,
    cargo:    9,
  }),

  makeEntry({
    name:        "Ship's Boat",
    shipClass:   "Ship's Boat",
    description: 'General-purpose utility craft. Standard fitting on 200-ton merchants.',
    category:    'small-craft',
    sourcePage:  144,
    techLevel:   12,
    tonnage:  30,
    hull:     12,
    armor:    0,
    thrust:   5,
    sensors:  'Basic',
    turrets:  [{ slot: 1, weapons: [] }],  // fixed mount, empty
    crew:     { pilot: 1, leadership: 0, engineer: 0, gunner: 0, sensors: 0 },
    fuel:     0,
    cargo:    14,
  }),

  makeEntry({
    name:        'Slow Boat',
    shipClass:   'Slow Boat',
    description: "Economy version of the Ship's Boat. Reduced thrust, lower operating cost.",
    category:    'small-craft',
    sourcePage:  146,
    techLevel:   12,
    tonnage:  30,
    hull:     12,
    armor:    0,
    thrust:   3,
    sensors:  'Basic',
    turrets:  [{ slot: 1, weapons: [] }],
    crew:     { pilot: 1, leadership: 0, engineer: 0, gunner: 0, sensors: 0 },
    fuel:     0,
    cargo:    16,
  }),

  makeEntry({
    name:        'Pinnace',
    shipClass:   'Pinnace',
    description: 'Medium utility craft for extended in-system operations.',
    category:    'small-craft',
    sourcePage:  148,
    techLevel:   12,
    tonnage:  40,
    hull:     16,
    armor:    0,
    thrust:   5,
    sensors:  'Basic',
    turrets:  [{ slot: 1, weapons: [] }],
    crew:     { pilot: 1, leadership: 0, engineer: 0, gunner: 0, sensors: 0 },
    fuel:     0,
    cargo:    20,
  }),

  makeEntry({
    name:        'Slow Pinnace',
    shipClass:   'Slow Pinnace',
    description: 'Economy Pinnace. Reduced thrust, larger cargo hold.',
    category:    'small-craft',
    sourcePage:  150,
    techLevel:   12,
    tonnage:  40,
    hull:     16,
    armor:    0,
    thrust:   3,
    sensors:  'Basic',
    turrets:  [{ slot: 1, weapons: [] }],
    crew:     { pilot: 1, leadership: 0, engineer: 0, gunner: 0, sensors: 0 },
    fuel:     0,
    cargo:    22,
  }),

  makeEntry({
    name:        'Modular Cutter',
    shipClass:   'Modular Cutter',
    description: 'Versatile 50-ton platform with swappable 30-ton mission modules.',
    category:    'small-craft',
    sourcePage:  152,
    techLevel:   12,
    tonnage:  50,
    hull:     20,
    armor:    0,
    thrust:   4,
    sensors:  'Basic',
    turrets:  [],
    crew:     { pilot: 1, leadership: 0, engineer: 0, gunner: 0, sensors: 0 },
    fuel:     0,
    cargo:    0,
  }),

  makeEntry({
    name:        'Heavy Fighter',
    shipClass:   'Heavy Fighter',
    description: 'TL15 assault fighter. Bonded Superdense armour 15, Thrust 9. Mixed weapon loadout.',
    category:    'small-craft',
    sourcePage:  154,
    techLevel:   15,
    tonnage:  50,
    hull:     22,   // reinforced hull (50t base = 20 HP; +2 reinforced)
    armor:    15,   // Bonded Superdense
    thrust:   9,
    sensors:  'Advanced',
    turrets: [
      { slot: 1, weapons: ['Beam Laser'] },
      { slot: 2, weapons: ['Missile Rack'] },
    ],
    crew:     { pilot: 1, leadership: 0, engineer: 0, gunner: 1, sensors: 0 },
    fuel:     0,
    cargo:    0,
  }),

  makeEntry({
    name:        'Troop Transport (Small Craft)',
    shipClass:   'Troop Transport',
    description: 'Armoured TL15 assault lander. Sandcaster + Missile Rack under fire cover.',
    category:    'small-craft',
    sourcePage:  156,
    techLevel:   15,
    tonnage:  50,
    hull:     22,   // reinforced hull
    armor:    5,    // Bonded Superdense
    thrust:   9,
    sensors:  'Improved',
    turrets: [
      { slot: 1, weapons: ['Sandcaster'] },
      { slot: 2, weapons: ['Missile Rack'] },
    ],
    crew:     { pilot: 1, leadership: 0, engineer: 0, gunner: 1, sensors: 0 },
    fuel:     0,
    cargo:    0,
  }),

  makeEntry({
    name:        'Torpedo Boat',
    shipClass:   'Torpedo Boat',
    description: 'Fast attack craft. Single torpedo barbette delivers capital-grade damage.',
    category:    'small-craft',
    sourcePage:  158,
    techLevel:   12,
    tonnage:  70,
    hull:     30,   // reinforced hull (base 28)
    armor:    12,   // Crystaliron
    thrust:   6,
    sensors:  'Improved',
    turrets:  [],
    bays:     [{ slot: 1, type: 'Torpedo Barbette' }],
    crew:     { pilot: 1, leadership: 0, engineer: 0, gunner: 1, sensors: 0 },
    fuel:     0,
    cargo:    0,
  }),

  makeEntry({
    name:        'Shuttle',
    shipClass:   'Shuttle',
    description: 'Standard orbital-to-surface transport. Unarmed. TL10.',
    category:    'small-craft',
    sourcePage:  160,
    techLevel:   10,
    tonnage:  95,
    hull:     38,
    armor:    0,
    thrust:   3,
    sensors:  'Basic',
    turrets:  [],
    crew:     { pilot: 1, leadership: 0, engineer: 0, gunner: 0, sensors: 0 },
    fuel:     0,
    cargo:    43,
  }),

  makeEntry({
    name:        'Passenger Shuttle',
    shipClass:   'Passenger Shuttle',
    description: 'High-capacity orbital passenger transport. TL9.',
    category:    'small-craft',
    sourcePage:  162,
    techLevel:   9,
    tonnage:    95,
    hull:       38,
    armor:      0,
    thrust:     1,
    sensors:    'Civilian',
    turrets:    [],
    crew:       { pilot: 1, leadership: 0, engineer: 0, gunner: 0, sensors: 0 },
    passengers: 36,
    fuel:       0,
    cargo:      0,
  }),

  // ── SCOUTS & COURIERS (100t) ──────────────────────────────────────────────
  // // MgT2e HG pp.164–171

  makeEntry({
    name:        'Express Boat (X-Boat)',
    shipClass:   'Express Boat',
    description: 'Jump-4 message courier. No manoeuvre drive — requires tender at each end.',
    category:    'scout',
    sourcePage:  164,
    techLevel:   13,
    tonnage:  100,
    hull:     40,
    armor:    0,
    thrust:   0,
    jump:     4,
    sensors:  'Basic',
    turrets:  [],
    crew:     { pilot: 1, leadership: 0, engineer: 1, gunner: 0, sensors: 0 },
    fuel:     45,
    cargo:    0,
  }),

  makeEntry({
    name:        'Scout/Courier (Sulieman)',
    shipClass:   'Scout/Courier',
    description: 'IISS Type S front-line scout. Crystaliron armour, military sensors, double turret hardpoint.',
    category:    'scout',
    sourcePage:  166,
    techLevel:   12,
    tonnage:  100,
    hull:     40,
    armor:    4,    // Crystaliron
    thrust:   2,
    jump:     2,
    sensors:  'Military',
    turrets:  [{ slot: 1, weapons: [] }],  // double turret hardpoint, weapons not standard
    crew:     { pilot: 1, leadership: 0, engineer: 1, gunner: 0, sensors: 0 },
    fuel:     20,
    cargo:    3,
  }),

  makeEntry({
    name:        'Seeker Mining Ship (Type J)',
    shipClass:   'Seeker',
    description: 'Independent prospector. Type J. Crystaliron armour, double turret, mining equipment.',
    category:    'civilian',
    sourcePage:  168,
    techLevel:   12,
    shipType:   'J',
    tonnage:  100,
    hull:     40,
    armor:    4,    // Crystaliron
    thrust:   2,
    jump:     2,
    sensors:  'Military',
    turrets:  [{ slot: 1, weapons: [] }],
    crew:     { pilot: 1, leadership: 0, engineer: 1, gunner: 0, sensors: 0 },
    fuel:     20,
    cargo:    0,
  }),

  makeEntry({
    name:        'Serpent Scout',
    shipClass:   'Serpent Scout',
    description: 'Advanced TL14 IISS scout. Bonded Superdense armour, double turret, military sensors.',
    category:    'scout',
    sourcePage:  170,
    techLevel:   14,
    tonnage:  100,
    hull:     40,
    armor:    4,    // Bonded Superdense
    thrust:   2,
    jump:     2,
    sensors:  'Military',
    turrets:  [{ slot: 1, weapons: [] }],
    crew:     { pilot: 1, leadership: 0, engineer: 1, gunner: 0, sensors: 0 },
    fuel:     20,
    cargo:    0,
  }),

  // ── CIVILIAN TRADERS & AUXILIARIES (200t) ────────────────────────────────
  // // MgT2e HG pp.172–179

  makeEntry({
    name:        'Far Trader (Empress Marava)',
    shipClass:   'Far Trader',
    description: 'Standard jump-2 far trader. Two double turrets with beam lasers for self-defence.',
    category:    'civilian',
    sourcePage:  172,
    techLevel:   12,
    shipType:   'A2',
    tonnage:  200,
    hull:     80,
    armor:    0,
    thrust:   1,
    jump:     2,
    sensors:  'Civilian',
    turrets: [
      { slot: 1, weapons: ['Beam Laser', 'Beam Laser'] },
      { slot: 2, weapons: ['Beam Laser', 'Beam Laser'] },
    ],
    crew:     { pilot: 1, leadership: 0, engineer: 1, gunner: 2, sensors: 0 },
    fuel:     40,
    cargo:    70,
    passengers: 9,
  }),

  makeEntry({
    name:        'Far Trader (Type A2 Hero)',
    shipClass:   'Far Trader',
    description: 'Jump-2 merchant with light Crystaliron armour. No standard weapons.',
    category:    'civilian',
    sourcePage:  172,
    techLevel:   12,
    shipType:   'A2',
    tonnage:  200,
    hull:     80,
    armor:    2,    // Crystaliron
    thrust:   1,
    jump:     2,
    sensors:  'Civilian',
    turrets:  [],
    crew:     { pilot: 1, leadership: 0, engineer: 1, gunner: 0, sensors: 0 },
    fuel:     40,
    cargo:    73,
    passengers: 9,
  }),

  makeEntry({
    name:        'Free Trader (Type A Beowulf)',
    shipClass:   'Free Trader',
    description: 'Jump-1 free trader. Backbone of interstellar commerce. Light Crystaliron armour.',
    category:    'civilian',
    sourcePage:  171,
    techLevel:   12,
    shipType:   'A',
    tonnage:  200,
    hull:     80,
    armor:    2,    // Crystaliron
    thrust:   1,
    jump:     1,
    sensors:  'Civilian',
    turrets:  [],
    crew:     { pilot: 1, leadership: 0, engineer: 1, gunner: 0, sensors: 0 },
    fuel:     20,
    cargo:    82,
    passengers: 8,
  }),

  makeEntry({
    name:        'Safari Ship (Type K)',
    shipClass:   'Safari Ship',
    description: 'Type K trophy-hunting excursion vessel. Live specimen tanks, trophy lounge, empty double turret.',
    category:    'civilian',
    sourcePage:  173,
    techLevel:   12,
    shipType:   'K',
    tonnage:  200,
    hull:     80,
    armor:    0,
    thrust:   1,
    jump:     2,
    sensors:  'Civilian',
    turrets:  [{ slot: 1, weapons: [] }],  // double turret, empty
    crew:     { pilot: 1, leadership: 0, engineer: 1, gunner: 0, sensors: 0 },
    fuel:     41,
    cargo:    13,
    passengers: 11,
  }),

  makeEntry({
    name:        'Jump Shuttle',
    shipClass:   'Jump Shuttle',
    description: 'Jump-3 tug. Ferries non-jump-capable ships (SDBs, bulk haulers) between systems.',
    category:    'civilian',
    sourcePage:  177,
    techLevel:   13,
    tonnage:  200,
    hull:     80,
    armor:    0,
    thrust:   3,
    jump:     3,
    sensors:  'Civilian',
    turrets:  [],
    crew:     { pilot: 1, leadership: 0, engineer: 2, gunner: 0, sensors: 0 },
    fuel:     116,
    cargo:    3,
  }),

  makeEntry({
    name:        'Yacht (Type Y)',
    shipClass:   'Yacht',
    description: "Noble's luxury vessel. Gourmet kitchen, theatre, training facilities. Unarmed.",
    category:    'civilian',
    sourcePage:  179,
    techLevel:   12,
    shipType:   'Y',
    tonnage:  200,
    hull:     80,
    armor:    0,
    thrust:   1,
    jump:     1,
    sensors:  'Civilian',
    turrets:  [],
    crew:     { pilot: 1, leadership: 0, engineer: 1, gunner: 0, sensors: 0 },
    fuel:     22,
    cargo:    16,
    passengers: 12,
  }),

  // ── MILITARY 200t ─────────────────────────────────────────────────────────
  // // MgT2e HG p.175

  makeEntry({
    name:        'System Defence Boat (TL15)',
    shipClass:   'System Defence Boat',
    description: 'TL15 non-jump SDB. Reinforced hull, Crystaliron 13, triple turrets, 240-missile magazine.',
    category:    'military',
    sourcePage:  175,
    techLevel:   15,
    tonnage:  200,
    hull:     88,   // reinforced hull (base 80 + reinforced)
    armor:    13,   // Crystaliron
    thrust:   9,
    jump:     0,
    sensors:  'Improved',
    turrets: [
      { slot: 1, weapons: ['Beam Laser', 'Beam Laser', 'Beam Laser'] },
      { slot: 2, weapons: ['Missile Rack', 'Missile Rack', 'Missile Rack'] },
    ],
    crew:     { pilot: 4, leadership: 1, engineer: 1, gunner: 4, sensors: 1 },
    fuel:     6,
    cargo:    15,
  }),

  // ── CIVILIAN 400t ─────────────────────────────────────────────────────────
  // // MgT2e HG pp.185–191

  makeEntry({
    name:        'Subsidised Merchant (Type R)',
    shipClass:   'Subsidised Merchant',
    description: '"Fat Trader." Type R. Jump-1, massive cargo hold. Unarmed. Imperial subsidy.',
    category:    'civilian',
    sourcePage:  189,
    techLevel:   12,
    shipType:   'R',
    tonnage:  400,
    hull:     160,
    armor:    0,
    thrust:   1,
    jump:     1,
    sensors:  'Civilian',
    turrets:  [],
    crew:     { pilot: 1, leadership: 0, engineer: 1, gunner: 0, sensors: 0 },
    fuel:     41,
    cargo:    201,
    passengers: 19,
  }),

  makeEntry({
    name:        'Laboratory Ship (Type L)',
    shipClass:   'Laboratory Ship',
    description: 'Type L IISS research vessel. Dispersed structure, spinning hull for gravity, no weapons.',
    category:    'civilian',
    sourcePage:  185,
    techLevel:   12,
    shipType:   'L',
    tonnage:  400,
    hull:     160,  // dispersed structure; book value
    armor:    0,
    thrust:   2,
    jump:     2,
    sensors:  'Improved',
    turrets:  [],
    crew:     { pilot: 1, leadership: 0, engineer: 0, gunner: 0, sensors: 1 },
    fuel:     82,
    cargo:    22,
  }),

  // ── PARAMILITARY 400t ─────────────────────────────────────────────────────
  // // MgT2e HG p.196

  makeEntry({
    name:        'Corsair (Nishemani)',
    shipClass:   'Corsair',
    description: 'Type P Nishemani-class pirate raider. Adjustable hull mimics traders. Forced linkage for boarding.',
    category:    'paramilitary',
    sourcePage:  196,
    techLevel:   15,
    shipType:   'P',
    tonnage:  400,
    hull:     160,
    armor:    5,    // Bonded Superdense
    thrust:   3,
    jump:     2,
    sensors:  'Advanced',
    turrets: [
      { slot: 1, weapons: ['Beam Laser'] },
      { slot: 2, weapons: ['Beam Laser'] },
      { slot: 3, weapons: ['Beam Laser'] },
    ],
    crew:     { pilot: 1, leadership: 0, engineer: 1, gunner: 3, sensors: 0 },
    fuel:     70,
    cargo:    46,
  }),

  // ── MILITARY 400t ─────────────────────────────────────────────────────────
  // // MgT2e HG pp.181–193

  makeEntry({
    name:        'Close Escort (Gazelle)',
    shipClass:   'Close Escort',
    description: 'Gazelle-class TL14 escort. Particle barbettes + beam laser turrets. Jump-5 with drop tanks.',
    category:    'military',
    sourcePage:  181,
    techLevel:   14,
    tonnage:  400,
    hull:     160,
    armor:    3,    // Bonded Superdense
    thrust:   5,
    jump:     3,    // 5 with drop tanks
    sensors:  'Military',
    turrets: [
      { slot: 1, weapons: ['Beam Laser', 'Beam Laser', 'Beam Laser'] },
      { slot: 2, weapons: ['Beam Laser', 'Beam Laser', 'Beam Laser'] },
    ],
    bays: [
      { slot: 1, type: 'Particle Barbette' },
      { slot: 2, type: 'Particle Barbette' },
    ],
    crew:     { pilot: 3, leadership: 1, engineer: 4, gunner: 8, sensors: 0 },
    fuel:     130,
    cargo:    12,
  }),

  makeEntry({
    name:        'Fleet Courier',
    shipClass:   'Fleet Courier',
    description: 'TL15 fast naval courier. Jump-5, Thrust 5. Purely defensive: beam lasers + sandcasters.',
    category:    'military',
    sourcePage:  183,
    techLevel:   15,
    tonnage:  400,
    hull:     160,
    armor:    0,
    thrust:   5,
    jump:     5,
    sensors:  'Advanced',
    turrets: [
      { slot: 1, weapons: ['Beam Laser', 'Beam Laser', 'Beam Laser'] },
      { slot: 2, weapons: ['Beam Laser', 'Beam Laser', 'Beam Laser'] },
      { slot: 3, weapons: ['Sandcaster', 'Sandcaster', 'Sandcaster'] },
      { slot: 4, weapons: ['Sandcaster', 'Sandcaster', 'Sandcaster'] },
    ],
    crew:     { pilot: 2, leadership: 1, engineer: 2, gunner: 2, sensors: 0 },
    fuel:     230,
    cargo:    5,
  }),

  makeEntry({
    name:        'Patrol Corvette (Type T)',
    shipClass:   'Patrol Corvette',
    description: 'Type T customs and anti-piracy corvette. Crystaliron 4. Pulse lasers + missile racks.',
    category:    'military',
    sourcePage:  187,
    techLevel:   12,
    shipType:   'T',
    tonnage:  400,
    hull:     160,
    armor:    4,    // Crystaliron
    thrust:   4,
    jump:     3,
    sensors:  'Military',
    turrets: [
      { slot: 1, weapons: ['Pulse Laser', 'Pulse Laser', 'Pulse Laser'] },
      { slot: 2, weapons: ['Pulse Laser', 'Pulse Laser', 'Pulse Laser'] },
      { slot: 3, weapons: ['Missile Rack', 'Missile Rack', 'Missile Rack'] },
      { slot: 4, weapons: ['Missile Rack', 'Missile Rack', 'Missile Rack'] },
    ],
    crew:     { pilot: 1, leadership: 0, engineer: 2, gunner: 4, sensors: 0 },
    fuel:     122,
    cargo:    47,
  }),

  makeEntry({
    name:        'Survey Scout (Donosev)',
    shipClass:   'Survey Scout',
    description: 'Donosev-class IISS survey vessel. Dispersed structure, modular cutter bay, no weapons.',
    category:    'military',
    sourcePage:  191,
    techLevel:   14,
    tonnage:  400,
    hull:     144,  // dispersed structure (400t × 0.9 / 2.5 = 144)
    armor:    0,
    thrust:   3,
    jump:     3,
    sensors:  'Improved',
    turrets:  [],
    crew:     { pilot: 1, leadership: 0, engineer: 2, gunner: 0, sensors: 1 },
    fuel:     124,
    cargo:    26,
  }),

  makeEntry({
    name:        'System Defence Boat (Dragon)',
    shipClass:   'System Defence Boat',
    description: 'Dragon-class TL13 SDB. Reinforced hull, Crystaliron 13, particle barbettes + small missile bay.',
    category:    'military',
    sourcePage:  193,
    techLevel:   13,
    tonnage:  400,
    hull:     176,  // reinforced + radiation shielding (base 160 + 16)
    armor:    13,   // Crystaliron
    thrust:   7,
    jump:     0,
    sensors:  'Improved',
    turrets:  [],
    bays: [
      { slot: 1, type: 'Particle Barbette' },
      { slot: 2, type: 'Particle Barbette' },
      { slot: 3, type: 'Missile Bay', size: 'Small' },
      { slot: 4, type: 'Point Defence Laser Battery' },
    ],
    crew:     { pilot: 3, leadership: 1, engineer: 2, gunner: 6, sensors: 3 },
    fuel:     12,
    cargo:    18,
  }),

  // ── CIVILIAN 600t ─────────────────────────────────────────────────────────
  // // MgT2e HG p.199

  makeEntry({
    name:        'Subsidised Liner (Type M)',
    shipClass:   'Subsidised Liner',
    description: 'Type M passenger liner. Jump-3. 24 passengers, 20 low berths, luxury amenities. Unarmed.',
    category:    'civilian',
    sourcePage:  199,
    techLevel:   12,
    shipType:   'M',
    tonnage:  600,
    hull:     240,
    armor:    0,
    thrust:   1,
    jump:     3,
    sensors:  'Civilian',
    turrets:  [],
    crew:     { pilot: 2, leadership: 1, engineer: 3, gunner: 0, sensors: 0 },
    fuel:     183,
    cargo:    60,
    passengers: 44,
  }),

]

/**
 * All distinct categories present in the catalog, in display order.
 * @type {Array<{ id: string, label: string }>}
 */
export const CATALOG_CATEGORIES = [
  { id: 'all',          label: 'TUTTE'        },
  { id: 'small-craft',  label: 'SMALL CRAFT'  },
  { id: 'scout',        label: 'ESPLORATORI'  },
  { id: 'civilian',     label: 'CIVILI'       },
  { id: 'military',     label: 'MILITARI'     },
  { id: 'paramilitary', label: 'PARAMILITARI' },
]
