/**
 * AttackModal — 3-step attack resolution: configure → roll → damage.
 * Each step is a focused sub-component; the root component owns shared state.
 * // MgT2e CRB p.163–165
 */

import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { WEAPONS } from '../../data/weapons.js'
import { RANGE_BANDS } from '../../data/rangeBands.js'
import { rollAttack, isCriticalHit, getCriticalSeverity } from '../../utils/combat.js'
import { rollDice, roll2D6 } from '../../utils/dice.js'
import { getCriticalLocation, getCriticalEffect } from '../../data/criticalHits.js'
import { useAttackSetup } from './useAttackSetup.js'
import { emitEffect } from '../../utils/effectQueue.js'

/** Weapons that fire a visible beam/ray toward the target. */
const BEAM_WEAPONS = ['Pulse Laser', 'Beam Laser', 'Particle Beam', 'Railgun']

/** @typedef {'config'|'roll'|'damage'|'critical'} AttackStep */

// ── UI primitive ──────────────────────────────────────────────────────────

function DmRow({ label, value, highlight = false }) {
  const sign = value >= 0 ? '+' : ''
  return (
    <div className={`flex justify-between ${highlight ? 'text-[--neon-cyan] font-bold' : 'text-slate-400'}`}>
      <span>{label}</span>
      <span>{sign}{value}</span>
    </div>
  )
}

// ── Step 1: weapon + target configuration ────────────────────────────────

/**
 * @param {{
 *   enemies: object[],
 *   availableWeapons: string[],
 *   weaponKey: string,
 *   setWeaponKey: Function,
 *   targetId: string,
 *   setTargetId: Function,
 *   target: object|undefined,
 *   weapon: object|null,
 *   rangeBand: string,
 *   distance: number,
 *   dmBreakdown: object,
 *   onNext: Function,
 *   onClose: Function,
 * }} props
 */
