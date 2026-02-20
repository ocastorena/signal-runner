import { expect, test } from '@playwright/test'

test('loads runner HUD and basic controls', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Signal Runner' })).toBeVisible()
  await expect(page.getByText('Temple-run style packet escape')).toBeVisible()

  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowUp')

  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
})
