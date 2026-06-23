/**
 * Tests for ObstacleCollisionModal — field collision pilot check resolution.
 * // Obstacles System Design §3.1–3.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent }             from '@testing-library/react'
import { ObstacleCollisionModal } from './ObstacleCollisionModal.jsx'
import { useBattleStore }         from '../../store/battleStore.js'

function makeShip(overrides = {}) {
  return {
    id:        'profile-s1',
    name:      'Test Ship',
    hull:      10,
    armor:     0,
    thrust:    4,
    tonnage:   100,
    turrets:   [],
    crew:      [],
    ...overrides,
  }
}

function injectCollision(obstacle, shipIdOverride) {
  const ship = useBattleStore.getState().ships[0]
  const shipId = shipIdOverride ?? ship?.id ?? 's1'
  useBattleStore.setState({
    pendingObstacleCollisions: [{
      id: 'col-1',
      shipId,
      shipName: 'Test Ship',
      obstacle,
      position: { q: 1, r: 0 },
    }],
  })
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
})

// === Guard: no event ===

describe('ObstacleCollisionModal — guard', () => {
  it('renders null when no pending collisions', () => {
    const { container } = render(<ObstacleCollisionModal />)
    expect(container.firstChild).toBeNull()
  })

  it('auto-dismisses and renders null when ship no longer in store (undo support)', () => {
    useBattleStore.setState({
      pendingObstacleCollisions: [{
        id: 'col-ghost',
        shipId: 'ship-removed',
        shipName: 'Ghost',
        obstacle: { type: 'asteroid_field', density: 'light' },
        position: { q: 0, r: 0 },
      }],
    })
    const { container } = render(<ObstacleCollisionModal />)
    expect(container.firstChild).toBeNull()
    expect(useBattleStore.getState().pendingObstacleCollisions).toHaveLength(0)
  })
})

// === Pilot check step ===

describe('ObstacleCollisionModal — pilot check display', () => {
  it('shows ship name and FIELD COLLISION header', () => {
    useBattleStore.getState().addShip(makeShip(), { q: 0, r: 0 }, 'players', '#fff')
    injectCollision({ type: 'asteroid_field', density: 'light' })
    render(<ObstacleCollisionModal />)
    expect(screen.getByText(/FIELD COLLISION/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Test Ship/i).length).toBeGreaterThan(0)
  })

  it('shows Average (8+) difficulty for light asteroid field', () => {
    useBattleStore.getState().addShip(makeShip(), { q: 0, r: 0 }, 'players', '#fff')
    injectCollision({ type: 'asteroid_field', density: 'light' })
    render(<ObstacleCollisionModal />)
    expect(screen.getByText('Average (8+)')).toBeInTheDocument()
  })

  it('shows Difficult (10+) difficulty for dense asteroid field', () => {
    useBattleStore.getState().addShip(makeShip(), { q: 0, r: 0 }, 'players', '#fff')
    injectCollision({ type: 'asteroid_field', density: 'dense' })
    render(<ObstacleCollisionModal />)
    expect(screen.getByText('Difficult (10+)')).toBeInTheDocument()
  })

  it('shows Difficult (10+) difficulty for debris_field', () => {
    useBattleStore.getState().addShip(makeShip(), { q: 0, r: 0 }, 'players', '#fff')
    injectCollision({ type: 'debris_field' })
    render(<ObstacleCollisionModal />)
    expect(screen.getByText('Difficult (10+)')).toBeInTheDocument()
  })

  it('shows ship Armor value', () => {
    useBattleStore.getState().addShip(makeShip({ armor: 4 }), { q: 0, r: 0 }, 'players', '#fff')
    injectCollision({ type: 'asteroid_field', density: 'light' })
    render(<ObstacleCollisionModal />)
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('PILOT SUCCESS — dismisses the event', () => {
    useBattleStore.getState().addShip(makeShip(), { q: 0, r: 0 }, 'players', '#fff')
    injectCollision({ type: 'asteroid_field', density: 'light' })
    render(<ObstacleCollisionModal />)
    fireEvent.click(screen.getByRole('button', { name: /PILOT SUCCESS/i }))
    expect(useBattleStore.getState().pendingObstacleCollisions).toHaveLength(0)
  })
})

// === Damage step ===

describe('ObstacleCollisionModal — damage resolution', () => {
  it('PILOT FAILED advances to damage step', () => {
    useBattleStore.getState().addShip(makeShip(), { q: 0, r: 0 }, 'players', '#fff')
    injectCollision({ type: 'asteroid_field', density: 'light' })
    render(<ObstacleCollisionModal />)
    fireEvent.click(screen.getByRole('button', { name: /PILOT FAILED/i }))
    expect(screen.getByText(/FIELD COLLISION — DAMAGE/i)).toBeInTheDocument()
  })

  it('damage step shows correct dice label for light field (1D6)', () => {
    useBattleStore.getState().addShip(makeShip(), { q: 0, r: 0 }, 'players', '#fff')
    injectCollision({ type: 'asteroid_field', density: 'light' })
    render(<ObstacleCollisionModal />)
    fireEvent.click(screen.getByRole('button', { name: /PILOT FAILED/i }))
    // "Roll (1D6)" is the breakdown row label — unique text for light field
    expect(screen.getByText('Roll (1D6)')).toBeInTheDocument()
  })

  it('damage step shows 2D6 for dense field', () => {
    useBattleStore.getState().addShip(makeShip(), { q: 0, r: 0 }, 'players', '#fff')
    injectCollision({ type: 'asteroid_field', density: 'dense' })
    render(<ObstacleCollisionModal />)
    fireEvent.click(screen.getByRole('button', { name: /PILOT FAILED/i }))
    expect(screen.getByText('Roll (2D6)')).toBeInTheDocument()
  })

  it('APPLY DAMAGE button is disabled when no roll entered', () => {
    useBattleStore.getState().addShip(makeShip(), { q: 0, r: 0 }, 'players', '#fff')
    injectCollision({ type: 'asteroid_field', density: 'light' })
    render(<ObstacleCollisionModal />)
    fireEvent.click(screen.getByRole('button', { name: /PILOT FAILED/i }))
    const applyBtn = screen.getByRole('button', { name: /APPLY/i })
    expect(applyBtn).toBeDisabled()
  })

  it('entering roll value enables APPLY DAMAGE and shows net damage', () => {
    useBattleStore.getState().addShip(makeShip({ armor: 2 }), { q: 0, r: 0 }, 'players', '#fff')
    injectCollision({ type: 'asteroid_field', density: 'light' })
    render(<ObstacleCollisionModal />)
    fireEvent.click(screen.getByRole('button', { name: /PILOT FAILED/i }))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '5' } })
    // Net = max(0, 5−2) = 3
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /APPLY 3 DAMAGE/i })).not.toBeDisabled()
  })

  it('APPLY DAMAGE applies damage and dismisses event', () => {
    // Use hull=100 so damage=4 (4%) stays below 10% threshold — no crit cascade.
    useBattleStore.getState().addShip(makeShip({ hull: 100, armor: 0 }), { q: 0, r: 0 }, 'players', '#fff')
    injectCollision({ type: 'asteroid_field', density: 'light' })
    render(<ObstacleCollisionModal />)
    fireEvent.click(screen.getByRole('button', { name: /PILOT FAILED/i }))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: /APPLY 4 DAMAGE/i }))
    // Event dismissed
    expect(useBattleStore.getState().pendingObstacleCollisions).toHaveLength(0)
    // Hull reduced by 4 (armor 0), no threshold crits below 10%
    expect(useBattleStore.getState().ships[0].hullCurrent).toBe(96)
  })

  it('armor cannot make net damage negative (clamped to 0)', () => {
    useBattleStore.getState().addShip(makeShip({ hull: 10, armor: 10 }), { q: 0, r: 0 }, 'players', '#fff')
    injectCollision({ type: 'asteroid_field', density: 'light' })
    render(<ObstacleCollisionModal />)
    fireEvent.click(screen.getByRole('button', { name: /PILOT FAILED/i }))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '3' } })
    // Net = max(0, 3−10) = 0
    expect(screen.getByRole('button', { name: /APPLY 0 DAMAGE/i })).toBeInTheDocument()
  })

  it('← BACK button returns to check step', () => {
    useBattleStore.getState().addShip(makeShip(), { q: 0, r: 0 }, 'players', '#fff')
    injectCollision({ type: 'debris_field' })
    render(<ObstacleCollisionModal />)
    fireEvent.click(screen.getByRole('button', { name: /PILOT FAILED/i }))
    fireEvent.click(screen.getByRole('button', { name: /BACK TO CHECK/i }))
    expect(screen.getByRole('button', { name: /PILOT SUCCESS/i })).toBeInTheDocument()
  })

  it('shows pending count when multiple collisions queued', () => {
    useBattleStore.getState().addShip(makeShip(), { q: 0, r: 0 }, 'players', '#fff')
    const shipId = useBattleStore.getState().ships[0].id
    useBattleStore.setState({
      pendingObstacleCollisions: [
        { id: 'c1', shipId, shipName: 'Test Ship', obstacle: { type: 'asteroid_field', density: 'light' }, position: { q: 0, r: 0 } },
        { id: 'c2', shipId, shipName: 'Test Ship', obstacle: { type: 'debris_field' },                     position: { q: 1, r: 0 } },
      ],
    })
    render(<ObstacleCollisionModal />)
    expect(screen.getByText(/2 PENDING/i)).toBeInTheDocument()
  })
})
