/**
 * BoarderCanisterPanel — defender's sandcaster fire against an incoming boarding party.
 * Contact phase only: once the party is inside the hull it is out of the caster's reach.
 * Gunner (turret) check → on success each boarder takes Ground-scale damage
 * (Sand 8D, CRB p.171; Pebble 1DD, HG p.38). With a boarding party defined, the damage is rolled
 * for each living boarder and applied through their Protection and characteristics (CRB p.77);
 * otherwise it is shown per anonymous boarder and the GM decides the consequences.
 */

import { useState } from 'react'
import { DiceInput }      from '../forms/DiceInput.jsx'
import { useBattleStore } from '../../store/battleStore.js'
import { getEffectiveSkill } from '../../utils/crew.js'
import { applyPersonalDamage, getStackOrder } from '../../utils/boarders.js'
import {
  BOARDER_CANISTERS,
  resolveBoarderCanisterCheck,
  rollBoarderCanisterDamage,
} from '../../utils/boarding.js'

/**
 * @param {{ boarding: object, defender: object }} props
 */
export function BoarderCanisterPanel({ boarding, defender }) {
  const fireBoarderCanister = useBattleStore((s) => s.fireBoarderCanister)
  const addLogEntry         = useBattleStore((s) => s.addLogEntry)
  const applyBoarderDamage  = useBattleStore((s) => s.applyBoarderDamage)

  const [canisterType, setCanisterType] = useState('sand')
  const [slotChoice, setSlotChoice]     = useState(null)
  const [dice, setDice]                 = useState(null)
  const [diceKey, setDiceKey]           = useState(0)
  const [damages, setDamages]           = useState([])
  const [rosterHits, setRosterHits]     = useState(null)

  const ammoLeft = defender.sandAmmoTotal ?? 0
  const freeSlots = ammoLeft > 0
    ? (defender.profile.turrets ?? [])
        .filter((t) => t.weapons?.includes('Sandcaster') && !(defender.firedTurrets ?? []).includes(t.slot))
        .map((t) => t.slot)
    : []
  const lastAttack = (boarding.canisterAttacks ?? []).at(-1) ?? null

  if (freeSlots.length === 0 && !lastAttack) return null

  const slot   = freeSlots.includes(slotChoice) ? slotChoice : freeSlots[0]
  const gunner = slot !== undefined
    ? getEffectiveSkill(defender.profile.crew, defender.crewAssignments, 'gunner', slot)
    : 0
  const check  = dice ? resolveBoarderCanisterCheck(dice.total, gunner) : null

  function handleFire() {
    if (!check) return
    fireBoarderCanister(boarding.id, canisterType, slot, check)
    setDice(null)
    setDiceKey((k) => k + 1)
    setDamages([])
    setRosterHits(null)
  }

  function handleRollDamage() {
    if (!lastAttack?.success) return
    const type   = lastAttack.type
    const target = damages.length + 1
    const rolled = rollBoarderCanisterDamage(type)
    setDamages((prev) => [...prev, rolled])
    addLogEntry(`${BOARDER_CANISTERS[type].label} canister — boarder #${target}: ${rolled.damage} damage (Ground scale).`)
  }

  const livingBoarders = getStackOrder(boarding.parties?.attacker ?? [])

  /** Roll Ground-scale damage for every living boarder and apply it (Protection → END → STR/DEX). */
  function handleRollRoster() {
    if (!lastAttack?.success || rosterHits) return
    const type = lastAttack.type
    const rows = livingBoarders.map((b) => {
      const rolled = rollBoarderCanisterDamage(type)
      const result = applyPersonalDamage(b, rolled.damage, { minOneOnEffect6: false })
      return { boarder: b, rolled, result }
    })
    applyBoarderDamage(
      boarding.id,
      'attacker',
      rows.map((r) => ({ boarderId: r.boarder.id, damage: r.rolled.damage, minOneOnEffect6: false })),
      `${BOARDER_CANISTERS[type].label} canister`,
    )
    setRosterHits(rows)
  }

  const btn = 'font-mono text-xs rounded border transition-colors'
  const pick = (active) => `${btn} px-2 py-1 ${
    active
      ? 'bg-(--neon-cyan)/10 border-(--neon-cyan) text-(--neon-cyan)'
      : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400'
  }`

  return (
    <div className="bg-slate-800/60 rounded px-3 py-2.5 space-y-2.5" data-testid="boarder-canister-panel">
      <p className="text-slate-400 font-mono text-xs uppercase font-bold">
        Sandcaster vs boarders · Ammo: <span className="text-(--neon-cyan)">{ammoLeft}</span>
      </p>

      {freeSlots.length > 0 && (
        <>
          <div className="flex gap-2">
            {Object.entries(BOARDER_CANISTERS).map(([key, c]) => (
              <button key={key} onClick={() => setCanisterType(key)} className={`flex-1 ${pick(canisterType === key)}`}>
                {c.label} · {c.diceCount}D{c.multiplier === 10 ? '×10' : ''}
              </button>
            ))}
          </div>

          {freeSlots.length > 1 && (
            <div className="flex gap-2 items-center">
              <span className="text-slate-400 font-mono text-xs">Turret:</span>
              {freeSlots.map((s) => (
                <button key={s} onClick={() => setSlotChoice(s)} className={pick(slot === s)}>T{s}</button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <div>
              <p className="text-slate-400 font-mono text-xs mb-1">
                Gunner (turret) {gunner >= 0 ? '+' : ''}{gunner} — Average (8+)
              </p>
              <DiceInput key={diceKey} value={dice} onChange={setDice} />
            </div>
            {check && (
              <p className={`font-mono text-xs font-bold ${check.success ? 'text-emerald-400' : 'text-red-400'}`}>
                = {check.total} — {check.success ? 'HIT' : 'MISS'}
              </p>
            )}
          </div>

          <button
            onClick={handleFire}
            disabled={!check}
            className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-xs rounded transition-colors"
          >
            FIRE {BOARDER_CANISTERS[canisterType].label.toUpperCase()} CANISTER
          </button>
        </>
      )}

      {lastAttack && (
        <div className="space-y-1.5">
          <p className={`font-mono text-xs font-bold ${lastAttack.success ? 'text-emerald-400' : 'text-red-400'}`}>
            Last salvo: {BOARDER_CANISTERS[lastAttack.type].label} (T{lastAttack.turretSlot}) — {lastAttack.success ? 'HIT' : 'MISS'}
          </p>
          {lastAttack.success && (livingBoarders.length > 0 || rosterHits) && (
            <>
              <button
                onClick={handleRollRoster}
                disabled={!!rosterHits}
                className="w-full py-1 bg-red-900/30 border border-red-500 text-red-400 hover:bg-red-900/50 disabled:opacity-40 disabled:cursor-not-allowed font-mono text-xs rounded transition-colors"
              >
                🎲 ROLL DAMAGE — {rosterHits ? `${rosterHits.length} BOARDERS HIT` : `ALL ${livingBoarders.length} BOARDERS`}
              </button>
              {rosterHits && (
                <ul className="font-mono text-xs text-slate-300 space-y-0.5" data-testid="canister-roster-results">
                  {rosterHits.map(({ boarder, rolled, result }) => (
                    <li key={boarder.id}>
                      {boarder.name}: {rolled.damage} − {result.absorbed} armour →{' '}
                      <span className="text-red-400 font-bold">{result.applied}</span>
                      {result.statusAfter !== result.statusBefore && (
                        <span className="text-red-400 font-bold"> · {result.statusAfter.toUpperCase()}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-slate-400 text-2xs font-mono">
                Ground-scale damage rolled for each living boarder; Protection applies (CRB p.77).
              </p>
            </>
          )}
          {lastAttack.success && livingBoarders.length === 0 && !rosterHits && (boarding.parties?.attacker.length ?? 0) > 0 && (
            <p className="text-slate-400 text-2xs font-mono">No living boarders left in the boarding party.</p>
          )}
          {lastAttack.success && (boarding.parties?.attacker.length ?? 0) === 0 && !rosterHits && (
            <>
              <button
                onClick={handleRollDamage}
                className="w-full py-1 bg-red-900/30 border border-red-500 text-red-400 hover:bg-red-900/50 font-mono text-xs rounded transition-colors"
              >
                🎲 ROLL DAMAGE — BOARDER #{damages.length + 1}
              </button>
              {damages.length > 0 && (
                <ul className="font-mono text-xs text-slate-300 space-y-0.5">
                  {damages.map((d, i) => (
                    <li key={i}>
                      #{i + 1}: [{d.results.join('+')}]{BOARDER_CANISTERS[lastAttack.type].multiplier === 10 ? ' ×10' : ''} ={' '}
                      <span className="text-red-400 font-bold">{d.damage}</span> dmg
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-slate-400 text-2xs font-mono">
                No boarding party defined: Ground-scale damage per anonymous boarder. Deduct END/armour and rule the outcome.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
