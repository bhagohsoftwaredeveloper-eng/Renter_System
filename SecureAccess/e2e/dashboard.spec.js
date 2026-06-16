const { test, expect } = require('@playwright/test');
const { mockBackend, login } = require('./helpers');

test.describe('Admin dashboard', () => {
  test('renders the dashboard stat cards after login', async ({ page }) => {
    await mockBackend(page);
    await login(page);

    // Stat cards unique to the Dashboard screen.
    await expect(page.getByText('Biometric Enrolled')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Security Alerts')).toBeVisible();
    await expect(page.getByText('Renters by Floor')).toBeVisible();
  });

  test('navigates to User Management from the sidebar', async ({ page }) => {
    await mockBackend(page);
    await login(page);

    // Wait until the dashboard is up, then open the Users screen.
    await expect(page.getByText('Biometric Enrolled')).toBeVisible({ timeout: 10_000 });
    await page.getByText('Users', { exact: true }).click();

    await expect(page.getByText('User Management')).toBeVisible();
    await expect(
      page.getByText('Manage system access, roles, and security permissions.')
    ).toBeVisible();
  });
});
