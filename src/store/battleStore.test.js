/**
 * Integration tests for battleStore actions.
 * Uses Zustand's .getState() API — no React renderer needed.
 * Math.random is mocked where dice rolls must be deterministic.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

vi.mock('../utils/io.js', () => ({
  exportBattle:   vi.fn(),
  importBattle:   vi.fn(),
  exportProfiles: vi.fn(),
  importProfiles: vi.fn(),
}))

import { exportBattle, importBattle } from '../utils/io.js'
import { useBattleStore } from './battleStore.js'

// === HELPERS ===

/** Minimal valid ShipProfile for tests. */
function makeProfile(overrides = {}) {
  return {
    id:        'profile-1',
    name:      'Test Ship',
    shipClass: 'Type S',
    tonnage:   100,
    hull:      10,
    thrust:    4,
    turrets:   [],
    crew:      { pilot: 2, gunner: 1 },
    ...overrides,
  }
}

/** Reset store to clean initial state before each test. */
beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
})

// === SHIP MANAGEMENT ===

describe('addShip', () => {
  it('appends ship to ships array', () => {
    const store = useBattleStore.getState()
    store.addShip(makeProfile(), { q: 1, r: 0 }, 'players', '#00ff00')
    expect(useBattleStore.getState().ships).toHaveLength(1)
  })

  it('initialises ship with correct defaults', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 2, r: -1 }, 'npc', '#ff0000')
    const ship = useBattleStore.getState().ships[0]
    expect(ship.hullCurrent).toBe(10)
    expect(ship.vector).toEqual({ q: 0, r: 0 })
    expect(ship.position).toEqual({ q: 2, r: -1 })
    expect(ship.faction).toBe('npc')
    expect(ship.color).toBe('#ff0000')
    expect(ship.criticalHits).toEqual([])
    expect(ship.thrustPenalty).toBe(0)
    expect(ship.evasiveThrust).toBe(0)
    expect(ship.thrustUsedThisRound).toBe(0)
  })

  it('snapshots profile (no reference sharing)', () => {
    const profile = makeProfile()
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'neutral', '#aaa')
    profile.name = 'MUTATED'
    expect(useBattleStore.getState().ships[0].profile.name).toBe('Test Ship')
  })

  it('adds log entry', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    expect(useBattleStore.getState().log).toHaveLength(1)
  })

  it('multiple ships accumulate', () => {
    const store = useBattleStore.getState()
    store.addShip(makeProfile({ id: 'p1', name: 'Alpha' }), { q: 0, r: 0 }, 'players', '#0f0')
    store.addShip(makeProfile({ id: 'p2', name: 'Beta'  }), { q: 1, r: 0 }, 'npc',     '#f00')
    expect(useBattleStore.getState().ships).toHaveLength(2)
  })
})

describe('removeShip', () => {
  it('removes the ship', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().removeShip(id)
    expect(useBattleStore.getState().ships).toHaveLength(0)
  })

  it('unknown shipId is no-op', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().removeShip('does-not-exist')
    expect(useBattleStore.getState().ships).toHaveLength(1)
  })

  it('removes ship from initiativeOrder', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    // Manually inject into initiativeOrder
    useBattleStore.setState({ initiativeOrder: [id] })
    useBattleStore.getState().removeShip(id)
    expect(useBattleStore.getState().initiativeOrder).not.toContain(id)
  })

  it('adds log entry', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const logBefore = useBattleStore.getState().log.length
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().removeShip(id)
    expect(useBattleStore.getState().log.length).toBeGreaterThan(logBefore)
  })
})

describe('updateShip', () => {
  it('applies partial updates to target ship', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().updateShip(id, { hullCurrent: 5 })
    expect(useBattleStore.getState().ships[0].hullCurrent).toBe(5)
  })

  it('does not affect other ships', () => {
    const store = useBattleStore.getState()
    store.addShip(makeProfile({ id: 'p1', name: 'Alpha' }), { q: 0, r: 0 }, 'players', '#0f0')
    store.addShip(makeProfile({ id: 'p2', name: 'Beta'  }), { q: 1, r: 0 }, 'npc',     '#f00')
    const [a, b] = useBattleStore.getState().ships
    useBattleStore.getState().updateShip(a.id, { hullCurrent: 3 })
    expect(useBattleStore.getState().ships.find(s => s.id === b.id).hullCurrent).toBe(10)
  })

  it('unknown shipId is no-op', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    expect(() => useBattleStore.getState().updateShip('ghost', { hullCurrent: 0 })).not.toThrow()
    expect(useBattleStore.getState().ships[0].hullCurrent).toBe(10)
  })
})

// === DAMAGE ===

describe('applyDamage', () => {
  it('reduces hullCurrent by damage', () => {
    // hull=100 so damage=3 (3%) does not cross any 10% threshold
    useBattleStore.getState().addShip(makeProfile({ hull: 100 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyDamage(id, 3, 'Laser')
    expect(useBattleStore.getState().ships[0].hullCurrent).toBe(97)
  })

  it('clamps hull at 0 (no negative)', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyDamage(id, 99, 'Missile')
    expect(useBattleStore.getState().ships[0].hullCurrent).toBe(0)
  })

  it('adds log entry', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const logBefore = useBattleStore.getState().log.length
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyDamage(id, 2, 'Turret')
    expect(useBattleStore.getState().log.length).toBeGreaterThan(logBefore)
  })

  it('unknown shipId is no-op', () => {
    expect(() => useBattleStore.getState().applyDamage('ghost', 5, 'Laser')).not.toThrow()
  })
})

// Math.random = 0.5 → die = floor(0.5*6)+1 = 4; 4+4=8 → M-Drive
describe('applyDamage — threshold criticals', () => {
  beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0.5))
  afterEach(() => vi.restoreAllMocks())

  it('damage < 10% hull → no threshold crit triggered', () => {
    // hull=20, threshold=2; 1 damage = 5%
    useBattleStore.getState().addShip(makeProfile({ hull: 20 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyDamage(id, 1, 'Laser')
    expect(useBattleStore.getState().ships[0].criticalHits).toHaveLength(0)
  })

  it('exactly 10% damage triggers 1 Sev-1 crit', () => {
    // hull=20, threshold=2; 2 damage = 10%
    useBattleStore.getState().addShip(makeProfile({ hull: 20 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyDamage(id, 2, 'Laser')
    // random=0.5 → 2D6=8 → M-Drive
    const { criticalHits } = useBattleStore.getState().ships[0]
    expect(criticalHits).toHaveLength(1)
    expect(criticalHits[0].system).toBe('M-Drive')
    expect(criticalHits[0].severity).toBe(1)
  })

  it('20% damage in one hit → M-Drive stacks sev 1→2 (upsert, length stays 1)', () => {
    useBattleStore.getState().addShip(makeProfile({ hull: 20 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyDamage(id, 4, 'Missile')
    // 2 threshold crits, both roll M-Drive; 2nd stacks → sev 2
    const { criticalHits, thrustPenalty } = useBattleStore.getState().ships[0]
    expect(criticalHits).toHaveLength(1)
    expect(criticalHits[0].severity).toBe(2)
    // M-Drive sev 2 → thrustPenalty = 1
    expect(thrustPenalty).toBe(1)
  })

  it('skipThreshold flag suppresses further threshold crits (no cascade)', () => {
    useBattleStore.getState().addShip(makeProfile({ hull: 20 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    // Apply secondary damage with _skipThreshold=true: no crit should be added
    useBattleStore.getState().applyDamage(id, 10, 'Hull crit extra', true)
    expect(useBattleStore.getState().ships[0].criticalHits).toHaveLength(0)
  })
})

describe('addCriticalHit', () => {
  it('appends new system with repairRoundsApplied = 0', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().addCriticalHit(id, { system: 'Sensors', severity: 2 })
    const ship = useBattleStore.getState().ships[0]
    expect(ship.criticalHits).toHaveLength(1)
    expect(ship.criticalHits[0].system).toBe('Sensors')
    expect(ship.criticalHits[0].severity).toBe(2)
    expect(ship.criticalHits[0].repairRoundsApplied).toBe(0)
  })

  it('two different systems both persist', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().addCriticalHit(id, { system: 'Sensors', severity: 1 })
    useBattleStore.getState().addCriticalHit(id, { system: 'Fuel',    severity: 2 })
    expect(useBattleStore.getState().ships[0].criticalHits).toHaveLength(2)
  })

  it('same system: updates severity in-place (no duplicate entry)', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().addCriticalHit(id, { system: 'Sensors', severity: 1 })
    useBattleStore.getState().addCriticalHit(id, { system: 'Sensors', severity: 3 })
    const { criticalHits } = useBattleStore.getState().ships[0]
    expect(criticalHits).toHaveLength(1)
    expect(criticalHits[0].severity).toBe(3)
  })

  it('adds log entry', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    const logBefore = useBattleStore.getState().log.length
    useBattleStore.getState().addCriticalHit(id, { system: 'Hull', severity: 1 })
    expect(useBattleStore.getState().log.length).toBeGreaterThan(logBefore)
  })

  it('unknown shipId is no-op', () => {
    expect(() => useBattleStore.getState().addCriticalHit('ghost', { system: 'Hull', severity: 1 })).not.toThrow()
  })

  // === M-Drive thrust penalty ===

  it('M-Drive Sev 1 → thrustPenalty = 0 (DM only, no thrust reduction)', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().addCriticalHit(id, { system: 'M-Drive', severity: 1 })
    expect(useBattleStore.getState().ships[0].thrustPenalty).toBe(0)
  })

  it('M-Drive Sev 2 → thrustPenalty = 1', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().addCriticalHit(id, { system: 'M-Drive', severity: 2 })
    expect(useBattleStore.getState().ships[0].thrustPenalty).toBe(1)
  })

  it('M-Drive Sev 4 → thrustPenalty = 1', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().addCriticalHit(id, { system: 'M-Drive', severity: 4 })
    expect(useBattleStore.getState().ships[0].thrustPenalty).toBe(1)
  })

  it('M-Drive Sev 5 → thrustPenalty = profile.thrust (zero thrust)', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().addCriticalHit(id, { system: 'M-Drive', severity: 5 })
    expect(useBattleStore.getState().ships[0].thrustPenalty).toBe(4)
  })

  it('M-Drive Sev 6 → thrustPenalty = profile.thrust', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 6 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().addCriticalHit(id, { system: 'M-Drive', severity: 6 })
    expect(useBattleStore.getState().ships[0].thrustPenalty).toBe(6)
  })

  it('non-M-Drive crit leaves thrustPenalty = 0', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().addCriticalHit(id, { system: 'Hull', severity: 3 })
    expect(useBattleStore.getState().ships[0].thrustPenalty).toBe(0)
  })
})

describe('reduceArmour', () => {
  it('reduces armor by specified amount', () => {
    useBattleStore.getState().addShip(makeProfile({ armor: 6 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().reduceArmour(id, 2)
    expect(useBattleStore.getState().ships[0].profile.armor).toBe(4)
  })

  it('clamps armor to 0 when reduction exceeds current value', () => {
    useBattleStore.getState().addShip(makeProfile({ armor: 1 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().reduceArmour(id, 5)
    expect(useBattleStore.getState().ships[0].profile.armor).toBe(0)
  })

  it('treats missing armor field as 0', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().reduceArmour(id, 3)
    expect(useBattleStore.getState().ships[0].profile.armor).toBe(0)
  })

  it('appends log entry', () => {
    useBattleStore.getState().addShip(makeProfile({ armor: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    const logBefore = useBattleStore.getState().log.length
    useBattleStore.getState().reduceArmour(id, 1)
    expect(useBattleStore.getState().log.length).toBeGreaterThan(logBefore)
  })

  it('unknown shipId is no-op', () => {
    expect(() => useBattleStore.getState().reduceArmour('ghost', 2)).not.toThrow()
  })

  it('does not affect other ships', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1', armor: 5 }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2', armor: 5 }), { q: 1, r: 0 }, 'npc',     '#f00')
    const [s1] = useBattleStore.getState().ships
    useBattleStore.getState().reduceArmour(s1.id, 2)
    expect(useBattleStore.getState().ships[1].profile.armor).toBe(5)
  })
})

// === PHASE FLOW ===

describe('advancePhase', () => {
  it('advances through phase sequence', () => {
    // start at 'setup'
    expect(useBattleStore.getState().phase).toBe('setup')
    useBattleStore.getState().advancePhase()
    expect(useBattleStore.getState().phase).toBe('initiative')
    useBattleStore.getState().advancePhase()
    expect(useBattleStore.getState().phase).toBe('acceleration')
  })

  it('last phase (end) triggers new round', () => {
    useBattleStore.setState({ phase: 'end', round: 1 })
    useBattleStore.getState().advancePhase()
    expect(useBattleStore.getState().round).toBe(2)
    expect(useBattleStore.getState().phase).toBe('initiative')
  })

  it('resets hasActedThisPhase for all ships', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().updateShip(id, { hasActedThisPhase: true })
    useBattleStore.getState().advancePhase()
    expect(useBattleStore.getState().ships[0].hasActedThisPhase).toBe(false)
  })

  it('resets currentActorIndex to 0', () => {
    useBattleStore.setState({ currentActorIndex: 3, phase: 'setup' })
    useBattleStore.getState().advancePhase()
    expect(useBattleStore.getState().currentActorIndex).toBe(0)
  })
})

describe('advanceActor', () => {
  it('increments currentActorIndex', () => {
    useBattleStore.setState({ currentActorIndex: 1 })
    useBattleStore.getState().advanceActor()
    expect(useBattleStore.getState().currentActorIndex).toBe(2)
  })

  it('marks current actor as having acted', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.setState({ initiativeOrder: [id], currentActorIndex: 0 })
    useBattleStore.getState().advanceActor()
    expect(useBattleStore.getState().ships[0].hasActedThisPhase).toBe(true)
  })
})

describe('startNextRound', () => {
  it('increments round', () => {
    useBattleStore.setState({ round: 3 })
    useBattleStore.getState().startNextRound()
    expect(useBattleStore.getState().round).toBe(4)
  })

  it('sets phase to initiative', () => {
    useBattleStore.setState({ phase: 'actions' })
    useBattleStore.getState().startNextRound()
    expect(useBattleStore.getState().phase).toBe('initiative')
  })

  it('resets per-round ship fields', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().updateShip(id, {
      thrustUsedThisRound: 3,
      evasiveThrust:       2,
      hasActedThisPhase:   true,
    })
    useBattleStore.getState().startNextRound()
    const ship = useBattleStore.getState().ships[0]
    expect(ship.thrustUsedThisRound).toBe(0)
    expect(ship.evasiveThrust).toBe(0)
    expect(ship.hasActedThisPhase).toBe(false)
  })

  it('does NOT reset thrustPenalty between rounds (M-Drive damage persists)', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().addCriticalHit(id, { system: 'M-Drive', severity: 3 })
    expect(useBattleStore.getState().ships[0].thrustPenalty).toBe(1)
    useBattleStore.getState().startNextRound()
    expect(useBattleStore.getState().ships[0].thrustPenalty).toBe(1)
  })

  it('resets ewAppliedThisRound to false on in-flight missiles', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 5, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 2, { q: 0, r: 0 }, { q: 1, r: 0 })
    // Simulate EW having been applied this round
    const missileId = useBattleStore.getState().missiles[0].id
    useBattleStore.setState((s) => ({
      missiles: s.missiles.map((m) => m.id === missileId ? { ...m, ewAppliedThisRound: true } : m),
    }))
    expect(useBattleStore.getState().missiles[0].ewAppliedThisRound).toBe(true)
    useBattleStore.getState().startNextRound()
    expect(useBattleStore.getState().missiles[0].ewAppliedThisRound).toBe(false)
  })
})

