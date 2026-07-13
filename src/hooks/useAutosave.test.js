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

  it('restores dogfights, boardings and rangeBands from IndexedDB', async () => {
    const dogfights  = [{ id: 'dg1', shipIds: ['s1', 's2'], microRound: 1, active: true }]
    const boardings  = [{ id: 'b1', attackerId: 's1', defenderId: 's2', phase: 'contact' }]
    const rangeBands = { 's1_s2': 'Short' }
    mockStore['battle:current'] = {
      id: 'battle-2', name: 'Test', round: 2, combatMode: 'basic',
      phase: 'attack', initiativeOrder: [], currentActorIndex: 0,
      ships: [makeShip()], missiles: [], log: [], mapSettings: { scale: 1 },
      dogfights, boardings, rangeBands,
    }

    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})
    unmount()

    const state = useBattleStore.getState()
    expect(state.dogfights).toEqual(dogfights)
    expect(state.boardings).toEqual(boardings)
    expect(state.rangeBands).toEqual(rangeBands)
  })

  it('restores basicBandPool from IndexedDB', async () => {
    const basicBandPool = { 's1_s2': 2, 's1_s3': -1 }
    mockStore['battle:current'] = {
      id: 'battle-3', name: 'Test', round: 1, combatMode: 'basic',
      phase: 'attack', initiativeOrder: [], currentActorIndex: 0,
      ships: [makeShip()], missiles: [], log: [], mapSettings: { scale: 1 },
      basicBandPool,
    }

    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})
    unmount()

    expect(useBattleStore.getState().basicBandPool).toEqual(basicBandPool)
  })

  it('defaults basicBandPool to {} when not present in saved data', async () => {
    mockStore['battle:current'] = {
      id: 'battle-4', name: 'Test', round: 1, combatMode: 'basic',
      phase: 'attack', initiativeOrder: [], currentActorIndex: 0,
      ships: [makeShip()], missiles: [], log: [], mapSettings: { scale: 1 },
      // no basicBandPool field
    }

    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})
    unmount()

    expect(useBattleStore.getState().basicBandPool).toEqual({})
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

  it('includes dogfights, boardings and rangeBands in persisted snapshot', async () => {
    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})

    const dogfights  = [{ id: 'dg1', shipIds: ['s1', 's2'], microRound: 2, active: true }]
    const boardings  = [{ id: 'b1', attackerId: 's1', defenderId: 's2', phase: 'conflict' }]
    const rangeBands = { 's1_s2': 'Medium' }
    act(() => { useBattleStore.setState({ round: 2, dogfights, boardings, rangeBands }) })
    await act(async () => {})
    unmount()

    const call = dbPut.mock.calls.find(([store]) => store === 'battle')
    expect(call[2]).toMatchObject({ dogfights, boardings, rangeBands })
  })

  it('includes basicBandPool in persisted snapshot', async () => {
    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})

    const basicBandPool = { 's1_s2': 3 }
    act(() => { useBattleStore.setState({ round: 2, basicBandPool }) })
    await act(async () => {})
    unmount()

    const call = dbPut.mock.calls.find(([store]) => store === 'battle')
    expect(call[2]).toMatchObject({ basicBandPool })
  })

  it('includes pendingMissileImpacts, pendingObstacleCollisions and shipAddedThisRound in persisted snapshot', async () => {
    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})

    const pendingMissileImpacts = [{ id: 'impact1', shipId: 's1', targetId: 's2', count: 2, type: 'Standard' }]
    const pendingObstacleCollisions = [{ id: 'coll1', shipId: 's1', obstacle: { type: 'debris_field' }, position: { q: 0, r: 0 } }]
    act(() => { useBattleStore.setState({ round: 2, pendingMissileImpacts, pendingObstacleCollisions, shipAddedThisRound: true }) })
    await act(async () => {})
    unmount()

    const call = dbPut.mock.calls.find(([store]) => store === 'battle')
    expect(call[2]).toMatchObject({ pendingMissileImpacts, pendingObstacleCollisions, shipAddedThisRound: true })
  })
})

describe('restore on mount — pendingMissileImpacts, pendingObstacleCollisions, shipAddedThisRound', () => {
  it('restores all three from IndexedDB', async () => {
    const pendingMissileImpacts = [{ id: 'impact-restore', shipId: 's1', targetId: 's2', count: 1, type: 'Smart' }]
    const pendingObstacleCollisions = [{ id: 'coll-restore', shipId: 's1', obstacle: { type: 'nebula' }, position: { q: 1, r: 1 } }]
    mockStore['battle:current'] = {
      id: 'battle-5', name: 'Test', round: 3, combatMode: 'vectorial',
      phase: 'attack', initiativeOrder: [], currentActorIndex: 0,
      ships: [makeShip()], missiles: [], log: [], mapSettings: { scale: 1 },
      pendingMissileImpacts, pendingObstacleCollisions, shipAddedThisRound: true,
    }

    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})
    unmount()

    const state = useBattleStore.getState()
    expect(state.pendingMissileImpacts).toEqual(pendingMissileImpacts)
    expect(state.pendingObstacleCollisions).toEqual(pendingObstacleCollisions)
    expect(state.shipAddedThisRound).toBe(true)
  })

  it('defaults all three when absent from saved data', async () => {
    mockStore['battle:current'] = {
      id: 'battle-6', name: 'Test', round: 1, combatMode: 'vectorial',
      phase: 'setup', initiativeOrder: [], currentActorIndex: 0,
      ships: [makeShip()], missiles: [], log: [], mapSettings: { scale: 1 },
      // pendingMissileImpacts / pendingObstacleCollisions / shipAddedThisRound intentionally absent
    }

    const { unmount } = renderHook(() => useAutosave())
    await act(async () => {})
    unmount()

    const state = useBattleStore.getState()
    expect(state.pendingMissileImpacts).toEqual([])
    expect(state.pendingObstacleCollisions).toEqual([])
    expect(state.shipAddedThisRound).toBe(false)
  })
})
