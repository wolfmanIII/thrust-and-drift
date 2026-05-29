import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach } from 'vitest'
import { BattleLog } from './BattleLog.jsx'
import { useBattleStore } from '../../store/battleStore.js'

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
})

describe('BattleLog — empty state', () => {
  it('shows empty message when expanded', () => {
    render(<BattleLog />)
    fireEvent.click(screen.getByRole('button', { name: /BATTLE LOG/ }))
    expect(screen.getByText('No events recorded.')).toBeInTheDocument()
  })

  it('shows count (0) in header', () => {
    render(<BattleLog />)
    expect(screen.getByText('(0)')).toBeInTheDocument()
  })
})

describe('BattleLog — with entries', () => {
  beforeEach(() => {
    useBattleStore.getState().addShip(
      { id: 'p1', name: 'Alpha', hull: 10, thrust: 2, turrets: [], crew: { pilot: 1, gunner: 0 } },
      { q: 0, r: 0 }, 'players', '#0f0'
    )
  })

  it('renders log entry message when expanded', () => {
    render(<BattleLog />)
    fireEvent.click(screen.getByRole('button', { name: /BATTLE LOG/ }))
    expect(screen.getByText(/Alpha added to battle/)).toBeInTheDocument()
  })

  it('shows round prefix R1 when expanded', () => {
    render(<BattleLog />)
    fireEvent.click(screen.getByRole('button', { name: /BATTLE LOG/ }))
    expect(screen.getByText('R1')).toBeInTheDocument()
  })

  it('shows correct count', () => {
    render(<BattleLog />)
    expect(screen.getByText('(1)')).toBeInTheDocument()
  })
})

describe('BattleLog — collapse toggle', () => {
  it('entries hidden by default', () => {
    render(<BattleLog />)
    expect(screen.queryByText('No events recorded.')).not.toBeInTheDocument()
  })

  it('entries visible after expanding', () => {
    render(<BattleLog />)
    fireEvent.click(screen.getByRole('button', { name: /BATTLE LOG/ }))
    expect(screen.getByText('No events recorded.')).toBeInTheDocument()
  })

  it('entries hidden again after second click', () => {
    render(<BattleLog />)
    const btn = screen.getByRole('button', { name: /BATTLE LOG/ })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.queryByText('No events recorded.')).not.toBeInTheDocument()
  })

  it('chevron flips on expand', () => {
    render(<BattleLog />)
    expect(screen.getByText('▲')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /BATTLE LOG/ }))
    expect(screen.getByText('▼')).toBeInTheDocument()
  })
})

describe('BattleLog — clearLog', () => {
  it('CLEAR button clears log', () => {
    useBattleStore.getState().addShip(
      { id: 'p1', name: 'Alpha', hull: 10, thrust: 2, turrets: [], crew: { pilot: 1, gunner: 0 } },
      { q: 0, r: 0 }, 'players', '#0f0'
    )
    render(<BattleLog />)
    expect(useBattleStore.getState().log).toHaveLength(1)
    fireEvent.click(screen.getByText('CLEAR'))
    expect(useBattleStore.getState().log).toHaveLength(0)
  })

  it('shows empty state after clear', () => {
    useBattleStore.getState().addShip(
      { id: 'p1', name: 'Alpha', hull: 10, thrust: 2, turrets: [], crew: { pilot: 1, gunner: 0 } },
      { q: 0, r: 0 }, 'players', '#0f0'
    )
    render(<BattleLog />)
    fireEvent.click(screen.getByRole('button', { name: /BATTLE LOG/ }))
    fireEvent.click(screen.getByText('CLEAR'))
    expect(screen.getByText('No events recorded.')).toBeInTheDocument()
  })
})
