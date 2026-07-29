import { expect, test } from '@playwright/test';

test('landing page exposes primary content and navigation', async ({ page }) => {
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, body: '{}' }));
  await page.goto('/');
  await expect(page).toHaveTitle(/Connect/i);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('a,button').filter({ hasText: /connect|sign in|start/i }).first()).toBeVisible();
});

test('unknown routes recover to the authenticated entry flow', async ({ page }) => {
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, body: '{}' }));
  await page.goto('/does-not-exist');
  await expect(page).toHaveURL(/\/login|\/chat/);
});
