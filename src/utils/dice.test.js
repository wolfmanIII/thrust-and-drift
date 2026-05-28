/**
 * Tests for dice rolling utilities.
 */

import { describe, it, expect } from 'vitest'
import { rollDice, roll2D6, roll1D6, formatDiceResults, formatCheckResult } from './dice.js'

describe('rollDice', () => {
  it('returns correct number of results', () => {
    expect(rollDice(3, 6).results).toHaveLength(3)
    expect(rollDice(1, 20).results).toHaveLength(1)
    expect(rollDice(5, 8).results).toHaveLength(5)
  })

  it('each result in [1, sides]', () => {
    for (let i = 0; i < 100; i++) {
      const { results } = rollDice(4, 6)
      for (const r of results) {
        expect(r).toBeGreaterThanOrEqual(1)
        expect(r).toBeLessThanOrEqual(6)
      }
    }
  })

  it('total equals sum of results', () => {
    for (let i = 0; i < 20; i++) {
      const roll = rollDice(3, 6)
      expect(roll.total).toBe(roll.results.reduce((a, b) => a + b, 0))
    }
  })
})

describe('roll2D6', () => {
  it('returns exactly 2 results', () => {
    expect(roll2D6().results).toHaveLength(2)
  })

  it('total always in [2, 12]', () => {
    for (let i = 0; i < 100; i++) {
      const { total } = roll2D6()
      expect(total).toBeGreaterThanOrEqual(2)
      expect(total).toBeLessThanOrEqual(12)
    }
  })
})

describe('roll1D6', () => {
  it('returns exactly 1 result', () => {
    expect(roll1D6().results).toHaveLength(1)
  })

  it('total always in [1, 6]', () => {
    for (let i = 0; i < 50; i++) {
      const { total } = roll1D6()
      expect(total).toBeGreaterThanOrEqual(1)
      expect(total).toBeLessThanOrEqual(6)
    }
  })
})

describe('formatDiceResults', () => {
  it('single die', () => {
    expect(formatDiceResults([5])).toBe('5 = 5')
  })

  it('two dice', () => {
    expect(formatDiceResults([3, 4])).toBe('3 + 4 = 7')
  })

  it('three dice', () => {
    expect(formatDiceResults([1, 2, 3])).toBe('1 + 2 + 3 = 6')
  })
})

describe('formatCheckResult', () => {
  it('hit: positive DM shows with + sign', () => {
    const roll = { results: [4, 5], total: 9 }
    const r = formatCheckResult(roll, 2, 8)
    expect(r.finalTotal).toBe(11)
    expect(r.success).toBe(true)
    expect(r.effect).toBe(3)
    expect(r.display).toBe('[4+5] +2 = 11')
  })

  it('miss: negative DM', () => {
    const roll = { results: [2, 3], total: 5 }
    const r = formatCheckResult(roll, -2, 8)
    expect(r.finalTotal).toBe(3)
    expect(r.success).toBe(false)
    expect(r.effect).toBe(-5)
    expect(r.display).toContain('-2')
  })

  it('zero DM: no modifier in display string', () => {
    const roll = { results: [4, 4], total: 8 }
    const r = formatCheckResult(roll, 0, 8)
    expect(r.display).toBe('[4+4] = 8')
    expect(r.success).toBe(true)
    expect(r.effect).toBe(0)
  })

  it('target defaults to 8', () => {
    const roll = { results: [3, 3], total: 6 }
    const r = formatCheckResult(roll, 0)
    expect(r.success).toBe(false)
    expect(r.effect).toBe(-2)
  })

  it('exactly on target = success with effect 0', () => {
    const roll = { results: [4, 4], total: 8 }
    const r = formatCheckResult(roll, 0, 8)
    expect(r.success).toBe(true)
    expect(r.effect).toBe(0)
  })
})
