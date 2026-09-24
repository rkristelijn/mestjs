# mestjs

> **mest** — Dutch for *slop* / manure.

**mestjs is a deliberately bad web app.** It exists to be scanned: a realistic
NestJS + Next.js stack seeded with the security antipatterns you actually find
in the wild, used as a training/detection target for **keur** (an anti-slop code
guardrail) and other scanners (gitleaks, semgrep, OWASP ZAP).

⚠️ **Do not deploy this. Do not copy code from it.** It is intentionally
insecure, local-only, and never meant to run in production. Antipatterns are
kept on purpose and marked as such in the code.

## What's in here

A hybrid monorepo — **half Nx, half custom** — which is itself part of the slop:

```text
mestjs/
├── apps/
│   ├── api/        # NestJS backend (Nx-managed)
│   │   └── src/app/
│   │       ├── auth/       # hardcoded secrets, MD5, weak JWT (intentional)
│   │       ├── db/         # SQLite via raw SQL, no ORM (by design)
│   │       └── items/      # GET/POST /api/items + vulnerable search/proxy/bulk
│   └── api-e2e/    # Nx e2e project for the api
├── web/            # Next.js 16 + MUI frontend (standalone, made with automater —
│                   #   NOT Nx-managed; its own pnpm workspace)
├── nx.json         # Nx workspace config (covers apps/, not web/)
└── package.json    # root deps for the Nx side (npm)
```

