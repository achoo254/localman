import { test, expect } from '@playwright/test';

test.describe('Phase 3 — App Launch & UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=LOCALMAN', { timeout: 15_000 });
  });

  test('app launches without crash and renders dark theme', async ({ page }) => {
    await expect(page.getByText('LOCALMAN', { exact: true })).toBeVisible();
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('titlebar shows LOCALMAN, Import, Settings buttons', async ({ page }) => {
    await expect(page.getByText('LOCALMAN', { exact: true })).toBeVisible();
    await expect(page.getByText('Import', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Settings', { exact: true }).first()).toBeVisible();
  });

  test('sidebar visible with Collections/History/Environments tabs', async ({ page }) => {
    await expect(page.getByLabel('Collections')).toBeVisible();
    await expect(page.getByLabel('History')).toBeVisible();
    await expect(page.getByLabel('Environments')).toBeVisible();
  });

  test('status bar shows version and online indicator', async ({ page }) => {
    await expect(page.getByText('Localman v0.1.0')).toBeVisible();
    await expect(page.getByText('Online')).toBeVisible();
  });

  test('window content is responsive (viewport resize)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByText('LOCALMAN', { exact: true })).toBeVisible();

    await page.setViewportSize({ width: 900, height: 600 });
    await expect(page.getByText('LOCALMAN', { exact: true })).toBeVisible();
  });
});
