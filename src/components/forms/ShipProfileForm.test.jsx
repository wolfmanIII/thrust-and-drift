/**
 * Unit tests for ShipProfileForm — quad turret cap + label (#17 HG p.81).
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ShipProfileForm } from './ShipProfileForm.jsx'
import { useProfilesStore } from '../../store/profilesStore.js'

beforeEach(() => {
  useProfilesStore.setState({ profiles: [] })
})

function renderForm() {
  render(<ShipProfileForm onSave={vi.fn()} onCancel={vi.fn()} />)
}

/** Click the weapon-slot "+ Add" button (second of two in the form). */
function clickAddSlot() {
  // Crew Manifest "+ Add" is index 0; Weapons "+ Add" is index 1.
  const adds = screen.getAllByRole('button', { name: '+ Add' })
  fireEvent.click(adds[adds.length - 1])
}

/** Fire the add-weapon select for a single weapon (targets the last/newest slot). */
function addWeapon(name = 'Pulse Laser') {
  const selects = screen.getAllByRole('combobox')
  fireEvent.change(selects[selects.length - 1], { target: { value: name } })
}

describe('ShipProfileForm — quad turret (#17 HG p.81)', () => {
  it('empty slot shows — label', () => {
    renderForm()
    clickAddSlot()
    // '—' is the first entry in TURRET_TYPE_LABELS
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('SINGLE label after 1 weapon', () => {
    renderForm()
    clickAddSlot()
    addWeapon()
    expect(screen.getByText('SINGLE')).toBeInTheDocument()
  })

  it('DOUBLE label after 2 weapons', () => {
    renderForm()
    clickAddSlot()
    addWeapon(); addWeapon()
    expect(screen.getByText('DOUBLE')).toBeInTheDocument()
  })

  it('TRIPLE label after 3 weapons', () => {
    renderForm()
    clickAddSlot()
    addWeapon(); addWeapon(); addWeapon()
    expect(screen.getByText('TRIPLE')).toBeInTheDocument()
  })

  it('QUAD label after 4 weapons', () => {
    renderForm()
    clickAddSlot()
    addWeapon(); addWeapon(); addWeapon(); addWeapon()
    expect(screen.getByText('QUAD')).toBeInTheDocument()
  })

  it('add-weapon dropdown still visible with 3 weapons (not yet maxed)', () => {
    renderForm()
    clickAddSlot()
    addWeapon(); addWeapon(); addWeapon()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('add-weapon dropdown hidden after 4th weapon', () => {
    renderForm()
    clickAddSlot()
    addWeapon(); addWeapon(); addWeapon(); addWeapon()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('"QUAD — max 4" message shown when slot is full', () => {
    renderForm()
    clickAddSlot()
    addWeapon(); addWeapon(); addWeapon(); addWeapon()
    expect(screen.getByText('QUAD — max 4')).toBeInTheDocument()
  })

  it('no "max 3 weapons" text (old cap removed)', () => {
    renderForm()
    clickAddSlot()
    addWeapon(); addWeapon(); addWeapon()
    expect(screen.queryByText(/max 3/i)).not.toBeInTheDocument()
  })
})

// HG p.30–31: barbette and bay weapons are standalone hardpoints — each is its
// own mount, cannot combine with anything else. Quad Turret (HG p.81) is a
// turret-only mechanic and does not apply to fixed-mount weapons like Torpedo.
describe('ShipProfileForm — fixed-mount weapons are single-slot (HG p.30–31, p.81)', () => {
  it('BARBETTE label after adding a Torpedo', () => {
    renderForm()
    clickAddSlot()
    addWeapon('Torpedo')
    expect(screen.getByText('BARBETTE')).toBeInTheDocument()
  })

  it('add-weapon dropdown hidden after a single Torpedo', () => {
    renderForm()
    clickAddSlot()
    addWeapon('Torpedo')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('"BARBETTE — single mount" message shown after a Torpedo', () => {
    renderForm()
    clickAddSlot()
    addWeapon('Torpedo')
    expect(screen.getByText('BARBETTE — single mount')).toBeInTheDocument()
  })

  it('BAY label after adding an Ion Cannon Bay (Small)', () => {
    renderForm()
    clickAddSlot()
    addWeapon('Ion Cannon Bay (Small)')
    expect(screen.getByText('BAY')).toBeInTheDocument()
  })

  it('a second Torpedo cannot be added to a slot already holding one (state-level guard)', () => {
    renderForm()
    clickAddSlot()
    addWeapon('Torpedo')
    // Dropdown is gone, but addWeapon() is guarded independently of the UI.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('turret-mount weapon dropdown does not offer barbette/bay weapons once a turret weapon is present', () => {
    renderForm()
    clickAddSlot()
    addWeapon('Pulse Laser')
    const select = screen.getByRole('combobox')
    const optionValues = Array.from(select.querySelectorAll('option')).map((o) => o.value)
    expect(optionValues).not.toContain('Torpedo')
    expect(optionValues).not.toContain('Ion Cannon Bay (Small)')
    expect(optionValues).toContain('Beam Laser')
  })
})

// CRB p.183 — 1 Hardpoint per full 100 tons (Firmpoints under 100t).
// HG p.31 — Large Bay costs 5 Hardpoints. Only new slot additions are
// blocked; existing profiles that predate this rule are never retroactively
// invalidated.
describe('ShipProfileForm — Hardpoint budget (CRB p.183, HG p.31)', () => {
  it('shows 0/1 at default 100-ton tonnage with no weapons', () => {
    renderForm()
    expect(screen.getByText('HARDPOINTS 0/1')).toBeInTheDocument()
  })

  it('shows 1/1 after filling the only Hardpoint on a 100-ton hull', () => {
    renderForm()
    clickAddSlot()
    addWeapon('Pulse Laser')
    expect(screen.getByText('HARDPOINTS 1/1')).toBeInTheDocument()
  })

  it('blocks a 2nd weapon slot once the 100-ton hull budget (1) is used', () => {
    renderForm()
    clickAddSlot()
    addWeapon('Pulse Laser')
    clickAddSlot()
    addWeapon('Beam Laser')
    expect(screen.getByText(/Hardpoint budget exceeded/i)).toBeInTheDocument()
    // Rejected — budget stays at 1/1, second slot never received a weapon.
    expect(screen.getByText('HARDPOINTS 1/1')).toBeInTheDocument()
  })

  it('allows a 2nd weapon slot once tonnage is raised to cover the budget', () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('TONNAGE'), { target: { value: '200' } })
    clickAddSlot()
    addWeapon('Pulse Laser')
    clickAddSlot()
    addWeapon('Beam Laser')
    expect(screen.queryByText(/Hardpoint budget exceeded/i)).not.toBeInTheDocument()
    expect(screen.getByText('HARDPOINTS 2/2')).toBeInTheDocument()
  })

  it('a Large Bay consumes 5 Hardpoints, blocked on a 100-ton hull', () => {
    renderForm()
    clickAddSlot()
    addWeapon('Ion Cannon Bay (Large)')
    expect(screen.getByText(/Hardpoint budget exceeded/i)).toBeInTheDocument()
    expect(screen.getByText('HARDPOINTS 0/1')).toBeInTheDocument()
  })

  it('a small craft under 35 tons still gets 1 Firmpoint (not 0)', () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('TONNAGE'), { target: { value: '10' } })
    expect(screen.getByText('HARDPOINTS 0/1')).toBeInTheDocument()
    clickAddSlot()
    addWeapon('Pulse Laser')
    expect(screen.getByText('HARDPOINTS 1/1')).toBeInTheDocument()
  })
})

describe('ShipProfileForm — weapon override editor (#21 iteration 1)', () => {
  it('opens the editor with the base weapon name as placeholder', () => {
    renderForm()
    clickAddSlot()
    addWeapon('Pulse Laser')
    fireEvent.click(screen.getByRole('button', { name: 'Customize Pulse Laser' }))
    expect(screen.getByText('Override — Pulse Laser')).toBeInTheDocument()
    expect(screen.getByLabelText('Custom name')).toHaveAttribute('placeholder', 'Pulse Laser')
  })

  it('a custom name updates the weapon chip and shows the active marker', () => {
    renderForm()
    clickAddSlot()
    addWeapon('Pulse Laser')
    fireEvent.click(screen.getByRole('button', { name: 'Customize Pulse Laser' }))
    fireEvent.change(screen.getByLabelText('Custom name'), { target: { value: 'Old Federation Laser' } })
    expect(screen.getByText('Old Federation Laser')).toBeInTheDocument()
    expect(screen.getByTitle('Custom override active')).toBeInTheDocument()
  })

  it('persists label/damageDice overrides to the saved profile, keyed by weapon index', () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('NAME *'), { target: { value: 'Test Ship' } })
    clickAddSlot()
    addWeapon('Pulse Laser')
    fireEvent.click(screen.getByRole('button', { name: 'Customize Pulse Laser' }))
    fireEvent.change(screen.getByLabelText('Custom name'), { target: { value: 'Old Federation Laser' } })
    fireEvent.change(screen.getByLabelText('Damage dice'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: '+ CREATE PROFILE' }))
    const saved = useProfilesStore.getState().profiles[0]
    expect(saved.turrets[0].weaponOverrides).toEqual({ 0: { label: 'Old Federation Laser', damageDice: 3 } })
  })

  it('clearing every override field drops the sparse entry entirely', () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('NAME *'), { target: { value: 'Test Ship' } })
    clickAddSlot()
    addWeapon('Pulse Laser')
    fireEvent.click(screen.getByRole('button', { name: 'Customize Pulse Laser' }))
    fireEvent.change(screen.getByLabelText('Custom name'), { target: { value: 'Old Federation Laser' } })
    fireEvent.change(screen.getByLabelText('Custom name'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: '+ CREATE PROFILE' }))
    const saved = useProfilesStore.getState().profiles[0]
    expect(saved.turrets[0].weaponOverrides).toBeUndefined()
  })

  it('warns that the override is inactive when the same weapon appears twice in the slot (CRB p.168)', () => {
    renderForm()
    clickAddSlot()
    addWeapon('Pulse Laser')
    addWeapon('Pulse Laser')
    const gearButtons = screen.getAllByRole('button', { name: 'Customize Pulse Laser' })
    fireEvent.click(gearButtons[0])
    expect(screen.getByText(/Inactive — another Pulse Laser shares this slot/)).toBeInTheDocument()
  })

  it('reindexes an override when an earlier weapon in the same slot is removed', () => {
    renderForm()
    clickAddSlot()
    addWeapon('Pulse Laser')
    addWeapon('Beam Laser')
    fireEvent.click(screen.getByRole('button', { name: 'Customize Beam Laser' }))
    fireEvent.change(screen.getByLabelText('Custom name'), { target: { value: 'Refit Beam Laser' } })
    expect(screen.getByText('Refit Beam Laser')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Pulse Laser' }))
    expect(screen.getByText('Refit Beam Laser')).toBeInTheDocument()
  })

  it('loads an existing override when editing a saved profile', () => {
    useProfilesStore.setState({
      profiles: [{
        id: 'p1',
        name: 'Old Ship',
        tonnage: 100,
        turrets: [{ slot: 1, weapons: ['Pulse Laser'], weaponOverrides: { 0: { label: 'Rusty Laser', notes: 'Salvaged' } } }],
      }],
    })
    render(<ShipProfileForm profileId="p1" onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Rusty Laser')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Customize Pulse Laser' }))
    expect(screen.getByLabelText('Custom name')).toHaveValue('Rusty Laser')
    expect(screen.getByLabelText('GM notes')).toHaveValue('Salvaged')
  })
})
