/**
 * E2E — Boarder rosters (#55): Setup → Contact (roster + pebble canister) → Conflict (stack hit,
 * damage) → Security (survivors) → battle report.
 * Rules: MgT2e CRB p.77, p.100, p.171; HG p.38, pp.132–133.
 *
 * Ships are injected through the store (dev server dynamic import) so the test does not depend on
 * canvas drag placement; the boarding itself is started from the real context menu.
 */

import { test, expect } from '@playwright/test'
import { hexToPixel } from '../src/utils/hex.js'
import { startNewBattle } from './helpers.js'

const HEX_SIZE = 32 // useCanvasRenderer.js HEX_SIZE, zoom 1.0 / offset {0,0} on a fresh battle
const ATTACKER_HEX = { q: 5, r: 3 }
const DEFENDER_HEX = { q: 6, r: 3 }

/** Place an attacker (thrust 4) and a sandcaster-armed defender (thrust 2) on adjacent hexes. */
async function injectShips(page) {
  await page.evaluate(async ({ attackerHex, defenderHex }) => {
    const { useBattleStore } = await import('/src/store/battleStore.js')
    const { useProfilesStore } = await import('/src/store/profilesStore.js')

    const base = useProfilesStore.getState().profiles[0]
    const attackerProfile = { ...base, id: 'e2e-raider', name: 'E2E Raider', thrust: 4, turrets: [] }
    const defenderProfile = {
      ...base, id: 'e2e-trader', name: 'E2E Trader', thrust: 2,
      turrets: [{ slot: 1, weapons: ['Sandcaster'] }],
    }

    const store = useBattleStore.getState()
    store.addShip(attackerProfile, attackerHex, 'players', '#00ccff')
    store.addShip(defenderProfile, defenderHex, 'npc', '#ff4444')

    const [attacker, defender] = useBattleStore.getState().ships
    // Attacker is the current actor so the Board… entry shows in its context menu.
    useBattleStore.setState({
      phase: 'actions',
      initiativeOrder: [attacker.id, defender.id],
      currentActorIndex: 0,
    })
  }, { attackerHex: ATTACKER_HEX, defenderHex: DEFENDER_HEX })
}

/** @param {import('@playwright/test').Page} page */
async function boardingState(page) {
  return page.evaluate(async () => {
    const { useBattleStore } = await import('/src/store/battleStore.js')
    const { boardings, ships } = useBattleStore.getState()
    const b = boardings[0]
    return {
      phase:    b?.phase ?? null,
      outcome:  b?.outcome ?? null,
      attacker: b?.parties?.attacker ?? [],
      defender: b?.parties?.defender ?? [],
      sandAmmo: ships.find((s) => s.profile.id === 'e2e-trader')?.sandAmmoTotal ?? null,
    }
  })
}

test.use({ viewport: { width: 1400, height: 1000 } })

