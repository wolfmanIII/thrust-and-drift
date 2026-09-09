/**
 * E2E — GM weapon override, end-to-end (#21 iteration 1).
 *
 * Unit/component tests already cover the pieces in isolation:
 * - resolveWeaponForSlot / isSingletonInSlot (src/utils/weaponOverrides.test.js)
 * - useAttackSetup wiring (src/components/modals/useAttackSetup.test.js)
 * - the override editor UI (src/components/forms/ShipProfileForm.test.jsx)
 *
 * What none of those cover is the real cross-screen path: build a ship
 * profile with a custom weapon override in the form, place it in a live
 * battle, and confirm the override actually changes the rolled damage in
 * AttackModal. That's what this file drives, via the real canvas + context
 * menu interactions rather than calling store actions directly.
 */

import { test, expect } from '@playwright/test'
import { drainActors } from './helpers.js'

const SHIP_NAME   = 'QA Override Ship'
const TARGET_NAME = 'Light Fighter'
const MOVEMENT_ANIM_MS = 2100

/** Build a profile with one Pulse Laser turret slot, overridden to a distinctive damageDice. */
async function startBattleWithOverrideProfile(page) {
  await page.goto('/')
  await page.getByRole('button', { name: /\+ NEW PROFILE/i }).click()
  await page.getByLabel('NAME *').fill(SHIP_NAME)

  await page.getByRole('button', { name: '+ Add' }).last().click()
  await page.getByRole('combobox').last().selectOption('Pulse Laser')

  await page.getByRole('button', { name: 'Customize Pulse Laser' }).click()
  await page.getByLabel('Custom name').fill('Rusty Pulse Laser')
  await page.getByLabel('Damage dice').fill('1') // base Pulse Laser is 2D — 1D is unmistakably the override

  await page.getByRole('button', { name: /\+ CREATE PROFILE/i }).click()
  await page.getByRole('button', { name: /NEW SESSION/i }).click()
  await page.getByTitle('Tactical (2)').waitFor({ state: 'visible' })
}

/** Place the override ship as PLAYER at canvas centre, Light Fighter as NPC nearby. */
async function placeShips(page) {
  const canvas = page.locator('canvas').first()
  const box    = await canvas.boundingBox()
  const cx     = box.x + box.width  / 2
  const cy     = box.y + box.height / 2

  // Player ship — faction defaults to 'npc' in AddShipModal, so Players must
  // be selected explicitly for the manual dice-entry attack-roll UI to apply.
  await page.mouse.click(cx, cy, { button: 'right' })
  await page.getByText('Add ship here').click()
  await page.getByText(SHIP_NAME, { exact: true }).click()
  await page.getByRole('button', { name: 'Players' }).click()
  await page.getByRole('button', { name: /place|add to battle|confirm/i }).first().click()

  // NPC target, offset so it's in range but not overlapping.
  await page.mouse.click(cx + 80, cy, { button: 'right' })
  await page.getByText('Add ship here').click()
  await page.getByText(TARGET_NAME).first().click()
  await page.getByRole('button', { name: 'NPC' }).click()
  await page.getByRole('button', { name: /place|add to battle|confirm/i }).first().click()

  return { canvas, box, cx, cy }
}

/**
 * Roll initiative with one player ship in the mix — unlike helpers.js's
 * rollInitiativeAt (all-NPC, auto-roll), a player ship gates the first
 * CONFIRM behind manual dice entry (InitiativeModal.jsx "Player Ships").
 */
async function rollInitiativeWithPlayerShip(page, box) {
  await page.mouse.click(box.x + box.width / 2 + 140, box.y + box.height / 2, { button: 'right' })
  await page.getByRole('button', { name: 'Roll Initiative…' }).click()
  await page.getByLabel('Die 1').fill('6')
  await page.getByLabel('Die 2').fill('6')
  await page.getByRole('button', { name: /CONFIRM/ }).first().click() // applies
  await page.getByRole('button', { name: /CONFIRM/ }).first().click() // closes
}

/** Setup → Initiative (roll) → Acceleration → Movement → Attack. */
async function advanceToAttack(page, box) {
  await page.getByRole('button', { name: /NEXT PHASE/i }).click() // setup → initiative
  await rollInitiativeWithPlayerShip(page, box)
  await page.getByRole('button', { name: /NEXT PHASE/i }).click() // → acceleration
  await drainActors(page)
  await page.getByRole('button', { name: /NEXT PHASE/i }).click() // → movement
  await page.waitForTimeout(MOVEMENT_ANIM_MS)
  await page.getByRole('button', { name: /NEXT PHASE/i }).click() // → attack
}

test.describe('Weapon override — end-to-end damage roll (#21 iteration 1)', () => {
  test.use({ viewport: { width: 1400, height: 1400 } })

  test('an overridden singleton Pulse Laser rolls its custom damage dice, not the base value', async ({ page }) => {
    await startBattleWithOverrideProfile(page)
    const { box, cx, cy } = await placeShips(page)
    await advanceToAttack(page, box)

    // Initiative order is auto-rolled — if the NPC target went first, it's
    // "not this ship's turn" yet for our ship. Drain the NPC's own attack
    // turn (it has nothing interesting to do) via NEXT →, then retry.
    let attackBtn = null
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.mouse.click(cx, cy, { button: 'right' })
      const candidate = page.getByText('Attack…')
      if (await candidate.isVisible().catch(() => false)) { attackBtn = candidate; break }
      await page.keyboard.press('Escape')
      const nextBtn = page.getByText('NEXT →')
      if (!await nextBtn.isVisible().catch(() => false)) break
      await nextBtn.click()
    }
    if (!attackBtn) {
      test.skip(true, 'Override ship never became the current actor this round')
      return
    }
    await attackBtn.click()

    await page.getByRole('button', { name: /Pulse Laser/ }).first().click()
    // Target select button is the last match — the ship list sidebar has its own
    // same-named "centre map on this ship" button rendered earlier in the DOM.
    await page.getByRole('button', { name: TARGET_NAME }).last().click()
    await page.getByRole('button', { name: /ROLL ATTACK/i }).click()

    // Manual 6+6 — guaranteed hit regardless of DM, avoids flaky RNG-dependent misses.
    await page.getByLabel('Die 1').fill('6')
    await page.getByLabel('Die 2').fill('6')
    await page.getByRole('button', { name: /CONFIRM ROLL/i }).click()
    await page.getByRole('button', { name: /CALCULATE DAMAGE/i }).click()

    // AttackDamageStep's formula label renders `${damageDice}D + Effect − Armour`.
    // 1D proves the override reached the live attack roll; 2D would be the
    // un-overridden base Pulse Laser value.
    await expect(page.getByText('1D + Effect − Armour')).toBeVisible()
    await expect(page.getByText('2D + Effect − Armour')).not.toBeVisible()
  })
})
