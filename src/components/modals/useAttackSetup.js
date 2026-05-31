/**
 * Derive all attack-related values from attacker, target, and weapon selection.
 * Centralises DM computation so AttackModal renders only display logic.
 * // MgT2e CRB p.163–165
 */

import { useBattleStore } from '../../store/battleStore.js'
import { WEAPONS, DEFENSIVE_WEAPONS } from '../../data/weapons.js'
import { hexDistance, getRangeBand } from '../../utils/hex.js'
import { getRangeDM, getTargetSizeDM, isOutOfRange } from '../../utils/combat.js'
import { getCrewSkill } from '../../utils/crew.js'

/**
 * @param {string|null} attackerShipId   ID of the attacking ship
 * @param {string}      targetId         ID of the selected target ship
 * @param {string}      weaponKey        Weapon type key (e.g. 'Pulse Laser')
 * @param {string|null} [manualRangeBand] Override range band (basic combat mode)
 * @returns {{
 *   attacker:         object|undefined,
 *   enemies:          object[],
 *   target:           object|undefined,
 *   weapon:           object|null,
 *   availableWeapons: { weaponName: string, turretSlot: number }[],
 *   distance:         number|null,
 *   rangeBand:        string,
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
export function useAttackSetup(attackerShipId, targetId, weaponKey, manualRangeBand = null) {
  const ships      = useBattleStore((s) => s.ships)
  const combatMode = useBattleStore((s) => s.combatMode)

  const attacker = ships.find((s) => s.id === attackerShipId)
  const enemies  = ships.filter((s) => s.id !== attackerShipId)
  const target   = ships.find((s) => s.id === targetId)
  const weapon  = weaponKey ? (WEAPONS[weaponKey] ?? null) : null

  // One entry per unfired turret×weapon — no deduplication (CRB p.164: each turret fires once)
  const firedTurrets     = attacker?.firedTurrets ?? []
  const availableWeapons = (attacker?.profile.turrets ?? [])
    .filter((t) => !firedTurrets.includes(t.slot))
    .flatMap((t) => t.weapons
      .filter((w) => !DEFENSIVE_WEAPONS.includes(w))
      .map((w) => ({ weaponName: w, turretSlot: t.slot }))
    )

  const distance  = combatMode === 'vectorial' && target && attacker
    ? hexDistance(attacker.position, target.position)
    : null
  const rangeBand = combatMode === 'vectorial'
    ? getRangeBand(distance ?? 0)
    : (manualRangeBand ?? 'Medium')
  const rangeDM   = getRangeDM(rangeBand)
  const sizeDM      = target ? getTargetSizeDM(target.profile.tonnage ?? 0) : 0
  // evasiveDM is 0 here — computed dynamically in AttackModal from Reactions (CRB p.171)
  const sensorLockDM = attacker?.sensorLockOn === targetId ? (attacker.sensorLockDM ?? 0) : 0
  const gunnerSkill = getCrewSkill(attacker?.profile.crew, 'gunner')
  const weaponDM    = weapon?.attackDM ?? 0
  const totalDM     = gunnerSkill + weaponDM + rangeDM + sizeDM + sensorLockDM
  const outOfRange  = weapon ? isOutOfRange(weapon.maxRange, rangeBand) : false

  return {
    attacker,
    enemies,
    target,
    weapon,
    availableWeapons,
    distance,
    rangeBand,
    combatMode,
    outOfRange,
    dmBreakdown: { gunnerSkill, weaponDM, rangeDM, sizeDM, evasiveDM: 0, sensorLockDM, totalDM },
  }
}
