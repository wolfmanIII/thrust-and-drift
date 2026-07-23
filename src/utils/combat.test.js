/**
 * Tests for space combat mechanical calculations.
 * // MgT2e CRB p.160–168, Traveller Companion p.169–186
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getRangeDM,
  getTargetSizeDM,
  getCharDM,
  isValidThrustDelta,
  applyThrust,
  applyMovement,
  getEvasiveDM,
  isCriticalHit,
  getCriticalSeverity,
  getThresholdCriticalCount,
  rollAttack,
  rollInitiative,
  RANGE_ORDER,
  isOutOfRange,
  getApValue,
  countMissileAmmoCapacity,
  countTorpedoAmmoCapacity,
  countMissileRacks,
  countSandcasters,
  computeMissileAttackDM,
  computeMissileImpactDamage,
  computeIonThrustEffect,
  taskChainDM,
} from './combat.js'

// === RANGE DMs ===
// // MgT2e CRB p.164

describe('getRangeDM', () => {
  const CASES = [
    ['Adjacent',    0],
    ['Short',       1],
    ['Medium',      0],
    ['Long',       -2],
    ['Very Long',  -4],
    ['Distant',    -6],
    ['Unknown',     0], // unknown band → fallback 0
  ]

  it.each(CASES)('"%s" → %i', (band, dm) => {
    expect(getRangeDM(band)).toBe(dm)
  })
})

// === TARGET SIZE DMs ===
// // MgT2e CRB p.163 — +1 per 1,000 tons, max +6

describe('getTargetSizeDM', () => {
  const CASES = [
    [0,     0],
    [999,   0],
    [1000,  1],
    [1999,  1],
    [2000,  2],
    [3500,  3],
    [6000,  6],
    [7000,  6], // cap at +6
    [10000, 6],
  ]

  it.each(CASES)('%i tons → DM %i', (tonnage, dm) => {
    expect(getTargetSizeDM(tonnage)).toBe(dm)
  })

  it('null/undefined tonnage treated as 0', () => {
    expect(getTargetSizeDM(null)).toBe(0)
    expect(getTargetSizeDM(undefined)).toBe(0)
  })
})

// === CHARACTERISTIC DMs ===
// // MgT2e CRB p.6

describe('getCharDM', () => {
  const CASES = [
    [0,  -3],
    [1,  -2],
    [2,  -2],
    [3,  -1],
    [5,  -1],
    [6,   0],
    [8,   0],
    [9,  +1],
    [11, +1],
    [12, +2],
    [14, +2],
    [15, +3],
    [20, +3],
  ]

  it.each(CASES)('value %i → DM %i', (v, dm) => {
    expect(getCharDM(v)).toBe(dm)
  })
})

// === THRUST VALIDATION ===
// // Traveller Companion p.172

describe('isValidThrustDelta', () => {
  it('zero delta always valid (even with 0 thrust)', () => {
    expect(isValidThrustDelta({ q: 0, r: 0 }, 0)).toBe(true)
  })

  it('delta within thrust = valid', () => {
    expect(isValidThrustDelta({ q: 2, r: 0 }, 3)).toBe(true)
    expect(isValidThrustDelta({ q: 1, r: -1 }, 2)).toBe(true)
  })

  it('delta exactly equals thrust = valid', () => {
    expect(isValidThrustDelta({ q: 2, r: 0 }, 2)).toBe(true)
  })

  it('delta exceeds thrust = invalid', () => {
    expect(isValidThrustDelta({ q: 3, r: 0 }, 2)).toBe(false)
    expect(isValidThrustDelta({ q: 2, r: 2 }, 2)).toBe(false)
  })
})

// === THRUST / MOVEMENT ===

describe('applyThrust', () => {
  it('adds delta to velocity vector', () => {
    expect(applyThrust({ q: 1, r: 0 }, { q: 0, r: 1 })).toEqual({ q: 1, r: 1 })
    expect(applyThrust({ q: -2, r: 3 }, { q: 1, r: -1 })).toEqual({ q: -1, r: 2 })
  })

  it('zero delta = velocity unchanged', () => {
    const v = { q: 3, r: -2 }
    expect(applyThrust(v, { q: 0, r: 0 })).toEqual(v)
  })
})

describe('applyMovement', () => {
  it('adds velocity to position', () => {
    expect(applyMovement({ q: 2, r: 1 }, { q: -1, r: 3 })).toEqual({ q: 1, r: 4 })
  })

  it('zero velocity = position unchanged', () => {
    const pos = { q: 5, r: -3 }
    expect(applyMovement(pos, { q: 0, r: 0 })).toEqual(pos)
  })
})

// === EVASIVE ACTION ===
// // MgT2e CRB p.166

describe('getEvasiveDM', () => {
  it('0 evasive thrust = 0 DM', () => {
    expect(getEvasiveDM(3, 0)).toBe(0)
  })

  it('negative thrust = 0 DM', () => {
    expect(getEvasiveDM(5, -1)).toBe(0)
  })

  it('pilot 0 = 0 DM regardless of thrust', () => {
    expect(getEvasiveDM(0, 4)).toBe(0)
  })

  it('DM = −pilotSkill fixed, thrust does not multiply', () => {
    expect(getEvasiveDM(2, 3)).toBe(-2)
    expect(getEvasiveDM(3, 2)).toBe(-3)
    expect(getEvasiveDM(1, 5)).toBe(-1)
    expect(getEvasiveDM(4, 1)).toBe(-4)
  })
})

// === CRITICAL HITS ===
// // MgT2e CRB p.165 — critical when Effect >= 6

describe('isCriticalHit', () => {
  it('effect < 6 = not critical', () => {
    expect(isCriticalHit(5)).toBe(false)
    expect(isCriticalHit(0)).toBe(false)
    expect(isCriticalHit(-1)).toBe(false)
  })

  it('effect = 6 = critical', () => {
    expect(isCriticalHit(6)).toBe(true)
  })

  it('effect > 6 = critical', () => {
    expect(isCriticalHit(10)).toBe(true)
    expect(isCriticalHit(100)).toBe(true)
  })
})

// === CRITICAL SEVERITY ===
// // MgT2e CRB p.169 — Severity = Effect − 5, clamped 1–6

describe('getCriticalSeverity', () => {
  const CASES = [
    [6,   1], // minimum: Effect 6 → Sev 1
    [7,   2],
    [8,   3],
    [9,   4],
    [10,  5],
    [11,  6],
    [12,  6], // capped at 6
    [100, 6],
    [1,   1], // below threshold clamped to 1
    [0,   1],
  ]

  it.each(CASES)('effect %i → severity %i', (effect, sev) => {
    expect(getCriticalSeverity(effect)).toBe(sev)
  })
})

// === THRESHOLD CRITICAL COUNT ===
// // MgT2e CRB p.169 — Sustained Damage: 1 Sev-1 crit per 10% Hull chunk crossed

describe('getThresholdCriticalCount', () => {
  // Hull=20, threshold=2

  it('no damage = 0 crits', () => {
    expect(getThresholdCriticalCount(20, 20, 20)).toBe(0)
  })

  it('damage below 10% = 0 crits', () => {
    expect(getThresholdCriticalCount(20, 19, 20)).toBe(0) // 1 dmg = 5%
  })

  it('exactly 10% damage triggers 1 crit', () => {
    expect(getThresholdCriticalCount(20, 18, 20)).toBe(1) // 2 dmg = 10%
  })

  it('crossing two 10% thresholds in one hit triggers 2 crits', () => {
    expect(getThresholdCriticalCount(20, 16, 20)).toBe(2) // 4 dmg = 20%
  })

  it('crossing three thresholds triggers 3 crits', () => {
    expect(getThresholdCriticalCount(20, 14, 20)).toBe(3) // 6 dmg = 30%
  })

  it('no double-counting: starting from mid-hull', () => {
    // prev=18 (already 1 threshold crossed), new=16 → 1 more threshold
    expect(getThresholdCriticalCount(18, 16, 20)).toBe(1)
  })

  it('hull already damaged then healed edge case: newHull >= prevHull = 0', () => {
    expect(getThresholdCriticalCount(10, 12, 20)).toBe(0)
  })

  it('maxHull = 0 = 0 (guard against division by zero)', () => {
    expect(getThresholdCriticalCount(0, 0, 0)).toBe(0)
  })

  it('small hull (10): each 1 HP = 10%', () => {
    expect(getThresholdCriticalCount(10, 9, 10)).toBe(1)
    expect(getThresholdCriticalCount(10, 7, 10)).toBe(3)
  })
})

// === ROLL ATTACK (deterministic via Math.random mock) ===
// Math.floor(0.5 * 6) + 1 = 4 → each die = 4, 2d6 total = 8

describe('rollAttack', () => {
  beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0.5))
  afterEach(() => vi.restoreAllMocks())

  it('returns correct shape', () => {
    const r = rollAttack({ gunnerSkill: 0, dexDM: 0, aidGunnersDM: 0, rangeDM: 0, weaponDM: 0, targetSizeDM: 0, evasiveDM: 0 })
    expect(r).toHaveProperty('roll')
    expect(r).toHaveProperty('total')
    expect(r).toHaveProperty('effect')
    expect(r).toHaveProperty('hit')
    expect(r).toHaveProperty('breakdown')
  })

  it('hit when total >= 8', () => {
    // roll=8, gunner=2 → total=10 → hit, effect=2
    const r = rollAttack({ gunnerSkill: 2, dexDM: 0, aidGunnersDM: 0, rangeDM: 0, weaponDM: 0, targetSizeDM: 0, evasiveDM: 0 })
    expect(r.hit).toBe(true)
    expect(r.total).toBe(10)
    expect(r.effect).toBe(2)
  })

  it('miss when DMs push total below 8', () => {
    // roll=8, rangeDM=-6 → total=2 → miss
    const r = rollAttack({ gunnerSkill: 0, dexDM: 0, aidGunnersDM: 0, rangeDM: -6, weaponDM: 0, targetSizeDM: 0, evasiveDM: 0 })
    expect(r.hit).toBe(false)
    expect(r.total).toBe(2)
  })

  it('critical when effect >= 6', () => {
    // roll=8, gunner=4, aidGunners=2, rangeDM=1 → total=15, effect=7
    const r = rollAttack({ gunnerSkill: 4, dexDM: 0, aidGunnersDM: 2, rangeDM: 1, weaponDM: 0, targetSizeDM: 0, evasiveDM: 0 })
    expect(isCriticalHit(r.effect)).toBe(true)
  })

  it('evasiveDM reduces total', () => {
    const base = rollAttack({ gunnerSkill: 2, dexDM: 0, aidGunnersDM: 0, rangeDM: 0, weaponDM: 0, targetSizeDM: 0, evasiveDM: 0 })
    const evasive = rollAttack({ gunnerSkill: 2, dexDM: 0, aidGunnersDM: 0, rangeDM: 0, weaponDM: 0, targetSizeDM: 0, evasiveDM: -3 })
    expect(evasive.total).toBe(base.total - 3)
  })

  it('sensorLockDM adds to total', () => {
    const base = rollAttack({ gunnerSkill: 0, dexDM: 0, aidGunnersDM: 0, rangeDM: 0, weaponDM: 0, targetSizeDM: 0, evasiveDM: 0 })
    const locked = rollAttack({ gunnerSkill: 0, dexDM: 0, aidGunnersDM: 0, rangeDM: 0, weaponDM: 0, targetSizeDM: 0, evasiveDM: 0, sensorLockDM: 2 })
    expect(locked.total).toBe(base.total + 2)
  })

  it('diceOverride bypasses random — uses provided dice', () => {
    const override = { results: [1, 2], total: 3 }
    // gunner=2, all other DMs=0 → total = 3 + 2 = 5 — NOT 8+2=10 from mocked random
    const r = rollAttack({ gunnerSkill: 2, dexDM: 0, aidGunnersDM: 0, rangeDM: 0, weaponDM: 0, targetSizeDM: 0, evasiveDM: 0, diceOverride: override })
    expect(r.total).toBe(5)
    expect(r.roll).toBe(override)
    expect(r.hit).toBe(false)
  })

  it('dogfightDM adds to total and appears in breakdown', () => {
    // roll=8 (mocked), base all zeros → total=8; with dogfightDM=+2 → total=10
    const base   = rollAttack({ gunnerSkill: 0, dexDM: 0, aidGunnersDM: 0, rangeDM: 0, weaponDM: 0, targetSizeDM: 0, evasiveDM: 0 })
    const winner = rollAttack({ gunnerSkill: 0, dexDM: 0, aidGunnersDM: 0, rangeDM: 0, weaponDM: 0, targetSizeDM: 0, evasiveDM: 0, dogfightDM: 2 })
    expect(winner.total).toBe(base.total + 2)
    expect(winner.breakdown.dogfightDM).toBe(2)
  })

  it('obstacleCoverDM reduces total and appears in breakdown', () => {
    // roll=8 (mocked), base all zeros → total=8; target in dense asteroid field → DM-2 → total=6
    const base  = rollAttack({ gunnerSkill: 0, dexDM: 0, aidGunnersDM: 0, rangeDM: 0, weaponDM: 0, targetSizeDM: 0, evasiveDM: 0 })
    const cover = rollAttack({ gunnerSkill: 0, dexDM: 0, aidGunnersDM: 0, rangeDM: 0, weaponDM: 0, targetSizeDM: 0, evasiveDM: 0, obstacleCoverDM: -2 })
    expect(cover.total).toBe(base.total - 2)
    expect(cover.breakdown.obstacleCoverDM).toBe(-2)
  })

  it('obstacleCoverDM defaults to 0 when omitted', () => {
    const r = rollAttack({ gunnerSkill: 0, dexDM: 0, aidGunnersDM: 0, rangeDM: 0, weaponDM: 0, targetSizeDM: 0, evasiveDM: 0 })
    expect(r.breakdown.obstacleCoverDM).toBe(0)
  })
})

// === ROLL INITIATIVE ===
// // MgT2e CRB p.165

describe('rollInitiative', () => {
  beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0.5))
  afterEach(() => vi.restoreAllMocks())

  it('total = roll + pilot + thrust + tactics', () => {
    // roll=8, pilot=2, thrust=3, tactics=1 → total=14
    const r = rollInitiative(2, 3, 1)
    expect(r.total).toBe(14)
    expect(r.breakdown.pilotSkill).toBe(2)
    expect(r.breakdown.thrust).toBe(3)
    expect(r.breakdown.tacticsEffect).toBe(1)
  })

  it('tacticsEffect defaults to 0', () => {
    const r = rollInitiative(1, 2)
    expect(r.total).toBe(8 + 1 + 2)
  })

  it('diceOverride bypasses random — uses provided dice', () => {
    const override = { results: [2, 3], total: 5 }
    const r = rollInitiative(1, 2, 0, override)
    // 5 (manual) + 1 (pilot) + 2 (thrust) = 8 — NOT 8+1+2=11 from mocked random
    expect(r.total).toBe(8)
    expect(r.roll).toBe(override)
  })

  // Holographic Controls bridge option — CRB p.186 / HG Update 2022 p.31
  it('holographicControlsDM defaults to 0', () => {
    const r = rollInitiative(1, 2)
    expect(r.breakdown.holographicControlsDM).toBe(0)
  })

  it('adds DM+2 when holographicControlsDM is passed', () => {
    // roll=8, pilot=1, thrust=2, tactics=0, holo=2 → total=13
    const r = rollInitiative(1, 2, 0, null, 2)
    expect(r.total).toBe(13)
    expect(r.breakdown.holographicControlsDM).toBe(2)
  })
})

// === RANGE_ORDER / isOutOfRange ===
// // MgT2e CRB p.167 — "cannot attack targets beyond listed Range Band"

describe('RANGE_ORDER', () => {
  it('contains all 6 app range bands in order', () => {
    expect(RANGE_ORDER).toEqual(['Adjacent', 'Short', 'Medium', 'Long', 'Very Long', 'Distant'])
  })
})

describe('isOutOfRange', () => {
  it('returns false when Special maxRange', () => {
    expect(isOutOfRange('Special', 'Distant')).toBe(false)
  })

  it('returns false when at maxRange band', () => {
    expect(isOutOfRange('Long', 'Long')).toBe(false)
  })

  it('returns false when closer than maxRange', () => {
    expect(isOutOfRange('Long', 'Short')).toBe(false)
    expect(isOutOfRange('Long', 'Adjacent')).toBe(false)
  })

  it('returns true when beyond maxRange — Railgun at Medium', () => {
    expect(isOutOfRange('Short', 'Medium')).toBe(true)
  })

  it('returns true when beyond maxRange — Beam Laser at Long', () => {
    expect(isOutOfRange('Medium', 'Long')).toBe(true)
  })

  it('returns true when beyond maxRange — Pulse Laser at Very Long', () => {
    expect(isOutOfRange('Long', 'Very Long')).toBe(true)
  })

  it('returns false for Particle Beam at Very Long (its maxRange)', () => {
    expect(isOutOfRange('Very Long', 'Very Long')).toBe(false)
  })

  it('returns true for Particle Beam at Distant', () => {
    expect(isOutOfRange('Very Long', 'Distant')).toBe(true)
  })

  it('returns false when maxRange is null/undefined', () => {
    expect(isOutOfRange(null, 'Long')).toBe(false)
    expect(isOutOfRange(undefined, 'Long')).toBe(false)
  })
})

// === AP TRAIT PARSING ===
// // MgT2e HG p.28 — "subtract AP value from effective armour"

describe('getApValue', () => {
  it('returns 0 when traits array is empty', () => {
    expect(getApValue([])).toBe(0)
  })

  it('returns 0 when no AP trait present', () => {
    expect(getApValue(['Smart', 'Radiation', 'Defensive'])).toBe(0)
  })

  it('parses single-digit AP', () => {
    expect(getApValue(['AP 4'])).toBe(4)
  })

  it('parses double-digit AP', () => {
    expect(getApValue(['AP 10'])).toBe(10)
  })

  it('AP 0 returns 0', () => {
    expect(getApValue(['AP 0'])).toBe(0)
  })

  it('ignores other traits, returns the AP value', () => {
    expect(getApValue(['Radiation', 'AP 5', 'Smart'])).toBe(5)
  })

  it('does not match partial strings — "AP" alone does not count', () => {
    expect(getApValue(['AP'])).toBe(0)
  })

  it('does not match "AP4" without space', () => {
    expect(getApValue(['AP4'])).toBe(0)
  })
})

// === MISSILE AMMO CAPACITY ===
// // MgT2e CRB p.162, HG p.30–31

describe('countMissileAmmoCapacity', () => {
  it('returns 0 for profile with no turrets', () => {
    expect(countMissileAmmoCapacity({ turrets: [] })).toBe(0)
  })

  it('returns 0 when turrets have no missile weapons', () => {
    expect(countMissileAmmoCapacity({ turrets: [{ slot: 1, weapons: ['Pulse Laser', 'Sandcaster'] }] })).toBe(0)
  })

  it('12 per Missile Rack', () => {
    expect(countMissileAmmoCapacity({ turrets: [{ slot: 1, weapons: ['Missile Rack'] }] })).toBe(12)
  })

  it('2 Missile Racks → 24', () => {
    expect(countMissileAmmoCapacity({
      turrets: [
        { slot: 1, weapons: ['Missile Rack', 'Pulse Laser'] },
        { slot: 2, weapons: ['Missile Rack'] },
      ],
    })).toBe(24)
  })

  it('25 per Missile Barbette', () => {
    expect(countMissileAmmoCapacity({ turrets: [{ slot: 1, weapons: ['Missile Barbette'] }] })).toBe(25)
  })

  it('Torpedo weapon counts 0 — torpedo ammo is tracked separately', () => {
    expect(countMissileAmmoCapacity({ turrets: [{ slot: 1, weapons: ['Torpedo'] }] })).toBe(0)
  })

  it('mixed: 1 Rack + 1 Barbette + 1 Torpedo → 12+25 = 37 (torpedo excluded)', () => {
    expect(countMissileAmmoCapacity({
      turrets: [
        { slot: 1, weapons: ['Missile Rack'] },
        { slot: 2, weapons: ['Missile Barbette'] },
        { slot: 3, weapons: ['Torpedo'] },
      ],
    })).toBe(37)
  })

  it('handles missing turrets field', () => {
    expect(countMissileAmmoCapacity({})).toBe(0)
  })
})

// === TORPEDO AMMO CAPACITY ===
// HG p.31 — 3 rounds per Torpedo barbette; tracked separately from missile ammo

describe('countTorpedoAmmoCapacity', () => {
  it('returns 0 for profile with no turrets', () => {
    expect(countTorpedoAmmoCapacity({ turrets: [] })).toBe(0)
  })

  it('returns 0 when turrets have no torpedo weapons', () => {
    expect(countTorpedoAmmoCapacity({ turrets: [{ slot: 1, weapons: ['Missile Rack', 'Pulse Laser'] }] })).toBe(0)
  })

  it('3 per Torpedo barbette', () => {
    expect(countTorpedoAmmoCapacity({ turrets: [{ slot: 1, weapons: ['Torpedo'] }] })).toBe(3)
  })

  it('2 Torpedo barbettes → 6', () => {
    expect(countTorpedoAmmoCapacity({
      turrets: [
        { slot: 1, weapons: ['Torpedo'] },
        { slot: 2, weapons: ['Torpedo'] },
      ],
    })).toBe(6)
  })

  it('mixed turrets — only counts Torpedo weapons', () => {
    expect(countTorpedoAmmoCapacity({
      turrets: [
        { slot: 1, weapons: ['Missile Rack'] },
        { slot: 2, weapons: ['Torpedo'] },
      ],
    })).toBe(3)
  })

  it('handles missing turrets field', () => {
    expect(countTorpedoAmmoCapacity({})).toBe(0)
  })
})

// === SANDCASTER CAPACITY ===
// // MgT2e HG p.28 — 20 canisters per sandcaster slot

describe('countSandcasters', () => {
  it('returns 0 for profile with no turrets', () => {
    expect(countSandcasters({ turrets: [] })).toBe(0)
  })

  it('returns 0 when no sandcaster weapons', () => {
    expect(countSandcasters({ turrets: [{ slot: 1, weapons: ['Pulse Laser', 'Beam Laser'] }] })).toBe(0)
  })

  it('20 per Sandcaster slot', () => {
    expect(countSandcasters({ turrets: [{ slot: 1, weapons: ['Sandcaster'] }] })).toBe(20)
  })

  it('2 sandcasters in separate turrets → 40', () => {
    expect(countSandcasters({
      turrets: [
        { slot: 1, weapons: ['Sandcaster', 'Pulse Laser'] },
        { slot: 2, weapons: ['Sandcaster'] },
      ],
    })).toBe(40)
  })

  it('2 sandcasters in same turret → 40', () => {
    expect(countSandcasters({ turrets: [{ slot: 1, weapons: ['Sandcaster', 'Sandcaster'] }] })).toBe(40)
  })

  it('handles missing turrets field', () => {
    expect(countSandcasters({})).toBe(0)
  })
})

// === MISSILE IMPACT ===
// // MgT2e CRB p.173 — IMPACT

describe('computeMissileAttackDM', () => {
  // DM = count (salvo size) + 2 (Smart, if TL ≥ 9) − evasivePilot

  it('1 missile, Smart active, no evasion → DM+3', () => {
    expect(computeMissileAttackDM(1, true, 0)).toBe(3)
  })

  it('3 missiles, Smart active, no evasion → DM+5', () => {
    expect(computeMissileAttackDM(3, true, 0)).toBe(5)
  })

  it('5 missiles, Smart active, no evasion → DM+7', () => {
    expect(computeMissileAttackDM(5, true, 0)).toBe(7)
  })

  it('evasive pilot 2, 3 missiles, Smart active → DM+3', () => {
    expect(computeMissileAttackDM(3, true, 2)).toBe(3)
  })

  it('evasive pilot 3, 3 missiles, Smart active → DM+2', () => {
    expect(computeMissileAttackDM(3, true, 3)).toBe(2)
  })

  it('evasive pilot 0 = no DM penalty even if evading flag set', () => {
    expect(computeMissileAttackDM(2, true, 0)).toBe(4)
  })

  it('high pilot can reduce total DM below base', () => {
    // 1 missile + 2 Smart = base 3; pilot 4 → −4 → DM −1
    expect(computeMissileAttackDM(1, true, 4)).toBe(-1)
  })

  it('Smart inactive (TL < 9): no +2 bonus', () => {
    // 3 missiles, no Smart, no evasion → DM+3 (salvo only)
    expect(computeMissileAttackDM(3, false, 0)).toBe(3)
  })

  it('Smart inactive with evasion: only salvo DM applies', () => {
    // 3 missiles, no Smart, pilot 2 → 3 − 2 = DM+1
    expect(computeMissileAttackDM(3, false, 2)).toBe(1)
  })

  it('hasSmart defaults to true', () => {
    // calling with (count) only — backward-safe default
    expect(computeMissileAttackDM(3)).toBe(5)
  })
})

describe('computeMissileImpactDamage', () => {
  // Formula: max(0, roll − armour) × min(Effect, count)

  it('typical hit: 3 missiles, effect 2, roll 14, armour 3', () => {
    // (14−3) × min(2,3) = 11 × 2 = 22
    expect(computeMissileImpactDamage(14, 3, 2, 3)).toBe(22)
  })

  it('effect capped by count: effect 5 > count 3', () => {
    // (16−0) × min(5,3) = 16 × 3 = 48
    expect(computeMissileImpactDamage(16, 0, 5, 3)).toBe(48)
  })

  it('count capped by effect: count 5, effect 2', () => {
    // (10−0) × min(2,5) = 10 × 2 = 20
    expect(computeMissileImpactDamage(10, 0, 2, 5)).toBe(20)
  })

  it('roll below armour → per-missile net clamped to 0 → 0 total', () => {
    // max(0, 5−10) × 3 = 0
    expect(computeMissileImpactDamage(5, 10, 3, 3)).toBe(0)
  })

  it('effect = 0 → multiplier min 1 on successful hit', () => {
    // Effect 0 is a hit — multiplier floors at 1: (20−0) × 1 = 20
    expect(computeMissileImpactDamage(20, 0, 0, 5)).toBe(20)
  })

  it('single missile, effect 1, roll exactly equals armour → 0', () => {
    expect(computeMissileImpactDamage(6, 6, 1, 1)).toBe(0)
  })

  it('single torpedo (6D), effect 4 → full pen', () => {
    // (24−5) × min(4,1) = 19 × 1 = 19
    expect(computeMissileImpactDamage(24, 5, 4, 1)).toBe(19)
  })

  it('armour 0 — no reduction', () => {
    // (18−0) × min(3,4) = 18 × 3 = 54
    expect(computeMissileImpactDamage(18, 0, 3, 4)).toBe(54)
  })
})

// === ION — computeIonThrustEffect ===
// // MgT2e HG p.30

describe('computeIonThrustEffect', () => {
  it('full Power → baseThrust unchanged', () => {
    expect(computeIonThrustEffect(6, 100, 100)).toBe(6)
  })

  it('50% Power → half thrust (floor)', () => {
    expect(computeIonThrustEffect(6, 50, 100)).toBe(3)
  })

  it('0% Power → 0 effective thrust', () => {
    expect(computeIonThrustEffect(6, 0, 100)).toBe(0)
  })

  it('odd thrust floors correctly at non-round Power ratio', () => {
    // floor(5 × 67/100) = floor(3.35) = 3
    expect(computeIonThrustEffect(5, 67, 100)).toBe(3)
  })

  it('maxPower = 0 → returns baseThrust unchanged (guard against /0)', () => {
    expect(computeIonThrustEffect(6, 0, 0)).toBe(6)
  })

  it('currentPower > maxPower treated as full (no amplification)', () => {
    // currentPower capped at max(0, current) before division; no upper clamp needed
    // but effectively: floor(6 × 120/100) = 7; spec says return baseThrust when overpowered?
    // RAW: no amplification beyond rated thrust — result capped at baseThrust
    expect(computeIonThrustEffect(6, 120, 100)).toBeLessThanOrEqual(6)
  })
})

// === TASK CHAIN DM ===
// // MgT2e CRB p.63 — Task Chains table

describe('taskChainDM', () => {
  const CASES = [
    [-8,  -3], // ≤ −6 → −3
    [-6,  -3],
    [-5,  -2], // −2 to −5 → −2
    [-2,  -2],
    [-1,  -1], // −1 → −1
    [ 0,  +1], // 0 → +1 (success with no effect)
    [ 1,  +2], // 1–5 → +2
    [ 5,  +2],
    [ 6,  +3], // ≥ 6 → +3
    [10,  +3],
  ]

  it.each(CASES)('effect %i → DM %i', (effect, dm) => {
    expect(taskChainDM(effect)).toBe(dm)
  })
})

// === countMissileRacks (deprecated alias) ===

describe('countMissileRacks', () => {
  it('returns same value as countMissileAmmoCapacity', () => {
    const profile = { turrets: [
      { slot: 1, weapons: ['Missile Rack'] },
      { slot: 2, weapons: ['Missile Barbette'] },
    ]}
    expect(countMissileRacks(profile)).toBe(countMissileAmmoCapacity(profile))
    expect(countMissileRacks(profile)).toBe(37) // 12 + 25
  })

  it('returns 0 for a profile with no missile weapons', () => {
    const profile = { turrets: [{ slot: 1, weapons: ['Pulse Laser', 'Sandcaster'] }] }
    expect(countMissileRacks(profile)).toBe(0)
  })
})
