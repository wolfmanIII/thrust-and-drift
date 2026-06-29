/**
 * Unit tests for RenameShipModal (REQ-03).
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RenameShipModal } from './RenameShipModal.jsx'
import { useUiStore }    from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

const SHIP = {
  id: 'ship-cobra',
  name: 'Cobra',
  profile: { name: 'Cobra', hull: 20, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [] },
  faction: 'players',
  hullCurrent: 20,
  color: '#0f0',
  firedTurrets: [],
  evasiveThrust: 0,
  criticalHits: [],
  thrustUsedThisRound: 0,
  aidGunnersDM: 0,
  usedCrewMembers: [],
  crewAssignments: null,
  isDestroyed: false,
  inDogfight: null,
  inBoarding: null,
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useBattleStore.setState({ ships: [SHIP] })
  useUiStore.setState({ activeModal: 'renameShip', modalPayload: { shipId: 'ship-cobra' } })
})

describe('RenameShipModal — REQ-03', () => {
  it('pre-fills the input with the current ship name', () => {
    render(<RenameShipModal />)
    expect(screen.getByRole('textbox')).toHaveValue('Cobra')
  })

  it('shows the profile name as a reference label', () => {
    render(<RenameShipModal />)
    expect(screen.getByText('Cobra', { selector: 'span' })).toBeInTheDocument()
  })

  it('RENAME button is initially enabled (non-empty default)', () => {
    render(<RenameShipModal />)
    expect(screen.getByRole('button', { name: 'RENAME' })).not.toBeDisabled()
  })

  it('RENAME button disables when input is cleared', () => {
    render(<RenameShipModal />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } })
    expect(screen.getByRole('button', { name: 'RENAME' })).toBeDisabled()
  })

  it('RENAME button disables when input is only whitespace', () => {
    render(<RenameShipModal />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: 'RENAME' })).toBeDisabled()
  })

  it('clicking RENAME calls renameShip with the new name', () => {
    const renameShip = vi.fn()
    useBattleStore.setState({ renameShip })
    render(<RenameShipModal />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Cobra Prime' } })
    fireEvent.click(screen.getByRole('button', { name: 'RENAME' }))
    expect(renameShip).toHaveBeenCalledWith('ship-cobra', 'Cobra Prime')
  })

  it('clicking RENAME calls closeModal', () => {
    const closeModal = vi.fn()
    useUiStore.setState({ closeModal })
    render(<RenameShipModal />)
    fireEvent.click(screen.getByRole('button', { name: 'RENAME' }))
    expect(closeModal).toHaveBeenCalled()
  })

  it('pressing Enter confirms rename', () => {
    const renameShip = vi.fn()
    useBattleStore.setState({ renameShip })
    render(<RenameShipModal />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Cobra Mk.II' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(renameShip).toHaveBeenCalledWith('ship-cobra', 'Cobra Mk.II')
  })

  it('pressing Escape closes without renaming', () => {
    const renameShip = vi.fn()
    const closeModal = vi.fn()
    useBattleStore.setState({ renameShip })
    useUiStore.setState({ closeModal })
    render(<RenameShipModal />)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    expect(renameShip).not.toHaveBeenCalled()
    expect(closeModal).toHaveBeenCalled()
  })

  it('clicking CANCEL closes without renaming', () => {
    const renameShip = vi.fn()
    const closeModal = vi.fn()
    useBattleStore.setState({ renameShip })
    useUiStore.setState({ closeModal })
    render(<RenameShipModal />)
    fireEvent.click(screen.getByRole('button', { name: 'CANCEL' }))
    expect(renameShip).not.toHaveBeenCalled()
    expect(closeModal).toHaveBeenCalled()
  })

  it('trims whitespace before calling renameShip', () => {
    const renameShip = vi.fn()
    useBattleStore.setState({ renameShip })
    render(<RenameShipModal />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Cobra II  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'RENAME' }))
    expect(renameShip).toHaveBeenCalledWith('ship-cobra', 'Cobra II')
  })

  it('renders nothing when ship not found', () => {
    useUiStore.setState({ modalPayload: { shipId: 'does-not-exist' } })
    const { container } = render(<RenameShipModal />)
    expect(container).toBeEmptyDOMElement()
  })

  it('instance name renamed to custom label (store read-through)', () => {
    // Verify that a ship already given a custom name pre-fills that name, not profile.name
    useBattleStore.setState({
      ships: [{ ...SHIP, name: 'Fighter 1' }],
    })
    render(<RenameShipModal />)
    expect(screen.getByRole('textbox')).toHaveValue('Fighter 1')
  })
})