test('boarder roster flow: pebble canister, stack hit, survivors, report', async ({ page }) => {
  await startNewBattle(page)
  await injectShips(page)

  // ── Setup: start the boarding from the attacker's context menu ──────────────
  const canvas = page.locator('canvas').first()
  const box    = await canvas.boundingBox()
  const at     = hexToPixel(ATTACKER_HEX.q, ATTACKER_HEX.r, HEX_SIZE)
  await page.mouse.click(box.x + at.x, box.y + at.y, { button: 'right' })
  await page.getByText(/Board E2E Trader/).click()
  await page.getByRole('button', { name: /BOARD →/ }).click()

  const contact = page.getByText('⚔️ CONTACT')
  await expect(contact).toBeVisible()

  // ── Contact: define a 3-marine boarding party in combat armour (Protection 13) ──
  await page.getByRole('button', { name: /Parties/ }).click()
  const attackerRoster = page.getByTestId('roster-attacker')
  await attackerRoster.getByText('+ ADD BOARDERS').click()
  await page.getByLabel('Quantity').fill('3')
  await page.getByLabel('Armour').selectOption('combat_tl10')
  await expect(page.getByLabel('PROT')).toHaveValue('13')
  await page.getByRole('button', { name: 'ADD', exact: true }).click()

  await expect(attackerRoster.getByText('Marine 1')).toBeVisible()
  await expect(attackerRoster.getByText('Marine 3')).toBeVisible()
  expect((await boardingState(page)).attacker).toHaveLength(3)

  // ── Contact: defender fires a pebble canister at the incoming party ──────────
  const panel = page.getByTestId('boarder-canister-panel')
  await panel.getByText(/Pebble · 1D×10/).click()
  await panel.getByLabel('Die 1').fill('5')
  await panel.getByLabel('Die 2').fill('5')                       // 10 + Gunner ≥ 8 → HIT
  await panel.getByRole('button', { name: /FIRE PEBBLE CANISTER/ }).click()
  await expect(panel.getByText(/Last salvo: Pebble.*HIT/)).toBeVisible()

  await panel.getByRole('button', { name: /ALL 3 BOARDERS/ }).click()
  await expect(panel.getByTestId('canister-roster-results').locator('li')).toHaveCount(3)
  await expect(panel.getByRole('button', { name: /3 BOARDERS HIT/ })).toBeDisabled()

  const afterCanister = await boardingState(page)
  expect(afterCanister.sandAmmo).toBe(19)
  // Pebble 1DD = 10–60 damage; Protection 13 absorbs it before END is touched.
  for (const m of afterCanister.attacker) {
    expect(m.cur.end).toBeGreaterThanOrEqual(0)
    expect(m.cur.end).toBeLessThanOrEqual(7)
  }

  // ── Conflict: stack hit picks a defender-side target, GM applies damage ──────
  // Advancing closes the modal; the HUD badge reopens the current phase.
  await page.getByRole('button', { name: /ADVANCE TO CONFLICT/ }).click()
  await page.getByRole('button', { name: /CONFLICT →/ }).click()
  await expect(page.getByRole('button', { name: 'ROLL STACK HIT' })).toBeVisible()

  await page.getByRole('button', { name: /Parties/ }).click()
  const defenderRoster = page.getByTestId('roster-defender')
  await defenderRoster.getByText('+ ADD BOARDERS').click()
  await page.getByLabel('Boarder name').fill('Guard')
  await page.getByRole('button', { name: 'ADD', exact: true }).click()
  await expect(defenderRoster.getByText('Guard')).toBeVisible()

  // Boarders fire (default) → the defenders are the target group.
  await expect(page.getByText(/Front of the defenders/)).toContainText('Guard')
  await page.getByRole('button', { name: 'ROLL STACK HIT' }).click()
  const target = page.getByTestId('conflict-target')
  await expect(target).toContainText('Guard')

  await target.getByRole('button', { name: 'DAMAGE' }).click()
  await page.getByLabel('Damage', { exact: true }).fill('100')
  await page.getByRole('button', { name: 'APPLY DAMAGE' }).click()
  await expect(defenderRoster.getByText('DEAD')).toBeVisible()

  const afterConflict = await boardingState(page)
  expect(afterConflict.defender[0].cur).toEqual({ str: 0, dex: 0, end: 0 })

  // ── Security: survivors head count, then resolve ────────────────────────────
  await page.getByRole('button', { name: /END CONFLICT/ }).click()
  await page.getByRole('button', { name: /SECURITY →/ }).click()
  await expect(page.getByText('Survivors')).toBeVisible()
  const rows = page.getByTestId('survivors-row')
  await expect(rows).toHaveCount(2)
  await expect(rows.filter({ hasText: 'Defenders — E2E Trader' })).toContainText('1 dead')

  await page.getByText('Defender repels').click()
  await page.getByRole('button', { name: 'CONFIRM OUTCOME' }).click()
  expect((await boardingState(page)).outcome).toBe('defender_wins')

  // ── Report: boarding events have their own section ─────────────────────────
  await page.getByRole('button', { name: /Report/ }).click()
  await expect(page.getByRole('heading', { name: 'BATTLE REPORT' })).toBeVisible()
  await expect(page.getByText('Boarding', { exact: true })).toBeVisible()
})
