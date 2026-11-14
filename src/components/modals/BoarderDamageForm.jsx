/**
 * BoarderDamageForm — GM enters a hit on one boarder; Protection, END and STR/DEX overflow are
 * applied by the store (CRB p.77). The app does not simulate personal combat: damage, AP and
 * Effect come from the GM.
 */

import { useState } from 'react'
import { applyPersonalDamage } from '../../utils/boarders.js'

const input = 'bg-slate-700 border border-slate-600 text-slate-200 font-mono text-xs rounded px-1.5 py-1 w-full focus:outline-none focus:border-(--neon-cyan)/60'

/**
 * @param {{
 *   boarder: import('../../utils/boarders.js').Boarder,
 *   onApply: (hit: { damage: number, ap: number, effect: number }) => void,
 *   onCancel: () => void,
 * }} props
 */
export function BoarderDamageForm({ boarder, onApply, onCancel }) {
  const [damage, setDamage] = useState('')
  const [ap, setAp]         = useState('0')
  const [effect, setEffect] = useState('0')

  const dmg = Number(damage)
  const apValue = Number(ap)
  const effectValue = Number(effect)
  const valid = damage !== '' && Number.isInteger(dmg) && dmg >= 0
    && Number.isInteger(apValue) && apValue >= 0 && Number.isInteger(effectValue)
  const hit = { damage: dmg, ap: apValue, effect: effectValue }
  const preview = valid ? applyPersonalDamage(boarder, hit.damage, hit) : null

  return (
    <div className="bg-slate-900/60 rounded px-2.5 py-2 space-y-2" aria-label={`Damage ${boarder.name}`}>
      <p className="text-slate-300 font-mono text-xs font-bold">Hit on {boarder.name}</p>
      <div className="grid grid-cols-3 gap-2">
        {[['Damage', damage, setDamage], ['AP', ap, setAp], ['Effect', effect, setEffect]].map(([label, value, set]) => (
          <label key={label} className="text-slate-400 font-mono text-2xs">
            {label}
            <input
              type="number" min={label === 'Effect' ? undefined : 0} value={value}
              onChange={(e) => set(e.target.value)} className={`${input} mt-0.5`} aria-label={label}
            />
          </label>
        ))}
      </div>
      {preview && (
        <p className="text-slate-400 font-mono text-2xs">
          Protection {boarder.protection}{hit.ap > 0 ? ` − AP ${hit.ap}` : ''} → absorbs {preview.absorbed},{' '}
          <span className="text-red-400 font-bold">{preview.applied}</span> applied
          {preview.statusAfter !== preview.statusBefore && (
            <span className="text-red-400 font-bold"> · {preview.statusAfter.toUpperCase()}</span>
          )}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => onApply(hit)} disabled={!valid}
          className="flex-1 py-1 bg-red-900/30 border border-red-500 text-red-400 hover:bg-red-900/50 disabled:opacity-40 disabled:cursor-not-allowed font-mono text-xs rounded transition-colors"
        >
          APPLY DAMAGE
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-slate-800 border border-slate-600 text-slate-400 hover:text-slate-200 font-mono text-xs rounded transition-colors"
        >
          CANCEL
        </button>
      </div>
    </div>
  )
}
