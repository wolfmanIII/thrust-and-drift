/**
 * DiceInput — manual 2D6 entry for player dice rolls.
 * Inputs start empty; emits null until both dice are valid (1–6).
 * 🎲 button fills both inputs with an auto-roll as opt-in fallback.
 */

import { useState } from 'react'
import { roll2D6 } from '../../utils/dice.js'

/**
 * @param {{
 *   value: { results: [number, number], total: number } | null,
 *   onChange: (roll: { results: [number, number], total: number } | null) => void,
 * }} props
 * value used only as initial state (not controlled after mount — use key prop to reset).
 */
export function DiceInput({ value, onChange }) {
  const [d1, setD1] = useState(value?.results[0]?.toString() ?? '')
  const [d2, setD2] = useState(value?.results[1]?.toString() ?? '')

  const emit = (s1, s2) => {
    const r1 = parseInt(s1, 10)
    const r2 = parseInt(s2, 10)
    if (r1 >= 1 && r1 <= 6 && r2 >= 1 && r2 <= 6) {
      onChange({ results: [r1, r2], total: r1 + r2 })
    } else {
      onChange(null)
    }
  }

  const handleD1 = (e) => { setD1(e.target.value); emit(e.target.value, d2) }
  const handleD2 = (e) => { setD2(e.target.value); emit(d1, e.target.value) }

  const handleAutoRoll = () => {
    const r = roll2D6()
    setD1(r.results[0].toString())
    setD2(r.results[1].toString())
    onChange(r)
  }

  const r1 = parseInt(d1, 10)
  const r2 = parseInt(d2, 10)
  const total = (r1 >= 1 && r1 <= 6 && r2 >= 1 && r2 <= 6) ? r1 + r2 : '?'

  const inputClass = 'w-9 bg-slate-700 border border-slate-600 text-slate-200 font-mono text-sm rounded text-center px-1 py-0.5 focus:outline-none focus:border-[--neon-cyan]/60'

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number" min={1} max={6} value={d1} placeholder="—"
        onChange={handleD1} className={inputClass} aria-label="Die 1"
      />
      <span className="text-slate-600 font-mono text-xs">+</span>
      <input
        type="number" min={1} max={6} value={d2} placeholder="—"
        onChange={handleD2} className={inputClass} aria-label="Die 2"
      />
      <span className={`font-mono text-sm font-bold w-5 text-center ${total === '?' ? 'text-slate-600' : 'text-[--neon-cyan]'}`}>
        {total}
      </span>
      <button
        type="button"
        onClick={handleAutoRoll}
        className="text-slate-500 hover:text-[--neon-cyan] font-mono text-sm transition-colors leading-none"
        title="Auto-roll"
        aria-label="Auto-roll dice"
      >
        🎲
      </button>
    </div>
  )
}
