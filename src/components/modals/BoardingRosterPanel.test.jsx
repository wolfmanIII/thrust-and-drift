/**
 * Tests for BoardingRosterPanel (rendered through BoardingContactModal).
 * // MgT2e CRB p.77, p.92–93, p.100; HG p.132; Traveller Companion pp.6–7
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { BoardingContactModal } from './BoardingContactModal.jsx'
import { useBattleStore }       from '../../store/battleStore.js'
import { useUiStore }           from '../../store/uiStore.js'

function makeProfile(overrides = {}) {
  return { id: 'p', name: 'Ship', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [], ...overrides }
}

function setupBoarding() {
  useBattleStore.getState().addShip(makeProfile({ id: 'pa', name: 'Viper' }), { q: 0, r: 0 }, 'players', '#0f0')
  useBattleStore.getState().addShip(makeProfile({ id: 'pb', name: 'Far Trader' }), { q: 1, r: 0 }, 'npc', '#f00')
  const [a, b] = useBattleStore.getState().ships
  useBattleStore.getState().startBoarding(a.id, b.id)
  const boarding = useBattleStore.getState().boardings[0]
  useUiStore.setState({ activeModal: 'boarding-contact', modalPayload: { boardingId: boarding.id } })
  return boarding.id
}

const party = (id, side) => useBattleStore.getState().boardings.find((b) => b.id === id).parties[side]
const side  = (s) => within(screen.getByTestId(`roster-${s}`))

function openRoster() {
  fireEvent.click(screen.getByRole('button', { name: /Parties/ }))
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({ activeModal: null, modalPayload: null })
})

describe('BoardingRosterPanel', () => {
  it('is collapsed by default and opens on click', () => {
    setupBoarding()
    render(<BoardingContactModal />)
    expect(screen.queryByTestId('roster-attacker')).toBeNull()
    openRoster()
    expect(screen.getByTestId('roster-attacker')).toBeTruthy()
    expect(screen.getByTestId('roster-defender')).toBeTruthy()
  })

  it('adds a batch of boarders from the armour preset', () => {
    const id = setupBoarding()
    render(<BoardingContactModal />)
    openRoster()
    fireEvent.click(side('attacker').getByText('+ ADD BOARDERS'))
    fireEvent.change(screen.getByLabelText('Boarder name'), { target: { value: 'Marine' } })
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Armour'), { target: { value: 'combat_tl12' } })
    expect(screen.getByLabelText('PROT').value).toBe('17')
    fireEvent.click(screen.getByRole('button', { name: 'ADD' }))
    expect(party(id, 'attacker').map((b) => b.name)).toEqual(['Marine 1', 'Marine 2', 'Marine 3'])
    expect(party(id, 'attacker')[0]).toMatchObject({ protection: 17, armourKey: 'combat_tl12' })
    expect(party(id, 'defender')).toEqual([])
  })

  it('experience preset resets characteristics and shows the CRB bonus hint', () => {
    setupBoarding()
    render(<BoardingContactModal />)
    openRoster()
    fireEvent.click(side('defender').getByText('+ ADD BOARDERS'))
    fireEvent.change(screen.getByLabelText('STR'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Experience'), { target: { value: 'experienced' } })
    expect(screen.getByLabelText('STR').value).toBe('7')
    expect(screen.getByText(/bonuses \+1, \+2/)).toBeTruthy()
  })

  it('shows an error and blocks submit on invalid characteristics', () => {
    const id = setupBoarding()
    render(<BoardingContactModal />)
    openRoster()
    fireEvent.click(side('attacker').getByText('+ ADD BOARDERS'))
    fireEvent.change(screen.getByLabelText('END'), { target: { value: '0' } })
    expect(screen.getByRole('alert').textContent).toMatch(/STR, DEX and END/)
    expect(screen.getByRole('button', { name: 'ADD' }).disabled).toBe(true)
    expect(party(id, 'attacker')).toEqual([])
  })

  function seed(id, n = 1, over = {}) {
    useBattleStore.getState().addBoarders(id, 'attacker',
      Array.from({ length: n }, (_, i) => ({ name: `M${i + 1}`, str: 7, dex: 7, end: 7, ...over })))
  }

  it('applies manual damage through the form with a Protection preview', () => {
    const id = setupBoarding()
    seed(id, 1, { protection: 4 })
    render(<BoardingContactModal />)
    openRoster()
    fireEvent.click(screen.getByLabelText('Damage M1'))
    fireEvent.change(screen.getByLabelText('Damage'), { target: { value: '9' } })
    expect(screen.getByText(/absorbs 4/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'APPLY DAMAGE' }))
    expect(party(id, 'attacker')[0].cur.end).toBe(2)
    expect(screen.queryByRole('button', { name: 'APPLY DAMAGE' })).toBeNull()
  })

  it('marks downed and dead boarders and disables DMG on the dead', () => {
    const id = setupBoarding()
    seed(id, 2)
    const [a, b] = party(id, 'attacker')
    useBattleStore.getState().applyBoarderDamage(id, 'attacker', [
      { boarderId: a.id, damage: 14 },   // END 7 + DEX 7 → unconscious
      { boarderId: b.id, damage: 100 },  // dead
    ])
    render(<BoardingContactModal />)
    openRoster()
    expect(side('attacker').getByText('DOWN')).toBeTruthy()
    expect(side('attacker').getByText('DEAD')).toBeTruthy()
    expect(screen.getByLabelText('Damage M2').disabled).toBe(true)
  })

  it('shows the Morale hint once casualties reach 10%', () => {
    const id = setupBoarding()
    seed(id, 4)
    const [a] = party(id, 'attacker')
    useBattleStore.getState().applyBoarderDamage(id, 'attacker', [{ boarderId: a.id, damage: 100 }])
    render(<BoardingContactModal />)
    openRoster()
    expect(side('attacker').getByText(/1\/4 down \(25%\)/)).toBeTruthy()
    expect(side('attacker').getByText(/MRL 8\+/)).toBeTruthy()
  })

  it('reorders and removes boarders', () => {
    const id = setupBoarding()
    seed(id, 3)
    render(<BoardingContactModal />)
    openRoster()
    fireEvent.click(screen.getByLabelText('Move M1 down'))
    expect(party(id, 'attacker').map((b) => b.name)).toEqual(['M2', 'M1', 'M3'])
    expect(screen.getByLabelText('Move M2 up').disabled).toBe(true)
    fireEvent.click(screen.getByLabelText('Remove M3'))
    expect(party(id, 'attacker').map((b) => b.name)).toEqual(['M2', 'M1'])
  })

  it('edits current characteristics and Protection', () => {
    const id = setupBoarding()
    seed(id, 1)
    useBattleStore.getState().applyBoarderDamage(id, 'attacker', [{ boarderId: party(id, 'attacker')[0].id, damage: 5 }])
    render(<BoardingContactModal />)
    openRoster()
    fireEvent.click(screen.getByLabelText('Edit M1'))
    fireEvent.change(screen.getByLabelText('Current END'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Current PROT'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }))
    expect(party(id, 'attacker')[0]).toMatchObject({ protection: 5 })
    expect(party(id, 'attacker')[0].cur.end).toBe(7)
  })
})
