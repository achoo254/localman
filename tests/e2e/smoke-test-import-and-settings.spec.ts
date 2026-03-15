import { test, expect } from '@playwright/test';

test.describe('Phase 3 — Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=LOCALMAN', { timeout: 15_000 });
  });

  test('import dialog opens with File and cURL tabs', async ({ page }) => {
    await page.getByText('Import', { exact: true }).first().click();

    // Dialog should open with title "Import"
    await expect(page.locator('[role="dialog"]').or(page.locator('.fixed')).getByText('Import')).toBeVisible({ timeout: 5_000 });

    // File and cURL tabs
    await expect(page.getByText('File', { exact: true })).toBeVisible();
    await expect(page.getByText('cURL', { exact: true })).toBeVisible();
  });

  test('cURL import tab has textarea', async ({ page }) => {
    await page.getByText('Import', { exact: true }).first().click();
    await page.waitForTimeout(300);

    // Click cURL tab
    await page.getByText('cURL', { exact: true }).click();
    await page.waitForTimeout(300);

    // Should have a textarea for cURL input
    const curlInput = page.locator('textarea');
    await expect(curlInput).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Phase 3 — Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=LOCALMAN', { timeout: 15_000 });
  });

  test('settings page opens with all navigation sections', async ({ page }) => {
    await page.getByText('Settings', { exact: true }).first().click();

    // Wait for settings page — use heading "General"
    await expect(page.getByRole('heading', { name: 'General' })).toBeVisible({ timeout: 5_000 });

    // Check all 6 nav sections exist as buttons
    const sections = ['General', 'Editor', 'Proxy', 'Data', 'Cloud Sync', 'About'];
    for (const section of sections) {
      await expect(page.getByRole('button', { name: section, exact: true })).toBeVisible();
    }
  });

  test('can navigate between settings sections', async ({ page }) => {
    await page.getByText('Settings', { exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'General' })).toBeVisible({ timeout: 5_000 });

    // Click Editor section
    await page.getByRole('button', { name: 'Editor' }).click();
    // Click About section
    await page.getByRole('button', { name: 'About' }).click();

    // Go back
    await page.getByText('Back').click();
    // Should be back to main view
    await expect(page.getByText('LOCALMAN', { exact: true })).toBeVisible({ timeout: 5_000 });
  });
});
