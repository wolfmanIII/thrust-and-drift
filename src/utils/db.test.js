/**
 * Tests for IndexedDB wrapper.
 * Uses fake-indexeddb to provide a full in-memory IDB implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { dbGet, dbPut, dbDelete, STORE_BATTLE, STORE_PROFILES } from './db.js'

// Fresh IDBFactory per test — no shared state, no deleteDatabase race
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory())
})

describe('dbPut / dbGet', () => {
  it('returns null for missing key', async () => {
    const result = await dbGet(STORE_BATTLE, 'current')
    expect(result).toBeNull()
  })

  it('round-trips a battle snapshot', async () => {
    const snapshot = { id: 'abc', round: 3, phase: 'attack', ships: [{ id: 's1' }] }
    await dbPut(STORE_BATTLE, 'current', snapshot)
    const result = await dbGet(STORE_BATTLE, 'current')
    expect(result).toEqual(snapshot)
  })

  it('overwrites existing value', async () => {
    await dbPut(STORE_BATTLE, 'current', { round: 1 })
    await dbPut(STORE_BATTLE, 'current', { round: 5 })
    const result = await dbGet(STORE_BATTLE, 'current')
    expect(result.round).toBe(5)
  })

  it('stores profiles independently from battle', async () => {
    await dbPut(STORE_BATTLE, 'current', { round: 2 })
    await dbPut(STORE_PROFILES, 'all', [{ id: 'p1', name: 'Viper' }])
    const battle   = await dbGet(STORE_BATTLE, 'current')
    const profiles = await dbGet(STORE_PROFILES, 'all')
    expect(battle.round).toBe(2)
    expect(profiles).toHaveLength(1)
  })

  it('returns null for a key in profiles store that was never written', async () => {
    const result = await dbGet(STORE_PROFILES, 'all')
    expect(result).toBeNull()
  })
})

describe('dbDelete', () => {
  it('removes a key so subsequent get returns null', async () => {
    await dbPut(STORE_BATTLE, 'current', { round: 7 })
    await dbDelete(STORE_BATTLE, 'current')
    const result = await dbGet(STORE_BATTLE, 'current')
    expect(result).toBeNull()
  })

  it('is a no-op on a non-existent key', async () => {
    await expect(dbDelete(STORE_BATTLE, 'ghost')).resolves.not.toThrow()
  })
})
