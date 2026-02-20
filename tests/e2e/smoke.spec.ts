import { expect, test } from '@playwright/test'

test('loads Signal Runner HUD and supports basic controls', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Signal Runner' })).toBeVisible()
  await expect(page.getByText('Objective:')).toBeVisible()

  await page.getByRole('button', { name: 'Pause Run' }).click()
  await expect(page.getByRole('button', { name: 'Resume Run' })).toBeVisible()
  await page.getByRole('button', { name: 'Resume Run' }).click()

  await page.keyboard.press('q')
  await expect(page.locator('.ability-button').first().locator('.cooldown-time')).toBeVisible()
})
