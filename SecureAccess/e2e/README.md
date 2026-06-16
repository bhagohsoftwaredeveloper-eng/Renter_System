# ServeQueue (SecureAccess) — Playwright E2E

End-to-end tests for the **web build** of ServeQueue. This is the same bundle
that ships inside the Electron desktop app (`dist/`), so testing it in a browser
exercises the real Admin/Terminal UI.

## How it works

- Tests run against the exported Expo web bundle in `dist/`, served by a tiny
  zero-dependency static server (`e2e/static-server.js`) on port **8081**.
- The backend is **mocked per test** via `page.route('**/api/**', …)`
  (see `e2e/helpers.js`), so no live API/database is required and tests are
  deterministic.
- App mode is selected with a query param: `/?mode=admin` or `/?mode=terminal`.

## Running

```bash
# 1. Build the web bundle (only when source changed / dist/ is stale)
npm run build:web

# 2. Run the tests (Playwright auto-starts the static server)
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# Open the HTML report after a run
npm run test:e2e:report
```

## Notes

- The UI is React Native Web + react-native-paper and has **no `testID`s** yet,
  so selectors use visible text / placeholders / input types. For more robust
  selectors, add `testID="..."` props in the screens — react-native-web maps
  them to `data-testid`, usable via `page.getByTestId(...)`.
- Auth is in-memory only (no localStorage), so tests log in through the real UI
  with the mocked `/users/login` endpoint. See `login()` in `helpers.js`.
- To test the actual Electron shell instead of the browser, Playwright's
  `_electron` API can launch `electron electron/main.js --admin`. Not set up
  here — the web build covers the same screens with far less flakiness.
