import { describe, it, expect } from 'vitest'
import {
  getTonnageDM,
  rollDogfightPilot,
  resolveDogfightChecks,
  dogfightAttackDM,
  canEscape,
} from './dogfight.js'

// ── getTonnageDM ─────────────────────────────────────────────────────────────

describe('getTonnageDM', () => {
  it('returns 0 for undefined', () => expect(getTonnageDM(undefined)).toBe(0))
  it('returns 0 for 0', ()         => expect(getTonnageDM(0)).toBe(0))
  it('returns 0 for fighter (10t)', () => expect(getTonnageDM(10)).toBe(0))
  it('returns 0 for 49t',          () => expect(getTonnageDM(49)).toBe(0))
  it('returns -1 for 50t',         () => expect(getTonnageDM(50)).toBe(-1))
  it('returns -1 for 99t',         () => expect(getTonnageDM(99)).toBe(-1))
  it('returns -2 for 100t',        () => expect(getTonnageDM(100)).toBe(-2))
  it('returns -2 for 199t',        () => expect(getTonnageDM(199)).toBe(-2))
  it('returns -3 for 200t',        () => expect(getTonnageDM(200)).toBe(-3))
  it('returns -4 for 300t',        () => expect(getTonnageDM(300)).toBe(-4))
  it('returns -7 for 600t',        () => expect(getTonnageDM(600)).toBe(-7))
})

// ── rollDogfightPilot ─────────────────────────────────────────────────────────

describe('rollDogfightPilot', () => {
  it('uses diceOverride when provided', () => {
    const result = rollDogfightPilot({
      pilotSkill: 2,
      tonnage: 10,
      diceOverride: { results: [4, 5], total: 9 },
    })
    expect(result.results).toEqual([4, 5])
    expect(result.total).toBe(9 + 2) // 9 dice + 2 pilot
  })

  it('applies tonnageDM correctly', () => {
    const result = rollDogfightPilot({
      pilotSkill: 1,
      tonnage: 100,
      diceOverride: { results: [3, 3], total: 6 },
    })
    // 6 dice + 1 pilot - 2 tonnage = 5
    expect(result.total).toBe(5)
    expect(result.breakdown.tonnageDM).toBe(-2)
  })

  it('applies thrustDM', () => {
    const result = rollDogfightPilot({
      pilotSkill: 0,
      tonnage: 0,
      thrustDM: 3,
      diceOverride: { results: [2, 2], total: 4 },
    })
    expect(result.total).toBe(7)
    expect(result.breakdown.thrustDM).toBe(3)
  })

  it('applies extraEnemyDM', () => {
    const result = rollDogfightPilot({
      pilotSkill: 0,
      tonnage: 0,
      extraEnemyDM: -2,
      diceOverride: { results: [5, 5], total: 10 },
    })
    expect(result.total).toBe(8)
    expect(result.breakdown.extraEnemyDM).toBe(-2)
  })

  it('returns valid shape when no override', () => {
    const result = rollDogfightPilot({ pilotSkill: 0, tonnage: 0 })
    expect(result).toHaveProperty('results')
    expect(result).toHaveProperty('total')
    expect(result).toHaveProperty('breakdown')
    expect(result.results).toHaveLength(2)
    expect(result.results.every((d) => d >= 1 && d <= 6)).toBe(true)
  })

  it('breakdown sums to total', () => {
    const result = rollDogfightPilot({
      pilotSkill: 2,
      tonnage: 200,
      thrustDM: 1,
      extraEnemyDM: -1,
      diceOverride: { results: [4, 4], total: 8 },
    })
    const { dice, pilotSkill, tonnageDM, thrustDM, extraEnemyDM } = result.breakdown
    expect(dice + pilotSkill + tonnageDM + thrustDM + extraEnemyDM).toBe(result.total)
  })
})

// ── resolveDogfightChecks ─────────────────────────────────────────────────────

describe('resolveDogfightChecks', () => {
  it('returns winner when clear margin', () => {
    const r = resolveDogfightChecks([
      { shipId: 'a', total: 12 },
      { shipId: 'b', total: 8 },
    ])
    expect(r.winnerId).toBe('a')
    expect(r.margin).toBe(4)
    expect(r.tied).toBe(false)
  })

  it('returns tie when totals equal', () => {
    const r = resolveDogfightChecks([
      { shipId: 'a', total: 10 },
      { shipId: 'b', total: 10 },
    ])
    expect(r.winnerId).toBeNull()
    expect(r.tied).toBe(true)
    expect(r.margin).toBe(0)
  })

  it('handles 3-way — highest wins', () => {
    const r = resolveDogfightChecks([
      { shipId: 'a', total: 7 },
      { shipId: 'b', total: 12 },
      { shipId: 'c', total: 9 },
    ])
    expect(r.winnerId).toBe('b')
    expect(r.margin).toBe(3) // 12 - 9
  })

  it('does not mutate input array', () => {
    const input = [{ shipId: 'a', total: 5 }, { shipId: 'b', total: 10 }]
    resolveDogfightChecks(input)
    expect(input[0].shipId).toBe('a')
  })
})

// ── dogfightAttackDM ─────────────────────────────────────────────────────────

describe('dogfightAttackDM', () => {
  it('returns +2 for winner', () =>
    expect(dogfightAttackDM('a', 'a')).toBe(2))

  it('returns -2 for loser', () =>
    expect(dogfightAttackDM('b', 'a')).toBe(-2))

  it('returns 0 on tie (null winnerId)', () =>
    expect(dogfightAttackDM('a', null)).toBe(0))
})

// ── canEscape ────────────────────────────────────────────────────────────────

describe('canEscape', () => {
  it('true when no enemies', () =>
    expect(canEscape(2, [])).toBe(true))

  it('true when thrust > max enemy thrust', () =>
    expect(canEscape(5, [3, 4])).toBe(true))

  it('false when thrust equals max enemy', () =>
    expect(canEscape(4, [4, 2])).toBe(false))

  it('false when thrust less than max enemy', () =>
    expect(canEscape(3, [4])).toBe(false))
})
