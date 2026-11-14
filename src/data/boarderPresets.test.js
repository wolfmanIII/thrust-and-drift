/**
 * Integrity tests for boarder presets (CRB p.92–93, p.100).
 */

import { describe, it, expect } from 'vitest'
import { NPC_EXPERIENCE, PERSONAL_ARMOUR } from './boarderPresets.js'

describe('NPC_EXPERIENCE', () => {
  it('every level starts from a characteristic of 7', () => {
    for (const lvl of Object.values(NPC_EXPERIENCE)) expect(lvl.base).toBe(7)
  })
  it('skill level grows green 0 → elite 3', () => {
    expect(Object.values(NPC_EXPERIENCE).map((l) => l.skill)).toEqual([0, 1, 2, 3])
  })
  it('bonus hints follow the CRB table', () => {
    expect(NPC_EXPERIENCE.green.bonuses).toEqual([])
    expect(NPC_EXPERIENCE.average.bonuses).toEqual([1])
    expect(NPC_EXPERIENCE.experienced.bonuses).toEqual([1, 2])
    expect(NPC_EXPERIENCE.elite.bonuses).toEqual([1, 2, 3])
  })
})

describe('PERSONAL_ARMOUR', () => {
  it.each([
    ['combat_tl10', 13], ['combat_tl12', 17], ['combat_tl14', 19],
    ['battle_tl13', 22], ['battle_tl14', 25],
    ['vacc_tl8', 4], ['vacc_tl10', 8], ['vacc_tl12', 10],
    ['hev_tl9', 8], ['hev_tl10', 9], ['hev_tl13', 14], ['hev_tl14', 15],
    ['cloth_tl7', 5], ['cloth_tl10', 8], ['flak_tl7', 3], ['flak_tl8', 5],
    ['jack', 1], ['mesh', 2], ['ablat', 1], ['none', 0],
  ])('%s protects for %i (CRB p.100)', (key, protection) => {
    expect(PERSONAL_ARMOUR[key].protection).toBe(protection)
  })
  it('has no laser-only Reflec entry', () => {
    expect(Object.keys(PERSONAL_ARMOUR).some((k) => k.startsWith('reflec'))).toBe(false)
  })
  it('every entry has label, tl and non-negative protection', () => {
    for (const a of Object.values(PERSONAL_ARMOUR)) {
      expect(typeof a.label).toBe('string')
      expect(a.tl).toBeGreaterThanOrEqual(0)
      expect(a.protection).toBeGreaterThanOrEqual(0)
    }
  })
})