// === CREW ACTIONS ===

describe('spendReactionThrust', () => {
  it('increments evasiveThrust on ship', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().spendReactionThrust(id, 2)
    expect(useBattleStore.getState().ships[0].evasiveThrust).toBe(2)
  })

  it('accumulates across multiple reactions', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().spendReactionThrust(id, 1)
    useBattleStore.getState().spendReactionThrust(id, 1)
    expect(useBattleStore.getState().ships[0].evasiveThrust).toBe(2)
  })

  it('clamps to remaining available thrust', () => {
    // thrust=4, thrustUsedThisRound=3 → max reaction=1
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().updateShip(id, { thrustUsedThisRound: 3 })
    useBattleStore.getState().spendReactionThrust(id, 4)
    expect(useBattleStore.getState().ships[0].evasiveThrust).toBe(1)
  })

  it('clamps negative amount to 0 (no-op)', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().spendReactionThrust(id, -5)
    expect(useBattleStore.getState().ships[0].evasiveThrust).toBe(0)
  })

  it('thrustPenalty reduces available reaction thrust', () => {
    // thrust=4, penalty=2 → max=2
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().updateShip(id, { thrustPenalty: 2 })
    useBattleStore.getState().spendReactionThrust(id, 4)
    expect(useBattleStore.getState().ships[0].evasiveThrust).toBe(2)
  })

  it('already-spent reactions reduce available pool', () => {
    // thrust=4, evasiveThrust=2 already spent → max remaining=2
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().updateShip(id, { evasiveThrust: 2 })
    useBattleStore.getState().spendReactionThrust(id, 4)
    expect(useBattleStore.getState().ships[0].evasiveThrust).toBe(4)
  })

  it('unknown shipId is no-op', () => {
    expect(() => useBattleStore.getState().spendReactionThrust('ghost', 2)).not.toThrow()
  })
})

describe('applySensorLock / clearSensorLock', () => {
  it('sets lock on attacker and target with flat DM+2', () => {
    const store = useBattleStore.getState()
    store.addShip(makeProfile({ id: 'p1', name: 'Attacker' }), { q: 0, r: 0 }, 'players', '#0f0')
    store.addShip(makeProfile({ id: 'p2', name: 'Target'   }), { q: 1, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().applySensorLock(att.id, tgt.id)
    const s = useBattleStore.getState()
    const attUpdated = s.ships.find(sh => sh.id === att.id)
    const tgtUpdated = s.ships.find(sh => sh.id === tgt.id)
    expect(attUpdated.sensorLockOn).toBe(tgt.id)
    expect(attUpdated.sensorLockDM).toBe(2)
    expect(tgtUpdated.sensorLockedBy).toBe(att.id)
  })

  it('clearSensorLock removes lock from both ships', () => {
    const store = useBattleStore.getState()
    store.addShip(makeProfile({ id: 'p1', name: 'A' }), { q: 0, r: 0 }, 'players', '#0f0')
    store.addShip(makeProfile({ id: 'p2', name: 'B' }), { q: 1, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().applySensorLock(att.id, tgt.id)
    useBattleStore.getState().clearSensorLock(tgt.id)
    const s = useBattleStore.getState()
    const attUpdated = s.ships.find(sh => sh.id === att.id)
    const tgtUpdated = s.ships.find(sh => sh.id === tgt.id)
    expect(attUpdated.sensorLockOn).toBeNull()
    expect(tgtUpdated.sensorLockedBy).toBeNull()
  })

  it('clearSensorLock on unlocked ship is no-op', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    expect(() => useBattleStore.getState().clearSensorLock(id)).not.toThrow()
  })
})

// === RESET ===

describe('resetBattle', () => {
  it('clears ships, missiles, log', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().resetBattle('vectorial')
    const s = useBattleStore.getState()
    expect(s.ships).toHaveLength(0)
    expect(s.missiles).toHaveLength(0)
    expect(s.log).toHaveLength(0)
  })

  it('sets combatMode from param', () => {
    useBattleStore.getState().resetBattle('basic')
    expect(useBattleStore.getState().combatMode).toBe('basic')
    useBattleStore.getState().resetBattle('vectorial')
    expect(useBattleStore.getState().combatMode).toBe('vectorial')
  })

  it('resets round to 1 and phase to setup', () => {
    useBattleStore.setState({ round: 5, phase: 'attack' })
    useBattleStore.getState().resetBattle()
    expect(useBattleStore.getState().round).toBe(1)
    expect(useBattleStore.getState().phase).toBe('setup')
  })
})

// === INITIATIVE (deterministic) ===

describe('rollAllInitiative', () => {
  beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0.5))
  afterEach(() => vi.restoreAllMocks())

  it('assigns initiative to all ships', () => {
    const store = useBattleStore.getState()
    store.addShip(makeProfile({ id: 'p1', name: 'A', thrust: 2, crew: { pilot: 1, gunner: 0 } }), { q: 0, r: 0 }, 'players', '#0f0')
    store.addShip(makeProfile({ id: 'p2', name: 'B', thrust: 4, crew: { pilot: 3, gunner: 0 } }), { q: 1, r: 0 }, 'npc',     '#f00')
    useBattleStore.getState().rollAllInitiative()
    for (const ship of useBattleStore.getState().ships) {
      expect(ship.initiative).toBeGreaterThan(0)
    }
  })

  it('initiativeOrder sorted highest first', () => {
    const store = useBattleStore.getState()
    // B has higher thrust+pilot → higher initiative with fixed dice
    store.addShip(makeProfile({ id: 'p1', name: 'Low',  thrust: 1, crew: { pilot: 0, gunner: 0 } }), { q: 0, r: 0 }, 'players', '#0f0')
    store.addShip(makeProfile({ id: 'p2', name: 'High', thrust: 6, crew: { pilot: 4, gunner: 0 } }), { q: 1, r: 0 }, 'npc',     '#f00')
    useBattleStore.getState().rollAllInitiative()
    const order   = useBattleStore.getState().initiativeOrder
    const ships   = useBattleStore.getState().ships
    const initiatives = order.map(id => ships.find(s => s.id === id).initiative)
    expect(initiatives[0]).toBeGreaterThanOrEqual(initiatives[1])
  })

  it('resets initiativeBonusNextRound to 0 after roll', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().updateShip(id, { initiativeBonusNextRound: 3 })
    useBattleStore.getState().rollAllInitiative()
    expect(useBattleStore.getState().ships[0].initiativeBonusNextRound).toBe(0)
  })

  it('reads pilot skill from crew array format', () => {
    const store = useBattleStore.getState()
    // Low: crew array, pilot 0 — High: crew array, pilot 4
    store.addShip(makeProfile({ id: 'p1', name: 'Low',  thrust: 1, crew: [{ id: 'c1', name: 'Pilot', skills: { pilot: 0 } }] }), { q: 0, r: 0 }, 'players', '#0f0')
    store.addShip(makeProfile({ id: 'p2', name: 'High', thrust: 6, crew: [{ id: 'c2', name: 'Pilot', skills: { pilot: 4 } }] }), { q: 1, r: 0 }, 'npc',     '#f00')
    useBattleStore.getState().rollAllInitiative()
    const order      = useBattleStore.getState().initiativeOrder
    const ships      = useBattleStore.getState().ships
    const initiatives = order.map((id) => ships.find((s) => s.id === id).initiative)
    expect(initiatives[0]).toBeGreaterThanOrEqual(initiatives[1])
  })

  it('does not crash with empty crew array', () => {
    useBattleStore.getState().addShip(makeProfile({ crew: [] }), { q: 0, r: 0 }, 'players', '#fff')
    expect(() => useBattleStore.getState().rollAllInitiative()).not.toThrow()
    expect(useBattleStore.getState().ships[0].initiative).toBeGreaterThan(0)
  })

  it('diceOverrides map — specified ships use manual dice, others auto-roll', () => {
    // Math.random mocked to 0.5 → auto-roll gives 4+4=8 per ship
    const store = useBattleStore.getState()
    store.addShip(makeProfile({ id: 'p1', name: 'Manual', thrust: 0, crew: { pilot: 0 } }), { q: 0, r: 0 }, 'players', '#0f0')
    store.addShip(makeProfile({ id: 'p2', name: 'Auto',   thrust: 0, crew: { pilot: 0 } }), { q: 1, r: 0 }, 'npc',     '#f00')
    const { id: manualId } = useBattleStore.getState().ships[0]
    // Pass manual dice total=3 for ship0; ship1 gets auto-rolled (mock→8)
    useBattleStore.getState().rollAllInitiative({}, { [manualId]: { results: [1, 2], total: 3 } })
    const ships = useBattleStore.getState().ships
    expect(ships.find((s) => s.id === manualId).initiative).toBe(3)  // 3 + pilot0 + thrust0
    expect(ships.find((s) => s.id !== manualId).initiative).toBe(8)  // 8 + 0 + 0 from mock
  })

  it('saves initiativeBreakdown with roll, pilotSkill, thrust and tacticsEffect', () => {
    useBattleStore.getState().addShip(
      makeProfile({ thrust: 3, crew: { pilot: 2 } }), { q: 0, r: 0 }, 'players', '#fff'
    )
    useBattleStore.getState().rollAllInitiative()
    const { initiativeBreakdown } = useBattleStore.getState().ships[0]
    expect(initiativeBreakdown).toBeDefined()
    expect(typeof initiativeBreakdown.roll).toBe('number')
    expect(initiativeBreakdown.pilotSkill).toBe(2)
    expect(initiativeBreakdown.thrust).toBe(3)
    expect(typeof initiativeBreakdown.tacticsEffect).toBe('number')
  })
})

