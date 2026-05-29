/**
 * DiceInput — manual 2D6 entry for player dice rolls.
 * Displays two die inputs (1–6) + running total + auto-roll button.
 */

import { roll2D6 } from '../../utils/dice.js'

/**
 * @param {{
 *   value: { results: [number, number], total: number },
 *   onChange: (roll: { results: [number, number], total: number }) => void,
 * }} props
 */
export function DiceInput({ value, onChange }) {
  const [d1, d2] = value.results

  const update = (newD1, newD2) => {
    const r1 = Math.max(1, Math.min(6, newD1 || 1))
    const r2 = Math.max(1, Math.min(6, newD2 || 1))
    onChange({ results: [r1, r2], total: r1 + r2 })
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={1}
        max={6}
        value={d1}
        onChange={(e) => update(Number(e.target.value), d2)}
        className="w-9 bg-slate-700 border border-slate-600 text-slate-200 font-mono text-sm rounded text-center px-1 py-0.5 focus:outline-none focus:border-[--neon-cyan]/60"
        aria-label="Die 1"
      />
      <span className="text-slate-600 font-mono text-xs">+</span>
      <input
        type="number"
        min={1}
        max={6}
        value={d2}
        onChange={(e) => update(d1, Number(e.target.value))}
        className="w-9 bg-slate-700 border border-slate-600 text-slate-200 font-mono text-sm rounded text-center px-1 py-0.5 focus:outline-none focus:border-[--neon-cyan]/60"
        aria-label="Die 2"
      />
      <span className="text-[--neon-cyan] font-mono text-sm font-bold w-5 text-center">
        {d1 + d2}
      </span>
      <button
        type="button"
        onClick={() => onChange(roll2D6())}
        className="text-slate-500 hover:text-[--neon-cyan] font-mono text-sm transition-colors leading-none"
        title="Auto-roll"
        aria-label="Auto-roll dice"
      >
        🎲
      </button>
    </div>
  )
}
