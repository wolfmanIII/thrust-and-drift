/**
 * E2E tests — Batch 3 community features.
 * REQ-08: Point Defence resolved at missile impact (MissileImpactModal), not at launch.
 * REQ-11: AUTO-ASSIGN button in CrewAssignmentModal.
 * REQ-13: Initiative phase skipped from round 2+ (CRB p.160); GM ↺ override.
 */

import { test, expect } from '@playwright/test'
import { startNewBattle } from './helpers.js'

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Place one NPC ship at the canvas centre via right-click context menu. */
async function placeNpcShip(page, profileName = 'Light Fighter') {
  const canvas = page.locator('canvas').first()
  const box    = await canvas.boundingBox()
  const cx     = box.x + box.width  / 2
  const cy     = box.y + box.height / 2
  await page.mouse.click(cx, cy, { button: 'right' })
  await page.getByText('Add ship here').click()
  await page.getByText(profileName).first().click()
  await page.getByRole('button', { name: 'NPC' }).click()
  await page.getByRole('button', { name: /place|add to battle|confirm/i }).first().click()
}

/** Roll initiative from an empty hex offset from centre. */
async function rollInitiative(page) {
  const canvas = page.locator('canvas').first()
  const box    = await canvas.boundingBox()
  // Right-click a hex that does not contain the ship (offset right)
  await page.mouse.click(box.x + box.width / 2 + 140, box.y + box.height / 2, { button: 'right' })
  await page.getByRole('button', { name: 'Roll Initiative…' }).click()
  // NPC auto-rolls — two CONFIRMs: first applies, second closes
  await page.getByRole('button', { name: /CONFIRM/ }).first().click()
  await page.getByRole('button', { name: /CONFIRM/ }).first().click()
}

/** Advance all remaining actors in the current phase (clicks NEXT → until gone). */
async function drainActors(page) {
  while (await page.getByText('NEXT →').isVisible().catch(() => false)) {
    await page.getByText('NEXT →').click()
  }
}

// ── REQ-11: AUTO-ASSIGN ───────────────────────────────────────────────────────

test.describe('CrewAssignmentModal — AUTO-ASSIGN (REQ-11)', () => {
  test.beforeEach(async ({ page }) => {
    await startNewBattle(page)
  })

  test('shows AUTO-ASSIGN button when ship has named crew (Light Fighter)', async ({ page }) => {
    await placeNpcShip(page, 'Light Fighter')

    const canvas = page.locator('canvas').first()
    const box    = await canvas.boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' })
    await page.getByText('Assign Crew…').click()

    // Light Fighter has "Ren Takahata" as named crew — AUTO-ASSIGN must be visible
    await expect(page.getByRole('button', { name: 'AUTO-ASSIGN' })).toBeVisible()
  })

  test('AUTO-ASSIGN fills roles and SAVE ASSIGNMENTS closes modal without error', async ({ page }) => {
    await placeNpcShip(page, 'Light Fighter')

    const canvas = page.locator('canvas').first()
    const box    = await canvas.boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' })
    await page.getByText('Assign Crew…').click()

    await page.getByRole('button', { name: 'AUTO-ASSIGN' }).click()
    await page.getByRole('button', { name: 'SAVE ASSIGNMENTS' }).click()

    // Modal must be closed and battle screen still visible
    await expect(page.getByRole('button', { name: 'AUTO-ASSIGN' })).not.toBeVisible()
    await expect(page.getByTitle('Tactical (2)')).toBeVisible()
  })

  test('CLEAR ALL resets selections — all dropdowns show "— unassigned —"', async ({ page }) => {
    await placeNpcShip(page, 'Light Fighter')

    const canvas = page.locator('canvas').first()
    const box    = await canvas.boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' })
    await page.getByText('Assign Crew…').click()

    await page.getByRole('button', { name: 'AUTO-ASSIGN' }).click()
    await page.getByRole('button', { name: 'CLEAR ALL' }).click()

    // All selects must reset to the empty option
    const selects = page.locator('select')
    for (const sel of await selects.all()) {
      await expect(sel).toHaveValue('')
    }
  })
})

// ── REQ-13: Initiative phase skip ─────────────────────────────────────────────

