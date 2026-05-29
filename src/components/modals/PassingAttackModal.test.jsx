/**
 * Tests for PassingAttackModal — passing encounter window.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PassingAttackModal } from './PassingAttackModal.jsx'
import { useBattleStore }     from '../../store/battleStore.js'
import { useUiStore }         from '../../store/uiStore.js'

function addShipToStore(name, faction, q, r, color = '#fff') {
  useBattleStore.getState().addShip(
    { id: `profile-${name}`, name, hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] },
    { q, r },
    faction,
    color,
  )
}

/**
 * Inject a passing encounter using the indices of ships already in the store.
 * Uses actual instance IDs so the modal can resolve ship objects.
 */
function injectEncounterByIndex(indexA, indexB, minDistance = 1) {
  const { ships } = useBattleStore.getState()
  const encounter = { id: 'enc-1', shipAId: ships[indexA].id, shipBId: ships[indexB].id, minDistance }
  useBattleStore.setState({ passingEncounters: [encounter] })
  return encounter
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({ activeModal: null, modalPayload: null })
})

describe('PassingAttackModal — guard', () => {
  it('renders null when no encounters', () => {
    const { container } = render(<PassingAttackModal />)
    expect(container.firstChild).toBeNull()
  })

  it('auto-dismisses stale encounter (ship no longer in store)', () => {
    useBattleStore.setState({
      passingEncounters: [{ id: 'enc-x', shipAId: 'ghost-1', shipBId: 'ghost-2', minDistance: 1 }],
    })
    const { container } = render(<PassingAttackModal />)
    expect(container.firstChild).toBeNull()
    expect(useBattleStore.getState().passingEncounters).toHaveLength(0)
  })
})

describe('PassingAttackModal — display', () => {
  it('shows both ship names', () => {
    addShipToStore('Viper', 'players', 0, 0)
    addShipToStore('Fighter', 'npc', 5, 0)
    injectEncounterByIndex(0, 1, 2)
    render(<PassingAttackModal />)
    expect(screen.getAllByText(/Viper/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Fighter/i).length).toBeGreaterThan(0)
  })

  it('shows closest approach distance and range band', () => {
    addShipToStore('Viper', 'players', 0, 0)
    addShipToStore('Fighter', 'npc', 5, 0)
    injectEncounterByIndex(0, 1, 2)
    render(<PassingAttackModal />)
    expect(screen.getByText(/2 HEXES/i)).toBeInTheDocument()
    expect(screen.getByText('SHORT')).toBeInTheDocument()
  })

  it('shows "ADJACENT" label when minDistance is 0', () => {
    addShipToStore('Viper', 'players', 0, 0)
    addShipToStore('Fighter', 'npc', 5, 0)
    injectEncounterByIndex(0, 1, 0)
    render(<PassingAttackModal />)
    // "ADJACENT" appears in both the distance display and the range band label
    expect(screen.getAllByText('ADJACENT').length).toBeGreaterThanOrEqual(1)
  })

  it('shows pending count when multiple encounters exist', () => {
    addShipToStore('Viper', 'players', 0, 0)
    addShipToStore('Fighter', 'npc', 5, 0)
    const { ships } = useBattleStore.getState()
    useBattleStore.setState({
      passingEncounters: [
        { id: 'e1', shipAId: ships[0].id, shipBId: ships[1].id, minDistance: 1 },
        { id: 'e2', shipAId: ships[0].id, shipBId: ships[1].id, minDistance: 2 },
      ],
    })
    render(<PassingAttackModal />)
    expect(screen.getByText(/2 PENDING/)).toBeInTheDocument()
  })
})

describe('PassingAttackModal — actions', () => {
  it('PASS dismisses the encounter', () => {
    addShipToStore('Viper', 'players', 0, 0)
    addShipToStore('Fighter', 'npc', 5, 0)
    injectEncounterByIndex(0, 1, 1)
    render(<PassingAttackModal />)
    fireEvent.click(screen.getByText(/PASS — LET THEM GO/))
    expect(useBattleStore.getState().passingEncounters).toHaveLength(0)
  })

  it('FIRES button dismisses encounter and opens attack modal', () => {
    addShipToStore('Viper', 'players', 0, 0, '#0f0')
    addShipToStore('Fighter', 'npc', 5, 0, '#f00')
    injectEncounterByIndex(0, 1, 1)
    render(<PassingAttackModal />)
    const fireButton = screen.getAllByText(/FIRES/)[0]
    fireEvent.click(fireButton)
    expect(useBattleStore.getState().passingEncounters).toHaveLength(0)
    expect(useUiStore.getState().activeModal).toBe('attack')
  })
})
