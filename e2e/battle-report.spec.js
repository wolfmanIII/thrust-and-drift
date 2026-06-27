/**
 * E2E tests — PDF Battle Report (v2.0 feature 2).
 * Verifies the Report button, modal content, and Print / Save PDF action.
 */

import { test, expect } from '@playwright/test'
import { startNewBattle } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await startNewBattle(page)
})

// ── Trigger ───────────────────────────────────────────────────────────────────

test('⎙ Report button is visible in the top-right controls', async ({ page }) => {
  await expect(page.getByRole('button', { name: /Report/ })).toBeVisible()
})

test('clicking ⎙ Report opens the Battle Report modal', async ({ page }) => {
  await page.getByRole('button', { name: /Report/ }).click()
  await expect(page.getByRole('heading', { name: 'BATTLE REPORT' })).toBeVisible()
})

// ── Header content ────────────────────────────────────────────────────────────

test('modal shows THRUST & DRIFT title', async ({ page }) => {
  await page.getByRole('button', { name: /Report/ }).click()
  await expect(page.getByText('THRUST & DRIFT')).toBeVisible()
})

test('modal shows current round number', async ({ page }) => {
  await page.getByRole('button', { name: /Report/ }).click()
  // Exact match on the header span — avoids ambiguity with the subtitle line
  await expect(page.getByText('Round 1', { exact: true })).toBeVisible()
})

test('modal shows "Vectorial Combat" for the default mode', async ({ page }) => {
  await page.getByRole('button', { name: /Report/ }).click()
  await expect(page.getByText('Vectorial Combat')).toBeVisible()
})

// ── Empty state ───────────────────────────────────────────────────────────────

test('roster shows "No vessels in battle" when no ships are present', async ({ page }) => {
  await page.getByRole('button', { name: /Report/ }).click()
  await expect(page.getByText(/No vessels in battle/)).toBeVisible()
})

test('log shows "No log entries" when battle has just started', async ({ page }) => {
  await page.getByRole('button', { name: /Report/ }).click()
  await expect(page.getByText(/No log entries/)).toBeVisible()
})

// ── Print ─────────────────────────────────────────────────────────────────────

test('Print / Save PDF button is visible in the modal', async ({ page }) => {
  await page.getByRole('button', { name: /Report/ }).click()
  await expect(page.getByRole('button', { name: /Print \/ Save PDF/ })).toBeVisible()
})

test('clicking Print calls window.print()', async ({ page }) => {
  // Override window.print before clicking so we can detect the call
  await page.getByRole('button', { name: /Report/ }).click()
  await page.evaluate(() => {
    window.__printCalled = false
    window.print = () => { window.__printCalled = true }
  })
  await page.getByRole('button', { name: /Print \/ Save PDF/ }).click()
  const called = await page.evaluate(() => window.__printCalled)
  expect(called).toBe(true)
})

// ── Interaction ───────────────────────────────────────────────────────────────

test('modal can be dismissed with the × close button', async ({ page }) => {
  await page.getByRole('button', { name: /Report/ }).click()
  await expect(page.getByRole('heading', { name: 'BATTLE REPORT' })).toBeVisible()
  // The × button has aria-label="Close" in Modal.jsx
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('heading', { name: 'BATTLE REPORT' })).not.toBeVisible()
})

test('modal can be dismissed with the Escape key', async ({ page }) => {
  await page.getByRole('button', { name: /Report/ }).click()
  await expect(page.getByRole('heading', { name: 'BATTLE REPORT' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'BATTLE REPORT' })).not.toBeVisible()
})

test('modal can be dismissed by clicking the backdrop', async ({ page }) => {
  await page.getByRole('button', { name: /Report/ }).click()
  await expect(page.getByRole('heading', { name: 'BATTLE REPORT' })).toBeVisible()
  // Click outside the modal panel (top-left corner of the backdrop)
  await page.mouse.click(10, 10)
  await expect(page.getByRole('heading', { name: 'BATTLE REPORT' })).not.toBeVisible()
})

