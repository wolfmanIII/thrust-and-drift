/**
 * Battle state store — ships, missiles, round flow, log.
 * Coordinates all in-battle state; delegates calculations to utils/combat.js.
 * // MgT2e CRB p.160–168, Traveller Companion p.169–186
 */

import { create } from 'zustand'
import { v7 as uuidv7 } from 'uuid'
import { exportBattle, importBattle } from '../utils/io.js'
import { applyThrust, applyMovement, rollInitiative, getThresholdCriticalCount, countMissileAmmoCapacity, countSandcasters, computeIonThrustEffect } from '../utils/combat.js'
import { hexAdd, hexDistance, segmentMinDistance } from '../utils/hex.js'
import { getObstacleAt, applyMovementWithObstacles } from '../utils/obstacles.js'
import { getCriticalLocation, getCriticalEffect } from '../data/criticalHits.js'
import { roll2D6, rollDice } from '../utils/dice.js'
import { getEffectiveSkill, buildDefaultAssignments } from '../utils/crew.js'
import { resolveDogfightChecks } from '../utils/dogfight.js'
import { RANGE_BAND_ORDER, RANGE_BAND_MOVE_COST } from '../data/rangeBands.js'
import { useUiStore } from './uiStore.js'
import { emitEffect } from '../utils/effectQueue.js'

/** Canonical sort key for a ship pair — order-independent. */
function pairKey(id1, id2) { return [id1, id2].sort().join('_') }


/**
 * Max hex-distance of vector correction a missile may apply per round.
 * // Traveller Companion p.176 — Standard missile Thrust 10
 */
const MISSILE_GUIDANCE_THRUST = 10 // MgT2e CRB p.162 — standard missile Thrust 10

/**
 * Advance a basic-mode missile toward its target by one round of guidance thrust.
 * Spends MISSILE_GUIDANCE_THRUST points against the Ship Movement cost table (CRB p.166).
 * Excess thrust carries over to the next closer band.
 * @param {object} missile
 * @returns {{ missile: object, impacted: boolean }}
 */
function advanceBasicMissileOneRound(missile) {
  if (!missile.basicRangeBand) return { missile, impacted: false }
  let band = missile.basicRangeBand
  let accumulated = missile.basicThrustAccumulated ?? 0
  if (band === 'Adjacent') return { missile: { ...missile, basicThrustAccumulated: 0 }, impacted: true }
  let budget = MISSILE_GUIDANCE_THRUST
  while (budget > 0) {
    const idx = RANGE_BAND_ORDER.indexOf(band)
    if (idx <= 0) { band = 'Adjacent'; break }
    const cost = RANGE_BAND_MOVE_COST[band] ?? 1
    const total = accumulated + budget
    if (total >= cost) {
      budget = total - cost
      accumulated = 0
      band = RANGE_BAND_ORDER[idx - 1]
    } else {
      accumulated = total
      budget = 0
    }
  }
  return { missile: { ...missile, basicRangeBand: band, basicThrustAccumulated: accumulated }, impacted: band === 'Adjacent' }
}

/**
 * Compute the guided vector for a missile homing toward its target.
 * Aims for the target's predicted next position (target.position + target.vector).
 * Applies up to MISSILE_GUIDANCE_THRUST hex-distance of delta-v per round.
 * Returns the current vector unchanged if thrustRemaining is 0 or target is gone.
 * @param {{ vector: {q:number,r:number}, position: {q:number,r:number}, thrustRemaining: number }} missile
 * @param {{ position: {q:number,r:number}, vector: {q:number,r:number} }|undefined} targetShip
 * @returns {{ q:number, r:number }}
 */
function computeMissileGuidance(missile, targetShip) {
  if (missile.thrustRemaining <= 0 || !targetShip) return missile.vector

  const targetNext = hexAdd(targetShip.position, targetShip.vector)
  const idealQ     = targetNext.q - missile.position.q
  const idealR     = targetNext.r - missile.position.r
  const deltaQ     = idealQ - missile.vector.q
  const deltaR     = idealR - missile.vector.r

  const deltaMag = hexDistance({ q: 0, r: 0 }, { q: deltaQ, r: deltaR })
  if (deltaMag === 0) return missile.vector

  const scale = Math.min(1, MISSILE_GUIDANCE_THRUST / deltaMag)
  return {
    q: missile.vector.q + Math.round(deltaQ * scale),
    r: missile.vector.r + Math.round(deltaR * scale),
  }
}

/**
 * @typedef {'setup'|'initiative'|'acceleration'|'movement'|'attack'|'actions'|'end'} BattlePhase
 */

/**
 * Derive thrustPenalty from the effective M-Drive critical severity.
 * Sev 1 → 0 (DM only). Sev 2–4 → −1 thrust. Sev 5–6 → thrust = 0.
 * // MgT2e CRB p.170
 * @param {{ severity: number }|undefined} mDriveCrit
 * @param {number} maxThrust
 * @returns {number}
 */
function computeThrustPenalty(mDriveCrit, maxThrust) {
  if (!mDriveCrit) return 0
  if (mDriveCrit.severity >= 5) return maxThrust
  if (mDriveCrit.severity >= 2) return 1
  return 0
}

/**
 * Complete phase sequence including setup.
 * Drives all phase transitions — no special cases needed.
 */
const PHASE_ORDER = ['setup', 'initiative', 'acceleration', 'movement', 'attack', 'actions', 'end']

/**
 * Compute next-round state patch: increments round, resets per-round ship fields, appends log entry.
 * Pure function — shared by startNextRound and advancePhase to prevent double-push on round transition.
 * @param {object} s  Current Zustand state slice
 * @returns {object} State patch
 */
function buildNextRoundState(s) {
  // Advance basic-mode missiles toward their targets; detect impacts.
  let updatedMissiles = s.missiles
  let newImpacts = []
  if (s.combatMode === 'basic' && s.missiles.length > 0) {
    const results = s.missiles.map(advanceBasicMissileOneRound)
    updatedMissiles = results.filter((r) => !r.impacted).map((r) => ({ ...r.missile, ewAppliedThisRound: false }))
    newImpacts = results.filter((r) => r.impacted).map((r) => ({
      id: uuidv7(),
      launchedBy: r.missile.launchedBy,
      target: r.missile.target,
      count: r.missile.count,
      type: r.missile.type,
      ewAppliedThisRound: false,
      hasSmartGuidance: r.missile.hasSmartGuidance ?? true,
    }))
  } else if (s.missiles.length > 0) {
    // vectorial mode: reset ewAppliedThisRound each round
    updatedMissiles = s.missiles.map((m) => ({ ...m, ewAppliedThisRound: false }))
  }

  const impactLogs = newImpacts.map((impact) => {
    const launcher = s.ships.find((sh) => sh.id === impact.launchedBy)
    const tgt      = s.ships.find((sh) => sh.id === impact.target)
    return makeLogEntry({
      round: s.round + 1, phase: 'initiative', type: 'attack',
      message: `${launcher?.profile.name ?? '?'} — ${impact.count}× ${impact.type} reaches ${tgt?.profile.name ?? '?'}. Resolve damage.`,
      shipId: impact.launchedBy, details: impact,
    })
  })

  const updatedShips = s.ships.map((sh) => {
    const ionCurrent    = sh.ionRoundsLeft ?? 0
    const ionNext       = Math.max(0, ionCurrent - 1)
    const ionReduction  = ionCurrent > 0 ? (sh.ionPowerReduction ?? 0) : 0
    const restoredPower = sh.basePower ?? sh.profile.maxPower ?? 100
    const baseBw        = sh.baseBandwidth ?? sh.profile.computerBandwidth ?? 0
    const bwReduction   = ionCurrent > 0 ? (sh.bandwidthReduction ?? 0) : 0
    // Leadership bonus: pending bonus activates this boundary; active bonus expires. // CRB p.166
    const bonusActivating = sh.initiativeBonusNextRound ?? 0
    const bonusExpiring   = sh.initiativeTemporaryBonus ?? 0
    return {
      ...sh,
      thrustUsedThisRound:  0,
      thrustBonusThisRound: 0,
      hasActedThisPhase:    false,
      evasiveThrust:        0,
      firedTurrets:         [],
      usedCrewMembers:      [],
      ionRoundsLeft:        ionNext,
      // Penalty persists while ionCurrent > 0 (survives one boundary for N+1 acceleration).
      // Clears only when ionCurrent reaches 0. // HG p.30, FAQ HG 2022 p.1 — BUG-001
      ionPowerReduction:  ionCurrent > 0 ? ionReduction : 0,
      currentPower:       ionCurrent > 0 ? Math.max(0, restoredPower - ionReduction) : restoredPower,
      bandwidthReduction: ionCurrent > 0 ? bwReduction : 0,
      currentBandwidth:   ionCurrent > 0 ? Math.max(0, baseBw - bwReduction) : baseBw,
      initiative:               (sh.initiative ?? 0) - bonusExpiring + bonusActivating,
      initiativeTemporaryBonus: bonusActivating,
      initiativeBonusNextRound: 0,
    }
  })

  // Re-sort initiativeOrder if any ship's initiative changed at this boundary. // CRB p.166
  const anyBonusChange = s.ships.some(
    (sh) => (sh.initiativeBonusNextRound ?? 0) > 0 || (sh.initiativeTemporaryBonus ?? 0) > 0
  )
  const newInitiativeOrder = anyBonusChange && s.initiativeOrder.length > 0
    ? [...s.initiativeOrder].sort((a, b) => {
        const ia = updatedShips.find((sh) => sh.id === a)?.initiative ?? 0
        const ib = updatedShips.find((sh) => sh.id === b)?.initiative ?? 0
        return ib - ia
      })
    : s.initiativeOrder

  return {
    round: s.round + 1,
    phase: 'initiative',
    currentActorIndex: 0,
    missiles: updatedMissiles,
    initiativeOrder: newInitiativeOrder,
    pendingMissileImpacts: [
      ...s.pendingMissileImpacts.map((i) => ({ ...i, ewAppliedThisRound: false })),
      ...newImpacts,
    ],
    ships: updatedShips,
    boardings: s.boardings.map((b) => {
      if (!b.defenderRotating || b.outcome !== null) return b
      const left = (b.rotatingRoundsLeft ?? 1) - 1
      return left > 0
        ? { ...b, rotatingRoundsLeft: left }
        : { ...b, defenderRotating: false, rotatingRoundsLeft: 0 }
    }),
    log: [
      ...s.log,
      ...impactLogs,
      makeLogEntry({
        round: s.round + 1, phase: 'initiative', type: 'system',
        message: `Round ${s.round + 1} begins.`,
      }),
    ],
  }
}

/**
 * Create a new log entry.
 * @param {object} params
 * @returns {object}
 */
