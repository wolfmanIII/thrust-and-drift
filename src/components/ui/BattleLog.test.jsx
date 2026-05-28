import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach } from 'vitest'
import { BattleLog } from './BattleLog.jsx'
import { useBattleStore } from '../../store/battleStore.js'

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
})

describe('BattleLog — empty state', () => {
  it('shows empty message when log is empty', () => {
    render(<BattleLog />)
    expect(screen.getByText('Nessun evento registrato.')).toBeInTheDocument()
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

  it('renders log entry message', () => {
    render(<BattleLog />)
    expect(screen.getByText(/Alpha aggiunta alla battaglia/)).toBeInTheDocument()
  })

  it('shows round prefix R1', () => {
    render(<BattleLog />)
    expect(screen.getByText('R1')).toBeInTheDocument()
  })

  it('shows correct count', () => {
    render(<BattleLog />)
    expect(screen.getByText('(1)')).toBeInTheDocument()
  })
})

describe('BattleLog — collapse toggle', () => {
  it('entries visible by default', () => {
    render(<BattleLog />)
    expect(screen.getByText('Nessun evento registrato.')).toBeInTheDocument()
  })

  it('entries hidden when collapsed', () => {
    render(<BattleLog />)
    fireEvent.click(screen.getByRole('button', { name: /LOG BATTAGLIA/ }))
    expect(screen.queryByText('Nessun evento registrato.')).not.toBeInTheDocument()
  })

  it('entries visible again after second click', () => {
    render(<BattleLog />)
    const btn = screen.getByRole('button', { name: /LOG BATTAGLIA/ })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.getByText('Nessun evento registrato.')).toBeInTheDocument()
  })

  it('chevron flips on collapse', () => {
    render(<BattleLog />)
    expect(screen.getByText('▼')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /LOG BATTAGLIA/ }))
    expect(screen.getByText('▲')).toBeInTheDocument()
  })
})

describe('BattleLog — clearLog', () => {
  it('CANCELLA button clears log', () => {
    useBattleStore.getState().addShip(
      { id: 'p1', name: 'Alpha', hull: 10, thrust: 2, turrets: [], crew: { pilot: 1, gunner: 0 } },
      { q: 0, r: 0 }, 'players', '#0f0'
    )
    render(<BattleLog />)
    expect(useBattleStore.getState().log).toHaveLength(1)
    fireEvent.click(screen.getByText('CANCELLA'))
    expect(useBattleStore.getState().log).toHaveLength(0)
  })

  it('shows empty state after clear', () => {
    useBattleStore.getState().addShip(
      { id: 'p1', name: 'Alpha', hull: 10, thrust: 2, turrets: [], crew: { pilot: 1, gunner: 0 } },
      { q: 0, r: 0 }, 'players', '#0f0'
    )
    render(<BattleLog />)
    fireEvent.click(screen.getByText('CANCELLA'))
    expect(screen.getByText('Nessun evento registrato.')).toBeInTheDocument()
  })
})
