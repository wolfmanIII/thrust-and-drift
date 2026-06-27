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
