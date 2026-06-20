import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { detectDogfightGroups, detectDogfightGroupsBasic, useDogfightDetection } from './useDogfightDetection.js'
import { useBattleStore } from '../../store/battleStore.js'

function ship(id, q, r, faction, inDogfight = null, inBoarding = null) {
  return { id, position: { q, r }, faction, inDogfight, inBoarding }
}

// ── useDogfightDetection hook ────────────────────────────────────────────────

describe('useDogfightDetection hook', () => {
  function setHostileShipsInSameHex() {
    useBattleStore.setState({
      ships: [
        { id: 's1', faction: 'players', position: { q: 0, r: 0 }, inDogfight: null, profile: { name: 'A', thrust: 4, tonnage: 100, crew: [] } },
        { id: 's2', faction: 'npc',     position: { q: 0, r: 0 }, inDogfight: null, profile: { name: 'B', thrust: 4, tonnage: 100, crew: [] } },
      ],
    })
  }

  beforeEach(() => {
    useBattleStore.getState().resetBattle('vectorial')
    useBattleStore.setState({ phase: 'movement', round: 1 })
  })

  it('fires detectedGroups on movement→attack in vectorial mode', () => {
    setHostileShipsInSameHex()
    const { result } = renderHook(() => useDogfightDetection())
    act(() => { useBattleStore.setState({ phase: 'attack' }) })
    expect(result.current.detectedGroups).toHaveLength(1)
  })

  it('does not fire in non-vectorial (initiative) mode', () => {
    setHostileShipsInSameHex()
    useBattleStore.setState({ combatMode: 'initiative' })
    const { result } = renderHook(() => useDogfightDetection())
    act(() => { useBattleStore.setState({ phase: 'attack' }) })
    expect(result.current.detectedGroups).toHaveLength(0)
  })

  it('does not re-detect in the same round after undo+redo of phase transition', () => {
    setHostileShipsInSameHex()
    const { result } = renderHook(() => useDogfightDetection())

    // Initial detection
    act(() => { useBattleStore.setState({ phase: 'attack' }) })
    expect(result.current.detectedGroups).toHaveLength(1)

    // GM dismisses modal
    act(() => { result.current.clearDetected() })
    expect(result.current.detectedGroups).toHaveLength(0)

    // Undo back to movement, then re-advance — same round
    act(() => { useBattleStore.setState({ phase: 'movement' }) })
    act(() => { useBattleStore.setState({ phase: 'attack' }) })

    expect(result.current.detectedGroups).toHaveLength(0)
  })

  it('fires again after clearDetected when round increments', () => {
    setHostileShipsInSameHex()
    const { result } = renderHook(() => useDogfightDetection())

    act(() => { useBattleStore.setState({ phase: 'attack' }) })
    act(() => { result.current.clearDetected() })

    // New round
    act(() => { useBattleStore.setState({ phase: 'movement', round: 2 }) })
    act(() => { useBattleStore.setState({ phase: 'attack' }) })

    expect(result.current.detectedGroups).toHaveLength(1)
  })

  it('clearDetected resets detectedGroups to empty', () => {
    setHostileShipsInSameHex()
    const { result } = renderHook(() => useDogfightDetection())
    act(() => { useBattleStore.setState({ phase: 'attack' }) })
    act(() => { result.current.clearDetected() })
    expect(result.current.detectedGroups).toHaveLength(0)
  })
})

// ── detectDogfightGroups pure function ───────────────────────────────────────

