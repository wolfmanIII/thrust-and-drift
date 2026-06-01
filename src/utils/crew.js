/**
 * Crew array utility — helpers for the named-crew data model.
 * @module crew
 */

import { v7 as uuidv7 } from 'uuid'

/** All skill keys recognised by the crew model. */
export const CREW_SKILLS = ['pilot', 'leadership', 'tactics', 'engineer', 'gunner', 'sensors']

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
 * 'captain' is treated as an alias for 'leadership' for saved-session compat.
 * @param {object[]|object} crew
 * @param {string} skill
 * @returns {number}
 */
export function getCrewSkill(crew, skill) {
  if (!crew) return 0
  if (!Array.isArray(crew)) {
    if (skill === 'leadership') return crew.leadership ?? crew.captain ?? 0
    return crew[skill] ?? 0
  }
  const result = crew.reduce((max, m) => Math.max(max, m.skills?.[skill] ?? 0), 0)
  // Backward compat: sessions saved before the leadership/tactics split stored this as 'captain'
  if (skill === 'leadership' && result === 0) {
    return crew.reduce((max, m) => Math.max(max, m.skills?.captain ?? 0), 0)
  }
  return result
}

/**
 * Convert legacy crew object `{pilot: N, engineer: N, ...}` to crew array.
 * Each non-zero skill becomes a separate crew member named after the role.
 * @param {object} legacy
 * @returns {object[]}
 */
export function migrateCrew(legacy) {
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return legacy ?? []
  // Remap pre-split 'captain' key to 'leadership'
  const normalized = { ...legacy }
  if ('captain' in normalized) {
    normalized.leadership = Math.max(normalized.leadership ?? 0, normalized.captain)
    delete normalized.captain
  }
  return CREW_SKILLS
    .filter((skill) => (normalized[skill] ?? 0) > 0)
    .map((skill) => ({
      id: uuidv7(),
      name: skill.charAt(0).toUpperCase() + skill.slice(1),
      skills: { [skill]: normalized[skill] },
    }))
}
