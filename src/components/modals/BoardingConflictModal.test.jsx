/**
 * Tests for BoardingConflictModal.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BoardingConflictModal } from './BoardingConflictModal.jsx'
import { useBattleStore }        from '../../store/battleStore.js'
import { useUiStore }            from '../../store/uiStore.js'

function makeProfile(overrides = {}) {
  return { id: 'p', name: 'Ship', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [], ...overrides }
}

function setupConflict() {
  useBattleStore.getState().addShip(makeProfile({ id: 'pa', name: 'Viper' }), { q: 0, r: 0 }, 'players', '#0f0')
  useBattleStore.getState().addShip(makeProfile({ id: 'pb', name: 'Far Trader' }), { q: 1, r: 0 }, 'npc', '#f00')
  const [a, b] = useBattleStore.getState().ships
  useBattleStore.getState().startBoarding(a.id, b.id)
  const bid = useBattleStore.getState().boardings[0].id
  useBattleStore.getState().advanceBoardingPhase(bid) // → conflict
  useUiStore.setState({ activeModal: 'boarding-conflict', modalPayload: { boardingAttackerId: a.id } })
  return { a, b, bid }
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({ activeModal: null, modalPayload: null })
})

describe('BoardingConflictModal — guard', () => {
  it('renders null when modal closed', () => {
    const { container } = render(<BoardingConflictModal />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when no active conflict boarding found', () => {
    useUiStore.setState({ activeModal: 'boarding-conflict', modalPayload: { boardingAttackerId: 'ghost' } })
    const { container } = render(<BoardingConflictModal />)
    expect(container.firstChild).toBeNull()
  })
})

describe('BoardingConflictModal — display', () => {
  it('shows both ship names', () => {
    setupConflict()
    render(<BoardingConflictModal />)
    expect(screen.getAllByText(/Viper/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Far Trader/i).length).toBeGreaterThan(0)
  })

  it('shows 3 objective buttons', () => {
    setupConflict()
    render(<BoardingConflictModal />)
    expect(screen.getByText(/Ponte/i)).toBeInTheDocument()
    expect(screen.getByText(/Engineering/i)).toBeInTheDocument()
    expect(screen.getByText(/Torrette/i)).toBeInTheDocument()
  })

  it('shows stacking and missed-shot roll buttons', () => {
    setupConflict()
    render(<BoardingConflictModal />)
    expect(screen.getByText(/TIRA STACKING/i)).toBeInTheDocument()
    expect(screen.getByText(/TIRA COLPO MANCATO/i)).toBeInTheDocument()
  })

  it('shows weapon DM reminder', () => {
    setupConflict()
    render(<BoardingConflictModal />)
    expect(screen.getByText(/Fucili −2/i)).toBeInTheDocument()
  })
})

describe('BoardingConflictModal — actions', () => {
  it('clicking Ponte marks bridge conquered in store', () => {
    const { bid } = setupConflict()
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText(/Ponte/i))
    expect(useBattleStore.getState().boardings.find((b) => b.id === bid).objectives.bridge).toBe(true)
  })

  it('clicking bridge again un-conquers it', () => {
    const { bid } = setupConflict()
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText(/Ponte/i))
    fireEvent.click(screen.getByText(/Ponte/i))
    expect(useBattleStore.getState().boardings.find((b) => b.id === bid).objectives.bridge).toBe(false)
  })

  it('shows all-conquered banner when all 3 objectives taken', () => {
    const { bid } = setupConflict()
    useBattleStore.getState().setObjective(bid, 'bridge', true)
    useBattleStore.getState().setObjective(bid, 'engineering', true)
    useBattleStore.getState().setObjective(bid, 'turrets', true)
    render(<BoardingConflictModal />)
    expect(screen.getByText(/NAVE PRESA/i)).toBeInTheDocument()
  })

  it('TIRA STACKING renders a result', () => {
    setupConflict()
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText(/TIRA STACKING/i))
    // Result badge appears: "Successo" or "Fallimento"
    const hasResult =
      screen.queryByText(/Successo/i) !== null ||
      screen.queryByText(/Fallimento/i) !== null
    expect(hasResult).toBe(true)
  })

  it('TIRA COLPO MANCATO renders a result label', () => {
    setupConflict()
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText(/TIRA COLPO MANCATO/i))
    // Result includes one of the outcome labels
    const labels = ['ATTACCANTE', 'DIFENSORE', 'Sistema', 'Nessun', 'critico']
    const found = labels.some((l) => screen.queryAllByText(new RegExp(l, 'i')).length > 0)
    expect(found).toBe(true)
  })

  it('FINE CONFLITTO advances to security and closes modal', () => {
    const { bid } = setupConflict()
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText(/FINE CONFLITTO/i))
    expect(useBattleStore.getState().boardings.find((b) => b.id === bid).phase).toBe('security')
    expect(useUiStore.getState().activeModal).toBeNull()
  })
})
