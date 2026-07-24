import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ActionModal } from './ActionModal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

const SHIP = {
  id: 'ship-1',
  profile: {
    name: 'SDB', hull: 30, armor: 5, thrust: 6,
    turrets: [{ slot: 1, weapons: ['Beam Laser'] }],
    crew: [
      { id: 'crew-1', name: 'Gunner', skills: { gunner: 4 } },
      { id: 'crew-2', name: 'Captain', skills: { leadership: 2 } },
    ],
  },
  faction: 'npc',
  hullCurrent: 30,
  color: '#f00',
  firedTurrets: [],
  evasiveThrust: 0,
  criticalHits: [],
  thrustUsedThisRound: 0,
}

/** Minimal solo-crew ship for REQ-09 / REQ-10 tests. */
function makeSoloShip({ skills = { pilot: 2 }, assignments = {} } = {}) {
  return {
    id: 'ship-solo',
    profile: {
      name: 'Fighter', hull: 10, armor: 0, thrust: 6, tonnage: 50,
      turrets: [],
      crew: [{ id: 'crew-solo', name: 'Solo Pilot', skills }],
    },
    faction: 'players',
    hullCurrent: 10,
    color: '#0f0',
    firedTurrets: [],
    evasiveThrust: 0,
    criticalHits: [],
    thrustUsedThisRound: 0,
    usedCrewMembers: [],
    crewAssignments: {
      pilot: null, leadership: null, tactics: null,
      engineer: null, sensors: null, gunners: {},
      ...assignments,
    },
  }
}

describe('ActionModal', () => {
  beforeEach(() => {
    useBattleStore.getState().resetBattle('vectorial')
    useBattleStore.setState({ ships: [SHIP], phase: 'actions' })
    useUiStore.setState({ activeModal: 'action', modalPayload: { shipId: 'ship-1' } })
  })

  it('selecting Gunner shows reload_turret action', () => {
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Gunner'))
    expect(screen.getByText(/Reload Turret/)).toBeInTheDocument()
  })

  it('selecting Gunner then Reload Turret enables execute button', () => {
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Gunner'))
    fireEvent.click(screen.getByText(/Reload Turret/))
    const btn = screen.getByText(/EXECUTE ACTION/i)
    expect(btn).not.toBeDisabled()
  })
})

// ── REQ-10: solo crew assigned to all roles ───────────────────────────────────

describe('ActionModal — solo crew / crew assignments (REQ-10)', () => {
  beforeEach(() => {
    useBattleStore.getState().resetBattle('vectorial')
    useBattleStore.setState({ phase: 'actions' })
    useUiStore.setState({ activeModal: 'action', modalPayload: { shipId: 'ship-solo' } })
  })

  it('crew member with sensors:0 assigned to sensors role sees Sensor Lock', () => {
    const ship = makeSoloShip({
      skills: { pilot: 2 },
      assignments: { sensors: 'crew-solo' },
    })
    useBattleStore.setState({ ships: [ship] })
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Solo Pilot'))
    expect(screen.getByText('Sensor Lock')).toBeInTheDocument()
  })

  it('crew member with sensors:0 NOT assigned to sensors does not see Sensor Lock', () => {
    // engineer:1 gives an actions-phase action so the member appears in the crew list;
    // sensors:0 + unassigned still blocks Sensor Lock regardless
    const ship = makeSoloShip({
      skills: { pilot: 2, engineer: 1 },
      assignments: { sensors: null },
    })
    useBattleStore.setState({ ships: [ship] })
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Solo Pilot'))
    expect(screen.queryByText('Sensor Lock')).not.toBeInTheDocument()
  })

  it('crew member assigned to all roles sees sensor actions in actions phase (Aid Gunners is acceleration-phase only)', () => {
    const ship = makeSoloShip({
      skills: { pilot: 2 },
      assignments: {
        pilot: 'crew-solo', sensors: 'crew-solo',
        engineer: 'crew-solo', leadership: 'crew-solo', tactics: 'crew-solo',
      },
    })
    useBattleStore.setState({ ships: [ship] })
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Solo Pilot'))
    expect(screen.getByText('Sensor Lock')).toBeInTheDocument()
    expect(screen.getByText('Electronic Warfare')).toBeInTheDocument()
    // Aid Gunners is Manoeuvre Step (acceleration phase) — must NOT appear in actions phase
    expect(screen.queryByText('Aid Gunners')).not.toBeInTheDocument()
  })
})

// ── REQ-09: negative skill values ────────────────────────────────────────────

