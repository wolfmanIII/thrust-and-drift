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

// ── #26: Missile Rack salvo capped per turret instance, not full ammo pool ────

describe('AttackModal — Missile Rack salvo cap (#26)', () => {
  it('caps salvo at 1 for a single rack in a mixed triple turret, even with ample ammo', () => {
    const profile = makeRackProfile('Mixed', {
      turrets: [{ slot: 1, weapons: ['Beam Laser', 'Missile Rack', 'Sandcaster'] }],
    })
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(
      { id: 'profile-tgt', name: 'Target', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] },
      { q: 5, r: 0 }, 'npc', '#f00',
    )
    const [att] = useBattleStore.getState().ships
    useBattleStore.setState({
      ships: useBattleStore.getState().ships.map((s) => (s.id === att.id ? { ...s, missileAmmoTotal: 12 } : s)),
    })
    useUiStore.setState({ activeModal: 'attack', modalPayload: { shipId: att.id } })
    render(<AttackModal />)
    fireEvent.click(screen.getByText('Missile Rack'))
    expect(screen.getByText(/missiles in salvo.*\(1–1\)/i)).toBeInTheDocument()
    // "+" stepper must not move the count past 1
    fireEvent.click(screen.getByRole('button', { name: '+' }))
    const counts = screen.getAllByText('1')
    expect(counts.length).toBeGreaterThan(0)
    expect(screen.queryByText('2')).not.toBeInTheDocument()
  })

  it('caps salvo at rack count (3) for a homogeneous triple Missile Rack turret', () => {
    const profile = makeRackProfile('TripleRack', {
      turrets: [{ slot: 1, weapons: ['Missile Rack', 'Missile Rack', 'Missile Rack'] }],
    })
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(
      { id: 'profile-tgt', name: 'Target', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] },
      { q: 5, r: 0 }, 'npc', '#f00',
    )
    const [att] = useBattleStore.getState().ships
    useBattleStore.setState({
      ships: useBattleStore.getState().ships.map((s) => (s.id === att.id ? { ...s, missileAmmoTotal: 36 } : s)),
    })
    useUiStore.setState({ activeModal: 'attack', modalPayload: { shipId: att.id } })
    render(<AttackModal />)
    fireEvent.click(screen.getByText('Missile Rack'))
    expect(screen.getByText(/missiles in salvo.*\(1–3\)/i)).toBeInTheDocument()
    const plus = screen.getByRole('button', { name: '+' })
    fireEvent.click(plus)
    fireEvent.click(plus)
    fireEvent.click(plus) // 4th click must be a no-op — cap is 3
    expect(screen.queryByText('4')).not.toBeInTheDocument()
  })
})

// ── #28: Missile Barbette variable salvo (1–5), house-rule deviation from RAW fixed-5 ──

describe('AttackModal — Missile Barbette variable salvo (#28)', () => {
  it('defaults to a full 5-missile salvo and allows stepping down to 1', () => {
    const profile = makeRackProfile('Barbette', {
      turrets: [{ slot: 1, weapons: ['Missile Barbette'] }],
    })
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(
      { id: 'profile-tgt', name: 'Target', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] },
      { q: 5, r: 0 }, 'npc', '#f00',
    )
    useUiStore.setState({ activeModal: 'attack', modalPayload: { shipId: useBattleStore.getState().ships[0].id } })
    render(<AttackModal />)
    fireEvent.click(screen.getByText('Missile Barbette'))
    expect(screen.getByText(/missiles in salvo.*\(1–5\)/i)).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    const minus = screen.getByRole('button', { name: '−' })
    fireEvent.click(minus)
    fireEvent.click(minus)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('caps the salvo at remaining ammo when fewer than 5 missiles are left', () => {
    const profile = makeRackProfile('BarbetteLowAmmo', {
      turrets: [{ slot: 1, weapons: ['Missile Barbette'] }],
    })
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(
      { id: 'profile-tgt', name: 'Target', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] },
      { q: 5, r: 0 }, 'npc', '#f00',
    )
    const [att] = useBattleStore.getState().ships
    useBattleStore.setState({
      ships: useBattleStore.getState().ships.map((s) => (s.id === att.id ? { ...s, missileAmmoTotal: 3 } : s)),
    })
    useUiStore.setState({ activeModal: 'attack', modalPayload: { shipId: att.id } })
    render(<AttackModal />)
    fireEvent.click(screen.getByText('Missile Barbette'))
    expect(screen.getByText(/missiles in salvo.*\(1–3\)/i)).toBeInTheDocument()
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
    const plus = screen.getByRole('button', { name: '+' })
    fireEvent.click(plus) // no-op — capped at remaining ammo (3)
    expect(screen.queryByText('4')).not.toBeInTheDocument()
  })
})

// ── #29: Ion Cannon Bay must route to Power-reduction step, not Hull damage ────

