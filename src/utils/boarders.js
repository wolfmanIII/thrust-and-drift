/**
 * Individual boarders — GM-defined combatants with personal damage tracking.
 * Pure functions: no store access, RNG injectable for tests.
 * @see MgT2e CRB p.77 (personal damage), HG pp.132–133 (stacking, missed shots),
 *      Traveller Companion pp.6–7 (morale)
 */

import { v7 as uuidv7 } from 'uuid'

/**
 * @typedef {{ str: number, dex: number, end: number }} PhysicalStats
 * @typedef {'ok'|'unconscious'|'dead'} BoarderStatus
 * @typedef {{
 *   id: string,
 *   name: string,
 *   max: PhysicalStats,
 *   cur: PhysicalStats,
 *   protection: number,
 *   armourKey: string|null,
 *   overflowTo: 'str'|'dex',
 * }} Boarder
 */

const isPositiveInt    = (n) => Number.isInteger(n) && n >= 1
const isNonNegativeInt = (n) => Number.isInteger(n) && n >= 0

/**
 * Build a boarder at full health.
 * Characteristics have no upper bound: armour such as battle dress can raise STR/DEX
 * well above 15. // MgT2e CRB p.100
 * @param {{
 *   id?: string, name?: string, str: number, dex: number, end: number,
 *   protection?: number, armourKey?: string|null, overflowTo?: 'str'|'dex',
 * }} data
 * @returns {Boarder}
 * @throws {Error} on invalid characteristics, Protection or overflow target
 */
export function createBoarder({
  id = uuidv7(), name = 'Boarder', str, dex, end,
  protection = 0, armourKey = null, overflowTo = 'dex',
}) {
  if (![str, dex, end].every(isPositiveInt)) {
    throw new Error('Boarder STR, DEX and END must be integers ≥ 1')
  }
  if (!isNonNegativeInt(protection)) {
    throw new Error('Boarder Protection must be an integer ≥ 0')
  }
  if (overflowTo !== 'str' && overflowTo !== 'dex') {
    throw new Error("Boarder overflowTo must be 'str' or 'dex'")
  }
  const trimmed = String(name).trim()
  return {
    id,
    name: trimmed === '' ? 'Boarder' : trimmed,
    max: { str, dex, end },
    cur: { str, dex, end },
    protection,
    armourKey,
    overflowTo,
  }
}

/**
 * Derived status — never stored.
 * STR or DEX at 0 = unconscious; STR, DEX and END all at 0 = dead. // MgT2e CRB p.77
 * END at 0 alone is not incapacitating: it only redirects further damage.
 * @param {Boarder} boarder
 * @returns {BoarderStatus}
 */
export function getBoarderStatus(boarder) {
  const { str, dex, end } = boarder.cur
  if (str === 0 && dex === 0 && end === 0) return 'dead'
  if (str === 0 || dex === 0) return 'unconscious'
  return 'ok'
}

/**
 * Apply one hit of personal damage.
 * Protection reduces the damage (AP ignores Protection up to its value); an attack with
 * Effect 6+ always inflicts at least 1 point. Damage goes to END first; the excess goes to the
 * boarder's chosen STR/DEX, and once that one is 0 the remainder goes to the other one.
 * Damage to a dead boarder has no effect. // MgT2e CRB p.77
 * @param {Boarder} boarder
 * @param {number}  raw     Damage rolled (already includes Effect where the source adds it)
 * @param {{ ap?: number, effect?: number, minOneOnEffect6?: boolean }} [opts]
 * @returns {{ boarder: Boarder, absorbed: number, applied: number, statusBefore: BoarderStatus, statusAfter: BoarderStatus }}
 */
export function applyPersonalDamage(boarder, raw, { ap = 0, effect = 0, minOneOnEffect6 = true } = {}) {
  const statusBefore = getBoarderStatus(boarder)
  if (statusBefore === 'dead') {
    return { boarder, absorbed: 0, applied: 0, statusBefore, statusAfter: 'dead' }
  }

  const protection = Math.max(0, boarder.protection - Math.max(0, ap))
  let applied = Math.max(0, raw - protection)
  if (minOneOnEffect6 && effect >= 6 && applied < 1) applied = 1

  const cur = { ...boarder.cur }
  const toEnd = Math.min(cur.end, applied)
  cur.end -= toEnd
  let excess = applied - toEnd

  const first  = cur[boarder.overflowTo] > 0 ? boarder.overflowTo : (boarder.overflowTo === 'str' ? 'dex' : 'str')
  const second = first === 'str' ? 'dex' : 'str'
  const toFirst = Math.min(cur[first], excess)
  cur[first] -= toFirst
  excess -= toFirst
  const toSecond = Math.min(cur[second], excess)
  cur[second] -= toSecond

  const next = { ...boarder, cur }
  return {
    boarder: next,
    absorbed: Math.max(0, raw - applied),
    applied,
    statusBefore,
    statusAfter: getBoarderStatus(next),
  }
}

/**
 * Boarders still in the line: everyone except the dead, in roster order.
 * The roster order is the stack order. // MgT2e HG p.132
 * @param {Boarder[]} party
 * @returns {Boarder[]}
 */
export function getStackOrder(party) {
  return party.filter((b) => getBoarderStatus(b) !== 'dead')
}

/**
 * Pick who an un-aimed attack hits: on 2D 9 or less the first in the stack, on 10–12 another
 * member of the group. // MgT2e HG p.132
 * @param {Boarder[]} party
 * @param {number} roll2d  2D total rolled after a successful roll to hit
 * @param {() => number} [rng]  returns [0,1)
 * @returns {Boarder|null}  null when nobody is left
 */
export function pickStackTarget(party, roll2d, rng = Math.random) {
  const order = getStackOrder(party)
  if (order.length === 0) return null
  if (roll2d <= 9 || order.length === 1) return order[0]
  const others = order.slice(1)
  return others[Math.floor(rng() * others.length)]
}

/**
 * Random living member of a group — used by the Missed Shots table. // MgT2e HG p.133
 * @param {Boarder[]} party
 * @param {() => number} [rng]  returns [0,1)
 * @returns {Boarder|null}
 */
export function pickRandomMember(party, rng = Math.random) {
  const order = getStackOrder(party)
  if (order.length === 0) return null
  return order[Math.floor(rng() * order.length)]
}

/**
 * Casualty figures and the Morale check the Referee may call. Unconscious and dead count as
 * casualties. Thresholds: 10% casualties → MRL 8+, 30% → 10+, 60% → 12+.
 * The app only reports the threshold, it never rolls the check. // Traveller Companion pp.6–7
 * @param {Boarder[]} party
 * @returns {{ total: number, down: number, pct: number, moraleTarget: 8|10|12|null }}
 */
export function getCasualtyStats(party) {
  const total = party.length
  const down  = party.filter((b) => getBoarderStatus(b) !== 'ok').length
  const ratio = total === 0 ? 0 : (down / total) * 100
  let moraleTarget = null
  if (ratio >= 60) moraleTarget = 12
  else if (ratio >= 30) moraleTarget = 10
  else if (ratio >= 10) moraleTarget = 8
  return { total, down, pct: Math.round(ratio), moraleTarget }
}
