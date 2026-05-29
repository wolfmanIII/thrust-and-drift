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
})

// === CREW ACTIONS ===

describe('declareEvasiveThrust', () => {
  it('sets evasiveThrust on ship', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().declareEvasiveThrust(id, 2)
    expect(useBattleStore.getState().ships[0].evasiveThrust).toBe(2)
  })

  it('clamps to available thrust', () => {
    // thrust=4, thrustUsedThisRound=3 → max=1
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().updateShip(id, { thrustUsedThisRound: 3 })
    useBattleStore.getState().declareEvasiveThrust(id, 4)
    expect(useBattleStore.getState().ships[0].evasiveThrust).toBe(1)
  })

  it('clamps negative amount to 0', () => {
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().declareEvasiveThrust(id, -5)
    expect(useBattleStore.getState().ships[0].evasiveThrust).toBe(0)
  })

  it('thrustPenalty reduces maximum evasive thrust', () => {
    // thrust=4, penalty=2 → max evasive = 2
    useBattleStore.getState().addShip(makeProfile({ thrust: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.getState().updateShip(id, { thrustPenalty: 2 })
    useBattleStore.getState().declareEvasiveThrust(id, 4)
    expect(useBattleStore.getState().ships[0].evasiveThrust).toBe(2)
  })

  it('unknown shipId is no-op', () => {
    expect(() => useBattleStore.getState().declareEvasiveThrust('ghost', 2)).not.toThrow()
  })
})

describe('applySensorLock / clearSensorLock', () => {
  it('sets lock on attacker and target', () => {
    const store = useBattleStore.getState()
    store.addShip(makeProfile({ id: 'p1', name: 'Attacker' }), { q: 0, r: 0 }, 'players', '#0f0')
    store.addShip(makeProfile({ id: 'p2', name: 'Target'   }), { q: 1, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().applySensorLock(att.id, tgt.id, 3)
    const s = useBattleStore.getState()
    const attUpdated = s.ships.find(sh => sh.id === att.id)
    const tgtUpdated = s.ships.find(sh => sh.id === tgt.id)
    expect(attUpdated.sensorLockOn).toBe(tgt.id)
    expect(attUpdated.sensorLockDM).toBe(3)
    expect(tgtUpdated.sensorLockedBy).toBe(att.id)
  })

  it('sensorLockDM clamped at 0 minimum', () => {
    const store = useBattleStore.getState()
    store.addShip(makeProfile({ id: 'p1', name: 'A' }), { q: 0, r: 0 }, 'players', '#0f0')
    store.addShip(makeProfile({ id: 'p2', name: 'B' }), { q: 1, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().applySensorLock(att.id, tgt.id, -2)
    expect(useBattleStore.getState().ships.find(s => s.id === att.id).sensorLockDM).toBe(0)
  })

  it('clearSensorLock removes lock from both ships', () => {
    const store = useBattleStore.getState()
    store.addShip(makeProfile({ id: 'p1', name: 'A' }), { q: 0, r: 0 }, 'players', '#0f0')
    store.addShip(makeProfile({ id: 'p2', name: 'B' }), { q: 1, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().applySensorLock(att.id, tgt.id, 2)
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

  it('missiles move and decrement thrustRemaining', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1', name: 'A' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2', name: 'B' }), { q: 5, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 2, { q: 1, r: 0 }, { q: 1, r: 0 })
    const missileId = useBattleStore.getState().missiles[0].id
    useBattleStore.getState().resolveMovement()
    const missile = useBattleStore.getState().missiles.find(m => m.id === missileId)
    expect(missile.position).toEqual({ q: 2, r: 0 })
    expect(missile.thrustRemaining).toBe(9)
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
})

// === MISSILES ===

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

  it('increments turretsNeedingReload on attacker', () => {
    useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
    useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 5, r: 0 }, 'npc',     '#f00')
    const [att, tgt] = useBattleStore.getState().ships
    useBattleStore.getState().launchMissile(att.id, tgt.id, 1, { q: 0, r: 0 }, { q: 0, r: 0 })
    expect(useBattleStore.getState().ships[0].turretsNeedingReload).toBe(1)
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

  it('undoLastAction appends ↩ Undo log entry', () => {
    useBattleStore.setState({ round: 2, phase: 'attack' })
    useBattleStore.getState().addShip(makeProfile(), { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().undoLastAction()
    const last = useBattleStore.getState().log.at(-1)
    expect(last.type).toBe('system')
    expect(last.message).toMatch(/↩ Undo/)
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
})
