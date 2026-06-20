/**
 * Tests for the weapons catalogue.
 * Verifies structural completeness, trait correctness, and barbette multipliers.
 * // MgT2e HG p.28–31
 */

import { describe, it, expect } from 'vitest'
import { WEAPONS, WEAPON_IDS, DEFENSIVE_WEAPONS } from './weapons.js'
import { getApValue } from '../utils/combat.js'

const TURRET_WEAPONS = [
  'Pulse Laser', 'Beam Laser', 'Missile Rack', 'Sandcaster',
  'Particle Beam', 'Railgun', 'Fusion Gun', 'Plasma Gun',
]

const BARBETTE_WEAPONS = [
  'Pulse Laser Barbette', 'Beam Laser Barbette', 'Particle Barbette',
  'Fusion Barbette', 'Plasma Barbette', 'Railgun Barbette',
]

const MISSILE_WEAPONS = ['Missile Rack', 'Missile Barbette', 'Torpedo']

// === CATALOGUE COMPLETENESS ===

describe('WEAPON_IDS', () => {
  it('contains all turret weapons', () => {
    for (const id of TURRET_WEAPONS) expect(WEAPON_IDS).toContain(id)
  })

  it('contains all barbette weapons', () => {
    for (const id of BARBETTE_WEAPONS) expect(WEAPON_IDS).toContain(id)
  })

  it('contains Missile Barbette and Torpedo', () => {
    expect(WEAPON_IDS).toContain('Missile Barbette')
    expect(WEAPON_IDS).toContain('Torpedo')
  })

  it('contains Ion Cannon', () => {
    expect(WEAPON_IDS).toContain('Ion Cannon')
  })
})

// === REQUIRED FIELDS ===

describe('WEAPONS — all entries have required fields', () => {
  for (const [key, w] of Object.entries(WEAPONS)) {
    it(`${key}: has id, label, attackDM, damageDice, maxRange, traits, damageMultiple`, () => {
      expect(w.id).toBe(key)
      expect(typeof w.label).toBe('string')
      expect(typeof w.attackDM).toBe('number')
      expect(typeof w.damageDice).toBe('number')
      expect(typeof w.damageBonus).toBe('number')
      expect(typeof w.maxRange).toBe('string')
      expect(Array.isArray(w.traits)).toBe(true)
      expect(typeof w.damageMultiple).toBe('number')
      expect(w.damageMultiple).toBeGreaterThanOrEqual(1)
    })
  }
})

// === BARBETTE MULTIPLIER ===
// // MgT2e HG p.29 — barbette damage × 3 after armour

describe('barbettes — damageMultiple is 3', () => {
  for (const id of BARBETTE_WEAPONS) {
    it(`${id}: damageMultiple === 3`, () => {
      expect(WEAPONS[id].damageMultiple).toBe(3)
    })
  }
})

describe('turret weapons — damageMultiple is 1', () => {
  for (const id of TURRET_WEAPONS) {
    it(`${id}: damageMultiple === 1`, () => {
      expect(WEAPONS[id].damageMultiple).toBe(1)
    })
  }
})

// === ION CANNON (barbette) ===
// // MgT2e HG p.30 — 2D×10 Power damage, barbette mount, ignores armour

describe('Ion Cannon (barbette)', () => {
  it('has Ion trait', () => {
    expect(WEAPONS['Ion Cannon'].traits).toContain('Ion')
  })

  it('damageMultiple is 10 (barbette Ion ×10 multiplier)', () => {
    expect(WEAPONS['Ion Cannon'].damageMultiple).toBe(10)
  })

  it('damageDice is 2 (2D)', () => {
    expect(WEAPONS['Ion Cannon'].damageDice).toBe(2)
  })

  it('maxRange is Medium', () => {
    expect(WEAPONS['Ion Cannon'].maxRange).toBe('Medium')
  })

  it('barbetteOnly: true — excluded from turret picker', () => {
    expect(WEAPONS['Ion Cannon'].barbetteOnly).toBe(true)
  })

  it('ignoresArmour: true', () => {
    expect(WEAPONS['Ion Cannon'].ignoresArmour).toBe(true)
  })
})

// === ION CANNON BAYS ===
// // MgT2e HG p.31-32 — Small 6D×10, Medium 8D×20, Large 10D×100

