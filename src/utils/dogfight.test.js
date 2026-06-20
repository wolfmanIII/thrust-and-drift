import { describe, it, expect } from 'vitest'
import {
  getTonnageDM,
  rollDogfightPilot,
  resolveDogfightChecks,
  dogfightAttackDM,
  canEscape,
  freeThrust,
  computeShipDMs,
  bestPilot,
  escapeCheckTotals,
} from './dogfight.js'

// Helper: minimal ship mock that satisfies dogfight utility expectations.
function makeShip(id, faction, { pilotSkill = 0, tonnage = 0, thrust = 4, dexDM = 0, thrustUsed = 0 } = {}) {
  return {
    id,
    faction,
    profile: { crew: { pilot: pilotSkill }, tonnage, thrust, dexDM },
    crewAssignments: null,
    thrustUsedThisRound: thrustUsed,
  }
}

// ── getTonnageDM ─────────────────────────────────────────────────────────────

describe('getTonnageDM', () => {
  it('returns 0 for undefined', () => expect(getTonnageDM(undefined)).toBe(0))
  it('returns 0 for 0', ()         => expect(getTonnageDM(0)).toBe(0))
  it('returns 0 for fighter (10t)', () => expect(getTonnageDM(10)).toBe(0))
  it('returns 0 for 49t',          () => expect(getTonnageDM(49)).toBe(0))
  it('returns -1 for 50t',         () => expect(getTonnageDM(50)).toBe(-1))
  it('returns -1 for 99t',         () => expect(getTonnageDM(99)).toBe(-1))
  it('returns -2 for 100t',        () => expect(getTonnageDM(100)).toBe(-2))
  it('returns -2 for 199t',        () => expect(getTonnageDM(199)).toBe(-2))
  it('returns -3 for 200t',        () => expect(getTonnageDM(200)).toBe(-3))
  it('returns -4 for 300t',        () => expect(getTonnageDM(300)).toBe(-4))
  it('returns -7 for 600t',        () => expect(getTonnageDM(600)).toBe(-7))
})

// ── rollDogfightPilot ─────────────────────────────────────────────────────────

describe('rollDogfightPilot', () => {
  it('uses diceOverride when provided', () => {
    const result = rollDogfightPilot({
      pilotSkill: 2,
      tonnage: 10,
      diceOverride: { results: [4, 5], total: 9 },
    })
    expect(result.results).toEqual([4, 5])
    expect(result.total).toBe(9 + 2) // 9 dice + 2 pilot
  })

  it('applies tonnageDM correctly', () => {
    const result = rollDogfightPilot({
      pilotSkill: 1,
      tonnage: 100,
      diceOverride: { results: [3, 3], total: 6 },
    })
    // 6 dice + 1 pilot - 2 tonnage = 5
    expect(result.total).toBe(5)
    expect(result.breakdown.tonnageDM).toBe(-2)
  })

  it('applies thrustDM', () => {
    const result = rollDogfightPilot({
      pilotSkill: 0,
      tonnage: 0,
      thrustDM: 3,
      diceOverride: { results: [2, 2], total: 4 },
    })
    expect(result.total).toBe(7)
    expect(result.breakdown.thrustDM).toBe(3)
  })

  it('applies extraEnemyDM', () => {
    const result = rollDogfightPilot({
      pilotSkill: 0,
      tonnage: 0,
      extraEnemyDM: -2,
      diceOverride: { results: [5, 5], total: 10 },
    })
    expect(result.total).toBe(8)
    expect(result.breakdown.extraEnemyDM).toBe(-2)
  })

  it('applies dexDM', () => {
    const result = rollDogfightPilot({
      pilotSkill: 0,
      tonnage: 0,
      dexDM: 2,
      diceOverride: { results: [3, 3], total: 6 },
    })
    // 6 dice + 0 pilot + 0 tonnage + 2 dex = 8
    expect(result.total).toBe(8)
    expect(result.breakdown.dexDM).toBe(2)
  })

  it('returns valid shape when no override', () => {
    const result = rollDogfightPilot({ pilotSkill: 0, tonnage: 0 })
    expect(result).toHaveProperty('results')
    expect(result).toHaveProperty('total')
    expect(result).toHaveProperty('breakdown')
    expect(result.results).toHaveLength(2)
    expect(result.results.every((d) => d >= 1 && d <= 6)).toBe(true)
  })

  it('breakdown sums to total', () => {
    const result = rollDogfightPilot({
      pilotSkill: 2,
      tonnage: 200,
      thrustDM: 1,
      extraEnemyDM: -1,
      dexDM: 1,
      diceOverride: { results: [4, 4], total: 8 },
    })
    const { dice, pilotSkill, tonnageDM, thrustDM, extraEnemyDM, dexDM } = result.breakdown
    expect(dice + pilotSkill + tonnageDM + thrustDM + extraEnemyDM + dexDM).toBe(result.total)
  })
})

