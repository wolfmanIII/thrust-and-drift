/**
 * BoardingContactModal — Phase 2: Contact.
 * GM selects the entry method, toggles rotation/forced-linkage modifiers,
 * rolls the contact check (if required), and advances to Conflict.
 * @see boarding-system-design.md §3.2, §5.2
 * @see HG 2022 pp.127–130
 */

import { useState } from 'react'
import { Modal }          from './Modal.jsx'
import { DiceInput }      from '../forms/DiceInput.jsx'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore }     from '../../store/uiStore.js'
import {
  ENTRY_METHODS,
  CUT_TOOLS,
  getHullResilience,
  cuttingDamage,
  getContactDM,
} from '../../utils/boarding.js'

// ---------------------------------------------------------------------------
// Tumbling sub-component — Pilot (DEX) Routine (6+) check + D3 duration
// HG 2022 p.127
// ---------------------------------------------------------------------------

function TumblingControl({ boarding, onApply, onClear }) {
  const [dice, setDice]         = useState(null)
  const [duration, setDuration] = useState(1)

  if (boarding.defenderRotating) {
    return (
      <div className="flex-1 py-2 px-3 rounded border bg-red-900/30 border-red-500 text-red-400 font-mono text-xs space-y-1">
        <p className="font-bold">🌀 TUMBLING</p>
        <p className="text-[10px] text-slate-400">{boarding.rotatingRoundsLeft ?? 1}r remaining · DM −1 Contact</p>
        <button
          onClick={onClear}
          className="mt-1 w-full py-1 bg-slate-800 border border-slate-600 text-slate-400 hover:text-slate-200 font-mono text-[10px] rounded transition-colors"
        >
          DEACTIVATE
        </button>
      </div>
    )
  }

  const checkTotal = dice ? dice.total : null
  const passed     = checkTotal !== null && checkTotal >= 6

  return (
    <div className="flex-1 py-2 px-3 rounded border bg-slate-800 border-slate-600 font-mono text-xs space-y-2">
      <p className="text-slate-400 font-bold">🌀 Tumbling</p>
      <p className="text-[10px] text-slate-400">Pilot (DEX) Routine (6+)</p>
      <DiceInput value={dice} onChange={setDice} />
      {checkTotal !== null && (
        <p className={passed ? 'text-emerald-400' : 'text-red-400'}>
          {checkTotal} — {passed ? 'SUCCESS' : 'FAILED'}
        </p>
      )}
      {passed && (
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[10px]">D3 duration:</span>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setDuration(n)}
              className={`w-6 h-6 rounded font-mono text-xs border transition-colors ${
                duration === n
                  ? 'bg-(--neon-cyan)/10 border-(--neon-cyan) text-(--neon-cyan)'
                  : 'border-slate-600 text-slate-400 hover:border-slate-400'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
      {passed && (
        <button
          onClick={() => onApply(duration)}
          className="w-full py-1 bg-red-900/30 border border-red-500 text-red-400 font-mono text-[10px] rounded transition-colors hover:bg-red-900/50"
        >
          ACTIVATE ({duration}r)
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cut-tracker sub-component
// ---------------------------------------------------------------------------

/**
 * @param {{ boarding: object, onDamage: (n: number) => void }} props
 */
function CutTracker({ boarding, onDamage }) {
  const [toolKey, setToolKey]     = useState('rescue')
  const [dice, setDice]           = useState(null)
  const [component, setComponent] = useState('hatch')

  const armorValue = boarding._defenderArmor ?? 0
  const isArmored  = armorValue > 0
  const res        = getHullResilience(component, armorValue, isArmored)
  const effect     = dice ? dice.total - 8 : null   // difficulty 8 — Average
  const dmg        = dice ? cuttingDamage(toolKey, effect) : 0
  const contactDM  = getContactDM(boarding)

  return (
    <div className="bg-slate-800/60 rounded px-3 py-2.5 space-y-2.5">
      <p className="text-slate-400 font-mono text-xs uppercase font-bold">Hull Cut</p>

      {/* Component selector */}
      <div className="flex gap-2">
        {[['hatch', 'HATCH'], ['airlock', 'AIRLOCK'], ['hull', 'HULL']].map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setComponent(k)}
            className={`flex-1 py-1 font-mono text-xs rounded border transition-colors ${
              component === k
                ? 'bg-(--neon-cyan)/10 border-(--neon-cyan) text-(--neon-cyan)'
                : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      <p className="text-slate-400 font-mono text-xs">
        Block resilience: <span className="text-slate-300">{res.block}</span>
        {' / '}
        breach: <span className="text-slate-300">{res.breach}</span>
        {isArmored && <span className="text-amber-400 ml-1">(armored)</span>}
      </p>

      {/* Tool selector */}
      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries(CUT_TOOLS).map(([k, t]) => (
          <button
            key={k}
            onClick={() => setToolKey(k)}
            className={`py-1 px-2 font-mono text-xs rounded border transition-colors text-left ${
              toolKey === k
                ? 'bg-(--neon-cyan)/10 border-(--neon-cyan) text-(--neon-cyan)'
                : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400'
            }`}
          >
            {t.label} (Cut {t.cutRate})
          </button>
        ))}
      </div>

      {/* Roll + result */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-slate-400 font-mono text-xs mb-1">
            Mechanic (DEX) — Average (8+)
            {contactDM !== 0 && (
              <span className={contactDM > 0 ? 'text-emerald-400' : 'text-red-400'}>
                {' '}DM {contactDM > 0 ? '+' : ''}{contactDM}
              </span>
            )}
          </p>
          <DiceInput value={dice} onChange={setDice} />
        </div>
        {dice && (
          <div className="text-right">
            <p className="text-slate-400 font-mono text-xs">Effect {effect >= 0 ? '+' : ''}{effect}</p>
            <p className="text-(--neon-cyan) font-mono text-sm font-bold">−{dmg} res</p>
          </div>
        )}
      </div>

      {dice && (
        <button
          onClick={() => onDamage(dmg)}
          className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs rounded transition-colors"
        >
          APPLY DAMAGE
        </button>
      )}

      <p className="text-slate-400 font-mono text-xs">
        Progress: <span className="text-slate-300">{boarding.hullDamageSoFar ?? 0}</span> / {res.breach} (breach)
        {(boarding.hullDamageSoFar ?? 0) >= res.block && (boarding.hullDamageSoFar ?? 0) < res.breach && (
          <span className="text-amber-400 ml-2">ACCESS BLOCKED — continue for breach</span>
        )}
        {(boarding.hullDamageSoFar ?? 0) >= res.breach && (
          <span className="text-emerald-400 ml-2">✅ BREACH ACHIEVED</span>
        )}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BoardingContactModal() {
  const { activeModal, modalPayload, closeModal } = useUiStore()
  const {
    ships, boardings,
    setContactMethod, applyDefenderRotation, clearDefenderRotation, toggleForcedLinkage,
    advanceBoardingPhase, applyBoardingCutDamage,
  } = useBattleStore()

  const [dice, setDice] = useState(null)

  const isOpen = activeModal === 'boarding-contact'
  if (!isOpen) return null

  const boarding = boardings.find(
    (b) => b.attackerId === modalPayload?.boardingAttackerId && b.phase === 'contact' && b.outcome === null,
  )
  if (!boarding) return null

  const attacker = ships.find((s) => s.id === boarding.attackerId)
  const defender = ships.find((s) => s.id === boarding.defenderId)
  if (!attacker || !defender) return null

  const method    = ENTRY_METHODS[boarding.contactMethod]
  const contactDM = getContactDM(boarding)
  const needsRoll = method && method.check !== null && boarding.contactMethod !== 'hull_cut'

  function handleApplyCutDamage(dmg) {
    applyBoardingCutDamage(boarding.id, dmg)
  }

  const difficulty  = method?.difficulty ?? 8
  const checkTotal  = dice ? dice.total + contactDM : null
  const checkPassed = checkTotal !== null && checkTotal >= difficulty

  function handleAdvance() {
    advanceBoardingPhase(boarding.id)
    closeModal()
  }

  return (
    <Modal title="⚔️ CONTACT" onClose={closeModal}>
      <div className="space-y-4 min-w-80">

        {/* Ships banner */}
        <div className="flex items-center gap-3 bg-slate-800/60 rounded px-3 py-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: attacker.color }} />
            <span className="text-slate-200 font-mono text-xs font-bold truncate">{attacker.profile.name}</span>
          </div>
          <span className="text-amber-400 font-mono text-xs shrink-0">⚔️</span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
            <span className="text-slate-200 font-mono text-xs font-bold truncate">{defender.profile.name}</span>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: defender.color }} />
          </div>
        </div>

        {/* Entry method */}
        <div className="space-y-1.5">
          <p className="text-slate-400 font-mono text-xs uppercase">Entry method</p>
          <div className="grid grid-cols-1 gap-1.5">
            {Object.entries(ENTRY_METHODS).map(([k, m]) => (
              <button
                key={k}
                onClick={() => setContactMethod(boarding.id, k)}
                className={`flex items-start gap-2 px-3 py-2 rounded border font-mono text-xs text-left transition-colors ${
                  boarding.contactMethod === k
                    ? 'bg-(--neon-cyan)/10 border-(--neon-cyan) text-(--neon-cyan)'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400'
                }`}
              >
                <div className="flex-1">
                  <p className="font-bold">{m.label}</p>
                  <p className="text-slate-400 text-[10px]">
                    {m.check ? `${m.check} (${m.difficulty}+)` : 'No check'}
                    {' · '}
                    {m.time}
                    {m.dm !== 0 && <span className="text-emerald-400"> · DM +{m.dm}</span>}
                    {m.decompression && <span className="text-red-400"> · 🚨 decompression risk</span>}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Modifiers */}
        <div className="flex gap-2 items-stretch">
          <TumblingControl
            boarding={boarding}
            onApply={(dur) => applyDefenderRotation(boarding.id, dur)}
            onClear={() => clearDefenderRotation(boarding.id)}
          />
          <button
            onClick={() => toggleForcedLinkage(boarding.id)}
            className={`flex-1 py-2 font-mono text-xs rounded border transition-colors ${
              boarding.forcedLinkage
                ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400'
                : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400'
            }`}
          >
            {boarding.forcedLinkage ? '🔗 LINKAGE ACTIVE' : '🔗 Forced Linkage'}
            <span className="block text-[10px] text-slate-400">DM +2 Contact</span>
          </button>
        </div>

        {/* DM summary */}
        {contactDM !== 0 && (
          <p className="text-center font-mono text-xs">
            Total contact DM:{' '}
            <span className={contactDM > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
              {contactDM > 0 ? '+' : ''}{contactDM}
            </span>
          </p>
        )}

        {/* Check section (only for methods that require it, non-cutting) */}
        {needsRoll && (
          <div className="bg-slate-800/60 rounded px-3 py-2.5 space-y-2">
            <p className="text-slate-400 font-mono text-xs uppercase font-bold">
              {method.check} — {method.difficulty}+
            </p>
            <div className="flex items-center gap-3">
              <DiceInput value={dice} onChange={setDice} />
              {checkTotal !== null && (
                <div className="text-right">
                  <p className="text-slate-400 font-mono text-xs">= {checkTotal}</p>
                  <p className={`font-mono text-xs font-bold ${checkPassed ? 'text-emerald-400' : 'text-red-400'}`}>
                    {checkPassed ? 'SUCCESS' : 'FAILURE'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hull cut tracker */}
        {boarding.contactMethod === 'hull_cut' && (
          <CutTracker
            boarding={{ ...boarding, _defenderArmor: defender.profile.armor ?? 0 }}
            onDamage={handleApplyCutDamage}
          />
        )}

        {/* Advance button */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleAdvance}
            className="flex-1 py-2 bg-(--neon-cyan)/10 hover:bg-(--neon-cyan)/20 border border-(--neon-cyan) text-(--neon-cyan) font-mono text-xs rounded transition-colors"
          >
            ADVANCE TO CONFLICT →
          </button>
        </div>

      </div>
    </Modal>
  )
}