describe('detectDogfightGroups', () => {
  it('returns empty when no ships', () =>
    expect(detectDogfightGroups([])).toEqual([]))

  it('returns empty with one ship', () =>
    expect(detectDogfightGroups([ship('a', 0, 0, 'players')])).toEqual([]))

  it('returns empty when same hex but same faction', () => {
    const ships = [ship('a', 0, 0, 'players'), ship('b', 0, 0, 'players')]
    expect(detectDogfightGroups(ships)).toEqual([])
  })

  it('returns empty when different factions but different hexes', () => {
    const ships = [ship('a', 0, 0, 'players'), ship('b', 1, 0, 'npc')]
    expect(detectDogfightGroups(ships)).toEqual([])
  })

  it('detects one group for two ships in same hex, different factions', () => {
    const ships = [ship('a', 0, 0, 'players'), ship('b', 0, 0, 'npc')]
    const result = detectDogfightGroups(ships)
    expect(result).toHaveLength(1)
    expect(result[0].shipIds).toContain('a')
    expect(result[0].shipIds).toContain('b')
  })

  it('excludes ships already in a dogfight', () => {
    const ships = [
      ship('a', 0, 0, 'players', 'group-x'),
      ship('b', 0, 0, 'npc', null),
    ]
    expect(detectDogfightGroups(ships)).toEqual([])
  })

  it('groups 3 ships in same hex into one group', () => {
    const ships = [
      ship('a', 0, 0, 'players'),
      ship('b', 0, 0, 'npc'),
      ship('c', 0, 0, 'npc'),
    ]
    const result = detectDogfightGroups(ships)
    expect(result).toHaveLength(1)
    expect(result[0].shipIds).toHaveLength(3)
  })

  it('detects two independent groups in different hexes', () => {
    const ships = [
      ship('a', 0, 0, 'players'),
      ship('b', 0, 0, 'npc'),
      ship('c', 3, 3, 'players'),
      ship('d', 3, 3, 'npc'),
    ]
    const result = detectDogfightGroups(ships)
    expect(result).toHaveLength(2)
  })

  it('one contact hex, one single-ship hex — only one group', () => {
    const ships = [
      ship('a', 0, 0, 'players'),
      ship('b', 0, 0, 'npc'),
      ship('c', 5, 5, 'players'),
    ]
    expect(detectDogfightGroups(ships)).toHaveLength(1)
  })

  it('ignores ships with inBoarding in dogfight detection', () => {
    const ships = [
      ship('a', 0, 0, 'players', null, 'boarding-1'),
      ship('b', 0, 0, 'npc',     null, null),
    ]
    expect(detectDogfightGroups(ships)).toEqual([])
  })

  it('detects dogfight only among free ships in the same hex', () => {
    const ships = [
      ship('a', 0, 0, 'players', null, null),
      ship('b', 0, 0, 'npc',     null, null),
      ship('c', 0, 0, 'npc',     null, 'boarding-2'),
    ]
    const groups = detectDogfightGroups(ships)
    expect(groups).toHaveLength(1)
    expect(groups[0].shipIds).toEqual(expect.arrayContaining(['a', 'b']))
    expect(groups[0].shipIds).not.toContain('c')
  })
})

// ── detectDogfightGroupsBasic pure function ──────────────────────────────────

function basicShip(id, faction, inDogfight = null, inBoarding = null) {
  return { id, faction, inDogfight, inBoarding, isDestroyed: false, profile: { name: id } }
}

describe('detectDogfightGroupsBasic', () => {
  it('returns empty when no pairs', () =>
    expect(detectDogfightGroupsBasic([], {})).toEqual([]))

  it('returns empty when no pair is Adjacent', () => {
    const ships = [basicShip('a', 'players'), basicShip('b', 'npc')]
    expect(detectDogfightGroupsBasic(ships, { 'a_b': 'Short' })).toEqual([])
  })

  it('detects group when pair is Adjacent and factions differ', () => {
    const ships = [basicShip('a', 'players'), basicShip('b', 'npc')]
    const groups = detectDogfightGroupsBasic(ships, { 'a_b': 'Adjacent' })
    expect(groups).toHaveLength(1)
    expect(groups[0].shipIds).toEqual(expect.arrayContaining(['a', 'b']))
  })

  it('ignores Adjacent pair with same faction', () => {
    const ships = [basicShip('a', 'players'), basicShip('b', 'players')]
    expect(detectDogfightGroupsBasic(ships, { 'a_b': 'Adjacent' })).toEqual([])
  })

  it('ignores ships already in dogfight', () => {
    const ships = [basicShip('a', 'players', 'group-x'), basicShip('b', 'npc')]
    expect(detectDogfightGroupsBasic(ships, { 'a_b': 'Adjacent' })).toEqual([])
  })

  it('fires on movement→attack in basic mode with Adjacent pair', () => {
    useBattleStore.getState().resetBattle('basic')
    useBattleStore.setState({
      phase: 'movement',
      round: 1,
      ships: [
        { id: 's1', faction: 'players', inDogfight: null, inBoarding: null, isDestroyed: false, profile: { name: 'A', thrust: 2, tonnage: 100, crew: [] } },
        { id: 's2', faction: 'npc',     inDogfight: null, inBoarding: null, isDestroyed: false, profile: { name: 'B', thrust: 2, tonnage: 100, crew: [] } },
      ],
      rangeBands: { 's1_s2': 'Adjacent' },
    })
    const { result } = renderHook(() => useDogfightDetection())
    act(() => { useBattleStore.setState({ phase: 'attack' }) })
    expect(result.current.detectedGroups).toHaveLength(1)
  })
})
