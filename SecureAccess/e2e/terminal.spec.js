const { test, expect } = require('@playwright/test');
const { mockBackend } = require('./helpers');

test.describe('Biometric terminal mode', () => {
  test('boots straight into the terminal (no login) with ?mode=terminal', async ({ page }) => {
    await mockBackend(page);

    // The terminal polls the local Biometric Bridge (127.0.0.1:5003) for the
    // fingerprint reader. There's no hardware in CI, so fail those calls fast
    // instead of letting them hang — the screen handles bridge errors gracefully.
    await page.route(/:5003\//, (route) => route.abort());

    await page.goto('/?mode=terminal');

    await expect(page.getByText('SERVEQUEUE™ TERMINAL')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('SYSTEM READY')).toBeVisible();

    // Terminal mode must not show the admin login card.
    await expect(
      page.getByText('Enter your credentials to access the dashboard')
    ).toHaveCount(0);
  });
});
