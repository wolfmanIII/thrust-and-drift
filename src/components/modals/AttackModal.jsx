/**
 * AttackModal — configure → (reactions) → roll → damage → critical.
 * Each step is a focused sub-component; the root component owns shared state.
 * // MgT2e CRB p.163–165, p.171 (Reactions)
 */

import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { WEAPONS } from '../../data/weapons.js'
import { RANGE_BANDS } from '../../data/rangeBands.js'
import { rollAttack, isCriticalHit, getCriticalSeverity, isOutOfRange, getApValue, computeIonThrustEffect } from '../../utils/combat.js'
import { rollDice, roll2D6 } from '../../utils/dice.js'
import { getCriticalLocation, getCriticalEffect } from '../../data/criticalHits.js'
import { useAttackSetup } from './useAttackSetup.js'
import { emitEffect } from '../../utils/effectQueue.js'
import { DiceInput } from '../forms/DiceInput.jsx'
import { getEffectiveSkill } from '../../utils/crew.js'

/** Weapons that fire a visible beam/ray toward the target. */
const BEAM_WEAPONS = [
  'Pulse Laser', 'Beam Laser', 'Particle Beam', 'Railgun', 'Fusion Gun', 'Plasma Gun',
  'Pulse Laser Barbette', 'Beam Laser Barbette', 'Particle Barbette',
  'Fusion Barbette', 'Plasma Barbette', 'Railgun Barbette',
]
/** Laser weapon types that Disperse Sand can block (CRB p.171). */
const LASER_TYPES = ['Pulse Laser', 'Beam Laser', 'Pulse Laser Barbette', 'Beam Laser Barbette']
/** Laser types usable as Point Defence against missiles. // CRB p.161 */
const LASER_PD = ['Pulse Laser', 'Beam Laser']

/** @typedef {'config'|'roll'|'damage'|'critical'|'missile_pd'} AttackStep */

// ── UI primitive ──────────────────────────────────────────────────────────

function DmRow({ label, value, highlight = false }) {
  const sign = value >= 0 ? '+' : ''
  return (
    <div className={`flex justify-between ${highlight ? 'text-(--neon-cyan) font-bold' : 'text-slate-400'}`}>
      <span>{label}</span>
      <span>{sign}{value}</span>
    </div>
  )
}

// ── Reactions panel (shown in config step) ────────────────────────────────

/**
 * Defender reactions UI: Evasive Action, Point Defence, Disperse Sand.
 * Shown in AttackConfigStep before the action button.
 * Player-controlled defending ships enter physical dice manually (CRB p.171).
 * // MgT2e CRB p.171 — Reactions
 */
