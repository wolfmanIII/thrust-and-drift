import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
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
