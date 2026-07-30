/**
 * Derive all attack-related values from attacker, target, and weapon selection.
 * Centralises DM computation so AttackModal renders only display logic.
 * // MgT2e CRB p.163–165
 */

import { useBattleStore } from '../../store/battleStore.js'
import { WEAPONS, DEFENSIVE_WEAPONS } from '../../data/weapons.js'
import { resolveWeaponForSlot } from '../../utils/weaponOverrides.js'
import { hexDistance, getRangeBand } from '../../utils/hex.js'
import { getRangeDM, getTargetSizeDM, isOutOfRange, bayWeaponSmallShipDM } from '../../utils/combat.js'
import { getEffectiveSkill } from '../../utils/crew.js'
import { dogfightAttackDM } from '../../utils/dogfight.js'
import { getObstacleAt, computeObstacleCoverDM } from '../../utils/obstacles.js'

/**
 * dmEntries key for the Evasive Action reaction DM — always 0 from this hook (Reactions
 * state lives in AttackModal, not here); AttackModal overrides this one entry's value by
 * matching this constant instead of a bare string literal, so a rename can't silently drift.
 * // MgT2e CRB p.171
 */
export const EVASIVE_DM_KEY = 'evasiveDM'

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
 *   dmEntries: { key: string, label: string, value: number }[],
 *     // Ordered list of every attack DM contribution — the single source AttackModal.jsx
 *     // renders generically (DM Summary rows) and reduces into rollAttack's params.
 *     // Adding a new DM modifier means adding one entry here; no other file needs to change.
 *     // Which rows to always display vs. hide-when-zero is a display policy, not part of
 *     // this data — AttackModal.jsx decides that itself.
 *   dmBreakdown: object,
 *     // Same values as dmEntries, keyed flat (`{ [key]: value, totalDM }`) — kept for
 *     // call sites/tests that want direct named access rather than the ordered list.
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
  const enemies  = ships.filter((s) => s.id !== attackerShipId && !s.isDestroyed)
  const target   = ships.find((s) => s.id === targetId)
  const selectedTurret = turretSlot != null ? (attacker?.profile.turrets ?? []).find((t) => t.slot === turretSlot) : null
  const weapon = !weaponKey ? null
    : selectedTurret ? resolveWeaponForSlot(selectedTurret, weaponKey)
    : (WEAPONS[weaponKey] ?? null)

  // Missiles are excluded from the same-type linking bonus (CRB p.168 / p.172).
  const MISSILE_WEAPONS = new Set(['Missile Rack', 'Missile Barbette', 'Torpedo'])

  // One entry per unique weapon TYPE per unfired turret slot.
  // Same-type weapons (non-missile) in a double/triple turret fire together with one roll
  // and add +1 per damage die per extra weapon. // MgT2e CRB p.168 — Double and Triple Turrets
  const firedTurrets     = attacker?.firedTurrets ?? []
  const assignments      = attacker?.crewAssignments ?? null
  const availableWeapons = (attacker?.profile.turrets ?? [])
    .filter((t) => {
      if (firedTurrets.includes(t.slot)) return false
      if (assignments && (assignments.gunners?.[t.slot] ?? null) === null) return false
      return true
    })
    .flatMap((t) => {
      const offensiveWeapons = t.weapons.filter((w) => !DEFENSIVE_WEAPONS.includes(w))
      // Count occurrences of each weapon type in the slot
      const counts = {}
      for (const w of offensiveWeapons) counts[w] = (counts[w] ?? 0) + 1
      // One entry per unique type — linked weapons show combined damage bonus
      return Object.entries(counts).map(([weaponName, linkedCount]) => {
        const wDef = WEAPONS[weaponName]
        const damageDiceBonus = MISSILE_WEAPONS.has(weaponName)
          ? 0
          : (linkedCount - 1) * (wDef?.damageDice ?? 0)
        return { weaponName, turretSlot: t.slot, linkedCount, damageDiceBonus }
      })
    })

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
  const sensorLockDM  = attacker?.sensorLockOn === targetId ? (attacker.sensorLockDM ?? 0) : 0
  const aidGunnersDM  = attacker?.aidGunnersDM ?? 0
  const gunnerSkill   = getEffectiveSkill(attacker?.profile.crew, assignments, 'gunner', turretSlot)
  const weaponDM      = weapon?.attackDM ?? 0

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

  // DM-2 for torpedo attacks against ships smaller than 2,000 tons — HG p.39
  const torpedoSmallShipDM = (weaponKey === 'Torpedo' && (target?.profile.tonnage ?? 0) < 2000) ? -2 : 0

  // DM-2/-4 for bay weapons vs small targets — HG p.31. Missile/Torpedo Bay are RAW-excluded;
  // not yet implemented, but the MISSILE_WEAPONS check makes that exclusion automatic once they are.
  const isBayWeapon = weapon?.mount === 'bay' && !MISSILE_WEAPONS.has(weaponKey)
  const bayWeaponSmallShipDMValue = bayWeaponSmallShipDM(isBayWeapon, target?.profile.tonnage ?? 0)

  const outOfRange  = weapon ? isOutOfRange(weapon.maxRange, rangeBand) : false

  // Single source of truth for every attack DM: AttackModal.jsx maps this generically for
  // the DM Summary display and reduces it into rollAttack's params. Adding a new modifier
  // (weapon-specific or situational) means adding one entry here — nowhere else.
  const dmEntries = [
    { key: 'gunnerSkill',   label: 'Gunner',               value: gunnerSkill },
    { key: 'weaponDM',      label: `Weapon (${weaponKey})`, value: weaponDM },
    { key: 'rangeDM',       label: `Range (${rangeBand})`,  value: rangeDM },
    { key: 'sizeDM',        label: 'Target size',           value: sizeDM },
    // evasiveDM is always 0 here — AttackModal.jsx overrides it dynamically from Reactions.
    { key: EVASIVE_DM_KEY,         label: 'Evasion',                value: 0 },
    { key: 'sensorLockDM',         label: 'Sensor Lock',            value: sensorLockDM },
    { key: 'aidGunnersDM',         label: 'Aid Gunners',             value: aidGunnersDM },
    { key: 'dogfightDM',           label: 'Dogfight',                value: dogfightDM },
    { key: 'obstacleCoverDM',      label: 'Field cover',             value: obstacleCoverDM },
    { key: 'torpedoSmallShipDM',   label: 'Torpedo vs <2kt',         value: torpedoSmallShipDM },        // HG p.39
    { key: 'bayWeaponSmallShipDM', label: 'Bay vs small target',     value: bayWeaponSmallShipDMValue }, // HG p.31
  ]
  const totalDM     = dmEntries.reduce((sum, e) => sum + e.value, 0)
  const dmBreakdown = { ...Object.fromEntries(dmEntries.map((e) => [e.key, e.value])), totalDM }

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
    dmEntries,
    dmBreakdown,
  }
}
