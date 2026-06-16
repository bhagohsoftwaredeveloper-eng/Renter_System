// Shared test helpers for ServeQueue web E2E.
// The app talks to the backend over axios/fetch at `${API_BASE_URL}/...`
// (default http://localhost:5005/api). We intercept every /api/** call so tests
// are deterministic and need no live backend or database.

const SUPER_ADMIN = {
  id: 1,
  name: 'Test Admin',
  username: 'admin',
  role: 'Super Admin',
};

/**
 * Register default API mocks. Returns the fake auth payload login resolves to.
 * Pass overrides keyed by URL substring to customize individual endpoints.
 */
async function mockBackend(page, { user = SUPER_ADMIN, overrides = {} } = {}) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();

    for (const [needle, handler] of Object.entries(overrides)) {
      if (url.includes(needle)) return handler(route);
    }

    if (url.includes('/users/login')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user, token: 'fake-jwt-token' }),
      });
    }

    // Audit log writes, registrations, expired meal tickets, etc. — default empty.
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  return { user };
}

/** Log in through the real UI with the mocked backend already installed. */
async function login(page, { username = 'admin', password = 'password123' } = {}) {
  await page.goto('/?mode=admin');
  await page.getByPlaceholder('admin').fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.getByText('Sign In', { exact: true }).click();
}

module.exports = { mockBackend, login, SUPER_ADMIN };