function makeLogEntry({ round, phase, type, message, shipId = null, details = null }) {
  return {
    id: uuidv7(),
    round,
    phase,
    timestamp: new Date().toISOString(),
    type,
    shipId,
    message,
    details,
  }
}

const useBattleStore = create((set, get) => {
  /**
   * Wrap a store action to push history automatically.
   * Single-arg form: wh(fn) — always pushes.
   * Two-arg form: wh(guard, fn) — pushes only when guard(...args) returns truthy.
   * @param {Function} guardOrFn
   * @param {Function} [fn]
   */
  const wh = (guardOrFn, fn) => {
    if (fn === undefined) {
      return (...args) => { get().pushHistory(); return guardOrFn(...args) }
    }
    const guard = guardOrFn
    return (...args) => {
      if (!guard(...args)) return
      get().pushHistory()
      return fn(...args)
    }
  }

  return {
  // === STATE ===

  /** @type {string} */
  id: uuidv7(),
  name: 'New Battle',
  round: 1,
  /** @type {'vectorial'|'basic'} */
  combatMode: 'vectorial',
  /** @type {BattlePhase} */
  phase: 'setup',
  /** @type {string[]} Ordered ship IDs by initiative */
  initiativeOrder: [],
  currentActorIndex: 0,

  /** @type {object[]} ShipInstance array */
  ships: [],
  /** @type {object[]} MissileToken array */
  missiles: [],
  /** @type {object[]} DogfightGroup array */
  dogfights: [],
  /** @type {object[]} BoardingAction array */
  boardings: [],
  /** @type {object[]} LogEntry array */
  log: [],
  /** @type {object[]} Transient passing encounters — cleared after movement phase resolution. */
  passingEncounters: [],
  /** @type {object[]} Missile salvos that reached their target hex — awaiting damage resolution. */
  pendingMissileImpacts: [],

  mapSettings: { scale: 1 },

  /** @type {Record<string, string>} Range band per ship pair (basic mode only). Key: pairKey(id1, id2). */
  rangeBands: {},
  /** @type {Record<string, number>} Net thrust accumulated per pair toward band change (basic mode). Positive = approach, negative = flee. Persists across rounds until band changes. */
  basicBandPool: {},

  // === OBSTACLES (vectorial only, obstaclesEnabled immutable after setup phase) ===
  /** @type {boolean} */
  obstaclesEnabled: false,
  /** @type {object[]} ObstacleToken[] */
  obstacles: [],
  /** @type {object[]} Field collision events pending GM pilot-roll resolution. */
  pendingObstacleCollisions: [],

  /** @type {object[]} Undo history — snapshots of game state, capped at 20. */
  undoStack: [],
  /** @type {object[]} Redo history — populated by undoLastAction, cleared on any new action. */
  redoStack: [],

  // === UNDO / REDO ===

  /**
   * Snapshot current game state onto the undo stack (max 20 entries).
   * Called internally before every user-facing mutation.
   */
  pushHistory: () => {
    const { ships, missiles, dogfights, boardings, rangeBands, basicBandPool, round, phase, initiativeOrder, currentActorIndex, obstaclesEnabled, obstacles } = get()
    const snapshot = {
      ships: structuredClone(ships),
      missiles: structuredClone(missiles),
      dogfights: structuredClone(dogfights),
      boardings: structuredClone(boardings),
      rangeBands: { ...rangeBands },
      basicBandPool: { ...basicBandPool },
      round,
      phase,
      initiativeOrder: [...initiativeOrder],
      obstaclesEnabled,
      obstacles: structuredClone(obstacles),
      currentActorIndex,
    }
    // Any new user action invalidates the redo stack.
    set((s) => ({ undoStack: [...s.undoStack, snapshot].slice(-20), redoStack: [] }))
  },

  /** Restore the most recent snapshot; saves current state to redoStack; log is append-only. */
  undoLastAction: () => {
    useUiStore.getState().clearMovementAnimation()
    const { undoStack, redoStack, log } = get()
    if (undoStack.length === 0) return
    const { ships, missiles, dogfights, boardings, rangeBands, basicBandPool, round, phase, initiativeOrder, currentActorIndex, obstaclesEnabled, obstacles } = get()
    const redoSnapshot = {
      ships: structuredClone(ships),
      missiles: structuredClone(missiles),
      dogfights: structuredClone(dogfights),
      boardings: structuredClone(boardings),
      rangeBands: { ...rangeBands },
      basicBandPool: { ...basicBandPool },
      round, phase,
      initiativeOrder: [...initiativeOrder],
      currentActorIndex,
      obstaclesEnabled,
      obstacles: structuredClone(obstacles),
    }
    const stack = [...undoStack]
    const snapshot = stack.pop()
    const undoEntry = makeLogEntry({
      round: snapshot.round,
      phase: snapshot.phase,
      type: 'system',
      message: `↩ Undo — restored to Round ${snapshot.round}, ${snapshot.phase.toUpperCase()}.`,
    })
    set({ ...snapshot, undoStack: stack, redoStack: [...redoStack, redoSnapshot].slice(-20), log: [...log, undoEntry] })
  },

  /** Restore the next state from the redoStack; saves current state to undoStack; log is append-only. */
  redoLastAction: () => {
    useUiStore.getState().clearMovementAnimation()
    const { redoStack, undoStack, log } = get()
    if (redoStack.length === 0) return
    const { ships, missiles, dogfights, boardings, rangeBands, basicBandPool, round, phase, initiativeOrder, currentActorIndex, obstaclesEnabled, obstacles } = get()
    const undoSnapshot = {
      ships: structuredClone(ships),
      missiles: structuredClone(missiles),
      dogfights: structuredClone(dogfights),
      boardings: structuredClone(boardings),
      rangeBands: { ...rangeBands },
      basicBandPool: { ...basicBandPool },
      round, phase,
      initiativeOrder: [...initiativeOrder],
      currentActorIndex,
      obstaclesEnabled,
      obstacles: structuredClone(obstacles),
    }
    const stack = [...redoStack]
    const snapshot = stack.pop()
    const redoEntry = makeLogEntry({
      round: snapshot.round,
      phase: snapshot.phase,
      type: 'system',
      message: `↷ Redo — restored to Round ${snapshot.round}, ${snapshot.phase.toUpperCase()}.`,
    })
    set({ ...snapshot, undoStack: [...undoStack, undoSnapshot].slice(-20), redoStack: stack, log: [...log, redoEntry] })
  },

  // === OBSTACLES ===

  /**
   * Toggle obstaclesEnabled. Only allowed during setup phase — immutable after.
   * // Obstacles System Design §1.1
   */
  toggleObstaclesEnabled: () => {
    const { phase } = get()
    if (phase !== 'setup') return
    set((s) => ({ obstaclesEnabled: !s.obstaclesEnabled }))
  },

  /**
   * Add an obstacle token to the map.
   * @param {{ type: string, position: {q:number,r:number}, radius?: number, density?: string, label?: string }} fields
   */
  addObstacle: wh((fields) => {
    const obstacle = {
      id: uuidv7(),
      radius: 0,
      ...fields,
    }
    set((s) => ({
      obstacles: [...s.obstacles, obstacle],
      log: [...s.log, makeLogEntry({
        round: s.round, phase: s.phase, type: 'system',
        message: `Obstacle placed: ${obstacle.type.replace('_', ' ')}${obstacle.label ? ` — ${obstacle.label}` : ''}.`,
      })],
    }))
  }),

  /**
   * Remove an obstacle by id.
   * @param {string} id
   */
  removeObstacle: wh(
    (id) => !!get().obstacles.find((o) => o.id === id),
    (id) => {
      set((s) => ({ obstacles: s.obstacles.filter((o) => o.id !== id) }))
    }
  ),

  /**
   * Update obstacle properties (density, radius, label).
   * @param {string} id
   * @param {Partial<object>} patch
   */
  updateObstacle: wh(
    (id) => !!get().obstacles.find((o) => o.id === id),
    (id, patch) => {
      set((s) => ({ obstacles: s.obstacles.map((o) => o.id === id ? { ...o, ...patch } : o) }))
    }
  ),

  /** Dismiss a resolved obstacle collision event. */
  dismissObstacleCollision: (id) => {
    set((s) => ({ pendingObstacleCollisions: s.pendingObstacleCollisions.filter((c) => c.id !== id) }))
  },

  // === SHIP MANAGEMENT ===

  /**
   * Add a ship instance to the battle at a given hex position.
   * @param {object} profile  ShipProfile snapshot
   * @param {{ q: number, r: number }} position
   * @param {'players'|'npc'|'neutral'} faction
   * @param {string} color  CSS hex color
   */
  addShip: wh((profile, position, faction, color) => {
    const instance = {
      id: uuidv7(),
      profileId: profile.id,
      profile: { ...profile },
      faction,
      color,
      position: { ...position },
      vector: { q: 0, r: 0 },
      lastThrustDelta: { q: 0, r: 0 },
      hullCurrent: profile.hull,
      baseArmor: profile.armor ?? 0,
      isDestroyed: false,
      thrustUsedThisRound: 0,
      thrustBonusThisRound: 0,
      thrustPenalty: 0,
      criticalHits: [],
      initiative: 0,
      initiativeBonusNextRound:   0,
      initiativeTemporaryBonus:   0,
      hasActedThisPhase: false,
      evasiveThrust: 0,
      firedTurrets: [],
      usedCrewMembers: [],
      sensorLockOn: null,
      sensorLockedBy: null,
      sensorLockDM: 0,
      turretsNeedingReload: 0,
      missileAmmoTotal: countMissileAmmoCapacity(profile),
      sandAmmoTotal: countSandcasters(profile),
      inDogfight: null,
      inBoarding: null,
      crewAssignments: buildDefaultAssignments(profile.crew, profile.turrets),
      // Ion Power stat — HG p.30, FAQ HG 2022 p.1
      basePower:          profile.maxPower ?? 100,
      currentPower:       profile.maxPower ?? 100,
      ionPowerReduction:  0,
      baseBandwidth:      profile.computerBandwidth ?? 0,
      currentBandwidth:   profile.computerBandwidth ?? 0,
      bandwidthReduction: 0,
      hardened:           profile.hardened ?? false,
    }
    const { ships: existing, combatMode } = get()
    const newRangeBands = {}
    if (combatMode === 'basic') {
      for (const ex of existing) {
        if (ex.faction !== faction) {
          newRangeBands[pairKey(instance.id, ex.id)] = 'Very Long'
        }
      }
    }
    set((s) => ({
      ships: [...s.ships, instance],
      rangeBands: { ...s.rangeBands, ...newRangeBands },
      // If initiative has already been rolled this battle, append the new ship at the end
      // so it can act this round (with initiative 0 — last in order). MgT2e CRB p.160.
      initiativeOrder: s.initiativeOrder.length > 0
        ? [...s.initiativeOrder, instance.id]
        : s.initiativeOrder,
      log: [...s.log, makeLogEntry({
        round: s.round,
        phase: s.phase,
        type: 'system',
        message: `${profile.name} added to battle as ${faction}.`,
        shipId: instance.id,
      })],
    }))
  }),

  /**
   * Remove a ship instance from the battle.
   * @param {string} shipId
   */
  removeShip: wh(
    (shipId) => !!get().ships.find((s) => s.id === shipId),
    (shipId) => {
      const ship = get().ships.find((s) => s.id === shipId)
      set((s) => ({
        ships: s.ships
          .filter((sh) => sh.id !== shipId)
          .map((sh) => {
            if (sh.sensorLockOn   === shipId) return { ...sh, sensorLockOn: null, sensorLockDM: 0 }
            if (sh.sensorLockedBy === shipId) return { ...sh, sensorLockedBy: null }
            return sh
          }),
        missiles: s.missiles.filter((m) => m.launchedBy !== shipId && m.target !== shipId),
        initiativeOrder: s.initiativeOrder.filter((id) => id !== shipId),
        rangeBands: Object.fromEntries(
          Object.entries(s.rangeBands).filter(([k]) => !k.split('_').includes(shipId))
        ),
        basicBandPool: Object.fromEntries(
          Object.entries(s.basicBandPool ?? {}).filter(([k]) => !k.split('_').includes(shipId))
        ),
        log: [...s.log, makeLogEntry({
          round: s.round,
          phase: s.phase,
          type: 'system',
          message: `${ship.profile.name} removed from battle.`,
        })],
      }))
    },
  ),

  /**
   * Apply partial updates to a ship instance.
   * @param {string} shipId
   * @param {Partial<object>} updates
   */
  updateShip: (shipId, updates) => {
    set((s) => ({
      ships: s.ships.map((sh) => sh.id === shipId ? { ...sh, ...updates } : sh),
    }))
  },

  /**
   * Set crew role assignments for a ship instance.
   * @param {string} shipId
   * @param {object} assignments  { pilot, leadership, tactics, engineer, sensors, gunners: { [slot]: memberId } }
   */
  setCrewAssignments: (shipId, assignments) => {
    set((s) => ({
      ships: s.ships.map((sh) => sh.id === shipId ? { ...sh, crewAssignments: assignments } : sh),
    }))
  },

  // === INITIATIVE ===

  /**
   * Roll initiative for all ships and sort the order.
   * @param {Record<string, number>} [tacticsEffects]   Optional per-shipId tactics bonus
   * @param {Record<string, object>} [diceOverrides]    Pre-rolled dice per shipId (player manual entry)
   */
  rollAllInitiative: wh((tacticsEffects = {}, diceOverrides = {}) => {
    const { ships, round } = get()
    const rolled = ships.map((ship) => {
      // NPC ships with Tactics skill auto-roll their Tactics check; player effects come from tacticsEffects map.
      let tacticsBonus = tacticsEffects[ship.id] ?? 0
      if (!(ship.id in tacticsEffects) && ship.faction !== 'players') {
        const tacticsSkill = getEffectiveSkill(ship.profile.crew, ship.crewAssignments, 'tactics')
        if (tacticsSkill > 0) {
          const tacticsRoll = roll2D6()
          tacticsBonus = tacticsRoll.total + tacticsSkill - 8
        }
      }
      const result = rollInitiative(
        getEffectiveSkill(ship.profile.crew, ship.crewAssignments, 'pilot'),
        ship.profile.thrust,
        tacticsBonus + (ship.initiativeBonusNextRound ?? 0),
        diceOverrides[ship.id] ?? null,
      )
      return { id: ship.id, initiative: result.total, roll: result }
    })

    const sorted = [...rolled].sort((a, b) => b.initiative - a.initiative)
    const entries = rolled.map((r) => makeLogEntry({
      round,
      phase: 'initiative',
      type: 'system',
      message: `Initiative ${get().ships.find(s => s.id === r.id)?.profile.name}: ${r.initiative}`,
      shipId: r.id,
      details: r.roll,
    }))

    set((s) => ({
      ships: s.ships.map((sh) => {
        const r = rolled.find((r) => r.id === sh.id)
        return r ? { ...sh, initiative: r.initiative, initiativeBonusNextRound: 0, initiativeBreakdown: r.roll.breakdown } : sh
      }),
      initiativeOrder: sorted.map((r) => r.id),
      currentActorIndex: 0,
      log: [...s.log, ...entries],
    }))
  }),

  // === THRUST ===

  /**
   * Apply a thrust delta to a ship's velocity vector.
   * Deducts from thrustUsedThisRound.
   * @param {string} shipId
   * @param {{ q: number, r: number }} delta
   * @param {number} cost  Hex distance of the delta
   */
  applyShipThrust: wh(
    (shipId) => !!get().ships.find((s) => s.id === shipId),
    (shipId, delta, cost) => {
      const ship = get().ships.find((s) => s.id === shipId)
      const newVector = applyThrust(ship.vector, delta)
      set((s) => ({
        ships: s.ships.map((sh) =>
          sh.id === shipId
            ? { ...sh, vector: newVector, lastThrustDelta: { ...delta }, thrustUsedThisRound: sh.thrustUsedThisRound + cost }
            : sh
        ),
        log: [...s.log, makeLogEntry({
          round: s.round,
          phase: s.phase,
          type: 'move',
          message: `${ship.profile.name} applies Thrust Δ(${delta.q},${delta.r}). Vector: (${newVector.q},${newVector.r}).`,
          shipId,
          details: { delta, newVector, cost },
        })],
      }))
    },
  ),

  /**
   * Mark a turret as having fired this round. Called by AttackModal on attack confirmation.
   * @param {string} shipId
   * @param {number} turretSlot
   */
  markTurretFired: wh(
    (shipId) => !!get().ships.find((s) => s.id === shipId),
    (shipId, turretSlot) => {
      set((s) => ({
        ships: s.ships.map((sh) =>
          sh.id === shipId
            ? { ...sh, firedTurrets: [...new Set([...(sh.firedTurrets ?? []), turretSlot])] }
            : sh
        ),
      }))
    },
  ),

  markCrewMemberUsed: wh(
    (shipId) => !!get().ships.find((s) => s.id === shipId),
    (shipId, memberId) => {
      set((s) => ({
        ships: s.ships.map((sh) =>
          sh.id === shipId
            ? { ...sh, usedCrewMembers: [...new Set([...(sh.usedCrewMembers ?? []), memberId])] }
            : sh
        ),
      }))
    },
  ),

  // === MOVEMENT (simultaneous) ===

  /** Move all ships and missiles by their current vector (movement phase). */
  resolveMovement: wh(() => {
    const { ships, missiles, round, combatMode, obstaclesEnabled, obstacles } = get()
    // Basic mode has no hex map — movement is managed via range bands in advancePhase.
    if (combatMode === 'basic') return

    // Detect "ships that pass in the night" before committing new positions.
    // // Traveller Companion p.172 — ships passing within Short range during movement
    const encounters = []
    for (let i = 0; i < ships.length; i++) {
      for (let j = i + 1; j < ships.length; j++) {
        const a = ships[i]
        const b = ships[j]
        if (a.faction === b.faction) continue
        if (a.isDestroyed || b.isDestroyed) continue
        if (a.inDogfight || b.inDogfight) continue
        if (a.inBoarding || b.inBoarding) continue
        const a1 = hexAdd(a.position, a.vector)
        const b1 = hexAdd(b.position, b.vector)
        const minDist  = segmentMinDistance(a.position, a1, b.position, b1)
        const finalDist = hexDistance(a1, b1)
        // Only flag when they pass within Short range but don't end in the same hex
        // (same-hex landings are handled by dogfight detection at movement→attack transition).
        if (minDist <= 2 && finalDist > 0) {
          encounters.push({ id: uuidv7(), shipAId: a.id, shipBId: b.id, minDistance: minDist, firedA: false, firedB: false })
        }
      }
    }

    const startPositions = {}
    ships.forEach((sh) => { startPositions[sh.id] = { ...sh.position } })
    missiles.forEach((m) => { startPositions[m.id] = { ...m.position } })
    useUiStore.getState().startMovementAnimation(startPositions)

    // === OBSTACLE-AWARE MOVEMENT ===
    // gravityImpacts: ships that hit an impassable gravity well
    // fieldCollisions: ships whose budget runs out inside a field (pilot check needed)
    const gravityImpacts  = []
    const fieldCollisions = []

    let movedShips = ships.map((sh) => {
      if (!obstaclesEnabled) {
        return { ...sh, position: applyMovement(sh.position, sh.vector) }
      }
      const { finalPosition, collision, gravityImpact } = applyMovementWithObstacles(sh.position, sh.vector, obstacles)
      if (gravityImpact) {
        gravityImpacts.push({
          shipId:          sh.id,
          shipName:        sh.profile.name,
          dogfightGroupId: sh.inDogfight ?? null,
          obstacle:        gravityImpact.obstacle,
          armor:           sh.profile.armor ?? 0,
        })
      }
      if (collision) {
        fieldCollisions.push({
          id:       uuidv7(),
          shipId:   sh.id,
          shipName: sh.profile.name,
          obstacle: collision.obstacle,
          position: collision.position,
        })
      }
      return { ...sh, position: finalPosition }
    })

    // Clear sensor locks for ships entering a nebula (both directions). // Obstacles System Design §3.4
    if (obstaclesEnabled) {
      const nebulaLockerIds = new Set(
        movedShips
          .filter((sh) => sh.sensorLockOn && getObstacleAt(obstacles, sh.position)?.type === 'nebula')
          .map((sh) => sh.id)
      )
      if (nebulaLockerIds.size > 0) {
        movedShips = movedShips.map((sh) => {
          if (nebulaLockerIds.has(sh.id)) return { ...sh, sensorLockOn: null, sensorLockDM: 0 }
          if (sh.sensorLockedBy && nebulaLockerIds.has(sh.sensorLockedBy)) return { ...sh, sensorLockedBy: null }
          return sh
        })
      }
    }

    // Terminate dogfights for ships hitting a gravity well (inline — endDogfight is wh-wrapped).
    // // Obstacles System Design §14.3
    const terminatedDogfightIds = new Set(
      gravityImpacts.filter((gi) => gi.dogfightGroupId).map((gi) => gi.dogfightGroupId)
    )
    if (terminatedDogfightIds.size > 0) {
      movedShips = movedShips.map((sh) =>
        terminatedDogfightIds.has(sh.inDogfight) ? { ...sh, inDogfight: null } : sh
      )
    }

    const movedMissiles = missiles.map((m) => {
      const targetShip  = ships.find((s) => s.id === m.target)
      const guidedVector = computeMissileGuidance(m, targetShip)
      return {
        ...m,
        vector:           guidedVector,
        position:         applyMovement(m.position, guidedVector),
        thrustRemaining:  m.thrustRemaining - 1,
      }
    })

    // Detect missile impacts: salvo reached its target's new hex. // MgT2e CRB p.162
    const movedShipPos = {}
    movedShips.forEach((sh) => { movedShipPos[sh.id] = sh.position })

    const impactedMissiles  = []
    const survivingMissiles = []
    movedMissiles.forEach((m) => {
      const targetPos = movedShipPos[m.target]
      if (targetPos && hexDistance(m.position, targetPos) === 0) {
        impactedMissiles.push(m)
      } else {
        survivingMissiles.push(m)
      }
    })

    const newImpacts = impactedMissiles.map((m) => ({
      id: uuidv7(),
      launchedBy: m.launchedBy,
      target: m.target,
      count: m.count,
      type: m.type,
      ewAppliedThisRound: false,
      hasSmartGuidance: m.hasSmartGuidance ?? true,
    }))

    const entries = movedShips.map((sh) => makeLogEntry({
      round,
      phase: 'movement',
      type: 'move',
      message: `${sh.profile.name} moves to (${sh.position.q},${sh.position.r}).`,
      shipId: sh.id,
      details: { position: sh.position, vector: sh.vector },
    }))

    const impactLogEntries = impactedMissiles.map((m) => {
      const launcherShip = movedShips.find((s) => s.id === m.launchedBy)
      const targetShip   = movedShips.find((s) => s.id === m.target)
      return makeLogEntry({
        round,
        phase: 'movement',
        type: 'system',
        message: `⚡ ${m.count}× ${m.type ?? 'Missile'} salvo from ${launcherShip?.profile.name ?? '?'} impacts ${targetShip?.profile.name ?? '?'}. Resolve damage.`,
        shipId: m.target,
        details: { recoverable: true, impact: { launchedBy: m.launchedBy, target: m.target, count: m.count, type: m.type ?? 'Missile' } },
      })
    })

    // Impacted missiles are kept in the store during the movement animation so they
    // visually travel to the target hex. The setTimeout removes them and triggers the
    // modal + sound after the animation completes.
    const impactedIds = impactedMissiles.map((m) => m.id)

    const gravityLogEntries = gravityImpacts.map((gi) =>
      makeLogEntry({
        round, phase: 'movement', type: 'system',
        message: `${gi.shipName} impacts ${gi.obstacle.label ?? gi.obstacle.type.replace(/_/g, ' ')} — atmospheric entry.${gi.dogfightGroupId ? ' Dogfight terminated.' : ''}`,
        shipId: gi.shipId,
      })
    )

    set((s) => ({
      ships: movedShips,
      dogfights: terminatedDogfightIds.size > 0
        ? s.dogfights.map((g) => (terminatedDogfightIds.has(g.id) ? { ...g, active: false } : g))
        : s.dogfights,
      missiles: [
        ...survivingMissiles.filter((m) => m.thrustRemaining >= 0),
        ...impactedMissiles,  // kept alive for animation, removed below
      ],
      log: [...s.log, ...entries, ...impactLogEntries, ...gravityLogEntries],
      passingEncounters: [],  // deferred below — must not appear before animation ends
    }))

    // Gravity well impact damage — 4D6 reduced by Armor. // Obstacles System Design §3.3
    gravityImpacts.forEach((gi) => {
      const roll   = rollDice(4, 6)
      const damage = Math.max(0, roll.total - gi.armor)
      get().applyDamage(gi.shipId, damage, `${gi.obstacle.label ?? gi.obstacle.type.replace(/_/g, ' ')} — atmospheric impact`, true)
    })

    const animDuration = useUiStore.getState().movementAnimation?.duration ?? 2000
    if (newImpacts.length > 0 || encounters.length > 0 || fieldCollisions.length > 0) {
      setTimeout(() => {
        set((s) => ({
          missiles: s.missiles.filter((m) => !impactedIds.includes(m.id)),
          pendingMissileImpacts: [...s.pendingMissileImpacts, ...newImpacts],
          passingEncounters: encounters,
          pendingObstacleCollisions: [...s.pendingObstacleCollisions, ...fieldCollisions],
        }))
        newImpacts.forEach(() => emitEffect('impact_burst', {}))
      }, animDuration + 100)
    }
  }),

  /** Remove a single passing encounter by id (GM dismissed it via PassingAttackModal). */
  dismissPassingEncounter: (id) => {
    set((s) => ({ passingEncounters: s.passingEncounters.filter((e) => e.id !== id) }))
  },

  /** Remove a single missile impact by id after GM has resolved damage. */
  dismissMissileImpact: (id) => {
    set((s) => ({ pendingMissileImpacts: s.pendingMissileImpacts.filter((e) => e.id !== id) }))
  },

  /**
   * Re-queue a missile impact from the battle log (recovery after accidental dismiss).
   * @param {{ launchedBy: string, target: string, count: number, type: string }} impact
   */
  reopenMissileImpact: (impact) => {
    set((s) => ({
      pendingMissileImpacts: [...s.pendingMissileImpacts, { id: uuidv7(), ewAppliedThisRound: false, ...impact }],
    }))
  },

  /**
   * Apply Electronic Warfare to an in-flight missile salvo, removing missiles equal to Effect.
   * A salvo may only be EW'd once per round. Removes the salvo entirely if count drops to 0.
   * // MgT2e CRB p.173 — Electronic Warfare countermeasure, Difficult (10+) Electronics check
   * @param {string} actorShipId  Ship performing EW
   * @param {string} impactId     Target salvo id
   * @param {number} effect       Effect of the Electronics check (min 1 applied)
   */
  applyMissileEW: wh(
    (actorShipId, missileId) => {
      const { pendingMissileImpacts, missiles } = get()
      const impact = pendingMissileImpacts.find((i) => i.id === missileId)
      if (impact) return !impact.ewAppliedThisRound
      const missile = missiles.find((m) => m.id === missileId)
      return !!(missile && !missile.ewAppliedThisRound)
    },
    (actorShipId, missileId, effect) => {
      const { pendingMissileImpacts, missiles, ships, round, phase } = get()
      const actor = ships.find((s) => s.id === actorShipId)
      const removed = Math.max(1, effect)

      const impact = pendingMissileImpacts.find((i) => i.id === missileId)
      if (impact) {
        const newCount = impact.count - removed
        const logMsg = newCount <= 0
          ? `${actor?.profile.name ?? '?'} EW destroys entire salvo (${impact.count} missiles removed).`
          : `${actor?.profile.name ?? '?'} EW removes ${removed} missile(s) — salvo reduced to ${newCount}.`
        set((s) => ({
          pendingMissileImpacts: newCount <= 0
            ? s.pendingMissileImpacts.filter((i) => i.id !== missileId)
            : s.pendingMissileImpacts.map((i) =>
                i.id === missileId ? { ...i, count: newCount, ewAppliedThisRound: true } : i
              ),
          log: [...s.log, makeLogEntry({ round, phase, type: 'system', message: logMsg, shipId: actorShipId })],
        }))
        return
      }

      const missile = missiles.find((m) => m.id === missileId)
      if (!missile) return
      const newCount = missile.count - removed
      const logMsg = newCount <= 0
        ? `${actor?.profile.name ?? '?'} EW destroys entire in-flight salvo (${missile.count} missiles removed).`
        : `${actor?.profile.name ?? '?'} EW removes ${removed} missile(s) — in-flight salvo reduced to ${newCount}.`
      set((s) => ({
        missiles: newCount <= 0
          ? s.missiles.filter((m) => m.id !== missileId)
          : s.missiles.map((m) =>
              m.id === missileId ? { ...m, count: newCount, ewAppliedThisRound: true } : m
            ),
        log: [...s.log, makeLogEntry({ round, phase, type: 'system', message: logMsg, shipId: actorShipId })],
      }))
    }
  ),

  /**
   * Mark one side of a passing encounter as having fired.
   * Auto-dismisses the encounter once both sides are resolved.
   * @param {string} id - encounter id
   * @param {'A'|'B'} side - which ship fired
   */
  markPassingEncounterFired: (id, side) => {
    set((s) => {
      const updated = s.passingEncounters.map((e) => {
        if (e.id !== id) return e
        return { ...e, firedA: side === 'A' ? true : e.firedA, firedB: side === 'B' ? true : e.firedB }
      })
      const enc = updated.find((e) => e.id === id)
      if (enc?.firedA && enc?.firedB) {
        return { passingEncounters: updated.filter((e) => e.id !== id) }
      }
      return { passingEncounters: updated }
    })
  },

  // === DAMAGE ===

  /**
   * Apply damage to a ship's hull. Automatically triggers Sustained Damage threshold
   * criticals (one Sev-1 crit per 10% of starting Hull crossed).
   * Pass _skipThreshold=true for secondary damage (hull crit extra damage) to avoid cascades.
   * // MgT2e CRB p.169 — Sustained Damage
   * @param {string} shipId
   * @param {number} damage
   * @param {string} sourceLabel  Display name of the weapon/attacker
   * @param {boolean} [_skipThreshold=false]
   */
  applyDamage: (shipId, damage, sourceLabel, _skipThreshold = false) => {
    const ship = get().ships.find((s) => s.id === shipId)
    if (!ship) return
    if (!_skipThreshold) get().pushHistory()
    const prevHull    = ship.hullCurrent
    const hullCurrent = Math.max(0, prevHull - damage)
    const isDestroyed = hullCurrent === 0
    // Atomic set: update hull + destruction + sensor-lock cleanup in one transaction.
    // Splitting into multiple set() calls creates intermediate states that the rAF loop
    // can observe before React's passive useEffect syncs shipsRef.current.
    set((s) => ({
      ships: s.ships.map((sh) => {
        if (sh.id === shipId) {
          return {
            ...sh,
            hullCurrent,
            ...(isDestroyed ? {
              isDestroyed:   true,
              sensorLockOn:  null,
              sensorLockDM:  0,
              sensorLockedBy: null,
            } : {}),
          }
        }
        if (!isDestroyed) return sh
        // Clear sensor-lock references pointing to/from the destroyed ship on other ships
        if (sh.sensorLockOn   === shipId) return { ...sh, sensorLockOn: null, sensorLockDM: 0 }
        if (sh.sensorLockedBy === shipId) return { ...sh, sensorLockedBy: null }
        return sh
      }),
    }))
    const logEntries = [makeLogEntry({
      round: get().round,
      phase: get().phase,
      type: 'damage',
      message: `${ship.profile.name} takes ${damage} damage from ${sourceLabel}. Hull: ${hullCurrent}/${ship.profile.hull}.`,
      shipId,
      details: { damage, hullCurrent, hullMax: ship.profile.hull },
    })]
    if (isDestroyed && prevHull > 0) {
      logEntries.push(makeLogEntry({
        round: get().round,
        phase: get().phase,
        type: 'system',
        message: `⚠ ${ship.profile.name} DESTROYED — hull reduced to 0. Wreck remains on map until removed by GM.`,
        shipId,
      }))
      if (ship.position) emitEffect('ship_destroyed', { duration: 2200, hex: ship.position })
    }
    set((s) => ({ log: [...s.log, ...logEntries] }))

    if (_skipThreshold || damage <= 0) return

    const thresholdCount = getThresholdCriticalCount(prevHull, hullCurrent, ship.profile.hull)
    for (let i = 0; i < thresholdCount; i++) {
      // Read fresh state each iteration — prior crits in this loop may have stacked
      const current = get().ships.find((s) => s.id === shipId)
      if (!current) break
      const locRoll  = roll2D6()
      const location = getCriticalLocation(locRoll.total)
      const existing = current.criticalHits.find((c) => c.system === location)

      if ((existing?.severity ?? 0) >= 6) {
        // Max severity — apply 6D extra damage instead (CRB p.169)
        const extra = rollDice(6, 6)
        get().applyDamage(shipId, extra.total, `Critical ${location} (Sev. max — threshold)`, true)
      } else {
        const effectiveSeverity = existing
          ? Math.max(1, Math.min(6, existing.severity + 1))
          : 1
        get().addCriticalHit(shipId, { system: location, severity: effectiveSeverity }, { _skipHistory: true })
        const effect = getCriticalEffect(location, effectiveSeverity)
        // MgT2e CRB p.169 — Sustained Damage uses same Critical Hit Effects table as manual crits
        if (effect?.mechanic === 'hull_extra_damage') {
          const extra = rollDice(effect.value, 6)
          get().applyDamage(shipId, extra.total, `Critical Hull Sev.${effectiveSeverity} (threshold)`, true)
        } else if (effect?.mechanic === 'armour_reduce_fixed') {
          get().reduceArmour(shipId, effect.value, { _skipHistory: true })
        } else if (effect?.mechanic === 'armour_reduce_d3') {
          const extra = rollDice(1, 6)
          get().reduceArmour(shipId, Math.ceil(extra.total / 2), { _skipHistory: true })
        } else if (effect?.mechanic === 'armour_reduce_xd') {
          const extra = rollDice(effect.value, 6)
          get().reduceArmour(shipId, extra.total, { _skipHistory: true })
        }
      }
    }
  },

  /**
   * Consume one sandcaster canister on the given ship.
   * // MgT2e HG p.28 — 20 canisters per sandcaster
   * @param {string} shipId
   */
  spendSandAmmo: (shipId) => {
    set((s) => ({
      ships: s.ships.map((sh) => sh.id !== shipId ? sh : {
        ...sh,
        sandAmmoTotal: Math.max(0, (sh.sandAmmoTotal ?? countSandcasters(sh.profile)) - 1),
      }),
    }))
  },

  /**
   * Apply Ion weapon hit to a ship — reduces Power and computer bandwidth.
   * Hardened (/fib) ships are immune. Stacking: reductions are additive,
   * duration = max(existing, new). // HG p.30, FAQ HG 2022 p.1
   * @param {string} targetId
   * @param {number} ionDamage  Result of NbD × damageMultiple (already computed)
   * @param {number} ionRounds  Duration in rounds (1 or D3 if Effect ≥ 6)
   */
  applyIonDamage: (targetId, ionDamage, ionRounds) => {
    set((s) => ({
      ships: s.ships.map((sh) => {
        if (sh.id !== targetId) return sh
        if (sh.hardened) return sh                                    // /fib — immune
        const basePower         = sh.basePower ?? sh.profile.maxPower ?? 100
        const prevPwrReduction  = sh.ionPowerReduction ?? 0
        const newPwrReduction   = prevPwrReduction + ionDamage
        const newRoundsLeft     = Math.max(sh.ionRoundsLeft ?? 0, ionRounds)
        const newCurrentPower   = Math.max(0, basePower - newPwrReduction)
        const baseBw            = sh.baseBandwidth ?? sh.profile.computerBandwidth ?? 0
        const prevBwReduction   = sh.bandwidthReduction ?? 0
        const newBwReduction    = prevBwReduction + ionDamage
        const newCurrentBw      = Math.max(0, baseBw - newBwReduction)
        return {
          ...sh,
          ionPowerReduction:  newPwrReduction,
          currentPower:       newCurrentPower,
          ionRoundsLeft:      newRoundsLeft,
          bandwidthReduction: newBwReduction,
          currentBandwidth:   newCurrentBw,
        }
      }),
    }))
  },

  /**
   * Record a critical hit on a ship. Caller is responsible for computing effective
   * severity (including stacking) before calling this action.
   * Handles M-Drive thrustPenalty. Does not roll hull extra damage — caller handles that.
   * // MgT2e CRB p.169–170
   * @param {string} shipId
   * @param {{ system: string, severity: number }} crit  severity must be effective (post-stacking)
   * @param {{ _skipHistory?: boolean }} [opts]
   */
  addCriticalHit: (shipId, { system, severity }, { _skipHistory = false } = {}) => {
    const ship = get().ships.find((s) => s.id === shipId)
    if (!ship) return
    if (!_skipHistory) get().pushHistory()

    // Upsert: update existing entry for this system or append new one
    const existingIdx = ship.criticalHits.findIndex((c) => c.system === system)
    const updatedCrits = existingIdx >= 0
      ? ship.criticalHits.map((c, i) => i === existingIdx ? { ...c, severity } : c)
      : [...ship.criticalHits, { system, severity, repairRoundsApplied: 0 }]

    const mDriveCrit = updatedCrits.find((c) => c.system === 'M-Drive')
    const thrustPenalty = computeThrustPenalty(mDriveCrit, ship.profile.thrust)

    set((s) => ({
      ships: s.ships.map((sh) =>
        sh.id === shipId ? { ...sh, criticalHits: updatedCrits, thrustPenalty } : sh
      ),
      log: [...s.log, makeLogEntry({
        round: s.round,
        phase: s.phase,
        type: 'damage',
        message: `${ship.profile.name}: Critical hit on ${system} (Severity ${severity}).`,
        shipId,
        details: { system, severity },
      })],
    }))
  },

  /**
   * Reduce a ship's armour rating. Called after an Armour critical hit.
   * // MgT2e CRB p.170 — Armour critical effects
   * @param {string} shipId
   * @param {number} amount  Points to subtract (result clamped to ≥ 0)
   * @param {{ _skipHistory?: boolean }} [opts]
   */
  reduceArmour: (shipId, amount, { _skipHistory = false } = {}) => {
    const ship = get().ships.find((s) => s.id === shipId)
    if (!ship) return
    if (!_skipHistory) get().pushHistory()
    const current = ship.profile.armor ?? 0
    const reduced = Math.max(0, current - amount)
    set((s) => ({
      ships: s.ships.map((sh) =>
        sh.id === shipId
          ? { ...sh, profile: { ...sh.profile, armor: reduced } }
          : sh
      ),
      log: [...s.log, makeLogEntry({
        round: s.round,
        phase: s.phase,
        type: 'system',
        message: `${ship.profile.name}: Armour reduced by −${amount} → ${reduced} (Critical).`,
        shipId,
      })],
    }))
  },

  // === MISSILES ===

  /**
   * Launch a missile salvo.
   * @param {string} launchedBy  Attacker ship ID
   * @param {string} target      Target ship ID
   * @param {number} count       Number of missiles in salvo
   * @param {{ q: number, r: number }} position  Launch position (attacker hex)
   * @param {{ q: number, r: number }} vector    Initial vector (inherits attacker vector)
   * @param {'Standard'|'Smart'|'Nuclear'|'Ortillery'} type
   */
  launchMissile: wh((launchedBy, target, count, position, vector, type = 'Standard', hasSmartGuidance = true) => {
    const state = get()
    const attacker = state.ships.find((s) => s.id === launchedBy)
    const missile = {
      id: uuidv7(),
      launchedBy,
      target,
      count,
      position: { ...position },
      vector: { ...vector },
      thrustRemaining: 10,
      type,
      hasSmartGuidance,  // false when fired at Adjacent range (CRB p.162)
      ewAppliedThisRound: false,
      // Basic-mode tracking: missile advances via range bands, independent of ship positions.
      ...(state.combatMode === 'basic' ? {
        basicRangeBand: state.rangeBands[pairKey(launchedBy, target)] ?? 'Very Long',
        basicThrustAccumulated: 0,
      } : {}),
    }
    set((s) => ({
      missiles: [...s.missiles, missile],
      ships: s.ships.map((sh) =>
        sh.id === launchedBy ? {
          ...sh,
          turretsNeedingReload: (sh.turretsNeedingReload ?? 0) + 1,
          missileAmmoTotal: Math.max(0, (sh.missileAmmoTotal ?? countMissileAmmoCapacity(sh.profile)) - count),
        } : sh
      ),
      log: [...s.log, makeLogEntry({
        round: s.round,
        phase: s.phase,
        type: 'attack',
        message: `${attacker?.profile.name ?? '?'} launches ${count} missile(s) (${type}).`,
        shipId: launchedBy,
        details: missile,
      })],
    }))
  }),

  /** Remove a missile salvo by id. */
  removeMissile: (missileId) => {
    set((s) => ({ missiles: s.missiles.filter((m) => m.id !== missileId) }))
  },

  /**
   * Deduct missile ammo without launching (used when all missiles intercepted before launch).
   * // MgT2e CRB p.161 — attacker commits ammo when declaring the attack
   * @param {string} shipId
   * @param {number} count
   */
  spendMissileAmmo: (shipId, count) => {
    set((s) => ({
      ships: s.ships.map((sh) =>
        sh.id === shipId
          ? { ...sh, missileAmmoTotal: Math.max(0, (sh.missileAmmoTotal ?? countMissileAmmoCapacity(sh.profile)) - count) }
          : sh
      ),
    }))
  },

  /**
   * Reduce a missile salvo's count via Point Defence during the Attack phase.
   * Removes the salvo entry entirely when count reaches 0.
   * // MgT2e CRB p.161 — Point Defence (attack phase)
   * @param {string} missileId
   * @param {number} removed  Missiles destroyed (Effect of PD roll; 0 = miss)
   */
  interceptMissileSalvo: wh(
    (missileId) => !!get().missiles.find((m) => m.id === missileId),
    (missileId, removed) => {
      const { missiles, ships } = get()
      const missile  = missiles.find((m) => m.id === missileId)
      const launcher = ships.find((s) => s.id === missile.launchedBy)
      const newCount = Math.max(0, missile.count - removed)
      const msg = newCount === 0
        ? `${launcher?.profile.name ?? '?'} missile salvo (${missile.type}) fully destroyed by Point Defence.`
        : `${launcher?.profile.name ?? '?'} missile salvo reduced: ${missile.count} → ${newCount} (${removed} destroyed by PD).`
      set((s) => ({
        missiles: newCount === 0
          ? s.missiles.filter((m) => m.id !== missileId)
          : s.missiles.map((m) => m.id !== missileId ? m : { ...m, count: newCount }),
        log: [...s.log, makeLogEntry({ round: s.round, phase: s.phase, type: 'attack', message: msg })],
      }))
    },
  ),

  // === PHASE / ROUND PROGRESSION ===

  /** Advance to the next phase in sequence. Drives all transitions via PHASE_ORDER. */
  advancePhase: wh(() => {
    const { phase, combatMode } = get()
    const idx = PHASE_ORDER.indexOf(phase)
    if (idx === -1 || idx === PHASE_ORDER.length - 1) {
      set((s) => buildNextRoundState(s))
      return
    }
    let nextPhase = PHASE_ORDER[idx + 1]
    // Basic mode has no hex map — skip only the movement phase (vector resolution).
    // Acceleration (manoeuvre) still happens: pilots allocate thrust to range band changes.
    // CRB §5: initiative → acceleration → attack → actions → end.
    if (combatMode === 'basic') {
      while (nextPhase === 'movement') {
        const ni = PHASE_ORDER.indexOf(nextPhase)
        nextPhase = PHASE_ORDER[ni + 1]
      }
    }
    set((s) => ({
      phase: nextPhase,
      currentActorIndex: 0,
      ships: s.ships.map((sh) => ({
        ...sh,
        hasActedThisPhase: false,
        ...(nextPhase === 'attack'   ? { firedTurrets: [] }     : {}),
        ...(nextPhase === 'actions' ? { usedCrewMembers: [] }  : {}),
      })),
      log: [...s.log, makeLogEntry({
        round: s.round,
        phase: nextPhase,
        type: 'system',
        message: `Phase start: ${nextPhase.toUpperCase()}.`,
      })],
    }))
    if (nextPhase === 'movement') {
      get().resolveMovement()
    }
  }),

  /** Mark the current actor as having acted; advance the actor index, skipping destroyed ships. */
  advanceActor: wh(() => {
    const { initiativeOrder, currentActorIndex, ships, phase } = get()
    // Vectorial Acceleration iterates lowest-initiative-first (TC p.174); basic Manoeuvre
    // Step uses normal order (CRB p.164). HUD/ContextMenu/PhaseTracker mirror this logic.
    const { combatMode } = get()
    const order = (phase === 'acceleration' && combatMode === 'vectorial')
      ? [...initiativeOrder].reverse()
      : initiativeOrder
    const shipId = order[currentActorIndex]
    const currentShip = ships.find((s) => s.id === shipId)
    if (shipId && !currentShip?.inDogfight) {
      get().updateShip(shipId, { hasActedThisPhase: true })
    }
    // Skip over destroyed ships and ships mid-dogfight so their turn is never surfaced
    let next = currentActorIndex + 1
    while (next < order.length) {
      const nextShip = ships.find((s) => s.id === order[next])
      if (!nextShip?.isDestroyed && !nextShip?.inDogfight) break
      next++
    }
    set({ currentActorIndex: next })
  }),

  /** Reset all round-scoped state and increment round counter. */
  startNextRound: wh(() => {
    set((s) => buildNextRoundState(s))
  }),

  // === CREW ACTION EFFECTS ===

  /**
   * Spend thrust as a Reaction (Evasive Action) during the Attack phase.
   * Each point grants −Pilot DM to one incoming attack. Accumulates per round;
   * resets to 0 at start of each new round via buildNextRoundState.
   * // MgT2e CRB p.171 — Evasive Action (Reaction)
   * @param {string} shipId
   * @param {number} amount  Thrust points to spend (clamped to remaining available)
   */
  spendReactionThrust: wh(
    (shipId) => !!get().ships.find((s) => s.id === shipId),
    (shipId, amount) => {
      const ship = get().ships.find((s) => s.id === shipId)
      const spent = ship.evasiveThrust ?? 0
      const basePow  = ship.basePower ?? ship.profile.maxPower ?? 100
      const ionCap   = computeIonThrustEffect(ship.profile.thrust, ship.currentPower ?? basePow, basePow)
      const maxReaction = Math.max(0,
        ionCap + (ship.thrustBonusThisRound ?? 0)
        - ship.thrustUsedThisRound
        - (ship.thrustPenalty ?? 0)
        - spent
      )
      const clamped = Math.max(0, Math.min(amount, maxReaction))
      if (clamped === 0) return
      const pilotSkill = getEffectiveSkill(ship.profile.crew, ship.crewAssignments, 'pilot')
      set((s) => ({
        ships: s.ships.map((sh) =>
          sh.id === shipId ? { ...sh, evasiveThrust: spent + clamped } : sh
        ),
        log: [...s.log, makeLogEntry({
          round: s.round,
          phase: s.phase,
          type: 'action',
          message: `${ship.profile.name} Evasive Action: ${clamped} thrust — DM −${pilotSkill * clamped} to this attack (CRB p.171).`,
          shipId,
        })],
      }))
    },
  ),

  // === BASIC MODE RANGE BANDS ===

  /**
   * Directly set the range band between two ships. GM override — no thrust cost.
   * Basic mode only; used for initial setup and corrections.
   * @param {string} id1
   * @param {string} id2
   * @param {string} band  Range band label from RANGE_BAND_ORDER
   */
  setRangeBand: wh((id1, id2, band) => {
    const key = pairKey(id1, id2)
    set((s) => ({
      rangeBands: { ...s.rangeBands, [key]: band },
      basicBandPool: { ...s.basicBandPool, [key]: 0 },  // GM override resets accumulated thrust
      log: [...s.log, makeLogEntry({
        round: s.round, phase: s.phase, type: 'system',
        message: `Range set: ${s.ships.find(sh=>sh.id===id1)?.profile.name} vs ${s.ships.find(sh=>sh.id===id2)?.profile.name} → ${band}.`,
      })],
    }))
  }),

  /**
   * Apply basic-mode manoeuvre: contribute thrust toward a range band change.
   * Thrust accumulates across rounds and across ships (CRB p.166 — "a ship can spend Thrust
   * over multiple rounds"). When accumulated thrust meets the Ship Movement cost for the
   * current band the band advances; excess carries to the next step.
   * // MgT2e CRB p.166 — Ship Movement table
   * @param {string} movingShipId
   * @param {string} targetShipId
   * @param {'approach'|'flee'} direction
   * @param {number} movingThrust  Thrust this ship commits this action
   */
  applyBasicMovement: wh((movingShipId, targetShipId, direction, movingThrust) => {
    const { ships, rangeBands, basicBandPool } = get()
    const moving = ships.find((s) => s.id === movingShipId)
    const target = ships.find((s) => s.id === targetShipId)
    if (!moving || !target) return
    const key = pairKey(movingShipId, targetShipId)
    const currentBand = rangeBands[key] ?? 'Very Long'
    const currentIdx  = RANGE_BAND_ORDER.indexOf(currentBand)
    const cost        = RANGE_BAND_MOVE_COST[currentBand] ?? 1
    // Positive pool = net approach; negative = net flee.
    const oldPool  = basicBandPool[key] ?? 0
    const delta    = direction === 'approach' ? movingThrust : -movingThrust
    const newPool  = oldPool + delta

    let newBand   = currentBand
    let finalPool = newPool
    let bandChanged = false

    if (newPool >= cost && currentIdx > 0) {
      newBand = RANGE_BAND_ORDER[currentIdx - 1]
      finalPool = newPool - cost   // carry excess to next step
      bandChanged = true
    } else if (newPool <= -cost && currentIdx < RANGE_BAND_ORDER.length - 1) {
      newBand = RANGE_BAND_ORDER[currentIdx + 1]
      finalPool = newPool + cost
      bandChanged = true
    }

    const logMsg = bandChanged
      ? `${moving.profile.name} ${direction === 'approach' ? 'approaches' : 'flees from'} ${target.profile.name}: ${currentBand} → ${newBand}.`
      : `${moving.profile.name} allocates ${movingThrust} thrust ${direction === 'approach' ? 'toward' : 'away from'} ${target.profile.name} (${Math.abs(finalPool)}/${cost} accumulated).`

    set((s) => ({
      rangeBands: { ...s.rangeBands, [key]: newBand },
      basicBandPool: { ...s.basicBandPool, [key]: finalPool },
      ships: s.ships.map((sh) =>
        sh.id === movingShipId ? { ...sh, thrustUsedThisRound: sh.thrustUsedThisRound + movingThrust } : sh
      ),
      log: [...s.log, makeLogEntry({
        round: s.round, phase: s.phase, type: 'movement', message: logMsg,
      })],
    }))
  }),

  /**
   * Apply a sensor lock from one ship to another.
   * Grants a flat DM+2 to all attacks against the target (CRB p.172).
   * // MgT2e CRB p.172 — Sensor Lock
   * @param {string} attackerId
   * @param {string} targetId
   */
  applySensorLock: wh(
    (attackerId, targetId) => !!(get().ships.find((s) => s.id === attackerId) && get().ships.find((s) => s.id === targetId)),
    (attackerId, targetId) => {
      const attacker = get().ships.find((s) => s.id === attackerId)
      const target = get().ships.find((s) => s.id === targetId)
      set((s) => ({
        ships: s.ships.map((sh) => {
          if (sh.id === attackerId) return { ...sh, sensorLockOn: targetId, sensorLockDM: 2 }
          if (sh.id === targetId)   return { ...sh, sensorLockedBy: attackerId }
          return sh
        }),
        log: [...s.log, makeLogEntry({
          round: s.round,
          phase: s.phase,
          type: 'action',
          message: `${attacker.profile.name}: Sensor Lock on ${target.profile.name} (DM +2 to attacks).`,
          shipId: attackerId,
        })],
    }))
    },
  ),

  /**
   * Clear sensor lock via Electronic Warfare success.
   * Removes lock both from attacker and the locked ship.
   * // MgT2e CRB p.167 — Electronic Warfare
   * @param {string} shipId  The defender (ship being locked)
   */
  clearSensorLock: wh(
    (shipId) => { const s = get().ships.find((sh) => sh.id === shipId); return !!s && !!s.sensorLockedBy },
    (shipId) => {
      const ship = get().ships.find((s) => s.id === shipId)
      const attackerId = ship.sensorLockedBy
      set((s) => ({
        ships: s.ships.map((sh) => {
          if (sh.id === attackerId) return { ...sh, sensorLockOn: null, sensorLockDM: 0 }
          if (sh.id === shipId)     return { ...sh, sensorLockedBy: null }
          return sh
        }),
        log: [...s.log, makeLogEntry({
          round: s.round,
          phase: s.phase,
          type: 'action',
          message: `${ship.profile.name}: Electronic Warfare — sensor lock removed.`,
          shipId,
        })],
      }))
    },
  ),

  /**
   * Remove a critical hit from a ship (Engineer repair).
   * Recomputes thrustPenalty from remaining M-Drive crit, if any.
   * // MgT2e CRB p.167 — Repair System
   * @param {string} shipId
   * @param {number} [critIndex=0]  Index into criticalHits array to repair
   */
  repairCritical: wh(
    (shipId) => { const s = get().ships.find((sh) => sh.id === shipId); return !!s && s.criticalHits.length > 0 },
    (shipId, critIndex = 0) => {
      const ship = get().ships.find((s) => s.id === shipId)
      const idx            = Math.min(critIndex, ship.criticalHits.length - 1)
      const removed        = ship.criticalHits[idx]
      const remainingCrits = ship.criticalHits.filter((_, i) => i !== idx)
      const mDriveCrit     = remainingCrits.find((c) => c.system === 'M-Drive')
      const thrustPenalty  = computeThrustPenalty(mDriveCrit, ship.profile.thrust)
      // Armour crit: restore profile.armor to the original value captured at addShip. // CRB p.167
      const restoredArmor  = removed.system === 'Armour' ? (ship.baseArmor ?? ship.profile.armor ?? 0) : null
      set((s) => ({
        ships: s.ships.map((sh) => {
          if (sh.id !== shipId) return sh
          const base = { ...sh, criticalHits: remainingCrits, thrustPenalty }
          return restoredArmor !== null
            ? { ...base, profile: { ...sh.profile, armor: restoredArmor } }
            : base
        }),
        log: [...s.log, makeLogEntry({
          round: s.round,
          phase: s.phase,
          type: 'action',
          message: `${ship.profile.name}: ${removed.system} repaired (Sev. ${removed.severity} removed).`,
          shipId,
        })],
      }))
    },
  ),

  /**
   * Apply an initiative bonus for next round (Captain: Improve Initiative).
   * Bonus is accumulated and consumed in rollAllInitiative.
   * // MgT2e CRB p.166
   * @param {string} shipId
   * @param {number} bonus  Effect of the roll (>= 0)
   */
  applyInitiativeBonus: wh(
    (shipId) => !!get().ships.find((s) => s.id === shipId),
    (shipId, bonus) => {
      const ship = get().ships.find((s) => s.id === shipId)
      const applied = Math.max(0, bonus)
      set((s) => ({
        ships: s.ships.map((sh) => {
          if (sh.id !== shipId) return sh
          // Bonus activates at start of next round, lasts exactly 1 round. // CRB p.166
          return {
            ...sh,
            initiativeBonusNextRound: (sh.initiativeBonusNextRound ?? 0) + applied,
          }
        }),
        log: [...s.log, makeLogEntry({
          round: s.round,
          phase: s.phase,
          type: 'action',
          message: `${ship.profile.name}: Initiative improved by +${applied} (takes effect next round, lasts 1 round).`,
          shipId,
        })],
      }))
    },
  ),

  /**
   * Overload M-Drive: grant temporary thrust bonus for this round only.
   * Bonus resets at start of next round.
   * // MgT2e CRB p.167
   * @param {string} shipId
   * @param {number} bonus  Effect of the roll (>= 0)
   */
  overloadDrive: wh(
    (shipId) => !!get().ships.find((s) => s.id === shipId),
    (shipId, bonus) => {
      const ship = get().ships.find((s) => s.id === shipId)
      const applied = Math.max(0, bonus)
      set((s) => ({
        ships: s.ships.map((sh) =>
          sh.id === shipId ? { ...sh, thrustBonusThisRound: (sh.thrustBonusThisRound ?? 0) + applied } : sh
        ),
        log: [...s.log, makeLogEntry({
          round: s.round,
          phase: s.phase,
          type: 'action',
          message: `${ship.profile.name}: M-Drive overloaded — +${applied} Thrust next round.`,
          shipId,
        })],
      }))
    },
  ),

  /**
   * Reload one missile turret (Gunner: Reload Turret action).
   * Decrements turretsNeedingReload; no-op if none need reloading.
   * // MgT2e CRB p.167
   * @param {string} shipId
   */
  reloadTurret: wh(
    (shipId) => { const s = get().ships.find((sh) => sh.id === shipId); return !!s && (s.turretsNeedingReload ?? 0) > 0 },
    (shipId) => {
      const ship = get().ships.find((s) => s.id === shipId)
      set((s) => ({
        ships: s.ships.map((sh) =>
          sh.id === shipId ? { ...sh, turretsNeedingReload: Math.max(0, (sh.turretsNeedingReload ?? 0) - 1) } : sh
        ),
        log: [...s.log, makeLogEntry({
          round: s.round,
          phase: s.phase,
          type: 'action',
          message: `${ship.profile.name}: missile turret reloaded.`,
          shipId,
        })],
      }))
    },
  ),

  // === DOGFIGHT ===

  /**
   * Create a dogfight group and mark all participating ships.
   * @param {string[]} shipIds  — must contain ≥ 2 IDs
   */
  startDogfight: wh(
    (shipIds) => {
      if (shipIds.length < 2) return false
      const { ships } = get()
      return !ships.some((s) => shipIds.includes(s.id) && s.inBoarding !== null)
    },
    (shipIds) => {
    const { ships, round, phase } = get()
    const group = {
      id: uuidv7(),
      shipIds: [...shipIds],
      microRound: 1,
      roundWinnerId: null,
      roundWinnerMargin: 0,
      active: true,
    }
    const names = shipIds.map((id) => ships.find((s) => s.id === id)?.profile.name ?? id).join(' ↔ ')
    set((s) => ({
      dogfights: [...s.dogfights, group],
      ships: s.ships.map((sh) =>
        shipIds.includes(sh.id) ? { ...sh, inDogfight: group.id } : sh
      ),
      log: [...s.log, makeLogEntry({
        round, phase, type: 'action',
        message: `⚔ Dogfight engaged: ${names}`,
      })],
    }))
  }),

  /**
   * Record Pilot check results for a micro-round and advance the counter.
   * Ends the dogfight group when micro-round 6 completes.
   * @param {string} groupId
   * @param {{ shipId: string, total: number }[]} checkResults
   */
  advanceDogfightMicroRound: wh(
    (groupId) => !!get().dogfights.find((g) => g.id === groupId && g.active),
    (groupId, checkResults) => {
      const { round, phase, ships } = get()
      const group = get().dogfights.find((g) => g.id === groupId)
      const { winnerId, margin, tied } = resolveDogfightChecks(checkResults)
      const nextMicroRound = group.microRound + 1
      const winnerName = tied ? null : (ships.find((s) => s.id === winnerId)?.profile.name ?? winnerId)

      set((s) => ({
        dogfights: s.dogfights.map((g) =>
          g.id !== groupId ? g : {
            ...g,
            microRound: nextMicroRound,
            roundWinnerId: winnerId,
            roundWinnerMargin: margin,
          }
        ),
        log: [...s.log, makeLogEntry({
          round, phase, type: 'action',
          message: tied
            ? `⚔ Dogfight micro-round ${group.microRound}: tie — no positional advantage.`
            : `⚔ Dogfight micro-round ${group.microRound}: ${winnerName} wins (+${margin}).`,
        })],
      }))

      if (nextMicroRound > 6) get().endDogfight(groupId)
    },
  ),

  /**
   * Remove a ship from its dogfight group. Ends the group if fewer than 2 ships remain.
   * @param {string} shipId
   * @param {string} groupId
   */
  escapeDogfight: wh(
    (shipId, groupId) => {
      const g = get().dogfights.find((g) => g.id === groupId)
      return !!g && g.active && g.shipIds.includes(shipId)
    },
    (shipId, groupId) => {
      const { round, phase, ships } = get()
      const ship = ships.find((s) => s.id === shipId)
      const group = get().dogfights.find((g) => g.id === groupId)
      const remaining = group.shipIds.filter((id) => id !== shipId)

      set((s) => ({
        dogfights: s.dogfights.map((g) =>
          g.id !== groupId ? g : { ...g, shipIds: remaining }
        ),
        ships: s.ships.map((sh) =>
          sh.id === shipId ? { ...sh, inDogfight: null } : sh
        ),
        log: [...s.log, makeLogEntry({
          round, phase, type: 'action',
          message: `⚔ ${ship?.profile.name ?? shipId} escapes dogfight.`,
          shipId,
        })],
      }))

      if (remaining.length < 2) get().endDogfight(groupId)
    },
  ),

  /**
   * End a dogfight group: mark inactive, clear inDogfight on all ships.
   * @param {string} groupId
   */
  endDogfight: wh(
    (groupId) => !!get().dogfights.find((g) => g.id === groupId),
    (groupId) => {
      const { round, phase } = get()
      set((s) => ({
        dogfights: s.dogfights.map((g) =>
          g.id !== groupId ? g : { ...g, active: false }
        ),
        ships: s.ships.map((sh) =>
          sh.inDogfight === groupId ? { ...sh, inDogfight: null } : sh
        ),
        log: [...s.log, makeLogEntry({
          round, phase, type: 'system',
          message: `⚔ Dogfight ended.`,
        })],
      }))
    }
  ),

  // === BOARDING ===
  // HG 2022 pp.125–135

  /**
   * Initiate a boarding action between two ships.
   * Preconditions: distance ≤ 1, attacker thrust ≥ defender thrust (or defender M-Drive disabled).
   * @param {string} attackerId
   * @param {string} defenderId
   */
  startBoarding: wh(
    (attackerId, defenderId) => {
      const { ships } = get()
      const attacker = ships.find((s) => s.id === attackerId)
      const defender = ships.find((s) => s.id === defenderId)
      return !!(
        attacker && defender &&
        attacker.faction !== defender.faction &&
        !attacker.inBoarding && !defender.inBoarding
      )
    },
    (attackerId, defenderId) => {
      const { round, phase } = get()
      const id = uuidv7()
      const boarding = {
        id,
        attackerId,
        defenderId,
        phase: 'contact',
        contactMethod: null,
        defenderRotating: false,
        rotatingRoundsLeft: 0,
        forcedLinkage: false,
        hullResilience: null,
        hullDamageSoFar: 0,
        objectives: { bridge: false, engineering: false, turrets: false },
        outcome: null,
        log: [],
      }
      set((s) => ({
        boardings: [...s.boardings, boarding],
        ships: s.ships.map((sh) =>
          sh.id === attackerId || sh.id === defenderId
            ? { ...sh, inBoarding: id }
            : sh
        ),
        log: [...s.log, makeLogEntry({
          round, phase, type: 'system',
          message: `⚔ Boarding initiated — ${s.ships.find((sh) => sh.id === attackerId)?.profile.name ?? attackerId} → ${s.ships.find((sh) => sh.id === defenderId)?.profile.name ?? defenderId}.`,
        })],
      }))
    },
  ),

  /**
   * Advance a boarding to the next phase.
   * contact → conflict → security
   * @param {string} boardingId
   */
  advanceBoardingPhase: wh(
    (boardingId) => !!get().boardings.find((b) => b.id === boardingId && b.outcome === null),
    (boardingId) => {
      const { round, phase } = get()
      const NEXT = { contact: 'conflict', conflict: 'security' }
      set((s) => ({
        boardings: s.boardings.map((b) =>
          b.id !== boardingId ? b : { ...b, phase: NEXT[b.phase] ?? b.phase }
        ),
        log: [...s.log, makeLogEntry({
          round, phase, type: 'system',
          message: `⚔ Boarding phase advanced — ${NEXT[s.boardings.find((b) => b.id === boardingId)?.phase] ?? '?'}.`,
        })],
      }))
    },
  ),

  /**
   * Set the contact entry method for phase 2.
   * @param {string} boardingId
   * @param {string} method  key from ENTRY_METHODS in boarding.js
   */
  setContactMethod: wh(
    (boardingId) => !!get().boardings.find((b) => b.id === boardingId && b.phase === 'contact'),
    (boardingId, method) => {
      set((s) => ({
        boardings: s.boardings.map((b) =>
          b.id !== boardingId ? b : { ...b, contactMethod: method }
        ),
      }))
    },
  ),

  /**
   * Activate defender tumbling after a successful Routine (6+) Pilot check.
   * // HG 2022 p.127 — Tumbling: Pilot (DEX) Routine (6+), lasts D3 rounds
   * @param {string} boardingId
   * @param {number} durationRounds  D3 roll result (1–3)
   */
  applyDefenderRotation: wh(
    (boardingId) => !!get().boardings.find((b) => b.id === boardingId && b.phase === 'contact' && !b.defenderRotating),
    (boardingId, durationRounds) => {
      set((s) => ({
        boardings: s.boardings.map((b) =>
          b.id !== boardingId ? b : { ...b, defenderRotating: true, rotatingRoundsLeft: Math.max(1, durationRounds) }
        ),
      }))
    },
  ),

  /**
   * Deactivate defender tumbling (manual GM override or expired).
   * @param {string} boardingId
   */
  clearDefenderRotation: wh(
    (boardingId) => !!get().boardings.find((b) => b.id === boardingId && b.defenderRotating),
    (boardingId) => {
      set((s) => ({
        boardings: s.boardings.map((b) =>
          b.id !== boardingId ? b : { ...b, defenderRotating: false, rotatingRoundsLeft: 0 }
        ),
      }))
    },
  ),

  /**
   * Toggle forced linkage apparatus (DM +2 to contact checks, locks defender movement).
   * @param {string} boardingId
   */
  toggleForcedLinkage: wh(
    (boardingId) => !!get().boardings.find((b) => b.id === boardingId && b.phase === 'contact'),
    (boardingId) => {
      set((s) => ({
        boardings: s.boardings.map((b) =>
          b.id !== boardingId ? b : { ...b, forcedLinkage: !b.forcedLinkage }
        ),
      }))
    },
  ),

  /**
   * Mark a tactical objective as conquered or not.
   * @param {string} boardingId
   * @param {'bridge'|'engineering'|'turrets'} objective
   * @param {boolean} conquered
   */
  setObjective: wh(
    (boardingId) => !!get().boardings.find((b) => b.id === boardingId && b.phase === 'conflict'),
    (boardingId, objective, conquered) => {
      const { round, phase } = get()
      set((s) => ({
        boardings: s.boardings.map((b) =>
          b.id !== boardingId ? b : { ...b, objectives: { ...b.objectives, [objective]: conquered } }
        ),
        log: [...s.log, makeLogEntry({
          round, phase, type: 'system',
          message: `⚔ Objective ${objective} — ${conquered ? 'CAPTURED' : 'lost'}.`,
        })],
      }))
    },
  ),

  /**
   * Resolve a boarding action: set outcome, clear inBoarding on both ships.
   * If outcome is 'attacker_wins', caller should call updateShipFaction separately if desired.
   * @param {string} boardingId
   * @param {'attacker_wins'|'defender_wins'|'ship_destroyed'} outcome
   */
  resolveBoarding: wh(
    (boardingId) => !!get().boardings.find((b) => b.id === boardingId && b.outcome === null),
    (boardingId, outcome) => {
      const { round, phase } = get()
      set((s) => {
        const boarding = s.boardings.find((b) => b.id === boardingId)
        const label = outcome === 'attacker_wins' ? 'ATTACKER WINS' : outcome === 'defender_wins' ? 'DEFENDER WINS' : 'SHIP DESTROYED'
        return {
          boardings: s.boardings.map((b) =>
            b.id !== boardingId ? b : { ...b, outcome, phase: 'security' }
          ),
          ships: s.ships.map((sh) => {
            if (sh.inBoarding !== boardingId) return sh
            const destroyed = outcome === 'ship_destroyed' && sh.id === boarding?.defenderId
            return {
              ...sh,
              inBoarding: null,
              ...(destroyed ? { isDestroyed: true, hullCurrent: 0 } : {}),
            }
          }),
          log: [...s.log, makeLogEntry({
            round, phase, type: 'system',
            message: `⚔ Boarding resolved — ${label}. ${boarding ? `(${s.ships.find((sh) => sh.id === boarding.attackerId)?.profile.name ?? ''} → ${s.ships.find((sh) => sh.id === boarding.defenderId)?.profile.name ?? ''})` : ''}`,
          })],
        }
      })
    },
  ),

  /**
   * Accumulate hull-cut damage for a boarding in progress.
   * Routes through wh so the change enters the undo stack.
   * @param {string} boardingId
   * @param {number} dmg  Amount to add to hullDamageSoFar
   */
  applyBoardingCutDamage: wh(
    (boardingId) => !!get().boardings.find((b) => b.id === boardingId && b.outcome === null),
    (boardingId, dmg) => {
      set((s) => ({
        boardings: s.boardings.map((b) =>
          b.id !== boardingId ? b : { ...b, hullDamageSoFar: (b.hullDamageSoFar ?? 0) + dmg }
        ),
      }))
    },
  ),

  /**
   * Change a ship's faction (used after boarding outcome 'attacker_wins').
   * @param {string} shipId
   * @param {'players'|'npc'|'neutral'} newFaction
   */
  updateShipFaction: wh(
    (shipId) => !!get().ships.find((s) => s.id === shipId),
    (shipId, newFaction) => {
      const { round, phase } = get()
      set((s) => ({
        ships: s.ships.map((sh) =>
          sh.id !== shipId ? sh : { ...sh, faction: newFaction }
        ),
        log: [...s.log, makeLogEntry({
          round, phase, type: 'system',
          message: `⚔ ${s.ships.find((sh) => sh.id === shipId)?.profile.name ?? shipId} faction changed to ${newFaction}.`,
        })],
      }))
    },
  ),

  // === RESET ===

  /**
   * Reset all battle state for a new session.
   * Preserves no data — call before navigating to the battle screen.
   */
  /**
   * Reset to a fresh battle, optionally specifying combat mode.
   * @param {'vectorial'|'basic'} [mode='vectorial']
   */
  resetBattle: (mode = 'vectorial') => set({
    id: uuidv7(),
    name: 'New Battle',
    round: 1,
    combatMode: mode,
    phase: 'setup',
    initiativeOrder: [],
    currentActorIndex: 0,
    ships: [],
    missiles: [],
    dogfights: [],
    boardings: [],
    log: [],
    mapSettings: { scale: 1 },
    rangeBands: {},
    basicBandPool: {},
    undoStack: [],
    redoStack: [],
    passingEncounters: [],
    pendingMissileImpacts: [],
  }),

  // === IMPORT / EXPORT ===

  exportBattleState: () => {
    const { id, name, round, combatMode, phase, initiativeOrder, currentActorIndex, ships, missiles, dogfights, boardings, log, mapSettings, rangeBands, basicBandPool, obstaclesEnabled, obstacles, pendingObstacleCollisions } = get()
    exportBattle({ id, name, round, combatMode, phase, initiativeOrder, currentActorIndex, ships, missiles, dogfights, boardings, log, mapSettings, rangeBands, basicBandPool, obstaclesEnabled, obstacles, pendingObstacleCollisions, savedAt: new Date().toISOString() })
  },

  /**
   * Load a battle state from file, replacing current state.
   * @param {File} file
   */
  importBattleState: async (file) => {
    const battle = await importBattle(file)
    set({
      id: battle.id ?? uuidv7(),
      name: battle.name ?? 'Imported Battle',
      round: battle.round ?? 1,
      combatMode: battle.combatMode ?? 'vectorial',
      phase: battle.phase ?? 'setup',
      initiativeOrder: battle.initiativeOrder ?? [],
      currentActorIndex: battle.currentActorIndex ?? 0,
      ships: battle.ships ?? [],
      missiles: battle.missiles ?? [],
      dogfights: battle.dogfights ?? [],
      boardings: battle.boardings ?? [],
      log: battle.log ?? [],
      mapSettings: battle.mapSettings ?? { scale: 1 },
      rangeBands: battle.rangeBands ?? {},
      basicBandPool: battle.basicBandPool ?? {},
      obstaclesEnabled: battle.obstaclesEnabled ?? false,
      obstacles: battle.obstacles ?? [],
      pendingObstacleCollisions: battle.pendingObstacleCollisions ?? [],
      undoStack: [],
      redoStack: [],
    })
  },

  // === LOG ===

  /**
   * Add a free-form log entry from the GM.
   * @param {string} message
   */
  addLogEntry: (message) => {
    set((s) => ({
      log: [...s.log, makeLogEntry({
        round: s.round,
        phase: s.phase,
        type: 'info',
        message,
      })],
    }))
  },

  clearLog: () => set({ log: [] }),
  }
})

export { useBattleStore }