- **api** is a real Nx project (`npm`, webpack, jest).
- **web** was generated with [automater](https://github.com/rkristelijn/automater)
  and lives outside Nx with its own `pnpm` lockfile and a Cloudflare/OpenNext
  setup that we never deploy. Two package managers, two tool worlds, one repo —
  intentional inconsistency.

## Backend: SQLite via raw SQL, no ORM

The data layer uses `better-sqlite3` with hand-written SQL (no TypeORM/Prisma/
Drizzle). The DB is in-memory and seeded on boot with three items.

## Requirements

- Node.js 20+ (developed on v24)
- npm (for the Nx side) and pnpm (for `web/`)

## Install

The Nx side has a peer-dependency conflict between `@nx/nest` and
`@nestjs/schematics` over the prettier version, so a plain `npm install` fails
with `ERESOLVE`. Use the bundled script, which carries the flag:

```bash
# from the repo root — installs the api/Nx dependencies
npm run install:deps        # == npm install --legacy-peer-deps
```

The frontend has its own workspace:

```bash
cd web && pnpm install
```

> Note: `web/` was left half-installed by automater (it mixes pnpm and npm and
> ships unfilled placeholders). This repo works around that; see
> [automater#4](https://github.com/rkristelijn/automater/issues/4).

## Run (end-to-end, local only)

Two terminals:

```bash
# 1) backend — NestJS on http://localhost:3000
npx nx serve api

# 2) frontend — Next.js on http://localhost:3001
cd web && pnpm dev -p 3001
```

Then:

```bash
curl http://localhost:3000/api/items        # -> the seeded items
curl http://localhost:3000/api/items/2       # -> one item
```

CORS on the API is wide open (`origin: '*'`) on purpose so the frontend (and
anything else) can read it.

The frontend uses the [Toolpad](https://mui.com/toolpad/) dashboard shell (side
menu + top bar), TanStack Query for data fetching and TanStack Table for the
list. There is **no central MUI theme** — everything is styled with inline `sx`
props on purpose.

> `pnpm build` (static export) currently fails while prerendering the Toolpad
> pages, which need client-side router context. `pnpm dev` works fine, and the
> app is local-only, so this is left as-is. CI runs the build as allow-failure.

## CI pipeline

`.github/workflows/ci.yml` builds the api and web, then runs a battery of
security scanners. **Every security job is allow-failure by design**: mestjs is
meant to be full of findings, so the pipeline never gates on them — it surfaces
everything.

| Job         | What it does                                              | Gates? |
|-------------|-----------------------------------------------------------|--------|
| `build`     | Builds api (Nx) + web (Next.js, web build allow-failure)  | no     |
| `lint`      | `nx run-many -t lint`                                      | no     |
| `npm-audit` | `npm audit` (api) + `pnpm audit` (web) — dependency CVEs   | no     |
| `gitleaks`  | Secret scan over full git history                          | no     |
| `semgrep`   | SAST (`--config auto`), report uploaded as artifact        | no     |
| `zap`       | OWASP ZAP baseline DAST against the running frontend        | no     |

Reports are uploaded as build artifacts (`semgrep-report`, `zap-report`) so
every issue is visible without blocking the build.

## Why the ugly hacks

- `web/wrangler.jsonc` had unfilled `<WORKER_NAME>` / `<COMPATIBILITY_DATE>`
  placeholders that crash `next build` (OpenNext validates the file even
  locally). Filled with dummy `mestjs-web-local-only` / `2025-09-01` values —
  **never deployed**.
- `web/pnpm-workspace.yaml` shipped literal `set this to true or false`
  placeholders; replaced with valid booleans.
- The OWASP security headers that automater bakes into `next.config.ts` were
  **stripped** — a slop repo shouldn't be hardened.

## Intentional antipatterns

Security antipatterns are seeded across `apps/api` and `web` and kept on purpose.
Each carries an inline comment explaining it is intentional (`INTENTIONAL
(<RULE>): ...`). They are realistic — the kind of mistakes people actually ship
— so scanners have real targets.

They are **not** suppressed with `keur:ignore`. Instead, `keur.toml` sets
`block-at = 1.01` (above the maximum confidence of 1.0), so keur still *finds*
and *reports* everything but never blocks the commit. Nothing is hidden — the
gate is simply report-only for this repo.

| Where                          | Antipattern                          | keur rule       |
|--------------------------------|--------------------------------------|-----------------|
| `apps/api/.../auth.service.ts` | Hardcoded API key / admin / DB secret | KEUR-SEC-002, KEUR-SECRET-001 |
| `apps/api/.../auth.service.ts` | Weak JWT secret (`jwt.sign`)          | SEC-016         |
| `apps/api/.../auth.service.ts` | Framework default `SECRET_KEY`        | SEC-023         |
| `apps/api/.../auth.service.ts` | `Math.random()` for session token     | SEC-022         |
| `apps/api/.../auth.service.ts` | Password logged in plaintext          | SEC-032         |
| `apps/api/.../auth.service.ts` | MD5 password hashing                  | SEC-038*        |
| `apps/api/.../items.service.ts`| SQL injection via string concat       | KEUR-SQLI-001   |
| `apps/api/.../items.service.ts`| Mass assignment from `req.body`       | SEC-014         |
| `apps/api/.../items.service.ts`| Prototype pollution (`Object.assign`) | SEC-029         |
| `apps/api/.../items.service.ts`| SSRF via user-supplied URL            | SEC-028         |
| `apps/api/src/main.ts`         | CORS wide open (`origin: '*'`)        | —               |
| `web/.../ItemBanner.tsx`       | XSS via `dangerouslySetInnerHTML`     | SEC-041         |
| `web/.../ItemBanner.tsx`       | Token logged to console               | SEC-032         |

`keur scan apps/api/src` fires 11 rules / 18 findings; `keur scan web/src` fires
SEC-041 (XSS) and SEC-032 (token logging). (Both also flag KEUR-QUAL-002 for a
missing `SECURITY.md` — a scaffold artifact, not a seeded antipattern.)

\* SEC-038 (MD5 via `createHash('md5')`) is currently a keur false-negative: the
rule's `skip_strings` blanks the `'md5'` literal its pattern needs, and the
engine strips strings per-file whenever any rule opts in. The code is left
realistic rather than bent to the regex; the engine fix is tracked in the keur
repo.

## License

MIT — see the workspace license. Use at your own (considerable) risk.