describe('ActionModal — negative skill values (REQ-09)', () => {
  beforeEach(() => {
    useBattleStore.getState().resetBattle('vectorial')
    useBattleStore.setState({ phase: 'actions' })
    useUiStore.setState({ activeModal: 'action', modalPayload: { shipId: 'ship-solo' } })
  })

  it('crew member with sensors:-1 assigned to sensors still sees Sensor Lock', () => {
    const ship = makeSoloShip({
      skills: { pilot: 2, sensors: -1 },
      assignments: { sensors: 'crew-solo' },
    })
    useBattleStore.setState({ ships: [ship] })
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Solo Pilot'))
    expect(screen.getByText('Sensor Lock')).toBeInTheDocument()
  })

  it('crew member with sensors:-3 assigned to sensors still sees Sensor Lock', () => {
    const ship = makeSoloShip({
      skills: { pilot: 2, sensors: -3 },
      assignments: { sensors: 'crew-solo' },
    })
    useBattleStore.setState({ ships: [ship] })
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Solo Pilot'))
    expect(screen.getByText('Sensor Lock')).toBeInTheDocument()
  })
})

// ── #16: Aid Gunners action for Pilot ────────────────────────────────────────
// // MgT2e CRB p.63, p.166

describe('ActionModal — Aid Gunners (#16)', () => {
  /** NPC ship with a dedicated pilot crew member (no manual dice needed). */
  const PILOT_SHIP = {
    id: 'ship-pilot',
    profile: {
      name: 'Scout', hull: 20, armor: 0, thrust: 6, tonnage: 100,
      turrets: [],
      crew: [{ id: 'crew-pilot', name: 'Lt. Delacroix', skills: { pilot: 2 } }],
    },
    faction: 'npc',
    hullCurrent: 20,
    color: '#0f0',
    firedTurrets:         [],
    evasiveThrust:        0,
    criticalHits:         [],
    thrustUsedThisRound:  0,
    aidGunnersDM:         0,
    usedCrewMembers:      [],
    crewAssignments:      null,
  }

  beforeEach(() => {
    useBattleStore.getState().resetBattle('vectorial')
    useBattleStore.setState({ ships: [PILOT_SHIP], phase: 'acceleration' })
    useUiStore.setState({ activeModal: 'action', modalPayload: { shipId: 'ship-pilot' } })
  })

  afterEach(() => vi.restoreAllMocks())

  it('pilot crew member shows Aid Gunners action', () => {
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Lt. Delacroix'))
    expect(screen.getByText('Aid Gunners')).toBeInTheDocument()
  })

  it('selecting Aid Gunners enables EXECUTE ACTION button', () => {
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Lt. Delacroix'))
    fireEvent.click(screen.getByText('Aid Gunners'))
    expect(screen.getByText(/EXECUTE ACTION/i)).not.toBeDisabled()
  })

  it('success roll shows task chain DM +2 and updates store', () => {
    // Math.random=0.5 → d6=4, 2d6=8; pilot:2 → total=10, effect=2 → taskChainDM(2)=+2
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Lt. Delacroix'))
    fireEvent.click(screen.getByText('Aid Gunners'))
    fireEvent.click(screen.getByText(/EXECUTE ACTION/i))
    expect(screen.getByText(/Task chain DM \+2 to all gunner attack rolls this round/)).toBeInTheDocument()
    expect(useBattleStore.getState().ships[0].aidGunnersDM).toBe(2)
  })

  it('failure roll shows negative DM and updates store (CRB p.63 — failure also applies DM)', () => {
    // Math.random=0.1 → d6=1, 2d6=2; pilot:2 → total=4, effect=-4 → taskChainDM(-4)=-2
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Lt. Delacroix'))
    fireEvent.click(screen.getByText('Aid Gunners'))
    fireEvent.click(screen.getByText(/EXECUTE ACTION/i))
    expect(screen.getByText(/Task chain DM -2 to all gunner attack rolls this round/)).toBeInTheDocument()
    expect(useBattleStore.getState().ships[0].aidGunnersDM).toBe(-2)
  })

  it('effect 0 (exactly meets difficulty) maps to DM +1', () => {
    // Math.random=0.17 → d6=floor(0.17*6)+1=2, 2d6=4; but we need total=8 exactly
    // 2d6=6 needed: Math.random such that d6=3 → floor(x*6)+1=3 → x≈0.34
    // 6 + pilot:2 = 8 → effect=0 → taskChainDM(0)=+1
    vi.spyOn(Math, 'random').mockReturnValue(0.34)
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Lt. Delacroix'))
    fireEvent.click(screen.getByText('Aid Gunners'))
    fireEvent.click(screen.getByText(/EXECUTE ACTION/i))
    expect(screen.getByText(/Task chain DM \+1 to all gunner attack rolls this round/)).toBeInTheDocument()
    expect(useBattleStore.getState().ships[0].aidGunnersDM).toBe(1)
  })

  it('great success (effect ≥ 6) maps to DM +3', () => {
    // Math.random=1-ε → d6=6, 2d6=12; pilot:2 → total=14, effect=6 → taskChainDM(6)=+3
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Lt. Delacroix'))
    fireEvent.click(screen.getByText('Aid Gunners'))
    fireEvent.click(screen.getByText(/EXECUTE ACTION/i))
    expect(screen.getByText(/Task chain DM \+3 to all gunner attack rolls this round/)).toBeInTheDocument()
    expect(useBattleStore.getState().ships[0].aidGunnersDM).toBe(3)
  })
})

