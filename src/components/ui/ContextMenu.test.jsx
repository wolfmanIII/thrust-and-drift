import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach } from 'vitest'
import { ContextMenu } from './ContextMenu.jsx'
import { useUiStore }    from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

function makeShip(overrides = {}) {
  return {
    id:             'ship-1',
    profile:        { name: 'Viper', hull: 10, turrets: [], crew: { pilot: 2 } },
    hullCurrent:    10,
    color:          '#0f0',
    faction:        'players',
    evasiveThrust:  0,
    criticalHits:   [],
    ...overrides,
  }
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({ contextMenu: null })
})

describe('ContextMenu — no context', () => {
  it('renders nothing when contextMenu is null', () => {
    const { container } = render(<ContextMenu />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('ContextMenu — ship type', () => {
  beforeEach(() => {
    useBattleStore.setState({ ships: [makeShip({ id: 'ship-1' })] })
    useUiStore.setState({
      contextMenu: { x: 50, y: 50, type: 'ship', targetId: 'ship-1' },
    })
  })

  it('shows ship name in header', () => {
    render(<ContextMenu />)
    expect(screen.getByText('Viper')).toBeInTheDocument()
  })

  it('shows hull status', () => {
    render(<ContextMenu />)
    expect(screen.getByText(/Hull 10\/10/)).toBeInTheDocument()
  })

  it('shows attack menu item during attack phase', () => {
    useBattleStore.setState({ phase: 'attack' })
    render(<ContextMenu />)
    expect(screen.getByText(/Attack/)).toBeInTheDocument()
  })

  it('hides combat actions during setup phase', () => {
    render(<ContextMenu />)  // phase = 'setup' from resetBattle
    expect(screen.queryByText(/Attack/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Apply Thrust/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Crew Action/)).not.toBeInTheDocument()
  })

  it('shows thrust items in vectorial mode during acceleration phase', () => {
    useBattleStore.setState({ combatMode: 'vectorial', phase: 'acceleration' })
    render(<ContextMenu />)
    expect(screen.getByText(/Apply Thrust/)).toBeInTheDocument()
    expect(screen.getByText(/Declare Evasion/)).toBeInTheDocument()
  })

  it('shows "Launch Missiles" when ship has Missile Rack (attack phase)', () => {
    useBattleStore.setState({
      phase: 'attack',
      ships: [makeShip({
        id: 'ship-1',
        profile: {
          name: 'Viper', hull: 10,
          turrets: [{ weapons: ['Missile Rack'] }],
          crew: { pilot: 2 },
        },
      })],
    })
    render(<ContextMenu />)
    expect(screen.getByText(/Launch Missiles/)).toBeInTheDocument()
  })

  it('hides "Launch Missiles" when ship has no Missile Rack', () => {
    useBattleStore.setState({ phase: 'attack' })
    render(<ContextMenu />)
    expect(screen.queryByText(/Launch Missiles/)).not.toBeInTheDocument()
  })

  it('hides thrust items in basic mode even during acceleration phase', () => {
    useBattleStore.setState({ combatMode: 'basic', phase: 'acceleration' })
    render(<ContextMenu />)
    expect(screen.queryByText(/Apply Thrust/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Declare Evasion/)).not.toBeInTheDocument()
  })

  it('remove option calls removeShip', () => {
    render(<ContextMenu />)
    fireEvent.click(screen.getByText(/Remove from battle/))
    expect(useBattleStore.getState().ships).toHaveLength(0)
  })
})

describe('ContextMenu — missile type', () => {
  beforeEach(() => {
    useBattleStore.setState({
      ships: [
        makeShip({ id: 'att', profile: { name: 'Attacker', hull: 10, turrets: [], crew: { pilot: 2 } } }),
        makeShip({ id: 'tgt', profile: { name: 'Target',   hull: 10, turrets: [], crew: { pilot: 2 } } }),
      ],
      missiles: [{
        id: 'missile-1', launchedBy: 'att', target: 'tgt',
        count: 3, type: 'Standard', thrustRemaining: 7,
        position: { q: 1, r: 0 }, vector: { q: 1, r: 0 },
      }],
    })
    useUiStore.setState({
      contextMenu: { x: 50, y: 50, type: 'missile', targetId: 'missile-1' },
    })
  })

  it('shows missile info', () => {
    render(<ContextMenu />)
    expect(screen.getByText(/Salvo/)).toBeInTheDocument()
    expect(screen.getByText(/Attacker/)).toBeInTheDocument()
  })

  it('remove option deletes missile', () => {
    render(<ContextMenu />)
    fireEvent.click(screen.getByText(/Remove salvo/))
    expect(useBattleStore.getState().missiles).toHaveLength(0)
  })
})

describe('ContextMenu — empty type', () => {
  beforeEach(() => {
    useUiStore.setState({
      contextMenu: { x: 50, y: 50, type: 'empty', targetId: null, hex: { q: 2, r: -1 } },
    })
  })

  it('shows add ship option', () => {
    render(<ContextMenu />)
    expect(screen.getByText(/Add ship here/)).toBeInTheDocument()
  })

  it('shows initiative roll option only during initiative phase', () => {
    useBattleStore.setState({ phase: 'initiative' })
    render(<ContextMenu />)
    expect(screen.getByText(/Roll Initiative/)).toBeInTheDocument()
  })

  it('hides initiative roll option outside initiative phase', () => {
    useBattleStore.setState({ phase: 'setup' })
    render(<ContextMenu />)
    expect(screen.queryByText(/Roll Initiative/)).not.toBeInTheDocument()
  })

  it('click Next phase calls advancePhase', () => {
    useBattleStore.setState({ phase: 'setup' })
    render(<ContextMenu />)
    fireEvent.click(screen.getByText(/Next phase/))
    expect(useBattleStore.getState().phase).toBe('initiative')
  })

  it('click Load profiles opens shipProfile modal', () => {
    render(<ContextMenu />)
    fireEvent.click(screen.getByText(/Load profiles/))
    expect(useUiStore.getState().activeModal).toBe('shipProfile')
    expect(useUiStore.getState().modalPayload).toEqual({ mode: 'import' })
  })

  it('click Save profiles opens shipProfile modal with export mode', () => {
    render(<ContextMenu />)
    fireEvent.click(screen.getByText(/Save profiles/))
    expect(useUiStore.getState().modalPayload).toEqual({ mode: 'export' })
  })
})

describe('ContextMenu — outside click closes menu', () => {
  it('clicking outside hides context menu', () => {
    useBattleStore.setState({ ships: [makeShip()] })
    useUiStore.setState({
      contextMenu: { x: 50, y: 50, type: 'ship', targetId: 'ship-1' },
    })
    render(<ContextMenu />)
    expect(screen.getByText('Viper')).toBeInTheDocument()
    fireEvent.mouseDown(document.body)
    expect(useUiStore.getState().contextMenu).toBeNull()
  })
})
