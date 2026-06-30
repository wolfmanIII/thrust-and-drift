/**
 * Tests for useAttackSetup — same-type weapon grouping (#14) + Aid Gunners DM (#16).
 * Verifies linkedCount, damageDiceBonus (CRB p.168) and aidGunnersDM pass-through.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAttackSetup } from './useAttackSetup.js'
import { useBattleStore } from '../../store/battleStore.js'

function addAttacker(turrets, faction = 'players') {
  const profile = {
    id:      'profile-att',
    name:    'Attacker',
    hull:    20,
    armor:   0,
    thrust:  4,
    tonnage: 100,
    turrets,
    crew:    [],
  }
  useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, faction, '#0f0')
  return useBattleStore.getState().ships[0]
}

function addTarget() {
  const profile = { id: 'profile-tgt', name: 'Target', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] }
  useBattleStore.getState().addShip(profile, { q: 5, r: 0 }, 'npc', '#f00')
  return useBattleStore.getState().ships.at(-1)
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
})

describe('useAttackSetup — same-type weapon grouping (#14)', () => {
  it('single weapon in slot: linkedCount 1, damageDiceBonus 0', () => {
    const att = addAttacker([{ slot: 1, weapons: ['Pulse Laser'] }])
    const { result } = renderHook(() =>
      useAttackSetup(att.id, '', '', null, null)
    )
    const w = result.current.availableWeapons
    expect(w).toHaveLength(1)
    expect(w[0]).toMatchObject({ weaponName: 'Pulse Laser', turretSlot: 1, linkedCount: 1, damageDiceBonus: 0 })
  })

  it('double turret with 2× Pulse Laser (2D): linkedCount 2, damageDiceBonus 2', () => {
    // 2 additional would be (2-1)*2 = 2
    const att = addAttacker([{ slot: 1, weapons: ['Pulse Laser', 'Pulse Laser'] }])
    const { result } = renderHook(() =>
      useAttackSetup(att.id, '', '', null, null)
    )
    const w = result.current.availableWeapons
    expect(w).toHaveLength(1)
    expect(w[0]).toMatchObject({ weaponName: 'Pulse Laser', turretSlot: 1, linkedCount: 2, damageDiceBonus: 2 })
  })

  it('triple turret with 3× Pulse Laser (2D): linkedCount 3, damageDiceBonus 4', () => {
    // (3-1)*2 = 4 — matches CRB p.168 example (3× Pulse Laser → 2D+4)
    const att = addAttacker([{ slot: 1, weapons: ['Pulse Laser', 'Pulse Laser', 'Pulse Laser'] }])
    const { result } = renderHook(() =>
      useAttackSetup(att.id, '', '', null, null)
    )
    const w = result.current.availableWeapons
    expect(w).toHaveLength(1)
    expect(w[0]).toMatchObject({ weaponName: 'Pulse Laser', turretSlot: 1, linkedCount: 3, damageDiceBonus: 4 })
  })

  it('quad turret with 4× Pulse Laser (2D): linkedCount 4, damageDiceBonus 6 (HG p.81)', () => {
    // (4-1)*2 = 6 — quad turret linking (HG p.81)
    const att = addAttacker([{ slot: 1, weapons: ['Pulse Laser', 'Pulse Laser', 'Pulse Laser', 'Pulse Laser'] }])
    const { result } = renderHook(() =>
      useAttackSetup(att.id, '', '', null, null)
    )
    const w = result.current.availableWeapons
    expect(w).toHaveLength(1)
    expect(w[0]).toMatchObject({ weaponName: 'Pulse Laser', turretSlot: 1, linkedCount: 4, damageDiceBonus: 6 })
  })

  it('2× Beam Laser (1D): damageDiceBonus 1', () => {
    // (2-1)*1 = 1 → 1D+1
    const att = addAttacker([{ slot: 1, weapons: ['Beam Laser', 'Beam Laser'] }])
    const { result } = renderHook(() =>
      useAttackSetup(att.id, '', '', null, null)
    )
    const w = result.current.availableWeapons
    expect(w).toHaveLength(1)
    expect(w[0]).toMatchObject({ weaponName: 'Beam Laser', turretSlot: 1, linkedCount: 2, damageDiceBonus: 1 })
  })

  it('mixed-type turret: one entry per type, each linkedCount 1, damageDiceBonus 0', () => {
    const att = addAttacker([{ slot: 1, weapons: ['Pulse Laser', 'Beam Laser'] }])
    const { result } = renderHook(() =>
      useAttackSetup(att.id, '', '', null, null)
    )
    const w = result.current.availableWeapons
    expect(w).toHaveLength(2)
    expect(w.every((e) => e.linkedCount === 1 && e.damageDiceBonus === 0)).toBe(true)
    expect(w.map((e) => e.weaponName).sort()).toEqual(['Beam Laser', 'Pulse Laser'])
  })

  it('mixed-type turret with 2× Pulse Laser + Beam Laser: Pulse Laser linked, Beam Laser not', () => {
    const att = addAttacker([{ slot: 1, weapons: ['Pulse Laser', 'Pulse Laser', 'Beam Laser'] }])
    const { result } = renderHook(() =>
      useAttackSetup(att.id, '', '', null, null)
    )
    const w = result.current.availableWeapons
    expect(w).toHaveLength(2)
    const pl = w.find((e) => e.weaponName === 'Pulse Laser')
    const bl = w.find((e) => e.weaponName === 'Beam Laser')
    expect(pl).toMatchObject({ linkedCount: 2, damageDiceBonus: 2 })
    expect(bl).toMatchObject({ linkedCount: 1, damageDiceBonus: 0 })
  })

  it('Missile Rack: damageDiceBonus 0 regardless of count (excluded per CRB p.172)', () => {
    const att = addAttacker([{ slot: 1, weapons: ['Missile Rack', 'Missile Rack'] }])
    const { result } = renderHook(() =>
      useAttackSetup(att.id, '', '', null, null)
    )
    const w = result.current.availableWeapons
    const mr = w.find((e) => e.weaponName === 'Missile Rack')
    expect(mr).toMatchObject({ linkedCount: 2, damageDiceBonus: 0 })
  })

  it('Sandcasters excluded from availableWeapons (defensive weapon)', () => {
    const att = addAttacker([{ slot: 1, weapons: ['Sandcaster', 'Sandcaster'] }])
    const { result } = renderHook(() =>
      useAttackSetup(att.id, '', '', null, null)
    )
    expect(result.current.availableWeapons).toHaveLength(0)
  })

  it('fired turret slot excluded from availableWeapons', () => {
    const att = addAttacker([
      { slot: 1, weapons: ['Pulse Laser', 'Pulse Laser'] },
      { slot: 2, weapons: ['Beam Laser'] },
    ])
    useBattleStore.setState({
      ships: useBattleStore.getState().ships.map((s) =>
        s.id === att.id ? { ...s, firedTurrets: [1] } : s
      ),
    })
    const { result } = renderHook(() =>
      useAttackSetup(att.id, '', '', null, null)
    )
    const w = result.current.availableWeapons
    expect(w).toHaveLength(1)
    expect(w[0]).toMatchObject({ weaponName: 'Beam Laser', turretSlot: 2 })
  })

  it('multiple slots: each slot grouped independently', () => {
    const att = addAttacker([
      { slot: 1, weapons: ['Pulse Laser', 'Pulse Laser'] },
      { slot: 2, weapons: ['Beam Laser'] },
    ])
    const { result } = renderHook(() =>
      useAttackSetup(att.id, '', '', null, null)
    )
    const w = result.current.availableWeapons
    expect(w).toHaveLength(2)
    const pl = w.find((e) => e.weaponName === 'Pulse Laser')
    const bl = w.find((e) => e.weaponName === 'Beam Laser')
    expect(pl).toMatchObject({ turretSlot: 1, linkedCount: 2, damageDiceBonus: 2 })
    expect(bl).toMatchObject({ turretSlot: 2, linkedCount: 1, damageDiceBonus: 0 })
  })
})

// === AID GUNNERS DM (#16) ===
// // MgT2e CRB p.63, p.166

describe('useAttackSetup — aidGunnersDM in dmBreakdown', () => {
  it('aidGunnersDM=0 when ship has no aid (default)', () => {
    const att = addAttacker([{ slot: 1, weapons: ['Pulse Laser'] }])
    addTarget()
    const tgt = useBattleStore.getState().ships.at(-1)
    const { result } = renderHook(() =>
      useAttackSetup(att.id, 'Pulse Laser', '1', tgt.id, null)
    )
    expect(result.current.dmBreakdown.aidGunnersDM).toBe(0)
  })

  it('aidGunnersDM propagates from store to dmBreakdown', () => {
    const att = addAttacker([{ slot: 1, weapons: ['Pulse Laser'] }])
    addTarget()
    const tgt = useBattleStore.getState().ships.at(-1)
    useBattleStore.getState().applyAidGunners(att.id, 2)
    const { result } = renderHook(() =>
      useAttackSetup(att.id, 'Pulse Laser', '1', tgt.id, null)
    )
    expect(result.current.dmBreakdown.aidGunnersDM).toBe(2)
  })

  it('negative aidGunnersDM (failed Aid Gunners roll) propagates to dmBreakdown', () => {
    const att = addAttacker([{ slot: 1, weapons: ['Pulse Laser'] }])
    addTarget()
    const tgt = useBattleStore.getState().ships.at(-1)
    useBattleStore.getState().applyAidGunners(att.id, -1)
    const { result } = renderHook(() =>
      useAttackSetup(att.id, 'Pulse Laser', '1', tgt.id, null)
    )
    expect(result.current.dmBreakdown.aidGunnersDM).toBe(-1)
  })
})

// === TORPEDO DM-2 vs SMALL SHIPS (#20 Bug 3) ===
// HG p.39 — torpedo attacks vs ships < 2,000 tons suffer DM-2

describe('useAttackSetup — torpedoSmallShipDM (#20 Bug 3)', () => {
  it('DM-2 when weapon is Torpedo and target < 2,000 tons', () => {
    const att = addAttacker([{ slot: 1, weapons: ['Torpedo'] }])
    const profile = { id: 'profile-tgt', name: 'Corvette', hull: 50, armor: 0, thrust: 4, tonnage: 800, turrets: [], crew: [] }
    useBattleStore.getState().addShip(profile, { q: 5, r: 0 }, 'npc', '#f00')
    const tgt = useBattleStore.getState().ships.at(-1)
    const { result } = renderHook(() =>
      useAttackSetup(att.id, tgt.id, 'Torpedo', null, 1)
    )
    expect(result.current.dmBreakdown.torpedoSmallShipDM).toBe(-2)
  })

  it('DM 0 when weapon is Torpedo and target is exactly 2,000 tons (threshold excluded)', () => {
    const att = addAttacker([{ slot: 1, weapons: ['Torpedo'] }])
    const profile = { id: 'profile-tgt', name: 'Cruiser', hull: 200, armor: 0, thrust: 4, tonnage: 2000, turrets: [], crew: [] }
    useBattleStore.getState().addShip(profile, { q: 5, r: 0 }, 'npc', '#f00')
    const tgt = useBattleStore.getState().ships.at(-1)
    const { result } = renderHook(() =>
      useAttackSetup(att.id, tgt.id, 'Torpedo', null, 1)
    )
    expect(result.current.dmBreakdown.torpedoSmallShipDM).toBe(0)
  })

  it('DM 0 when weapon is Torpedo and target > 2,000 tons', () => {
    const att = addAttacker([{ slot: 1, weapons: ['Torpedo'] }])
    const profile = { id: 'profile-tgt', name: 'Battleship', hull: 500, armor: 0, thrust: 4, tonnage: 10000, turrets: [], crew: [] }
    useBattleStore.getState().addShip(profile, { q: 5, r: 0 }, 'npc', '#f00')
    const tgt = useBattleStore.getState().ships.at(-1)
    const { result } = renderHook(() =>
      useAttackSetup(att.id, tgt.id, 'Torpedo', null, 1)
    )
    expect(result.current.dmBreakdown.torpedoSmallShipDM).toBe(0)
  })

  it('DM 0 for non-torpedo weapon regardless of target tonnage', () => {
    const att = addAttacker([{ slot: 1, weapons: ['Pulse Laser'] }])
    const profile = { id: 'profile-tgt', name: 'Fighter', hull: 10, armor: 0, thrust: 4, tonnage: 50, turrets: [], crew: [] }
    useBattleStore.getState().addShip(profile, { q: 5, r: 0 }, 'npc', '#f00')
    const tgt = useBattleStore.getState().ships.at(-1)
    const { result } = renderHook(() =>
      useAttackSetup(att.id, tgt.id, 'Pulse Laser', null, 1)
    )
    expect(result.current.dmBreakdown.torpedoSmallShipDM).toBe(0)
  })

  it('torpedoSmallShipDM is included in totalDM', () => {
    // 100t target at distance 5 (Medium, rangeDM=0) — no other active DMs
    // totalDM = gunner(0) + weapon(0) + range(0) + size(0) + torpedoSmall(-2) = -2
    const att = addAttacker([{ slot: 1, weapons: ['Torpedo'] }])
    const profile = { id: 'profile-tgt', name: 'Scout', hull: 20, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] }
    useBattleStore.getState().addShip(profile, { q: 5, r: 0 }, 'npc', '#f00')
    const tgt = useBattleStore.getState().ships.at(-1)
    const { result } = renderHook(() =>
      useAttackSetup(att.id, tgt.id, 'Torpedo', null, 1)
    )
    const { torpedoSmallShipDM, totalDM } = result.current.dmBreakdown
    expect(torpedoSmallShipDM).toBe(-2)
    expect(totalDM).toBe(-2)
  })
})