// === THRUST ===

describe('applyShipThrust', () => {
  it('updates velocity vector', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyShipThrust(id, { q: 1, r: -1 }, 1)
    expect(useBattleStore.getState().ships[0].vector).toEqual({ q: 1, r: -1 })
  })

  it('accumulates thrustUsedThisRound', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyShipThrust(id, { q: 1, r: 0 }, 1)
    useBattleStore.getState().applyShipThrust(id, { q: 0, r: 1 }, 1)
    expect(useBattleStore.getState().ships[0].thrustUsedThisRound).toBe(2)
  })

  it('multiple thrusts accumulate vector', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyShipThrust(id, { q: 2, r: 0 }, 2)
    useBattleStore.getState().applyShipThrust(id, { q: -1, r: 1 }, 1)
    expect(useBattleStore.getState().ships[0].vector).toEqual({ q: 1, r: 1 })
  })

  it('unknown shipId is no-op', () => {
    expect(() => useBattleStore.getState().applyShipThrust('ghost', { q: 1, r: 0 }, 1)).not.toThrow()
  })

  it('adds log entry', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    const logBefore = useBattleStore.getState().log.length
    useBattleStore.getState().applyShipThrust(id, { q: 1, r: 0 }, 1)
    expect(useBattleStore.getState().log.length).toBeGreaterThan(logBefore)
  })

  it('saves lastThrustDelta on ship', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyShipThrust(id, { q: 2, r: -1 }, 2)
    expect(useBattleStore.getState().ships[0].lastThrustDelta).toEqual({ q: 2, r: -1 })
  })
})

// === MOVEMENT ===

describe('resolveMovement', () => {
  it('moves ships by their vector', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 2, r: 1 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().updateShip(id, { vector: { q: 1, r: -1 } })
    useBattleStore.getState().resolveMovement()
    expect(useBattleStore.getState().ships[0].position).toEqual({ q: 3, r: 0 })
  })

  it('ship with zero vector stays in place', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 4, r: -2 }, 'players', '#fff')
    useBattleStore.getState().resolveMovement()
    expect(useBattleStore.getState().ships[0].position).toEqual({ q: 4, r: -2 })
  })

  it('missiles reaching target hex are consumed and queued as pendingMissileImpacts', () => {
    // Missile at {q:1,r:0} vector {q:1,r:0}, target at {q:5,r:0} stationary.
    // Guidance closes the gap in one step → lands on target hex → impact queued.
    // Impacts are deferred via setTimeout to avoid cross-store tearing with
    // useSyncExternalStore; advance fake timers to flush.
    vi.useFakeTimers()
    useBattleStore.getState().addShip(makeProfile({ id: 'p1', name: 'A' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2', name: 'B' }), { q: 5, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 2, { q: 1, r: 0 }, { q: 1, r: 0 })
    const missileId = useBattleStore.getState().missiles[0].id
    useBattleStore.getState().resolveMovement()
    // Missile kept in store during animation — still visible
    expect(useBattleStore.getState().missiles.find(m => m.id === missileId)).toBeDefined()
    // Impacts deferred — not visible yet
    expect(useBattleStore.getState().pendingMissileImpacts).toHaveLength(0)
    // Flush the deferred setTimeout
    vi.runAllTimers()
    // Missile removed after animation
    expect(useBattleStore.getState().missiles.find(m => m.id === missileId)).toBeUndefined()
    const impacts = useBattleStore.getState().pendingMissileImpacts
    expect(impacts).toHaveLength(1)
    expect(impacts[0].target).toBe(tgt.id)
    expect(impacts[0].launchedBy).toBe(att.id)
    expect(impacts[0].count).toBe(2)
    vi.useRealTimers()
  })

  it('missile guidance is partial when correction exceeds GUIDANCE_THRUST per round', () => {
    // Missile at {q:0,r:0} vector {q:1,r:0}, target at {q:20,r:0} stationary.
    // predictedQ=20, deltaQ=19, deltaMag=19, scale=10/19 → correction=round(10)=10
    // → guided vector {q:11,r:0} → pos {q:11,r:0}.
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q:  0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 20, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 1, { q: 0, r: 0 }, { q: 1, r: 0 })
    const missileId = useBattleStore.getState().missiles[0].id
    useBattleStore.getState().resolveMovement()
    const missile = useBattleStore.getState().missiles.find(m => m.id === missileId)
    expect(missile.vector).toEqual({ q: 11, r: 0 })
    expect(missile.position).toEqual({ q: 11, r: 0 })
  })

  it('missile with thrustRemaining 0 drifts without guidance', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 5, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 1, { q: 0, r: 0 }, { q: 2, r: 0 })
    const missileId = useBattleStore.getState().missiles[0].id
    useBattleStore.setState({
      missiles: useBattleStore.getState().missiles.map(m =>
        m.id === missileId ? { ...m, thrustRemaining: 0 } : m
      ),
    })
    useBattleStore.getState().resolveMovement()
    const missile = useBattleStore.getState().missiles.find(m => m.id === missileId)
    // thrustRemaining 0 → no guidance, drifts on original vector; 0-1 = -1 → filtered out
    expect(missile).toBeUndefined()
  })

  it('removes missiles with thrustRemaining reaching -1 after decrement', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 1, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 1, { q: 0, r: 0 }, { q: 0, r: 0 })
    const missileId = useBattleStore.getState().missiles[0].id
    useBattleStore.setState({
      missiles: useBattleStore.getState().missiles.map(m =>
        m.id === missileId ? { ...m, thrustRemaining: 0 } : m
      )
    })
    useBattleStore.getState().resolveMovement()
    // thrustRemaining becomes -1 after decrement → filtered out
    expect(useBattleStore.getState().missiles.find(m => m.id === missileId)).toBeUndefined()
  })

  // ── passing encounters ──────────────────────────────────────────────────

  it('creates passing encounter when hostile ships cross within Short range', () => {
    // passingEncounters is deferred via setTimeout (same pattern as pendingMissileImpacts)
    vi.useFakeTimers()
    // A at (0,0) moving E×5; B at (5,1) moving W×5 — they converge to within 1 hex
    useBattleStore.getState().addShip(makeProfile({ id: 'p1', name: 'A' }), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2', name: 'B' }), { q: 5, r: 1 }, 'npc',     '#f00')
    const [a, b] = useBattleStore.getState().ships
    useBattleStore.getState().updateShip(a.id, { vector: { q: 5, r: 0 } })
    useBattleStore.getState().updateShip(b.id, { vector: { q: -5, r: 0 } })
    useBattleStore.getState().resolveMovement()
    expect(useBattleStore.getState().passingEncounters).toHaveLength(0)
    vi.runAllTimers()
    const encounters = useBattleStore.getState().passingEncounters
    expect(encounters).toHaveLength(1)
    expect(encounters[0].shipAId).toBe(a.id)
    expect(encounters[0].shipBId).toBe(b.id)
    expect(encounters[0].minDistance).toBeLessThanOrEqual(2)
    vi.useRealTimers()
  })

  it('does not create encounter for same-faction ships', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 5, r: 0 }, 'players', '#fff')
    const [a, b] = useBattleStore.getState().ships
    useBattleStore.getState().updateShip(a.id, { vector: { q: 5, r: 0 } })
    useBattleStore.getState().updateShip(b.id, { vector: { q: -5, r: 0 } })
    useBattleStore.getState().resolveMovement()
    expect(useBattleStore.getState().passingEncounters).toHaveLength(0)
  })

  it('does not create encounter when ships end in the same hex (dogfight territory)', () => {
    // A at (0,0) with vector (2,0) → ends at (2,0)
    // B at (4,0) with vector (-2,0) → ends at (2,0)
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 4, r: 0 }, 'npc',     '#f00')
    const [a, b] = useBattleStore.getState().ships
    useBattleStore.getState().updateShip(a.id, { vector: { q: 2, r: 0 } })
    useBattleStore.getState().updateShip(b.id, { vector: { q: -2, r: 0 } })
    useBattleStore.getState().resolveMovement()
    expect(useBattleStore.getState().passingEncounters).toHaveLength(0)
  })

  it('does not create encounter for ships already in a dogfight', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 5, r: 1 }, 'npc',     '#f00')
    const [a, b] = useBattleStore.getState().ships
    // Manually mark as in dogfight
    useBattleStore.setState({
      ships: useBattleStore.getState().ships.map((s) => ({ ...s, inDogfight: 'grp-x' })),
    })
    useBattleStore.getState().updateShip(a.id, { vector: { q: 5, r: 0 } })
    useBattleStore.getState().updateShip(b.id, { vector: { q: -5, r: 0 } })
    useBattleStore.getState().resolveMovement()
    expect(useBattleStore.getState().passingEncounters).toHaveLength(0)
  })
})

