import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, vi } from 'vitest'
import { HUD } from './HUD.jsx'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore } from '../../store/uiStore.js'

vi.mock('../ui/Tooltip.jsx', () => ({
  Tooltip: ({ children }) => children,
}))

function makeProfile(overrides = {}) {
  return {
    id: 'p1', name: 'Test Ship', hull: 10, thrust: 4,
    tonnage: 100, turrets: [], crew: { pilot: 2 },
    ...overrides,
  }
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({ activeModal: null, modalPayload: null })
})

describe('HUD — round and phase display', () => {
  it('shows round number', () => {
    useBattleStore.setState({ round: 4 })
    render(<HUD />)
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('shows phase label for each phase', () => {
    const cases = [
      ['setup',        'SETUP'],
      ['initiative',   'INITIATIVE'],
      ['acceleration', 'ACCELERATION'],
      ['movement',     'MOVEMENT'],
      ['attack',       'ATTACK'],
      ['actions',      'ACTIONS'],
      ['end',          'END OF ROUND'],
    ]
    for (const [phase, label] of cases) {
      useBattleStore.setState({ phase })
      const { unmount } = render(<HUD />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    }
  })
})

describe('HUD — NEXT PHASE button', () => {
  it('visible in vectorial mode during movement phase', () => {
    useBattleStore.setState({ combatMode: 'vectorial', phase: 'movement' })
    render(<HUD />)
    expect(screen.getByText(/NEXT PHASE/)).toBeInTheDocument()
  })

  it('hidden in basic mode during movement phase', () => {
    useBattleStore.setState({ combatMode: 'basic', phase: 'movement' })
    render(<HUD />)
    expect(screen.queryByText(/NEXT PHASE/)).not.toBeInTheDocument()
  })

  it('visible in basic mode outside movement phase', () => {
    useBattleStore.setState({ combatMode: 'basic', phase: 'attack' })
    render(<HUD />)
    expect(screen.getByText(/NEXT PHASE/)).toBeInTheDocument()
  })

  it('click calls advancePhase when guard passes', () => {
    useBattleStore.setState({ combatMode: 'vectorial', phase: 'setup' })
    useBattleStore.getState().addShip(
      { id: 'g1', name: 'Guard', hull: 10, thrust: 2, turrets: [], crew: [] },
      { q: 0, r: 0 }, 'players', '#0ff'
    )
    render(<HUD />)
    fireEvent.click(screen.getByText(/NEXT PHASE/))
    expect(useBattleStore.getState().phase).toBe('initiative')
  })

  it('blocks advance and shows warning in setup with no ships', () => {
    useBattleStore.setState({ combatMode: 'vectorial', phase: 'setup', ships: [] })
    render(<HUD />)
    fireEvent.click(screen.getByText(/NEXT PHASE/))
    expect(useBattleStore.getState().phase).toBe('setup')
    expect(screen.getByText(/Place at least one ship/)).toBeInTheDocument()
  })

  it('blocks advance in initiative phase when initiative not rolled', () => {
    useBattleStore.setState({ combatMode: 'vectorial', phase: 'initiative', initiativeOrder: [] })
    render(<HUD />)
    fireEvent.click(screen.getByText(/NEXT PHASE/))
    expect(useBattleStore.getState().phase).toBe('initiative')
    expect(screen.getByText(/Roll initiative before advancing/)).toBeInTheDocument()
  })

  it('allows advance in initiative phase after rolling', () => {
    useBattleStore.setState({
      combatMode: 'vectorial',
      phase: 'initiative',
      initiativeOrder: ['a'],
      ships: [],
    })
    render(<HUD />)
    fireEvent.click(screen.getByText(/NEXT PHASE/))
    expect(useBattleStore.getState().phase).toBe('acceleration')
  })

  it('blocks advance and shows remaining actor count in actor phases', () => {
    useBattleStore.setState({
      combatMode: 'vectorial',
      phase: 'attack',
      initiativeOrder: ['a', 'b'],
      currentActorIndex: 0,
    })
    render(<HUD />)
    fireEvent.click(screen.getByText(/NEXT PHASE/))
    expect(useBattleStore.getState().phase).toBe('attack')
    expect(screen.getByText(/2 actors still to act/)).toBeInTheDocument()
  })
})

describe('HUD — current actor', () => {
  it('actor panel hidden when phase has no actor control', () => {
    useBattleStore.setState({ phase: 'setup', initiativeOrder: [] })
    render(<HUD />)
    expect(screen.queryByText(/left/)).not.toBeInTheDocument()
  })

  it('shows actor name and NEXT button during attack phase', () => {
    useBattleStore.getState().addShip(
      { id: 'p1', name: 'Viper', hull: 10, thrust: 4, turrets: [], crew: { pilot: 2, gunner: 1 } },
      { q: 0, r: 0 }, 'players', '#0f0'
    )
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.setState({ phase: 'attack', initiativeOrder: [id], currentActorIndex: 0 })
    render(<HUD />)
    expect(screen.getByText('Viper')).toBeInTheDocument()
    expect(screen.getByText('NEXT →')).toBeInTheDocument()
  })

  it('NEXT click increments actor index', () => {
    useBattleStore.getState().addShip(
      { id: 'p1', name: 'Viper', hull: 10, thrust: 4, turrets: [], crew: { pilot: 2, gunner: 1 } },
      { q: 0, r: 0 }, 'players', '#0f0'
    )
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.setState({ phase: 'attack', initiativeOrder: [id], currentActorIndex: 0 })
    render(<HUD />)
    fireEvent.click(screen.getByText('NEXT →'))
    expect(useBattleStore.getState().currentActorIndex).toBe(1)
  })
})

describe('HUD — undo button', () => {
  it('undo button not rendered when undoStack is empty', () => {
    render(<HUD />)
    expect(screen.queryByRole('button', { name: /Undo last action/ })).not.toBeInTheDocument()
  })

  it('undo button rendered when undoStack has entries', () => {
    useBattleStore.getState().addShip(
      { id: 'p1', name: 'Viper', hull: 10, thrust: 4, turrets: [], crew: { pilot: 2, gunner: 1 } },
      { q: 0, r: 0 }, 'players', '#0f0'
    )
    render(<HUD />)
    expect(screen.getByRole('button', { name: /Undo last action/ })).toBeInTheDocument()
  })

  it('clicking undo restores previous state', () => {
    useBattleStore.getState().addShip(
      { id: 'p1', name: 'Viper', hull: 10, thrust: 4, turrets: [], crew: { pilot: 2, gunner: 1 } },
      { q: 0, r: 0 }, 'players', '#0f0'
    )
    expect(useBattleStore.getState().ships).toHaveLength(1)
    render(<HUD />)
    fireEvent.click(screen.getByRole('button', { name: /Undo last action/ }))
    expect(useBattleStore.getState().ships).toHaveLength(0)
  })
})

describe('HUD — dogfight tracker', () => {
  it('no dogfight panel when no active dogfights', () => {
    render(<HUD />)
    expect(screen.queryByText(/DOGFIGHT/)).not.toBeInTheDocument()
  })

  it('shows dogfight panel with micro-round when dogfight is active', () => {
    useBattleStore.getState().addShip(
      makeProfile({ id: 'p1', name: 'Viper' }), { q: 0, r: 0 }, 'players', '#0f0'
    )
    useBattleStore.getState().addShip(
      makeProfile({ id: 'p2', name: 'Fighter' }), { q: 0, r: 0 }, 'npc', '#f00'
    )
    const [a, b] = useBattleStore.getState().ships
    useBattleStore.getState().startDogfight([a.id, b.id])
    render(<HUD />)
    expect(screen.getByText(/DOGFIGHT 1/)).toBeInTheDocument()
    expect(screen.getByText(/Micro-round 1\/6/)).toBeInTheDocument()
  })

  it('micro-round button opens dogfightRound modal', () => {
    useBattleStore.getState().addShip(
      makeProfile({ id: 'p1', name: 'Viper' }), { q: 0, r: 0 }, 'players', '#0f0'
    )
    useBattleStore.getState().addShip(
      makeProfile({ id: 'p2', name: 'Fighter' }), { q: 0, r: 0 }, 'npc', '#f00'
    )
    const [a, b] = useBattleStore.getState().ships
    useBattleStore.getState().startDogfight([a.id, b.id])
    render(<HUD />)
    fireEvent.click(screen.getByText(/MICRO-ROUND 1/))
    expect(useUiStore.getState().activeModal).toBe('dogfightRound')
    expect(useUiStore.getState().modalPayload?.groupId).toBe(
      useBattleStore.getState().dogfights[0].id
    )
  })

  it('tracker hidden after dogfight ends', () => {
    useBattleStore.getState().addShip(
      makeProfile({ id: 'p1', name: 'Viper' }), { q: 0, r: 0 }, 'players', '#0f0'
    )
    useBattleStore.getState().addShip(
      makeProfile({ id: 'p2', name: 'Fighter' }), { q: 0, r: 0 }, 'npc', '#f00'
    )
    const [a, b] = useBattleStore.getState().ships
    useBattleStore.getState().startDogfight([a.id, b.id])
    const groupId = useBattleStore.getState().dogfights[0].id
    useBattleStore.getState().endDogfight(groupId)
    render(<HUD />)
    expect(screen.queryByText(/DOGFIGHT/)).not.toBeInTheDocument()
  })
})

describe('HUD — redo button', () => {
  it('redo button not rendered when redoStack is empty', () => {
    render(<HUD />)
    expect(screen.queryByRole('button', { name: /Redo last action/ })).not.toBeInTheDocument()
  })

  it('redo button rendered after undo', () => {
    useBattleStore.getState().addShip(
      { id: 'p1', name: 'Viper', hull: 10, thrust: 4, turrets: [], crew: { pilot: 2, gunner: 1 } },
      { q: 0, r: 0 }, 'players', '#0f0'
    )
    useBattleStore.getState().undoLastAction()
    render(<HUD />)
    expect(screen.getByRole('button', { name: /Redo last action/ })).toBeInTheDocument()
  })

  it('clicking redo restores undone state', () => {
    useBattleStore.getState().addShip(
      { id: 'p1', name: 'Viper', hull: 10, thrust: 4, turrets: [], crew: { pilot: 2, gunner: 1 } },
      { q: 0, r: 0 }, 'players', '#0f0'
    )
    useBattleStore.getState().undoLastAction()
    expect(useBattleStore.getState().ships).toHaveLength(0)
    render(<HUD />)
    fireEvent.click(screen.getByRole('button', { name: /Redo last action/ }))
    expect(useBattleStore.getState().ships).toHaveLength(1)
  })
})

// === REQ-13: ↺ initiative override button ====================================

describe('HUD — ↺ initiative override (REQ-13)', () => {
  it('↺ not visible in round 1 acceleration', () => {
    useBattleStore.setState({ phase: 'acceleration', round: 1 })
    render(<HUD />)
    expect(screen.queryByTitle('Re-roll initiative this round')).not.toBeInTheDocument()
  })

  it('↺ visible in round 2 acceleration', () => {
    useBattleStore.setState({ phase: 'acceleration', round: 2 })
    render(<HUD />)
    expect(screen.getByTitle('Re-roll initiative this round')).toBeInTheDocument()
  })

  it('↺ visible in round 3 acceleration', () => {
    useBattleStore.setState({ phase: 'acceleration', round: 3 })
    render(<HUD />)
    expect(screen.getByTitle('Re-roll initiative this round')).toBeInTheDocument()
  })

  it('↺ not visible outside acceleration even in round 2+', () => {
    const nonAccel = ['setup', 'initiative', 'movement', 'attack', 'actions', 'end']
    for (const phase of nonAccel) {
      useBattleStore.setState({ phase, round: 3 })
      const { unmount } = render(<HUD />)
      expect(screen.queryByTitle('Re-roll initiative this round')).not.toBeInTheDocument()
      unmount()
    }
  })

  it('clicking ↺ calls forceInitiativePhase and switches to initiative', () => {
    useBattleStore.setState({ phase: 'acceleration', round: 2 })
    render(<HUD />)
    fireEvent.click(screen.getByTitle('Re-roll initiative this round'))
    expect(useBattleStore.getState().phase).toBe('initiative')
  })
})