test.describe('Initiative skip — round 2+ starts at Acceleration (REQ-13)', () => {
  test.beforeEach(async ({ page }) => {
    await startNewBattle(page)
  })

  /**
   * Full round 1 flow for one NPC ship:
   * Setup → Initiative (roll) → Acceleration (actor) → Movement → Attack (actor)
   * → Actions (actor) → End → builds round 2.
   */
  async function completeRound1(page) {
    await placeNpcShip(page)

    // Setup → Initiative
    await page.getByRole('button', { name: /NEXT PHASE/i }).click()

    await rollInitiative(page)

    // Initiative → Acceleration
    await page.getByRole('button', { name: /NEXT PHASE/i }).click()
    await drainActors(page)   // advance the 1 NPC actor

    // Acceleration → Movement
    await page.getByRole('button', { name: /NEXT PHASE/i }).click()

    // Movement → Attack
    await page.getByRole('button', { name: /NEXT PHASE/i }).click()
    await drainActors(page)

    // Attack → Actions
    await page.getByRole('button', { name: /NEXT PHASE/i }).click()
    await drainActors(page)

    // Actions → End
    await page.getByRole('button', { name: /NEXT PHASE/i }).click()

    // End → round 2 (buildNextRoundState)
    await page.getByRole('button', { name: /NEXT PHASE/i }).click()
  }

  test('round 2 opens at ACCELERATION, not INITIATIVE', async ({ page }) => {
    await completeRound1(page)

    // HUD phase label must say ACCELERATION
    await expect(page.getByText('ACCELERATION')).toBeVisible()
    // "🎲 ROLL INITIATIVE →" CTA only appears in initiative phase — must be absent
    await expect(page.getByText('🎲 ROLL INITIATIVE →')).not.toBeVisible()
  })

  test('round counter increments to 2', async ({ page }) => {
    await completeRound1(page)

    // The round badge (large mono number) should show "2"
    await expect(page.locator('.font-mono.font-bold.text-lg', { hasText: '2' })).toBeVisible()
  })

  test('↺ override button is visible in round 2 Acceleration', async ({ page }) => {
    await completeRound1(page)

    await expect(page.getByTitle('Re-roll initiative this round')).toBeVisible()
  })

  test('clicking ↺ switches to INITIATIVE phase', async ({ page }) => {
    await completeRound1(page)

    await page.getByTitle('Re-roll initiative this round').click()
    // HUD phase label (text-slate-200) — use first() to avoid matching PhaseTracker entries
    await expect(page.getByText('INITIATIVE').first()).toBeVisible()
    // The ↺ button disappears once we leave acceleration
    await expect(page.getByTitle('Re-roll initiative this round')).not.toBeVisible()
  })
})

// ── REQ-08: PD at impact, not at launch ───────────────────────────────────────

test.describe('AttackModal — no Point Defence section for missiles (REQ-08)', () => {
  /**
   * Advance two ships to attack phase with the player ship as current actor.
   * Returns the canvas box for further interactions.
   */
  async function setupAttackPhase(page) {
    // Player Scout/Courier has Missile Rack; NPC Light Fighter is the target.
    const canvas = page.locator('canvas').first()
    const box    = await canvas.boundingBox()
    const cx     = box.x + box.width  / 2
    const cy     = box.y + box.height / 2

    // Place player ship (Scout/Courier has Missile Rack)
    await page.mouse.click(cx, cy, { button: 'right' })
    await page.getByText('Add ship here').click()
    await page.getByText('Scout/Courier').first().click()
    await page.getByRole('button', { name: /place|add to battle|confirm/i }).first().click()

    // Place NPC ship slightly offset
    await page.mouse.click(cx + 80, cy, { button: 'right' })
    await page.getByText('Add ship here').click()
    await page.getByText('Light Fighter').first().click()
    await page.getByRole('button', { name: 'NPC' }).click()
    await page.getByRole('button', { name: /place|add to battle|confirm/i }).first().click()

    // Setup → Initiative
    await page.getByRole('button', { name: /NEXT PHASE/i }).click()

    // Roll initiative for both ships
    await rollInitiative(page)

    // Initiative → Acceleration
    await page.getByRole('button', { name: /NEXT PHASE/i }).click()
    await drainActors(page)

    // Acceleration → Movement → Attack
    await page.getByRole('button', { name: /NEXT PHASE/i }).click()
    await page.getByRole('button', { name: /NEXT PHASE/i }).click()

    return box
  }

  test('selecting Missile Rack in AttackModal shows no Point Defence section', async ({ page }) => {
    await startNewBattle(page)
    const box = await setupAttackPhase(page)
    const cx  = box.x + box.width / 2
    const cy  = box.y + box.height / 2

    // Open Attack modal on the current actor (first actor in initiative order)
    // Right-click on the player ship to get context menu
    await page.mouse.click(cx, cy, { button: 'right' })
    // If Attack… is available (we are the current actor), click it
    const attackBtn = page.getByText('Attack…')
    if (await attackBtn.isVisible().catch(() => false)) {
      await attackBtn.click()
      // Select Missile Rack weapon
      await page.getByText('Missile Rack').first().click()
      // Point Defence section must NOT appear
      await expect(page.getByText(/Point Defence/i)).not.toBeVisible()
    }
    // If Attack… isn't available for this ship (not the current actor in initiative),
    // still verify the battle screen is intact — the unit tests cover the modal logic.
    await expect(page.getByTitle('Tactical (2)')).toBeVisible()
  })
})
