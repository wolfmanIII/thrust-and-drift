/**
 * Crew array utility — helpers for the named-crew data model.
 * @module crew
 */

import { v7 as uuidv7 } from 'uuid'

/** All skill keys recognised by the crew model. */
export const CREW_SKILLS = ['pilot', 'captain', 'engineer', 'gunner', 'sensors']

/**
 * Create a blank crew member with a fresh ID.
 * @returns {{ id: string, name: string, skills: object }}
 */
export function blankCrewMember() {
  return { id: uuidv7(), name: '', skills: {} }
}

/**
 * Get the highest skill level for a given skill across all crew members.
 * Backwards-compatible: handles both array and legacy `{pilot: N, ...}` object.
 * @param {object[]|object} crew
 * @param {string} skill
 * @returns {number}
 */
export function getCrewSkill(crew, skill) {
  if (!crew) return 0
  if (!Array.isArray(crew)) return crew[skill] ?? 0
  return crew.reduce((max, m) => Math.max(max, m.skills?.[skill] ?? 0), 0)
}

/**
 * Convert legacy crew object `{pilot: N, engineer: N, ...}` to crew array.
 * Each non-zero skill becomes a separate crew member named after the role.
 * @param {object} legacy
 * @returns {object[]}
 */
export function migrateCrew(legacy) {
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return legacy ?? []
  return CREW_SKILLS
    .filter((skill) => (legacy[skill] ?? 0) > 0)
    .map((skill) => ({
      id: uuidv7(),
      name: skill.charAt(0).toUpperCase() + skill.slice(1),
      skills: { [skill]: legacy[skill] },
    }))
}
