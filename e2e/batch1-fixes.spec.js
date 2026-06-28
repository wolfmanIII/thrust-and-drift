/**
 * E2E tests — Batch 1 community fixes.
 * REQ-09: crew skill inputs accept negative values in the ship profile form.
 * REQ-12: destroyed ships are excluded from the attack target list (covered by unit tests;
 *         e2e omitted — requires full combat flow to produce a wreck in-app).
 */

import { test, expect } from '@playwright/test'

// ── REQ-09: negative skill values in ship profile form ────────────────────────

test.describe('Crew skill inputs — negative values (REQ-09)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  // Crew skill inputs: min="-3" max="5" — distinct from PILOT DEX DM (min="-3" max="3")
  const crewSkillInput = (page) => page.locator('input[type="number"][min="-3"][max="5"]').first()

  test('profile form exposes crew skill inputs with min="-3"', async ({ page }) => {
    await page.getByRole('button', { name: /\+ NEW PROFILE/i }).click()
    // Add one crew member — the crew "+ Add" is first in DOM (above weapons section)
    await page.getByRole('button', { name: /\+ Add/i }).first().click()
    await expect(crewSkillInput(page)).toBeVisible()
  })

  test('crew skill input accepts a negative value', async ({ page }) => {
    await page.getByRole('button', { name: /\+ NEW PROFILE/i }).click()
    await page.getByRole('button', { name: /\+ Add/i }).first().click()
    const input = crewSkillInput(page)
    await input.fill('-2')
    await expect(input).toHaveValue('-2')
  })

  test('crew skill input rejects values below -3', async ({ page }) => {
    await page.getByRole('button', { name: /\+ NEW PROFILE/i }).click()
    await page.getByRole('button', { name: /\+ Add/i }).first().click()
    const input = crewSkillInput(page)
    await input.fill('-5')
    await input.blur()
    const val = await input.inputValue()
    expect(Number(val)).toBeGreaterThanOrEqual(-3)
  })

  test('crew skill input still accepts positive values after min change', async ({ page }) => {
    await page.getByRole('button', { name: /\+ NEW PROFILE/i }).click()
    await page.getByRole('button', { name: /\+ Add/i }).first().click()
    const input = crewSkillInput(page)
    await input.fill('4')
    await expect(input).toHaveValue('4')
  })
})
