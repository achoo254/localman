import { test, expect } from '@playwright/test';

test.describe('Phase 3 — Environments', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=LOCALMAN', { timeout: 15_000 });
  });

  test('environment bar shows "No Environment" selector', async ({ page }) => {
    await expect(page.getByText('No Environment')).toBeVisible();
  });

  test('environment bar shows "Manage" button', async ({ page }) => {
    await expect(page.getByText('Manage')).toBeVisible();
  });

  test('can open environments sidebar tab', async ({ page }) => {
    await page.getByLabel('Environments').click();
    await expect(page.getByLabel('Environments')).toBeVisible();
  });
});
