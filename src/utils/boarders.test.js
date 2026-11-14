/**
 * Tests for boarders.js — CRB p.77 personal damage, HG pp.132–133 stacking, Companion pp.6–7 morale.
 */

import { describe, it, expect } from 'vitest'
import {
  createBoarder,
  getBoarderStatus,
  applyPersonalDamage,
  getStackOrder,
  pickStackTarget,
  pickRandomMember,
  getCasualtyStats,
  getParties,
  mergeBoarderPatch,
  countByStatus,
} from './boarders.js'

const mk = (over = {}) => createBoarder({ id: 'b', name: 'Marine', str: 7, dex: 7, end: 7, ...over })
const withCur = (b, cur) => ({ ...b, cur: { ...b.cur, ...cur } })

describe('createBoarder', () => {
  it('starts at full health and trims the name', () => {
    const b = createBoarder({ id: 'x', name: '  Kira ', str: 8, dex: 9, end: 10, protection: 4, armourKey: 'vacc_tl8' })
    expect(b.cur).toEqual({ str: 8, dex: 9, end: 10 })
    expect(b.max).toEqual(b.cur)
    expect(b.name).toBe('Kira')
    expect(b.overflowTo).toBe('dex')
  })
  it('falls back to a default name and generates an id', () => {
    const b = createBoarder({ name: '  ', str: 7, dex: 7, end: 7 })
    expect(b.name).toBe('Boarder')
    expect(b.id).toBeTruthy()
  })
  it('allows characteristics above 15 (battle dress)', () => {
    expect(createBoarder({ str: 21, dex: 11, end: 7 }).max.str).toBe(21)
  })
  it.each([
    [{ str: 0, dex: 7, end: 7 }],
    [{ str: 7, dex: 7.5, end: 7 }],
    [{ str: 7, dex: 7, end: undefined }],
  ])('rejects invalid characteristics %j', (stats) => {
    expect(() => createBoarder(stats)).toThrow('STR, DEX and END')
  })
  it('rejects bad Protection and overflow target', () => {
    expect(() => mk({ protection: -1 })).toThrow('Protection')
    expect(() => mk({ overflowTo: 'end' })).toThrow('overflowTo')
  })
})

describe('getBoarderStatus', () => {
  it('ok while STR and DEX are above 0, even with END at 0', () => {
    expect(getBoarderStatus(mk())).toBe('ok')
    expect(getBoarderStatus(withCur(mk(), { end: 0 }))).toBe('ok')
  })
  it('unconscious when STR or DEX is 0', () => {
    expect(getBoarderStatus(withCur(mk(), { str: 0 }))).toBe('unconscious')
    expect(getBoarderStatus(withCur(mk(), { dex: 0 }))).toBe('unconscious')
  })
  it('dead only when STR, DEX and END are all 0', () => {
    expect(getBoarderStatus(withCur(mk(), { str: 0, dex: 0 }))).toBe('unconscious')
    expect(getBoarderStatus(withCur(mk(), { str: 0, dex: 0, end: 0 }))).toBe('dead')
  })
})

