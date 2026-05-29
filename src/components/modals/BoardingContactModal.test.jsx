/**
 * Tests for BoardingContactModal.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BoardingContactModal } from './BoardingContactModal.jsx'
import { useBattleStore }       from '../../store/battleStore.js'
import { useUiStore }           from '../../store/uiStore.js'

function makeProfile(overrides = {}) {
  return { id: 'p', name: 'Ship', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [], ...overrides }
}

function setupBoarding() {
  useBattleStore.getState().addShip(makeProfile({ id: 'pa', name: 'Viper', thrust: 4 }), { q: 0, r: 0 }, 'players', '#0f0')
  useBattleStore.getState().addShip(makeProfile({ id: 'pb', name: 'Far Trader', thrust: 2 }), { q: 1, r: 0 }, 'npc', '#f00')
  const [a, b] = useBattleStore.getState().ships
  useBattleStore.getState().startBoarding(a.id, b.id)
  const boarding = useBattleStore.getState().boardings[0]
  useUiStore.setState({ activeModal: 'boarding-contact', modalPayload: { boardingAttackerId: a.id } })
  return { a, b, boarding }
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({ activeModal: null, modalPayload: null })
})

describe('BoardingContactModal — guard', () => {
  it('renders null when modal closed', () => {
    const { container } = render(<BoardingContactModal />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when no active boarding found', () => {
    useUiStore.setState({ activeModal: 'boarding-contact', modalPayload: { boardingAttackerId: 'ghost' } })
    const { container } = render(<BoardingContactModal />)
    expect(container.firstChild).toBeNull()
  })
})

describe('BoardingContactModal — display', () => {
  it('shows both ship names', () => {
    setupBoarding()
    render(<BoardingContactModal />)
    expect(screen.getAllByText(/Viper/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Far Trader/i).length).toBeGreaterThan(0)
  })

  it('shows all 6 entry method buttons', () => {
    setupBoarding()
    render(<BoardingContactModal />)
    expect(screen.getAllByText(/Airlock \(cooperative\)/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Airlock \(forced\)/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Breaching Tube/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Forced Linkage/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Hull Cut/i).length).toBeGreaterThan(0)
  })

  it('shows tumbling and forced linkage toggle buttons', () => {
    setupBoarding()
    render(<BoardingContactModal />)
    expect(screen.getAllByText(/Tumbling/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Forced Linkage/i).length).toBeGreaterThan(0)
  })
})

describe('BoardingContactModal — actions', () => {
  it('selecting an entry method updates store', () => {
    const { boarding } = setupBoarding()
    render(<BoardingContactModal />)
    fireEvent.click(screen.getByText(/Breaching Tube/i))
    expect(useBattleStore.getState().boardings.find((b) => b.id === boarding.id).contactMethod).toBe('breaching_tube')
  })

  it('toggling tumbling updates store', () => {
    const { boarding } = setupBoarding()
    render(<BoardingContactModal />)
    fireEvent.click(screen.getAllByText(/Tumbling/i)[0])
    expect(useBattleStore.getState().boardings.find((b) => b.id === boarding.id).defenderRotating).toBe(true)
  })

  it('toggling forced linkage updates store', () => {
    const { boarding } = setupBoarding()
    render(<BoardingContactModal />)
    // "Forced Linkage" appears in entry method list and toggle button — click last
    const buttons = screen.getAllByText(/Forced Linkage/i)
    fireEvent.click(buttons[buttons.length - 1])
    expect(useBattleStore.getState().boardings.find((b) => b.id === boarding.id).forcedLinkage).toBe(true)
  })

  it('ADVANCE TO CONFLICT advances phase and closes modal', () => {
    const { boarding } = setupBoarding()
    render(<BoardingContactModal />)
    fireEvent.click(screen.getByText(/ADVANCE TO CONFLICT/i))
    expect(useBattleStore.getState().boardings.find((b) => b.id === boarding.id).phase).toBe('conflict')
    expect(useUiStore.getState().activeModal).toBeNull()
  })

  it('store reflects hull_cut method after setContactMethod', () => {
    const { boarding } = setupBoarding()
    useBattleStore.getState().setContactMethod(boarding.id, 'hull_cut')
    expect(useBattleStore.getState().boardings[0].contactMethod).toBe('hull_cut')
    render(<BoardingContactModal />)
    expect(screen.getAllByText(/Hull Cut/i).length).toBeGreaterThanOrEqual(1)
  })
})
