/**
 * Data integrity tests for CREW_ACTIONS.
 * // MgT2e CRB p.166–167 — Crew Actions
 */

import { describe, it, expect } from 'vitest'
import { CREW_ACTIONS } from './crewActions.js'

const ALL_ROLES   = Object.keys(CREW_ACTIONS)
const ALL_ACTIONS = Object.values(CREW_ACTIONS).flat()

describe('CREW_ACTIONS — roles', () => {
  it('defines exactly the 5 expected roles', () => {
    expect(ALL_ROLES.sort()).toEqual(['engineer', 'gunner', 'leadership', 'pilot', 'sensors'])
  })

  it('every role has at least one action', () => {
    for (const role of ALL_ROLES) {
      expect(CREW_ACTIONS[role].length).toBeGreaterThan(0)
    }
  })
})

describe('CREW_ACTIONS — required fields on every action', () => {
  for (const [role, actions] of Object.entries(CREW_ACTIONS)) {
    for (const action of actions) {
      it(`${role}/${action.id}: id, label, skill, difficulty, description are present`, () => {
        expect(typeof action.id).toBe('string')
        expect(action.id.length).toBeGreaterThan(0)
        expect(typeof action.label).toBe('string')
        expect(action.label.length).toBeGreaterThan(0)
        expect(typeof action.skill).toBe('string')
        expect(typeof action.description).toBe('string')
        const validDifficulty = typeof action.difficulty === 'number' || action.difficulty === 'auto'
        expect(validDifficulty).toBe(true)
      })

      it(`${role}/${action.id}: skill matches role`, () => {
        expect(action.skill).toBe(role)
      })
    }
  }
})

describe('CREW_ACTIONS — no duplicate IDs', () => {
  it('all action IDs are unique across all roles', () => {
    const ids = ALL_ACTIONS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('CREW_ACTIONS — known actions are present', () => {
  it('sensor_lock requires a target', () => {
    const lock = CREW_ACTIONS.sensors.find((a) => a.id === 'sensor_lock')
    expect(lock).toBeDefined()
    expect(lock.requiresTarget).toBe(true)
  })

  it('missile_ew requires a salvo target', () => {
    const ew = CREW_ACTIONS.sensors.find((a) => a.id === 'missile_ew')
    expect(ew).toBeDefined()
    expect(ew.requiresSalvoTarget).toBe(true)
  })

  it('overload_drive has higher difficulty than standard 8+ actions', () => {
    const overload = CREW_ACTIONS.engineer.find((a) => a.id === 'overload_drive')
    expect(overload).toBeDefined()
    expect(overload.difficulty).toBeGreaterThan(8)
  })

  it('reload_turret is automatic (no roll needed)', () => {
    const reload = CREW_ACTIONS.gunner.find((a) => a.id === 'reload_turret')
    expect(reload).toBeDefined()
    expect(reload.difficulty).toBe('auto')
  })
})