describe('applyPersonalDamage', () => {
  it('Protection reduces damage and damage goes to END first', () => {
    const r = applyPersonalDamage(mk({ protection: 4 }), 9)
    expect(r.applied).toBe(5)
    expect(r.absorbed).toBe(4)
    expect(r.boarder.cur).toEqual({ str: 7, dex: 7, end: 2 })
    expect(r.statusAfter).toBe('ok')
  })
  it('damage fully absorbed by Protection does nothing', () => {
    const r = applyPersonalDamage(mk({ protection: 13 }), 10)
    expect(r.applied).toBe(0)
    expect(r.boarder.cur).toEqual({ str: 7, dex: 7, end: 7 })
  })
  it('AP ignores Protection up to its value', () => {
    const r = applyPersonalDamage(mk({ protection: 5 }), 8, { ap: 3 })
    expect(r.applied).toBe(6)
  })
  it('AP larger than Protection does not add damage', () => {
    expect(applyPersonalDamage(mk({ protection: 2 }), 8, { ap: 10 }).applied).toBe(8)
  })
  it('Effect 6+ always inflicts at least 1 point', () => {
    const r = applyPersonalDamage(mk({ protection: 13 }), 3, { effect: 6 })
    expect(r.applied).toBe(1)
    expect(r.boarder.cur.end).toBe(6)
  })
  it('minimum of 1 can be switched off (canister damage is fixed)', () => {
    const r = applyPersonalDamage(mk({ protection: 13 }), 3, { effect: 6, minOneOnEffect6: false })
    expect(r.applied).toBe(0)
  })
  it('Effect 5 has no minimum', () => {
    expect(applyPersonalDamage(mk({ protection: 13 }), 3, { effect: 5 }).applied).toBe(0)
  })
  it('excess over END goes to the chosen overflow stat (DEX)', () => {
    const r = applyPersonalDamage(mk({ overflowTo: 'dex' }), 10)
    expect(r.boarder.cur).toEqual({ str: 7, dex: 4, end: 0 })
  })
  it('excess over END goes to STR when chosen', () => {
    const r = applyPersonalDamage(mk({ overflowTo: 'str' }), 10)
    expect(r.boarder.cur).toEqual({ str: 4, dex: 7, end: 0 })
  })
  it('chosen stat at 0 → unconscious, further damage goes to the other stat', () => {
    const r = applyPersonalDamage(mk({ overflowTo: 'dex' }), 17)
    expect(r.boarder.cur).toEqual({ str: 4, dex: 0, end: 0 })
    expect(r.statusAfter).toBe('unconscious')
  })
  it('already-zero chosen stat sends damage straight to the other', () => {
    const b = withCur(mk({ overflowTo: 'dex' }), { dex: 0, end: 0 })
    const r = applyPersonalDamage(b, 3)
    expect(r.boarder.cur).toEqual({ str: 4, dex: 0, end: 0 })
  })
  it('lethal damage kills and the surplus is discarded', () => {
    const r = applyPersonalDamage(mk(), 100)
    expect(r.boarder.cur).toEqual({ str: 0, dex: 0, end: 0 })
    expect(r.statusBefore).toBe('ok')
    expect(r.statusAfter).toBe('dead')
  })
  it('damage to a dead boarder has no effect', () => {
    const dead = withCur(mk(), { str: 0, dex: 0, end: 0 })
    const r = applyPersonalDamage(dead, 20, { effect: 6 })
    expect(r.boarder).toBe(dead)
    expect(r.applied).toBe(0)
    expect(r.statusAfter).toBe('dead')
  })
  it('does not mutate the input boarder', () => {
    const b = mk()
    applyPersonalDamage(b, 5)
    expect(b.cur).toEqual({ str: 7, dex: 7, end: 7 })
  })
  it('pebble-style 40 damage vs combat armour 13 applies 27', () => {
    expect(applyPersonalDamage(mk({ protection: 13 }), 40, { minOneOnEffect6: false }).applied).toBe(27)
  })
})

describe('stacking', () => {
  const party = ['a', 'b', 'c'].map((id) => mk({ id }))
  const dead = (b) => withCur(b, { str: 0, dex: 0, end: 0 })

  it('getStackOrder drops the dead and keeps roster order', () => {
    expect(getStackOrder([party[0], dead(party[1]), party[2]]).map((b) => b.id)).toEqual(['a', 'c'])
  })
  it('unconscious boarders stay in the line', () => {
    expect(getStackOrder([withCur(party[0], { str: 0 }), party[1]]).map((b) => b.id)).toEqual(['a', 'b'])
  })
  it('roll 9 or less hits the first in the stack', () => {
    expect(pickStackTarget(party, 9, () => 0.99).id).toBe('a')
    expect(pickStackTarget(party, 2).id).toBe('a')
  })
  it('roll 10–12 hits another member of the group', () => {
    expect(pickStackTarget(party, 10, () => 0).id).toBe('b')
    expect(pickStackTarget(party, 12, () => 0.99).id).toBe('c')
  })
  it('a lone survivor is always the target', () => {
    expect(pickStackTarget([party[2]], 11).id).toBe('c')
  })
  it('first living member is the front once the first is dead', () => {
    expect(pickStackTarget([dead(party[0]), party[1], party[2]], 5).id).toBe('b')
  })
  it('returns null when nobody is left', () => {
    expect(pickStackTarget([dead(party[0])], 5)).toBeNull()
    expect(pickStackTarget([], 5)).toBeNull()
  })
})

describe('pickRandomMember', () => {
  const party = ['a', 'b', 'c'].map((id) => mk({ id }))
  it('picks among the living only', () => {
    const dead = withCur(party[0], { str: 0, dex: 0, end: 0 })
    expect(pickRandomMember([dead, party[1], party[2]], () => 0).id).toBe('b')
    expect(pickRandomMember([dead, party[1], party[2]], () => 0.99).id).toBe('c')
  })
  it('returns null for an empty or fully dead group', () => {
    expect(pickRandomMember([])).toBeNull()
    expect(pickRandomMember([withCur(party[0], { str: 0, dex: 0, end: 0 })])).toBeNull()
  })
})

