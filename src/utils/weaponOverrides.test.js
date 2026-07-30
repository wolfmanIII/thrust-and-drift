import { describe, it, expect } from 'vitest'
import { resolveWeapon, resolveTurretWeapon } from './weaponOverrides.js'
import { WEAPONS } from '../data/weapons.js'

describe('resolveWeapon', () => {
  it('returns the base weapon def when no override given', () => {
    expect(resolveWeapon('Pulse Laser', undefined)).toBe(WEAPONS['Pulse Laser'])
  })

  it('merges override fields on top of the base def', () => {
    const resolved = resolveWeapon('Pulse Laser', { label: 'Old Federation Laser', damageDice: 3, notes: 'Refit, +1D' })
    expect(resolved.label).toBe('Old Federation Laser')
    expect(resolved.damageDice).toBe(3)
    expect(resolved.notes).toBe('Refit, +1D')
    expect(resolved.attackDM).toBe(WEAPONS['Pulse Laser'].attackDM)
    expect(resolved.maxRange).toBe(WEAPONS['Pulse Laser'].maxRange)
  })

  it('returns null for an unknown weapon name', () => {
    expect(resolveWeapon('Not A Real Weapon', undefined)).toBeNull()
  })

  it('does not mutate the base WEAPONS entry', () => {
    resolveWeapon('Pulse Laser', { damageDice: 99 })
    expect(WEAPONS['Pulse Laser'].damageDice).not.toBe(99)
  })
})

describe('resolveTurretWeapon', () => {
  it('resolves by positional index with no overrides present', () => {
    const turret = { slot: 1, weapons: ['Pulse Laser', 'Missile Rack'] }
    expect(resolveTurretWeapon(turret, 0)).toBe(WEAPONS['Pulse Laser'])
    expect(resolveTurretWeapon(turret, 1)).toBe(WEAPONS['Missile Rack'])
  })

  it('applies the override only to the matching index', () => {
    const turret = {
      slot: 1,
      weapons: ['Pulse Laser', 'Pulse Laser'],
      weaponOverrides: { 1: { label: 'Rusty Pulse Laser', damageDice: 1 } },
    }
    expect(resolveTurretWeapon(turret, 0)).toBe(WEAPONS['Pulse Laser'])
    const rusty = resolveTurretWeapon(turret, 1)
    expect(rusty.label).toBe('Rusty Pulse Laser')
    expect(rusty.damageDice).toBe(1)
  })

  it('is a no-op when weaponOverrides is absent (JSON back-compat)', () => {
    const turret = { slot: 1, weapons: ['Beam Laser'] }
    expect(resolveTurretWeapon(turret, 0)).toBe(WEAPONS['Beam Laser'])
  })
})