describe('Ion Cannon Bay variants', () => {
  const BAY_VARIANTS = [
    { id: 'Ion Cannon Bay (Small)',  damageDice: 6, damageMultiple: 10, maxRange: 'Medium' },
    { id: 'Ion Cannon Bay (Medium)', damageDice: 8, damageMultiple: 20, maxRange: 'Medium' },
    { id: 'Ion Cannon Bay (Large)',  damageDice: 10, damageMultiple: 100, maxRange: 'Long'  },
  ]

  it('all three variants are in WEAPON_IDS', () => {
    for (const { id } of BAY_VARIANTS) expect(WEAPON_IDS).toContain(id)
  })

  for (const { id, damageDice, damageMultiple, maxRange } of BAY_VARIANTS) {
    describe(id, () => {
      it(`damageDice is ${damageDice}`, () => {
        expect(WEAPONS[id].damageDice).toBe(damageDice)
      })
      it(`damageMultiple is ${damageMultiple}`, () => {
        expect(WEAPONS[id].damageMultiple).toBe(damageMultiple)
      })
      it(`maxRange is ${maxRange}`, () => {
        expect(WEAPONS[id].maxRange).toBe(maxRange)
      })
      it('bayOnly: true — excluded from turret and barbette pickers', () => {
        expect(WEAPONS[id].bayOnly).toBe(true)
      })
      it('ignoresArmour: true', () => {
        expect(WEAPONS[id].ignoresArmour).toBe(true)
      })
      it('has Ion trait', () => {
        expect(WEAPONS[id].traits).toContain('Ion')
      })
    })
  }

  it('bay weapons are NOT in DEFENSIVE_WEAPONS', () => {
    for (const { id } of BAY_VARIANTS) expect(DEFENSIVE_WEAPONS).not.toContain(id)
  })
})

// === TORPEDO ===
// // MgT2e HG p.30–31

describe('Torpedo', () => {
  it('damageDice is 6 (6D per torpedo)', () => {
    expect(WEAPONS['Torpedo'].damageDice).toBe(6)
  })

  it('has Smart trait (guided munition)', () => {
    expect(WEAPONS['Torpedo'].traits).toContain('Smart')
  })

  it('maxRange is Special (guided — no cap)', () => {
    expect(WEAPONS['Torpedo'].maxRange).toBe('Special')
  })

  it('damageMultiple is 1 (per-torpedo, not ×3)', () => {
    expect(WEAPONS['Torpedo'].damageMultiple).toBe(1)
  })
})

// === MISSILE BARBETTE ===

describe('Missile Barbette', () => {
  it('has Smart trait', () => {
    expect(WEAPONS['Missile Barbette'].traits).toContain('Smart')
  })

  it('maxRange is Special', () => {
    expect(WEAPONS['Missile Barbette'].maxRange).toBe('Special')
  })

  it('damageMultiple is 1 (per-missile, not barbette ×3)', () => {
    expect(WEAPONS['Missile Barbette'].damageMultiple).toBe(1)
  })
})

// === AP TRAITS — cross-check with getApValue ===
// Weapons with AP trait; values from HG p.28–30

describe('AP traits — getApValue agrees with catalogue', () => {
  const AP_TABLE = [
    ['Railgun',          4],
    ['Fusion Barbette',  3],
    ['Plasma Barbette',  2],
    ['Railgun Barbette', 5],
  ]

  it.each(AP_TABLE)('%s — AP value is %i', (id, expected) => {
    expect(getApValue(WEAPONS[id].traits)).toBe(expected)
  })

  it('Pulse Laser has no AP', () => {
    expect(getApValue(WEAPONS['Pulse Laser'].traits)).toBe(0)
  })

  it('Particle Barbette has no AP (only Radiation)', () => {
    expect(getApValue(WEAPONS['Particle Barbette'].traits)).toBe(0)
  })
})

// === MISSILE maxRange ===

describe('missile weapons — maxRange is Special', () => {
  for (const id of MISSILE_WEAPONS) {
    it(`${id}: maxRange is Special`, () => {
      expect(WEAPONS[id].maxRange).toBe('Special')
    })
  }
})

// === DEFENSIVE_WEAPONS ===

describe('DEFENSIVE_WEAPONS', () => {
  it('contains Sandcaster', () => {
    expect(DEFENSIVE_WEAPONS).toContain('Sandcaster')
  })

  it('does not contain any beam weapons', () => {
    for (const id of ['Pulse Laser', 'Beam Laser', 'Particle Beam', 'Railgun']) {
      expect(DEFENSIVE_WEAPONS).not.toContain(id)
    }
  })
})
