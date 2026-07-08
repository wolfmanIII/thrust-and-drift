import { describe, it, expect } from 'vitest'
import { hardpointBudget, slotHardpointCost, totalHardpointsUsed } from './hardpoints.js'

describe('hardpointBudget', () => {
  it('gives Firmpoints for small craft under 100 tons (CRB p.183)', () => {
    expect(hardpointBudget(6)).toBe(1)
    expect(hardpointBudget(34)).toBe(1)
    expect(hardpointBudget(35)).toBe(2)
    expect(hardpointBudget(70)).toBe(2)
    expect(hardpointBudget(71)).toBe(3)
    expect(hardpointBudget(99)).toBe(3)
  })

  it('gives one Hardpoint per full 100 tons at and above 100 tons', () => {
    expect(hardpointBudget(100)).toBe(1)
    expect(hardpointBudget(199)).toBe(1)
    expect(hardpointBudget(200)).toBe(2)
    expect(hardpointBudget(1000)).toBe(10)
  })

  it('treats missing/zero tonnage as zero budget', () => {
    expect(hardpointBudget(0)).toBe(1)
    expect(hardpointBudget(undefined)).toBe(1)
  })
})

describe('slotHardpointCost', () => {
  it('costs 0 for an empty slot', () => {
    expect(slotHardpointCost({ slot: 1, weapons: [] })).toBe(0)
  })

  it('costs 1 for a turret slot regardless of weapon count (quad turret)', () => {
    expect(slotHardpointCost({ slot: 1, weapons: ['Pulse Laser'] })).toBe(1)
    expect(slotHardpointCost({ slot: 1, weapons: ['Pulse Laser', 'Pulse Laser', 'Pulse Laser', 'Pulse Laser'] })).toBe(1)
  })

  it('costs 1 for a barbette slot', () => {
    expect(slotHardpointCost({ slot: 1, weapons: ['Torpedo'] })).toBe(1)
  })

  it('costs 1 for a Small/Medium Bay slot', () => {
    expect(slotHardpointCost({ slot: 1, weapons: ['Ion Cannon Bay (Small)'] })).toBe(1)
    expect(slotHardpointCost({ slot: 1, weapons: ['Ion Cannon Bay (Medium)'] })).toBe(1)
  })

  it('costs 5 for a Large Bay slot (HG p.31)', () => {
    expect(slotHardpointCost({ slot: 1, weapons: ['Ion Cannon Bay (Large)'] })).toBe(5)
  })
})

describe('totalHardpointsUsed', () => {
  it('sums costs across all slots', () => {
    const turrets = [
      { slot: 1, weapons: ['Pulse Laser', 'Pulse Laser'] },
      { slot: 2, weapons: ['Torpedo'] },
      { slot: 3, weapons: ['Ion Cannon Bay (Large)'] },
    ]
    expect(totalHardpointsUsed(turrets)).toBe(1 + 1 + 5)
  })

  it('returns 0 for no turrets', () => {
    expect(totalHardpointsUsed([])).toBe(0)
    expect(totalHardpointsUsed(undefined)).toBe(0)
  })
})
