/**
 * E2E tests — Discrete zoom levels (v2.0 feature 1).
 * Verifies C/T/S buttons, active state, and keyboard shortcuts 1/2/3.
 */

import { test, expect } from '@playwright/test'
import { startNewBattle } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await startNewBattle(page)
})

// ── Rendering ─────────────────────────────────────────────────────────────────

test('zoom buttons C, T and S are visible on the battle map', async ({ page }) => {
  await expect(page.getByTitle('Close (1)')).toBeVisible()
  await expect(page.getByTitle('Tactical (2)')).toBeVisible()
  await expect(page.getByTitle('Strategic (3)')).toBeVisible()
})

test('TACTICAL button is active by default', async ({ page }) => {
  await expect(page.getByTitle('Tactical (2)')).toHaveClass(/border-cyan-600/)
  await expect(page.getByTitle('Close (1)')).not.toHaveClass(/border-cyan-600/)
  await expect(page.getByTitle('Strategic (3)')).not.toHaveClass(/border-cyan-600/)
})

// ── Button clicks ─────────────────────────────────────────────────────────────

test('clicking Close activates it and deactivates Tactical', async ({ page }) => {
  await page.getByTitle('Close (1)').click()
  await expect(page.getByTitle('Close (1)')).toHaveClass(/border-cyan-600/)
  await expect(page.getByTitle('Tactical (2)')).not.toHaveClass(/border-cyan-600/)
})

test('clicking Strategic activates it', async ({ page }) => {
  await page.getByTitle('Strategic (3)').click()
  await expect(page.getByTitle('Strategic (3)')).toHaveClass(/border-cyan-600/)
  await expect(page.getByTitle('Tactical (2)')).not.toHaveClass(/border-cyan-600/)
})

test('cycling through all three levels works correctly', async ({ page }) => {
  await page.getByTitle('Close (1)').click()
  await expect(page.getByTitle('Close (1)')).toHaveClass(/border-cyan-600/)

  await page.getByTitle('Strategic (3)').click()
  await expect(page.getByTitle('Strategic (3)')).toHaveClass(/border-cyan-600/)
  await expect(page.getByTitle('Close (1)')).not.toHaveClass(/border-cyan-600/)

  await page.getByTitle('Tactical (2)').click()
  await expect(page.getByTitle('Tactical (2)')).toHaveClass(/border-cyan-600/)
})

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

test('key "1" activates CLOSE', async ({ page }) => {
  await page.keyboard.press('1')
  await expect(page.getByTitle('Close (1)')).toHaveClass(/border-cyan-600/)
})

test('key "2" activates TACTICAL', async ({ page }) => {
  // Switch away first so the state change is detectable
  await page.keyboard.press('3')
  await page.keyboard.press('2')
  await expect(page.getByTitle('Tactical (2)')).toHaveClass(/border-cyan-600/)
})

test('key "3" activates STRATEGIC', async ({ page }) => {
  await page.keyboard.press('3')
  await expect(page.getByTitle('Strategic (3)')).toHaveClass(/border-cyan-600/)
})

test('keyboard shortcuts 1/2/3 cycle through all levels', async ({ page }) => {
  await page.keyboard.press('1')
  await expect(page.getByTitle('Close (1)')).toHaveClass(/border-cyan-600/)

  await page.keyboard.press('2')
  await expect(page.getByTitle('Tactical (2)')).toHaveClass(/border-cyan-600/)

  await page.keyboard.press('3')
  await expect(page.getByTitle('Strategic (3)')).toHaveClass(/border-cyan-600/)
})

// ── Modal guard ───────────────────────────────────────────────────────────────

test('keyboard shortcuts are blocked while a modal is open', async ({ page }) => {
  // Open the Legend modal
  await page.getByRole('button', { name: /Legend/ }).click()
  // The modal title is "📖 Legend" (see Modal.jsx — title prop rendered as-is)
  await expect(page.getByRole('heading', { name: /Legend/ })).toBeVisible()

  // Key "1" should NOT change the active zoom level while the modal is open
  await page.keyboard.press('1')

  // Close modal and verify TACTICAL is still active (unchanged)
  await page.keyboard.press('Escape')
  await expect(page.getByTitle('Tactical (2)')).toHaveClass(/border-cyan-600/)
})
