/**
 * BoarderForm — GM form to add one or more boarders to a roster.
 */

import { NPC_EXPERIENCE, PERSONAL_ARMOUR } from '../../data/boarderPresets.js'
import { MAX_BOARDER_BATCH } from '../../utils/boarders.js'
import { useBoarderForm } from './useBoarderForm.js'

const input = 'bg-slate-700 border border-slate-600 text-slate-200 font-mono text-xs rounded px-1.5 py-1 focus:outline-none focus:border-(--neon-cyan)/60'

/**
 * @param {{ onSubmit: (dataList: object[]) => void, onCancel: () => void }} props
 */
export function BoarderForm({ onSubmit, onCancel }) {
  const { form, setField, chooseExperience, chooseArmour, experienceHint, error, build, reset } = useBoarderForm()

  function handleSubmit(e) {
    e.preventDefault()
    const dataList = build()
    if (!dataList) return
    onSubmit(dataList)
    reset()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900/60 rounded px-2.5 py-2 space-y-2" aria-label="Add boarders">
      <div className="flex gap-2">
        <label className="flex-1 text-slate-400 font-mono text-2xs">
          Name
          <input
            value={form.name} onChange={(e) => setField('name', e.target.value)}
            className={`${input} w-full mt-0.5`} aria-label="Boarder name"
          />
        </label>
        <label className="w-14 text-slate-400 font-mono text-2xs">
          Qty
          <input
            type="number" min={1} max={MAX_BOARDER_BATCH} value={form.count} onChange={(e) => setField('count', e.target.value)}
            className={`${input} w-full mt-0.5`} aria-label="Quantity"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <label className="flex-1 text-slate-400 font-mono text-2xs">
          Experience
          <select
            value={form.experience} onChange={(e) => chooseExperience(e.target.value)}
            className={`${input} w-full mt-0.5`} aria-label="Experience"
          >
            {Object.entries(NPC_EXPERIENCE).map(([k, l]) => <option key={k} value={k}>{l.label}</option>)}
          </select>
        </label>
        <label className="flex-1 text-slate-400 font-mono text-2xs">
          Armour
          <select
            value={form.armourKey} onChange={(e) => chooseArmour(e.target.value)}
            className={`${input} w-full mt-0.5`} aria-label="Armour"
          >
            {Object.entries(PERSONAL_ARMOUR).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}
          </select>
        </label>
      </div>
      {experienceHint && <p className="text-amber-400 font-mono text-2xs">{experienceHint}</p>}

      <div className="grid grid-cols-5 gap-2">
        {[['str', 'STR'], ['dex', 'DEX'], ['end', 'END'], ['protection', 'PROT']].map(([key, label]) => (
          <label key={key} className="text-slate-400 font-mono text-2xs">
            {label}
            <input
              type="number" min={key === 'protection' ? 0 : 1} value={form[key]}
              onChange={(e) => setField(key, e.target.value)}
              className={`${input} w-full mt-0.5`} aria-label={label}
            />
          </label>
        ))}
        <label className="text-slate-400 font-mono text-2xs">
          Overflow
          <select
            value={form.overflowTo} onChange={(e) => setField('overflowTo', e.target.value)}
            className={`${input} w-full mt-0.5`} aria-label="Overflow to"
          >
            <option value="dex">DEX</option>
            <option value="str">STR</option>
          </select>
        </label>
      </div>
      <p className="text-slate-400 font-mono text-2xs">
        Damage past END goes to the Overflow characteristic (the boarder&apos;s choice). CRB p.77.
      </p>

      {error && <p role="alert" className="text-red-400 font-mono text-2xs">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit" disabled={!!error}
          className="flex-1 py-1 bg-(--neon-cyan)/10 hover:bg-(--neon-cyan)/20 disabled:opacity-40 disabled:cursor-not-allowed border border-(--neon-cyan) text-(--neon-cyan) font-mono text-xs rounded transition-colors"
        >
          ADD
        </button>
        <button
          type="button" onClick={onCancel}
          className="px-3 py-1 bg-slate-800 border border-slate-600 text-slate-400 hover:text-slate-200 font-mono text-xs rounded transition-colors"
        >
          CLOSE
        </button>
      </div>
    </form>
  )
}
