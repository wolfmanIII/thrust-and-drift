/**
 * E2E tests — Batch 2 community features.
 * REQ-07: mount type label (Single/Double/Triple Turret) in ShipDetailModal.
 * REQ-04: click ship name in PhaseTracker → centre map (verifies click is wired up).
 * REQ-02: current actor canvas ring — canvas pixel output not tested here;
 *         covered by tokenRenderers.test.js unit tests.
 */

import { test, expect } from '@playwright/test'
import { startNewBattle } from './helpers.js'

// ── REQ-07: mount type label ──────────────────────────────────────────────────
// Uses the "Light Fighter" default profile (Pulse Laser ×1 → Single Turret)
// and the "Scout/Courier" (Pulse Laser + Missile Rack → Double Turret).

test.describe('Ship Detail Modal — mount type labels (REQ-07)', () => {
  test.beforeEach(async ({ page }) => {
    await startNewBattle(page)
  })

  test('shows "Single Turret" for a slot with 1 weapon', async ({ page }) => {
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    // Add ship via context menu → AddShipModal
    await page.mouse.click(cx, cy, { button: 'right' })
    await page.getByText('Add ship here').click()
    // Pick "Light Fighter" profile (has Pulse Laser ×1)
    await page.getByText('Light Fighter').first().click()
    await page.getByRole('button', { name: /place|add to battle|confirm/i }).first().click()

    // Open Ship Sheet
    await page.mouse.click(cx, cy, { button: 'right' })
    await page.getByText(/Ship Sheet/).click()
    await expect(page.getByText(/Single Turret/).first()).toBeVisible()
  })

  test('shows "Double Turret" for a slot with 2 weapons', async ({ page }) => {
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    await page.mouse.click(cx, cy, { button: 'right' })
    await page.getByText('Add ship here').click()
    // Scout/Courier has Pulse Laser + Missile Rack on slot 1
    await page.getByText('Scout/Courier').first().click()
    await page.getByRole('button', { name: /place|add to battle|confirm/i }).first().click()

    await page.mouse.click(cx, cy, { button: 'right' })
    await page.getByText(/Ship Sheet/).click()
    await expect(page.getByText(/Double Turret/).first()).toBeVisible()
  })

  test('shows "Triple Turret" for a slot with 3 weapons', async ({ page }) => {
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    await page.mouse.click(cx, cy, { button: 'right' })
    await page.getByText('Add ship here').click()
    // Patrol Cruiser has Triple Turrets
    await page.getByText('Patrol Cruiser').first().click()
    await page.getByRole('button', { name: /place|add to battle|confirm/i }).first().click()

    await page.mouse.click(cx, cy, { button: 'right' })
    await page.getByText(/Ship Sheet/).click()
    await expect(page.getByText(/Triple Turret/).first()).toBeVisible()
  })
})

// ── REQ-04: PhaseTracker ship names are buttons ───────────────────────────────
// Uses an NPC ship so initiative auto-rolls on CONFIRM (no manual dice entry).

async function placeNpcShip(page, box) {
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.click(cx, cy, { button: 'right' })
  await page.getByText('Add ship here').click()
  await page.getByText('Light Fighter').first().click()
  await page.getByRole('button', { name: 'NPC' }).click()
  await page.getByRole('button', { name: /place|add to battle|confirm/i }).first().click()
}

async function rollInitiative(page, box) {
  // Right-click an empty hex (offset from canvas centre where the ship is)
  await page.mouse.click(box.x + box.width / 2 + 120, box.y + box.height / 2, { button: 'right' })
  await page.getByRole('button', { name: 'Roll Initiative…' }).click()
  // NPC ship auto-rolls; two CONFIRMs: first confirms roll, second closes modal
  await page.getByRole('button', { name: /CONFIRM/ }).first().click()
  await page.getByRole('button', { name: /CONFIRM/ }).first().click()
}

test.describe('PhaseTracker — click ship name (REQ-04)', () => {
  test('ship names in PhaseTracker are rendered as buttons after initiative is rolled', async ({ page }) => {
    await startNewBattle(page)

    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()

    await placeNpcShip(page, box)

    // Advance to Initiative phase
    await page.getByRole('button', { name: /NEXT PHASE/i }).click()

    await rollInitiative(page, box)

    // PhaseTracker should show the ship name as a <button>
    const tracker = page.locator('.absolute.top-10.right-3')
    await expect(tracker).toBeVisible()
    const shipBtn = tracker.locator('ul button').first()
    await expect(shipBtn).toBeVisible()
  })

  test('clicking a ship name in PhaseTracker does not crash the app', async ({ page }) => {
    await startNewBattle(page)

    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()

    await placeNpcShip(page, box)

    // Advance to Initiative phase
    await page.getByRole('button', { name: /NEXT PHASE/i }).click()

    await rollInitiative(page, box)

    const shipBtn = page.locator('.absolute.top-10.right-3 ul button').first()
    await expect(shipBtn).toBeVisible()
    await shipBtn.click()
    // App must still be alive
    await expect(page.getByTitle('Tactical (2)')).toBeVisible()
  })
})
