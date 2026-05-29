/**
 * Tests for src/utils/crew.js
 */

import { describe, it, expect } from 'vitest'
import { getCrewSkill, migrateCrew, blankCrewMember, CREW_SKILLS } from './crew.js'

describe('CREW_SKILLS', () => {
  it('contains the 5 expected roles', () => {
    expect(CREW_SKILLS).toEqual(['pilot', 'captain', 'engineer', 'gunner', 'sensors'])
  })
})

describe('blankCrewMember', () => {
  it('returns object with id, name, and skills', () => {
    const m = blankCrewMember()
    expect(m).toHaveProperty('id')
    expect(m.name).toBe('')
    expect(m.skills).toEqual({})
  })

  it('generates unique IDs on each call', () => {
    const a = blankCrewMember()
    const b = blankCrewMember()
    expect(a.id).not.toBe(b.id)
  })
})

describe('getCrewSkill — array format', () => {
  const crew = [
    { id: '1', name: 'Pilot', skills: { pilot: 2 } },
    { id: '2', name: 'Engineer', skills: { engineer: 1, sensors: 2 } },
    { id: '3', name: 'Gunner', skills: { gunner: 1 } },
  ]

  it('returns highest skill for a given role', () => {
    expect(getCrewSkill(crew, 'pilot')).toBe(2)
    expect(getCrewSkill(crew, 'engineer')).toBe(1)
    expect(getCrewSkill(crew, 'sensors')).toBe(2)
    expect(getCrewSkill(crew, 'gunner')).toBe(1)
  })

  it('returns 0 when no member has the skill', () => {
    expect(getCrewSkill(crew, 'captain')).toBe(0)
  })

  it('returns max when multiple members share the same skill', () => {
    const multi = [
      { id: '1', name: 'A', skills: { pilot: 1 } },
      { id: '2', name: 'B', skills: { pilot: 3 } },
    ]
    expect(getCrewSkill(multi, 'pilot')).toBe(3)
  })

  it('returns 0 for empty array', () => {
    expect(getCrewSkill([], 'pilot')).toBe(0)
  })
})

describe('getCrewSkill — legacy object format (backwards compat)', () => {
  const legacy = { pilot: 2, engineer: 1, gunner: 0 }

  it('reads skill directly from object', () => {
    expect(getCrewSkill(legacy, 'pilot')).toBe(2)
    expect(getCrewSkill(legacy, 'engineer')).toBe(1)
  })

  it('returns 0 for missing key', () => {
    expect(getCrewSkill(legacy, 'captain')).toBe(0)
  })

  it('returns 0 for null/undefined crew', () => {
    expect(getCrewSkill(null, 'pilot')).toBe(0)
    expect(getCrewSkill(undefined, 'pilot')).toBe(0)
  })
})

describe('migrateCrew', () => {
  it('converts non-zero skills to separate crew members', () => {
    const result = migrateCrew({ pilot: 2, engineer: 1, gunner: 0 })
    expect(result).toHaveLength(2)
    expect(result[0].skills).toEqual({ pilot: 2 })
    expect(result[0].name).toBe('Pilot')
    expect(result[1].skills).toEqual({ engineer: 1 })
    expect(result[1].name).toBe('Engineer')
  })

  it('each member has a unique id', () => {
    const result = migrateCrew({ pilot: 1, engineer: 1 })
    expect(result[0].id).not.toBe(result[1].id)
  })

  it('returns empty array when all skills are 0', () => {
    expect(migrateCrew({ pilot: 0, engineer: 0 })).toEqual([])
  })

  it('returns empty array for null input', () => {
    expect(migrateCrew(null)).toEqual([])
  })

  it('returns the input unchanged when already an array', () => {
    const arr = [{ id: 'x', name: 'A', skills: {} }]
    expect(migrateCrew(arr)).toBe(arr)
  })
})