// ── resolveDogfightChecks ─────────────────────────────────────────────────────

describe('resolveDogfightChecks', () => {
  it('returns winner when clear margin', () => {
    const r = resolveDogfightChecks([
      { shipId: 'a', total: 12 },
      { shipId: 'b', total: 8 },
    ])
    expect(r.winnerId).toBe('a')
    expect(r.margin).toBe(4)
    expect(r.tied).toBe(false)
  })

  it('returns tie when totals equal', () => {
    const r = resolveDogfightChecks([
      { shipId: 'a', total: 10 },
      { shipId: 'b', total: 10 },
    ])
    expect(r.winnerId).toBeNull()
    expect(r.tied).toBe(true)
    expect(r.margin).toBe(0)
  })

  it('handles 3-way — highest wins', () => {
    const r = resolveDogfightChecks([
      { shipId: 'a', total: 7 },
      { shipId: 'b', total: 12 },
      { shipId: 'c', total: 9 },
    ])
    expect(r.winnerId).toBe('b')
    expect(r.margin).toBe(3) // 12 - 9
  })

  it('does not mutate input array', () => {
    const input = [{ shipId: 'a', total: 5 }, { shipId: 'b', total: 10 }]
    resolveDogfightChecks(input)
    expect(input[0].shipId).toBe('a')
  })
})

// ── dogfightAttackDM ─────────────────────────────────────────────────────────

describe('dogfightAttackDM', () => {
  it('returns +2 for winner', () =>
    expect(dogfightAttackDM('a', 'a')).toBe(2))

  it('returns -2 for loser', () =>
    expect(dogfightAttackDM('b', 'a')).toBe(-2))

  it('returns 0 on tie (null winnerId)', () =>
    expect(dogfightAttackDM('a', null)).toBe(0))
})

// ── canEscape ────────────────────────────────────────────────────────────────

describe('canEscape', () => {
  it('true when no enemies', () =>
    expect(canEscape(2, [])).toBe(true))

  it('true when thrust > max enemy thrust', () =>
    expect(canEscape(5, [3, 4])).toBe(true))

  it('false when thrust equals max enemy', () =>
    expect(canEscape(4, [4, 2])).toBe(false))

  it('false when thrust less than max enemy', () =>
    expect(canEscape(3, [4])).toBe(false))
})

// ── freeThrust ───────────────────────────────────────────────────────────────

describe('freeThrust', () => {
  it('returns thrust minus used', () => {
    expect(freeThrust({ profile: { thrust: 4 }, thrustUsedThisRound: 1 })).toBe(3)
  })

  it('clamps to 0 when over-spent', () => {
    expect(freeThrust({ profile: { thrust: 2 }, thrustUsedThisRound: 5 })).toBe(0)
  })

  it('treats missing thrustUsedThisRound as 0', () => {
    expect(freeThrust({ profile: { thrust: 3 } })).toBe(3)
  })

  it('treats missing thrust as 0', () => {
    expect(freeThrust({ profile: {}, thrustUsedThisRound: 0 })).toBe(0)
  })
})

// ── computeShipDMs ───────────────────────────────────────────────────────────