function AttackConfigStep({
  enemies, availableWeapons,
  weaponKey, setWeaponKey, targetId, setTargetId,
  target, weapon, rangeBand, distance, dmBreakdown,
  combatMode, manualRangeBand, setManualRangeBand,
  onNext, onClose,
}) {
  const { gunnerSkill, rangeDM, sizeDM, evasiveDM, sensorLockDM, totalDM } = dmBreakdown
  return (
    <Modal title="Attack" onClose={onClose}>
      <div className="space-y-4">
        {/* Weapon select */}
        <div>
          <p className="text-slate-500 font-mono text-xs mb-1.5">Weapon</p>
          <div className="flex flex-col gap-1">
            {availableWeapons.length === 0 && (
              <p className="text-slate-600 font-mono text-xs italic">No offensive weapons available.</p>
            )}
            {availableWeapons.map((w) => (
              <button
                key={w}
                onClick={() => setWeaponKey(w)}
                className={`text-left px-3 py-1.5 rounded font-mono text-xs border transition-colors ${
                  weaponKey === w
                    ? 'border-[--neon-cyan]/60 bg-[--neon-cyan]/10 text-[--neon-cyan]'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {w}
                {WEAPONS[w] && (
                  <span className="ml-2 text-slate-600">
                    DM {WEAPONS[w].attackDM >= 0 ? `+${WEAPONS[w].attackDM}` : WEAPONS[w].attackDM}
                    {' · '}
                    {WEAPONS[w].damageDice}D dmg
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Target select */}
        <div>
          <p className="text-slate-500 font-mono text-xs mb-1.5">Target</p>
          <div className="flex flex-col gap-1">
            {enemies.map((e) => (
              <button
                key={e.id}
                onClick={() => setTargetId(e.id)}
                className={`flex items-center gap-2 text-left px-3 py-1.5 rounded font-mono text-xs border transition-colors ${
                  targetId === e.id
                    ? 'border-[--neon-cyan]/60 bg-[--neon-cyan]/10 text-[--neon-cyan]'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                <span>{e.profile.name}</span>
                {target?.id === e.id && combatMode === 'vectorial' && (
                  <span className="ml-auto text-slate-500">{rangeBand} ({distance} hex)</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Range band selector — basic mode only */}
        {combatMode === 'basic' && target && (
          <div>
            <p className="text-slate-500 font-mono text-xs mb-1.5">Range</p>
            <div className="grid grid-cols-3 gap-1">
              {RANGE_BANDS.map(({ label }) => (
                <button
                  key={label}
                  onClick={() => setManualRangeBand(label)}
                  className={`px-2 py-1 rounded font-mono text-xs border transition-colors ${
                    (manualRangeBand ?? 'Medium') === label
                      ? 'border-[--neon-cyan]/60 bg-[--neon-cyan]/10 text-[--neon-cyan]'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DM summary */}
        {weapon && target && (
          <div className="bg-slate-800 rounded p-3 font-mono text-xs space-y-0.5">
            <p className="text-slate-400 mb-2">DM Summary (target: 8+)</p>
            <DmRow label="Gunner" value={gunnerSkill} />
            <DmRow label={`Weapon (${weaponKey})`} value={weapon.attackDM} />
            <DmRow label={`Range (${rangeBand})`} value={rangeDM} />
            <DmRow label="Target size" value={sizeDM} />
            {evasiveDM !== 0 && <DmRow label="Evasion" value={evasiveDM} />}
            {sensorLockDM !== 0 && <DmRow label="Sensor Lock" value={sensorLockDM} />}
            <div className="border-t border-slate-700 mt-1 pt-1">
              <DmRow label="Total DM" value={totalDM} highlight />
            </div>
          </div>
        )}

        <button
          onClick={onNext}
          disabled={!weapon || !target || (combatMode === 'basic' && !manualRangeBand)}
          className="w-full py-2 bg-[--neon-cyan]/10 border border-[--neon-cyan]/40 text-[--neon-cyan] font-mono text-sm tracking-widest rounded hover:bg-[--neon-cyan]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ROLL ATTACK →
        </button>
      </div>
    </Modal>
  )
}

// ── Step 2: 2D6 roll + hit/miss ───────────────────────────────────────────

/**
 * @param {{
 *   attackerName: string,
 *   targetName: string,
 *   weaponKey: string,
 *   dmBreakdown: { gunnerSkill: number, weaponDM: number, rangeDM: number, sizeDM: number, evasiveDM: number, sensorLockDM: number, totalDM: number },
 *   attackResult: object|null,
 *   setAttackResult: Function,
 *   onNext: Function,
 *   onClose: Function,
 * }} props
 */
function AttackRollStep({
  attackerName, targetName, weaponKey,
  dmBreakdown,
  attackResult, setAttackResult, onNext, onClose,
}) {
  const { gunnerSkill, weaponDM, rangeDM, sizeDM, evasiveDM, sensorLockDM, totalDM } = dmBreakdown
  const handleRoll = () => {
    const result = rollAttack({
      gunnerSkill,
      dexDM: 0,
      aidGunnersDM: 0,
      rangeDM,
      weaponDM,
      targetSizeDM: sizeDM,
      evasiveDM,
      sensorLockDM,
    })
    setAttackResult(result)
  }

  return (
    <Modal title="Attack Roll" onClose={onClose}>
      <div className="space-y-4">
        <div className="text-center font-mono text-xs text-slate-400">
          {attackerName} → {targetName} con {weaponKey}
        </div>

        {!attackResult ? (
          <button
            onClick={handleRoll}
            className="w-full py-3 bg-[--neon-cyan]/10 border border-[--neon-cyan]/40 text-[--neon-cyan] font-mono text-lg tracking-widest rounded hover:bg-[--neon-cyan]/20 transition-colors"
          >
            🎲 ROLL 2D6
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-slate-800 rounded p-4 text-center font-mono">
              <div className="flex justify-center gap-3 mb-2">
                {attackResult.roll.results.map((r, i) => (
                  <span
                    key={i}
                    className="w-10 h-10 bg-slate-700 rounded border border-slate-600 flex items-center justify-center text-lg text-white font-bold"
                  >
                    {r}
                  </span>
                ))}
              </div>
              <p className="text-slate-400 text-xs">
                [{attackResult.roll.results.join('+')}] + DM {totalDM >= 0 ? `+${totalDM}` : totalDM}{' '}={' '}
                <span className={`font-bold text-sm ${attackResult.hit ? 'text-green-400' : 'text-red-400'}`}>
                  {attackResult.total}
                </span>
              </p>
            </div>

            <div className={`text-center py-2 rounded font-mono font-bold text-sm ${
              attackResult.hit ? 'bg-green-950/40 text-green-400' : 'bg-red-950/40 text-red-400'
            }`}>
              {attackResult.hit
                ? `HIT! Effect: +${attackResult.effect}`
                : 'MISS'}
            </div>

            {isCriticalHit(attackResult.effect) && (
              <p className="text-orange-400 font-mono text-xs text-center">
                ⚠ CRITICAL HIT (Effect {attackResult.effect} ≥ 6)
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setAttackResult(null)}
                className="flex-1 py-2 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-slate-500"
              >
                REROLL
              </button>
              {attackResult.hit ? (
                <button
                  onClick={onNext}
                  className="flex-1 py-2 bg-[--neon-cyan]/10 border border-[--neon-cyan]/40 text-[--neon-cyan] font-mono text-xs rounded hover:bg-[--neon-cyan]/20"
                >
                  CALCULATE DAMAGE →
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex-1 py-2 border border-slate-600 text-slate-300 font-mono text-xs rounded hover:border-slate-400"
                >
                  CLOSE
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Step 3: damage roll + application ────────────────────────────────────

/**
 * @param {{
 *   damageDice: number,
 *   effectBonus: number,
 *   armor: number,
 *   damageResult: object|null,
 *   setDamageResult: Function,
 *   onApply: Function,
 *   onClose: Function,
 * }} props
 */
function AttackDamageStep({ damageDice, effectBonus, armor, damageResult, setDamageResult, onApply, onClose }) {
  const handleDamageRoll = () => {
    const roll  = rollDice(damageDice, 6)
    const total = Math.max(0, roll.total + effectBonus - armor)
    setDamageResult({ roll, total, effectBonus, armor })
  }

  return (
    <Modal title="Damage" onClose={onClose}>
      <div className="space-y-4">
        <div className="text-center font-mono text-xs text-slate-400">
          {damageDice}D + Effect ({effectBonus}) − Armour ({armor})
        </div>

        {!damageResult ? (
          <button
            onClick={handleDamageRoll}
            className="w-full py-3 bg-red-900/30 border border-red-700/50 text-red-400 font-mono text-lg tracking-widest rounded hover:bg-red-900/40 transition-colors"
          >
            🎲 ROLL DAMAGE
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-slate-800 rounded p-4 text-center font-mono text-xs">
              <p className="text-slate-400">
                [{damageResult.roll.results.join('+')}] + {effectBonus} − {armor} armour
              </p>
              <p className="text-red-400 font-bold text-2xl mt-1">{damageResult.total}</p>
              <p className="text-slate-500">damage dealt</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setDamageResult(null)}
                className="flex-1 py-2 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-slate-500"
              >
                REROLL
              </button>
              <button
                onClick={onApply}
                className="flex-1 py-2 bg-red-900/30 border border-red-700/50 text-red-400 font-mono text-xs rounded hover:bg-red-900/40"
              >
                APPLY DAMAGE
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Step 4: critical hit — location roll + effect display ────────────────

/**
 * @param {{
 *   targetName: string,
 *   attackEffect: number,
 *   targetCrits: object[],
 *   critRoll: object|null,
 *   setCritRoll: Function,
 *   extraDamageResult: number|null,
 *   setExtraDamageResult: Function,
 *   onApply: Function,
 *   onClose: Function,
 * }} props
 */
function AttackCriticalStep({
  targetName, attackEffect, targetCrits,
  critRoll, setCritRoll, extraDamageResult, setExtraDamageResult,
  onApply, onClose,
}) {
  const attackSeverity = getCriticalSeverity(attackEffect)
  const location = critRoll ? getCriticalLocation(critRoll.total) : null
  const existingCrit = location ? targetCrits.find((c) => c.system === location) : null
  const isMaxSeverity = (existingCrit?.severity ?? 0) >= 6

  const effectiveSeverity = existingCrit && !isMaxSeverity
    ? Math.max(attackSeverity, existingCrit.severity + 1)
    : attackSeverity

  const effect = location ? getCriticalEffect(location, isMaxSeverity ? 6 : effectiveSeverity) : null
  // Max severity overflows as 6D extra damage; hull_extra_damage needs player roll
  const extraDice = isMaxSeverity ? 6 : (effect?.mechanic === 'hull_extra_damage' ? effect.value : null)
  const needsExtraRoll = extraDice !== null
  const canApply = critRoll !== null && (!needsExtraRoll || extraDamageResult !== null)

  const handleLocationRoll = () => {
    setCritRoll(roll2D6())
    setExtraDamageResult(null)
  }

  const handleExtraRoll = () => {
    setExtraDamageResult(rollDice(extraDice, 6).total)
  }

  return (
    <Modal title="Critical Hit" onClose={onClose}>
      <div className="space-y-4">
        <div className="text-center font-mono text-xs text-orange-400">
          ⚠ Effect {attackEffect} ≥ 6 — Critical on {targetName}
        </div>

        {!critRoll ? (
          <button
            onClick={handleLocationRoll}
            className="w-full py-3 bg-orange-900/30 border border-orange-700/50 text-orange-400 font-mono text-lg tracking-widest rounded hover:bg-orange-900/40 transition-colors"
          >
            🎲 ROLL LOCATION (2D6)
          </button>
        ) : (
          <div className="space-y-3">
            {/* Location dice */}
            <div className="bg-slate-800 rounded p-3 text-center font-mono">
              <div className="flex justify-center gap-3 mb-2">
                {critRoll.results.map((r, i) => (
                  <span
                    key={i}
                    className="w-10 h-10 bg-slate-700 rounded border border-slate-600 flex items-center justify-center text-lg text-white font-bold"
                  >
                    {r}
                  </span>
                ))}
              </div>
              <p className="text-orange-400 font-bold text-sm">{location}</p>
              {isMaxSeverity ? (
                <p className="text-red-400 text-xs mt-1">
                  MAX SEVERITY — 6D extra damage
                </p>
              ) : (
                <p className="text-slate-400 text-xs mt-1">
                  Severity {effectiveSeverity}
                  {existingCrit && (
                    <span className="text-slate-500"> (was {existingCrit.severity}, stacking)</span>
                  )}
                </p>
              )}
            </div>

            {/* Effect description */}
            {effect && (
              <div className="bg-red-950/30 border border-red-700/40 rounded p-3 font-mono text-xs text-red-300">
                {effect.description}
              </div>
            )}

            {/* Extra damage roll (hull crit or max-severity overflow) */}
            {needsExtraRoll && extraDamageResult === null && (
              <button
                onClick={handleExtraRoll}
                className="w-full py-2 bg-red-900/30 border border-red-700/50 text-red-400 font-mono text-sm tracking-widest rounded hover:bg-red-900/40 transition-colors"
              >
                🎲 ROLL {extraDice}D EXTRA DAMAGE
              </button>
            )}
            {needsExtraRoll && extraDamageResult !== null && (
              <div className="bg-slate-800 rounded p-2 text-center font-mono text-xs">
                Extra damage:{' '}
                <span className="text-red-400 font-bold text-xl">{extraDamageResult}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setCritRoll(null); setExtraDamageResult(null) }}
                className="flex-1 py-2 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-slate-500"
              >
                REROLL
              </button>
              <button
                onClick={onApply}
                disabled={!canApply}
                className="flex-1 py-2 bg-orange-900/30 border border-orange-700/50 text-orange-400 font-mono text-xs rounded hover:bg-orange-900/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                APPLY CRITICAL
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Root component — owns state, computes derived DMs ────────────────────

export function AttackModal() {
  const closeModal     = useUiStore((s) => s.closeModal)
  const modalPayload   = useUiStore((s) => s.modalPayload)
  const applyDamage    = useBattleStore((s) => s.applyDamage)
  const addCriticalHit = useBattleStore((s) => s.addCriticalHit)

  const [step, setStep]                 = useState('config')
  const [targetId, setTargetId]         = useState('')
  const [weaponKey, setWeaponKey]       = useState('')
  const [attackResult, setAttackResult]       = useState(null)
  const [damageResult, setDamageResult]       = useState(null)
  const [manualRangeBand, setManualRangeBand] = useState(null)
  const [critRoll, setCritRoll]               = useState(null)
  const [extraDamageResult, setExtraDamageResult] = useState(null)

  const { attacker, enemies, target, weapon, availableWeapons, distance, rangeBand, combatMode, dmBreakdown } =
    useAttackSetup(modalPayload?.shipId ?? null, targetId, weaponKey, manualRangeBand)

  if (!attacker) return null

  const handleApplyDamage = () => {
    if (!damageResult || !target) return
    applyDamage(target.id, damageResult.total, `${weaponKey} from ${attacker.profile.name}`)

    if (attackResult?.hit) {
      if (BEAM_WEAPONS.includes(weaponKey)) {
        emitEffect('laser_ray', {
          duration: 300,
          fromHex:    attacker.position,
          toHex:      target.position,
          weaponType: weaponKey,
        })
      }
      emitEffect('impact_burst', {
        duration:  500,
        hex:       target.position,
        shipColor: target.color,
      })
    }

    if (isCriticalHit(attackResult?.effect ?? 0)) {
      setStep('critical')
    } else {
      closeModal()
    }
  }

  const handleApplyCritical = () => {
    if (!critRoll || !target) return
    const location       = getCriticalLocation(critRoll.total)
    const attackSeverity = getCriticalSeverity(attackResult.effect)
    const existingCrit   = target.criticalHits.find((c) => c.system === location)
    const isMaxSeverity  = (existingCrit?.severity ?? 0) >= 6
    const effectiveSeverity = existingCrit && !isMaxSeverity
      ? Math.max(attackSeverity, existingCrit.severity + 1)
      : attackSeverity
    const effect = getCriticalEffect(location, isMaxSeverity ? 6 : effectiveSeverity)

    emitEffect('critical_flash', {
      duration: 600,
      hex:    target.position,
      system: location,
    })

    if (isMaxSeverity) {
      if (extraDamageResult !== null) {
        applyDamage(target.id, extraDamageResult, `Critical ${location} (Sev. max)`)
      }
    } else {
      addCriticalHit(target.id, { system: location, severity: effectiveSeverity })
      if (effect?.mechanic === 'hull_extra_damage' && extraDamageResult !== null) {
        applyDamage(target.id, extraDamageResult, `Critical Hull (Sev. ${effectiveSeverity})`)
      }
    }
    closeModal()
  }

  if (step === 'config') {
    return (
      <AttackConfigStep
        enemies={enemies}
        availableWeapons={availableWeapons}
        weaponKey={weaponKey}
        setWeaponKey={setWeaponKey}
        targetId={targetId}
        setTargetId={setTargetId}
        target={target}
        weapon={weapon}
        rangeBand={rangeBand}
        distance={distance}
        combatMode={combatMode}
        manualRangeBand={manualRangeBand}
        setManualRangeBand={setManualRangeBand}
        dmBreakdown={dmBreakdown}
        onNext={() => setStep('roll')}
        onClose={closeModal}
      />
    )
  }

  if (step === 'roll') {
    return (
      <AttackRollStep
        attackerName={attacker.profile.name}
        targetName={target?.profile.name ?? '?'}
        weaponKey={weaponKey}
        dmBreakdown={dmBreakdown}
        attackResult={attackResult}
        setAttackResult={setAttackResult}
        onNext={() => setStep('damage')}
        onClose={closeModal}
      />
    )
  }

  if (step === 'critical') {
    return (
      <AttackCriticalStep
        targetName={target?.profile.name ?? '?'}
        attackEffect={attackResult?.effect ?? 6}
        targetCrits={target?.criticalHits ?? []}
        critRoll={critRoll}
        setCritRoll={setCritRoll}
        extraDamageResult={extraDamageResult}
        setExtraDamageResult={setExtraDamageResult}
        onApply={handleApplyCritical}
        onClose={closeModal}
      />
    )
  }

  return (
    <AttackDamageStep
      damageDice={weapon?.damageDice ?? 1}
      effectBonus={attackResult?.effect ?? 0}
      armor={target?.profile.armor ?? 0}
      damageResult={damageResult}
      setDamageResult={setDamageResult}
      onApply={handleApplyDamage}
      onClose={closeModal}
    />
  )
}
