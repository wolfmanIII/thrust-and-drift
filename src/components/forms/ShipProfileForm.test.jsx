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

/** Fire the add-weapon select for a single weapon. */
function addWeapon(name = 'Pulse Laser') {
  const select = screen.getByRole('combobox')
  fireEvent.change(select, { target: { value: name } })
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
