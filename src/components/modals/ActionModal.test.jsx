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
    useBattleStore.setState({ ships: [SHIP] })
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
    const ship = makeSoloShip({
      skills: { pilot: 2 },
      assignments: { sensors: null },
    })
    useBattleStore.setState({ ships: [ship] })
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Solo Pilot'))
    expect(screen.queryByText('Sensor Lock')).not.toBeInTheDocument()
  })

  it('crew member assigned to all roles sees both pilot and sensor actions', () => {
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
  })
})

// ── REQ-09: negative skill values ────────────────────────────────────────────

describe('ActionModal — negative skill values (REQ-09)', () => {
  beforeEach(() => {
    useBattleStore.getState().resetBattle('vectorial')
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
    useBattleStore.setState({ ships: [PILOT_SHIP] })
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
