/**
 * Tests for DogfightNotificationModal — intent collection and pursuit check flow.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DogfightNotificationModal } from './DogfightNotificationModal.jsx'
import { useBattleStore } from '../../store/battleStore.js'

function makeProfile(overrides = {}) {
  return {
    id: 'p1', name: 'Viper', hull: 10, thrust: 4,
    tonnage: 100, turrets: [], crew: { pilot: 2 },
    ...overrides,
  }
}

/** Add two hostile ships and return a groups array ready for the modal. */
function setupTwoShips() {
  useBattleStore.getState().addShip(
    makeProfile({ id: 'p1', name: 'Viper', thrust: 6 }),
    { q: 0, r: 0 }, 'players', '#0f0'
  )
  useBattleStore.getState().addShip(
    makeProfile({ id: 'p2', name: 'Far Trader', thrust: 2 }),
    { q: 0, r: 0 }, 'npc', '#f00'
  )
  const [a, b] = useBattleStore.getState().ships
  return { a, b, groups: [{ shipIds: [a.id, b.id] }] }
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
})

describe('DogfightNotificationModal — render', () => {
  it('shows both ship names', () => {
    const { groups } = setupTwoShips()
    render(<DogfightNotificationModal groups={groups} onDone={() => {}} />)
    expect(screen.getAllByText(/Viper/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Far Trader/).length).toBeGreaterThan(0)
  })

  it('VERIFICA button disabled until all ships have an intent', () => {
    const { groups } = setupTwoShips()
    render(<DogfightNotificationModal groups={groups} onDone={() => {}} />)
    expect(screen.getByText(/VERIFICA INTENZIONI/)).toBeDisabled()
  })

  it('VERIFICA enabled once all ships have an intent', () => {
    const { groups } = setupTwoShips()
    render(<DogfightNotificationModal groups={groups} onDone={() => {}} />)
    const [siA, siB] = screen.getAllByText('SÌ')
    fireEvent.click(siA)
    fireEvent.click(siB)
    expect(screen.getByText(/VERIFICA INTENZIONI/)).not.toBeDisabled()
  })
})

describe('DogfightNotificationModal — all YES → dogfight', () => {
  it('shows DOGFIGHT ATTIVO outcome', () => {
    const { groups } = setupTwoShips()
    render(<DogfightNotificationModal groups={groups} onDone={() => {}} />)
    const [siA, siB] = screen.getAllByText('SÌ')
    fireEvent.click(siA)
    fireEvent.click(siB)
    fireEvent.click(screen.getByText(/VERIFICA INTENZIONI/))
    expect(screen.getByText(/DOGFIGHT ATTIVO/)).toBeInTheDocument()
  })

  it('calls startDogfight on confirm', () => {
    const { groups } = setupTwoShips()
    render(<DogfightNotificationModal groups={groups} onDone={() => {}} />)
    const [siA, siB] = screen.getAllByText('SÌ')
    fireEvent.click(siA)
    fireEvent.click(siB)
    fireEvent.click(screen.getByText(/VERIFICA INTENZIONI/))
    fireEvent.click(screen.getByText(/CONFERMA/))
    expect(useBattleStore.getState().dogfights).toHaveLength(1)
    expect(useBattleStore.getState().dogfights[0].active).toBe(true)
  })

  it('calls onDone after confirm', () => {
    const onDone = vi.fn()
    const { groups } = setupTwoShips()
    render(<DogfightNotificationModal groups={groups} onDone={onDone} />)
    const [siA, siB] = screen.getAllByText('SÌ')
    fireEvent.click(siA)
    fireEvent.click(siB)
    fireEvent.click(screen.getByText(/VERIFICA INTENZIONI/))
    fireEvent.click(screen.getByText(/CONFERMA/))
    expect(onDone).toHaveBeenCalledOnce()
  })
})

describe('DogfightNotificationModal — all NO → short range', () => {
  it('shows SHORT RANGE outcome', () => {
    const { groups } = setupTwoShips()
    render(<DogfightNotificationModal groups={groups} onDone={() => {}} />)
    const [noA, noB] = screen.getAllByText('NO')
    fireEvent.click(noA)
    fireEvent.click(noB)
    fireEvent.click(screen.getByText(/VERIFICA INTENZIONI/))
    expect(screen.getByText(/SHORT RANGE/)).toBeInTheDocument()
  })

  it('does NOT call startDogfight on confirm', () => {
    const onDone = vi.fn()
    const { groups } = setupTwoShips()
    render(<DogfightNotificationModal groups={groups} onDone={onDone} />)
    const [noA, noB] = screen.getAllByText('NO')
    fireEvent.click(noA)
    fireEvent.click(noB)
    fireEvent.click(screen.getByText(/VERIFICA INTENZIONI/))
    fireEvent.click(screen.getByText(/CONFERMA/))
    expect(useBattleStore.getState().dogfights).toHaveLength(0)
    expect(onDone).toHaveBeenCalledOnce()
  })
})

describe('DogfightNotificationModal — mixed intent → pursuit check', () => {
  it('shows pursuit check section', () => {
    const { groups } = setupTwoShips()
    render(<DogfightNotificationModal groups={groups} onDone={() => {}} />)
    const [siA] = screen.getAllByText('SÌ')
    const [, noB] = screen.getAllByText('NO')
    fireEvent.click(siA)
    fireEvent.click(noB)
    fireEvent.click(screen.getByText(/VERIFICA INTENZIONI/))
    expect(screen.getByText(/check inseguimento/i)).toBeInTheDocument()
    expect(screen.getByText(/Inseguitore/)).toBeInTheDocument()
    expect(screen.getByText(/Fuggitivo/)).toBeInTheDocument()
  })
})

describe('DogfightNotificationModal — safety guards', () => {
  it('renders null when groups is empty (e.g. after undo)', () => {
    const { container } = render(<DogfightNotificationModal groups={[]} onDone={() => {}} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('DogfightNotificationModal — multiple groups', () => {
  it('shows group counter in title for multiple groups', () => {
    const { a, b } = setupTwoShips()
    const groups = [
      { shipIds: [a.id, b.id] },
      { shipIds: [a.id, b.id] },
    ]
    render(<DogfightNotificationModal groups={groups} onDone={() => {}} />)
    expect(screen.getByText(/1\/2/)).toBeInTheDocument()
  })
})
