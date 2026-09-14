/**
 * Unit tests for AddShipModal — REQ-01 initial vector override.
 * Verifies Δq/Δr inputs appear in vectorial mode and the vector is
 * forwarded to addShip (direct hex) or startPlacement (map-click flow).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent }         from '@testing-library/react'
import { AddShipModal }                      from './AddShipModal.jsx'
import { useBattleStore }                    from '../../store/battleStore.js'
import { useUiStore }                        from '../../store/uiStore.js'

// === Helpers ==================================================================

/** Reset stores and open AddShipModal in vectorial mode. */
function openVectorial({ hex = null } = {}) {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({
    activeModal: 'addShip',
    modalPayload: hex ? { hex } : null,
    pendingPlacement: null,
  })
}

/** Reset stores and open AddShipModal in basic mode. */
function openBasic({ hex = null } = {}) {
  useBattleStore.getState().resetBattle('basic')
  useUiStore.setState({
    activeModal: 'addShip',
    modalPayload: hex ? { hex } : null,
    pendingPlacement: null,
  })
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({ activeModal: null, modalPayload: null, pendingPlacement: null })
})

// === REQ-01: Δq/Δr input presence ===========================================

describe('AddShipModal — initial vector inputs (REQ-01)', () => {
  it('shows Δq and Δr inputs in vectorial mode', () => {
    openVectorial()
    render(<AddShipModal />)
    expect(screen.getByLabelText('Initial vector Δq')).toBeInTheDocument()
    expect(screen.getByLabelText('Initial vector Δr')).toBeInTheDocument()
  })

  it('does NOT show Δq/Δr inputs in basic mode', () => {
    openBasic()
    render(<AddShipModal />)
    expect(screen.queryByLabelText('Initial vector Δq')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Initial vector Δr')).not.toBeInTheDocument()
  })

  it('inputs default to 0', () => {
    openVectorial()
    render(<AddShipModal />)
    expect(screen.getByLabelText('Initial vector Δq')).toHaveValue(0)
    expect(screen.getByLabelText('Initial vector Δr')).toHaveValue(0)
  })

  it('changing Δq input updates displayed value', () => {
    openVectorial()
    render(<AddShipModal />)
    const qInput = screen.getByLabelText('Initial vector Δq')
    fireEvent.change(qInput, { target: { value: '5' } })
    expect(qInput).toHaveValue(5)
  })

  it('changing Δr input updates displayed value', () => {
    openVectorial()
    render(<AddShipModal />)
    const rInput = screen.getByLabelText('Initial vector Δr')
    fireEvent.change(rInput, { target: { value: '-3' } })
    expect(rInput).toHaveValue(-3)
  })
})

// === REQ-01: vector forwarded on direct-hex placement ========================

describe('AddShipModal — vector forwarded to addShip via direct hex', () => {
  it('ship placed on direct hex has vector {q:0,r:0} when inputs are 0', () => {
    openVectorial({ hex: { q: 2, r: 1 } })
    render(<AddShipModal />)
    // profilesStore already loaded with DEFAULT_PROFILES — first entry auto-selected
    fireEvent.click(screen.getByText('PLACE SHIP'))
    const ship = useBattleStore.getState().ships[0]
    expect(ship).toBeDefined()
    expect(ship.vector).toEqual({ q: 0, r: 0 })
  })

  it('ship placed on direct hex uses Δq/Δr from inputs', () => {
    openVectorial({ hex: { q: 0, r: 0 } })
    render(<AddShipModal />)
    fireEvent.change(screen.getByLabelText('Initial vector Δq'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Initial vector Δr'), { target: { value: '-2' } })
    fireEvent.click(screen.getByText('PLACE SHIP'))
    const ship = useBattleStore.getState().ships[0]
    expect(ship.vector).toEqual({ q: 4, r: -2 })
  })

  it('negative Δq and Δr are accepted', () => {
    openVectorial({ hex: { q: 0, r: 0 } })
    render(<AddShipModal />)
    fireEvent.change(screen.getByLabelText('Initial vector Δq'), { target: { value: '-3' } })
    fireEvent.change(screen.getByLabelText('Initial vector Δr'), { target: { value: '-3' } })
    fireEvent.click(screen.getByText('PLACE SHIP'))
    expect(useBattleStore.getState().ships[0].vector).toEqual({ q: -3, r: -3 })
  })
})

// === REQ-01: vector forwarded to pendingPlacement (map-click flow) ===========

describe('AddShipModal — vector forwarded via startPlacement', () => {
  it('pendingPlacement carries vector {q:0,r:0} when inputs are default', () => {
    openVectorial()
    render(<AddShipModal />)
    fireEvent.click(screen.getByText('SELECT HEX ON MAP →'))
    expect(useUiStore.getState().pendingPlacement?.vector).toEqual({ q: 0, r: 0 })
  })

  it('pendingPlacement carries set vector values', () => {
    openVectorial()
    render(<AddShipModal />)
    fireEvent.change(screen.getByLabelText('Initial vector Δq'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Initial vector Δr'), { target: { value: '1' } })
    fireEvent.click(screen.getByText('SELECT HEX ON MAP →'))
    expect(useUiStore.getState().pendingPlacement?.vector).toEqual({ q: 2, r: 1 })
  })

  it('pendingPlacement carries negative vector', () => {
    openVectorial()
    render(<AddShipModal />)
    fireEvent.change(screen.getByLabelText('Initial vector Δq'), { target: { value: '-5' } })
    fireEvent.change(screen.getByLabelText('Initial vector Δr'), { target: { value: '0' } })
    fireEvent.click(screen.getByText('SELECT HEX ON MAP →'))
    expect(useUiStore.getState().pendingPlacement?.vector).toEqual({ q: -5, r: 0 })
  })
})
