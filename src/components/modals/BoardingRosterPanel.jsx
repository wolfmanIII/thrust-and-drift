/**
 * BoardingRosterPanel — GM-defined rosters for both sides of a boarding action.
 * Roster order is the stack order (HG p.132). Status is derived from the characteristics
 * (CRB p.77); casualty figures show when the Referee may call a Morale check (Companion pp.6–7).
 */

import { useState } from 'react'
import { useBattleStore } from '../../store/battleStore.js'
import { getBoarderStatus, getCasualtyStats } from '../../utils/boarders.js'
import { BoarderForm } from './BoarderForm.jsx'
import { BoarderDamageForm } from './BoarderDamageForm.jsx'

const STATUS_STYLE = {
  ok:          'text-emerald-400',
  unconscious: 'text-amber-400',
  dead:        'text-red-400',
}

const smallBtn = 'px-1.5 py-0.5 bg-slate-800 border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400 font-mono text-2xs rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed'
const editInput = 'bg-slate-700 border border-slate-600 text-slate-200 font-mono text-xs rounded px-1 py-0.5 w-full focus:outline-none focus:border-(--neon-cyan)/60'

/**
 * Inline editor for a boarder's name, Protection and current characteristics (GM correction).
 * @param {{ boarder: object, onSave: (patch: object) => void, onCancel: () => void }} props
 */
function BoarderEditor({ boarder, onSave, onCancel }) {
  const [name, setName] = useState(boarder.name)
  const [vals, setVals] = useState({
    str: String(boarder.cur.str), dex: String(boarder.cur.dex), end: String(boarder.cur.end),
    protection: String(boarder.protection),
  })
  const num = (k) => Number(vals[k])
  const valid = ['str', 'dex', 'end', 'protection'].every((k) => vals[k] !== '' && Number.isInteger(num(k)) && num(k) >= 0)

  return (
    <div className="space-y-1.5 py-1" aria-label={`Edit ${boarder.name}`}>
      <input value={name} onChange={(e) => setName(e.target.value)} className={editInput} aria-label="Name" />
      <div className="grid grid-cols-4 gap-1.5">
        {[['str', 'STR'], ['dex', 'DEX'], ['end', 'END'], ['protection', 'PROT']].map(([k, label]) => (
          <label key={k} className="text-slate-400 font-mono text-2xs">
            {label}
            <input
              type="number" min={0} value={vals[k]}
              onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))}
              className={editInput} aria-label={`Current ${label}`}
            />
          </label>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button
          disabled={!valid}
          onClick={() => onSave({ name, protection: num('protection'), cur: { str: num('str'), dex: num('dex'), end: num('end') } })}
          className={`${smallBtn} flex-1`}
        >
          SAVE
        </button>
        <button onClick={onCancel} className={smallBtn}>CANCEL</button>
      </div>
    </div>
  )
}

/**
 * @param {{
 *   side: 'attacker'|'defender',
 *   title: string,
 *   boarding: object,
 *   damageTarget: { side: string, boarderId: string }|null,
 *   setDamageTarget: (t: { side: string, boarderId: string }|null) => void,
 * }} props
 */
