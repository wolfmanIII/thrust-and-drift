/**
 * Tests for PhaseTracker — click ship name → requestCenterOn (REQ-04).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhaseTracker } from './PhaseTracker.jsx'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore } from '../../store/uiStore.js'

const SHIP_A = {
  id: 'ship-a',
  profile: { name: 'Cobra', hull: 20, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] },
  faction: 'players', hullCurrent: 20, color: '#0f0',
  position: { q: 2, r: -1 },
  initiative: 8,
  firedTurrets: [], evasiveThrust: 0, criticalHits: [], thrustUsedThisRound: 0,
}

const SHIP_B = {
  id: 'ship-b',
  profile: { name: 'Viper', hull: 10, armor: 0, thrust: 6, tonnage: 50, turrets: [], crew: [] },
  faction: 'npc', hullCurrent: 10, color: '#f00',
  position: { q: -3, r: 4 },
  initiative: 5,
  firedTurrets: [], evasiveThrust: 0, criticalHits: [], thrustUsedThisRound: 0,
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useBattleStore.setState({
    ships: [SHIP_A, SHIP_B],
    initiativeOrder: ['ship-a', 'ship-b'],
    currentActorIndex: 0,
    phase: 'attack',
  })
})

const SHIP_UNROLLED = {
  id: 'ship-c',
  profile: { name: 'Scout', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] },
  faction: 'npc', hullCurrent: 10, color: '#ff0',
  position: { q: 0, r: 0 },
  initiative: 0,
  firedTurrets: [], evasiveThrust: 0, criticalHits: [], thrustUsedThisRound: 0,
}

describe('PhaseTracker — mid-battle ship initiative display (#18)', () => {
  it('shows numeric initiative for ships that have rolled', () => {
    useBattleStore.setState({
      ships: [SHIP_A, SHIP_B],
      initiativeOrder: ['ship-a', 'ship-b'],
      shipAddedThisRound: false,
    })
    render(<PhaseTracker />)
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows — instead of 0 for a ship with initiative not yet rolled', () => {
    useBattleStore.setState({
      ships: [SHIP_A, SHIP_UNROLLED],
      initiativeOrder: ['ship-a', 'ship-c'],
      shipAddedThisRound: true,
    })
    render(<PhaseTracker />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('shows ↺ re-roll notice when shipAddedThisRound is true', () => {
    useBattleStore.setState({
      ships: [SHIP_A, SHIP_UNROLLED],
      initiativeOrder: ['ship-a', 'ship-c'],
      shipAddedThisRound: true,
    })
    render(<PhaseTracker />)
    expect(screen.getByText(/↺ re-roll next round/)).toBeInTheDocument()
  })

  it('does not show ↺ notice when shipAddedThisRound is false', () => {
    useBattleStore.setState({
      ships: [SHIP_A, SHIP_B],
      initiativeOrder: ['ship-a', 'ship-b'],
      shipAddedThisRound: false,
    })
    render(<PhaseTracker />)
    expect(screen.queryByText(/↺ re-roll next round/)).not.toBeInTheDocument()
  })
})

describe('PhaseTracker — centre map on click (REQ-04)', () => {
  it('renders ship names as clickable buttons', () => {
    render(<PhaseTracker />)
    expect(screen.getByRole('button', { name: 'Cobra' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Viper' })).toBeInTheDocument()
  })

  it('calls requestCenterOn with the correct hex position when a ship name is clicked', () => {
    const requestCenterOn = vi.fn()
    useUiStore.setState({ requestCenterOn })
    render(<PhaseTracker />)
    fireEvent.click(screen.getByRole('button', { name: 'Cobra' }))
    expect(requestCenterOn).toHaveBeenCalledWith({ q: 2, r: -1 })
  })

  it('calls requestCenterOn with the correct position for the second ship', () => {
    const requestCenterOn = vi.fn()
    useUiStore.setState({ requestCenterOn })
    render(<PhaseTracker />)
    fireEvent.click(screen.getByRole('button', { name: 'Viper' }))
    expect(requestCenterOn).toHaveBeenCalledWith({ q: -3, r: 4 })
  })

  it('highlights the current actor ship name with cyan text', () => {
    render(<PhaseTracker />)
    const cobraBtn = screen.getByRole('button', { name: 'Cobra' })
    expect(cobraBtn.className).toMatch(/neon-cyan/)
  })
})
