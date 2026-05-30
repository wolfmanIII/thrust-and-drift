import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { ActionModal } from './ActionModal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

const SHIP = {
  id: 'ship-1',
  profile: {
    name: 'SDB', hull: 30, armor: 5, thrust: 6,
    turrets: [{ slot: 1, weapons: ['Beam Laser'] }],
    crew: [
      { id: 'crew-1', name: 'Gunner', skills: { gunner: 4 } },
      { id: 'crew-2', name: 'Captain', skills: { captain: 2 } },
    ],
  },
  faction: 'npc',
  hullCurrent: 30,
  color: '#f00',
  firedTurrets: [],
  evasiveThrust: 0,
  criticalHits: [],
  thrustUsedThisRound: 0,
}

describe('ActionModal', () => {
  beforeEach(() => {
    useBattleStore.getState().resetBattle('vectorial')
    useBattleStore.setState({ ships: [SHIP] })
    useUiStore.setState({ activeModal: 'action', modalPayload: { shipId: 'ship-1' } })
  })

  it('selecting Gunner shows reload_turret action', () => {
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Gunner'))
    expect(screen.getByText(/Reload Turret/)).toBeInTheDocument()
  })

  it('selecting Gunner then Reload Turret enables execute button', () => {
    render(<ActionModal />)
    fireEvent.click(screen.getByText('Gunner'))
    fireEvent.click(screen.getByText(/Reload Turret/))
    const btn = screen.getByText(/EXECUTE ACTION/i)
    expect(btn).not.toBeDisabled()
  })
})