function PartySection({ side, title, boarding, damageTarget, setDamageTarget }) {
  const addBoarders       = useBattleStore((s) => s.addBoarders)
  const updateBoarder     = useBattleStore((s) => s.updateBoarder)
  const removeBoarder     = useBattleStore((s) => s.removeBoarder)
  const reorderBoarder    = useBattleStore((s) => s.reorderBoarder)
  const applyBoarderDamage = useBattleStore((s) => s.applyBoarderDamage)

  const [adding, setAdding]     = useState(false)
  const [editingId, setEditingId] = useState(null)

  const party = boarding.parties?.[side] ?? []
  const stats = getCasualtyStats(party)
  const damaging = damageTarget?.side === side
    ? party.find((b) => b.id === damageTarget.boarderId) ?? null
    : null

  return (
    <div className="space-y-1.5" data-testid={`roster-${side}`}>
      <div className="flex items-center gap-2">
        <p className="text-slate-300 font-mono text-xs font-bold uppercase flex-1 truncate">{title}</p>
        <span className="text-slate-400 font-mono text-2xs">
          {stats.down}/{stats.total} down{stats.total > 0 ? ` (${stats.pct}%)` : ''}
        </span>
      </div>
      {stats.moraleTarget && (
        <p className="text-amber-400 font-mono text-2xs">
          Casualties {stats.pct}% — the Referee may call a Morale check (MRL {stats.moraleTarget}+). Companion pp.6–7
        </p>
      )}

      {party.length === 0 && <p className="text-slate-400 font-mono text-2xs">No boarders defined.</p>}

      <ol className="space-y-1">
        {party.map((b, i) => {
          const status = getBoarderStatus(b)
          return (
            <li key={b.id} className="bg-slate-800/60 rounded px-2 py-1">
              {editingId === b.id ? (
                <BoarderEditor
                  boarder={b}
                  onSave={(patch) => { updateBoarder(boarding.id, side, b.id, patch); setEditingId(null) }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="text-slate-400 w-4 shrink-0">{i + 1}</span>
                  <span className={`flex-1 min-w-0 truncate ${status === 'dead' ? 'line-through text-slate-400' : 'text-slate-200'}`}>{b.name}</span>
                  <span className="text-slate-400 text-2xs shrink-0" title="current/max">
                    S{b.cur.str}/{b.max.str} D{b.cur.dex}/{b.max.dex} E{b.cur.end}/{b.max.end}
                  </span>
                  <span className="text-slate-400 text-2xs shrink-0">P{b.protection}</span>
                  <span className={`text-2xs font-bold uppercase shrink-0 w-12 text-right ${STATUS_STYLE[status]}`}>{status === 'ok' ? 'OK' : status === 'unconscious' ? 'DOWN' : 'DEAD'}</span>
                  <button className={smallBtn} aria-label={`Move ${b.name} up`} disabled={i === 0} onClick={() => reorderBoarder(boarding.id, side, b.id, -1)}>↑</button>
                  <button className={smallBtn} aria-label={`Move ${b.name} down`} disabled={i === party.length - 1} onClick={() => reorderBoarder(boarding.id, side, b.id, 1)}>↓</button>
                  <button className={smallBtn} aria-label={`Damage ${b.name}`} disabled={status === 'dead'} onClick={() => setDamageTarget({ side, boarderId: b.id })}>DMG</button>
                  <button className={smallBtn} aria-label={`Edit ${b.name}`} onClick={() => setEditingId(b.id)}>✎</button>
                  <button className={smallBtn} aria-label={`Remove ${b.name}`} onClick={() => removeBoarder(boarding.id, side, b.id)}>✕</button>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {damaging && (
        <BoarderDamageForm
          key={damaging.id}
          boarder={damaging}
          onApply={(hit) => {
            applyBoarderDamage(boarding.id, side, [{ boarderId: damaging.id, ...hit }], 'Hit')
            setDamageTarget(null)
          }}
          onCancel={() => setDamageTarget(null)}
        />
      )}

      {adding ? (
        <BoarderForm
          onSubmit={(dataList) => { addBoarders(boarding.id, side, dataList); setAdding(false) }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button onClick={() => setAdding(true)} className={`${smallBtn} w-full py-1 text-xs`}>+ ADD BOARDERS</button>
      )}
    </div>
  )
}

/**
 * @param {{
 *   boarding: object,
 *   attackerName: string,
 *   defenderName: string,
 *   damageTarget: { side: string, boarderId: string }|null,
 *   setDamageTarget: (t: { side: string, boarderId: string }|null) => void,
 * }} props
 */
export function BoardingRosterPanel({ boarding, attackerName, defenderName, damageTarget, setDamageTarget }) {
  const [open, setOpen] = useState(false)
  const total = (boarding.parties?.attacker.length ?? 0) + (boarding.parties?.defender.length ?? 0)

  return (
    <div className="bg-slate-800/40 rounded px-3 py-2 space-y-2" data-testid="boarding-roster">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-slate-400 hover:text-slate-200 font-mono text-xs uppercase font-bold transition-colors"
        aria-expanded={open || !!damageTarget}
      >
        <span>Parties{total > 0 ? ` · ${total}` : ''}</span>
        <span>{open || damageTarget ? '▾' : '▸'}</span>
      </button>
      {(open || damageTarget) && (
        <div className="space-y-3">
          <PartySection side="attacker" title={`Boarding party — ${attackerName}`} boarding={boarding} damageTarget={damageTarget} setDamageTarget={setDamageTarget} />
          <PartySection side="defender" title={`Defenders — ${defenderName}`} boarding={boarding} damageTarget={damageTarget} setDamageTarget={setDamageTarget} />
        </div>
      )}
    </div>
  )
}
