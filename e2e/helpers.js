/**
 * Shared helpers for e2e tests.
 */

/**
 * Navigate from Dashboard to a new vectorial battle.
 * Waits until the battle screen is confirmed visible (Tactical zoom button).
 * @param {import('@playwright/test').Page} page
 */
export async function startNewBattle(page) {
  await page.goto('/')
  await page.getByRole('button', { name: /NEW SESSION/ }).click()
  // BattleMap zoom buttons are the reliable signal that the battle screen is ready
  await page.getByTitle('Tactical (2)').waitFor({ state: 'visible' })
}

/**
 * Place an NPC ship from a seeded profile at the canvas centre via right-click context menu.
 * @param {import('@playwright/test').Page} page
 * @param {string} profileName
 * @returns {Promise<{ canvas: import('@playwright/test').Locator, box: object, cx: number, cy: number }>}
 */
export async function placeNpcShipByProfile(page, profileName) {
  const canvas = page.locator('canvas').first()
  const box    = await canvas.boundingBox()
  const cx     = box.x + box.width  / 2
  const cy     = box.y + box.height / 2
  await page.mouse.click(cx, cy, { button: 'right' })
  await page.getByText('Add ship here').click()
  await page.getByText(profileName).first().click()
  await page.getByRole('button', { name: 'NPC' }).click()
  await page.getByRole('button', { name: /place|add to battle|confirm/i }).first().click()
  return { canvas, box, cx, cy }
}

/**
 * Roll initiative from an empty hex offset from the canvas centre.
 * @param {import('@playwright/test').Page} page
 * @param {object} box  Canvas bounding box
 */
export async function rollInitiativeAt(page, box) {
  await page.mouse.click(box.x + box.width / 2 + 140, box.y + box.height / 2, { button: 'right' })
  await page.getByRole('button', { name: 'Roll Initiative…' }).click()
  // NPC auto-rolls — two CONFIRMs: first applies, second closes.
  await page.getByRole('button', { name: /CONFIRM/ }).first().click()
  await page.getByRole('button', { name: /CONFIRM/ }).first().click()
}

/** Advance all remaining actors in the current phase (clicks NEXT → until gone). */
export async function drainActors(page) {
  while (await page.getByText('NEXT →').isVisible().catch(() => false)) {
    await page.getByText('NEXT →').click()
  }
}
