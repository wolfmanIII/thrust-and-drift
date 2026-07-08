/**
 * E2E tests — Hardpoint budget in ship profile form (GitHub #25).
 * CRB p.183: 1 Hardpoint per full 100 tons (Firmpoints under 100 tons).
 * HG p.31: a Large Bay costs 5 Hardpoints instead of 1.
 * Only new weapon-slot additions are blocked — existing profiles are never
 * retroactively invalidated.
 */

import { test, expect } from '@playwright/test'

test.describe('Hardpoint budget (#25)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /\+ NEW PROFILE/i }).click()
  })

  const weaponsAddButton = (page) => page.getByRole('button', { name: '+ Add' }).last()
  const weaponSelect     = (page) => page.getByRole('combobox').last()

  test('shows HARDPOINTS 0/1 at default 100-ton tonnage', async ({ page }) => {
    await expect(page.getByText('HARDPOINTS 0/1')).toBeVisible()
  })

  test('readout updates to 1/1 after filling the only Hardpoint', async ({ page }) => {
    await weaponsAddButton(page).click()
    await weaponSelect(page).selectOption('Pulse Laser')
    await expect(page.getByText('HARDPOINTS 1/1')).toBeVisible()
  })

  test('blocks a 2nd weapon slot once the 100-ton budget is used, with an inline error', async ({ page }) => {
    await weaponsAddButton(page).click()
    await weaponSelect(page).selectOption('Pulse Laser')
    await weaponsAddButton(page).click()
    await weaponSelect(page).selectOption('Beam Laser')
    await expect(page.getByText(/Hardpoint budget exceeded/i)).toBeVisible()
    await expect(page.getByText('HARDPOINTS 1/1')).toBeVisible()
  })

  test('raising tonnage to 200 allows a 2nd weapon slot', async ({ page }) => {
    await page.getByLabel('TONNAGE').fill('200')
    await weaponsAddButton(page).click()
    await weaponSelect(page).selectOption('Pulse Laser')
    await weaponsAddButton(page).click()
    await weaponSelect(page).selectOption('Beam Laser')
    await expect(page.getByText(/Hardpoint budget exceeded/i)).not.toBeVisible()
    await expect(page.getByText('HARDPOINTS 2/2')).toBeVisible()
  })

  test('a Large Bay costs 5 Hardpoints and is blocked on a 100-ton hull', async ({ page }) => {
    await weaponsAddButton(page).click()
    await weaponSelect(page).selectOption('Ion Cannon Bay (Large)')
    await expect(page.getByText(/Hardpoint budget exceeded/i)).toBeVisible()
    await expect(page.getByText('HARDPOINTS 0/1')).toBeVisible()
  })

  test('a small craft under 35 tons still gets 1 Firmpoint, not 0', async ({ page }) => {
    await page.getByLabel('TONNAGE').fill('10')
    await expect(page.getByText('HARDPOINTS 0/1')).toBeVisible()
    await weaponsAddButton(page).click()
    await weaponSelect(page).selectOption('Pulse Laser')
    await expect(page.getByText('HARDPOINTS 1/1')).toBeVisible()
  })
})
