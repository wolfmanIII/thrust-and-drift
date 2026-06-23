/**
 * Derive all attack-related values from attacker, target, and weapon selection.
 * Centralises DM computation so AttackModal renders only display logic.
 * // MgT2e CRB p.163–165
 */

import { useBattleStore } from '../../store/battleStore.js'
import { WEAPONS, DEFENSIVE_WEAPONS } from '../../data/weapons.js'
import { hexDistance, getRangeBand } from '../../utils/hex.js'
import { getRangeDM, getTargetSizeDM, isOutOfRange } from '../../utils/combat.js'
import { getEffectiveSkill } from '../../utils/crew.js'
import { dogfightAttackDM } from '../../utils/dogfight.js'
import { getObstacleAt, computeObstacleCoverDM } from '../../utils/obstacles.js'

/**
 * @param {string|null} attackerShipId   ID of the attacking ship
 * @param {string}      targetId         ID of the selected target ship
 * @param {string}      weaponKey        Weapon type key (e.g. 'Pulse Laser')
 * @param {string|null} [manualRangeBand] Override range band (basic combat mode)
 * @param {number|null} [turretSlot]     Selected turret slot (used to derive per-turret gunner skill)
 * @returns {{
 *   attacker:         object|undefined,
 *   enemies:          object[],
 *   target:           object|undefined,
 *   weapon:           object|null,
 *   availableWeapons: { weaponName: string, turretSlot: number }[],
 *   distance:         number|null,
 *   rangeBand:        string,
 *   storedBand:       string|null,
 *   combatMode:       'vectorial'|'basic',
 *   outOfRange:   boolean,
 *   dmBreakdown: {
 *     gunnerSkill:  number,
 *     weaponDM:     number,
 *     rangeDM:      number,
 *     sizeDM:       number,
 *     evasiveDM:    number,   // always 0 here; set dynamically by Reactions in AttackModal
 *     sensorLockDM: number,
 *     totalDM:      number,
 *   },
 * }}
 */
export function useAttackSetup(attackerShipId, targetId, weaponKey, manualRangeBand = null, turretSlot = null) {
  const ships            = useBattleStore((s) => s.ships)
  const combatMode       = useBattleStore((s) => s.combatMode)
  const rangeBands       = useBattleStore((s) => s.rangeBands)
  const dogfights        = useBattleStore((s) => s.dogfights)
  const obstacles        = useBattleStore((s) => s.obstacles)
  const obstaclesEnabled = useBattleStore((s) => s.obstaclesEnabled)

  const attacker = ships.find((s) => s.id === attackerShipId)
  const enemies  = ships.filter((s) => s.id !== attackerShipId)
  const target   = ships.find((s) => s.id === targetId)
  const weapon  = weaponKey ? (WEAPONS[weaponKey] ?? null) : null

  // One entry per unfired turret×weapon — no deduplication (CRB p.164: each turret fires once)
  // When crewAssignments are set, turrets without an assigned gunner cannot fire.
  const firedTurrets     = attacker?.firedTurrets ?? []
  const assignments      = attacker?.crewAssignments ?? null
  const availableWeapons = (attacker?.profile.turrets ?? [])
    .filter((t) => {
      if (firedTurrets.includes(t.slot)) return false
      if (assignments && (assignments.gunners?.[t.slot] ?? null) === null) return false
      return true
    })
    .flatMap((t) => t.weapons
      .filter((w) => !DEFENSIVE_WEAPONS.includes(w))
      .map((w) => ({ weaponName: w, turretSlot: t.slot }))
    )

  const distance  = combatMode === 'vectorial' && target && attacker
    ? hexDistance(attacker.position, target.position)
    : null

  const storedBand = combatMode === 'basic' && attacker && target
    ? rangeBands[[attacker.id, target.id].sort().join('_')] ?? null
    : null
  const rangeBand = combatMode === 'vectorial'
    ? getRangeBand(distance ?? 0)
    : (storedBand ?? manualRangeBand ?? 'Medium')
  const rangeDM   = getRangeDM(rangeBand)
  const sizeDM      = target ? getTargetSizeDM(target.profile.tonnage ?? 0) : 0
  // evasiveDM is 0 here — computed dynamically in AttackModal from Reactions (CRB p.171)
  const sensorLockDM = attacker?.sensorLockOn === targetId ? (attacker.sensorLockDM ?? 0) : 0
  const gunnerSkill = getEffectiveSkill(attacker?.profile.crew, assignments, 'gunner', turretSlot)
  const weaponDM    = weapon?.attackDM ?? 0

  // Dogfight attack DM: +2 winner, −2 loser, 0 tie (CRB p.138)
  const attackerGroup  = attacker?.inDogfight
    ? dogfights.find((g) => g.id === attacker.inDogfight && g.active)
    : null
  const dogfightDM     = attackerGroup
    ? dogfightAttackDM(attacker.id, attackerGroup.roundWinnerId)
    : 0
  // Tie: roundWinnerId null AND an active dogfight round has been resolved (microRound > 1)
  const dogfightTie    = !!(attackerGroup && attackerGroup.roundWinnerId === null && attackerGroup.microRound > 1)

  // On a dogfight tie, fixed-mount weapons (barbettes, bays) cannot fire (Companion p.174)
  const availableWeaponsFiltered = dogfightTie
    ? availableWeapons.filter((w) => (WEAPONS[w.weaponName]?.mount ?? 'turret') === 'turret')
    : availableWeapons

  // Ion Power: when currentPower <= 0 all powered systems are offline (HG p.30)
  const basePower  = attacker?.profile.maxPower ?? 100
  const noPower    = attacker ? (attacker.currentPower ?? basePower) <= 0 : false
  const availableWeaponsFinal = noPower ? [] : availableWeaponsFiltered

  // Obstacle cover DM: negative DM applied to attacks against target inside a field or nebula.
  // Applies in vectorial mode when obstacles are enabled. // Obstacles System Design §3.1, §8
  const obstacleCoverDM = (obstaclesEnabled && combatMode === 'vectorial' && target)
    ? computeObstacleCoverDM(getObstacleAt(obstacles, target.position))
    : 0

  const totalDM     = gunnerSkill + weaponDM + rangeDM + sizeDM + sensorLockDM + dogfightDM + obstacleCoverDM
  const outOfRange  = weapon ? isOutOfRange(weapon.maxRange, rangeBand) : false

  return {
    attacker,
    enemies,
    target,
    weapon,
    availableWeapons: availableWeaponsFinal,
    distance,
    rangeBand,
    storedBand,
    combatMode,
    outOfRange,
    dogfightTie,
    noPower,
    dmBreakdown: { gunnerSkill, weaponDM, rangeDM, sizeDM, evasiveDM: 0, sensorLockDM, dogfightDM, obstacleCoverDM, totalDM },
  }
}
