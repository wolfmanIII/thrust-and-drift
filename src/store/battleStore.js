/**
 * Battle state store — ships, missiles, round flow, log.
 * Coordinates all in-battle state; delegates calculations to utils/combat.js.
 * // MgT2e CRB p.160–168, Traveller Companion p.169–186
 */

import { create } from 'zustand'
import { v7 as uuidv7 } from 'uuid'
import { exportBattle, importBattle } from '../utils/io.js'
import { applyThrust, applyMovement, rollInitiative, getThresholdCriticalCount } from '../utils/combat.js'
import { getCriticalLocation, getCriticalEffect } from '../data/criticalHits.js'
import { roll2D6, rollDice } from '../utils/dice.js'

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

const useBattleStore = create((set, get) => ({
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
  /** @type {object[]} LogEntry array */
  log: [],

  mapSettings: { scale: 1 },

  // === SHIP MANAGEMENT ===

  /**
   * Add a ship instance to the battle at a given hex position.
   * @param {object} profile  ShipProfile snapshot
   * @param {{ q: number, r: number }} position
   * @param {'players'|'npc'|'neutral'} faction
   * @param {string} color  CSS hex color
   */
  addShip: (profile, position, faction, color) => {
    const instance = {
      id: uuidv7(),
      profileId: profile.id,
      profile: { ...profile },
      faction,
      color,
      position: { ...position },
      vector: { q: 0, r: 0 },
      hullCurrent: profile.hull,
      thrustUsedThisRound: 0,
      thrustBonusThisRound: 0,
      thrustPenalty: 0,
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
    set((s) => ({
      ships: [...s.ships, instance],
      log: [...s.log, makeLogEntry({
        round: s.round,
        phase: s.phase,
        type: 'system',
        message: `${profile.name} added to battle as ${faction}.`,
        shipId: instance.id,
      })],
    }))
  },

  /**
   * Remove a ship instance from the battle.
   * @param {string} shipId
   */
  removeShip: (shipId) => {
    const ship = get().ships.find((s) => s.id === shipId)
    if (!ship) return
    set((s) => ({
      ships: s.ships.filter((sh) => sh.id !== shipId),
      missiles: s.missiles.filter((m) => m.launchedBy !== shipId && m.target !== shipId),
      initiativeOrder: s.initiativeOrder.filter((id) => id !== shipId),
      log: [...s.log, makeLogEntry({
        round: s.round,
        phase: s.phase,
        type: 'system',
        message: `${ship.profile.name} removed from battle.`,
      })],
    }))
  },

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

  // === INITIATIVE ===

  /**
   * Roll initiative for all ships and sort the order.
   * @param {Record<string, number>} [tacticsEffects]  Optional per-shipId tactics bonus
   */
  rollAllInitiative: (tacticsEffects = {}) => {
    const { ships, round } = get()
    const rolled = ships.map((ship) => {
      const result = rollInitiative(
        ship.profile.crew.pilot ?? 0,
        ship.profile.thrust,
        (tacticsEffects[ship.id] ?? 0) + (ship.initiativeBonusNextRound ?? 0),
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
  },

  // === THRUST ===

  /**
   * Apply a thrust delta to a ship's velocity vector.
   * Deducts from thrustUsedThisRound.
   * @param {string} shipId
   * @param {{ q: number, r: number }} delta
   * @param {number} cost  Hex distance of the delta
   */
  applyShipThrust: (shipId, delta, cost) => {
    const ship = get().ships.find((s) => s.id === shipId)
    if (!ship) return
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

  // === MOVEMENT (simultaneous) ===

  /** Move all ships and missiles by their current vector (movement phase). */
  resolveMovement: () => {
    const { ships, missiles, round } = get()
    const movedShips = ships.map((sh) => ({
      ...sh,
      position: applyMovement(sh.position, sh.vector),
    }))
    const movedMissiles = missiles.map((m) => ({
      ...m,
      position: applyMovement(m.position, m.vector),
      thrustRemaining: m.thrustRemaining - 1,
    }))

    const entries = movedShips.map((sh) => makeLogEntry({
      round,
      phase: 'movement',
      type: 'move',
      message: `${sh.profile.name} moves to (${sh.position.q},${sh.position.r}).`,
      shipId: sh.id,
      details: { position: sh.position, vector: sh.vector },
    }))

    set((s) => ({
      ships: movedShips,
      missiles: movedMissiles.filter((m) => m.thrustRemaining >= 0),
      log: [...s.log, ...entries],
    }))
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
    const prevHull    = ship.hullCurrent
    const hullCurrent = Math.max(0, prevHull - damage)
    get().updateShip(shipId, { hullCurrent })
    set((s) => ({
      log: [...s.log, makeLogEntry({
        round: s.round,
        phase: s.phase,
        type: 'damage',
        message: `${ship.profile.name} takes ${damage} damage from ${sourceLabel}. Hull: ${hullCurrent}/${ship.profile.hull}.`,
        shipId,
        details: { damage, hullCurrent, hullMax: ship.profile.hull },
      })],
    }))

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
        get().addCriticalHit(shipId, { system: location, severity: effectiveSeverity })
        const effect = getCriticalEffect(location, effectiveSeverity)
        if (effect?.mechanic === 'hull_extra_damage') {
          const extra = rollDice(effect.value, 6)
          get().applyDamage(shipId, extra.total, `Critical Hull Sev.${effectiveSeverity} (threshold)`, true)
        }
      }
    }
  },

  /**
   * Record a critical hit on a ship. Caller is responsible for computing effective
   * severity (including stacking) before calling this action.
   * Handles M-Drive thrustPenalty. Does not roll hull extra damage — caller handles that.
   * // MgT2e CRB p.169–170
   * @param {string} shipId
   * @param {{ system: string, severity: number }} crit  severity must be effective (post-stacking)
   */
  addCriticalHit: (shipId, { system, severity }) => {
    const ship = get().ships.find((s) => s.id === shipId)
    if (!ship) return

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
  launchMissile: (launchedBy, target, count, position, vector, type = 'Standard') => {
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
        sh.id === launchedBy ? { ...sh, turretsNeedingReload: (sh.turretsNeedingReload ?? 0) + 1 } : sh
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
  },

  /** Remove a missile salvo by id. */
  removeMissile: (missileId) => {
    set((s) => ({ missiles: s.missiles.filter((m) => m.id !== missileId) }))
  },

  // === PHASE / ROUND PROGRESSION ===

  /** Advance to the next phase in sequence. Drives all transitions via PHASE_ORDER. */
  advancePhase: () => {
    const { phase } = get()
    const idx = PHASE_ORDER.indexOf(phase)
    if (idx === -1 || idx === PHASE_ORDER.length - 1) {
      get().startNextRound()
      return
    }
    const nextPhase = PHASE_ORDER[idx + 1]
    set((s) => ({
      phase: nextPhase,
      currentActorIndex: 0,
      ships: s.ships.map((sh) => ({ ...sh, hasActedThisPhase: false })),
      log: [...s.log, makeLogEntry({
        round: s.round,
        phase: nextPhase,
        type: 'system',
        message: `Phase start: ${nextPhase.toUpperCase()}.`,
      })],
    }))
  },

  /** Mark the current actor as having acted; advance the actor index. */
  advanceActor: () => {
    const { initiativeOrder, currentActorIndex } = get()
    const shipId = initiativeOrder[currentActorIndex]
    if (shipId) {
      get().updateShip(shipId, { hasActedThisPhase: true })
    }
    set((s) => ({ currentActorIndex: s.currentActorIndex + 1 }))
  },

  /** Reset all round-scoped state and increment round counter. */
  startNextRound: () => {
    set((s) => ({
      round: s.round + 1,
      phase: 'initiative',
      currentActorIndex: 0,
      ships: s.ships.map((sh) => ({
        ...sh,
        thrustUsedThisRound: 0,
        thrustBonusThisRound: 0,
        hasActedThisPhase: false,
        evasiveThrust: 0,
      })),
      log: [...s.log, makeLogEntry({
        round: s.round + 1,
        phase: 'initiative',
        type: 'system',
        message: `Round ${s.round + 1} begins.`,
      })],
    }))
  },

  // === CREW ACTION EFFECTS ===

  /**
   * Declare evasive thrust. Stored as DM penalty against attackers this round.
   * Amount is clamped to remaining available thrust.
   * // MgT2e CRB p.166 — Evasive Action
   * @param {string} shipId
   * @param {number} amount
   */
  declareEvasiveThrust: (shipId, amount) => {
    const ship = get().ships.find((s) => s.id === shipId)
    if (!ship) return
    const maxEvasive = Math.max(0, ship.profile.thrust + (ship.thrustBonusThisRound ?? 0) - ship.thrustUsedThisRound - (ship.thrustPenalty ?? 0))
    const clamped = Math.max(0, Math.min(amount, maxEvasive))
    set((s) => ({
      ships: s.ships.map((sh) =>
        sh.id === shipId ? { ...sh, evasiveThrust: clamped } : sh
      ),
      log: [...s.log, makeLogEntry({
        round: s.round,
        phase: s.phase,
        type: 'action',
        message: `${ship.profile.name} declares ${clamped} evasive thrust (DM -${ship.profile.crew?.pilot ?? 0} × ${clamped} to attackers).`,
        shipId,
      })],
    }))
  },

  /**
   * Apply a sensor lock from one ship to another.
   * Sets sensorLockDM to the Effect of the lock roll.
   * // MgT2e CRB p.167 — Sensor Lock
   * @param {string} attackerId
   * @param {string} targetId
   * @param {number} dmBonus  Effect of the sensor lock roll (>= 0)
   */
  applySensorLock: (attackerId, targetId, dmBonus) => {
    const attacker = get().ships.find((s) => s.id === attackerId)
    const target = get().ships.find((s) => s.id === targetId)
    if (!attacker || !target) return
    set((s) => ({
      ships: s.ships.map((sh) => {
        if (sh.id === attackerId) return { ...sh, sensorLockOn: targetId, sensorLockDM: Math.max(0, dmBonus) }
        if (sh.id === targetId)   return { ...sh, sensorLockedBy: attackerId }
        return sh
      }),
      log: [...s.log, makeLogEntry({
        round: s.round,
        phase: s.phase,
        type: 'action',
        message: `${attacker.profile.name}: Sensor Lock on ${target.profile.name} (DM +${Math.max(0, dmBonus)} to attacks).`,
        shipId: attackerId,
      })],
    }))
  },

  /**
   * Clear sensor lock via Electronic Warfare success.
   * Removes lock both from attacker and the locked ship.
   * // MgT2e CRB p.167 — Electronic Warfare
   * @param {string} shipId  The defender (ship being locked)
   */
  clearSensorLock: (shipId) => {
    const ship = get().ships.find((s) => s.id === shipId)
    if (!ship || !ship.sensorLockedBy) return
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

  /**
   * Remove the first critical hit from a ship (Engineer repair).
   * Recomputes thrustPenalty from remaining M-Drive crit, if any.
   * // MgT2e CRB p.167 — Repair System
   * @param {string} shipId
   */
  repairCritical: (shipId) => {
    const ship = get().ships.find((s) => s.id === shipId)
    if (!ship || ship.criticalHits.length === 0) return
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

  /**
   * Apply an initiative bonus for next round (Captain: Improve Initiative).
   * Bonus is accumulated and consumed in rollAllInitiative.
   * // MgT2e CRB p.166
   * @param {string} shipId
   * @param {number} bonus  Effect of the roll (>= 0)
   */
  applyInitiativeBonus: (shipId, bonus) => {
    const ship = get().ships.find((s) => s.id === shipId)
    if (!ship) return
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

  /**
   * Overload M-Drive: grant temporary thrust bonus for this round only.
   * Bonus resets at start of next round.
   * // MgT2e CRB p.167
   * @param {string} shipId
   * @param {number} bonus  Effect of the roll (>= 0)
   */
  overloadDrive: (shipId, bonus) => {
    const ship = get().ships.find((s) => s.id === shipId)
    if (!ship) return
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

  /**
   * Reload one missile turret (Gunner: Reload Turret action).
   * Decrements turretsNeedingReload; no-op if none need reloading.
   * // MgT2e CRB p.167
   * @param {string} shipId
   */
  reloadTurret: (shipId) => {
    const ship = get().ships.find((s) => s.id === shipId)
    if (!ship || (ship.turretsNeedingReload ?? 0) === 0) return
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
    log: [],
    mapSettings: { scale: 1 },
  }),

  // === IMPORT / EXPORT ===

  exportBattleState: () => {
    const { id, name, round, combatMode, phase, initiativeOrder, currentActorIndex, ships, missiles, log, mapSettings } = get()
    exportBattle({ id, name, round, combatMode, phase, initiativeOrder, currentActorIndex, ships, missiles, log, mapSettings, savedAt: new Date().toISOString() })
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
      log: battle.log ?? [],
      mapSettings: battle.mapSettings ?? { scale: 1 },
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
}))

export { useBattleStore }