describe('dismissPassingEncounter', () => {
  it('removes the encounter with the matching id', () => {
    useBattleStore.setState({
      passingEncounters: [
        { id: 'e1', shipAId: 'a', shipBId: 'b', minDistance: 1 },
        { id: 'e2', shipAId: 'c', shipBId: 'd', minDistance: 2 },
      ],
    })
    useBattleStore.getState().dismissPassingEncounter('e1')
    const encounters = useBattleStore.getState().passingEncounters
    expect(encounters).toHaveLength(1)
    expect(encounters[0].id).toBe('e2')
  })

  it('is a no-op for unknown id', () => {
    useBattleStore.setState({
      passingEncounters: [{ id: 'e1', shipAId: 'a', shipBId: 'b', minDistance: 1 }],
    })
    useBattleStore.getState().dismissPassingEncounter('nonexistent')
    expect(useBattleStore.getState().passingEncounters).toHaveLength(1)
  })
})

// === MISSILES ===

describe('missile magazine (missileAmmoTotal)', () => {
  it('initialises to 0 for ships with no missile rack', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    expect(useBattleStore.getState().ships[0].missileAmmoTotal).toBe(0)
  })

  it('initialises to 12 × rack count', () => {
    const profile = makeProfile({ turrets: [{ slot: 1, weapons: ['Missile Rack', 'Pulse Laser'] }, { slot: 2, weapons: ['Missile Rack'] }] })
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#fff')
    expect(useBattleStore.getState().ships[0].missileAmmoTotal).toBe(24)
  })

  it('decrements missileAmmoTotal by salvo count on launch', () => {
    const profile = makeProfile({ turrets: [{ slot: 1, weapons: ['Missile Rack'] }] })
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile(), { q: 5, r: 0 }, 'npc', '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 5, { q: 0, r: 0 }, { q: 0, r: 0 })
    expect(useBattleStore.getState().ships[0].missileAmmoTotal).toBe(7)
  })

  it('clamps missileAmmoTotal at 0, never negative', () => {
    const profile = makeProfile({ turrets: [{ slot: 1, weapons: ['Missile Rack'] }] })
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile(), { q: 5, r: 0 }, 'npc', '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 12, { q: 0, r: 0 }, { q: 0, r: 0 })
    useBattleStore.getState().launchMissile(att.id, tgt.id, 12, { q: 0, r: 0 }, { q: 0, r: 0 })
    expect(useBattleStore.getState().ships[0].missileAmmoTotal).toBe(0)
  })
})

describe('launchMissile', () => {
  it('adds missile to missiles array', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1', name: 'A' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2', name: 'B' }), { q: 5, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 3, { q: 0, r: 0 }, { q: 1, r: 0 }, 'Smart')
    expect(useBattleStore.getState().missiles).toHaveLength(1)
    const m = useBattleStore.getState().missiles[0]
    expect(m.count).toBe(3)
    expect(m.type).toBe('Smart')
    expect(m.thrustRemaining).toBe(10)
  })

  it('stores hasSmartGuidance on missile', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 5, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 2, { q: 0, r: 0 }, { q: 0, r: 0 }, 'Standard', false)
    expect(useBattleStore.getState().missiles[0].hasSmartGuidance).toBe(false)
  })

  it('defaults hasSmartGuidance to true when not provided', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 5, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 1, { q: 0, r: 0 }, { q: 0, r: 0 })
    expect(useBattleStore.getState().missiles[0].hasSmartGuidance).toBe(true)
  })

  it('increments turretsNeedingReload on attacker', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 5, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 1, { q: 0, r: 0 }, { q: 0, r: 0 })
    expect(useBattleStore.getState().ships[0].turretsNeedingReload).toBe(1)
  })

  it('initialises ewAppliedThisRound to false', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 5, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 2, { q: 0, r: 0 }, { q: 1, r: 0 })
    expect(useBattleStore.getState().missiles[0].ewAppliedThisRound).toBe(false)
  })
})

describe('removeMissile', () => {
  it('removes missile by id', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 5, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 1, { q: 0, r: 0 }, { q: 0, r: 0 })
    const { id } = useBattleStore.getState().missiles[0]
    useBattleStore.getState().removeMissile(id)
    expect(useBattleStore.getState().missiles).toHaveLength(0)
  })

  it('unknown id is no-op', () => {
    expect(() => useBattleStore.getState().removeMissile('ghost')).not.toThrow()
  })
})

describe('interceptMissileSalvo', () => {
  function launchScenario() {
    useBattleStore.getState().addShip(makeProfile({ id: 'att' }), { q: 0, r: 0 }, 'npc',     '#f00')
    useBattleStore.getState().addShip(makeProfile({ id: 'def' }), { q: 5, r: 0 }, 'players', '#fff')
    const [att, def] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, def.id, 5, att.position, { q: 0, r: 0 })
    return { att, def, missileId: useBattleStore.getState().missiles[0].id }
  }

  it('reduces missile count by removed amount', () => {
    const { missileId } = launchScenario()
    useBattleStore.getState().interceptMissileSalvo(missileId, 2)
    expect(useBattleStore.getState().missiles[0].count).toBe(3)
  })

  it('removes salvo when count reaches 0', () => {
    const { missileId } = launchScenario()
    useBattleStore.getState().interceptMissileSalvo(missileId, 5)
    expect(useBattleStore.getState().missiles).toHaveLength(0)
  })

  it('removes salvo when removed exceeds count', () => {
    const { missileId } = launchScenario()
    useBattleStore.getState().interceptMissileSalvo(missileId, 99)
    expect(useBattleStore.getState().missiles).toHaveLength(0)
  })

  it('removed=0 (miss) leaves count unchanged', () => {
    const { missileId } = launchScenario()
    useBattleStore.getState().interceptMissileSalvo(missileId, 0)
    expect(useBattleStore.getState().missiles[0].count).toBe(5)
  })

  it('adds log entry on partial intercept', () => {
    const logsBefore = useBattleStore.getState().log.length
    const { missileId } = launchScenario()
    useBattleStore.getState().interceptMissileSalvo(missileId, 2)
    expect(useBattleStore.getState().log.length).toBeGreaterThan(logsBefore)
  })

  it('adds log entry on full destruction', () => {
    const logsBefore = useBattleStore.getState().log.length
    const { missileId } = launchScenario()
    useBattleStore.getState().interceptMissileSalvo(missileId, 5)
    expect(useBattleStore.getState().log.length).toBeGreaterThan(logsBefore)
  })

  it('does not affect other salvos', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'att' }), { q: 0, r: 0 }, 'npc',     '#f00')
    useBattleStore.getState().addShip(makeProfile({ id: 'def' }), { q: 5, r: 0 }, 'players', '#fff')
    const [att, def] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, def.id, 4, att.position, { q: 0, r: 0 })
    useBattleStore.getState().launchMissile(att.id, def.id, 3, att.position, { q: 0, r: 0 })
    const [m1, m2] = useBattleStore.getState().missiles
    useBattleStore.getState().interceptMissileSalvo(m1.id, 4)
    expect(useBattleStore.getState().missiles).toHaveLength(1)
    expect(useBattleStore.getState().missiles[0].id).toBe(m2.id)
    expect(useBattleStore.getState().missiles[0].count).toBe(3)
  })

  it('unknown missileId is no-op', () => {
    expect(() => useBattleStore.getState().interceptMissileSalvo('ghost', 3)).not.toThrow()
  })
})

describe('applyMissileEW', () => {
  it('reduces count on in-flight missile by specified amount', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 5, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 5, { q: 0, r: 0 }, { q: 1, r: 0 })
    const { id: mId } = useBattleStore.getState().missiles[0]
    useBattleStore.getState().applyMissileEW(tgt.id, mId, 2)
    expect(useBattleStore.getState().missiles[0].count).toBe(3)
  })

  it('marks ewAppliedThisRound on in-flight missile', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 5, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 3, { q: 0, r: 0 }, { q: 1, r: 0 })
    const { id: mId } = useBattleStore.getState().missiles[0]
    useBattleStore.getState().applyMissileEW(tgt.id, mId, 1)
    expect(useBattleStore.getState().missiles[0].ewAppliedThisRound).toBe(true)
  })

  it('removes in-flight missile when count drops to 0', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 5, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 2, { q: 0, r: 0 }, { q: 1, r: 0 })
    const { id: mId } = useBattleStore.getState().missiles[0]
    useBattleStore.getState().applyMissileEW(tgt.id, mId, 2)
    expect(useBattleStore.getState().missiles).toHaveLength(0)
  })

  it('is blocked when ewAppliedThisRound is already true (double-EW guard)', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 5, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 4, { q: 0, r: 0 }, { q: 1, r: 0 })
    const { id: mId } = useBattleStore.getState().missiles[0]
    useBattleStore.getState().applyMissileEW(tgt.id, mId, 1)  // first EW: count 4→3, flag set
    useBattleStore.getState().applyMissileEW(tgt.id, mId, 1)  // second EW: blocked by guard
    expect(useBattleStore.getState().missiles[0].count).toBe(3)
  })

  it('reduces count on pending missile impact', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 5, r: 0 }, 'npc',     '#f00')
    const [, tgt] = useBattleStore.getState().ships
    // Inject a pending impact directly into the store
    const impact = { id: 'imp-1', attackerId: 'p1', targetId: 'p2', count: 3, type: 'Standard', ewAppliedThisRound: false }
    useBattleStore.setState((s) => ({ pendingMissileImpacts: [...s.pendingMissileImpacts, impact] }))
    useBattleStore.getState().applyMissileEW(tgt.id, 'imp-1', 1)
    expect(useBattleStore.getState().pendingMissileImpacts[0].count).toBe(2)
  })

  it('unknown missileId is no-op', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
    const [ship] = useBattleStore.getState().ships
    expect(() => useBattleStore.getState().applyMissileEW(ship.id, 'ghost', 1)).not.toThrow()
  })
})

// === CREW ACTIONS (remaining) ===

