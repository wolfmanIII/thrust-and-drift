/**
 * Tests for src/utils/crew.js
 */

import { describe, it, expect } from 'vitest'
import { getCrewSkill, migrateCrew, blankCrewMember, CREW_SKILLS, buildDefaultAssignments, getAssignedSkill, getEffectiveSkill } from './crew.js'

describe('CREW_SKILLS', () => {
  it('contains the 6 expected roles', () => {
    expect(CREW_SKILLS).toEqual(['pilot', 'leadership', 'tactics', 'engineer', 'gunner', 'sensors'])
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
    expect(getCrewSkill(crew, 'leadership')).toBe(0)
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
    expect(getCrewSkill(legacy, 'leadership')).toBe(0)
  })

  it('returns 0 for null/undefined crew', () => {
    expect(getCrewSkill(null, 'pilot')).toBe(0)
    expect(getCrewSkill(undefined, 'pilot')).toBe(0)
  })
})

describe('getCrewSkill — backward compat (captain → leadership)', () => {
  it('reads captain key as leadership from legacy object', () => {
    expect(getCrewSkill({ captain: 2 }, 'leadership')).toBe(2)
  })

  it('reads captain key as leadership from new array format', () => {
    const crew = [{ id: '1', name: 'Captain', skills: { captain: 2 } }]
    expect(getCrewSkill(crew, 'leadership')).toBe(2)
  })
})

describe('buildDefaultAssignments', () => {
  const crew = [
    { id: 'p1', name: 'Pilot', skills: { pilot: 2 } },
    { id: 'g1', name: 'Gunner', skills: { gunner: 2 } },
    { id: 'c1', name: 'Captain', skills: { leadership: 1, tactics: 1 } },
  ]
  const turrets = [{ slot: 1 }, { slot: 2 }]

  it('assigns best-skilled member per non-gunner role', () => {
    const a = buildDefaultAssignments(crew, turrets)
    expect(a.pilot).toBe('p1')
    expect(a.leadership).toBe('c1')
    expect(a.tactics).toBe('c1')
  })

  it('assigns best gunner to each turret slot', () => {
    const a = buildDefaultAssignments(crew, turrets)
    expect(a.gunners[1]).toBe('g1')
    expect(a.gunners[2]).toBe('g1')
  })

  it('leaves role null when no member has that skill', () => {
    const a = buildDefaultAssignments(crew, turrets)
    expect(a.engineer).toBeNull()
    expect(a.sensors).toBeNull()
  })

  it('returns null for empty crew array', () => {
    expect(buildDefaultAssignments([], turrets)).toBeNull()
  })

  it('returns null for legacy object crew', () => {
    expect(buildDefaultAssignments({ pilot: 2 }, turrets)).toBeNull()
  })
})

describe('getAssignedSkill', () => {
  const crew = [
    { id: 'p1', name: 'Pilot', skills: { pilot: 2 } },
    { id: 'g1', name: 'Gunner', skills: { gunner: 3 } },
  ]
  const assignments = { pilot: 'p1', leadership: null, gunners: { 1: 'g1', 2: null } }

  it('returns skill of assigned member for non-gunner role', () => {
    expect(getAssignedSkill(crew, assignments, 'pilot')).toBe(2)
  })

  it('returns 0 when role is unassigned (null)', () => {
    expect(getAssignedSkill(crew, assignments, 'leadership')).toBe(0)
  })

  it('returns gunner skill for assigned turret slot', () => {
    expect(getAssignedSkill(crew, assignments, 'gunner', 1)).toBe(3)
  })

  it('returns 0 for unassigned turret slot', () => {
    expect(getAssignedSkill(crew, assignments, 'gunner', 2)).toBe(0)
  })

  it('returns 0 when assignments is null', () => {
    expect(getAssignedSkill(crew, null, 'pilot')).toBe(0)
  })
})

describe('getEffectiveSkill', () => {
  const crew = [
    { id: 'p1', name: 'Pilot', skills: { pilot: 2 } },
    { id: 'g1', name: 'Gunner', skills: { gunner: 3 } },
  ]
  const assignments = { pilot: 'p1', leadership: null, gunners: { 1: 'g1' } }

  it('uses assigned skill when assignments provided', () => {
    expect(getEffectiveSkill(crew, assignments, 'pilot')).toBe(2)
  })

  it('returns 0 for unassigned role with assignments set', () => {
    expect(getEffectiveSkill(crew, assignments, 'leadership')).toBe(0)
  })

  it('falls back to getCrewSkill max when assignments is null', () => {
    expect(getEffectiveSkill(crew, null, 'pilot')).toBe(2)
    expect(getEffectiveSkill(crew, null, 'gunner')).toBe(3)
  })

  it('falls back to getCrewSkill for legacy object crew', () => {
    expect(getEffectiveSkill({ pilot: 2 }, null, 'pilot')).toBe(2)
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

  it('remaps legacy captain key to leadership', () => {
    const result = migrateCrew({ captain: 2, pilot: 1 })
    const leadership = result.find((m) => m.skills.leadership !== undefined)
    expect(leadership).toBeDefined()
    expect(leadership.skills.leadership).toBe(2)
    expect(result.find((m) => m.skills.captain !== undefined)).toBeUndefined()
  })
})
