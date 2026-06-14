/**
 * Tests for AttackModal — missile rack ammo tracking.
 * Covers the TDZ regression (ammoLeft declared after attacker) and UI display.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent }         from '@testing-library/react'
import { AttackModal }   from './AttackModal.jsx'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore }     from '../../store/uiStore.js'

function makeRackProfile(name, overrides = {}) {
  return {
    id:       `profile-${name}`,
    name,
    hull:     10,
    armor:    0,
    thrust:   4,
    tonnage:  100,
    turrets:  [{ slot: 1, weapons: ['Missile Rack'] }],
    crew:     [],  // empty → crewAssignments: null → no gunner gate
    ...overrides,
  }
}

function setupAttack(attackerAmmo = undefined) {
  useBattleStore.getState().addShip(makeRackProfile('Viper'), { q: 0, r: 0 }, 'players', '#0f0')
  useBattleStore.getState().addShip(
    { id: 'profile-tgt', name: 'Target', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] },
    { q: 5, r: 0 }, 'npc', '#f00',
  )
  const [att] = useBattleStore.getState().ships
  if (attackerAmmo !== undefined) {
    useBattleStore.setState({
      ships: useBattleStore.getState().ships.map((s) =>
        s.id === att.id ? { ...s, missileAmmoTotal: attackerAmmo } : s
      ),
    })
  }
  useUiStore.setState({ activeModal: 'attack', modalPayload: { shipId: att.id } })
  return att
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({ activeModal: null, modalPayload: null })
})

describe('AttackModal — missile rack', () => {
  it('renders without crashing when Missile Rack weapon is selected (TDZ regression)', () => {
    setupAttack()
    render(<AttackModal />)
    fireEvent.click(screen.getByText('Missile Rack'))
    // Component must still be mounted — any missile-specific text confirms no crash
    expect(screen.getByText(/missiles in salvo/i)).toBeInTheDocument()
  })

  it('shows remaining ammo count next to stepper', () => {
    setupAttack(12)
    render(<AttackModal />)
    fireEvent.click(screen.getByText('Missile Rack'))
    expect(screen.getByText(/Ammo:/i)).toBeInTheDocument()
    // The ammo value "12" should appear somewhere in the stepper label
    expect(screen.getAllByText('12').length).toBeGreaterThan(0)
  })

  it('shows ⚠ NO AMMO and disables launch button when magazine is empty', () => {
    setupAttack(0)
    render(<AttackModal />)
    fireEvent.click(screen.getByText('Missile Rack'))
    expect(screen.getByText(/NO AMMO/)).toBeInTheDocument()
    const launchBtn = screen.getByRole('button', { name: /NO AMMO/ })
    expect(launchBtn).toBeDisabled()
  })

  it('initialises missileAmmoTotal to rack count × 12 on addShip', () => {
    const profile = makeRackProfile('Gunship', {
      turrets: [
        { slot: 1, weapons: ['Missile Rack'] },
        { slot: 2, weapons: ['Missile Rack'] },
      ],
    })
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#fff')
    const ship = useBattleStore.getState().ships[0]
    expect(ship.missileAmmoTotal).toBe(24)
  })
})
