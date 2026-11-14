/**
 * Tests for BoarderCanisterPanel (rendered through BoardingContactModal).
 * // MgT2e CRB p.171, HG p.38
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { BoardingContactModal } from './BoardingContactModal.jsx'
import { useBattleStore }       from '../../store/battleStore.js'
import { useUiStore }           from '../../store/uiStore.js'

function makeProfile(overrides = {}) {
  return { id: 'p', name: 'Ship', hull: 10, armor: 0, thrust: 4, tonnage: 100, turrets: [], crew: [], ...overrides }
}

function setupBoarding(defenderTurrets = [{ slot: 1, weapons: ['Sandcaster'] }]) {
  useBattleStore.getState().addShip(makeProfile({ id: 'pa', name: 'Viper' }), { q: 0, r: 0 }, 'players', '#0f0')
  useBattleStore.getState().addShip(makeProfile({ id: 'pb', name: 'Far Trader', turrets: defenderTurrets }), { q: 1, r: 0 }, 'npc', '#f00')
  const [a, b] = useBattleStore.getState().ships
  useBattleStore.getState().startBoarding(a.id, b.id)
  const boarding = useBattleStore.getState().boardings[0]
  useUiStore.setState({ activeModal: 'boarding-contact', modalPayload: { boardingId: boarding.id } })
  return { b, boarding }
}

function enterDice(d1, d2) {
  const panel = within(screen.getByTestId('boarder-canister-panel'))
  fireEvent.change(panel.getByLabelText('Die 1'), { target: { value: String(d1) } })
  fireEvent.change(panel.getByLabelText('Die 2'), { target: { value: String(d2) } })
}

beforeEach(() => {
  useBattleStore.getState().resetBattle('vectorial')
  useUiStore.setState({ activeModal: null, modalPayload: null })
})

describe('BoarderCanisterPanel', () => {
  it('is hidden when the defender has no sandcaster', () => {
    setupBoarding([])
    render(<BoardingContactModal />)
    expect(screen.queryByTestId('boarder-canister-panel')).toBeNull()
  })

  it('shows ammo and both canister types for a sandcaster ship', () => {
    setupBoarding()
    render(<BoardingContactModal />)
    expect(screen.getByTestId('boarder-canister-panel')).toBeTruthy()
    expect(screen.getByText(/Sand · 8D/)).toBeTruthy()
    expect(screen.getByText(/Pebble · 1D×10/)).toBeTruthy()
  })

  it('fire is disabled until both dice are entered', () => {
    setupBoarding()
    render(<BoardingContactModal />)
    expect(screen.getByText(/FIRE SAND CANISTER/).closest('button').disabled).toBe(true)
    enterDice(4, 4)
    expect(screen.getByText(/FIRE SAND CANISTER/).closest('button').disabled).toBe(false)
  })

  it('a hit spends the canister and unlocks per-boarder damage rolls', () => {
    const { b } = setupBoarding()
    render(<BoardingContactModal />)
    fireEvent.click(screen.getByText(/Pebble · 1D×10/))
    enterDice(5, 5)
    fireEvent.click(screen.getByText(/FIRE PEBBLE CANISTER/))
    expect(useBattleStore.getState().ships.find((s) => s.id === b.id).sandAmmoTotal).toBe(19)
    expect(screen.getByText(/Last salvo: Pebble/)).toBeTruthy()
    fireEvent.click(screen.getByText(/ROLL DAMAGE — BOARDER #1/))
    expect(screen.getByText(/ROLL DAMAGE — BOARDER #2/)).toBeTruthy()
    const logs = useBattleStore.getState().log.map((l) => l.message)
    expect(logs.some((m) => /Pebble canister — boarder #1: \d+ damage/.test(m))).toBe(true)
  })

  it('a miss offers no damage roll', () => {
    setupBoarding()
    render(<BoardingContactModal />)
    enterDice(1, 2)
    fireEvent.click(screen.getByText(/FIRE SAND CANISTER/))
    expect(screen.getByText(/Last salvo: Sand.*MISS/)).toBeTruthy()
    expect(screen.queryByText(/ROLL DAMAGE/)).toBeNull()
  })

  describe('with a boarding party defined', () => {
    const party = (id) => useBattleStore.getState().boardings.find((b) => b.id === id).parties.attacker

    function seedParty(boardingId, protection = 0) {
      useBattleStore.getState().addBoarders(boardingId, 'attacker', [
        { name: 'M1', str: 7, dex: 7, end: 7, protection },
        { name: 'M2', str: 7, dex: 7, end: 7, protection },
      ])
    }

    it('rolls damage for every living boarder in one volley', () => {
      const { boarding } = setupBoarding()
      seedParty(boarding.id)
      render(<BoardingContactModal />)
      enterDice(5, 5)
      fireEvent.click(screen.getByText(/FIRE SAND CANISTER/))
      fireEvent.click(screen.getByText(/ALL 2 BOARDERS/))
      expect(screen.getByTestId('canister-roster-results').querySelectorAll('li')).toHaveLength(2)
      // 8D sand: 8–48 damage vs END 7 + overflow → every boarder took damage
      expect(party(boarding.id).every((b) => b.cur.end < 7)).toBe(true)
    })

    it('Protection reduces canister damage (pebble 1DD vs armour 60 = no damage)', () => {
      const { boarding } = setupBoarding()
      seedParty(boarding.id, 60)
      render(<BoardingContactModal />)
      fireEvent.click(screen.getByText(/Pebble · 1D×10/))
      enterDice(5, 5)
      fireEvent.click(screen.getByText(/FIRE PEBBLE CANISTER/))
      fireEvent.click(screen.getByText(/ALL 2 BOARDERS/))
      expect(party(boarding.id).map((b) => b.cur.end)).toEqual([7, 7])
    })

    it('the volley can be applied only once per salvo', () => {
      const { boarding } = setupBoarding()
      seedParty(boarding.id)
      render(<BoardingContactModal />)
      enterDice(5, 5)
      fireEvent.click(screen.getByText(/FIRE SAND CANISTER/))
      fireEvent.click(screen.getByText(/ALL 2 BOARDERS/))
      expect(screen.getByText(/2 BOARDERS HIT/).closest('button').disabled).toBe(true)
    })

    it('a miss offers no damage roll', () => {
      const { boarding } = setupBoarding()
      seedParty(boarding.id)
      render(<BoardingContactModal />)
      enterDice(1, 2)
      fireEvent.click(screen.getByText(/FIRE SAND CANISTER/))
      expect(screen.queryByText(/ROLL DAMAGE/)).toBeNull()
    })

    it('dead boarders are skipped', () => {
      const { boarding } = setupBoarding()
      seedParty(boarding.id)
      useBattleStore.getState().applyBoarderDamage(boarding.id, 'attacker', [{ boarderId: party(boarding.id)[0].id, damage: 100 }])
      render(<BoardingContactModal />)
      enterDice(5, 5)
      fireEvent.click(screen.getByText(/FIRE SAND CANISTER/))
      expect(screen.getByText(/ALL 1 BOARDERS/)).toBeTruthy()
    })
  })
})
