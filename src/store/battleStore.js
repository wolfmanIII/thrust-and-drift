/**
 * Battle state store — ships, missiles, round flow, log.
 * Coordinates all in-battle state; delegates calculations to utils/combat.js.
 * // MgT2e CRB p.160–168, Traveller Companion p.169–186
 */

import { create } from 'zustand'
import { v7 as uuidv7 } from 'uuid'
import { exportBattle, importBattle } from '../utils/io.js'
import { applyThrust, applyMovement, rollInitiative, getThresholdCriticalCount, countMissileAmmoCapacity, countSandcasters } from '../utils/combat.js'
import { hexAdd, hexDistance, segmentMinDistance } from '../utils/hex.js'
import { getCriticalLocation, getCriticalEffect } from '../data/criticalHits.js'
import { roll2D6, rollDice } from '../utils/dice.js'
import { getCrewSkill, getEffectiveSkill, buildDefaultAssignments } from '../utils/crew.js'
import { resolveDogfightChecks } from '../utils/dogfight.js'
import { RANGE_BAND_ORDER } from '../data/rangeBands.js'
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
  return {
    round: s.round + 1,
    phase: 'initiative',
    currentActorIndex: 0,
    ships: s.ships.map((sh) => {
      const ionNext = Math.max(0, (sh.ionRoundsLeft ?? 0) - 1)
      return {
        ...sh,
        thrustUsedThisRound: 0,
        thrustBonusThisRound: 0,
        hasActedThisPhase: false,
        evasiveThrust: 0,
        firedTurrets: [],
        usedCrewMembers: [],
        ionRoundsLeft: ionNext,
        ionPenalty: ionNext > 0 ? (sh.ionPenalty ?? 0) : 0,
      }
    }),
    log: [...s.log, makeLogEntry({
      round: s.round + 1,
      phase: 'initiative',
      type: 'system',
      message: `Round ${s.round + 1} begins.`,
    })],
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
    const { ships, missiles, dogfights, boardings, rangeBands, round, phase, initiativeOrder, currentActorIndex } = get()
    const snapshot = {
      ships: structuredClone(ships),
      missiles: structuredClone(missiles),
      dogfights: structuredClone(dogfights),
      boardings: structuredClone(boardings),
      rangeBands: { ...rangeBands },
      round,
      phase,
      initiativeOrder: [...initiativeOrder],
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
    const { ships, missiles, dogfights, boardings, rangeBands, round, phase, initiativeOrder, currentActorIndex } = get()
    const redoSnapshot = {
      ships: structuredClone(ships),
      missiles: structuredClone(missiles),
      dogfights: structuredClone(dogfights),
      boardings: structuredClone(boardings),
      rangeBands: { ...rangeBands },
      round, phase,
      initiativeOrder: [...initiativeOrder],
      currentActorIndex,
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
    const { ships, missiles, dogfights, boardings, rangeBands, round, phase, initiativeOrder, currentActorIndex } = get()
    const undoSnapshot = {
      ships: structuredClone(ships),
      missiles: structuredClone(missiles),
      dogfights: structuredClone(dogfights),
      boardings: structuredClone(boardings),
      rangeBands: { ...rangeBands },
      round, phase,
      initiativeOrder: [...initiativeOrder],
      currentActorIndex,
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
      hullCurrent: profile.hull,
      isDestroyed: false,
      thrustUsedThisRound: 0,
      thrustBonusThisRound: 0,
      thrustPenalty: 0,
      criticalHits: [],
      initiative: 0,
      initiativeBonusNextRound: 0,
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
        return r ? { ...sh, initiative: r.initiative, initiativeBonusNextRound: 0 } : sh
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
            ? { ...sh, vector: newVector, thrustUsedThisRound: sh.thrustUsedThisRound + cost }
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
    const { ships, missiles, round, combatMode } = get()
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

    const movedShips = ships.map((sh) => ({
      ...sh,
      position: applyMovement(sh.position, sh.vector),
    }))
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

    set((s) => ({
      ships: movedShips,
      missiles: [
        ...survivingMissiles.filter((m) => m.thrustRemaining >= 0),
        ...impactedMissiles,  // kept alive for animation, removed below
      ],
      log: [...s.log, ...entries, ...impactLogEntries],
      passingEncounters: [],  // deferred below — must not appear before animation ends
    }))

    const animDuration = useUiStore.getState().movementAnimation?.duration ?? 2000
    if (newImpacts.length > 0 || encounters.length > 0) {
      setTimeout(() => {
        set((s) => ({
          missiles: s.missiles.filter((m) => !impactedIds.includes(m.id)),
          pendingMissileImpacts: [...s.pendingMissileImpacts, ...newImpacts],
          passingEncounters: encounters,
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
      pendingMissileImpacts: [...s.pendingMissileImpacts, { id: uuidv7(), ...impact }],
    }))
  },

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
        if (effect?.mechanic === 'hull_extra_damage') {
          const extra = rollDice(effect.value, 6)
          get().applyDamage(shipId, extra.total, `Critical Hull Sev.${effectiveSeverity} (threshold)`, true)
        }
      }
    }
  },

  /**
   * Apply ion disruption to a ship. Does not damage hull.
   * Reduces thrustAvailable by ionPower for ionRounds rounds.
   * Clears automatically via buildNextRoundState at round boundary.
   * // MgT2e HG p.30 — Ion weapons
   * @param {string} targetId
   * @param {number} ionPower   Thrust penalty (2D6 roll result)
   * @param {number} ionRounds  Duration in rounds (1, or D3 if effect ≥ 6)
   */
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

  applyIonDamage: (targetId, ionPower, ionRounds) => {
    set((s) => ({
      ships: s.ships.map((sh) => sh.id !== targetId ? sh : {
        ...sh,
        ionPenalty:    ionPower,
        ionRoundsLeft: ionRounds,
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
  launchMissile: wh((launchedBy, target, count, position, vector, type = 'Standard') => {
    const attacker = get().ships.find((s) => s.id === launchedBy)
    const missile = {
      id: uuidv7(),
      launchedBy,
      target,
      count,
      position: { ...position },
      vector: { ...vector },
      thrustRemaining: 10,
      type,
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
    if (shipId) {
      get().updateShip(shipId, { hasActedThisPhase: true })
    }
    // Skip over destroyed ships so their turn is never surfaced
    let next = currentActorIndex + 1
    while (next < order.length) {
      const nextShip = ships.find((s) => s.id === order[next])
      if (!nextShip?.isDestroyed) break
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
      const maxReaction = Math.max(0,
        ship.profile.thrust + (ship.thrustBonusThisRound ?? 0)
        - ship.thrustUsedThisRound
        - (ship.thrustPenalty ?? 0)
        - (ship.ionPenalty ?? 0)
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
    set((s) => ({
      rangeBands: { ...s.rangeBands, [pairKey(id1, id2)]: band },
      log: [...s.log, makeLogEntry({
        round: s.round, phase: s.phase, type: 'system',
        message: `Range set: ${s.ships.find(sh=>sh.id===id1)?.profile.name} vs ${s.ships.find(sh=>sh.id===id2)?.profile.name} → ${band}.`,
      })],
    }))
  }),

  /**
   * Apply basic-mode manoeuvre: spend thrust to change range band between two ships.
   * CRB p.161 — cost = 1 thrust per band change (flat, non-vectorial mode).
   * @param {string} movingShipId
   * @param {string} targetShipId
   * @param {'approach'|'flee'} direction
   * @param {number} movingThrust  Thrust this ship commits
   */
  applyBasicMovement: wh((movingShipId, targetShipId, direction, movingThrust) => {
    const { ships, rangeBands } = get()
    const moving = ships.find((s) => s.id === movingShipId)
    const target = ships.find((s) => s.id === targetShipId)
    if (!moving || !target) return
    const key = pairKey(movingShipId, targetShipId)
    const currentBand = rangeBands[key] ?? 'Very Long'
    const idx = RANGE_BAND_ORDER.indexOf(currentBand)
    const newIdx = direction === 'approach'
      ? Math.max(0, idx - 1)
      : Math.min(RANGE_BAND_ORDER.length - 1, idx + 1)
    const newBand = RANGE_BAND_ORDER[newIdx]
    set((s) => ({
      rangeBands: { ...s.rangeBands, [key]: newBand },
      ships: s.ships.map((sh) => {
        if (sh.id === movingShipId) return { ...sh, thrustUsedThisRound: sh.thrustUsedThisRound + movingThrust }
        return sh
      }),
      log: [...s.log, makeLogEntry({
        round: s.round, phase: s.phase, type: 'movement',
        message: `${moving.profile.name} ${direction === 'approach' ? 'approaches' : 'flees from'} ${target.profile.name}: ${currentBand} → ${newBand}.`,
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
   * Remove the first critical hit from a ship (Engineer repair).
   * Recomputes thrustPenalty from remaining M-Drive crit, if any.
   * // MgT2e CRB p.167 — Repair System
   * @param {string} shipId
   */
  repairCritical: wh(
    (shipId) => { const s = get().ships.find((sh) => sh.id === shipId); return !!s && s.criticalHits.length > 0 },
    (shipId) => {
      const ship = get().ships.find((s) => s.id === shipId)
      const removed       = ship.criticalHits[0]
      const remainingCrits = ship.criticalHits.slice(1)
      const mDriveCrit    = remainingCrits.find((c) => c.system === 'M-Drive')
      const thrustPenalty = computeThrustPenalty(mDriveCrit, ship.profile.thrust)
      set((s) => ({
        ships: s.ships.map((sh) =>
          sh.id === shipId ? { ...sh, criticalHits: remainingCrits, thrustPenalty } : sh
        ),
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
        ships: s.ships.map((sh) =>
          sh.id === shipId ? { ...sh, initiativeBonusNextRound: (sh.initiativeBonusNextRound ?? 0) + applied } : sh
        ),
        log: [...s.log, makeLogEntry({
          round: s.round,
          phase: s.phase,
          type: 'action',
          message: `${ship.profile.name}: Initiative improved by +${applied} next round.`,
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
          message: `${ship.profile.name}: M-Drive overloaded — +${applied} Thrust this round.`,
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
  endDogfight: (groupId) => {
    const { round, phase } = get()
    const group = get().dogfights.find((g) => g.id === groupId)
    if (!group) return
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
  },

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
      return !!(attacker && defender && attacker.faction !== defender.faction)
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
   * Toggle the defender's tumbling-rotation countermeasure (DM −1 to contact checks).
   * @param {string} boardingId
   */
  toggleDefenderRotation: wh(
    (boardingId) => !!get().boardings.find((b) => b.id === boardingId && b.phase === 'contact'),
    (boardingId) => {
      set((s) => ({
        boardings: s.boardings.map((b) =>
          b.id !== boardingId ? b : { ...b, defenderRotating: !b.defenderRotating }
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
          ships: s.ships.map((sh) =>
            sh.inBoarding === boardingId ? { ...sh, inBoarding: null } : sh
          ),
          log: [...s.log, makeLogEntry({
            round, phase, type: 'system',
            message: `⚔ Boarding resolved — ${label}. ${boarding ? `(${s.ships.find((sh) => sh.id === boarding.attackerId)?.profile.name ?? ''} → ${s.ships.find((sh) => sh.id === boarding.defenderId)?.profile.name ?? ''})` : ''}`,
          })],
        }
      })
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
    undoStack: [],
    redoStack: [],
    passingEncounters: [],
    pendingMissileImpacts: [],
  }),

  // === IMPORT / EXPORT ===

  exportBattleState: () => {
    const { id, name, round, combatMode, phase, initiativeOrder, currentActorIndex, ships, missiles, dogfights, boardings, log, mapSettings, rangeBands } = get()
    exportBattle({ id, name, round, combatMode, phase, initiativeOrder, currentActorIndex, ships, missiles, dogfights, boardings, log, mapSettings, rangeBands, savedAt: new Date().toISOString() })
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
