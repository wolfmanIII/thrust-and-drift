/**
 * Tests for BoardingConflictModal.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
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
  useUiStore.setState({ activeModal: 'boarding-conflict', modalPayload: { boardingId: bid } })
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
    useUiStore.setState({ activeModal: 'boarding-conflict', modalPayload: { boardingId: 'ghost-id' } })
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
    expect(screen.getByText(/Bridge/i)).toBeInTheDocument()
    expect(screen.getByText(/Engineering/i)).toBeInTheDocument()
    expect(screen.getByText(/Turrets/i)).toBeInTheDocument()
  })

  it('shows stacking and missed-shot roll buttons', () => {
    setupConflict()
    render(<BoardingConflictModal />)
    expect(screen.getByText(/ROLL STACKING/i)).toBeInTheDocument()
    expect(screen.getByText(/ROLL MISSED SHOT/i)).toBeInTheDocument()
  })

  it('shows weapon DM reminder', () => {
    setupConflict()
    render(<BoardingConflictModal />)
    expect(screen.getByText(/Rifles −2/i)).toBeInTheDocument()
  })
})

describe('BoardingConflictModal — actions', () => {
  it('clicking Bridge marks bridge conquered in store', () => {
    const { bid } = setupConflict()
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText(/Bridge/i))
    expect(useBattleStore.getState().boardings.find((b) => b.id === bid).objectives.bridge).toBe(true)
  })

  it('clicking Bridge again un-conquers it', () => {
    const { bid } = setupConflict()
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText(/Bridge/i))
    fireEvent.click(screen.getByText(/Bridge/i))
    expect(useBattleStore.getState().boardings.find((b) => b.id === bid).objectives.bridge).toBe(false)
  })

  it('shows all-conquered banner when all 3 objectives taken', () => {
    const { bid } = setupConflict()
    useBattleStore.getState().setObjective(bid, 'bridge', true)
    useBattleStore.getState().setObjective(bid, 'engineering', true)
    useBattleStore.getState().setObjective(bid, 'turrets', true)
    render(<BoardingConflictModal />)
    expect(screen.getByText(/SHIP TAKEN/i)).toBeInTheDocument()
  })

  it('ROLL STACKING renders a result', () => {
    setupConflict()
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText(/ROLL STACKING/i))
    const hasResult =
      screen.queryByText(/Success/i) !== null ||
      screen.queryByText(/Failure/i) !== null
    expect(hasResult).toBe(true)
  })

  it('ROLL MISSED SHOT renders a result label', () => {
    setupConflict()
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText(/ROLL MISSED SHOT/i))
    const labels = ['FIRING', 'OPPOSING', 'Minor system', 'No critical', 'Critical system']
    const found = labels.some((l) => screen.queryAllByText(new RegExp(l, 'i')).length > 0)
    expect(found).toBe(true)
  })

  it('END CONFLICT advances to security and closes modal', () => {
    const { bid } = setupConflict()
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText(/END CONFLICT/i))
    expect(useBattleStore.getState().boardings.find((b) => b.id === bid).phase).toBe('security')
    expect(useUiStore.getState().activeModal).toBeNull()
  })
})

// === Targets from the rosters — HG pp.132–133 ===

describe('BoardingConflictModal — roster targeting', () => {
  const stat = { str: 7, dex: 7, end: 7 }

  function seed(bid) {
    const s = useBattleStore.getState()
    s.addBoarders(bid, 'attacker', [{ name: 'Raider A', ...stat }, { name: 'Raider B', ...stat }])
    s.addBoarders(bid, 'defender', [{ name: 'Guard A', ...stat }, { name: 'Guard B', ...stat }])
  }

  afterEach(() => { vi.restoreAllMocks() })

  it('shows the front of the target line and switches with the firing side', () => {
    const { bid } = setupConflict()
    seed(bid)
    render(<BoardingConflictModal />)
    expect(screen.getByText(/Front of the defenders/)).toBeTruthy()
    expect(screen.getByText('Guard A')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'DEFENDERS' }))
    expect(screen.getByText(/Front of the boarders/)).toBeTruthy()
    expect(screen.getByText('Raider A')).toBeTruthy()
  })

  it('stack hit of 9 or less picks the first in the stack', () => {
    const { bid } = setupConflict()
    seed(bid)
    vi.spyOn(Math, 'random').mockReturnValue(0)       // 1 + 1 = 2
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText('ROLL STACK HIT'))
    const target = within(screen.getByTestId('conflict-target'))
    expect(target.getByText(/First in the stack/)).toBeTruthy()
    expect(target.getByText(/Guard A/)).toBeTruthy()
  })

  it('stack hit of 10–12 picks another member', () => {
    const { bid } = setupConflict()
    seed(bid)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)    // 6 + 6 = 12
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText('ROLL STACK HIT'))
    const target = within(screen.getByTestId('conflict-target'))
    expect(target.getByText(/Another member/)).toBeTruthy()
    expect(target.getByText(/Guard B/)).toBeTruthy()
  })

  it('DAMAGE on a resolved target opens the roster damage form and applies it', () => {
    const { bid } = setupConflict()
    seed(bid)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText('ROLL STACK HIT'))
    fireEvent.click(screen.getByRole('button', { name: 'DAMAGE' }))
    fireEvent.change(screen.getByLabelText('Damage'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'APPLY DAMAGE' }))
    const guard = useBattleStore.getState().boardings[0].parties.defender[0]
    expect(guard.cur.end).toBe(3)
  })

  it('missed shot 1–3 hits a member of the firing group', () => {
    const { bid } = setupConflict()
    seed(bid)
    vi.spyOn(Math, 'random').mockReturnValue(0)       // 2 → attacker_hit
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText(/ROLL MISSED SHOT/i))
    const target = within(screen.getByTestId('conflict-target'))
    expect(target.getByText(/Raider A/)).toBeTruthy()
    expect(target.getByText(/boarders\)/)).toBeTruthy()
  })

  it('missed shot 1–3 follows the firing side when the defenders shoot', () => {
    const { bid } = setupConflict()
    seed(bid)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByRole('button', { name: 'DEFENDERS' }))
    fireEvent.click(screen.getByText(/ROLL MISSED SHOT/i))
    expect(within(screen.getByTestId('conflict-target')).getByText(/Guard A/)).toBeTruthy()
  })

  it('missed shot 4–5 hits the opposing group', () => {
    const { bid } = setupConflict()
    seed(bid)
    // 2D = 2 + 2 → 4: Math.random = 0.2 → floor(0.2*6)+1 = 2 per die
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText(/ROLL MISSED SHOT/i))
    expect(within(screen.getByTestId('conflict-target')).getByText(/Guard/)).toBeTruthy()
  })

  it('system or no-effect results show no target', () => {
    const { bid } = setupConflict()
    seed(bid)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)    // 12 → critical system
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText(/ROLL MISSED SHOT/i))
    expect(screen.queryByTestId('conflict-target')).toBeNull()
  })

  it('tells the GM to resolve manually when the group has no living boarders', () => {
    setupConflict()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<BoardingConflictModal />)
    fireEvent.click(screen.getByText('ROLL STACK HIT'))
    expect(screen.getByText(/resolve manually/)).toBeTruthy()
  })
})
