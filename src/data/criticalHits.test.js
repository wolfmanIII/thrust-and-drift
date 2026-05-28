/**
 * Tests for critical hit location table and effect lookups.
 * // MgT2e CRB p.169–170
 */

import { describe, it, expect } from 'vitest'
import {
  CRITICAL_LOCATION_TABLE,
  getCriticalLocation,
  getCriticalEffect,
} from './criticalHits.js'

// === LOCATION TABLE ===

describe('CRITICAL_LOCATION_TABLE', () => {
  it('covers every 2D6 result 2–12', () => {
    for (let i = 2; i <= 12; i++) {
      expect(CRITICAL_LOCATION_TABLE[i], `missing key ${i}`).toBeTruthy()
    }
  })

  it('has exactly 11 entries (no duplicates)', () => {
    expect(Object.keys(CRITICAL_LOCATION_TABLE)).toHaveLength(11)
  })
})

// === getCriticalLocation ===

describe('getCriticalLocation', () => {
  const CASES = [
    [2,  'Sensors'],
    [3,  'Power Plant'],
    [4,  'Fuel'],
    [5,  'Weapon'],
    [6,  'Armour'],
    [7,  'Hull'],
    [8,  'M-Drive'],
    [9,  'Cargo'],
    [10, 'J-Drive'],
    [11, 'Crew'],
    [12, 'Bridge'],
  ]

  it.each(CASES)('2D6=%i → %s', (roll, system) => {
    expect(getCriticalLocation(roll)).toBe(system)
  })

  it('clamps values below 2 to Sensors', () => {
    expect(getCriticalLocation(0)).toBe('Sensors')
    expect(getCriticalLocation(1)).toBe('Sensors')
  })

  it('clamps values above 12 to Bridge', () => {
    expect(getCriticalLocation(13)).toBe('Bridge')
    expect(getCriticalLocation(20)).toBe('Bridge')
  })
})

// === getCriticalEffect ===

describe('getCriticalEffect', () => {
  it('returns null for unknown system', () => {
    expect(getCriticalEffect('Unknown', 3)).toBeNull()
  })

  it('clamps severity < 1 to 1', () => {
    expect(getCriticalEffect('Hull', 0)).toEqual(getCriticalEffect('Hull', 1))
  })

  it('clamps severity > 6 to 6', () => {
    expect(getCriticalEffect('Hull', 9)).toEqual(getCriticalEffect('Hull', 6))
  })

  it('Hull Sev 1–6 all have hull_extra_damage mechanic with matching dice count', () => {
    for (let sev = 1; sev <= 6; sev++) {
      const e = getCriticalEffect('Hull', sev)
      expect(e.mechanic).toBe('hull_extra_damage')
      expect(e.value).toBe(sev)
    }
  })

  it('M-Drive Sev 1 = descriptive (no thrust effect)', () => {
    expect(getCriticalEffect('M-Drive', 1).mechanic).toBe('descriptive')
  })

  it('M-Drive Sev 2–4 = thrust_reduce value 1', () => {
    for (const sev of [2, 3, 4]) {
      const e = getCriticalEffect('M-Drive', sev)
      expect(e.mechanic).toBe('thrust_reduce')
      expect(e.value).toBe(1)
    }
  })

  it('M-Drive Sev 5–6 = thrust_zero', () => {
    expect(getCriticalEffect('M-Drive', 5).mechanic).toBe('thrust_zero')
    expect(getCriticalEffect('M-Drive', 6).mechanic).toBe('thrust_zero')
  })

  it('every system/severity has a non-empty description string', () => {
    const SYSTEMS = [
      'Sensors', 'Power Plant', 'Fuel', 'Weapon', 'Armour',
      'Hull', 'M-Drive', 'Cargo', 'J-Drive', 'Crew', 'Bridge',
    ]
    for (const system of SYSTEMS) {
      for (let sev = 1; sev <= 6; sev++) {
        const e = getCriticalEffect(system, sev)
        expect(e, `${system} Sev.${sev} is null`).not.toBeNull()
        expect(typeof e.description).toBe('string')
        expect(e.description.length, `${system} Sev.${sev} empty description`).toBeGreaterThan(0)
      }
    }
  })
})
