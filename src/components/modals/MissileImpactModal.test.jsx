/**
 * Unit tests for MissileImpactModal — REQ-08 Point Defence at impact.
 * Verifies PD resolution moved from AttackModal to MissileImpactModal.
 * // MgT2e CRB p.173: PD resolved when salvo reaches its target, not at launch.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent }              from '@testing-library/react'
import { MissileImpactModal }                     from './MissileImpactModal.jsx'
import { useBattleStore }                         from '../../store/battleStore.js'
import { useUiStore }                             from '../../store/uiStore.js'

// roll2D6 returns total 10 → PD effect +2, removes 2 missiles.
vi.mock('../../utils/dice.js', () => ({
  rollDice: vi.fn(() => ({ results: [4, 4], total: 8 })),
  roll2D6:  vi.fn(() => ({ results: [5, 5], total: 10 })),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupImpact({
  targetTurrets      = [],
  targetFiredTurrets = [],
  faction            = 'npc',
  count              = 3,
} = {}) {
  useBattleStore.getState().addShip(
    { id: 'p-launcher', name: 'Launcher', hull: 20, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] },
    { q: 0, r: 0 }, 'players', '#0f0',
  )
  useBattleStore.getState().addShip(
    { id: 'p-target', name: 'Target', hull: 20, armor: 0, thrust: 4, tonnage: 100, turrets: targetTurrets, crew: [] },
    { q: 5, r: 0 }, faction, '#f00',
  )

  const { ships } = useBattleStore.getState()
  const [launcher, target] = ships

  if (targetFiredTurrets.length) {
    useBattleStore.setState({
      ships: ships.map((s) =>
        s.id === target.id ? { ...s, firedTurrets: targetFiredTurrets } : s,
      ),
    })
  }

  useBattleStore.setState({
    pendingMissileImpacts: [{
      id: 'imp-1',
      launchedBy:         launcher.id,
      target:             target.id,
      count,
      type:               'Missile',
      hasSmartGuidance:   false,
      ewAppliedThisRound: false,
    }],
  })

  return { launcher, target }
}

function getTarget() {
  return useBattleStore.getState().ships.find((s) => s.profile.name === 'Target')
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({ activeModal: null, modalPayload: null })
  vi.clearAllMocks()
})

// ── PD section visibility (REQ-08) ────────────────────────────────────────────

describe('MissileImpactModal — Point Defence visibility (REQ-08)', () => {
  it('PD section absent when target has no turrets', () => {
    setupImpact({ targetTurrets: [] })
    render(<MissileImpactModal />)
    expect(screen.queryByText(/Point Defence/)).not.toBeInTheDocument()
  })

  it('PD section absent when target turret has only non-laser weapons', () => {
    setupImpact({ targetTurrets: [{ slot: 1, weapons: ['Sandcaster'] }] })
    render(<MissileImpactModal />)
    expect(screen.queryByText(/Point Defence/)).not.toBeInTheDocument()
  })

  it('PD section absent when laser turret was already fired this round', () => {
    setupImpact({
      targetTurrets:      [{ slot: 1, weapons: ['Pulse Laser'] }],
      targetFiredTurrets: [1],
    })
    render(<MissileImpactModal />)
    expect(screen.queryByText(/Point Defence/)).not.toBeInTheDocument()
  })

  it('PD section visible when target has an unfired Pulse Laser', () => {
    setupImpact({ targetTurrets: [{ slot: 1, weapons: ['Pulse Laser'] }] })
    render(<MissileImpactModal />)
    expect(screen.getByText(/Point Defence/)).toBeInTheDocument()
  })

  it('PD section visible when target has an unfired Beam Laser', () => {
    setupImpact({ targetTurrets: [{ slot: 1, weapons: ['Beam Laser'] }] })
    render(<MissileImpactModal />)
    expect(screen.getByText(/Point Defence/)).toBeInTheDocument()
  })

  it('PD section absent when target has Missile Rack (not a laser)', () => {
    setupImpact({ targetTurrets: [{ slot: 1, weapons: ['Missile Rack'] }] })
    render(<MissileImpactModal />)
    expect(screen.queryByText(/Point Defence/)).not.toBeInTheDocument()
  })
})

// ── NPC vs. player PD button label ───────────────────────────────────────────

describe('MissileImpactModal — PD button label by faction', () => {
  it('NPC target shows "ROLL POINT DEFENCE" (auto-roll)', () => {
    setupImpact({ targetTurrets: [{ slot: 1, weapons: ['Pulse Laser'] }], faction: 'npc' })
    render(<MissileImpactModal />)
    expect(screen.getByRole('button', { name: /ROLL POINT DEFENCE/ })).toBeInTheDocument()
  })

  it('player target shows "CONFIRM POINT DEFENCE" (manual dice entry)', () => {
    setupImpact({ targetTurrets: [{ slot: 1, weapons: ['Pulse Laser'] }], faction: 'players' })
    render(<MissileImpactModal />)
    expect(screen.getByRole('button', { name: /CONFIRM POINT DEFENCE/ })).toBeInTheDocument()
  })

  it('"CONFIRM POINT DEFENCE" button is disabled until manual dice are entered', () => {
    setupImpact({ targetTurrets: [{ slot: 1, weapons: ['Pulse Laser'] }], faction: 'players' })
    render(<MissileImpactModal />)
    expect(screen.getByRole('button', { name: /CONFIRM POINT DEFENCE/ })).toBeDisabled()
  })
})

// ── PD roll results (NPC target — auto-roll mocked) ───────────────────────────

describe('MissileImpactModal — Point Defence roll resolution (REQ-08)', () => {
  it('rolling PD marks the turret as fired in battleStore', () => {
    setupImpact({ targetTurrets: [{ slot: 1, weapons: ['Pulse Laser'] }], faction: 'npc' })
    render(<MissileImpactModal />)
    fireEvent.click(screen.getByRole('button', { name: /ROLL POINT DEFENCE/ }))
    expect(getTarget().firedTurrets).toContain(1)
  })

  it('PD result banner appears after rolling', () => {
    setupImpact({ targetTurrets: [{ slot: 1, weapons: ['Pulse Laser'] }], faction: 'npc' })
    render(<MissileImpactModal />)
    // total 10, effect +2 → "2 missiles destroyed"
    fireEvent.click(screen.getByRole('button', { name: /ROLL POINT DEFENCE/ }))
    expect(screen.getByText(/Effect/)).toBeInTheDocument()
    expect(screen.getByText(/missiles? destroyed/)).toBeInTheDocument()
  })

  it('PD banner shows remaining missile count after interception', () => {
    // 3 missiles, PD removes 2 → 1 remaining
    setupImpact({ targetTurrets: [{ slot: 1, weapons: ['Pulse Laser'] }], faction: 'npc', count: 3 })
    render(<MissileImpactModal />)
    fireEvent.click(screen.getByRole('button', { name: /ROLL POINT DEFENCE/ }))
    expect(screen.getByText(/1 remaining/)).toBeInTheDocument()
  })

  it('dismisses impact immediately when PD destroys entire salvo', () => {
    // 2 missiles, PD removes 2 → entire salvo gone
    setupImpact({ targetTurrets: [{ slot: 1, weapons: ['Pulse Laser'] }], faction: 'npc', count: 2 })
    render(<MissileImpactModal />)
    fireEvent.click(screen.getByRole('button', { name: /ROLL POINT DEFENCE/ }))
    expect(useBattleStore.getState().pendingMissileImpacts).toHaveLength(0)
  })

  it('impact remains when PD destroys only some missiles', () => {
    // 5 missiles, PD removes 2 → 3 remaining
    setupImpact({ targetTurrets: [{ slot: 1, weapons: ['Pulse Laser'] }], faction: 'npc', count: 5 })
    render(<MissileImpactModal />)
    fireEvent.click(screen.getByRole('button', { name: /ROLL POINT DEFENCE/ }))
    expect(useBattleStore.getState().pendingMissileImpacts).toHaveLength(1)
  })

  it('used PD turret is excluded from subsequent rolls — slot buttons update', () => {
    setupImpact({
      targetTurrets: [
        { slot: 1, weapons: ['Pulse Laser'] },
        { slot: 2, weapons: ['Beam Laser'] },
      ],
      faction: 'npc',
      count: 10,  // large salvo so no auto-dismiss
    })
    render(<MissileImpactModal />)

    // Before roll: two-slot selector shows W1 and W2 buttons
    expect(screen.getByText('W1')).toBeInTheDocument()
    expect(screen.getByText('W2')).toBeInTheDocument()

    // Select slot 1 then roll
    fireEvent.click(screen.getByText('W1'))
    fireEvent.click(screen.getByRole('button', { name: /ROLL POINT DEFENCE/ }))

    // After roll: slot 1 fired; selector collapses (only 1 remaining — no multi-selector)
    expect(screen.queryByText('W1')).not.toBeInTheDocument()
    expect(screen.queryByText('W2')).not.toBeInTheDocument()
    // But a second PD roll is still possible (slot 2 auto-selected)
    expect(screen.getByRole('button', { name: /ROLL POINT DEFENCE/ })).toBeEnabled()
    // Turret 1 is fired, turret 2 is not
    expect(getTarget().firedTurrets).toEqual([1])
  })
})

// ── Multi-laser bonus ─────────────────────────────────────────────────────────

describe('MissileImpactModal — double laser bonus display', () => {
  it('shows +1 bonus label in turret selector for double Pulse Laser slot', () => {
    setupImpact({
      targetTurrets: [
        { slot: 1, weapons: ['Pulse Laser', 'Pulse Laser'] }, // laserBonus: 1
        { slot: 2, weapons: ['Beam Laser'] },                 // laserBonus: 0
      ],
      faction: 'npc',
      count: 10,
    })
    render(<MissileImpactModal />)
    // Multi-slot selector appears (2 laser turrets); slot 1 shows "+1"
    expect(screen.getByText('W1')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('shows +3 bonus label in turret selector for quad Pulse Laser slot (HG p.81)', () => {
    // laserBonus = 4 - 1 = 3 — CRB p.173: "add DM equal to the number of lasers above 1"
    setupImpact({
      targetTurrets: [
        { slot: 1, weapons: ['Pulse Laser', 'Pulse Laser', 'Pulse Laser', 'Pulse Laser'] }, // laserBonus: 3
        { slot: 2, weapons: ['Beam Laser'] },                                                // laserBonus: 0
      ],
      faction: 'npc',
      count: 10,
    })
    render(<MissileImpactModal />)
    // Multi-slot selector shows W1 with "+3"
    expect(screen.getByText('W1')).toBeInTheDocument()
    expect(screen.getByText('+3')).toBeInTheDocument()
  })
})

// ── Salvo size DM reflects PD reduction ───────────────────────────────────────

describe('MissileImpactModal — DM breakdown uses remainingCount after PD', () => {
  it('salvo size DM line shows original count before PD', () => {
    setupImpact({ targetTurrets: [], count: 4 })
    render(<MissileImpactModal />)
    // The DM breakdown shows "Salvo size (4 missiles)"
    expect(screen.getByText(/4 missiles/)).toBeInTheDocument()
  })

  it('salvo size DM line updates to remaining count after partial PD', () => {
    // 4 missiles, PD removes 2 → 2 remaining; salvo DM line should reflect 2
    setupImpact({ targetTurrets: [{ slot: 1, weapons: ['Pulse Laser'] }], count: 4, faction: 'npc' })
    render(<MissileImpactModal />)
    fireEvent.click(screen.getByRole('button', { name: /ROLL POINT DEFENCE/ }))
    // After PD: "Salvo size (2 missiles)"
    expect(screen.getByText(/2 missiles/)).toBeInTheDocument()
  })
})

// ── AttackModal — no PD section for missiles ──────────────────────────────────

describe('AttackModal — PD absent for missile weapons (REQ-08)', () => {
  it('AttackModal does not show ReactionsPanel when Missile Rack is selected', async () => {
    const { AttackModal } = await import('./AttackModal.jsx')
    useBattleStore.getState().addShip(
      { id: 'p-att', name: 'Viper', hull: 10, armor: 0, thrust: 4, tonnage: 100,
        turrets: [{ slot: 1, weapons: ['Missile Rack'] }], crew: [] },
      { q: 0, r: 0 }, 'players', '#0f0',
    )
    useBattleStore.getState().addShip(
      { id: 'p-tgt', name: 'Target', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] },
      { q: 5, r: 0 }, 'npc', '#f00',
    )
    const [att] = useBattleStore.getState().ships
    useUiStore.setState({ activeModal: 'attack', modalPayload: { shipId: att.id } })

    render(<AttackModal />)
    fireEvent.click(screen.getByText('Missile Rack'))

    // "REACTIONS" panel must not appear for missile weapons
    expect(screen.queryByText(/REACTIONS/i)).not.toBeInTheDocument()
    // "Point Defence" text must not appear
    expect(screen.queryByText(/Point Defence/i)).not.toBeInTheDocument()
  })
})
