/**
 * Tests for ShipDetailModal — mount type label (REQ-07).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShipDetailModal } from './ShipDetailModal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

function makeShip(turrets) {
  return {
    id: 'ship-detail-1',
    profile: {
      name: 'Testship', hull: 20, armor: 2, thrust: 4, tonnage: 200,
      turrets,
      crew: [],
    },
    faction: 'players',
    hullCurrent: 20,
    color: '#0f0',
    vector: { q: 0, r: 0 },
    position: { q: 0, r: 0 },
    initiative: 7,
    firedTurrets: [],
    evasiveThrust: 0,
    criticalHits: [],
    thrustUsedThisRound: 0,
    isDestroyed: false,
    usedCrewMembers: [],
    crewAssignments: { pilot: null, leadership: null, tactics: null, engineer: null, sensors: null, gunners: {} },
  }
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({ activeModal: 'shipDetail', modalPayload: { shipId: 'ship-detail-1' } })
})

describe('ShipDetailModal — mount type labels (REQ-07)', () => {
  it('shows "Single Turret" for a slot with 1 weapon', () => {
    useBattleStore.setState({ ships: [makeShip([{ slot: 1, weapons: ['Beam Laser'] }])] })
    render(<ShipDetailModal />)
    expect(screen.getByText(/Single Turret/)).toBeInTheDocument()
  })

  it('shows "Double Turret" for a slot with 2 weapons', () => {
    useBattleStore.setState({ ships: [makeShip([{ slot: 1, weapons: ['Beam Laser', 'Pulse Laser'] }])] })
    render(<ShipDetailModal />)
    expect(screen.getByText(/Double Turret/)).toBeInTheDocument()
  })

  it('shows "Triple Turret" for a slot with 3 weapons', () => {
    useBattleStore.setState({ ships: [makeShip([{ slot: 1, weapons: ['Beam Laser', 'Pulse Laser', 'Sandcaster'] }])] })
    render(<ShipDetailModal />)
    expect(screen.getByText(/Triple Turret/)).toBeInTheDocument()
  })

  it('shows all mount labels when multiple turret slots are present', () => {
    useBattleStore.setState({ ships: [makeShip([
      { slot: 1, weapons: ['Beam Laser'] },
      { slot: 2, weapons: ['Pulse Laser', 'Sandcaster'] },
    ])] })
    render(<ShipDetailModal />)
    expect(screen.getByText(/Single Turret/)).toBeInTheDocument()
    expect(screen.getByText(/Double Turret/)).toBeInTheDocument()
  })

  it('lists weapon names alongside the mount label', () => {
    useBattleStore.setState({ ships: [makeShip([{ slot: 1, weapons: ['Beam Laser'] }])] })
    render(<ShipDetailModal />)
    expect(screen.getByText('Beam Laser')).toBeInTheDocument()
  })
})
