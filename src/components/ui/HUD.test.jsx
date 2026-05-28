import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, vi } from 'vitest'
import { HUD } from './HUD.jsx'
import { useBattleStore } from '../../store/battleStore.js'

vi.mock('../ui/Tooltip.jsx', () => ({
  Tooltip: ({ children }) => children,
}))

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
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
      ['initiative',   'INIZIATIVA'],
      ['acceleration', 'ACCELERAZIONE'],
      ['movement',     'MOVIMENTO'],
      ['attack',       'ATTACCO'],
      ['actions',      'AZIONI'],
      ['end',          'FINE ROUND'],
    ]
    for (const [phase, label] of cases) {
      useBattleStore.setState({ phase })
      const { unmount } = render(<HUD />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    }
  })
})

describe('HUD — FASE SUCCESSIVA button', () => {
  it('visible in vectorial mode during movement phase', () => {
    useBattleStore.setState({ combatMode: 'vectorial', phase: 'movement' })
    render(<HUD />)
    expect(screen.getByText(/FASE SUCCESSIVA/)).toBeInTheDocument()
  })

  it('hidden in basic mode during movement phase', () => {
    useBattleStore.setState({ combatMode: 'basic', phase: 'movement' })
    render(<HUD />)
    expect(screen.queryByText(/FASE SUCCESSIVA/)).not.toBeInTheDocument()
  })

  it('visible in basic mode outside movement phase', () => {
    useBattleStore.setState({ combatMode: 'basic', phase: 'attack' })
    render(<HUD />)
    expect(screen.getByText(/FASE SUCCESSIVA/)).toBeInTheDocument()
  })

  it('click calls advancePhase', () => {
    useBattleStore.setState({ combatMode: 'vectorial', phase: 'setup' })
    render(<HUD />)
    fireEvent.click(screen.getByText(/FASE SUCCESSIVA/))
    expect(useBattleStore.getState().phase).toBe('initiative')
  })
})

describe('HUD — current actor', () => {
  it('actor panel hidden when phase has no actor control', () => {
    useBattleStore.setState({ phase: 'setup', initiativeOrder: [] })
    render(<HUD />)
    expect(screen.queryByText(/rimasti/)).not.toBeInTheDocument()
  })

  it('shows actor name and AVANTI button during attack phase', () => {
    useBattleStore.getState().addShip(
      { id: 'p1', name: 'Viper', hull: 10, thrust: 4, turrets: [], crew: { pilot: 2, gunner: 1 } },
      { q: 0, r: 0 }, 'players', '#0f0'
    )
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.setState({ phase: 'attack', initiativeOrder: [id], currentActorIndex: 0 })
    render(<HUD />)
    expect(screen.getByText('Viper')).toBeInTheDocument()
    expect(screen.getByText('AVANTI →')).toBeInTheDocument()
  })

  it('AVANTI click increments actor index', () => {
    useBattleStore.getState().addShip(
      { id: 'p1', name: 'Viper', hull: 10, thrust: 4, turrets: [], crew: { pilot: 2, gunner: 1 } },
      { q: 0, r: 0 }, 'players', '#0f0'
    )
    const { id } = useBattleStore.getState().ships[0]
    useBattleStore.setState({ phase: 'attack', initiativeOrder: [id], currentActorIndex: 0 })
    render(<HUD />)
    fireEvent.click(screen.getByText('AVANTI →'))
    expect(useBattleStore.getState().currentActorIndex).toBe(1)
  })
})
