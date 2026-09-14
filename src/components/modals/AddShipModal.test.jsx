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
import { useProfilesStore }                  from '../../store/profilesStore.js'

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

// === #38: default token shape auto-suggested from tonnage ====================

describe('AddShipModal — auto-suggested token shape by tonnage (#38)', () => {
  function selectProfileByTonnage(name, tonnage) {
    useProfilesStore.getState().addProfile({
      name, hull: 10, thrust: 4, tonnage, turrets: [], crew: {},
    })
    openVectorial()
    render(<AddShipModal />)
    fireEvent.click(screen.getByText(name))
  }

  it('defaults to Needle for a fighter-class hull (<100t)', () => {
    selectProfileByTonnage('Interceptor-38a', 50)
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'Token shape — auto-selected by tonnage, click to override')).toBeInTheDocument()
    const needleBtn = screen.getByText('Needle').closest('button')
    expect(needleBtn.className).toMatch(/border-\(--neon-cyan\)/)
  })

  it('defaults to Delta for a small hull (<1000t)', () => {
    selectProfileByTonnage('Courier-38b', 200)
    const deltaBtn = screen.getByText('Delta').closest('button')
    expect(deltaBtn.className).toMatch(/border-\(--neon-cyan\)/)
  })

  it('defaults to Gunship for a mid hull (<2000t)', () => {
    selectProfileByTonnage('Frigate-38c', 1500)
    const gunshipBtn = screen.getByText('Gunship').closest('button')
    expect(gunshipBtn.className).toMatch(/border-\(--neon-cyan\)/)
  })

  it('defaults to Cruiser for a large hull (<6000t)', () => {
    selectProfileByTonnage('Cruiser-38d', 4000)
    const cruiserBtn = screen.getByText('Cruiser').closest('button')
    expect(cruiserBtn.className).toMatch(/border-\(--neon-cyan\)/)
  })

  it('defaults to Capital for a very large hull (6000t+)', () => {
    selectProfileByTonnage('Dreadnought-38e', 8000)
    const capitalBtn = screen.getByText('Capital').closest('button')
    expect(capitalBtn.className).toMatch(/border-\(--neon-cyan\)/)
  })

  it('manual pick overrides the auto default, and hint disappears', () => {
    selectProfileByTonnage('Courier-38f', 200)
    fireEvent.click(screen.getByText('Capital'))
    const capitalBtn = screen.getByText('Capital').closest('button')
    expect(capitalBtn.className).toMatch(/border-\(--neon-cyan\)/)
    expect(screen.queryByText((_, el) => el?.tagName === 'P' && el.textContent === 'Token shape — auto-selected by tonnage, click to override')).not.toBeInTheDocument()
  })

  it('switching profile clears the manual override back to auto', () => {
    useProfilesStore.getState().addProfile({ name: 'SmallA-38g', hull: 10, thrust: 4, tonnage: 200, turrets: [], crew: {} })
    useProfilesStore.getState().addProfile({ name: 'BigB-38h',   hull: 10, thrust: 4, tonnage: 8000, turrets: [], crew: {} })
    openVectorial()
    render(<AddShipModal />)
    fireEvent.click(screen.getByText('SmallA-38g'))
    fireEvent.click(screen.getByText('Needle')) // manual override, differs from SmallA's auto (Delta)
    fireEvent.click(screen.getByText('BigB-38h')) // switch profile — auto for 8000t is Capital
    const capitalBtn = screen.getByText('Capital').closest('button')
    const needleBtn  = screen.getByText('Needle').closest('button')
    expect(capitalBtn.className).toMatch(/border-\(--neon-cyan\)/)
    expect(needleBtn.className).not.toMatch(/border-\(--neon-cyan\)/)
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'Token shape — auto-selected by tonnage, click to override')).toBeInTheDocument()
  })

  it('confirmed placement carries the auto-suggested shape into the ship profile', () => {
    useProfilesStore.getState().addProfile({
      name: 'Dreadnought-38i', hull: 10, thrust: 4, tonnage: 8000, turrets: [], crew: {},
    })
    openVectorial({ hex: { q: 0, r: 0 } })
    render(<AddShipModal />)
    fireEvent.click(screen.getByText('Dreadnought-38i'))
    fireEvent.click(screen.getByText('NPC'))
    fireEvent.click(screen.getByText('PLACE SHIP'))
    expect(useBattleStore.getState().ships[0].profile.tokenShape).toBe('capital')
  })
})