function ReactionsPanel({
  target, weaponKey, isPlayerTarget,
  reactionEvasion, setReactionEvasion, availableThrust, targetPilotSkill,
  sandTurrets, sandAmmoLeft, sandTurretSlot, setSandTurretSlot, sandResult, onSandRoll,
}) {
  const [sandManualDice, setSandManualDice] = useState(null)
  const laserAttack = LASER_TYPES.includes(weaponKey)
  // CRB p.171: 1 thrust → dodge 1 attack; DM fixed = −pilotSkill
  const canEvade    = availableThrust >= 1 && targetPilotSkill > 0

  return (
    <div className="border border-amber-700/40 rounded p-3 space-y-3 bg-amber-950/10">
      <p className="font-mono text-xs text-amber-500/70 tracking-widest uppercase">
        🛡 {target.name} — Reactions
      </p>

      {/* Evasive Action — 1 thrust, DM fixed = −pilotSkill (CRB p.171) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between font-mono text-xs text-slate-400">
          <span>Evasive Action <span className="text-slate-400">(CRB p.171)</span></span>
          <span>Pilot {targetPilotSkill} · {availableThrust} thrust avail.</span>
        </div>
        <button
          onClick={() => setReactionEvasion(!reactionEvasion)}
          disabled={!canEvade && !reactionEvasion}
          className={`w-full py-1.5 rounded font-mono text-xs border transition-colors ${
            reactionEvasion
              ? 'border-amber-500/60 bg-amber-900/30 text-amber-400'
              : 'border-slate-700 text-slate-400 hover:border-slate-500'
          } disabled:text-slate-400 disabled:border-slate-600/50 disabled:cursor-not-allowed`}
        >
          {reactionEvasion
            ? `✅ EVADING — DM −${targetPilotSkill} to this attack · 1 thrust`
            : availableThrust < 1
              ? 'NO THRUST — cannot evade'
              : targetPilotSkill === 0
                ? 'PILOT 0 — evasion has no effect'
                : `EVADE (1 thrust → DM −${targetPilotSkill})`}
        </button>
      </div>

      {/* Disperse Sand — laser attacks + target has sandcaster */}
      {laserAttack && sandTurrets.length > 0 && (
        <div className="border-t border-amber-700/20 pt-3 space-y-2">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400">
            <span>Disperse Sand · Ammo: <span className={sandAmmoLeft <= 5 ? 'text-orange-400' : 'text-(--neon-cyan)'}>{sandAmmoLeft}</span></span>
            <span>Gunner turret · +1D+Effect armour vs laser</span>
          </div>
          {sandTurrets.length > 1 && !sandResult && (
            <div className="flex gap-1 flex-wrap">
              {sandTurrets.map((t) => (
                <button
                  key={t.slot}
                  onClick={() => setSandTurretSlot(t.slot)}
                  className={`px-2 py-1 rounded font-mono text-xs border transition-colors ${
                    sandTurretSlot === t.slot
                      ? 'border-amber-500/60 bg-amber-900/30 text-amber-400'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  W{t.slot}
                </button>
              ))}
            </div>
          )}
          {!sandResult ? (
            <div className="space-y-1.5">
              {isPlayerTarget && (
                <div className="flex items-center gap-2 bg-slate-800/60 rounded px-3 py-1.5">
                  <span className="text-slate-400 font-mono text-xs">2D6:</span>
                  <DiceInput value={null} onChange={setSandManualDice} />
                </div>
              )}
              <button
                onClick={() => onSandRoll(isPlayerTarget ? sandManualDice : null)}
                disabled={(sandTurrets.length > 1 && !sandTurretSlot) || (isPlayerTarget && !sandManualDice)}
                className="w-full py-1.5 bg-amber-900/20 border border-amber-700/50 text-amber-400 font-mono text-xs rounded hover:bg-amber-900/30 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
              >
                {isPlayerTarget ? 'CONFIRM DISPERSE SAND' : '🎲 ROLL DISPERSE SAND'}
              </button>
            </div>
          ) : (
            <div className={`rounded p-2 font-mono text-xs ${sandResult.success ? 'bg-sky-950/30 text-sky-400' : 'bg-slate-800 text-slate-400'}`}>
              Total {sandResult.total} · Effect {sandResult.effect >= 0 ? `+${sandResult.effect}` : sandResult.effect}
              {sandResult.success
                ? ` → +${sandResult.bonusArmor} armour (${sandResult.armorRoll}+${sandResult.effect})`
                : ' → no effect'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Step 1: weapon + target configuration ────────────────────────────────

/**
 * @param {{
 *   enemies: object[],
 *   availableWeapons: { weaponName: string, turretSlot: number }[],
 *   weaponKey: string,
 *   selectedTurretSlot: number|null,
 *   setWeaponSelection: Function,
 *   targetId: string,
 *   setTargetId: Function,
 *   target: object|undefined,
 *   weapon: object|null,
 *   rangeBand: string,
 *   distance: number,
 *   dmBreakdown: object,
 *   isMissile: boolean,
 *   missileCount: number,
 *   setMissileCount: Function,
 *   onNext: Function,
 *   onClose: Function,
 * }} props
 */
function AttackConfigStep({
  enemies, availableWeapons,
  weaponKey, selectedTurretSlot, setWeaponSelection, targetId, setTargetId,
  target, weapon, rangeBand, distance, dmBreakdown,
  combatMode, storedBand, manualRangeBand, setManualRangeBand,
  outOfRange, dogfightTie, noPower,
  isMissile, isMissileBarbette, missileCount, setMissileCount, ammoLeft,
  inFlightMissiles, targetMissileId, setTargetMissileId,
  reactions,
  onNext, onClose,
}) {
  const { gunnerSkill, rangeDM, sizeDM, evasiveDM, sensorLockDM, aidGunnersDM = 0, dogfightDM = 0, obstacleCoverDM = 0, torpedoSmallShipDM = 0, totalDM } = dmBreakdown
  // Torpedo salvo capped at 3 per barbette (HG p.31).
  // Missile Rack salvo capped at the number of racks mounted in this turret — a rack is a
  // single mount that launches one missile per round, even inside a mixed-weapon turret
  // (Traveller Companion p.172 / HG p.31 — turret components fire together, not as one weapon).
  const selectedWeaponEntry = availableWeapons.find((w) => w.weaponName === weaponKey && w.turretSlot === selectedTurretSlot)
  const maxSalvo        = weaponKey === 'Torpedo'      ? Math.min(3, ammoLeft)
                         : weaponKey === 'Missile Rack' ? Math.min(selectedWeaponEntry?.linkedCount ?? 1, ammoLeft)
                         : ammoLeft
  const isMissilePdMode = !!targetMissileId
  // When targeting a missile, only PD weapons are valid
  const visibleWeapons  = isMissilePdMode
    ? availableWeapons.filter((w) => LASER_PD.includes(w.weaponName))
    : availableWeapons
  return (
    <Modal title="Attack" onClose={onClose}>
      <div className="space-y-4">
        {noPower && (
          <div className="bg-red-950/40 border border-red-500/40 rounded px-3 py-2 font-mono text-xs text-red-400">
            ⚡ POWER OFFLINE — all weapons unavailable. Restore power before attacking. (HG p.30)
          </div>
        )}
        {dogfightTie && (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded px-3 py-2 font-mono text-xs text-amber-400">
            ⚠ Dogfight tie — fixed weapons unavailable (barbettes, bays)
          </div>
        )}
        {/* Weapon select */}
        <div>
          <p className="text-slate-400 font-mono text-xs mb-1.5">
            Weapon{isMissilePdMode ? ' — Point Defence only' : ''}
          </p>
          <div className="flex flex-col gap-1">
            {visibleWeapons.length === 0 && (
              <p className="text-slate-400 font-mono text-xs italic">
                {isMissilePdMode ? 'No PD lasers available (Pulse/Beam only).' : 'No offensive weapons available.'}
              </p>
            )}
            {visibleWeapons.map((w) => {
              const wDef = WEAPONS[w.weaponName]
              const wOutOfRange = target && wDef ? isOutOfRange(wDef.maxRange, rangeBand) : false
              const isSelected  = weaponKey === w.weaponName && selectedTurretSlot === w.turretSlot
              return (
                <button
                  key={`${w.turretSlot}-${w.weaponName}`}
                  onClick={() => setWeaponSelection(w.weaponName, w.turretSlot, w.damageDiceBonus ?? 0)}
                  className={`text-left px-3 py-1.5 rounded font-mono text-xs border transition-colors ${
                    isSelected
                      ? 'border-(--neon-cyan)/60 bg-(--neon-cyan)/10 text-(--neon-cyan)'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span>
                      <span className="text-slate-400 mr-1.5">W{w.turretSlot}</span>
                      {w.weaponName}
                      {(w.linkedCount ?? 1) > 1 && (
                        <span className="ml-1.5 text-amber-400/80">×{w.linkedCount}</span>
                      )}
                    </span>
                    {wOutOfRange && (
                      <span className="text-red-500 font-bold tracking-widest">OUT OF RANGE</span>
                    )}
                  </span>
                  {wDef && (
                    <span className="text-slate-400">
                      {['Missile Rack', 'Missile Barbette', 'Torpedo'].includes(w.weaponName) ? (
                        w.weaponName === 'Missile Barbette' ? 'Guided · 4D dmg/missile · Salvo 5 · 25 ammo' :
                        w.weaponName === 'Torpedo'          ? 'Guided · 6D dmg/torpedo · Salvo 1–3 · 3 ammo' :
                                                              'Guided · 4D dmg/missile · Special'
                      ) : (
                        <>
                          DM {wDef.attackDM >= 0 ? `+${wDef.attackDM}` : wDef.attackDM}
                          {' · '}{wDef.damageDice}D{(w.damageDiceBonus ?? 0) > 0 ? `+${w.damageDiceBonus}` : ''} dmg{' · '}max {wDef.maxRange}
                        </>
                      )}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Target select */}
        <div>
          <p className="text-slate-400 font-mono text-xs mb-1.5">Target</p>
          <div className="flex flex-col gap-1">
            {enemies.map((e) => (
              <button
                key={e.id}
                onClick={() => setTargetId(e.id)}
                className={`flex items-center gap-2 text-left px-3 py-1.5 rounded font-mono text-xs border transition-colors ${
                  targetId === e.id
                    ? 'border-(--neon-cyan)/60 bg-(--neon-cyan)/10 text-(--neon-cyan)'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                <span>{e.name}</span>
                {target?.id === e.id && combatMode === 'vectorial' && (
                  <span className="ml-auto text-slate-400">{rangeBand} ({distance} hex)</span>
                )}
              </button>
            ))}
          </div>

          {/* In-flight hostile missile salvos — Point Defence targets */}
          {inFlightMissiles.length > 0 && (
            <div className="mt-2">
              <p className="text-slate-500 font-mono text-xs mb-1">— Missile salvos in flight (PD) —</p>
              <div className="flex flex-col gap-1">
                {inFlightMissiles.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setTargetMissileId(m.id)}
                    className={`flex items-center gap-2 text-left px-3 py-1.5 rounded font-mono text-xs border transition-colors ${
                      targetMissileId === m.id
                        ? 'border-amber-500/60 bg-amber-900/20 text-amber-300'
                        : 'border-slate-700 text-slate-400 hover:border-amber-700/50'
                    }`}
                  >
                    <span className="text-amber-400">🚀</span>
                    <span>{m.launcherName} · {m.count}× {m.type}</span>
                    <span className="ml-auto text-slate-500">→ {m.targetName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Missile count */}
        {isMissile && (
          <div>
            {isMissileBarbette ? (
              <p className="text-slate-400 font-mono text-xs">
                Fixed salvo: <span className="text-(--neon-cyan) font-bold">{missileCount}</span> missiles
                {' · '}Ammo: <span className={ammoLeft === 0 ? 'text-red-400' : 'text-(--neon-cyan)'}>{ammoLeft}</span>/25
              </p>
            ) : (
              <>
                <p className="text-slate-400 font-mono text-xs mb-1.5">
                  {weaponKey === 'Torpedo' ? 'Torpedoes in salvo' : 'Missiles in salvo'} (1–{maxSalvo})
                  {' · '}Ammo: <span className={ammoLeft === 0 ? 'text-red-400' : 'text-(--neon-cyan)'}>{ammoLeft}</span>
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMissileCount((c) => Math.max(1, c - 1))}
                    disabled={ammoLeft === 0}
                    className="w-8 h-8 bg-slate-800 border border-slate-600 text-slate-300 font-mono rounded hover:border-slate-400 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
                  >
                    −
                  </button>
                  <span className="text-(--neon-cyan) font-mono font-bold text-xl w-8 text-center">
                    {missileCount}
                  </span>
                  <button
                    onClick={() => setMissileCount((c) => Math.min(maxSalvo, c + 1))}
                    disabled={ammoLeft === 0}
                    className="w-8 h-8 bg-slate-800 border border-slate-600 text-slate-300 font-mono rounded hover:border-slate-400 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                  <span className="text-slate-400 font-mono text-xs ml-2">
                    {weaponKey === 'Torpedo' ? 'torpedoes · guided munitions' : 'missiles · guided munitions'}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Range band selector — basic mode, non-missile, no stored band */}
        {!isMissile && combatMode === 'basic' && target && !storedBand && (
          <div>
            <p className="text-slate-400 font-mono text-xs mb-1.5">Range (manual — set via Manoeuvre phase)</p>
            <div className="grid grid-cols-3 gap-1">
              {RANGE_BANDS.map(({ label }) => (
                <button
                  key={label}
                  onClick={() => setManualRangeBand(label)}
                  className={`px-2 py-1 rounded font-mono text-xs border transition-colors ${
                    (manualRangeBand ?? 'Medium') === label
                      ? 'border-(--neon-cyan)/60 bg-(--neon-cyan)/10 text-(--neon-cyan)'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Range band from store — basic mode, shown as read-only */}
        {!isMissile && combatMode === 'basic' && target && storedBand && (
          <div className="flex items-center justify-between bg-slate-800/60 rounded px-3 py-1.5">
            <span className="font-mono text-xs text-slate-400">Range (from Manoeuvre phase)</span>
            <span className="font-mono text-xs text-yellow-400">{storedBand}</span>
          </div>
        )}

        {/* DM summary — non-missile weapons only */}
        {!isMissile && weapon && target && (
          <div className="bg-slate-800 rounded p-3 font-mono text-xs space-y-0.5">
            <p className="text-slate-400 mb-2">DM Summary (target: 8+)</p>
            <DmRow label="Gunner" value={gunnerSkill} />
            <DmRow label={`Weapon (${weaponKey})`} value={weapon.attackDM} />
            <DmRow label={`Range (${rangeBand})`} value={rangeDM} />
            <DmRow label="Target size" value={sizeDM} />
            {evasiveDM !== 0 && <DmRow label="Evasion" value={evasiveDM} />}
            {sensorLockDM !== 0 && <DmRow label="Sensor Lock" value={sensorLockDM} />}
            {aidGunnersDM !== 0 && <DmRow label="Aid Gunners" value={aidGunnersDM} />}
            {dogfightDM !== 0 && <DmRow label="Dogfight" value={dogfightDM} />}
            {obstacleCoverDM !== 0 && <DmRow label="Field cover" value={obstacleCoverDM} />}
            {torpedoSmallShipDM !== 0 && <DmRow label="Torpedo vs <2kt" value={torpedoSmallShipDM} />}
            <div className="border-t border-slate-700 mt-1 pt-1">
              <DmRow label="Total DM" value={totalDM} highlight />
            </div>
          </div>
        )}

        {!isMissile && outOfRange && weapon && (
          <p className="text-red-500 font-mono text-xs text-center">
            {weapon.label} max range: {weapon.maxRange} — target is at {rangeBand}
          </p>
        )}

        {/* Defender reactions — direct attacks only; missiles react at impact (CRB p.173, REQ-08) */}
        {weapon && target && reactions && !isMissile && (
          <ReactionsPanel
            target={target}
            weaponKey={weaponKey}
            isPlayerTarget={target?.faction === 'players'}
            reactionEvasion={reactions.evasion}
            setReactionEvasion={reactions.setEvasion}
            availableThrust={reactions.availableThrust}
            targetPilotSkill={reactions.targetPilotSkill}
            sandTurrets={reactions.sandTurrets}
            sandAmmoLeft={reactions.sandAmmoLeft}
            sandTurretSlot={reactions.sandTurretSlot}
            setSandTurretSlot={reactions.setSandTurretSlot}
            sandResult={reactions.sandResult}
            onSandRoll={reactions.onSandRoll}
          />
        )}

        {isMissilePdMode ? (
          <button
            onClick={onNext}
            disabled={!weapon || !targetMissileId || !LASER_PD.includes(weaponKey)}
            className="w-full py-2 bg-blue-900/30 border border-blue-700/50 text-blue-400 font-mono text-sm tracking-widest rounded hover:bg-blue-900/40 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
          >
            🛡 INTERCEPT →
          </button>
        ) : isMissile ? (
          <button
            onClick={onNext}
            disabled={!weapon || !target || ammoLeft === 0}
            className="w-full py-2 bg-red-900/30 border border-red-700/50 text-red-400 font-mono text-sm tracking-widest rounded hover:bg-red-900/40 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
          >
            {ammoLeft === 0 ? '🚨 NO AMMO' : '🚀 LAUNCH SALVO →'}
          </button>
        ) : (
          <button
            onClick={onNext}
            disabled={!weapon || !target || outOfRange || (combatMode === 'basic' && !storedBand && !manualRangeBand)}
            className="w-full py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-sm tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
          >
            ROLL ATTACK →
          </button>
        )}
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
 *   isPlayer: boolean,
 *   dmBreakdown: { gunnerSkill: number, weaponDM: number, rangeDM: number, sizeDM: number, evasiveDM: number, sensorLockDM: number, totalDM: number },
 *   attackResult: object|null,
 *   setAttackResult: Function,
 *   onNext: Function,
 *   onClose: Function,
 * }} props
 */
function AttackRollStep({
  attackerName, targetName, weaponKey,
  isPlayer,
  dmBreakdown,
  attackResult, setAttackResult, onNext, onClose, onMissClose,
}) {
  const { gunnerSkill, weaponDM, rangeDM, sizeDM, evasiveDM, sensorLockDM, aidGunnersDM = 0, dogfightDM = 0, obstacleCoverDM = 0, torpedoSmallShipDM = 0, totalDM } = dmBreakdown
  const [manualDice, setManualDice] = useState(null)

  const handleRoll = (diceOverride = null) => {
    const result = rollAttack({
      gunnerSkill,
      dexDM: 0,
      aidGunnersDM,
      rangeDM,
      weaponDM,
      targetSizeDM: sizeDM,
      evasiveDM,
      sensorLockDM,
      dogfightDM,
      obstacleCoverDM,
      torpedoSmallShipDM,
      diceOverride,
    })
    setAttackResult(result)
  }

  return (
    <Modal title="Attack Roll" onClose={onClose}>
      <div className="space-y-4">
        <div className="text-center font-mono text-xs text-slate-400">
          {attackerName} → {targetName} with {weaponKey}
        </div>

        {!attackResult ? (
          isPlayer ? (
            /* Player: manual dice entry */
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 bg-slate-800 rounded px-4 py-3">
                <span className="text-slate-400 font-mono text-xs mr-2">2D6:</span>
                <DiceInput value={null} onChange={setManualDice} />
              </div>
              <button
                onClick={() => handleRoll(manualDice)}
                disabled={!manualDice}
                className="w-full py-3 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-lg tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
              >
                CONFIRM ROLL
              </button>
            </div>
          ) : (
            /* NPC: auto-roll */
            <button
              onClick={() => handleRoll(null)}
              className="w-full py-3 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-lg tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors"
            >
              🎲 ROLL 2D6
            </button>
          )
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
                🚨 CRITICAL HIT (Effect {attackResult.effect} ≥ 6)
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
                  className="flex-1 py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-xs rounded hover:bg-(--neon-cyan)/20"
                >
                  CALCULATE DAMAGE →
                </button>
              ) : (
                <button
                  onClick={onMissClose ?? onClose}
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

// ── Step 3-ion: Ion Cannon disruption ────────────────────────────────────

/**
 * @param {{
 *   weapon: object,
 *   target: object,
 *   attackEffect: number,
 *   isPlayer: boolean,
 *   onApply: (ionDamage: number, ionRounds: number) => void,
 *   onClose: Function,
 * }} props
 */
function IonDamageStep({ weapon, target, attackEffect, isPlayer, onApply, onClose }) {
  const [ionRoll, setIonRoll]       = useState(null)   // raw NbD sum
  const [roundsRoll, setRoundsRoll] = useState(null)   // D3 if effect ≥ 6
  const [manualRaw, setManualRaw]   = useState('')
  const [manualRounds, setManualRounds] = useState('')

  const damageDice     = weapon?.damageDice     ?? 2
  const damageMultiple = weapon?.damageMultiple ?? 10
  const minRoll        = damageDice
  const maxRoll        = damageDice * 6
  const rollLabel      = `${damageDice}D × ${damageMultiple}`

  // Effect ≥ 6 → duration is D3 rounds. // MgT2e HG p.30
  const needsRoundsRoll = attackEffect >= 6
  const ionDamage = ionRoll !== null ? ionRoll * damageMultiple : 0
  const ionRounds = needsRoundsRoll ? (roundsRoll ?? null) : 1
  const canApply  = ionRoll !== null && ionRounds !== null

  const isHardened = target?.hardened ?? false
  const basePow    = target?.basePower ?? target?.profile?.maxPower ?? 100
  const curPow     = target?.currentPower ?? basePow
  const baseBw     = target?.baseBandwidth ?? target?.profile?.computerBandwidth ?? 0
  const curBw      = target?.currentBandwidth ?? baseBw

  const handleAutoRoll = () => {
    const r = rollDice(damageDice, 6)
    setIonRoll(r.total)
    if (!needsRoundsRoll) return
    setRoundsRoll(Math.ceil(Math.random() * 3))
  }

  const handleManualConfirm = () => {
    const raw = Number(manualRaw)
    if (!raw || raw < minRoll || raw > maxRoll) return
    setIonRoll(raw)
    if (needsRoundsRoll) {
      const r = Number(manualRounds)
      if (!r) return
      setRoundsRoll(Math.max(1, Math.min(3, r)))
    }
  }

  const targetName = target?.name ?? '?'
  const weaponLabel = weapon?.label ?? 'Ion Cannon'

  return (
    <Modal title="Ion Disruption" onClose={onClose}>
      <div className="space-y-4">
        {isHardened ? (
          <div className="bg-slate-800 border border-slate-600 rounded px-4 py-3 text-center font-mono text-xs text-slate-400">
            🛡 HARDENED SYSTEMS — Ion weapons have no effect on {targetName}.<br />
            <span className="text-slate-500">/fib computer designation (FAQ HG 2022 p.1)</span>
          </div>
        ) : (
          <>
            <div className="bg-blue-950/30 border border-blue-700/40 rounded px-4 py-3 text-center font-mono text-xs text-blue-300">
              ⚡ {weaponLabel.toUpperCase()} HIT — no hull damage<br />
              <span className="text-slate-400">
                Roll {rollLabel} ignoring armour — deducted from Power + bandwidth.<br />
                Duration: {needsRoundsRoll ? 'D3 rounds (Effect ≥ 6)' : '1 round'} (HG p.30)
              </span>
            </div>

            <div className="text-center font-mono text-xs text-slate-400">
              Roll {rollLabel} → Power reduction on {targetName}
            </div>

            {ionRoll === null ? (
              isPlayer ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-slate-800 rounded px-4 py-3">
                    <span className="text-slate-400 font-mono text-xs">{rollLabel} ion power:</span>
                    <input
                      type="number" min={minRoll} max={maxRoll} value={manualRaw}
                      onChange={(e) => setManualRaw(e.target.value)}
                      className="w-20 bg-slate-700 border border-slate-600 text-(--neon-cyan) font-mono text-lg rounded text-center px-2 py-1 focus:outline-none focus:border-(--neon-cyan)/60"
                      placeholder="—"
                    />
                  </div>
                  {needsRoundsRoll && (
                    <div className="flex items-center gap-3 bg-slate-800 rounded px-4 py-3">
                      <span className="text-slate-400 font-mono text-xs">D3 rounds:</span>
                      <input
                        type="number" min="1" max="3" value={manualRounds}
                        onChange={(e) => setManualRounds(e.target.value)}
                        className="w-20 bg-slate-700 border border-slate-600 text-(--neon-cyan) font-mono text-lg rounded text-center px-2 py-1 focus:outline-none focus:border-(--neon-cyan)/60"
                        placeholder="—"
                      />
                    </div>
                  )}
                  <button
                    onClick={handleManualConfirm}
                    disabled={!manualRaw || (needsRoundsRoll && !manualRounds)}
                    className="w-full py-2 bg-blue-900/30 border border-blue-700/50 text-blue-400 font-mono text-sm tracking-widest rounded hover:bg-blue-900/40 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
                  >
                    CONFIRM
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAutoRoll}
                  className="w-full py-3 bg-blue-900/30 border border-blue-700/50 text-blue-400 font-mono text-lg tracking-widest rounded hover:bg-blue-900/40 transition-colors"
                >
                  🎲 ROLL ION POWER
                </button>
              )
            ) : (
              <div className="space-y-3">
                <div className="bg-slate-800 rounded p-4 text-center font-mono text-xs space-y-1">
                  <p className="text-slate-400">{rollLabel}: roll {ionRoll} × {damageMultiple}</p>
                  <p className="text-blue-400 font-bold text-2xl">−{ionDamage} POWER</p>
                  <p className="text-slate-400">
                    Power: {curPow} → {Math.max(0, curPow - ionDamage)} / {basePow}
                  </p>
                  {baseBw > 0 && (
                    <p className="text-slate-400">
                      Bandwidth: {curBw} → {Math.max(0, curBw - ionDamage)} / {baseBw}
                      {curBw - ionDamage <= 0 ? ' — COMMS DOWN' : ''}
                    </p>
                  )}
                  <p className="text-slate-400">for {ionRounds} round{ionRounds !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => { setIonRoll(null); setRoundsRoll(null); setManualRaw(''); setManualRounds('') }}
                  className="w-full py-2 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-slate-500"
                >
                  REROLL
                </button>
                <button
                  disabled={!canApply}
                  onClick={() => onApply(ionDamage, ionRounds)}
                  className="w-full py-3 bg-blue-900/40 border border-blue-600/60 text-blue-300 font-mono text-sm tracking-widest rounded hover:bg-blue-800/50 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
                >
                  ⚡ APPLY ION DISRUPTION
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

// ── Step 3-pd: Point Defence against in-flight missile salvo ─────────────

/**
 * Standalone PD attack step used when a player targets an in-flight missile
 * salvo during the Attack phase. Same mechanic as the PD reaction.
 * // MgT2e CRB p.161 — Point Defence (Attack phase)
 * @param {{
 *   missile:      object,
 *   launcherName: string,
 *   targetName:   string,
 *   attacker:     object,
 *   weaponKey:    string,
 *   turretSlot:   number|null,
 *   isPlayer:     boolean,
 *   onApply:      (removed: number) => void,
 *   onClose:      Function,
 * }} props
 */
function MissilePdStep({ missile, launcherName, targetName, attacker, turretSlot, isPlayer, onApply, onClose }) {
  const [pdRoll,     setPdRoll]     = useState(null)
  const [manualRaw,  setManualRaw]  = useState('')

  const turret     = attacker.profile.turrets?.find((t) => t.slot === turretSlot)
  const gunner     = getEffectiveSkill(attacker.profile.crew, attacker.crewAssignments, 'gunner', turretSlot)
  const laserBonus = Math.max(0, (turret?.weapons?.filter((w) => LASER_PD.includes(w)).length ?? 0) - 1)

  const total    = pdRoll !== null ? pdRoll + gunner + laserBonus : null
  const effect   = total !== null ? total - 8 : null
  const removed  = effect !== null ? Math.max(0, effect) : null
  const canApply = removed !== null

  const handleAutoRoll = () => setPdRoll(roll2D6().total)
  const handleManualConfirm = () => {
    const v = Number(manualRaw)
    if (v >= 2 && v <= 12) setPdRoll(v)
  }

  return (
    <Modal title="Point Defence — In-flight Intercept" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-blue-950/30 border border-blue-700/40 rounded px-4 py-3 font-mono text-xs text-blue-300 text-center">
          🎯 TARGETING IN-FLIGHT MISSILE SALVO<br />
          <span className="text-slate-400">
            {launcherName} · {missile.count} × {missile.type} · targeting {targetName}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
          <div className="bg-slate-800 rounded p-2">
            <p className="text-slate-400">Gunner</p>
            <p className="text-(--neon-cyan) font-bold">{gunner >= 0 ? `+${gunner}` : gunner}</p>
          </div>
          <div className="bg-slate-800 rounded p-2">
            <p className="text-slate-400">T{turretSlot} laser bonus</p>
            <p className="text-(--neon-cyan) font-bold">{laserBonus >= 0 ? `+${laserBonus}` : laserBonus}</p>
          </div>
          <div className="bg-slate-800 rounded p-2">
            <p className="text-slate-400">Target</p>
            <p className="text-(--neon-cyan) font-bold">8+</p>
          </div>
        </div>

        {pdRoll === null ? (
          isPlayer ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-slate-800 rounded px-4 py-3">
                <span className="text-slate-400 font-mono text-xs">2D6:</span>
                <input
                  type="number" min="2" max="12" value={manualRaw}
                  onChange={(e) => setManualRaw(e.target.value)}
                  className="w-20 bg-slate-700 border border-slate-600 text-(--neon-cyan) font-mono text-lg rounded text-center px-2 py-1 focus:outline-none focus:border-(--neon-cyan)/60"
                  placeholder="—"
                />
                <button
                  type="button"
                  onClick={() => setManualRaw(roll2D6().total.toString())}
                  className="text-slate-400 hover:text-(--neon-cyan) font-mono text-sm transition-colors"
                  title="Auto-roll"
                  aria-label="Auto-roll 2D6"
                >
                  🎲
                </button>
              </div>
              <button
                onClick={handleManualConfirm}
                disabled={!manualRaw}
                className="w-full py-2 bg-blue-900/30 border border-blue-700/50 text-blue-400 font-mono text-sm tracking-widest rounded hover:bg-blue-900/40 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
              >
                CONFIRM
              </button>
            </div>
          ) : (
            <button onClick={handleAutoRoll} className="w-full py-3 bg-blue-900/30 border border-blue-700/50 text-blue-400 font-mono text-lg tracking-widest rounded hover:bg-blue-900/40 transition-colors">
              🎲 ROLL PD ATTACK
            </button>
          )
        ) : (
          <div className="space-y-3">
            <div className="bg-slate-800 rounded p-4 text-center font-mono">
              <p className="text-slate-400 text-xs">2D6 ({pdRoll}) + Gunner ({gunner}) + Bonus ({laserBonus}) = <span className="text-white font-bold">{total}</span></p>
              <p className={`font-bold text-2xl mt-1 ${removed > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {removed > 0 ? `HIT — ${removed} missile${removed !== 1 ? 's' : ''} destroyed` : 'MISS'}
              </p>
              {removed > 0 && missile.count - removed <= 0 && (
                <p className="text-green-400 text-xs mt-1">✅ Salvo fully destroyed</p>
              )}
            </div>
            <button onClick={() => { setPdRoll(null); setManualRaw('') }} className="w-full py-1.5 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-slate-500">
              REROLL
            </button>
            <button
              disabled={!canApply}
              onClick={() => onApply(removed)}
              className="w-full py-3 bg-blue-900/40 border border-blue-600/60 text-blue-300 font-mono text-sm tracking-widest rounded hover:bg-blue-800/50 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
            >
              🛡 APPLY PD RESULT
            </button>
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
 *   apReduction: number,
 *   damageMultiple: number,
 *   damageResult: object|null,
 *   setDamageResult: Function,
 *   onApply: Function,
 *   onClose: Function,
 * }} props
 */
function AttackDamageStep({ damageDice, effectBonus, linkedBonus = 0, armor, apReduction = 0, damageMultiple = 1, isPlayer, damageResult, setDamageResult, onApply, onClose }) {
  const [manualRaw, setManualRaw] = useState('')

  // AP reduces effective armour before damage, multiplier applied after. // MgT2e HG p.28–29
  const effectiveArmor = Math.max(0, armor - apReduction)

  const handleAutoRoll = () => {
    const roll  = rollDice(damageDice, 6)
    const total = Math.max(0, roll.total + effectBonus + linkedBonus - effectiveArmor) * damageMultiple
    setDamageResult({ roll, total, effectBonus, linkedBonus, armor: effectiveArmor, damageMultiple })
  }

  const handleManualConfirm = () => {
    const raw   = Number(manualRaw)
    if (!raw && raw !== 0) return
    const total = Math.max(0, raw + effectBonus + linkedBonus - effectiveArmor) * damageMultiple
    setDamageResult({ roll: { results: [], total: raw }, total, effectBonus, linkedBonus, armor: effectiveArmor, damageMultiple })
  }

  const linkedPart   = linkedBonus > 0 ? ` +${linkedBonus} linked` : ''
  const formulaLabel = damageMultiple > 1
    ? `(${damageDice}D${linkedPart} + Effect − Armour) × ${damageMultiple}`
    : `${damageDice}D${linkedPart} + Effect − Armour`

  return (
    <Modal title="Damage" onClose={onClose}>
      <div className="space-y-4">
        <div className="text-center font-mono text-xs text-slate-400">
          {formulaLabel.replace('Armour', `Armour (${effectiveArmor}${apReduction > 0 ? ` −AP${apReduction}` : ''})`)}
        </div>

        {!damageResult ? (
          isPlayer ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-slate-800 rounded px-4 py-3">
                <span className="text-slate-400 font-mono text-xs">{damageDice}D6 total:</span>
                <input
                  type="number"
                  min={damageDice}
                  max={damageDice * 6}
                  value={manualRaw}
                  onChange={(e) => setManualRaw(e.target.value)}
                  className="w-20 bg-slate-700 border border-slate-600 text-(--neon-cyan) font-mono text-lg rounded text-center px-2 py-1 focus:outline-none focus:border-(--neon-cyan)/60"
                  placeholder="—"
                />
                <button
                  type="button"
                  onClick={() => { const r = rollDice(damageDice, 6); setManualRaw(r.total.toString()) }}
                  className="text-slate-400 hover:text-(--neon-cyan) font-mono text-sm transition-colors"
                  title="Auto-roll"
                  aria-label="Auto-roll damage dice"
                >
                  🎲
                </button>
              </div>
              <button
                onClick={handleManualConfirm}
                disabled={manualRaw === '' || isNaN(Number(manualRaw))}
                className="w-full py-3 bg-red-900/30 border border-red-700/50 text-red-400 font-mono text-lg tracking-widest rounded hover:bg-red-900/40 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
              >
                CONFIRM DAMAGE
              </button>
            </div>
          ) : (
            <button
              onClick={handleAutoRoll}
              className="w-full py-3 bg-red-900/30 border border-red-700/50 text-red-400 font-mono text-lg tracking-widest rounded hover:bg-red-900/40 transition-colors"
            >
              🎲 ROLL DAMAGE
            </button>
          )
        ) : (
          <div className="space-y-3">
            <div className="bg-slate-800 rounded p-4 text-center font-mono text-xs">
              <p className="text-slate-400">
                {(() => {
                  const ap       = apReduction > 0 ? ` (AP−${apReduction})` : ''
                  const mult     = damageMultiple > 1 ? ` ×${damageMultiple}` : ''
                  const linked   = linkedBonus > 0 ? ` +${linkedBonus} linked` : ''
                  const base     = isPlayer
                    ? `${damageResult.roll.total} (entered)${linked} + ${effectBonus} − ${effectiveArmor} armour${ap}`
                    : `[${damageResult.roll.results.join('+')}]${linked} + ${effectBonus} − ${effectiveArmor} armour${ap}`
                  return base + mult
                })()}
              </p>
              <p className="text-red-400 font-bold text-2xl mt-1">{damageResult.total}</p>
              <p className="text-slate-400">damage dealt</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setDamageResult(null); setManualRaw('') }}
                className="flex-1 py-2 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-slate-500"
              >
                {isPlayer ? 'RE-ENTER' : 'REROLL'}
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
  targetName, attackEffect, targetCrits, isPlayer,
  critRoll, setCritRoll, extraDamageResult, setExtraDamageResult,
  onApply, onClose,
}) {
  const [manualLocation, setManualLocation] = useState(null)
  const [manualExtra, setManualExtra]       = useState('')

  const attackSeverity = getCriticalSeverity(attackEffect)
  const location = critRoll ? getCriticalLocation(critRoll.total) : null
  const existingCrit = location ? targetCrits.find((c) => c.system === location) : null
  const isMaxSeverity = (existingCrit?.severity ?? 0) >= 6

  const effectiveSeverity = existingCrit && !isMaxSeverity
    ? Math.max(attackSeverity, existingCrit.severity + 1)
    : attackSeverity

  const effect = location ? getCriticalEffect(location, isMaxSeverity ? 6 : effectiveSeverity) : null
  const ARMOUR_ROLL_MECHANICS = ['armour_reduce_d3', 'armour_reduce_xd']
  const isArmourRoll = !isMaxSeverity && ARMOUR_ROLL_MECHANICS.includes(effect?.mechanic)
  const extraDice = isMaxSeverity ? 6
    : (effect?.mechanic === 'hull_extra_damage' ? effect.value
    : (effect?.mechanic === 'armour_reduce_d3' ? 1
    : (effect?.mechanic === 'armour_reduce_xd' ? effect.value
    : null)))
  const needsExtraRoll = extraDice !== null
  const canApply = critRoll !== null && (!needsExtraRoll || extraDamageResult !== null)

  const handleLocationRoll = (diceOverride = null) => {
    setCritRoll(diceOverride ?? roll2D6())
    setExtraDamageResult(null)
    setManualExtra('')
  }

  const handleExtraRoll = () => {
    if (isPlayer) {
      const v = Number(manualExtra)
      if (!isNaN(v) && manualExtra !== '') setExtraDamageResult(v)
    } else {
      setExtraDamageResult(rollDice(extraDice, 6).total)
    }
  }

  return (
    <Modal title="Critical Hit" onClose={onClose}>
      <div className="space-y-4">
        <div className="text-center font-mono text-xs text-orange-400">
          🚨 Effect {attackEffect} ≥ 6 — Critical on {targetName}
        </div>

        {!critRoll ? (
          isPlayer ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 bg-slate-800 rounded px-4 py-3">
                <span className="text-slate-400 font-mono text-xs mr-2">2D6 location:</span>
                <DiceInput value={null} onChange={setManualLocation} />
              </div>
              <button
                onClick={() => handleLocationRoll(manualLocation)}
                disabled={!manualLocation}
                className="w-full py-3 bg-orange-900/30 border border-orange-700/50 text-orange-400 font-mono text-lg tracking-widest rounded hover:bg-orange-900/40 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
              >
                CONFIRM LOCATION
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleLocationRoll(null)}
              className="w-full py-3 bg-orange-900/30 border border-orange-700/50 text-orange-400 font-mono text-lg tracking-widest rounded hover:bg-orange-900/40 transition-colors"
            >
              🎲 ROLL LOCATION (2D6)
            </button>
          )
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
                    <span className="text-slate-400"> (was {existingCrit.severity}, stacking)</span>
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

            {/* Manual application banner for descriptive effects */}
            {effect?.mechanic === 'descriptive' && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded px-3 py-2 font-mono text-xs text-amber-400">
                ⚠ MANUAL — Apply this effect to the ship before closing.
              </div>
            )}

            {/* Extra roll: hull extra damage, or armour reduction */}
            {needsExtraRoll && extraDamageResult === null && (
              isPlayer ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 bg-slate-800 rounded px-3 py-2">
                    <span className="text-slate-400 font-mono text-xs">
                      {isArmourRoll
                        ? (effect?.mechanic === 'armour_reduce_d3' ? '1D6 (−D3 armour):' : `${extraDice}D6 (−armour):`)
                        : `${extraDice}D6 total:`}
                    </span>
                    <input
                      type="number"
                      min={extraDice}
                      max={extraDice * 6}
                      value={manualExtra}
                      onChange={(e) => setManualExtra(e.target.value)}
                      className="w-20 bg-slate-700 border border-slate-600 text-red-400 font-mono text-lg rounded text-center px-2 py-1 focus:outline-none focus:border-red-500/60"
                      placeholder="—"
                    />
                    <button
                      type="button"
                      onClick={() => { const r = rollDice(extraDice, 6); setManualExtra(r.total.toString()) }}
                      className="text-slate-400 hover:text-red-400 font-mono text-sm transition-colors"
                      title="Auto-roll"
                      aria-label="Auto-roll"
                    >
                      🎲
                    </button>
                  </div>
                  <button
                    onClick={handleExtraRoll}
                    disabled={manualExtra === '' || isNaN(Number(manualExtra))}
                    className="w-full py-2 bg-red-900/30 border border-red-700/50 text-red-400 font-mono text-sm tracking-widest rounded hover:bg-red-900/40 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
                  >
                    {isArmourRoll ? 'CONFIRM ARMOUR REDUCTION' : `CONFIRM ${extraDice}D EXTRA DAMAGE`}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleExtraRoll}
                  className="w-full py-2 bg-red-900/30 border border-red-700/50 text-red-400 font-mono text-sm tracking-widest rounded hover:bg-red-900/40 transition-colors"
                >
                  {isArmourRoll ? `🎲 ROLL ARMOUR (${extraDice}D6)` : `🎲 ROLL ${extraDice}D EXTRA DAMAGE`}
                </button>
              )
            )}
            {needsExtraRoll && extraDamageResult !== null && (
              <div className="bg-slate-800 rounded p-2 text-center font-mono text-xs">
                {isArmourRoll
                  ? <>Armour reduction: <span className="text-orange-400 font-bold text-xl">−{effect?.mechanic === 'armour_reduce_d3' ? Math.ceil(extraDamageResult / 2) : extraDamageResult}</span></>
                  : <>Extra damage: <span className="text-red-400 font-bold text-xl">{extraDamageResult}</span></>}
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
                className="flex-1 py-2 bg-orange-900/30 border border-orange-700/50 text-orange-400 font-mono text-xs rounded hover:bg-orange-900/40 transition-colors disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed"
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
  const closeModal              = useUiStore((s) => s.closeModal)
  const modalPayload            = useUiStore((s) => s.modalPayload)
  const applyDamage             = useBattleStore((s) => s.applyDamage)
  const applyIonDamage          = useBattleStore((s) => s.applyIonDamage)
  const spendSandAmmo           = useBattleStore((s) => s.spendSandAmmo)
  const addCriticalHit          = useBattleStore((s) => s.addCriticalHit)
  const reduceArmour            = useBattleStore((s) => s.reduceArmour)
  const markTurretFired         = useBattleStore((s) => s.markTurretFired)
  const launchMissile           = useBattleStore((s) => s.launchMissile)
  const spendReactionThrust     = useBattleStore((s) => s.spendReactionThrust)
  const spendMissileAmmo        = useBattleStore((s) => s.spendMissileAmmo)
  const addLogEntry             = useBattleStore((s) => s.addLogEntry)
  const interceptMissileSalvo   = useBattleStore((s) => s.interceptMissileSalvo)
  const missiles                = useBattleStore((s) => s.missiles)
  const allShips                = useBattleStore((s) => s.ships)

  const [step, setStep]                       = useState('config')
  const [targetId, setTargetId]               = useState('')
  const [targetMissileId, setTargetMissileId] = useState(null)
  const [weaponKey, setWeaponKey]             = useState('')
  const [selectedTurretSlot, setSelectedTurretSlot] = useState(null)
  const [damageDiceBonus, setDamageDiceBonus] = useState(0)
  const [attackResult, setAttackResult]       = useState(null)
  const [damageResult, setDamageResult]       = useState(null)
  const [manualRangeBand, setManualRangeBand] = useState(null)
  const [critRoll, setCritRoll]               = useState(null)
  const [extraDamageResult, setExtraDamageResult] = useState(null)
  const [missileCount, setMissileCount]       = useState(1)

  // Reaction state — direct attacks only; missiles react at impact (CRB p.173, REQ-08)
  const [reactionEvasion, setReactionEvasion] = useState(false)
  const [sandTurretSlot, setSandTurretSlot]   = useState(null)
  const [sandResult, setSandResult]           = useState(null)

  const isMissile  = weaponKey === 'Missile Rack' || weaponKey === 'Missile Barbette' || weaponKey === 'Torpedo'

  const resetReactions = () => {
    setReactionEvasion(false)
    setSandTurretSlot(null); setSandResult(null)
  }

  const setWeaponSelection = (name, turretSlot, linkedBonus = 0) => {
    setWeaponKey(name)
    setSelectedTurretSlot(turretSlot)
    setDamageDiceBonus(linkedBonus)
    setMissileCount(name === 'Missile Barbette' ? 5 : 1)
    resetReactions()
  }
  const handleTargetChange = (id) => {
    setTargetId(id)
    setTargetMissileId(null)
    resetReactions()
  }
  const handleMissileTargetChange = (id) => {
    setTargetMissileId(id)
    setTargetId('')
    // If current weapon is not PD-capable, clear it
    if (!LASER_PD.includes(weaponKey)) {
      setWeaponKey('')
      setSelectedTurretSlot(null)
    }
    resetReactions()
  }

  const { attacker, enemies, target, weapon, availableWeapons, distance, rangeBand, storedBand, combatMode, outOfRange, dogfightTie, noPower, dmBreakdown } =
    useAttackSetup(modalPayload?.shipId ?? null, targetId, weaponKey, manualRangeBand, selectedTurretSlot)

  if (!attacker) return null

  const ammoLeft   = weaponKey === 'Torpedo'
    ? (attacker.torpedoAmmoTotal ?? 0)
    : isMissile ? (attacker.missileAmmoTotal ?? 0) : 0
  const isMissileBarbette = weaponKey === 'Missile Barbette'

  // ── In-flight missile targeting (FEAT-001) ────────────────────────────
  // Hostile missiles: those targeting ships of the same faction as the attacker
  const inFlightHostileMissiles = missiles
    .filter((m) => {
      const tShip = allShips.find((s) => s.id === m.target)
      return tShip && tShip.faction === attacker.faction && m.count > 0
    })
    .map((m) => ({
      ...m,
      launcherName: allShips.find((s) => s.id === m.launchedBy)?.name ?? '?',
      targetName:   allShips.find((s) => s.id === m.target)?.name ?? '?',
    }))
  const targetMissile = targetMissileId
    ? inFlightHostileMissiles.find((m) => m.id === targetMissileId) ?? null
    : null
  const handleAdvanceToMissilePd = () => setStep('missile_pd')

  // ── Reaction-derived values ────────────────────────────────────────────
  const targetPilotSkill = target ? getEffectiveSkill(target.profile.crew, target.crewAssignments, 'pilot') : 0
  const _tBasePow = target ? (target.basePower ?? target.profile.maxPower ?? 100) : 100
  const _tIonCap  = target ? computeIonThrustEffect(target.profile.thrust, target.currentPower ?? _tBasePow, _tBasePow) : 0
  const availableReactionThrust = target ? Math.max(0,
    _tIonCap + (target.thrustBonusThisRound ?? 0)
    - target.thrustUsedThisRound
    - (target.thrustPenalty ?? 0)
    - (target.evasiveThrust ?? 0)
  ) : 0

  const sandAmmoLeft = target?.sandAmmoTotal ?? 0
  const targetSandTurrets = (target && sandAmmoLeft > 0) ? (target.profile.turrets ?? [])
    .filter((t) => !(target.firedTurrets ?? []).includes(t.slot))
    .filter((t) => t.weapons?.includes('Sandcaster'))
    .map((t) => ({ slot: t.slot }))
  : []

  // CRB p.171: each evasion costs 1 thrust, DM = −pilotSkill (fixed, not multiplied by thrust)
  const dynamicEvasiveDM = reactionEvasion ? -targetPilotSkill : 0
  const augmentedDmBreakdown = {
    ...dmBreakdown,
    evasiveDM: dynamicEvasiveDM,
    totalDM: dmBreakdown.totalDM + dynamicEvasiveDM,
  }
  const sandBonusArmor = sandResult?.success ? (sandResult.bonusArmor ?? 0) : 0

  // ── Reaction handlers ─────────────────────────────────────────────────
  const handleSandRoll = (diceOverride = null) => {
    const slot = sandTurretSlot ?? targetSandTurrets[0]?.slot
    if (!slot || !target) return
    const gunner    = getEffectiveSkill(target.profile.crew, target.crewAssignments, 'gunner', slot)
    const rollResult = diceOverride ?? roll2D6()
    const total     = rollResult.total + gunner
    const effect    = total - 8
    const success   = effect >= 0
    const armorRoll = success ? rollDice(1, 6).total : 0
    const bonusArmor = success ? armorRoll + effect : 0
    markTurretFired(target.id, slot)
    spendSandAmmo(target.id)
    setSandTurretSlot(slot)
    setSandResult({ turretSlot: slot, roll: rollResult, gunner, total, effect, success, armorRoll, bonusArmor })
    addLogEntry(`${target.name} Disperse Sand (T${slot}): total ${total}${success ? ` — +${bonusArmor} armour vs this laser attack` : ' — no effect'}.`)
  }

  const handleAdvanceToRoll = () => {
    if (reactionEvasion && target) spendReactionThrust(target.id, 1)
    setStep('roll')
  }

  const handleApplyDamage = () => {
    if (!damageResult || !target) return
    if (selectedTurretSlot !== null) markTurretFired(attacker.id, selectedTurretSlot)
    applyDamage(target.id, damageResult.total, `${weaponKey} from ${attacker.name}`)

    if (damageResult.total > 0 && isCriticalHit(attackResult?.effect ?? 0)) {
      setStep('critical')
    } else {
      if (attackResult?.hit) {
        if (BEAM_WEAPONS.includes(weaponKey)) {
          emitEffect('laser_ray', {
            duration: 2500,
            fromHex:    attacker.position,
            toHex:      target.position,
            weaponType: weaponKey,
          })
        }
        emitEffect('impact_burst', {
          duration: 2500,
          hex:       target.position,
          shipColor: target.color,
        })
      }
      closeModal()
    }
  }

  const handleApplyCritical = () => {
    if (!critRoll || !target) return
    if (selectedTurretSlot !== null) markTurretFired(attacker.id, selectedTurretSlot)
    const location       = getCriticalLocation(critRoll.total)
    const attackSeverity = getCriticalSeverity(attackResult.effect)
    const existingCrit   = target.criticalHits.find((c) => c.system === location)
    const isMaxSeverity  = (existingCrit?.severity ?? 0) >= 6
    const effectiveSeverity = existingCrit && !isMaxSeverity
      ? Math.max(attackSeverity, existingCrit.severity + 1)
      : attackSeverity
    const effect = getCriticalEffect(location, isMaxSeverity ? 6 : effectiveSeverity)

    if (BEAM_WEAPONS.includes(weaponKey)) {
      emitEffect('laser_ray', {
        duration: 2500,
        fromHex:    attacker.position,
        toHex:      target.position,
        weaponType: weaponKey,
      })
    }
    emitEffect('impact_burst', {
      duration: 2500,
      hex:       target.position,
      shipColor: target.color,
    })
    emitEffect('critical_flash', {
      duration: 2500,
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
      } else if (effect?.mechanic === 'armour_reduce_fixed') {
        reduceArmour(target.id, effect.value)
      } else if (effect?.mechanic === 'armour_reduce_d3' && extraDamageResult !== null) {
        reduceArmour(target.id, Math.ceil(extraDamageResult / 2))
      } else if (effect?.mechanic === 'armour_reduce_xd' && extraDamageResult !== null) {
        reduceArmour(target.id, extraDamageResult)
      }
    }
    closeModal()
  }

  const handleMissClose = () => {
    if (selectedTurretSlot !== null) markTurretFired(attacker.id, selectedTurretSlot)
    if (target && BEAM_WEAPONS.includes(weaponKey)) {
      emitEffect('laser_ray', {
        duration: 2500,
        fromHex:    attacker.position,
        toHex:      target.position,
        weaponType: weaponKey,
      })
    }
    closeModal()
  }

  const handleLaunchMissile = () => {
    if (!target) return
    const missileType = weaponKey === 'Torpedo' ? 'Torpedo' : 'Standard'
    // Smart requires TL ≥ 9 AND range > Adjacent/Close (CRB p.79, p.162)
    const launcherTL = attacker.profile.tl ?? 12
    const hasSmartGuidance = launcherTL >= 9 && rangeBand !== 'Adjacent'
    launchMissile(attacker.id, target.id, missileCount, attacker.position, attacker.vector, missileType, hasSmartGuidance)
    if (selectedTurretSlot !== null) markTurretFired(attacker.id, selectedTurretSlot)
    emitEffect('missile_launch', { duration: 2500, hex: attacker.position })
    closeModal()
  }

  if (step === 'config') {
    return (
      <AttackConfigStep
        enemies={enemies}
        availableWeapons={availableWeapons}
        weaponKey={weaponKey}
        selectedTurretSlot={selectedTurretSlot}
        setWeaponSelection={setWeaponSelection}
        targetId={targetId}
        setTargetId={handleTargetChange}
        target={target}
        weapon={weapon}
        rangeBand={rangeBand}
        distance={distance}
        combatMode={combatMode}
        storedBand={storedBand}
        manualRangeBand={manualRangeBand}
        setManualRangeBand={setManualRangeBand}
        outOfRange={outOfRange}
        dogfightTie={dogfightTie}
        noPower={noPower}
        dmBreakdown={augmentedDmBreakdown}
        isMissile={isMissile}
        isMissileBarbette={isMissileBarbette}
        missileCount={missileCount}
        setMissileCount={setMissileCount}
        ammoLeft={ammoLeft}
        inFlightMissiles={inFlightHostileMissiles}
        targetMissileId={targetMissileId}
        setTargetMissileId={handleMissileTargetChange}
        reactions={{
          evasion:         reactionEvasion,
          setEvasion:      setReactionEvasion,
          availableThrust: availableReactionThrust,
          targetPilotSkill,
          sandTurrets:     targetSandTurrets,
          sandAmmoLeft,
          sandTurretSlot,
          setSandTurretSlot,
          sandResult,
          onSandRoll:      handleSandRoll,
        }}
        onNext={
          targetMissileId ? handleAdvanceToMissilePd :
          isMissile ? handleLaunchMissile :
          handleAdvanceToRoll
        }
        onClose={closeModal}
      />
    )
  }

  if (step === 'roll') {
    return (
      <AttackRollStep
        attackerName={attacker.name}
        targetName={target?.name ?? '?'}
        weaponKey={weaponKey}
        isPlayer={attacker.faction === 'players'}
        dmBreakdown={augmentedDmBreakdown}
        attackResult={attackResult}
        setAttackResult={setAttackResult}
        onNext={() => setStep(weaponKey === 'Ion Cannon' ? 'ion' : 'damage')}
        onClose={closeModal}
        onMissClose={handleMissClose}
      />
    )
  }

  if (step === 'ion') {
    return (
      <IonDamageStep
        weapon={weapon}
        target={target}
        attackEffect={attackResult?.effect ?? 0}
        isPlayer={attacker.faction === 'players'}
        onApply={(ionDamage, ionRounds) => {
          if (!target) return
          if (!target.hardened) {
            applyIonDamage(target.id, ionDamage, ionRounds)
            emitEffect('ion_burst', { duration: 1500, hex: target.position })
            const remaining = Math.max(0, (target.currentPower ?? target.profile.maxPower ?? 100) - ionDamage)
            addLogEntry(`${attacker.name} → ${target.name}: ${weapon?.label ?? 'Ion Cannon'} hit — −${ionDamage} Power (${remaining} remaining, ${ionRounds}R).`)
          } else {
            addLogEntry(`${attacker.name} → ${target.name}: ${weapon?.label ?? 'Ion Cannon'} — no effect (hardened systems).`)
          }
          if (selectedTurretSlot !== null) markTurretFired(attacker.id, selectedTurretSlot)
          closeModal()
        }}
        onClose={closeModal}
      />
    )
  }

  if (step === 'missile_pd') {
    if (!targetMissile) return null
    return (
      <MissilePdStep
        missile={targetMissile}
        launcherName={targetMissile.launcherName}
        targetName={targetMissile.targetName}
        attacker={attacker}
        weaponKey={weaponKey}
        turretSlot={selectedTurretSlot}
        isPlayer={attacker.faction === 'players'}
        onApply={(removed) => {
          interceptMissileSalvo(targetMissile.id, removed)
          if (selectedTurretSlot !== null) markTurretFired(attacker.id, selectedTurretSlot)
          addLogEntry(
            `${attacker.name} PD (T${selectedTurretSlot}) vs ${targetMissile.launcherName} salvo: ${removed} missile${removed !== 1 ? 's' : ''} destroyed.`
          )
          closeModal()
        }}
        onClose={closeModal}
      />
    )
  }

  if (step === 'critical') {
    return (
      <AttackCriticalStep
        targetName={target?.name ?? '?'}
        attackEffect={attackResult?.effect ?? 6}
        targetCrits={target?.criticalHits ?? []}
        isPlayer={attacker.faction === 'players'}
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
      linkedBonus={damageDiceBonus}
      armor={(target?.profile.armor ?? 0) + sandBonusArmor}
      apReduction={getApValue(weapon?.traits ?? [])}
      damageMultiple={weapon?.damageMultiple ?? 1}
      isPlayer={attacker.faction === 'players'}
      damageResult={damageResult}
      setDamageResult={setDamageResult}
      onApply={handleApplyDamage}
      onClose={closeModal}
    />
  )
}
