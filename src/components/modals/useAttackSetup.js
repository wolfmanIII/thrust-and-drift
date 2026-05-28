/**
 * Derive all attack-related values from attacker, target, and weapon selection.
 * Centralises DM computation so AttackModal renders only display logic.
 * // MgT2e CRB p.163–165
 */

import { useBattleStore } from '../../store/battleStore.js'
import { WEAPONS, DEFENSIVE_WEAPONS } from '../../data/weapons.js'
import { hexDistance, getRangeBand } from '../../utils/hex.js'
import { getRangeDM, getTargetSizeDM, getEvasiveDM } from '../../utils/combat.js'

/**
 * @param {string|null} attackerShipId  ID of the attacking ship
 * @param {string}      targetId        ID of the selected target ship
 * @param {string}      weaponKey       Weapon type key (e.g. 'Pulse Laser')
 * @returns {{
 *   attacker:         object|undefined,
 *   enemies:          object[],
 *   target:           object|undefined,
 *   weapon:           object|null,
 *   availableWeapons: string[],
 *   distance:         number,
 *   rangeBand:        string,
 *   dmBreakdown: {
 *     gunnerSkill:  number,
 *     weaponDM:     number,
 *     rangeDM:      number,
 *     sizeDM:       number,
 *     evasiveDM:    number,
 *     sensorLockDM: number,
 *     totalDM:      number,
 *   },
 * }}
 */
export function useAttackSetup(attackerShipId, targetId, weaponKey) {
  const ships = useBattleStore((s) => s.ships)

  const attacker = ships.find((s) => s.id === attackerShipId)
  const enemies  = ships.filter((s) => s.id !== attackerShipId)
  const target   = ships.find((s) => s.id === targetId)
  const weapon  = weaponKey ? (WEAPONS[weaponKey] ?? null) : null

  const availableWeapons = (attacker?.profile.turrets ?? [])
    .flatMap((t) => t.weapons)
    .filter((w) => !DEFENSIVE_WEAPONS.includes(w))
    .filter((v, i, a) => a.indexOf(v) === i)

  const distance    = (target && attacker) ? hexDistance(attacker.position, target.position) : 0
  const rangeBand   = getRangeBand(distance)
  const rangeDM     = getRangeDM(rangeBand)
  const sizeDM      = target ? getTargetSizeDM(target.profile.tonnage ?? 0) : 0
  const evasiveDM   = target ? getEvasiveDM(attacker?.profile.crew?.pilot ?? 0, target.evasiveThrust) : 0
  const sensorLockDM = attacker?.sensorLockOn === targetId ? (attacker.sensorLockDM ?? 0) : 0
  const gunnerSkill = attacker?.profile.crew?.gunner ?? 0
  const weaponDM    = weapon?.attackDM ?? 0
  const totalDM     = gunnerSkill + weaponDM + rangeDM + sizeDM + evasiveDM + sensorLockDM

  return {
    attacker,
    enemies,
    target,
    weapon,
    availableWeapons,
    distance,
    rangeBand,
    dmBreakdown: { gunnerSkill, weaponDM, rangeDM, sizeDM, evasiveDM, sensorLockDM, totalDM },
  }
}
