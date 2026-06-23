/**
 * Tests for PlaceObstacleModal — two-step obstacle placement/edit modal.
 * // Obstacles System Design §6.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent }             from '@testing-library/react'
import { PlaceObstacleModal }  from './PlaceObstacleModal.jsx'
import { useBattleStore }      from '../../store/battleStore.js'
import { useUiStore }          from '../../store/uiStore.js'

function setupModal(payload = { hex: { q: 3, r: -1 } }) {
  useUiStore.setState({ activeModal: 'placeObstacle', modalPayload: payload })
  useBattleStore.getState().toggleObstaclesEnabled()
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({ activeModal: null, modalPayload: null })
})

// === Step 1 — type selection ===

describe('PlaceObstacleModal — step 1 (type selection)', () => {
  it('renders four type buttons', () => {
    setupModal()
    render(<PlaceObstacleModal />)
    expect(screen.getByText(/Asteroid Field/i)).toBeInTheDocument()
    expect(screen.getByText(/Debris Field/i)).toBeInTheDocument()
    expect(screen.getByText(/Gravity Well/i)).toBeInTheDocument()
    expect(screen.getByText(/Nebula/i)).toBeInTheDocument()
  })

  it('shows the type descriptions', () => {
    setupModal()
    render(<PlaceObstacleModal />)
    expect(screen.getByText(/Impassable zone/i)).toBeInTheDocument()
    expect(screen.getByText(/No sensor lock/i)).toBeInTheDocument()
  })

  it('clicking a type advances to step 2 (config)', () => {
    setupModal()
    render(<PlaceObstacleModal />)
    fireEvent.click(screen.getByText(/Asteroid Field/i))
    // Step 2 shows the RADIUS slider label
    expect(screen.getByText('RADIUS')).toBeInTheDocument()
  })
})

// === Step 2 — config (asteroid_field) ===

describe('PlaceObstacleModal — step 2 asteroid_field', () => {
  it('shows density buttons only for asteroid_field', () => {
    setupModal()
    render(<PlaceObstacleModal />)
    fireEvent.click(screen.getByText(/Asteroid Field/i))
    expect(screen.getByText('LIGHT')).toBeInTheDocument()
    expect(screen.getByText('DENSE')).toBeInTheDocument()
  })

  it('shows the target hex coordinates', () => {
    setupModal({ hex: { q: 3, r: -1 } })
    render(<PlaceObstacleModal />)
    fireEvent.click(screen.getByText(/Asteroid Field/i))
    expect(screen.getByText('(3, -1)')).toBeInTheDocument()
  })

  it('PLACE button calls addObstacle with correct fields', () => {
    setupModal({ hex: { q: 2, r: 0 } })
    render(<PlaceObstacleModal />)
    fireEvent.click(screen.getByText(/Asteroid Field/i))
    // Default radius for asteroid_field = 1 (RADIUS_RANGE[0])
    fireEvent.click(screen.getByRole('button', { name: /PLACE/i }))
    const obs = useBattleStore.getState().obstacles
    expect(obs).toHaveLength(1)
    expect(obs[0].type).toBe('asteroid_field')
    expect(obs[0].position).toEqual({ q: 2, r: 0 })
    expect(obs[0].density).toBe('light')
  })

  it('CANCEL button closes the modal without adding obstacle', () => {
    const closeMock = vi.fn()
    useUiStore.setState({ closeModal: closeMock })
    setupModal()
    render(<PlaceObstacleModal />)
    fireEvent.click(screen.getByText(/Asteroid Field/i))
    fireEvent.click(screen.getByRole('button', { name: /CANCEL/i }))
    expect(useBattleStore.getState().obstacles).toHaveLength(0)
  })

  it('← back button returns to type step', () => {
    setupModal()
    render(<PlaceObstacleModal />)
    fireEvent.click(screen.getByText(/Asteroid Field/i))
    // Back button text includes the type icon + label
    fireEvent.click(screen.getByText(/🪨/))
    // We're back on step 1 — type buttons visible again
    expect(screen.getByText(/Debris Field/i)).toBeInTheDocument()
  })
})

// === Step 2 — gravity_well: no density ===

describe('PlaceObstacleModal — gravity_well config', () => {
  it('does not show density buttons for gravity_well', () => {
    setupModal()
    render(<PlaceObstacleModal />)
    fireEvent.click(screen.getByText(/Gravity Well/i))
    expect(screen.queryByText('LIGHT')).toBeNull()
    expect(screen.queryByText('DENSE')).toBeNull()
  })

  it('gravity_well minimum radius is 2', () => {
    setupModal()
    render(<PlaceObstacleModal />)
    fireEvent.click(screen.getByText(/Gravity Well/i))
    // The range slider min attr should be 2
    const slider = screen.getByRole('slider')
    expect(slider.getAttribute('min')).toBe('2')
  })

  it('PLACE button creates gravity_well without density field', () => {
    setupModal({ hex: { q: 5, r: 0 } })
    render(<PlaceObstacleModal />)
    fireEvent.click(screen.getByText(/Gravity Well/i))
    fireEvent.click(screen.getByRole('button', { name: /PLACE/i }))
    const obs = useBattleStore.getState().obstacles[0]
    expect(obs.type).toBe('gravity_well')
    expect(obs.density).toBeUndefined()
  })
})

// === Edit mode ===

describe('PlaceObstacleModal — edit mode', () => {
  it('shows SAVE button instead of PLACE when editing', () => {
    const existingObstacle = {
      id: 'obs-1',
      type: 'nebula',
      position: { q: 4, r: 0 },
      radius: 3,
    }
    useBattleStore.setState({ obstacles: [existingObstacle] })
    useUiStore.setState({
      activeModal: 'placeObstacle',
      modalPayload: { hex: { q: 4, r: 0 }, obstacle: existingObstacle },
    })
    render(<PlaceObstacleModal />)
    // Edit mode still opens on step 1 (type selection) — click the type to advance to config
    fireEvent.click(screen.getByText(/Nebula/i))
    // Now in step 2 config: SAVE visible (not PLACE)
    expect(screen.getByRole('button', { name: /SAVE/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /PLACE/i })).toBeNull()
  })

  it('SAVE calls updateObstacle with patched fields', () => {
    const existingObstacle = {
      id: 'obs-edit',
      type: 'asteroid_field',
      position: { q: 1, r: 0 },
      radius: 1,
      density: 'light',
    }
    useBattleStore.setState({ obstacles: [existingObstacle] })
    useUiStore.setState({
      activeModal: 'placeObstacle',
      modalPayload: { hex: { q: 1, r: 0 }, obstacle: existingObstacle },
    })
    render(<PlaceObstacleModal />)
    // Navigate to step 2 by clicking the type button, then change density
    fireEvent.click(screen.getByText(/Asteroid Field/i))
    fireEvent.click(screen.getByText('DENSE'))
    fireEvent.click(screen.getByRole('button', { name: /SAVE/i }))
    const obs = useBattleStore.getState().obstacles[0]
    expect(obs.density).toBe('dense')
  })
})

// === nebula radius range ===

describe('PlaceObstacleModal — nebula radius', () => {
  it('nebula minimum radius is 3', () => {
    setupModal()
    render(<PlaceObstacleModal />)
    fireEvent.click(screen.getByText(/Nebula/i))
    const slider = screen.getByRole('slider')
    expect(slider.getAttribute('min')).toBe('3')
    expect(slider.getAttribute('max')).toBe('8')
  })
})