describe('repairCritical', () => {
  it('removes first critical hit', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().addCriticalHit(id, { system: 'Sensors', severity: 2 })
    useBattleStore.getState().addCriticalHit(id, { system: 'Fuel',    severity: 1 })
    useBattleStore.getState().repairCritical(id)
    const crits = useBattleStore.getState().ships[0].criticalHits
    expect(crits).toHaveLength(1)
    expect(crits[0].system).toBe('Fuel')
  })

  it('no-op when no crits', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    expect(() => useBattleStore.getState().repairCritical(id)).not.toThrow()
    expect(useBattleStore.getState().ships[0].criticalHits).toHaveLength(0)
  })

  it('unknown shipId is no-op', () => {
    expect(() => useBattleStore.getState().repairCritical('ghost')).not.toThrow()
  })

  it('repairing M-Drive crit resets thrustPenalty to 0', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().addCriticalHit(id, { system: 'M-Drive', severity: 3 })
    expect(useBattleStore.getState().ships[0].thrustPenalty).toBe(1) // sev 3 → penalty 1
    useBattleStore.getState().repairCritical(id)
    expect(useBattleStore.getState().ships[0].thrustPenalty).toBe(0)
    expect(useBattleStore.getState().ships[0].criticalHits).toHaveLength(0)
  })

  it('repairing non-M-Drive crit preserves thrustPenalty from remaining M-Drive', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    // Hull first (gets repaired), M-Drive second (stays)
    useBattleStore.getState().addCriticalHit(id, { system: 'Hull',    severity: 2 })
    useBattleStore.getState().addCriticalHit(id, { system: 'M-Drive', severity: 4 })
    expect(useBattleStore.getState().ships[0].thrustPenalty).toBe(1)
    useBattleStore.getState().repairCritical(id) // removes Hull
    // M-Drive Sev 4 still present → thrustPenalty remains 1
    expect(useBattleStore.getState().ships[0].thrustPenalty).toBe(1)
    expect(useBattleStore.getState().ships[0].criticalHits[0].system).toBe('M-Drive')
  })

  // BUG-002: repairing an Armour crit must restore profile.armor to its original value.
  // Previously repairCritical only removed the crit entry without undoing reduceArmour. // CRB p.167
  it('addShip stores baseArmor equal to profile.armor', () => {
    useBattleStore.getState().addShip(makeProfile({ armor: 6 }), { q: 0, r: 0 }, 'players', '#fff')
    const ship = useBattleStore.getState().ships[0]
    expect(ship.baseArmor).toBe(6)
  })

  it('repairing Armour crit restores profile.armor to baseArmor', () => {
    useBattleStore.getState().addShip(makeProfile({ armor: 6 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().addCriticalHit(id, { system: 'Armour', severity: 1 })
    useBattleStore.getState().reduceArmour(id, 1)
    expect(useBattleStore.getState().ships[0].profile.armor).toBe(5) // reduced
    useBattleStore.getState().repairCritical(id)
    expect(useBattleStore.getState().ships[0].profile.armor).toBe(6) // restored
    expect(useBattleStore.getState().ships[0].criticalHits).toHaveLength(0)
  })

  it('repairing Armour crit restores armor even after multi-step reduction', () => {
    useBattleStore.getState().addShip(makeProfile({ armor: 8 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().addCriticalHit(id, { system: 'Armour', severity: 2 })
    useBattleStore.getState().reduceArmour(id, 3) // reduced to 5
    useBattleStore.getState().repairCritical(id)
    expect(useBattleStore.getState().ships[0].profile.armor).toBe(8)
  })

  it('repairing non-Armour crit leaves profile.armor unchanged', () => {
    useBattleStore.getState().addShip(makeProfile({ armor: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().addCriticalHit(id, { system: 'Sensors', severity: 1 })
    useBattleStore.getState().repairCritical(id)
    expect(useBattleStore.getState().ships[0].profile.armor).toBe(4)
  })
})

describe('applyInitiativeBonus', () => {
  it('accumulates bonus on ship', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyInitiativeBonus(id, 3)
    useBattleStore.getState().applyInitiativeBonus(id, 2)
    expect(useBattleStore.getState().ships[0].initiativeBonusNextRound).toBe(5)
  })

  it('clamps negative bonus to 0', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyInitiativeBonus(id, -3)
    expect(useBattleStore.getState().ships[0].initiativeBonusNextRound).toBe(0)
  })

  // BUG-003: rollAllInitiative must include initiativeBonusNextRound in the final total.
  // With known dice (total=7), pilot=2, thrust=4, bonus=3 → expected 7+2+4+3=16. // CRB p.160, p.166
  it('rollAllInitiative includes initiativeBonusNextRound in ship initiative total', () => {
    useBattleStore.getState().addShip(
      makeProfile({ thrust: 4, crew: { pilot: 2 } }),
      { q: 0, r: 0 }, 'players', '#fff'
    )
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyInitiativeBonus(id, 3)
    // Dice override: 2D6 result = 7, so total = 7 + pilot(2) + thrust(4) + bonus(3) = 16
    useBattleStore.getState().rollAllInitiative({}, { [id]: { total: 7, results: [4, 3] } })
    expect(useBattleStore.getState().ships[0].initiative).toBe(16)
  })

  it('rollAllInitiative resets initiativeBonusNextRound to 0 after consuming it', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyInitiativeBonus(id, 5)
    useBattleStore.getState().rollAllInitiative({}, { [id]: { total: 7, results: [4, 3] } })
    expect(useBattleStore.getState().ships[0].initiativeBonusNextRound).toBe(0)
  })
})

describe('overloadDrive', () => {
  it('adds thrustBonusThisRound', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().overloadDrive(id, 2)
    expect(useBattleStore.getState().ships[0].thrustBonusThisRound).toBe(2)
  })

  it('accumulates on repeated calls', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().overloadDrive(id, 2)
    useBattleStore.getState().overloadDrive(id, 1)
    expect(useBattleStore.getState().ships[0].thrustBonusThisRound).toBe(3)
  })

  it('clamps negative bonus to 0', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().overloadDrive(id, -5)
    expect(useBattleStore.getState().ships[0].thrustBonusThisRound).toBe(0)
  })

  it('bonus resets at next round', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().overloadDrive(id, 3)
    useBattleStore.getState().startNextRound()
    expect(useBattleStore.getState().ships[0].thrustBonusThisRound).toBe(0)
  })
})

describe('reloadTurret', () => {
  it('decrements turretsNeedingReload', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().updateShip(id, { turretsNeedingReload: 2 })
    useBattleStore.getState().reloadTurret(id)
    expect(useBattleStore.getState().ships[0].turretsNeedingReload).toBe(1)
  })

  it('no-op when turretsNeedingReload = 0', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    expect(() => useBattleStore.getState().reloadTurret(id)).not.toThrow()
    expect(useBattleStore.getState().ships[0].turretsNeedingReload).toBe(0)
  })

  it('unknown shipId is no-op', () => {
    expect(() => useBattleStore.getState().reloadTurret('ghost')).not.toThrow()
  })
})

// === IMPORT / EXPORT ===

describe('exportBattleState', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls exportBattle with current state snapshot', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.setState({ round: 3, phase: 'attack', combatMode: 'basic' })
    useBattleStore.getState().exportBattleState()
    expect(exportBattle).toHaveBeenCalledOnce()
    const [arg] = exportBattle.mock.calls[0]
    expect(arg.round).toBe(3)
    expect(arg.phase).toBe('attack')
    expect(arg.combatMode).toBe('basic')
    expect(arg.ships).toHaveLength(1)
  })
})

describe('importBattleState', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets state from imported battle data', async () => {
    importBattle.mockResolvedValue({
      id: 'imported-id', name: 'Imported Battle',
      round: 5, combatMode: 'vectorial', phase: 'attack',
      initiativeOrder: [], currentActorIndex: 0,
      ships: [], missiles: [], log: [],
      mapSettings: { scale: 2 },
    })
    await useBattleStore.getState().importBattleState({})
    const s = useBattleStore.getState()
    expect(s.round).toBe(5)
    expect(s.phase).toBe('attack')
    expect(s.mapSettings).toEqual({ scale: 2 })
  })

  it('applies ?? defaults for missing fields', async () => {
    importBattle.mockResolvedValue({ id: 'x' })
    await useBattleStore.getState().importBattleState({})
    const s = useBattleStore.getState()
    expect(s.round).toBe(1)
    expect(s.combatMode).toBe('vectorial')
    expect(s.ships).toEqual([])
    expect(s.mapSettings).toEqual({ scale: 1 })
  })
})

// === LOG ===

describe('addLogEntry', () => {
  it('appends info entry to log', () => {
    useBattleStore.getState().addLogEntry('Messaggio GM')
    const log = useBattleStore.getState().log
    expect(log).toHaveLength(1)
    expect(log[0].type).toBe('info')
    expect(log[0].message).toBe('Messaggio GM')
  })

  it('includes current round and phase', () => {
    useBattleStore.setState({ round: 4, phase: 'attack' })
    useBattleStore.getState().addLogEntry('Test')
    const entry = useBattleStore.getState().log[0]
    expect(entry.round).toBe(4)
    expect(entry.phase).toBe('attack')
  })
})

describe('clearLog', () => {
  it('empties the log', () => {
    useBattleStore.getState().addLogEntry('uno')
    useBattleStore.getState().addLogEntry('due')
    useBattleStore.getState().clearLog()
    expect(useBattleStore.getState().log).toHaveLength(0)
  })
})

// === UNDO SYSTEM ===

describe('pushHistory / undoLastAction', () => {
  it('pushHistory snapshots current state onto undoStack', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#0f0')
    expect(useBattleStore.getState().undoStack).toHaveLength(1)
  })

  it('undoLastAction restores previous state', () => {
    const store = useBattleStore.getState()
    store.addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#0f0')
    expect(useBattleStore.getState().ships).toHaveLength(1)
    useBattleStore.getState().undoLastAction()
    expect(useBattleStore.getState().ships).toHaveLength(0)
  })

  it('undoLastAction pops the stack', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#0f0')
    expect(useBattleStore.getState().undoStack).toHaveLength(1)
    useBattleStore.getState().undoLastAction()
    expect(useBattleStore.getState().undoStack).toHaveLength(0)
  })

  it('undoLastAction is no-op when stack is empty', () => {
    expect(useBattleStore.getState().undoStack).toHaveLength(0)
    expect(() => useBattleStore.getState().undoLastAction()).not.toThrow()
    expect(useBattleStore.getState().ships).toHaveLength(0)
  })

  it('multiple undos walk back through history', () => {
    const store = useBattleStore.getState()
    store.addShip(makeProfile({ id: 'p1', name: 'Alpha' }), { q: 0, r: 0 }, 'players', '#0f0')
    store.addShip(makeProfile({ id: 'p2', name: 'Beta'  }), { q: 1, r: 0 }, 'players', '#00f')
    expect(useBattleStore.getState().ships).toHaveLength(2)
    useBattleStore.getState().undoLastAction()
    expect(useBattleStore.getState().ships).toHaveLength(1)
    useBattleStore.getState().undoLastAction()
    expect(useBattleStore.getState().ships).toHaveLength(0)
  })

  it('stack is capped at 20 entries', () => {
    const store = useBattleStore.getState()
    // pushHistory 21 times via addShip; first snapshot is lost
    store.addShip(makeProfile({ id: 'p0', name: 'S0' }), { q: 0, r: 0 }, 'players', '#0f0')
    for (let i = 1; i <= 20; i++) {
      useBattleStore.getState().addShip(
        makeProfile({ id: `p${i}`, name: `S${i}` }),
        { q: i, r: 0 }, 'players', '#0f0'
      )
    }
    expect(useBattleStore.getState().undoStack).toHaveLength(20)
  })

  it('resetBattle clears undoStack', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#0f0')
    expect(useBattleStore.getState().undoStack).toHaveLength(1)
    useBattleStore.getState().resetBattle()
    expect(useBattleStore.getState().undoStack).toHaveLength(0)
  })

  it('undoLastAction does not rollback log entries', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#0f0')
    const logLenAfterAdd = useBattleStore.getState().log.length
    useBattleStore.getState().undoLastAction()
    // log grows (undo entry appended), never shrinks
    expect(useBattleStore.getState().log.length).toBeGreaterThan(logLenAfterAdd)
  })

  it('undoLastAction appends ↩ Undo log entry with correct round and phase', () => {
    useBattleStore.setState({ round: 2, phase: 'attack' })
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#0f0')
    // snapshot captured at round=2, phase='attack'
    useBattleStore.getState().undoLastAction()
    const last = useBattleStore.getState().log.at(-1)
    expect(last.type).toBe('system')
    expect(last.message).toMatch(/↩ Undo/)
    expect(last.message).toContain('Round 2')
    expect(last.message).toContain('ATTACK')
  })
})

