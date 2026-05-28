import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, vi } from 'vitest'
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

  it('shows attack menu item', () => {
    render(<ContextMenu />)
    expect(screen.getByText(/Attacca/)).toBeInTheDocument()
  })

  it('shows thrust items in vectorial mode', () => {
    useBattleStore.setState({ combatMode: 'vectorial' })
    render(<ContextMenu />)
    expect(screen.getByText(/Applica Thrust/)).toBeInTheDocument()
    expect(screen.getByText(/Dichiara Evasione/)).toBeInTheDocument()
  })

  it('shows "Lancia Missili" when ship has Missile Rack', () => {
    useBattleStore.setState({
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
    expect(screen.getByText(/Lancia Missili/)).toBeInTheDocument()
  })

  it('hides "Lancia Missili" when ship has no Missile Rack', () => {
    render(<ContextMenu />)
    expect(screen.queryByText(/Lancia Missili/)).not.toBeInTheDocument()
  })

  it('hides thrust items in basic mode', () => {
    useBattleStore.setState({ combatMode: 'basic' })
    render(<ContextMenu />)
    expect(screen.queryByText(/Applica Thrust/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Dichiara Evasione/)).not.toBeInTheDocument()
  })

  it('remove option calls removeShip', () => {
    render(<ContextMenu />)
    fireEvent.click(screen.getByText(/Rimuovi dalla battaglia/))
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
    fireEvent.click(screen.getByText(/Rimuovi salvo/))
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
    expect(screen.getByText(/Aggiungi nave qui/)).toBeInTheDocument()
  })

  it('shows initiative roll option', () => {
    render(<ContextMenu />)
    expect(screen.getByText(/Tira iniziativa/)).toBeInTheDocument()
  })

  it('click Fase successiva calls advancePhase', () => {
    useBattleStore.setState({ phase: 'setup' })
    render(<ContextMenu />)
    fireEvent.click(screen.getByText(/Fase successiva/))
    expect(useBattleStore.getState().phase).toBe('initiative')
  })

  it('click Carica profili opens shipProfile modal', () => {
    render(<ContextMenu />)
    fireEvent.click(screen.getByText(/Carica profili/))
    expect(useUiStore.getState().activeModal).toBe('shipProfile')
    expect(useUiStore.getState().modalPayload).toEqual({ mode: 'import' })
  })

  it('click Salva profili opens shipProfile modal with export mode', () => {
    render(<ContextMenu />)
    fireEvent.click(screen.getByText(/Salva profili/))
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
