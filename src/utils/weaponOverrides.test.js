import { describe, it, expect } from 'vitest'
import { resolveWeapon, resolveTurretWeapon, resolveWeaponForSlot } from './weaponOverrides.js'
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

describe('resolveWeaponForSlot', () => {
  it('applies the override when the weapon name is a singleton in the slot', () => {
    const turret = {
      slot: 1,
      weapons: ['Pulse Laser'],
      weaponOverrides: { 0: { label: 'Old Federation Laser', damageDice: 3 } },
    }
    const resolved = resolveWeaponForSlot(turret, 'Pulse Laser')
    expect(resolved.label).toBe('Old Federation Laser')
    expect(resolved.damageDice).toBe(3)
  })

  it('falls back to the base def when the weapon name occurs more than once (CRB p.168 linking)', () => {
    const turret = {
      slot: 1,
      weapons: ['Pulse Laser', 'Pulse Laser'],
      weaponOverrides: { 1: { label: 'Rusty Pulse Laser', damageDice: 1 } },
    }
    expect(resolveWeaponForSlot(turret, 'Pulse Laser')).toBe(WEAPONS['Pulse Laser'])
  })

  it('returns the base def when no override is present', () => {
    const turret = { slot: 1, weapons: ['Beam Laser'] }
    expect(resolveWeaponForSlot(turret, 'Beam Laser')).toBe(WEAPONS['Beam Laser'])
  })

  it('returns null for an unknown weapon name', () => {
    const turret = { slot: 1, weapons: ['Not A Real Weapon'] }
    expect(resolveWeaponForSlot(turret, 'Not A Real Weapon')).toBeNull()
  })
})
