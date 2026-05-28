/**
 * Tests for useAutosave hook.
 * Mocks db.js to isolate hook logic from IndexedDB implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutosave } from './useAutosave.js'
import { useBattleStore } from '../store/battleStore.js'
import { useProfilesStore } from '../store/profilesStore.js'

// ── db.js mock ──────────────────────────────────────────────────────────────

const mockStore = {}
vi.mock('../utils/db.js', () => ({
  STORE_BATTLE:   'battle',
  STORE_PROFILES: 'profiles',
  dbGet: vi.fn(async (store, key) => mockStore[`${store}:${key}`] ?? null),
  dbPut: vi.fn(async (store, key, value) => { mockStore[`${store}:${key}`] = value }),
  dbDelete: vi.fn(async () => {}),
}))

import { dbPut } from '../utils/db.js'

// ── helpers ─────────────────────────────────────────────────────────────────

function makeShip(id = 's1') {
  return {
    id,
    profileId: 'p1',
    profile: { id: 'p1', name: 'Viper', hull: 10, thrust: 4, crew: { pilot: 1 } },
    faction: 'players',
    color: '#00ffff',
    position: { q: 0, r: 0 },
    vector: { q: 0, r: 0 },
    hullCurrent: 10,
    thrustUsedThisRound: 0,
    thrustBonusThisRound: 0,
    criticalHits: [],
    initiative: 0,
    initiativeBonusNextRound: 0,
    hasActedThisPhase: false,
    evasiveThrust: 0,
    sensorLockOn: null,
    sensorLockedBy: null,
    sensorLockDM: 0,
    turretsNeedingReload: 0,
  }
}

// ── setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(mockStore).forEach((k) => delete mockStore[k])
  useBattleStore.getState().resetBattle('vectorial')
  useProfilesStore.setState({ profiles: [] })
})

// ── restore on mount ─────────────────────────────────────────────────────────

describe('restore on mount', () => {
  it('restores battleStore from IndexedDB when ships present', async () => {
    const saved = {
      id: 'battle-1', name: 'Test', round: 5, combatMode: 'vectorial',
      phase: 'attack', initiativeOrder: [], currentActorIndex: 0,
      ships: [makeShip()], missiles: [], log: [], mapSettings: { scale: 1 },
    }
    mockStore['battle:current'] = saved

    const { unmount } = renderHook(() => useAutosave())
    // wait for async dbGet to resolve
    await act(async () => {})
    unmount()

    expect(useBattleStore.getState().round).toBe(5)
    expect(useBattleStore.getState().phase).toBe('attack')
    expect(useBattleStore.getState().ships).toHaveLength(1)
  })

  it('does not restore when saved battle has no ships', async () => {
    mockStore['battle:current'] = {
      round: 3, phase: 'movement', ships: [], missiles: [], log: [],
    }

    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})
    unmount()

    // remains at default (round 1)
    expect(useBattleStore.getState().round).toBe(1)
  })

  it('does not restore when battleStore already has ships', async () => {
    mockStore['battle:current'] = {
      round: 7, phase: 'attack', ships: [makeShip('db-ship')], missiles: [], log: [],
    }
    // pre-populate store with a different ship
    useBattleStore.setState({ ships: [makeShip('existing-ship')] })

    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})
    unmount()

    // should not have overwritten the existing ship
    expect(useBattleStore.getState().ships[0].id).toBe('existing-ship')
  })

  it('restores profiles from IndexedDB', async () => {
    const profiles = [{ id: 'p1', name: 'Far Trader' }]
    mockStore['profiles:all'] = profiles

    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})
    unmount()

    expect(useProfilesStore.getState().profiles).toEqual(profiles)
  })

  it('does not restore profiles when saved array is empty', async () => {
    mockStore['profiles:all'] = []
    useProfilesStore.setState({ profiles: [{ id: 'p1', name: 'Existing' }] })

    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})
    unmount()

    expect(useProfilesStore.getState().profiles).toHaveLength(1)
  })
})

// ── autosave on significant changes ─────────────────────────────────────────

describe('autosave on significant changes', () => {
  it('writes to IndexedDB when round changes', async () => {
    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})

    act(() => { useBattleStore.setState({ round: 3 }) })
    await act(async () => {})
    unmount()

    expect(dbPut).toHaveBeenCalledWith('battle', 'current', expect.objectContaining({ round: 3 }))
  })

  it('writes to IndexedDB when phase changes', async () => {
    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})

    act(() => { useBattleStore.setState({ phase: 'attack' }) })
    await act(async () => {})
    unmount()

    expect(dbPut).toHaveBeenCalledWith('battle', 'current', expect.objectContaining({ phase: 'attack' }))
  })

  it('writes to IndexedDB when ships array reference changes', async () => {
    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})

    const newShips = [makeShip()]
    act(() => { useBattleStore.setState({ ships: newShips }) })
    await act(async () => {})
    unmount()

    expect(dbPut).toHaveBeenCalledWith('battle', 'current', expect.objectContaining({ ships: newShips }))
  })

  it('includes savedAt timestamp in persisted snapshot', async () => {
    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})

    act(() => { useBattleStore.setState({ round: 2 }) })
    await act(async () => {})
    unmount()

    const call = dbPut.mock.calls.find(([store]) => store === 'battle')
    expect(call).toBeDefined()
    expect(typeof call[2].savedAt).toBe('string')
    expect(() => new Date(call[2].savedAt)).not.toThrow()
  })

  it('writes profiles to IndexedDB when profiles change', async () => {
    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})

    const profiles = [{ id: 'p1', name: 'Viper' }]
    act(() => { useProfilesStore.setState({ profiles }) })
    await act(async () => {})
    unmount()

    expect(dbPut).toHaveBeenCalledWith('profiles', 'all', profiles)
  })
})
