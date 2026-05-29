/**
 * Tests for BoardingSetupModal.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BoardingSetupModal } from './BoardingSetupModal.jsx'
import { useBattleStore }     from '../../store/battleStore.js'
import { useUiStore }         from '../../store/uiStore.js'

function makeProfile(overrides = {}) {
  return { id: 'p', name: 'Ship', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [], ...overrides }
}

function addShip(name, faction, q, r, thrust = 4) {
  useBattleStore.getState().addShip(makeProfile({ id: `p-${name}`, name, thrust }), { q, r }, faction, '#fff')
  const ships = useBattleStore.getState().ships
  return ships[ships.length - 1].id
}

function openSetup(attackerId) {
  useUiStore.setState({ activeModal: 'boarding-setup', modalPayload: { attackerId } })
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({ activeModal: null, modalPayload: null })
})

describe('BoardingSetupModal — guard', () => {
  it('renders null when modal closed', () => {
    const { container } = render(<BoardingSetupModal />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when attacker not in store', () => {
    useUiStore.setState({ activeModal: 'boarding-setup', modalPayload: { attackerId: 'ghost' } })
    const { container } = render(<BoardingSetupModal />)
    expect(container.firstChild).toBeNull()
  })
})

describe('BoardingSetupModal — display', () => {
  it('shows attacker name and stats', () => {
    const aId = addShip('Viper', 'players', 0, 0, 4)
    addShip('Far Trader', 'npc', 1, 0, 2)
    openSetup(aId)
    render(<BoardingSetupModal />)
    expect(screen.getAllByText(/Viper/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Thrust 4/)).toBeInTheDocument()
  })

  it('shows valid targets when adjacent and thrust ≥ defender', () => {
    const aId = addShip('Viper', 'players', 0, 0, 4)
    addShip('Far Trader', 'npc', 1, 0, 2)
    openSetup(aId)
    render(<BoardingSetupModal />)
    expect(screen.getByText(/Far Trader/)).toBeInTheDocument()
    expect(screen.getByText(/BOARD →/)).toBeInTheDocument()
  })

  it('shows no-targets message when no valid target', () => {
    const aId = addShip('Viper', 'players', 0, 0, 2)
    addShip('Cruiser', 'npc', 5, 0, 6)  // too far
    openSetup(aId)
    render(<BoardingSetupModal />)
    expect(screen.getByText(/NO VALID TARGETS/i)).toBeInTheDocument()
  })

  it('hides same-faction ships as targets', () => {
    const aId = addShip('Viper', 'players', 0, 0, 4)
    addShip('Ally', 'players', 1, 0, 2)
    openSetup(aId)
    render(<BoardingSetupModal />)
    expect(screen.getByText(/NO VALID TARGETS/i)).toBeInTheDocument()
  })

  it('hides targets with higher thrust (no M-Drive disable)', () => {
    const aId = addShip('Viper', 'players', 0, 0, 2)
    addShip('Fighter', 'npc', 1, 0, 6)
    openSetup(aId)
    render(<BoardingSetupModal />)
    expect(screen.getByText(/NO VALID TARGETS/i)).toBeInTheDocument()
  })
})

describe('BoardingSetupModal — actions', () => {
  it('clicking BOARD starts boarding and opens contact modal', () => {
    const aId = addShip('Viper', 'players', 0, 0, 4)
    addShip('Far Trader', 'npc', 1, 0, 2)
    openSetup(aId)
    render(<BoardingSetupModal />)
    fireEvent.click(screen.getByText(/BOARD →/))
    expect(useBattleStore.getState().boardings).toHaveLength(1)
    expect(useUiStore.getState().activeModal).toBe('boarding-contact')
  })

  it('CANCEL closes the modal', () => {
    const aId = addShip('Viper', 'players', 0, 0, 4)
    openSetup(aId)
    render(<BoardingSetupModal />)
    fireEvent.click(screen.getByText('CANCEL'))
    expect(useUiStore.getState().activeModal).toBeNull()
  })
})