describe('undo — history suppression flags', () => {
  it('applyDamage with _skipThreshold=true does not push history', () => {
    const store = useBattleStore.getState()
    store.addShip(makeProfile({ hull: 20 }), { q: 0, r: 0 }, 'players', '#0f0')
    const { id } = useBattleStore.getState().ships[0]
    const stackBefore = useBattleStore.getState().undoStack.length
    // internal recursive call — _skipThreshold=true
    useBattleStore.getState().applyDamage(id, 2, 'test', true)
    expect(useBattleStore.getState().undoStack).toHaveLength(stackBefore)
  })

  it('applyDamage without flag pushes history', () => {
    const store = useBattleStore.getState()
    store.addShip(makeProfile({ hull: 20 }), { q: 0, r: 0 }, 'players', '#0f0')
    const { id } = useBattleStore.getState().ships[0]
    const stackBefore = useBattleStore.getState().undoStack.length
    useBattleStore.getState().applyDamage(id, 2, 'test')
    expect(useBattleStore.getState().undoStack).toHaveLength(stackBefore + 1)
  })

  it('addCriticalHit with _skipHistory=true does not push history', () => {
    const store = useBattleStore.getState()
    store.addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#0f0')
    const { id } = useBattleStore.getState().ships[0]
    const stackBefore = useBattleStore.getState().undoStack.length
    useBattleStore.getState().addCriticalHit(id, { system: 'Hull', severity: 1 }, { _skipHistory: true })
    expect(useBattleStore.getState().undoStack).toHaveLength(stackBefore)
  })

  it('addCriticalHit without flag pushes history', () => {
    const store = useBattleStore.getState()
    store.addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#0f0')
    const { id } = useBattleStore.getState().ships[0]
    const stackBefore = useBattleStore.getState().undoStack.length
    useBattleStore.getState().addCriticalHit(id, { system: 'Hull', severity: 1 })
    expect(useBattleStore.getState().undoStack).toHaveLength(stackBefore + 1)
  })

  it('advancePhase → startNextRound pushes only one snapshot', () => {
    // Advance to end phase so advancePhase triggers startNextRound
    useBattleStore.setState({ phase: 'end' })
    const stackBefore = useBattleStore.getState().undoStack.length
    useBattleStore.getState().advancePhase()
    expect(useBattleStore.getState().undoStack).toHaveLength(stackBefore + 1)
  })

  it('startNextRound called directly pushes history', () => {
    useBattleStore.setState({ round: 1, phase: 'end' })
    const stackBefore = useBattleStore.getState().undoStack.length
    useBattleStore.getState().startNextRound()
    expect(useBattleStore.getState().undoStack).toHaveLength(stackBefore + 1)
  })

  it('wh guard suppresses push when guard fails', () => {
    // applyShipThrust with a non-existent shipId should not push
    const stackBefore = useBattleStore.getState().undoStack.length
    useBattleStore.getState().applyShipThrust('nonexistent', { q: 1, r: 0 }, 1)
    expect(useBattleStore.getState().undoStack).toHaveLength(stackBefore)
  })
})

describe('redoLastAction', () => {
  it('redoLastAction is no-op when redoStack is empty', () => {
    expect(useBattleStore.getState().redoStack).toHaveLength(0)
    expect(() => useBattleStore.getState().redoLastAction()).not.toThrow()
  })

  it('undoLastAction populates redoStack', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#0f0')
    expect(useBattleStore.getState().redoStack).toHaveLength(0)
    useBattleStore.getState().undoLastAction()
    expect(useBattleStore.getState().redoStack).toHaveLength(1)
  })

  it('redoLastAction restores undone state', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#0f0')
    expect(useBattleStore.getState().ships).toHaveLength(1)
    useBattleStore.getState().undoLastAction()
    expect(useBattleStore.getState().ships).toHaveLength(0)
    useBattleStore.getState().redoLastAction()
    expect(useBattleStore.getState().ships).toHaveLength(1)
  })

  it('redoLastAction pushes current state to undoStack', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().undoLastAction()
    const undoBefore = useBattleStore.getState().undoStack.length
    useBattleStore.getState().redoLastAction()
    expect(useBattleStore.getState().undoStack).toHaveLength(undoBefore + 1)
  })

  it('redoLastAction pops redoStack', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().undoLastAction()
    expect(useBattleStore.getState().redoStack).toHaveLength(1)
    useBattleStore.getState().redoLastAction()
    expect(useBattleStore.getState().redoStack).toHaveLength(0)
  })

  it('redoLastAction appends ↷ Redo log entry with correct round and phase', () => {
    useBattleStore.setState({ round: 3, phase: 'attack' })
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().undoLastAction()
    useBattleStore.getState().redoLastAction()
    const last = useBattleStore.getState().log.at(-1)
    expect(last.type).toBe('system')
    expect(last.message).toMatch(/↷ Redo/)
    expect(last.message).toContain('Round 3')
    expect(last.message).toContain('ATTACK')
  })

  it('new action clears redoStack', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().undoLastAction()
    expect(useBattleStore.getState().redoStack).toHaveLength(1)
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 1, r: 0 }, 'players', '#00f')
    expect(useBattleStore.getState().redoStack).toHaveLength(0)
  })

  it('resetBattle clears redoStack', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().undoLastAction()
    expect(useBattleStore.getState().redoStack).toHaveLength(1)
    useBattleStore.getState().resetBattle()
    expect(useBattleStore.getState().redoStack).toHaveLength(0)
  })

  it('undo/redo cycle preserves ship state correctly', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1', name: 'Alpha' }), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2', name: 'Beta' }), { q: 1, r: 0 }, 'players', '#00f')
    // undo both
    useBattleStore.getState().undoLastAction()
    useBattleStore.getState().undoLastAction()
    expect(useBattleStore.getState().ships).toHaveLength(0)
    // redo both
    useBattleStore.getState().redoLastAction()
    expect(useBattleStore.getState().ships).toHaveLength(1)
    useBattleStore.getState().redoLastAction()
    expect(useBattleStore.getState().ships).toHaveLength(2)
  })
})

// === DOGFIGHT ===

