import { test, expect } from '@playwright/test';

test.describe('Phase 3 — Core Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=LOCALMAN', { timeout: 15_000 });
  });

  test('create new collection via sidebar', async ({ page }) => {
    await page.getByLabel('Collections').click();
    const newCollBtn = page.getByRole('button', { name: /new collection/i });
    await newCollBtn.click();

    const input = page.locator('input[placeholder="Collection name"]');
    await expect(input).toBeVisible({ timeout: 5_000 });
    await input.fill('Test Collection');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('Test Collection')).toBeVisible({ timeout: 5_000 });
  });

  test('empty state shows "New request" button and guidance text', async ({ page }) => {
    await expect(page.getByText('Select a request from the sidebar or create a new one.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New request' })).toBeVisible();
  });

  test('clicking "New request" opens request builder with method, URL, Send', async ({ page }) => {
    // Click "New request" button in empty state
    await page.getByRole('button', { name: 'New request' }).click();
    await page.waitForTimeout(500);

    // Request builder elements should now be visible
    await expect(page.getByLabel('HTTP method')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('input[placeholder*="https://api"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
  });

  test('request tabs are visible after opening a request', async ({ page }) => {
    await page.getByRole('button', { name: 'New request' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('Params')).toBeVisible();
    await expect(page.getByText('Headers').first()).toBeVisible();
    await expect(page.getByText('Body').first()).toBeVisible();
    await expect(page.getByText('Auth')).toBeVisible();
  });

  test('response area shows empty state message', async ({ page }) => {
    await expect(
      page.getByText(/send a request/i).or(page.getByText(/select a history/i))
    ).toBeVisible({ timeout: 5_000 });
  });
});
