/**
 * Unit tests for CrewAssignmentModal — REQ-11 AUTO-ASSIGN.
 * Provides crew in array format to bypass migrateCrew's uuidv7() calls.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent }         from '@testing-library/react'
import { CrewAssignmentModal }               from './CrewAssignmentModal.jsx'
import { useBattleStore }                    from '../../store/battleStore.js'
import { useUiStore }                        from '../../store/uiStore.js'

// Two crew members with differentiated skills so AUTO-ASSIGN has clear winners.
const CREW_TWO = [
  { id: 'c1', name: 'Alia', skills: { pilot: 3, gunner: 1, engineer: 0, sensors: 2, leadership: -1, tactics: 0 } },
  { id: 'c2', name: 'Kael', skills: { pilot: 0, gunner: 3, engineer: 2, sensors: 1, leadership:  1, tactics: 2 } },
]

const CREW_ONE = [
  { id: 'solo', name: 'Solo', skills: { pilot: 2, gunner: 2, engineer: 1, sensors: 1, leadership: 0, tactics: 0 } },
]

function openFor({ crew = [], turrets = [] } = {}) {
  useBattleStore.getState().addShip(
    { id: 'p-crew', name: 'Test Ship', hull: 10, thrust: 4, tonnage: 100, turrets, crew },
    { q: 0, r: 0 }, 'players', '#0f0',
  )
  const ship = useBattleStore.getState().ships[0]
  useUiStore.setState({ activeModal: 'crewAssignment', modalPayload: { shipId: ship.id } })
  return ship
}

function saveAndGet() {
  fireEvent.click(screen.getByText('SAVE ASSIGNMENTS'))
  return useBattleStore.getState().ships[0]
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({ activeModal: null, modalPayload: null })
})

// === Empty crew ===============================================================

describe('CrewAssignmentModal — no crew', () => {
  it('shows "No named crew" message', () => {
    openFor({ crew: [] })
    render(<CrewAssignmentModal />)
    expect(screen.getByText(/No named crew/)).toBeInTheDocument()
  })

  it('does not render AUTO-ASSIGN when crew array is empty', () => {
    openFor({ crew: [] })
    render(<CrewAssignmentModal />)
    expect(screen.queryByText('AUTO-ASSIGN')).not.toBeInTheDocument()
  })
})

// === REQ-11: AUTO-ASSIGN =====================================================

describe('CrewAssignmentModal — AUTO-ASSIGN (REQ-11)', () => {
  it('renders AUTO-ASSIGN button when crew is present', () => {
    openFor({ crew: CREW_TWO })
    render(<CrewAssignmentModal />)
    expect(screen.getByText('AUTO-ASSIGN')).toBeInTheDocument()
  })

  it('assigns highest-pilot crew to pilot role', () => {
    openFor({ crew: CREW_TWO })
    render(<CrewAssignmentModal />)
    fireEvent.click(screen.getByText('AUTO-ASSIGN'))
    const ship = saveAndGet()
    expect(ship.crewAssignments.pilot).toBe('c1')  // Alia pilot:3
  })

  it('assigns highest-tactics crew to tactics role', () => {
    openFor({ crew: CREW_TWO })
    render(<CrewAssignmentModal />)
    fireEvent.click(screen.getByText('AUTO-ASSIGN'))
    const ship = saveAndGet()
    expect(ship.crewAssignments.tactics).toBe('c2')    // Kael tactics:2
  })

  it('assigns highest-engineer crew to engineer role', () => {
    openFor({ crew: CREW_TWO })
    render(<CrewAssignmentModal />)
    fireEvent.click(screen.getByText('AUTO-ASSIGN'))
    const ship = saveAndGet()
    expect(ship.crewAssignments.engineer).toBe('c2')   // Kael engineer:2
  })

  it('assigns highest-gunner crew to each turret slot', () => {
    openFor({
      crew: CREW_TWO,
      turrets: [
        { slot: 1, weapons: ['Pulse Laser'] },
        { slot: 2, weapons: ['Beam Laser'] },
      ],
    })
    render(<CrewAssignmentModal />)
    fireEvent.click(screen.getByText('AUTO-ASSIGN'))
    const ship = saveAndGet()
    expect(ship.crewAssignments.gunners[1]).toBe('c2')  // Kael gunner:3
    expect(ship.crewAssignments.gunners[2]).toBe('c2')
  })

  it('one crew member can cover all roles (solo-pilot ship)', () => {
    openFor({
      crew: CREW_ONE,
      turrets: [{ slot: 1, weapons: ['Pulse Laser'] }],
    })
    render(<CrewAssignmentModal />)
    fireEvent.click(screen.getByText('AUTO-ASSIGN'))
    const ship = saveAndGet()
    expect(ship.crewAssignments.pilot).toBe('solo')
    expect(ship.crewAssignments.engineer).toBe('solo')
    expect(ship.crewAssignments.gunners[1]).toBe('solo')
  })

  it('AUTO-ASSIGN followed by CLEAR ALL resets all roles to null', () => {
    openFor({
      crew: CREW_TWO,
      turrets: [{ slot: 1, weapons: ['Pulse Laser'] }],
    })
    render(<CrewAssignmentModal />)
    fireEvent.click(screen.getByText('AUTO-ASSIGN'))
    fireEvent.click(screen.getByText('CLEAR ALL'))
    const ship = saveAndGet()
    expect(ship.crewAssignments.pilot).toBeNull()
    expect(ship.crewAssignments.gunners[1]).toBeNull()
  })

  it('does nothing when crew is empty (defensive)', () => {
    openFor({ crew: [] })
    render(<CrewAssignmentModal />)
    // No AUTO-ASSIGN button — modal shows no-crew message without crashing
    expect(screen.getByText(/No named crew/)).toBeInTheDocument()
  })
})