describe('dogfight', () => {
  function addTwo() {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1', name: 'Viper' }), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2', name: 'Fighter' }), { q: 0, r: 0 }, 'npc', '#f00')
    const [a, b] = useBattleStore.getState().ships
    return [a.id, b.id]
  }

  it('startDogfight creates group + sets inDogfight on ships', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startDogfight([a, b])
    const { dogfights, ships } = useBattleStore.getState()
    expect(dogfights).toHaveLength(1)
    expect(dogfights[0].active).toBe(true)
    expect(dogfights[0].microRound).toBe(1)
    expect(ships.find((s) => s.id === a).inDogfight).toBe(dogfights[0].id)
    expect(ships.find((s) => s.id === b).inDogfight).toBe(dogfights[0].id)
  })

  it('startDogfight no-ops with fewer than 2 ships', () => {
    addTwo()
    useBattleStore.getState().startDogfight(['p1'])
    expect(useBattleStore.getState().dogfights).toHaveLength(0)
  })

  it('startDogfight appends log entry', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startDogfight([a, b])
    const last = useBattleStore.getState().log.at(-1)
    expect(last.message).toMatch(/⚔/)
    expect(last.message).toMatch(/Viper/)
  })

  it('advanceDogfightMicroRound increments microRound and records winner', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startDogfight([a, b])
    const gid = useBattleStore.getState().dogfights[0].id
    useBattleStore.getState().advanceDogfightMicroRound(gid, [
      { shipId: a, total: 12 },
      { shipId: b, total: 8 },
    ])
    const g = useBattleStore.getState().dogfights[0]
    expect(g.microRound).toBe(2)
    expect(g.roundWinnerId).toBe(a)
    expect(g.roundWinnerMargin).toBe(4)
  })

  it('advanceDogfightMicroRound ends dogfight after micro-round 6', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startDogfight([a, b])
    const gid = useBattleStore.getState().dogfights[0].id
    for (let i = 0; i < 6; i++) {
      useBattleStore.getState().advanceDogfightMicroRound(gid, [
        { shipId: a, total: 10 },
        { shipId: b, total: 8 },
      ])
    }
    const g = useBattleStore.getState().dogfights[0]
    expect(g.active).toBe(false)
    expect(useBattleStore.getState().ships.find((s) => s.id === a).inDogfight).toBeNull()
  })

  it('escapeDogfight clears inDogfight for escaping ship', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startDogfight([a, b])
    const gid = useBattleStore.getState().dogfights[0].id
    useBattleStore.getState().escapeDogfight(a, gid)
    expect(useBattleStore.getState().ships.find((s) => s.id === a).inDogfight).toBeNull()
  })

  it('escapeDogfight ends group when fewer than 2 ships remain', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startDogfight([a, b])
    const gid = useBattleStore.getState().dogfights[0].id
    useBattleStore.getState().escapeDogfight(a, gid)
    expect(useBattleStore.getState().dogfights[0].active).toBe(false)
    expect(useBattleStore.getState().ships.find((s) => s.id === b).inDogfight).toBeNull()
  })

  it('endDogfight marks group inactive + clears all ships', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startDogfight([a, b])
    const gid = useBattleStore.getState().dogfights[0].id
    useBattleStore.getState().endDogfight(gid)
    expect(useBattleStore.getState().dogfights[0].active).toBe(false)
    expect(useBattleStore.getState().ships.find((s) => s.id === a).inDogfight).toBeNull()
    expect(useBattleStore.getState().ships.find((s) => s.id === b).inDogfight).toBeNull()
  })

  it('resetBattle clears dogfights', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startDogfight([a, b])
    useBattleStore.getState().resetBattle()
    expect(useBattleStore.getState().dogfights).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Boarding actions
// ---------------------------------------------------------------------------

describe('boarding', () => {
  function addTwo() {
    useBattleStore.getState().addShip(
      makeProfile({ id: 'p1', name: 'Viper', thrust: 4 }),
      { q: 0, r: 0 }, 'players', '#0f0',
    )
    useBattleStore.getState().addShip(
      makeProfile({ id: 'p2', name: 'Far Trader', thrust: 2 }),
      { q: 1, r: 0 }, 'npc', '#f00',
    )
    const [a, b] = useBattleStore.getState().ships
    return [a.id, b.id]
  }

  it('startBoarding creates boarding + sets inBoarding on both ships', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startBoarding(a, b)
    const { boardings, ships } = useBattleStore.getState()
    expect(boardings).toHaveLength(1)
    expect(boardings[0].attackerId).toBe(a)
    expect(boardings[0].defenderId).toBe(b)
    expect(boardings[0].phase).toBe('contact')
    expect(boardings[0].outcome).toBeNull()
    expect(ships.find((s) => s.id === a).inBoarding).toBe(boardings[0].id)
    expect(ships.find((s) => s.id === b).inBoarding).toBe(boardings[0].id)
  })

  it('startBoarding no-ops when same faction', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1', name: 'A', thrust: 4 }), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2', name: 'B', thrust: 2 }), { q: 1, r: 0 }, 'players', '#00f')
    const [a, b] = useBattleStore.getState().ships
    useBattleStore.getState().startBoarding(a.id, b.id)
    expect(useBattleStore.getState().boardings).toHaveLength(0)
  })

  it('startBoarding appends log entry', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startBoarding(a, b)
    const { log } = useBattleStore.getState()
    expect(log.some((e) => e.message.includes('Boarding initiated'))).toBe(true)
  })

  it('advanceBoardingPhase contact → conflict', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startBoarding(a, b)
    const bid = useBattleStore.getState().boardings[0].id
    useBattleStore.getState().advanceBoardingPhase(bid)
    expect(useBattleStore.getState().boardings[0].phase).toBe('conflict')
  })

  it('advanceBoardingPhase conflict → security', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startBoarding(a, b)
    const bid = useBattleStore.getState().boardings[0].id
    useBattleStore.getState().advanceBoardingPhase(bid)
    useBattleStore.getState().advanceBoardingPhase(bid)
    expect(useBattleStore.getState().boardings[0].phase).toBe('security')
  })

  it('setContactMethod updates contactMethod', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startBoarding(a, b)
    const bid = useBattleStore.getState().boardings[0].id
    useBattleStore.getState().setContactMethod(bid, 'breaching_tube')
    expect(useBattleStore.getState().boardings[0].contactMethod).toBe('breaching_tube')
  })

  it('setContactMethod no-ops when phase !== contact', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startBoarding(a, b)
    const bid = useBattleStore.getState().boardings[0].id
    useBattleStore.getState().advanceBoardingPhase(bid) // → conflict
    useBattleStore.getState().setContactMethod(bid, 'airlock_forced')
    expect(useBattleStore.getState().boardings[0].contactMethod).toBeNull()
  })

  it('toggleDefenderRotation toggles flag', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startBoarding(a, b)
    const bid = useBattleStore.getState().boardings[0].id
    expect(useBattleStore.getState().boardings[0].defenderRotating).toBe(false)
    useBattleStore.getState().toggleDefenderRotation(bid)
    expect(useBattleStore.getState().boardings[0].defenderRotating).toBe(true)
    useBattleStore.getState().toggleDefenderRotation(bid)
    expect(useBattleStore.getState().boardings[0].defenderRotating).toBe(false)
  })

  it('toggleForcedLinkage toggles flag', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startBoarding(a, b)
    const bid = useBattleStore.getState().boardings[0].id
    useBattleStore.getState().toggleForcedLinkage(bid)
    expect(useBattleStore.getState().boardings[0].forcedLinkage).toBe(true)
  })

  it('setObjective marks bridge as conquered', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startBoarding(a, b)
    const bid = useBattleStore.getState().boardings[0].id
    useBattleStore.getState().advanceBoardingPhase(bid) // → conflict
    useBattleStore.getState().setObjective(bid, 'bridge', true)
    expect(useBattleStore.getState().boardings[0].objectives.bridge).toBe(true)
    expect(useBattleStore.getState().boardings[0].objectives.engineering).toBe(false)
  })

  it('setObjective no-ops when phase !== conflict', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startBoarding(a, b)
    const bid = useBattleStore.getState().boardings[0].id
    // still in contact phase
    useBattleStore.getState().setObjective(bid, 'bridge', true)
    expect(useBattleStore.getState().boardings[0].objectives.bridge).toBe(false)
  })

  it('resolveBoarding attacker_wins sets outcome + clears inBoarding', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startBoarding(a, b)
    const bid = useBattleStore.getState().boardings[0].id
    useBattleStore.getState().resolveBoarding(bid, 'attacker_wins')
    const { boardings, ships } = useBattleStore.getState()
    expect(boardings[0].outcome).toBe('attacker_wins')
    expect(ships.find((s) => s.id === a).inBoarding).toBeNull()
    expect(ships.find((s) => s.id === b).inBoarding).toBeNull()
  })

  it('resolveBoarding no-ops when already resolved', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startBoarding(a, b)
    const bid = useBattleStore.getState().boardings[0].id
    useBattleStore.getState().resolveBoarding(bid, 'attacker_wins')
    useBattleStore.getState().resolveBoarding(bid, 'defender_wins')
    expect(useBattleStore.getState().boardings[0].outcome).toBe('attacker_wins')
  })

  it('resolveBoarding appends log entry', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startBoarding(a, b)
    const bid = useBattleStore.getState().boardings[0].id
    useBattleStore.getState().resolveBoarding(bid, 'defender_wins')
    expect(useBattleStore.getState().log.some((e) => e.message.includes('DEFENDER WINS'))).toBe(true)
  })

  it('updateShipFaction changes faction and appends log', () => {
    const [a] = addTwo()
    useBattleStore.getState().updateShipFaction(a, 'npc')
    const ship = useBattleStore.getState().ships.find((s) => s.id === a)
    expect(ship.faction).toBe('npc')
    expect(useBattleStore.getState().log.some((e) => e.message.includes('faction changed'))).toBe(true)
  })

  it('boardings are included in undo snapshot', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startBoarding(a, b)
    useBattleStore.getState().addShip(makeProfile({ id: 'p3', name: 'C' }), { q: 2, r: 0 }, 'neutral', '#fff')
    useBattleStore.getState().undoLastAction()
    // boarding still present (was committed before the undone action)
    expect(useBattleStore.getState().boardings).toHaveLength(1)
  })

  it('resetBattle clears boardings', () => {
    const [a, b] = addTwo()
    useBattleStore.getState().startBoarding(a, b)
    useBattleStore.getState().resetBattle()
    expect(useBattleStore.getState().boardings).toHaveLength(0)
  })
})

// === BASIC MODE — RANGE BANDS ===

