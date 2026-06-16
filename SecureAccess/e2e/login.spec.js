const { test, expect } = require('@playwright/test');
const { mockBackend, login } = require('./helpers');

test.describe('ServeQueue login', () => {
  test('shows the login screen on first load', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/?mode=admin');

    await expect(page.getByText('ServeQueue', { exact: true })).toBeVisible();
    await expect(page.getByText('Enter your credentials to access the dashboard')).toBeVisible();
    await expect(page.getByText('Sign In', { exact: true })).toBeVisible();
  });

  test('rejects empty submit with a validation message', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/?mode=admin');

    await page.getByText('Sign In', { exact: true }).click();
    await expect(page.getByText('Please enter both username and password')).toBeVisible();
  });

  test('shows the server error message on bad credentials', async ({ page }) => {
    await mockBackend(page, {
      overrides: {
        '/users/login': (route) =>
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Invalid username or password' }),
          }),
      },
    });

    await login(page, { username: 'admin', password: 'wrong' });
    await expect(page.getByText('Invalid username or password')).toBeVisible();
  });

  test('logs in and leaves the login screen', async ({ page }) => {
    await mockBackend(page);
    await login(page);

    // Once authenticated the login card is gone.
    await expect(
      page.getByText('Enter your credentials to access the dashboard')
    ).toHaveCount(0, { timeout: 10_000 });
  });
});
