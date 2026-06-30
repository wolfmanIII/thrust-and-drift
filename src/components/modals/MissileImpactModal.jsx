/**
 * MissileImpactModal — two-step resolution per MgT2e CRB p.173 IMPACT rules.
 *
 * Step 1 — Attack roll at impact (not at launch):
 *   2D6 + DM+1/missile (salvo size) + DM+2 (Smart trait) + Evasive Action DM
 *   Target: 8+.  Effect = total − 8.  Effect < 0 → MISS, no damage.
 *
 * Step 2 — Damage:
 *   Roll diceEach D6 for a single missile/torpedo.
 *   Formula: max(0, roll − armour) × min(Effect, count)
 *
 * Evasive Action (Option A): if target has unspent thrust, GM may declare it;
 *   1 thrust is spent immediately, DM −Pilot applied to this attack roll only.
 *
 * // MgT2e CRB p.173 (IMPACT), p.171 (Evasive Action), HG p.28–31 (weapon stats)
 */

import { useState, useEffect }                           from 'react'
import { Modal }                                         from './Modal.jsx'
import { useBattleStore }                                from '../../store/battleStore.js'
import { rollDice, roll2D6 }                             from '../../utils/dice.js'
import { getEffectiveSkill }                             from '../../utils/crew.js'
import { computeMissileAttackDM, computeMissileImpactDamage, computeIonThrustEffect } from '../../utils/combat.js'
import { DiceInput }                                     from '../forms/DiceInput.jsx'

/** Laser types usable as Point Defence. // MgT2e CRB p.161 */
const LASER_PD = ['Pulse Laser', 'Beam Laser']

// MgT2e HG p.28 (Missile Rack 4D), HG p.30 (Torpedo 6D)
function dicePerUnit(type) {
  return type === 'Torpedo' ? 6 : 4
}