describe('getCasualtyStats', () => {
  const group = (n, down) => Array.from({ length: n }, (_, i) =>
    i < down ? withCur(mk({ id: `b${i}` }), { str: 0 }) : mk({ id: `b${i}` }))

  it('empty party has no casualties and no morale check', () => {
    expect(getCasualtyStats([])).toEqual({ total: 0, down: 0, pct: 0, moraleTarget: null })
  })
  it('below 10% → no check', () => {
    expect(getCasualtyStats(group(11, 1))).toMatchObject({ pct: 9, moraleTarget: null })
  })
  it('10% → MRL 8+', () => {
    expect(getCasualtyStats(group(10, 1))).toMatchObject({ pct: 10, moraleTarget: 8 })
  })
  it('30% → MRL 10+', () => {
    expect(getCasualtyStats(group(10, 3))).toMatchObject({ pct: 30, moraleTarget: 10 })
  })
  it('60% → MRL 12+', () => {
    expect(getCasualtyStats(group(10, 6))).toMatchObject({ pct: 60, moraleTarget: 12 })
  })
  it('percentage is floored so display and threshold agree (8/27 = 29%)', () => {
    expect(getCasualtyStats(group(27, 8))).toMatchObject({ pct: 29, moraleTarget: 8 })
  })
  it('exact thresholds survive floating point (29/100 is 29%, 30/100 is 30%)', () => {
    expect(getCasualtyStats(group(100, 29))).toMatchObject({ pct: 29, moraleTarget: 8 })
    expect(getCasualtyStats(group(100, 30))).toMatchObject({ pct: 30, moraleTarget: 10 })
  })
  it('counts unconscious and dead together', () => {
    const party = [mk(), withCur(mk(), { str: 0 }), withCur(mk(), { str: 0, dex: 0, end: 0 }), mk()]
    expect(getCasualtyStats(party)).toMatchObject({ total: 4, down: 2, pct: 50, moraleTarget: 10 })
  })
})

describe('getParties', () => {
  it('returns empty rosters for a legacy boarding without parties', () => {
    expect(getParties({})).toEqual({ attacker: [], defender: [] })
    expect(getParties(undefined)).toEqual({ attacker: [], defender: [] })
  })
  it('fills a missing side', () => {
    const b = mk()
    expect(getParties({ parties: { attacker: [b] } })).toEqual({ attacker: [b], defender: [] })
  })
  it('returns the stored rosters untouched', () => {
    const parties = { attacker: [mk({ id: 'a' })], defender: [mk({ id: 'd' })] }
    expect(getParties({ parties })).toEqual(parties)
  })
})

describe('countByStatus', () => {
  it('counts fit, unconscious and dead boarders', () => {
    const party = [mk(), withCur(mk(), { str: 0 }), withCur(mk(), { str: 0, dex: 0, end: 0 }), mk()]
    expect(countByStatus(party)).toEqual({ ok: 2, unconscious: 1, dead: 1 })
  })
  it('empty party', () => {
    expect(countByStatus([])).toEqual({ ok: 0, unconscious: 0, dead: 0 })
  })
})

describe('mergeBoarderPatch', () => {
  it('edits fields without mutating the input', () => {
    const b = mk()
    const r = mergeBoarderPatch(b, { name: ' Sgt ', protection: 8, armourKey: 'vacc_tl10', overflowTo: 'str' })
    expect(r).toMatchObject({ name: 'Sgt', protection: 8, armourKey: 'vacc_tl10', overflowTo: 'str' })
    expect(b.protection).toBe(0)
  })
  it('keeps the old name when the new one is blank', () => {
    expect(mergeBoarderPatch(mk(), { name: '   ' }).name).toBe('Marine')
  })
  it('clamps current characteristics to a lowered max', () => {
    const r = mergeBoarderPatch(mk(), { max: { end: 5 } })
    expect(r.max.end).toBe(5)
    expect(r.cur.end).toBe(5)
  })
  it('can set current to 0 (damage correction) but never above max', () => {
    expect(mergeBoarderPatch(mk(), { cur: { end: 0 } }).cur.end).toBe(0)
    expect(mergeBoarderPatch(mk(), { cur: { end: 99 } }).cur.end).toBe(7)
  })
  it.each([
    [{ protection: -1 }],
    [{ overflowTo: 'end' }],
    [{ cur: { str: -1 } }],
    [{ cur: { str: 1.5 } }],
    [{ max: { dex: 0 } }],
  ])('rejects invalid patch %j', (patch) => {
    expect(mergeBoarderPatch(mk(), patch)).toBeNull()
  })
})
