import { test, expect } from '@playwright/test';

test('admin login page should load', async ({ page }) => {
  await page.goto('/login');
  
  // Check for the login heading or a specific element
  await expect(page.locator('text=MVSA ADMIN')).toBeVisible();
});
