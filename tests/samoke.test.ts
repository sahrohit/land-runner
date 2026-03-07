// @ts-ignore
import { test, expect } from '@playwright/test';

test.describe('React Native App Smoke Test', () => {
  // @ts-ignore
  test('app loads successfully', async ({ page }) => {
    await page.goto('http://localhost:8081');

    // Check if root element exists
    const root = page.locator('#root');
    await expect(root).toBeVisible();
  });

  // @ts-ignore
  test('main screen renders', async ({ page }) => {
    await page.goto('http://localhost:8081');

    // Example: verify main text or title
    await expect(page.getByText('Welcome')).toBeVisible();
  });

  // @ts-ignore
  test('basic interaction works', async ({ page }) => {
    await page.goto('http://localhost:8081');

    // Example button click
    const button = page.getByRole('button', { name: /start/i });
    if (await button.isVisible()) {
      await button.click();
    }

    // Verify navigation or state change
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });
});
