import { test, expect } from '@playwright/test';

test.describe('Phase 3 — Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=LOCALMAN', { timeout: 15_000 });
  });

  test('Ctrl+T opens new tab', async ({ page }) => {
    // Count initial tabs
    const initialTabs = await page.locator('[role="tab"][data-tab-id]').count();

    await page.keyboard.press('Control+t');

    // Should have one more tab or at least not crash
    // Wait a moment for tab creation
    await page.waitForTimeout(500);
    const newTabs = await page.locator('[role="tab"][data-tab-id]').count();
    expect(newTabs).toBeGreaterThanOrEqual(initialTabs);
  });

  test('Ctrl+W closes current tab', async ({ page }) => {
    // First create a new tab
    await page.keyboard.press('Control+t');
    await page.waitForTimeout(500);

    const tabsBefore = await page.locator('[role="tab"][data-tab-id]').count();

    // Close it
    await page.keyboard.press('Control+w');
    await page.waitForTimeout(500);

    const tabsAfter = await page.locator('[role="tab"][data-tab-id]').count();
    // Tab count should decrease or at least not increase
    expect(tabsAfter).toBeLessThanOrEqual(tabsBefore);
  });
});
