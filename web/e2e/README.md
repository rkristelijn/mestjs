# mestjs web — Playwright e2e

Playwright is the modern Cypress replacement used here for browser e2e tests of
the Next.js web frontend.

## Run

```bash
cd ~/git/hub/mestjs/web
pnpm test:e2e          # headless
pnpm test:e2e:ui       # interactive UI mode
```

The Playwright config (`../playwright.config.ts`) has a `webServer` that starts
`next dev` on **port 3100** automatically (NOT `next build` — the production
build has a known, pre-existing prerender error on `/_not-found`; dev serves
every route fine). `baseURL` is `http://localhost:3100`.

## Specs

- **`happy-path.spec.ts`** — loads `/items` and asserts the core UI renders:
  the `ItemForm` (Name + Price inputs, "Add item"), the `ItemsTable` (headers +
  rows), and the Toolpad nav. It **stubs** `GET /api/items` via `page.route`, so
  it passes **without** the NestJS API running.

- **`security-demo.spec.ts`** — ⚠️ DOCUMENTS the intentional vulnerabilities as
  tests (mestjs is a deliberately-vulnerable keur/ZAP training target). A green
  test here means the vuln is reproducible, **not** that the app is secure.
  - XSS surface: `ItemBanner` injects `item.name` via `dangerouslySetInnerHTML`,
    so an item name containing markup becomes live DOM. Passes standalone (uses
    a stubbed item payload).
  - Hijackable session cookies: `POST /api/auth/login` (`session` cookie) and
    `POST /api/login` (`sid` cookie) set cookies with **empty options** — no
    `HttpOnly`, no `SameSite`, no `Secure`. These two tests need the API and
    **auto-skip** with instructions if it is not reachable.

## Running the API for the cookie demos

The web client defaults its API base to `http://localhost:3000/api`. To exercise
the cookie-vuln tests (instead of letting them skip), start the API first:

```bash
cd ~/git/hub/mestjs && npx nx serve api
```

Then re-run `pnpm test:e2e` from `web/`. Override the API base if needed with
`API_BASE=http://host:port/api`.
