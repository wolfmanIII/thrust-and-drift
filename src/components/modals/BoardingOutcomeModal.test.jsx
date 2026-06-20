/**
 * Tests for BoardingOutcomeModal.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BoardingOutcomeModal } from './BoardingOutcomeModal.jsx'
import { useBattleStore }       from '../../store/battleStore.js'
import { useUiStore }           from '../../store/uiStore.js'

function makeProfile(overrides = {}) {
  return { id: 'p', name: 'Ship', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [], ...overrides }
}

function setupSecurity() {
  useBattleStore.getState().addShip(makeProfile({ id: 'pa', name: 'Viper' }), { q: 0, r: 0 }, 'players', '#0f0')
  useBattleStore.getState().addShip(makeProfile({ id: 'pb', name: 'Far Trader' }), { q: 1, r: 0 }, 'npc', '#f00')
  const [a, b] = useBattleStore.getState().ships
  useBattleStore.getState().startBoarding(a.id, b.id)
  const bid = useBattleStore.getState().boardings[0].id
  useBattleStore.getState().advanceBoardingPhase(bid) // → conflict
  useBattleStore.getState().advanceBoardingPhase(bid) // → security
  useUiStore.setState({ activeModal: 'boarding-outcome', modalPayload: { boardingId: bid } })
  return { a, b, bid }
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({ activeModal: null, modalPayload: null })
})

describe('BoardingOutcomeModal — guard', () => {
  it('renders null when modal closed', () => {
    const { container } = render(<BoardingOutcomeModal />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when no security-phase boarding', () => {
    useUiStore.setState({ activeModal: 'boarding-outcome', modalPayload: { boardingId: 'ghost-id' } })
    const { container } = render(<BoardingOutcomeModal />)
    expect(container.firstChild).toBeNull()
  })
})

describe('BoardingOutcomeModal — display', () => {
  it('shows both ship names', () => {
    setupSecurity()
    render(<BoardingOutcomeModal />)
    expect(screen.getAllByText(/Viper/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Far Trader/i).length).toBeGreaterThan(0)
  })

  it('shows 3 outcome options', () => {
    setupSecurity()
    render(<BoardingOutcomeModal />)
    expect(screen.getAllByText(/Attacker wins/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Defender repels/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Ship destroyed/i).length).toBeGreaterThan(0)
  })

  it('confirm button is disabled when no outcome selected', () => {
    setupSecurity()
    render(<BoardingOutcomeModal />)
    const btn = screen.getByText(/CONFIRM OUTCOME/i)
    expect(btn).toBeDisabled()
  })

  it('shows captured objectives summary when any are taken', () => {
    const { bid } = setupSecurity()
    useBattleStore.setState({
      boardings: useBattleStore.getState().boardings.map((b) =>
        b.id !== bid ? b : { ...b, objectives: { bridge: true, engineering: false, turrets: true } }
      ),
    })
    render(<BoardingOutcomeModal />)
    expect(screen.getByText(/Captured objectives/i)).toBeInTheDocument()
  })
})

describe('BoardingOutcomeModal — actions', () => {
  it('selecting defender_wins and confirming resolves boarding', () => {
    const { bid } = setupSecurity()
    render(<BoardingOutcomeModal />)
    fireEvent.click(screen.getByText(/Defender repels/i))
    fireEvent.click(screen.getByText(/CONFIRM OUTCOME/i))
    expect(useBattleStore.getState().boardings.find((b) => b.id === bid).outcome).toBe('defender_wins')
    expect(useUiStore.getState().activeModal).toBeNull()
  })

  it('selecting ship_destroyed resolves with ship_destroyed', () => {
    const { bid } = setupSecurity()
    render(<BoardingOutcomeModal />)
    fireEvent.click(screen.getAllByText(/Ship destroyed/i)[0])
    fireEvent.click(screen.getByText(/CONFIRM OUTCOME/i))
    expect(useBattleStore.getState().boardings.find((b) => b.id === bid).outcome).toBe('ship_destroyed')
  })

  it('attacker_wins clears inBoarding on both ships', () => {
    const { a, b } = setupSecurity()
    render(<BoardingOutcomeModal />)
    fireEvent.click(screen.getByText(/Attacker wins/i))
    fireEvent.click(screen.getByText(/CONFIRM OUTCOME/i))
    const { ships } = useBattleStore.getState()
    expect(ships.find((s) => s.id === a.id).inBoarding).toBeNull()
    expect(ships.find((s) => s.id === b.id).inBoarding).toBeNull()
  })

  it('confirm button is enabled after selecting an outcome', () => {
    setupSecurity()
    render(<BoardingOutcomeModal />)
    fireEvent.click(screen.getByText(/Defender repels/i))
    expect(screen.getByText(/CONFIRM OUTCOME/i)).not.toBeDisabled()
  })
})