// ── Overload M-Drive cumulative penalty (CRB p.171, CotI report) ─────────────
describe('ActionModal — Overload M-Drive cumulative penalty (CRB p.171)', () => {
  /** NPC ship with a dedicated engineer crew member (no manual dice needed). */
  function makeEngineerShip(overloadDriveAttempts = 0) {
    return {
      id: 'ship-engineer',
      profile: {
        name: 'Freighter', hull: 40, armor: 2, thrust: 2, tonnage: 200,
        turrets: [],
        crew: [{ id: 'crew-eng', name: 'Chief Voss', skills: { engineer: 2 } }],
      },
      faction: 'npc',
      hullCurrent: 40,
      color: '#0f0',
      firedTurrets:          [],
      evasiveThrust:         0,
      criticalHits:          [],
      thrustUsedThisRound:   0,
      thrustBonusNextRound:  0,
      usedCrewMembers:       [],
      crewAssignments:       null,
      overloadDriveAttempts,
    }
  }

  afterEach(() => vi.restoreAllMocks())

  // Math.random=0.5 → both dice = 4, 2D6 total = 8 (fixed across all attempts below).
  // Difficulty 10, engineer skill +2.

  /** Render ActionModal with `priorAttempts` already on the ship, then open the action. */
  function renderAtAttempt(priorAttempts) {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    useBattleStore.getState().resetBattle('vectorial')
    useBattleStore.setState({ ships: [makeEngineerShip(priorAttempts)], phase: 'actions' })
    useUiStore.setState({ activeModal: 'action', modalPayload: { shipId: 'ship-engineer' } })
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Chief Voss'))
    fireEvent.click(screen.getByText('Overload M-Drive'))
  }

  it('first attempt (0 prior): no penalty — dm=+2, total=10, succeeds', () => {
    renderAtAttempt(0)
    expect(screen.queryByText(/Cumulative penalty/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByText(/EXECUTE ACTION/i))
    expect(screen.getByText(/SUCCESS — Effect \+0/)).toBeInTheDocument()
    expect(useBattleStore.getState().ships[0].overloadDriveAttempts).toBe(1)
  })

  it('second attempt (1 prior): shows warning, dm=+2-2=0, total=8, fails', () => {
    renderAtAttempt(1)
    expect(screen.getByText(/Cumulative penalty -2 — attempt #2/)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/EXECUTE ACTION/i))
    expect(screen.getByText(/FAILED — Effect -2/)).toBeInTheDocument()
    expect(useBattleStore.getState().ships[0].overloadDriveAttempts).toBe(2)
  })

  it('third attempt (2 prior): dm=+2-4=-2, total=6, fails harder', () => {
    renderAtAttempt(2)
    expect(screen.getByText(/Cumulative penalty -4 — attempt #3/)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/EXECUTE ACTION/i))
    expect(screen.getByText(/FAILED — Effect -4/)).toBeInTheDocument()
    expect(useBattleStore.getState().ships[0].overloadDriveAttempts).toBe(3)
  })

  it('attempt counter increments on failure too, not only on success', () => {
    renderAtAttempt(1)
    fireEvent.click(screen.getByText(/EXECUTE ACTION/i))
    expect(screen.getByText(/FAILED/)).toBeInTheDocument()
    expect(useBattleStore.getState().ships[0].overloadDriveAttempts).toBe(2)
  })

  it('does not reset across a round boundary', () => {
    useBattleStore.getState().resetBattle('vectorial')
    useBattleStore.setState({ ships: [makeEngineerShip(3)], phase: 'actions' })
    useBattleStore.getState().startNextRound()
    expect(useBattleStore.getState().ships[0].overloadDriveAttempts).toBe(3)
  })
})

// ── #34: severe failure (Effect <= -6) applies an M-Drive critical hit ────────
// CRB p.171: "If the check fails with an Effect of -6 or less, the manoeuvre
// drive suffers a critical hit with Severity 1."

describe('ActionModal — Overload M-Drive severe failure critical hit (CRB p.171, #34)', () => {
  function makeEngineerShip(overloadDriveAttempts = 0, criticalHits = []) {
    return {
      id: 'ship-engineer',
      profile: {
        name: 'Freighter', hull: 40, armor: 2, thrust: 6, tonnage: 200,
        turrets: [],
        crew: [{ id: 'crew-eng', name: 'Chief Voss', skills: { engineer: 2 } }],
      },
      faction: 'npc',
      hullCurrent: 40,
      color: '#0f0',
      firedTurrets:          [],
      evasiveThrust:         0,
      criticalHits,
      thrustUsedThisRound:   0,
      thrustBonusNextRound:  0,
      usedCrewMembers:       [],
      crewAssignments:       null,
      overloadDriveAttempts,
    }
  }

  afterEach(() => vi.restoreAllMocks())

  // Math.random=0.5 → both dice = 4, 2D6 total = 8 (fixed). Difficulty 10, engineer +2,
  // cumulative penalty -2 per prior attempt: finalTotal = 8 + 2 - 2*priorAttempts.

  it('effect exactly -6 (3 prior attempts, finalTotal=4) applies M-Drive critical Severity 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    useBattleStore.getState().resetBattle('vectorial')
    useBattleStore.setState({ ships: [makeEngineerShip(3)], phase: 'actions' })
    useUiStore.setState({ activeModal: 'action', modalPayload: { shipId: 'ship-engineer' } })
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Chief Voss'))
    fireEvent.click(screen.getByText('Overload M-Drive'))
    fireEvent.click(screen.getByText(/EXECUTE ACTION/i))
    expect(screen.getByText(/FAILED — Effect -6/)).toBeInTheDocument()
    expect(screen.getByText(/M-Drive critical hit — Severity 1 applied/)).toBeInTheDocument()
    const crit = useBattleStore.getState().ships[0].criticalHits.find((c) => c.system === 'M-Drive')
    expect(crit?.severity).toBe(1)
  })

  it('effect below -6 (4 prior attempts, finalTotal=2) also applies the critical hit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    useBattleStore.getState().resetBattle('vectorial')
    useBattleStore.setState({ ships: [makeEngineerShip(4)], phase: 'actions' })
    useUiStore.setState({ activeModal: 'action', modalPayload: { shipId: 'ship-engineer' } })
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Chief Voss'))
    fireEvent.click(screen.getByText('Overload M-Drive'))
    fireEvent.click(screen.getByText(/EXECUTE ACTION/i))
    expect(screen.getByText(/FAILED — Effect -8/)).toBeInTheDocument()
    const crit = useBattleStore.getState().ships[0].criticalHits.find((c) => c.system === 'M-Drive')
    expect(crit?.severity).toBe(1)
  })

  it('ordinary failure (effect -4, 2 prior attempts) does NOT apply a critical hit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    useBattleStore.getState().resetBattle('vectorial')
    useBattleStore.setState({ ships: [makeEngineerShip(2)], phase: 'actions' })
    useUiStore.setState({ activeModal: 'action', modalPayload: { shipId: 'ship-engineer' } })
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Chief Voss'))
    fireEvent.click(screen.getByText('Overload M-Drive'))
    fireEvent.click(screen.getByText(/EXECUTE ACTION/i))
    expect(screen.getByText(/FAILED — Effect -4/)).toBeInTheDocument()
    expect(screen.queryByText(/M-Drive critical hit/)).not.toBeInTheDocument()
    expect(useBattleStore.getState().ships[0].criticalHits).toHaveLength(0)
  })

  it('does not downgrade a pre-existing worse M-Drive critical', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    useBattleStore.getState().resetBattle('vectorial')
    useBattleStore.setState({
      ships: [makeEngineerShip(3, [{ system: 'M-Drive', severity: 4, repairRoundsApplied: 0 }])],
      phase: 'actions',
    })
    useUiStore.setState({ activeModal: 'action', modalPayload: { shipId: 'ship-engineer' } })
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Chief Voss'))
    fireEvent.click(screen.getByText('Overload M-Drive'))
    fireEvent.click(screen.getByText(/EXECUTE ACTION/i))
    const crit = useBattleStore.getState().ships[0].criticalHits.find((c) => c.system === 'M-Drive')
    expect(crit?.severity).toBe(4)
  })

  it('success (0 prior attempts) does not touch criticalHits', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    useBattleStore.getState().resetBattle('vectorial')
    useBattleStore.setState({ ships: [makeEngineerShip(0)], phase: 'actions' })
    useUiStore.setState({ activeModal: 'action', modalPayload: { shipId: 'ship-engineer' } })
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Chief Voss'))
    fireEvent.click(screen.getByText('Overload M-Drive'))
    fireEvent.click(screen.getByText(/EXECUTE ACTION/i))
    expect(screen.getByText(/SUCCESS/)).toBeInTheDocument()
    expect(screen.getByText(/\+1 Thrust next round\./)).toBeInTheDocument()
    expect(useBattleStore.getState().ships[0].criticalHits).toHaveLength(0)
  })
})
