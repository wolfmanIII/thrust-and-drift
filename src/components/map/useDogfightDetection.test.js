import { describe, it, expect } from 'vitest'
import { detectDogfightGroups } from './useDogfightDetection.js'

function ship(id, q, r, faction, inDogfight = null) {
  return { id, position: { q, r }, faction, inDogfight }
}

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
})
