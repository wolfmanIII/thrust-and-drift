/**
 * Ship profiles store — CRUD and persistence via File API.
 * Profiles are static ship definitions; no battle state here.
 */

import { create } from 'zustand'
import { v7 as uuidv7 } from 'uuid'
import { DEFAULT_PROFILES } from '../data/defaultProfiles.js'
import { exportProfiles, importProfiles } from '../utils/io.js'

const useProfilesStore = create((set, get) => ({
  /** @type {object[]} Array of ShipProfile objects */
  profiles: [...DEFAULT_PROFILES],

  // === CRUD ===

  /**
   * Add a new ship profile. Generates id and createdAt if missing.
   * @param {object} profile
   */
  addProfile: (profile) => {
    const complete = {
      id: profile.id ?? uuidv7(),
      createdAt: profile.createdAt ?? new Date().toISOString(),
      ...profile,
    }
    set((s) => ({ profiles: [...s.profiles, complete] }))
  },

  /**
   * Update an existing profile by id.
   * @param {string} id
   * @param {Partial<object>} updates
   */
  updateProfile: (id, updates) => {
    set((s) => ({
      profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }))
  },

  /**
   * Remove a profile by id.
   * @param {string} id
   */
  deleteProfile: (id) => {
    set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) }))
  },

  /**
   * Duplicate a profile with a new id and "(Copy)" suffix.
   * @param {string} id
   */
  duplicateProfile: (id) => {
    const original = get().profiles.find((p) => p.id === id)
    if (!original) return
    const copy = {
      ...original,
      id: uuidv7(),
      createdAt: new Date().toISOString(),
      name: `${original.name} (Copy)`,
    }
    set((s) => ({ profiles: [...s.profiles, copy] }))
  },

  // === IMPORT / EXPORT ===

  /** Export all profiles to a JSON file via File API. */
  exportAll: () => {
    exportProfiles(get().profiles)
  },

  /**
   * Import profiles from a File object. Merges by id (no duplicates).
   * @param {File} file
   * @returns {Promise<{ added: number, skipped: number }>}
   */
  importFromFile: async (file) => {
    const incoming = await importProfiles(file)
    const existing = get().profiles
    const existingIds = new Set(existing.map((p) => p.id))
    const toAdd = incoming.filter((p) => !existingIds.has(p.id))
    set((s) => ({ profiles: [...s.profiles, ...toAdd] }))
    return { added: toAdd.length, skipped: incoming.length - toAdd.length }
  },
}))

export { useProfilesStore }
