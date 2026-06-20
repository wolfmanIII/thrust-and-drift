/**
 * BoardingOutcomeModal — Phase 4: Security.
 * GM chooses the boarding outcome; if attacker wins, optionally transfers the
 * defender's faction to match the attacker.
 * @see boarding-system-design.md §3.4, §5.4
 * @see HG 2022 pp.133–135
 */

import { useState } from 'react'
import { Modal }          from './Modal.jsx'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore }     from '../../store/uiStore.js'

const OUTCOMES = [
  {
    key:   'attacker_wins',
    label: 'Attacker wins',
    desc:  'Boarding party controls the ship. Enemy crew eliminated or captured.',
    color: 'emerald',
  },
  {
    key:   'defender_wins',
    label: 'Defender repels',
    desc:  'Boarders have been eliminated, captured, or repelled. Ship defended.',
    color: 'red',
  },
  {
    key:   'ship_destroyed',
    label: 'Ship destroyed',
    desc:  'Target ship destroyed during the internal conflict (critical system damage).',
    color: 'amber',
  },
]

const OUTCOME_STYLES = {
  emerald: { selected: 'bg-emerald-900/30 border-emerald-500', icon: 'text-emerald-400', label: 'text-emerald-400' },
  red:     { selected: 'bg-red-900/30 border-red-500',         icon: 'text-red-400',     label: 'text-red-400'     },
  amber:   { selected: 'bg-amber-900/30 border-amber-500',     icon: 'text-amber-400',   label: 'text-amber-400'   },
}

const FACTION_COLORS = {
  players: 'text-blue-400',
  npc:     'text-red-400',
  neutral: 'text-slate-400',
}

export function BoardingOutcomeModal() {
  const { activeModal, modalPayload, closeModal } = useUiStore()
  const { ships, boardings, resolveBoarding, updateShipFaction } = useBattleStore()

  const [selectedOutcome, setSelectedOutcome] = useState(null)
  const [transferFaction, setTransferFaction]  = useState(true)

  const isOpen = activeModal === 'boarding-outcome'
  if (!isOpen) return null

  const boarding = boardings.find(
    (b) => b.attackerId === modalPayload?.boardingAttackerId && b.phase === 'security' && b.outcome === null,
  )
  if (!boarding) return null

  const attacker = ships.find((s) => s.id === boarding.attackerId)
  const defender = ships.find((s) => s.id === boarding.defenderId)
  if (!attacker || !defender) return null

  function handleResolve() {
    if (!selectedOutcome) return
    resolveBoarding(boarding.id, selectedOutcome)
    if (selectedOutcome === 'attacker_wins' && transferFaction && typeof updateShipFaction === 'function') {
      updateShipFaction(defender.id, attacker.faction)
    }
    closeModal()
  }

  return (
    <Modal title="⚔ SECURITY — BOARDING OUTCOME" onClose={closeModal}>
      <div className="space-y-4 min-w-80">

        {/* Ships banner */}
        <div className="flex items-center gap-3 bg-slate-800/60 rounded px-3 py-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: attacker.color }} />
            <span className="text-slate-200 font-mono text-xs font-bold truncate">{attacker.profile.name}</span>
          </div>
          <span className="text-amber-400 font-mono text-xs shrink-0">⚔ OUTCOME</span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
            <span className="text-slate-200 font-mono text-xs font-bold truncate">{defender.profile.name}</span>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: defender.color }} />
          </div>
        </div>

        {/* Objectives summary */}
        {Object.entries(boarding.objectives).some(([, v]) => v) && (
          <div className="bg-slate-900/40 rounded px-3 py-2">
            <p className="text-slate-400 font-mono text-[10px] uppercase mb-1.5">Captured objectives</p>
            <div className="flex gap-3">
              {[['bridge', 'Bridge'], ['engineering', 'Engineering'], ['turrets', 'Turrets']].map(([k, l]) => (
                <span key={k} className={`font-mono text-xs ${boarding.objectives[k] ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {boarding.objectives[k] ? '✅' : '○'} {l}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Outcome selection */}
        <div className="space-y-1.5">
          <p className="text-slate-400 font-mono text-xs uppercase">Choose outcome</p>
          {OUTCOMES.map((o) => (
            <button
              key={o.key}
              onClick={() => setSelectedOutcome(o.key)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded border transition-colors text-left ${
                selectedOutcome === o.key
                  ? OUTCOME_STYLES[o.color].selected
                  : 'bg-slate-800 border-slate-600 hover:border-slate-400'
              }`}
            >
              <span className={`text-lg shrink-0 mt-0.5 ${selectedOutcome === o.key ? OUTCOME_STYLES[o.color].icon : 'text-slate-400'}`}>
                {selectedOutcome === o.key ? '◉' : '○'}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`font-mono text-xs font-bold ${selectedOutcome === o.key ? OUTCOME_STYLES[o.color].label : 'text-slate-300'}`}>
                  {o.label}
                </p>
                <p className="text-slate-400 font-mono text-[10px] mt-0.5">{o.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Faction transfer option — only when attacker wins */}
        {selectedOutcome === 'attacker_wins' && (
          <div className="bg-slate-800/60 rounded px-3 py-2.5 space-y-1.5">
            <p className="text-slate-400 font-mono text-xs uppercase font-bold">Faction transfer — captured ship</p>
            <label className="flex items-center gap-2 text-slate-300 font-mono text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={transferFaction}
                onChange={(e) => setTransferFaction(e.target.checked)}
                className="accent-(--neon-cyan)"
              />
              Transfer {defender.profile.name} to faction{' '}
              <span className={FACTION_COLORS[attacker.faction] ?? 'text-slate-400'}>
                {attacker.faction.toUpperCase()}
              </span>
            </label>
            <p className="text-slate-400 font-mono text-[10px]">
              Enemy crew removed — ship under attacker control.
            </p>
          </div>
        )}

        {/* Confirm */}
        <button
          onClick={handleResolve}
          disabled={!selectedOutcome}
          className="w-full py-2 bg-(--neon-cyan)/10 hover:bg-(--neon-cyan)/20 disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent disabled:cursor-not-allowed border border-(--neon-cyan) text-(--neon-cyan) font-mono text-xs rounded transition-colors"
        >
          CONFIRM OUTCOME
        </button>

      </div>
    </Modal>
  )
}
