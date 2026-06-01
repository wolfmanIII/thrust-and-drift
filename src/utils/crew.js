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
 * Build a default crew assignments object from a named crew array and turret list.
 * Each non-gunner role gets the highest-skilled member; each turret slot gets the best gunner.
 * Returns null for legacy object crew (no named members to assign from).
 * @param {object[]|object} crew
 * @param {object[]} [turrets]
 * @returns {object|null}
 */
export function buildDefaultAssignments(crew, turrets = []) {
  if (!Array.isArray(crew) || crew.length === 0) return null
  const NON_GUNNER = ['pilot', 'leadership', 'tactics', 'engineer', 'sensors']
  const assignments = { gunners: {} }
  for (const role of NON_GUNNER) {
    const best = crew.reduce((prev, m) =>
      (m.skills?.[role] ?? 0) > (prev?.skills?.[role] ?? 0) ? m : prev, null)
    assignments[role] = (best && (best.skills?.[role] ?? 0) > 0) ? best.id : null
  }
  for (const turret of (turrets ?? [])) {
    const best = crew.reduce((prev, m) =>
      (m.skills?.gunner ?? 0) > (prev?.skills?.gunner ?? 0) ? m : prev, null)
    assignments.gunners[turret.slot] = (best && (best.skills?.gunner ?? 0) > 0) ? best.id : null
  }
  return assignments
}

/**
 * Get the skill level of the crew member assigned to a specific role.
 * Returns 0 if the role is unassigned or the member lacks the skill.
 * For 'gunner', pass the turret slot number.
 * @param {object[]} crew
 * @param {object} assignments
 * @param {string} skill
 * @param {number|null} [turretSlot]
 * @returns {number}
 */
export function getAssignedSkill(crew, assignments, skill, turretSlot = null) {
  if (!Array.isArray(crew) || !assignments) return 0
  const memberId = skill === 'gunner'
    ? (assignments.gunners?.[turretSlot] ?? null)
    : (assignments[skill] ?? null)
  if (!memberId) return 0
  const member = crew.find((m) => m.id === memberId)
  return member?.skills?.[skill] ?? 0
}

/**
 * Get the effective skill level for a role, using crew assignments when set.
 * Falls back to getCrewSkill (max across all members) when assignments is null —
 * preserving backward-compat for legacy ships and sessions without assignments.
 * @param {object[]|object} crew
 * @param {object|null} assignments
 * @param {string} skill
 * @param {number|null} [turretSlot]  Required for 'gunner' when using assignments
 * @returns {number}
 */
export function getEffectiveSkill(crew, assignments, skill, turretSlot = null) {
  if (assignments == null) return getCrewSkill(crew, skill)
  return getAssignedSkill(crew, assignments, skill, turretSlot)
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