describe('basic mode — addShip initialises range bands', () => {
  beforeEach(() => { useBattleStore.getState().resetBattle('basic') })

  it('adds no range band when first ship is added', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#0f0')
    expect(Object.keys(useBattleStore.getState().rangeBands)).toHaveLength(0)
  })

  it('adds no range band when two ships are same faction', () => {
    useBattleStore.getState().addShip(makeProfile({ name: 'A' }), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(makeProfile({ name: 'B' }), { q: 0, r: 0 }, 'players', '#00f')
    expect(Object.keys(useBattleStore.getState().rangeBands)).toHaveLength(0)
  })

  it('creates range band at Very Long for cross-faction ships', () => {
    useBattleStore.getState().addShip(makeProfile({ name: 'A' }), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(makeProfile({ name: 'B' }), { q: 0, r: 0 }, 'npc',     '#f00')
    const bands = useBattleStore.getState().rangeBands
    expect(Object.values(bands)).toHaveLength(1)
    expect(Object.values(bands)[0]).toBe('Very Long')
  })

  it('creates one range band per cross-faction pair with 3 ships', () => {
    useBattleStore.getState().addShip(makeProfile({ name: 'A' }), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(makeProfile({ name: 'B' }), { q: 0, r: 0 }, 'npc',     '#f00')
    useBattleStore.getState().addShip(makeProfile({ name: 'C' }), { q: 0, r: 0 }, 'npc',     '#ff0')
    // A vs B and A vs C — B and C are same faction so no pair between them
    expect(Object.values(useBattleStore.getState().rangeBands)).toHaveLength(2)
  })
})

describe('basic mode — removeShip cleans range bands', () => {
  beforeEach(() => { useBattleStore.getState().resetBattle('basic') })

  it('removes range band entries containing the removed ship', () => {
    useBattleStore.getState().addShip(makeProfile({ name: 'A' }), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(makeProfile({ name: 'B' }), { q: 0, r: 0 }, 'npc',     '#f00')
    const { ships } = useBattleStore.getState()
    useBattleStore.getState().removeShip(ships[0].id)
    expect(Object.keys(useBattleStore.getState().rangeBands)).toHaveLength(0)
  })
})

describe('setRangeBand', () => {
  beforeEach(() => { useBattleStore.getState().resetBattle('basic') })

  it('sets range band between two ships', () => {
    useBattleStore.getState().addShip(makeProfile({ name: 'A' }), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(makeProfile({ name: 'B' }), { q: 0, r: 0 }, 'npc',     '#f00')
    const [a, b] = useBattleStore.getState().ships
    useBattleStore.getState().setRangeBand(a.id, b.id, 'Medium')
    const key = [a.id, b.id].sort().join('_')
    expect(useBattleStore.getState().rangeBands[key]).toBe('Medium')
  })

  it('is commutative — key is order-independent', () => {
    useBattleStore.getState().addShip(makeProfile({ name: 'A' }), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(makeProfile({ name: 'B' }), { q: 0, r: 0 }, 'npc',     '#f00')
    const [a, b] = useBattleStore.getState().ships
    useBattleStore.getState().setRangeBand(a.id, b.id, 'Short')
    useBattleStore.getState().setRangeBand(b.id, a.id, 'Long')
    const key = [a.id, b.id].sort().join('_')
    expect(useBattleStore.getState().rangeBands[key]).toBe('Long')
  })
})

describe('applyBasicMovement', () => {
  beforeEach(() => { useBattleStore.getState().resetBattle('basic') })

  function setupShips(startBand = 'Medium') {
    useBattleStore.getState().addShip(makeProfile({ name: 'A', thrust: 6 }), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(makeProfile({ name: 'B', thrust: 4 }), { q: 0, r: 0 }, 'npc',     '#f00')
    const [a, b] = useBattleStore.getState().ships
    useBattleStore.getState().setRangeBand(a.id, b.id, startBand)
    return [a.id, b.id]
  }

  it('approach reduces range band by one step', () => {
    const [aId, bId] = setupShips('Long')
    useBattleStore.getState().applyBasicMovement(aId, bId, 'approach', 10)
    const key = [aId, bId].sort().join('_')
    expect(useBattleStore.getState().rangeBands[key]).toBe('Medium')
  })

  it('flee increases range band by one step', () => {
    const [aId, bId] = setupShips('Medium')
    useBattleStore.getState().applyBasicMovement(aId, bId, 'flee', 5)
    const key = [aId, bId].sort().join('_')
    expect(useBattleStore.getState().rangeBands[key]).toBe('Long')
  })

  it('cannot go closer than Adjacent', () => {
    const [aId, bId] = setupShips('Adjacent')
    useBattleStore.getState().applyBasicMovement(aId, bId, 'approach', 1)
    const key = [aId, bId].sort().join('_')
    expect(useBattleStore.getState().rangeBands[key]).toBe('Adjacent')
  })

  it('cannot go further than Distant', () => {
    const [aId, bId] = setupShips('Distant')
    useBattleStore.getState().applyBasicMovement(aId, bId, 'flee', 50)
    const key = [aId, bId].sort().join('_')
    expect(useBattleStore.getState().rangeBands[key]).toBe('Distant')
  })

  it('deducts thrustSpent from moving ship', () => {
    const [aId, bId] = setupShips('Long')
    useBattleStore.getState().applyBasicMovement(aId, bId, 'approach', 10)
    const a = useBattleStore.getState().ships.find((s) => s.id === aId)
    expect(a.thrustUsedThisRound).toBe(10)
  })

  it('flee does not deduct thrust from target', () => {
    const [aId, bId] = setupShips('Medium')
    useBattleStore.getState().applyBasicMovement(aId, bId, 'flee', 5)
    const b = useBattleStore.getState().ships.find((s) => s.id === bId)
    expect(b.thrustUsedThisRound).toBe(0)
  })

  it('undo restores rangeBands after applyBasicMovement', () => {
    const [aId, bId] = setupShips('Very Long')
    const key = [aId, bId].sort().join('_')
    useBattleStore.getState().applyBasicMovement(aId, bId, 'approach', 25)
    expect(useBattleStore.getState().rangeBands[key]).toBe('Long')
    useBattleStore.getState().undoLastAction()
    expect(useBattleStore.getState().rangeBands[key]).toBe('Very Long')
  })
})

describe('basic mode — advancePhase skips movement', () => {
  beforeEach(() => { useBattleStore.getState().resetBattle('basic') })

  it('goes setup → initiative → acceleration (not skipped)', () => {
    expect(useBattleStore.getState().phase).toBe('setup')
    useBattleStore.getState().advancePhase()
    expect(useBattleStore.getState().phase).toBe('initiative')
    useBattleStore.getState().advancePhase()
    expect(useBattleStore.getState().phase).toBe('acceleration')
  })

  it('skips movement phase: acceleration → attack', () => {
    useBattleStore.setState({ phase: 'acceleration', combatMode: 'basic' })
    useBattleStore.getState().advancePhase()
    expect(useBattleStore.getState().phase).toBe('attack')
  })

  it('does NOT skip movement in vectorial mode', () => {
    useBattleStore.setState({ phase: 'acceleration', combatMode: 'vectorial' })
    useBattleStore.getState().advancePhase()
    expect(useBattleStore.getState().phase).toBe('movement')
  })
})

describe('inBoarding guards — dogfight and passing encounters', () => {
  it('startDogfight is blocked when one of the ships is in boarding', () => {
    useBattleStore.getState().addShip(makeProfile({ name: 'A' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ name: 'B' }), { q: 0, r: 0 }, 'npc',     '#f00')
    const [a, b] = useBattleStore.getState().ships.map((s) => s.id)
    useBattleStore.setState({
      ships: useBattleStore.getState().ships.map((s) =>
        s.id === a ? { ...s, inBoarding: 'boarding-99' } : s
      ),
      boardings: [{ id: 'boarding-99', attackerId: a, defenderId: b, phase: 'contact', outcome: null }],
    })
    const before = useBattleStore.getState().dogfights.length
    useBattleStore.getState().startDogfight([a, b])
    expect(useBattleStore.getState().dogfights.length).toBe(before)
  })

  it('passingEncounters excludes ships in boarding', () => {
    useBattleStore.getState().addShip(makeProfile({ name: 'A', thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ name: 'B', thrust: 4 }), { q: 3, r: 0 }, 'npc',     '#f00')
    const [a] = useBattleStore.getState().ships.map((s) => s.id)
    useBattleStore.setState({
      ships: useBattleStore.getState().ships.map((s) =>
        s.id === a ? { ...s, vector: { q: 3, r: 0 }, inBoarding: 'boarding-99' } : s
      ),
    })
    useBattleStore.getState().resolveMovement()
    expect(useBattleStore.getState().passingEncounters).toHaveLength(0)
  })
})

describe('resolveMovement — basic mode guard', () => {
  it('is a no-op in basic mode', () => {
    useBattleStore.setState({ combatMode: 'basic' })
    useBattleStore.getState().addShip(makeProfile({ name: 'A' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ name: 'B' }), { q: 2, r: 0 }, 'npc',     '#f00')
    const [a] = useBattleStore.getState().ships.map((s) => s.id)
    useBattleStore.setState({
      ships: useBattleStore.getState().ships.map((s) =>
        s.id === a ? { ...s, vector: { q: 2, r: 0 } } : s
      ),
    })
    const posBefore = useBattleStore.getState().ships.find((s) => s.id === a).position
    useBattleStore.getState().resolveMovement()
    const posAfter = useBattleStore.getState().ships.find((s) => s.id === a).position
    expect(posAfter).toEqual(posBefore)
    expect(useBattleStore.getState().passingEncounters).toHaveLength(0)
  })
})

// === SANDCASTER AMMO ===
// // MgT2e HG p.28 — 20 canisters per sandcaster slot

describe('sandcaster ammo initialisation', () => {
  it('sandAmmoTotal initialises to 0 for ship with no sandcasters', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    expect(useBattleStore.getState().ships[0].sandAmmoTotal).toBe(0)
  })

  it('sandAmmoTotal initialises to 20 for one Sandcaster slot', () => {
    const profile = makeProfile({ turrets: [{ slot: 1, weapons: ['Sandcaster'] }] })
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#fff')
    expect(useBattleStore.getState().ships[0].sandAmmoTotal).toBe(20)
  })

  it('sandAmmoTotal initialises to 40 for two Sandcaster slots', () => {
    const profile = makeProfile({ turrets: [
      { slot: 1, weapons: ['Sandcaster'] },
      { slot: 2, weapons: ['Sandcaster', 'Pulse Laser'] },
    ] })
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#fff')
    expect(useBattleStore.getState().ships[0].sandAmmoTotal).toBe(40)
  })
})

describe('spendSandAmmo', () => {
  it('decrements sandAmmoTotal by 1', () => {
    const profile = makeProfile({ turrets: [{ slot: 1, weapons: ['Sandcaster'] }] })
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().spendSandAmmo(id)
    expect(useBattleStore.getState().ships[0].sandAmmoTotal).toBe(19)
  })

  it('clamps sandAmmoTotal at 0', () => {
    const profile = makeProfile({ turrets: [{ slot: 1, weapons: ['Sandcaster'] }] })
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().updateShip(id, { sandAmmoTotal: 0 })
    useBattleStore.getState().spendSandAmmo(id)
    expect(useBattleStore.getState().ships[0].sandAmmoTotal).toBe(0)
  })

  it('does not affect other ships', () => {
    const sandProfile = makeProfile({ turrets: [{ slot: 1, weapons: ['Sandcaster'] }] })
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(sandProfile, { q: 1, r: 0 }, 'npc', '#f00')
    const [s1, s2] = useBattleStore.getState().ships
    useBattleStore.getState().spendSandAmmo(s2.id)
    expect(useBattleStore.getState().ships[0].sandAmmoTotal).toBe(0)
    expect(useBattleStore.getState().ships[1].sandAmmoTotal).toBe(19)
  })

  it('unknown shipId is no-op', () => {
    expect(() => useBattleStore.getState().spendSandAmmo('ghost')).not.toThrow()
  })
})

// === MISSILE AMMO — BARBETTES AND TORPEDOES ===
// // MgT2e HG p.30–31

describe('missile ammo initialisation — barbette and torpedo', () => {
  it('Missile Barbette initialises to 25 ammo', () => {
    const profile = makeProfile({ turrets: [{ slot: 1, weapons: ['Missile Barbette'] }] })
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#fff')
    expect(useBattleStore.getState().ships[0].missileAmmoTotal).toBe(25)
  })

  it('Torpedo initialises to 3 ammo', () => {
    const profile = makeProfile({ turrets: [{ slot: 1, weapons: ['Torpedo'] }] })
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#fff')
    expect(useBattleStore.getState().ships[0].missileAmmoTotal).toBe(3)
  })

  it('Rack + Barbette + Torpedo mixed capacity sums correctly', () => {
    const profile = makeProfile({ turrets: [
      { slot: 1, weapons: ['Missile Rack'] },
      { slot: 2, weapons: ['Missile Barbette'] },
      { slot: 3, weapons: ['Torpedo'] },
    ] })
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#fff')
    // 12 + 25 + 3 = 40
    expect(useBattleStore.getState().ships[0].missileAmmoTotal).toBe(40)
  })
})

// === ION CANNON — applyIonDamage ===
// // MgT2e HG p.30

describe('applyIonDamage', () => {
  it('sets ionPenalty and ionRoundsLeft on target', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'npc', '#f00')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyIonDamage(id, 5, 2)
    const ship = useBattleStore.getState().ships[0]
    expect(ship.ionPenalty).toBe(5)
    expect(ship.ionRoundsLeft).toBe(2)
  })

  it('overwrites previous ion state (new hit replaces old)', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'npc', '#f00')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyIonDamage(id, 3, 1)
    useBattleStore.getState().applyIonDamage(id, 8, 3)
    const ship = useBattleStore.getState().ships[0]
    expect(ship.ionPenalty).toBe(8)
    expect(ship.ionRoundsLeft).toBe(3)
  })

  it('does not affect other ships', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile(), { q: 1, r: 0 }, 'npc',     '#f00')
    const [s1, s2] = useBattleStore.getState().ships
    useBattleStore.getState().applyIonDamage(s2.id, 6, 1)
    expect(useBattleStore.getState().ships[0].ionPenalty  ?? 0).toBe(0)
    expect(useBattleStore.getState().ships[0].ionRoundsLeft ?? 0).toBe(0)
  })

  it('unknown shipId is no-op', () => {
    expect(() => useBattleStore.getState().applyIonDamage('ghost', 4, 1)).not.toThrow()
  })
})

// === ION STATE — round decrement via startNextRound ===

describe('ion disruption — round decrement', () => {
  it('ionRoundsLeft decrements by 1 each round', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'npc', '#f00')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyIonDamage(id, 4, 3)
    useBattleStore.getState().startNextRound()
    expect(useBattleStore.getState().ships[0].ionRoundsLeft).toBe(2)
    expect(useBattleStore.getState().ships[0].ionPenalty).toBe(4)
  })

  // BUG-001: ionPenalty with ionRoundsLeft=1 must survive the first round boundary
  // so the target's acceleration phase in round N+1 is still penalised. // HG p.30
  it('ionPenalty with ionRoundsLeft=1 persists through first round boundary', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'npc', '#f00')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyIonDamage(id, 4, 1)
    useBattleStore.getState().startNextRound()
    const ship = useBattleStore.getState().ships[0]
    expect(ship.ionRoundsLeft).toBe(0)
    expect(ship.ionPenalty).toBe(4)  // still active — round N+1 acceleration not yet resolved
  })

  it('ionPenalty clears after two round boundaries when ionRoundsLeft=1', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'npc', '#f00')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyIonDamage(id, 4, 1)
    useBattleStore.getState().startNextRound()
    useBattleStore.getState().startNextRound()
    const ship = useBattleStore.getState().ships[0]
    expect(ship.ionRoundsLeft).toBe(0)
    expect(ship.ionPenalty).toBe(0)
  })

  it('no ion state: startNextRound is no-op on ion fields', () => {
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().startNextRound()
    const ship = useBattleStore.getState().ships[0]
    expect(ship.ionRoundsLeft ?? 0).toBe(0)
    expect(ship.ionPenalty  ?? 0).toBe(0)
  })
})

describe('spendReactionThrust — ionPenalty reduces available pool', () => {
  it('ionPenalty subtracts from available reaction thrust', () => {
    // thrust=6, ionPenalty=3 → available=3
    useBattleStore.getState().addShip(makeProfile({ thrust: 6 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().applyIonDamage(id, 3, 2)
    useBattleStore.getState().spendReactionThrust(id, 6)
    // max = thrust(6) - ionPenalty(3) = 3
    expect(useBattleStore.getState().ships[0].evasiveThrust).toBe(3)
  })

  it('ionPenalty + thrustPenalty combine to reduce available thrust', () => {
    // thrust=6, thrustPenalty=2, ionPenalty=2 → available=2
    useBattleStore.getState().addShip(makeProfile({ thrust: 6 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().updateShip(id, { thrustPenalty: 2 })
    useBattleStore.getState().applyIonDamage(id, 2, 1)
    useBattleStore.getState().spendReactionThrust(id, 10)
    expect(useBattleStore.getState().ships[0].evasiveThrust).toBe(2)
  })
})