describe('AttackModal — Ion Cannon Bay routes to Ion Disruption step (#29)', () => {
  it('routes a hit with Ion Cannon Bay (Small) to the Ion Disruption step, not normal Damage', () => {
    const profile = makeRackProfile('IonBayShip', {
      turrets: [{ slot: 1, weapons: ['Ion Cannon Bay (Small)'] }],
    })
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(
      { id: 'profile-tgt', name: 'Bogey', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] },
      { q: 5, r: 0 }, 'npc', '#f00',
    )
    const [att, tgt] = useBattleStore.getState().ships
    useUiStore.setState({ activeModal: 'attack', modalPayload: { shipId: att.id } })
    render(<AttackModal />)

    fireEvent.click(screen.getByText('Ion Cannon Bay (Small)'))
    fireEvent.click(screen.getByText(tgt.name))
    fireEvent.click(screen.getByText('ROLL ATTACK →'))

    // Guaranteed hit — 6+6 well above the 8+ target number.
    fireEvent.change(screen.getByLabelText('Die 1'), { target: { value: '6' } })
    fireEvent.change(screen.getByLabelText('Die 2'), { target: { value: '6' } })
    fireEvent.click(screen.getByText('CONFIRM ROLL'))
    fireEvent.click(screen.getByText('CALCULATE DAMAGE →'))

    // Must land on the Ion Disruption step (Power reduction), never normal Hull damage.
    expect(screen.getByText('Ion Disruption')).toBeInTheDocument()
    expect(screen.getByText(/no hull damage/i)).toBeInTheDocument()
    expect(screen.queryByText('Damage')).not.toBeInTheDocument()
  })
})

// ── #14: same-type weapon linking UI ──────────────────────────────────────────

describe('AttackModal — linked weapon display (#14)', () => {
  function setupLinkedTurret(turrets) {
    const profile = { id: 'profile-linked', name: 'Gunship', hull: 20, armor: 0, thrust: 4, tonnage: 100, turrets, crew: [] }
    useBattleStore.getState().addShip(profile, { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(
      { id: 'profile-tgt', name: 'Target', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] },
      { q: 5, r: 0 }, 'npc', '#f00',
    )
    const [att] = useBattleStore.getState().ships
    useUiStore.setState({ activeModal: 'attack', modalPayload: { shipId: att.id } })
    return att
  }

  beforeEach(() => {
    useBattleStore.getState().resetBattle('vectorial')
    useUiStore.setState({ activeModal: null, modalPayload: null })
  })

  it('shows ×3 badge for triple Pulse Laser turret', () => {
    setupLinkedTurret([{ slot: 1, weapons: ['Pulse Laser', 'Pulse Laser', 'Pulse Laser'] }])
    render(<AttackModal />)
    expect(screen.getByText('×3')).toBeInTheDocument()
  })

  it('shows 2D+4 dmg for triple Pulse Laser turret', () => {
    setupLinkedTurret([{ slot: 1, weapons: ['Pulse Laser', 'Pulse Laser', 'Pulse Laser'] }])
    render(<AttackModal />)
    expect(screen.getByText(/2D\+4 dmg/)).toBeInTheDocument()
  })

  it('shows ×2 badge for double Beam Laser turret', () => {
    setupLinkedTurret([{ slot: 1, weapons: ['Beam Laser', 'Beam Laser'] }])
    render(<AttackModal />)
    expect(screen.getByText('×2')).toBeInTheDocument()
  })

  it('shows 1D+1 dmg for double Beam Laser turret', () => {
    setupLinkedTurret([{ slot: 1, weapons: ['Beam Laser', 'Beam Laser'] }])
    render(<AttackModal />)
    expect(screen.getByText(/1D\+1 dmg/)).toBeInTheDocument()
  })

  it('single weapon shows no ×N badge', () => {
    setupLinkedTurret([{ slot: 1, weapons: ['Pulse Laser'] }])
    render(<AttackModal />)
    expect(screen.queryByText(/×\d/)).not.toBeInTheDocument()
  })

  it('mixed-type turret shows two separate weapon entries, no ×N badge', () => {
    setupLinkedTurret([{ slot: 1, weapons: ['Pulse Laser', 'Beam Laser'] }])
    render(<AttackModal />)
    expect(screen.getByText('Pulse Laser')).toBeInTheDocument()
    expect(screen.getByText('Beam Laser')).toBeInTheDocument()
    expect(screen.queryByText(/×\d/)).not.toBeInTheDocument()
  })
})

// ── REQ-12: destroyed ships excluded from target list ─────────────────────────

describe('AttackModal — wreck exclusion from targets (REQ-12)', () => {
  function setupWithWreck() {
    const laserProfile = {
      id: 'profile-att', name: 'Attacker',
      hull: 20, armor: 0, thrust: 4, tonnage: 100,
      turrets: [{ slot: 1, weapons: ['Beam Laser'] }],
      crew: [],
    }
    useBattleStore.getState().addShip(laserProfile,   { q: 0, r: 0 }, 'players', '#0f0')
    useBattleStore.getState().addShip(
      { id: 'profile-live', name: 'Live Target',    hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] },
      { q: 5, r: 0 }, 'npc', '#f00',
    )
    useBattleStore.getState().addShip(
      { id: 'profile-wreck', name: 'Wrecked Target', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] },
      { q: 3, r: 0 }, 'npc', '#888',
    )
    // Mark the third ship as destroyed
    const [att, , wreck] = useBattleStore.getState().ships
    useBattleStore.setState({
      ships: useBattleStore.getState().ships.map((s) =>
        s.id === wreck.id ? { ...s, isDestroyed: true, hullCurrent: 0 } : s
      ),
    })
    useUiStore.setState({ activeModal: 'attack', modalPayload: { shipId: att.id } })
  }

  beforeEach(() => {
    useBattleStore.getState().resetBattle('vectorial')
    useUiStore.setState({ activeModal: null, modalPayload: null })
  })

  it('destroyed ship does not appear in the target list', () => {
    setupWithWreck()
    render(<AttackModal />)
    expect(screen.queryByText('Wrecked Target')).not.toBeInTheDocument()
  })

  it('live ship still appears in the target list alongside a wreck', () => {
    setupWithWreck()
    render(<AttackModal />)
    expect(screen.getByText('Live Target')).toBeInTheDocument()
  })
})
