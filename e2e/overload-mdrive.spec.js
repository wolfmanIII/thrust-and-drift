/**
 * E2E tests — Thrust-7 ship "capped at 6" hypothesis from the Overload M-Drive
 * CotI report (#30).
 *
 * The report's confirmed bug (Overload M-Drive bonus never reaching the
 * following round's Acceleration phase) is fixed and unit-tested in
 * battleStore.test.js. This file covers the report's secondary, more tentative
 * claim — that a Thrust-7 ship seemed capped at 6 Thrust even *before* any
 * overload — by driving the real canvas thrust-targeting interaction
 * (right-click ship → "Apply Thrust" → drag → click to confirm) rather than
 * calling store actions directly.
 *
 * Uses a custom profile (Thrust 7, no weapons, no ion effects, no crits — the
 * report's "clean test ship") built via the Ship Profile Form, since none of
 * the seeded default profiles has Thrust 7.
 */

import { test, expect } from '@playwright/test'
import { hexToPixel, pixelToHex } from '../src/utils/hex.js'

const HEX_SIZE = 32 // useCanvasRenderer.js HEX_SIZE, zoom 1.0 at default "Tactical (2)" level
const SHIP_NAME = 'QA Test Ship T7'

/** Build a Thrust-7 profile from scratch and start a new battle. */
async function startBattleWithT7Profile(page) {
  await page.goto('/')
  await page.getByRole('button', { name: /\+ NEW PROFILE/i }).click()
  await page.getByLabel('NAME *').fill(SHIP_NAME)
  await page.getByLabel('THRUST').fill('7')
  await page.getByRole('button', { name: /\+ CREATE PROFILE/i }).click()

  await page.getByRole('button', { name: /NEW SESSION/ }).click()
  await page.getByTitle('Tactical (2)').waitFor({ state: 'visible' })
}

/** Place SHIP_NAME at the canvas center as an NPC (auto-rolls initiative). */
async function placeTestShip(page) {
  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  await page.mouse.click(cx, cy, { button: 'right' })
  await page.getByText('Add ship here').click()
  await page.getByText(SHIP_NAME, { exact: true }).click()
  await page.getByRole('button', { name: 'NPC' }).click()
  await page.getByRole('button', { name: 'PLACE SHIP' }).click()

  return { canvas, box, cx, cy }
}

/** Roll initiative from an empty hex offset from centre (mirrors e2e/batch3-features.spec.js). */
async function rollInitiative(page, box) {
  await page.mouse.click(box.x + box.width / 2 + 140, box.y + box.height / 2, { button: 'right' })
  await page.getByRole('button', { name: 'Roll Initiative…' }).click()
  // NPC auto-rolls — two CONFIRMs: first applies, second closes.
  await page.getByRole('button', { name: /CONFIRM/ }).first().click()
  await page.getByRole('button', { name: /CONFIRM/ }).first().click()
}

/** Advance from setup → initiative → (roll) → acceleration. */
async function advanceToAcceleration(page, box) {
  await page.getByRole('button', { name: /NEXT PHASE/i }).click() // setup → initiative
  await rollInitiative(page, box)
  await page.getByRole('button', { name: /NEXT PHASE/i }).click() // initiative → acceleration
}

async function openBattleLog(page) {
  await page.getByText('BATTLE LOG').click()
}

test.describe('Thrust-7 ship — no hard cap at 6 (CotI hypothesis, #30)', () => {
  // Generous viewport: dragging 10 hexes along a pure axial direction from canvas
  // center needs ~550px of clearance — default 720px-tall viewports clip the target
  // off-screen and silently truncate the drag before it ever reaches the app logic.
  test.use({ viewport: { width: 1400, height: 1400 } })

  test('ShipTooltip reports 7 avail. / 7 max for a freshly placed Thrust-7 ship', async ({ page }) => {
    await startBattleWithT7Profile(page)
    const { cx, cy } = await placeTestShip(page)

    // Hover the token to trigger ShipTooltip.
    await page.mouse.move(cx, cy)
    await expect(page.getByText('7 avail. / 7 max')).toBeVisible()
  })

  test('dragging past the rated Thrust applies exactly 7 hexes, not 6', async ({ page }) => {
    await startBattleWithT7Profile(page)
    const { canvas, box, cx, cy } = await placeTestShip(page)
    await advanceToAcceleration(page, box)
    await openBattleLog(page)

    // Ship's world hex = pixelToHex of the placement click point (rounds to nearest
    // hex center; offset/zoom are both at their defaults — {0,0}/1 — at this point).
    const rect = await canvas.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { left: r.left, top: r.top }
    })
    const shipHex = pixelToHex(cx - rect.left, cy - rect.top, HEX_SIZE)
    // Drag to shipHex + (0, -10): well past the rated Thrust of 7, to confirm the
    // clamp lands on 7 — not 6.
    const farHex = { q: shipHex.q, r: shipHex.r - 10 }
    const target = hexToPixel(farHex.q, farHex.r, HEX_SIZE)

    await page.mouse.click(cx, cy, { button: 'right' })
    await page.getByText('Apply Thrust').click()
    await page.mouse.move(box.x + target.x, box.y + target.y)
    await page.mouse.click(box.x + target.x, box.y + target.y)

    // The log line must show a magnitude-7 delta (Δq=0, Δr=-7), never -6.
    await expect(page.getByText(/Thrust Δ\(0,-7\)/)).toBeVisible()
    await expect(page.getByText(/Thrust Δ\(0,-6\)/)).not.toBeVisible()
  })
})
