/**
 * BoardingConflictModal — Fase 3: Conflitto.
 * GM tracks 3 tactical objectives, rolls stacking checks, missed-shot table,
 * and advances to the outcome phase.
 * @see boarding-system-design.md §3.3, §5.3
 * @see HG 2022 pp.131–133
 */

import { useState } from 'react'
import { Modal }          from './Modal.jsx'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore }     from '../../store/uiStore.js'
import { rollStackingCheck, rollMissedShot } from '../../utils/boarding.js'

// ---------------------------------------------------------------------------
// Objective row
// ---------------------------------------------------------------------------

/**
 * @param {{ name: string, label: string, desc: string, conquered: boolean, onChange: (v: boolean) => void }} props
 */
function ObjectiveRow({ name, label, desc, conquered, onChange }) {
  return (
    <button
      onClick={() => onChange(!conquered)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded border transition-colors text-left ${
        conquered
          ? 'bg-emerald-900/30 border-emerald-500'
          : 'bg-slate-800 border-slate-600 hover:border-slate-400'
      }`}
    >
      <span className={`text-lg shrink-0 ${conquered ? 'opacity-100' : 'opacity-40'}`}>
        {conquered ? '✓' : '○'}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`font-mono text-xs font-bold ${conquered ? 'text-emerald-400' : 'text-slate-300'}`}>
          {label}
        </p>
        <p className="text-slate-500 font-mono text-[10px]">{desc}</p>
      </div>
      <span className={`font-mono text-xs shrink-0 ${conquered ? 'text-emerald-400' : 'text-slate-600'}`}>
        {conquered ? 'CONQUISTATO' : 'CONTESO'}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Roll result badge
// ---------------------------------------------------------------------------

function RollResult({ result }) {
  if (!result) return null
  return (
    <div className="bg-slate-900/60 rounded px-3 py-2 space-y-1">
      <p className="text-slate-500 font-mono text-[10px]">
        Dado: [{result.results.join(', ')}] → {result.modified ?? result.total}
      </p>
      <p className={`font-mono text-xs font-bold ${
        result.outcome === 'critical_system' ? 'text-red-400' :
        result.outcome === 'attacker_hit'    ? 'text-amber-400' :
        result.outcome === 'success'          ? 'text-emerald-400' :
        'text-slate-300'
      }`}>
        {result.label}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const OBJECTIVES = [
  { key: 'bridge',      label: 'Ponte',      desc: 'Controllo remoto tutti i sistemi' },
  { key: 'engineering', label: 'Engineering', desc: 'Propulsione, reattore, supporto vitale' },
  { key: 'turrets',     label: 'Torrette',   desc: 'Sistemi d\'arma' },
]

export function BoardingConflictModal() {
  const { activeModal, modalPayload, closeModal } = useUiStore()
  const { ships, boardings, setObjective, advanceBoardingPhase } = useBattleStore()

  const [stackResult, setStackResult]   = useState(null)
  const [missedResult, setMissedResult] = useState(null)
  const [armoredBulkhead, setArmoredBulkhead] = useState(false)

  const isOpen = activeModal === 'boarding-conflict'
  if (!isOpen) return null

  const boarding = boardings.find(
    (b) => b.attackerId === modalPayload?.boardingAttackerId && b.phase === 'conflict' && b.outcome === null,
  )
  if (!boarding) return null

  const attacker = ships.find((s) => s.id === boarding.attackerId)
  const defender = ships.find((s) => s.id === boarding.defenderId)
  if (!attacker || !defender) return null

  const allConquered = OBJECTIVES.every((o) => boarding.objectives[o.key])

  function handleStack() {
    setStackResult(rollStackingCheck())
  }

  function handleMissedShot() {
    const res = rollMissedShot(armoredBulkhead)
    setMissedResult(res)
  }

  function handleAdvance() {
    advanceBoardingPhase(boarding.id)
    closeModal()
  }

  return (
    <Modal title="⚔ CONFLITTO" onClose={closeModal}>
      <div className="space-y-4 min-w-80">

        {/* Ships banner */}
        <div className="flex items-center gap-3 bg-slate-800/60 rounded px-3 py-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: attacker.color }} />
            <span className="text-slate-200 font-mono text-xs font-bold truncate">{attacker.profile.name}</span>
          </div>
          <span className="text-red-400 font-mono text-xs shrink-0">⚔ CONFLITTO</span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
            <span className="text-slate-200 font-mono text-xs font-bold truncate">{defender.profile.name}</span>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: defender.color }} />
          </div>
        </div>

        {/* Tactical objectives */}
        <div className="space-y-1.5">
          <p className="text-slate-500 font-mono text-xs uppercase">Obiettivi tattici</p>
          {OBJECTIVES.map((o) => (
            <ObjectiveRow
              key={o.key}
              name={o.key}
              label={o.label}
              desc={o.desc}
              conquered={boarding.objectives[o.key]}
              onChange={(v) => setObjective(boarding.id, o.key, v)}
            />
          ))}
          {allConquered && (
            <p className="text-center text-emerald-400 font-mono text-xs py-1 font-bold">
              ✓ NAVE PRESA — tutti gli obiettivi conquistati
            </p>
          )}
        </div>

        {/* Stacking check */}
        <div className="bg-slate-800/60 rounded px-3 py-2.5 space-y-2">
          <p className="text-slate-400 font-mono text-xs uppercase font-bold">
            Stacking — mirare bersaglio non-primo
          </p>
          <p className="text-slate-500 font-mono text-[10px]">
            Roll 2D ≥ 10, altrimenti primo della fila diventa bersaglio. (HG p.131)
          </p>
          <button
            onClick={handleStack}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-500 text-slate-200 font-mono text-xs rounded transition-colors"
          >
            TIRA STACKING
          </button>
          {stackResult && (
            <RollResult result={{
              results: stackResult.results,
              total: stackResult.total,
              outcome: stackResult.success ? 'success' : 'fail',
              label: stackResult.success
                ? `✓ Successo (${stackResult.total}) — puoi mirare al bersaglio scelto`
                : `✗ Fallimento (${stackResult.total}) — il primo della fila diventa bersaglio`,
            }} />
          )}
        </div>

        {/* Missed shot table */}
        <div className="bg-slate-800/60 rounded px-3 py-2.5 space-y-2">
          <p className="text-slate-400 font-mono text-xs uppercase font-bold">
            Colpo mancato — dove finisce il proiettile
          </p>
          <p className="text-slate-500 font-mono text-[10px]">
            Ogni attacco che manca tira 2D su questa tabella. (HG p.132)
          </p>
          <label className="flex items-center gap-2 text-slate-400 font-mono text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={armoredBulkhead}
              onChange={(e) => setArmoredBulkhead(e.target.checked)}
              className="accent-[--neon-cyan]"
            />
            Paratia corazzata (DM −1)
          </label>
          <button
            onClick={handleMissedShot}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-500 text-slate-200 font-mono text-xs rounded transition-colors"
          >
            TIRA COLPO MANCATO
          </button>
          {missedResult && <RollResult result={missedResult} />}
        </div>

        {/* Weapon DM reminder */}
        <div className="bg-slate-900/40 rounded px-3 py-2">
          <p className="text-slate-500 font-mono text-[10px] uppercase mb-1">DM armi in spazi stretti</p>
          <p className="text-slate-400 font-mono text-xs">Fucili −2 · Armi pesanti −4 · Granate → 6D+</p>
        </div>

        {/* Advance to security */}
        <button
          onClick={handleAdvance}
          className="w-full py-2 bg-[--neon-cyan]/10 hover:bg-[--neon-cyan]/20 border border-[--neon-cyan] text-[--neon-cyan] font-mono text-xs rounded transition-colors"
        >
          FINE CONFLITTO — AVANZA A SICUREZZA →
        </button>

      </div>
    </Modal>
  )
}