export function MissileImpactModal() {
  const pendingMissileImpacts = useBattleStore((s) => s.pendingMissileImpacts)
  const ships                 = useBattleStore((s) => s.ships)
  const dismissMissileImpact  = useBattleStore((s) => s.dismissMissileImpact)
  const applyDamage           = useBattleStore((s) => s.applyDamage)
  const spendReactionThrust   = useBattleStore((s) => s.spendReactionThrust)
  const markTurretFired       = useBattleStore((s) => s.markTurretFired)
  const addLogEntry           = useBattleStore((s) => s.addLogEntry)

  const [step, setStep]         = useState('attack')   // 'attack' | 'damage'
  const [die1, setDie1]         = useState('')
  const [die2, setDie2]         = useState('')
  const [evasiveActive, setEvasive] = useState(false)
  const [damageRolled, setDamage]   = useState('')

  // PD state — resolved at impact per CRB p.173 (REQ-08)
  const [pdUsedSlots, setPdUsedSlots]       = useState([])
  const [pdDestroyedCount, setPdDestroyedCount] = useState(0)
  const [pdTurretSlot, setPdTurretSlot]     = useState(null)
  const [pdResult, setPdResult]             = useState(null)
  const [pdManualDice, setPdManualDice]     = useState(null)

  const impact = pendingMissileImpacts[0]

  // Reset all local state whenever a new impact becomes active
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional batch reset on impact change
    setStep('attack')
    setDie1('')
    setDie2('')
    setEvasive(false)
    setDamage('')
    setPdUsedSlots([])
    setPdDestroyedCount(0)
    setPdTurretSlot(null)
    setPdResult(null)
    setPdManualDice(null)
  }, [impact?.id])

  if (!impact) return null

  const target   = ships.find((s) => s.id === impact.target)
  const launcher = ships.find((s) => s.id === impact.launchedBy)

  // Stale impact (target removed via undo) — auto-dismiss
  if (!target) {
    dismissMissileImpact(impact.id)
    return null
  }

  const armor      = target.profile.armor ?? 0
  const diceEach   = dicePerUnit(impact.type)
  const pending    = pendingMissileImpacts.length
  const pilotSkill = getEffectiveSkill(target.profile.crew, target.crewAssignments, 'pilot')

  // Compute remaining reaction thrust available to the target
  const _tBasePow = target.basePower ?? target.profile.maxPower ?? 100
  const _tIonCap  = computeIonThrustEffect(target.profile.thrust, target.currentPower ?? _tBasePow, _tBasePow)
  const thrustAvailable = Math.max(0,
    _tIonCap
    + (target.thrustBonusThisRound ?? 0)
    - target.thrustUsedThisRound
    - (target.thrustPenalty ?? 0)
    - (target.evasiveThrust ?? 0)
  )

  // Smart requires TL ≥ 9 AND was not fired at Adjacent/Close range (CRB p.79, p.162)
  const launcherTL    = launcher?.profile.tl ?? 12
  const hasSmart      = impact.hasSmartGuidance ?? (launcherTL >= 9)
  const smartLossReason = !hasSmart
    ? (launcherTL < 9 ? `TL${launcherTL} < 9` : 'Adjacent/Close range')
    : null

  // Point Defence — available laser turrets not yet used in this impact resolution. // CRB p.173
  const pdTurrets = (target.profile.turrets ?? [])
    .filter((t) => !(target.firedTurrets ?? []).includes(t.slot))
    .filter((t) => !pdUsedSlots.includes(t.slot))
    .filter((t) => t.weapons?.some((w) => LASER_PD.includes(w)))
    .map((t) => ({
      slot: t.slot,
      laserBonus: Math.max(0, (t.weapons?.filter((w) => LASER_PD.includes(w)).length ?? 0) - 1),
    }))
  const remainingCount = Math.max(0, impact.count - pdDestroyedCount)
  const isPlayerTarget = target.faction === 'players'

  // Attack DMs — CRB p.173 (use remainingCount after PD)
  const totalDM     = computeMissileAttackDM(remainingCount, hasSmart, evasiveActive ? pilotSkill : 0)
  const smartDM     = hasSmart ? 2 : 0
  const salvoSizeDM = remainingCount
  const evasiveDM  = evasiveActive ? -pilotSkill : 0

  const d1 = parseInt(die1, 10)
  const d2 = parseInt(die2, 10)
  const rollReady  = !isNaN(d1) && d1 >= 1 && d1 <= 6 && !isNaN(d2) && d2 >= 1 && d2 <= 6
  const attackTotal = rollReady ? d1 + d2 + totalDM : null
  const effect      = attackTotal !== null ? attackTotal - 8 : null
  const hit         = effect !== null && effect >= 0

  // Damage (step 2)
  const rawRolled  = parseInt(damageRolled, 10)
  const netPerMiss = isNaN(rawRolled) ? null : Math.max(0, rawRolled - armor)
  const multiplier = effect !== null ? Math.min(effect, remainingCount) : null
  const netDamage  = (!isNaN(rawRolled) && effect !== null)
    ? computeMissileImpactDamage(rawRolled, armor, effect, remainingCount)
    : null

  function handlePdRoll(diceOverride = null) {
    const slot = pdTurretSlot ?? pdTurrets[0]?.slot
    if (!slot) return
    const turret     = target.profile.turrets?.find((t) => t.slot === slot)
    const laserBonus = Math.max(0, (turret?.weapons?.filter((w) => LASER_PD.includes(w)).length ?? 0) - 1)
    const gunner     = getEffectiveSkill(target.profile.crew, target.crewAssignments, 'gunner', slot)
    const rollResult = diceOverride ?? roll2D6()
    const total      = rollResult.total + gunner + laserBonus
    const effect     = total - 8
    // HG p.39: torpedo salvoes halve the Effect of any successful PD, rounded down
    const removed    = impact.type === 'Torpedo'
      ? Math.max(0, Math.floor(effect / 2))
      : Math.max(0, effect)
    const newDestroyed = pdDestroyedCount + removed
    markTurretFired(target.id, slot)
    setPdUsedSlots((prev) => [...prev, slot])
    setPdTurretSlot(null)
    setPdDestroyedCount(newDestroyed)
    setPdResult({ turretSlot: slot, total, effect, missilesRemoved: removed })
    setPdManualDice(null)
    const pdEffectNote = impact.type === 'Torpedo' ? ` (Effect halved — torpedo salvo)` : ''
    const unitLabel    = impact.type === 'Torpedo' ? 'torpedo' : 'missile'
    addLogEntry(`${target.name} Point Defence (T${slot}): total ${total}, Effect ${effect >= 0 ? `+${effect}` : effect}${pdEffectNote} — ${removed} ${unitLabel}${removed !== 1 ? 's' : ''} destroyed.`)
    if (Math.max(0, impact.count - newDestroyed) === 0) {
      addLogEntry(`${target.name} Point Defence destroyed entire salvo.`)
      dismissMissileImpact(impact.id)
    }
  }

  function handleAutoRollAttack() {
    const r = rollDice(2, 6)
    setDie1(String(r.results[0]))
    setDie2(String(r.results[1]))
  }

  function handleEvasiveToggle() {
    if (evasiveActive || thrustAvailable <= 0) return
    spendReactionThrust(target.id, 1)
    setEvasive(true)
  }

  function handleConfirmAttack() {
    if (!rollReady) return
    if (!hit) {
      dismissMissileImpact(impact.id)
    } else {
      setStep('damage')
    }
  }

  function handleApplyDamage() {
    if (netDamage === null) return
    applyDamage(
      impact.target,
      netDamage,
      `${impact.count}× ${impact.type ?? 'Missile'} salvo (${launcher?.name ?? '?'})`,
    )
    dismissMissileImpact(impact.id)
  }

  function handleMiss() {
    dismissMissileImpact(impact.id)
  }

  const dmSign = (n) => (n >= 0 ? `+${n}` : String(n))

  return (
    <Modal>
      <div className="flex flex-col gap-5 min-w-85">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-amber-400 tracking-widest text-sm">
            ⚡ {impact.type === 'Torpedo' ? 'TORPEDO IMPACT' : 'MISSILE IMPACT'}
            {step === 'damage' && ' — DAMAGE'}
          </h2>
          {pending > 1 && (
            <span className="font-mono text-xs text-slate-400">{pending} PENDING</span>
          )}
        </div>

        {/* ── Salvo info ──────────────────────────────────────────── */}
        <div className="bg-slate-800/60 border border-slate-700 rounded px-4 py-3 flex flex-col gap-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">LAUNCHER</span>
            <span className="text-slate-200">{launcher?.name ?? '?'}</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">TARGET</span>
            <span style={{ color: target.color }} className="font-semibold">
              {target.name}
            </span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">SALVO</span>
            <span className="text-amber-300">{impact.count}× {impact.type ?? 'Missile'}</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">HULL</span>
            <span className="text-slate-300">{target.hullCurrent}/{target.profile.hull}</span>
          </div>
        </div>

        {step === 'attack' ? (
          <>
            {/* ── Attack DM breakdown ─────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <p className="font-mono text-xs text-slate-500 tracking-widest">
                ATTACK DMs (CRB p.173)
              </p>
              <div className="bg-slate-800/40 rounded px-3 py-2 flex flex-col gap-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Salvo size ({impact.count} missiles)</span>
                  <span className="text-amber-300">{dmSign(salvoSizeDM)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Smart trait{smartLossReason && <span className="text-slate-600 ml-1">({smartLossReason})</span>}
                  </span>
                  <span className={hasSmart ? 'text-amber-300' : 'text-slate-600'}>{dmSign(smartDM)}</span>
                </div>
                {evasiveActive && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Evasive Action (Pilot {pilotSkill})</span>
                    <span className="text-red-400">{dmSign(evasiveDM)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-700 pt-1 mt-0.5">
                  <span className="text-slate-300">Total DM</span>
                  <span className="text-slate-200 font-bold">{dmSign(totalDM)}</span>
                </div>
              </div>
            </div>

            {/* ── Point Defence ───────────────────────────────────── */}
            {/* CRB p.173: "When a missile salvo reaches its target, the target may attempt
                Point Defence or Evasive Action." — resolved at impact, not at launch. */}
            {(pdTurrets.length > 0 || pdResult) && (
              <div className="border border-amber-700/30 rounded p-3 space-y-2 bg-amber-950/10">
                <p className="font-mono text-xs text-amber-500/70 tracking-widest uppercase">
                  🛡 Point Defence (CRB p.173)
                </p>
                {pdResult && (
                  <div className={`rounded p-2 font-mono text-xs ${pdResult.missilesRemoved > 0 ? 'bg-green-950/30 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                    T{pdResult.turretSlot} · Total {pdResult.total} · Effect {pdResult.effect >= 0 ? `+${pdResult.effect}` : pdResult.effect}
                    {pdResult.missilesRemoved > 0
                      ? ` → ${pdResult.missilesRemoved} ${impact.type === 'Torpedo' ? 'torpedo' : 'missile'}${pdResult.missilesRemoved !== 1 ? 's' : ''} destroyed (${remainingCount} remaining)`
                      : ` → no ${impact.type === 'Torpedo' ? 'torpedoes' : 'missiles'} destroyed`}
                  </div>
                )}
                {pdTurrets.length > 0 && (
                  <div className="space-y-1.5">
                    {pdTurrets.length > 1 && (
                      <div className="flex gap-1 flex-wrap">
                        {pdTurrets.map((t) => (
                          <button
                            key={t.slot}
                            onClick={() => setPdTurretSlot(t.slot)}
                            className={`px-2 py-1 rounded font-mono text-xs border transition-colors ${
                              pdTurretSlot === t.slot
                                ? 'border-amber-500/60 bg-amber-900/30 text-amber-400'
                                : 'border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                          >
                            W{t.slot}{t.laserBonus > 0 && <span className="text-amber-500 ml-1">+{t.laserBonus}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {isPlayerTarget && (
                      <div className="flex items-center gap-2 bg-slate-800/60 rounded px-3 py-1.5">
                        <span className="text-slate-400 font-mono text-xs">2D6:</span>
                        <DiceInput value={null} key={`pd-${pdResult?.turretSlot ?? 'init'}`} onChange={setPdManualDice} />
                      </div>
                    )}
                    <button
                      onClick={() => handlePdRoll(isPlayerTarget ? pdManualDice : null)}
                      disabled={(pdTurrets.length > 1 && !pdTurretSlot) || (isPlayerTarget && !pdManualDice)}
                      className="w-full py-1.5 bg-amber-900/20 border border-amber-700/50 text-amber-400 font-mono text-xs rounded hover:bg-amber-900/30 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
                    >
                      {isPlayerTarget ? 'CONFIRM POINT DEFENCE' : '🎲 ROLL POINT DEFENCE'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Evasive Action toggle ───────────────────────────── */}
            {evasiveActive ? (
              <div className="w-full font-mono text-xs tracking-widest py-2 rounded border border-blue-600/40 bg-blue-900/20 text-blue-300 text-center">
                ✅ EVADING — DM {dmSign(evasiveDM)} applied
              </div>
            ) : (
              <button
                type="button"
                onClick={handleEvasiveToggle}
                disabled={thrustAvailable <= 0}
                className={`w-full font-mono text-xs tracking-widest py-2 rounded border transition-colors ${
                  thrustAvailable <= 0
                    ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                    : 'border-blue-700/60 text-blue-400 hover:bg-blue-900/20'
                }`}
              >
                🛡 EVASIVE ACTION{' '}
                {thrustAvailable <= 0
                  ? '(no thrust available)'
                  : `(spend 1 thrust — DM ${pilotSkill > 0 ? `-${pilotSkill}` : '0'})`}
              </button>
            )}

            {/* ── 2D6 roll entry ──────────────────────────────────── */}
            <div className="flex flex-col gap-2">
              <p className="font-mono text-xs text-slate-400">
                Roll 2D6{' '}
                <span className="text-amber-300">{dmSign(totalDM)}</span>
                {' '}— target{' '}
                <span className="text-slate-200">8+</span>
              </p>
              <div className="flex gap-2">
                <input
                  type="number" min="1" max="6"
                  value={die1} onChange={(e) => setDie1(e.target.value)}
                  placeholder="D1"
                  className="flex-1 bg-slate-900 border border-slate-600 focus:border-(--neon-cyan)/60 rounded px-3 py-2 font-mono text-sm text-white outline-none"
                />
                <input
                  type="number" min="1" max="6"
                  value={die2} onChange={(e) => setDie2(e.target.value)}
                  placeholder="D2"
                  className="flex-1 bg-slate-900 border border-slate-600 focus:border-(--neon-cyan)/60 rounded px-3 py-2 font-mono text-sm text-white outline-none"
                />
                <button
                  type="button" onClick={handleAutoRollAttack}
                  className="px-3 py-2 bg-slate-800 border border-slate-600 text-slate-300 font-mono text-sm rounded hover:border-(--neon-cyan)/60 hover:text-(--neon-cyan) transition-colors"
                  title="Auto-roll 2D6"
                >
                  🎲
                </button>
              </div>

              {attackTotal !== null && (
                <div className="flex justify-between items-center bg-slate-800/40 rounded px-3 py-2 font-mono text-sm">
                  <span className="text-slate-400">TOTAL / EFFECT</span>
                  <span className={hit ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                    {attackTotal} / {dmSign(effect)} — {hit ? 'HIT' : 'MISS'}
                  </span>
                </div>
              )}
            </div>

            {/* ── Confirm / dismiss ───────────────────────────────── */}
            <div className="flex flex-col gap-2">
              <button
                disabled={!rollReady}
                onClick={handleConfirmAttack}
                className={`w-full font-mono text-xs tracking-widest py-2.5 rounded transition-colors ${
                  !rollReady
                    ? 'bg-slate-800/40 border border-slate-700 text-slate-400 cursor-not-allowed'
                    : hit
                      ? 'bg-amber-900/40 border border-amber-600/60 text-amber-300 hover:bg-amber-800/50'
                      : 'bg-slate-800/60 border border-slate-600 text-slate-400 hover:bg-slate-700/60'
                }`}
              >
                {!rollReady
                  ? 'ENTER DICE ROLL'
                  : hit
                    ? `HIT — EFFECT ${dmSign(effect)} — ROLL DAMAGE →`
                    : 'MISS — DISMISS'}
              </button>
              <button
                onClick={handleMiss}
                className="w-full bg-slate-800/60 border border-slate-600 text-slate-400 font-mono text-xs tracking-widest py-2 rounded hover:bg-slate-700/60 transition-colors"
              >
                MISS / INTERCEPTED — DISMISS
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ── Damage roll (single missile) ────────────────────── */}
            <div className="flex flex-col gap-2">
              <p className="font-mono text-xs text-slate-400 leading-relaxed">
                Roll{' '}
                <span className="text-amber-300">{diceEach}D6</span>
                {' '}for one {impact.type === 'Torpedo' ? 'torpedo' : 'missile'}.{' '}
                Multiply net by{' '}
                <span className="text-amber-300">
                  min(Effect {dmSign(effect)}, {impact.count} missiles) = ×{multiplier}
                </span>.
              </p>
              <div className="flex gap-2">
                <input
                  type="number" min="0"
                  value={damageRolled} onChange={(e) => setDamage(e.target.value)}
                  placeholder="0"
                  className="flex-1 bg-slate-900 border border-slate-600 focus:border-(--neon-cyan)/60 rounded px-3 py-2 font-mono text-sm text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => setDamage(String(rollDice(diceEach, 6).total))}
                  className="px-3 py-2 bg-slate-800 border border-slate-600 text-slate-300 font-mono text-sm rounded hover:border-(--neon-cyan)/60 hover:text-(--neon-cyan) transition-colors"
                  title={`Auto-roll ${diceEach}D6`}
                >
                  🎲
                </button>
              </div>

              {/* ── Damage breakdown ────────────────────────────────── */}
              <div className="flex flex-col gap-1 bg-slate-800/40 rounded px-3 py-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Damage roll ({diceEach}D6)</span>
                  <span className="text-slate-300">
                    {isNaN(rawRolled) ? '—' : rawRolled}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Armour</span>
                  <span className="text-slate-300">−{armor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Per missile (min 0)</span>
                  <span className="text-slate-300">
                    {netPerMiss !== null ? netPerMiss : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Effect multiplier</span>
                  <span className="text-amber-300">×{multiplier ?? '—'}</span>
                </div>
                <div className="flex justify-between border-t border-slate-700 pt-1 mt-0.5">
                  <span className="text-slate-300 tracking-widest">NET DAMAGE</span>
                  <span className={
                    netDamage === null
                      ? 'text-slate-400'
                      : netDamage > 0
                        ? 'text-red-400 font-bold'
                        : 'text-slate-400'
                  }>
                    {netDamage === null ? '—' : netDamage}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Confirm / dismiss ───────────────────────────────── */}
            <div className="flex flex-col gap-2">
              <button
                disabled={netDamage === null}
                onClick={handleApplyDamage}
                className={`w-full font-mono text-xs tracking-widest py-2.5 rounded transition-colors ${
                  netDamage === null
                    ? 'bg-slate-800/40 border border-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-red-900/40 border border-red-600/60 text-red-300 hover:bg-red-800/50'
                }`}
              >
                APPLY {netDamage !== null ? netDamage : '—'} DAMAGE
              </button>
              <button
                onClick={handleMiss}
                className="w-full bg-slate-800/60 border border-slate-600 text-slate-400 font-mono text-xs tracking-widest py-2 rounded hover:bg-slate-700/60 transition-colors"
              >
                MISS / INTERCEPTED — DISMISS
              </button>
            </div>
          </>
        )}

      </div>
    </Modal>
  )
}
