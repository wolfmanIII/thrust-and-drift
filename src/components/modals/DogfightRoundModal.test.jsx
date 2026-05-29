/**
 * Tests for DogfightRoundModal — micro-round resolution flow.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DogfightRoundModal } from './DogfightRoundModal.jsx'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore } from '../../store/uiStore.js'

function makeProfile(overrides = {}) {
  return {
    id: 'p1', name: 'Viper', hull: 10, thrust: 4,
    tonnage: 50, turrets: [], crew: { pilot: 2 },
    ...overrides,
  }
}

/**
 * Add two ships, start a dogfight, wire uiStore modalPayload.
 * Returns the group id.
 */
function setupDogfight() {
  useBattleStore.getState().addShip(
    makeProfile({ id: 'p1', name: 'Viper', thrust: 4 }),
    { q: 0, r: 0 }, 'players', '#0f0'
  )
  useBattleStore.getState().addShip(
    makeProfile({ id: 'p2', name: 'Fighter', thrust: 3 }),
    { q: 0, r: 0 }, 'npc', '#f00'
  )
  const [a, b] = useBattleStore.getState().ships
  useBattleStore.getState().startDogfight([a.id, b.id])
  const groupId = useBattleStore.getState().dogfights[0].id
  useUiStore.setState({ modalPayload: { groupId } })
  return { groupId, a, b }
}

/** Enter dice values into the nth pair of Die-1 / Die-2 inputs (0-indexed). */
function enterDicePair(allInputs, pairIndex, d1, d2) {
  fireEvent.change(allInputs[pairIndex * 2],     { target: { value: String(d1) } })
  fireEvent.change(allInputs[pairIndex * 2 + 1], { target: { value: String(d2) } })
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({ modalPayload: null })
})