describe('computeShipDMs', () => {
  it('computes all DMs for a typical ship', () => {
    const ship  = makeShip('a', 'player', { pilotSkill: 2, tonnage: 100, thrust: 4, dexDM: 1, thrustUsed: 1 })
    const enemy = makeShip('b', 'enemy')
    const group = { roundWinnerId: null, roundWinnerMargin: 0 }
    const dms   = computeShipDMs(ship, [ship, enemy], group)
    expect(dms.pilotSkill).toBe(2)
    expect(dms.tonnageDM).toBe(-2)   // 100t → -2
    expect(dms.thrustDM).toBe(3)     // 4 - 1 = 3 free thrust
    expect(dms.dexDM).toBe(1)
    expect(dms.extraEnemyDM).toBe(0) // only 1 enemy — no penalty
    expect(dms.prevRoundBonus).toBe(0)
  })

  it('extraEnemyDM is −1 per additional enemy', () => {
    const ship = makeShip('a', 'player')
    const e1   = makeShip('b', 'enemy')
    const e2   = makeShip('c', 'enemy')
    const group = { roundWinnerId: null, roundWinnerMargin: 0 }
    const dms  = computeShipDMs(ship, [ship, e1, e2], group)
    expect(dms.extraEnemyDM).toBe(-1) // 2 enemies − 1 = penalty of 1
  })

  it('prevRoundBonus equals margin for round winner', () => {
    const ship  = makeShip('a', 'player')
    const enemy = makeShip('b', 'enemy')
    const group = { roundWinnerId: 'a', roundWinnerMargin: 3 }
    expect(computeShipDMs(ship, [ship, enemy], group).prevRoundBonus).toBe(3)
  })

  it('prevRoundBonus is 0 for loser', () => {
    const ship  = makeShip('a', 'player')
    const enemy = makeShip('b', 'enemy')
    const group = { roundWinnerId: 'b', roundWinnerMargin: 2 }
    expect(computeShipDMs(ship, [ship, enemy], group).prevRoundBonus).toBe(0)
  })
})

// ── bestPilot ────────────────────────────────────────────────────────────────

describe('bestPilot', () => {
  it('returns null for empty list', () => {
    expect(bestPilot([])).toBeNull()
  })

  it('returns the only ship in a single-element list', () => {
    const ship = makeShip('a', 'player', { pilotSkill: 2 })
    expect(bestPilot([ship])).toBe(ship)
  })

  it('returns ship with highest pilot skill', () => {
    const a = makeShip('a', 'player', { pilotSkill: 1 })
    const b = makeShip('b', 'enemy',  { pilotSkill: 3 })
    const c = makeShip('c', 'player', { pilotSkill: 2 })
    expect(bestPilot([a, b, c])).toBe(b)
  })
})

// ── escapeCheckTotals ────────────────────────────────────────────────────────

describe('escapeCheckTotals', () => {
  it('returns null when no fleeDice', () => {
    const ship = makeShip('a', 'player')
    expect(escapeCheckTotals(ship, null, null, null)).toBeNull()
  })

  it('escaped: true and pursuerTotal 0 when no pursuer', () => {
    // thrust: 0 → freeThrust = 0, keeps expected total predictable
    const ship = makeShip('a', 'player', { pilotSkill: 2, thrust: 0 })
    const dice = { results: [4, 4], total: 8 }
    const r    = escapeCheckTotals(ship, null, dice, null)
    expect(r.escaped).toBe(true)
    expect(r.pursuerTotal).toBe(0)
    expect(r.fleeTotal).toBe(10) // 8 dice + 2 pilot + 0 thrust
  })

  it('escaped: null when no pursuerDice', () => {
    const ship    = makeShip('a', 'player', { thrust: 0 })
    const pursuer = makeShip('b', 'enemy',  { thrust: 0 })
    const r       = escapeCheckTotals(ship, pursuer, { results: [4, 4], total: 8 }, null)
    expect(r.escaped).toBeNull()
    expect(r.pursuerTotal).toBeNull()
  })

  it('escaped: true when fleer total > pursuer total', () => {
    // thrust: 0 → freeThrust = 0, so totals = dice + pilotSkill only
    const ship    = makeShip('a', 'player', { pilotSkill: 3, thrust: 0 })
    const pursuer = makeShip('b', 'enemy',  { pilotSkill: 0, thrust: 0 })
    const r = escapeCheckTotals(
      ship, pursuer,
      { results: [4, 4], total: 8 }, // fleer: 8 + 3 = 11
      { results: [3, 3], total: 6 }, // pursuer: 6 + 0 = 6
    )
    expect(r.fleeTotal).toBe(11)
    expect(r.pursuerTotal).toBe(6)
    expect(r.escaped).toBe(true)
  })

  it('escaped: false when pursuer total >= fleer total', () => {
    const ship    = makeShip('a', 'player', { pilotSkill: 0, thrust: 0 })
    const pursuer = makeShip('b', 'enemy',  { pilotSkill: 3, thrust: 0 })
    const r = escapeCheckTotals(
      ship, pursuer,
      { results: [3, 3], total: 6 }, // fleer: 6 + 0 = 6
      { results: [4, 4], total: 8 }, // pursuer: 8 + 3 = 11
    )
    expect(r.escaped).toBe(false)
  })
})