describe('DogfightRoundModal — guard', () => {
  it('renders nothing when groupId not found', () => {
    useUiStore.setState({ modalPayload: { groupId: 'nonexistent' } })
    const { container } = render(<DogfightRoundModal />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when modalPayload is null', () => {
    const { container } = render(<DogfightRoundModal />)
    expect(container.firstChild).toBeNull()
  })
})

describe('DogfightRoundModal — declare phase', () => {
  it('shows micro-round number in title', () => {
    setupDogfight()
    render(<DogfightRoundModal />)
    expect(screen.getByText(/MICRO-ROUND 1\/6/)).toBeInTheDocument()
  })

  it('shows both ship names', () => {
    setupDogfight()
    render(<DogfightRoundModal />)
    expect(screen.getAllByText('Viper').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Fighter').length).toBeGreaterThan(0)
  })

  it('does not show previous winner banner on micro-round 1 without winner', () => {
    setupDogfight()
    render(<DogfightRoundModal />)
    expect(screen.queryByText(/Bonus round/)).not.toBeInTheDocument()
  })

  it('shows previous winner banner when roundWinnerId is set', () => {
    const { groupId, a } = setupDogfight()
    useBattleStore.setState((s) => ({
      dogfights: s.dogfights.map((g) =>
        g.id === groupId
          ? { ...g, roundWinnerId: a.id, roundWinnerMargin: 3 }
          : g
      ),
    }))
    render(<DogfightRoundModal />)
    // Banner shows "+3" margin and winner name
    expect(screen.getByText(/bonus to current check/)).toBeInTheDocument()
  })

  it('NO ESCAPE button advances to rolling phase', () => {
    setupDogfight()
    render(<DogfightRoundModal />)
    fireEvent.click(screen.getByText(/NO ESCAPE/))
    expect(screen.getByText(/CONFIRM CHECK/)).toBeInTheDocument()
  })
})

describe('DogfightRoundModal — rolling phase', () => {
  it('CONFIRM CHECK disabled when dice not entered', () => {
    setupDogfight()
    render(<DogfightRoundModal />)
    fireEvent.click(screen.getByText(/NO ESCAPE/))
    expect(screen.getByText(/CONFIRM CHECK/)).toBeDisabled()
  })

  it('CONFIRM CHECK enabled when all ships have dice', () => {
    setupDogfight()
    const { container } = render(<DogfightRoundModal />)
    fireEvent.click(screen.getByText(/NO ESCAPE/))
    const inputs = container.querySelectorAll('input[type="number"]')
    // 2 ships × 2 dice inputs each = 4 inputs
    enterDicePair(inputs, 0, 3, 4)
    enterDicePair(inputs, 1, 5, 3)
    expect(screen.getByText(/CONFIRM CHECK/)).not.toBeDisabled()
  })
})

describe('DogfightRoundModal — result phase', () => {
  function navigateToResult(container) {
    fireEvent.click(screen.getByText(/NO ESCAPE/))
    const inputs = container.querySelectorAll('input[type="number"]')
    enterDicePair(inputs, 0, 3, 3)  // ship A: 6 + DMs
    enterDicePair(inputs, 1, 5, 5)  // ship B: 10 + DMs → likely wins
    fireEvent.click(screen.getByText(/CONFIRM CHECK/))
  }

  it('shows advance button after confirming check', () => {
    setupDogfight()
    const { container } = render(<DogfightRoundModal />)
    navigateToResult(container)
    expect(screen.getByText(/ADVANCE.*MICRO-ROUND 2\/6/)).toBeInTheDocument()
  })

  it('shows attack DM labels', () => {
    setupDogfight()
    const { container } = render(<DogfightRoundModal />)
    navigateToResult(container)
    // Winner gets +2, loser gets -2
    expect(screen.getByText(/Attack DM \+2/)).toBeInTheDocument()
    expect(screen.getByText(/Attack DM -2/)).toBeInTheDocument()
  })

  it('advance calls advanceDogfightMicroRound', () => {
    const { groupId } = setupDogfight()
    const { container } = render(<DogfightRoundModal />)
    navigateToResult(container)
    fireEvent.click(screen.getByText(/ADVANCE/))
    const g = useBattleStore.getState().dogfights.find((x) => x.id === groupId)
    expect(g.microRound).toBe(2)
  })

  it('shows END DOGFIGHT on last micro-round', () => {
    const { groupId } = setupDogfight()
    useBattleStore.setState((s) => ({
      dogfights: s.dogfights.map((g) =>
        g.id === groupId ? { ...g, microRound: 6 } : g
      ),
    }))
    const { container } = render(<DogfightRoundModal />)
    navigateToResult(container)
    expect(screen.getByText(/END DOGFIGHT/)).toBeInTheDocument()
  })
})

describe('DogfightRoundModal — escape check phase', () => {
  // Viper thrust=4, Fighter thrust=3 — Fighter can't auto-escape (3 ≤ 4)

  function declareFleeForFighter() {
    // Ships rendered in insertion order: Viper first, Fighter second
    const rimaneButtons = screen.getAllByText('STAY')
    fireEvent.click(rimaneButtons[1])            // Fighter → FLEE
    fireEvent.click(screen.getByText(/CONFIRM ESCAPE/))
  }

  it('shows escape check section when fleeing ship lacks thrust advantage', () => {
    setupDogfight()
    render(<DogfightRoundModal />)
    declareFleeForFighter()
    expect(screen.getAllByText(/Pursuit check/i).length).toBeGreaterThan(0)
    expect(screen.getByText('Evader')).toBeInTheDocument()
    expect(screen.getAllByText(/Pursuer/i).length).toBeGreaterThan(0)
  })

  it('CONFIRM PURSUIT CHECK disabled until flee and pursuer dice both entered', () => {
    setupDogfight()
    const { container } = render(<DogfightRoundModal />)
    declareFleeForFighter()
    expect(screen.getByText(/CONFIRM PURSUIT CHECK/)).toBeDisabled()
    const inputs = container.querySelectorAll('input[type="number"]')
    enterDicePair(inputs, 0, 3, 3)                   // flee dice only
    expect(screen.getByText(/CONFIRM PURSUIT CHECK/)).toBeDisabled()
    enterDicePair(inputs, 1, 2, 2)                   // pursuer dice
    expect(screen.getByText(/CONFIRM PURSUIT CHECK/)).not.toBeDisabled()
  })

  it('shows live result preview (FUGA RIUSCITA or CATTURATO) when both dice entered', () => {
    setupDogfight()
    const { container } = render(<DogfightRoundModal />)
    declareFleeForFighter()
    const inputs = container.querySelectorAll('input[type="number"]')
    enterDicePair(inputs, 0, 6, 6)    // flee max roll → large total
    enterDicePair(inputs, 1, 1, 1)    // pursuer min roll → small total
    expect(screen.getByText(/ESCAPED|CAUGHT/)).toBeInTheDocument()
  })
})
