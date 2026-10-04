# orders — the second mestjs backend (NestJS + Fastify)

`apps/orders` is the second deliberately-insecure backend in mestjs. Where
`api` runs on **Express**, `orders` runs on the **Fastify** adapter
(`@nestjs/platform-fastify`), so it can seed the Fastify-specific vulnerability
classes the Express app cannot express. Concern: an **order / checkout service**
(place orders, read them, admin report, live status stream, invoice download) —
a different domain from the catalogue + auth of `api`. It runs on **port 3002**.

> Intentionally insecure. Do not deploy; do not copy. Like the rest of mestjs it
> is report-only (`keur.toml` `block-at = 1.01`): keur finds everything, blocks
> nothing.

## Running

```bash
npx nx serve orders      # http://localhost:3002/orders   (api stays on 3000)
npx nx e2e  orders-e2e   # reproduces every exploit below against the live app
```

## Why Fastify, and the pinned version

The Fastify auth-bypass (below) only exists on `@nestjs/platform-fastify`
**before 11.1.14**. mestjs pins the vulnerable **11.1.6** (and `fastify@5.4.0`)
in the root `package.json`, installed via the repo convention:

```bash
npm run install:deps     # == npm install --legacy-peer-deps
```

Both versions are pinned exactly (no `^`) because `@nestjs/platform-fastify`
11.2.x depends on a `fastify@5.11.3` that does not exist in the registry (a
broken release) — pinning keeps the install reproducible. Per-app version
overrides are not used: this is one Nx monorepo with a shared `package.json`, so
the whole repo sits on the vulnerable version. That is fine for a corpus.

## The vulnerabilities

Each is declared in source with an `@id` (keur's traceability convention,
ADR-010), proven by an e2e test tagged `@proves <id>`, and detected (or an
authored FN) by keur. `trace-coverage.sh` verifies the chain
concept → pattern → exploit → docs holds for every one.

Legend: **TP** = keur detects it, **FN** = authored gap (keur's rule is
Express-shaped and misses the NestJS/Fastify form — a concrete rule to write).

### MEST-VULN-ORDERS-AUTHBYPASS — Fastify path-normalization auth bypass
- **What:** `AdminGuard` authorizes on the *raw* url before Fastify
  canonicalises it, so a non-canonical path like `//orders/admin/report`
  reaches the admin handler without the admin role. CWE-551, CVE-2025-69211 /
  CVE-2026-2293.
- **keur:** SEC-040 (broken access control) — **TP** on the handler; the
  ordering bug itself is an **FN** (no rule models the guard/canonicalisation
  order yet).
- **Exploit:** `apps/orders-e2e` sends `//orders/admin/report` as a guest and
  gets 200 + the revenue report.
- **How it should be done:** upgrade `@nestjs/platform-fastify` to ≥ 11.1.14;
  decide authorization on an authenticated role claim, not url shape; keep
  guards declarative (`@UseGuards`) and default-deny. See `admin.guard.ts`.

### MEST-VULN-ORDERS-SSEINJECT — SSE event injection
- **What:** a client-controlled `?label=` is placed into the SSE `data` field
  without stripping `\r` / `\n`, so a CRLF payload injects extra SSE lines /
  spoofs event types. CWE-74, CVE-2026-35515.
- **keur:** **FN** — no rule models an SSE sink yet.
- **Exploit:** the e2e opens the stream with a `\n`-laden label and sees the
  injected `event: hijacked` line in the raw stream.
- **How it should be done:** reject or strip `\r` and `\n` from any value put
  into an SSE field; upgrade `@nestjs/core` to ≥ 11.1 which sanitises this.

### MEST-VULN-ORDERS-TRAVERSAL — invoice path traversal
- **What:** `GET /orders/:id/invoice?file=` joins the user filename onto a base
  dir with no containment check — `?file=../../package.json` escapes. CWE-22.
- **keur:** **FN** — the `readFileSync(path.join(base, userInput))` shape has no
  rule for TypeScript/Node yet (same gap as Lucky-13 #5).
- **Exploit:** the e2e reads the sample invoice (happy path) and then a file
  outside the invoices dir.
- **How it should be done:** never take a filesystem name from input; map the
  order id to a stored key, `path.resolve` the result and assert it stays within
  the base dir before reading.
- **Hook:** this route is a stub for a future dedicated **`invoicer`** PDF
  backend (see below); it will call that service instead of reading a file.

### MEST-VULN-ORDERS-MASSASSIGN — mass assignment
- **What:** `POST /orders` spreads the whole `@Body()` into the order, so a
  client can set `status: 'paid'` / `total: 0`. CWE-915.
- **keur:** **FN** — SEC-014 matches Express `req.body` literals; NestJS hides
  the body behind `@Body()`, so the rule needs generalising.
- **Exploit:** the e2e posts `{status:'paid', total:0}` and the order is created
  with those values.
- **How it should be done:** a typed DTO + `ValidationPipe({ whitelist: true,
  forbidNonWhitelisted: true })`; compute `status`/`total` server-side.

### MEST-VULN-ORDERS-IDOR — broken object level authorization
- **What:** `GET /orders/mine/:id` returns any order by id with no ownership
  check. OWASP API1:2023 / CWE-639.
- **keur:** **FN** — SEC-017 matches `findById(req.params.id)`; the NestJS
  `@Param()` form is a rule to write.
- **Exploit:** the e2e reads another user's order (`userId: 2`) directly.
- **How it should be done:** verify `order.userId === request.user.id` (or an
  admin role) before returning; return 404 to avoid confirming existence.

## Detection summary

| @id | keur | exploit (e2e) | docs |
|-----|------|---------------|------|
| MEST-VULN-ORDERS-AUTHBYPASS | SEC-040 TP (+ ordering FN) | ✓ | ✓ |
| MEST-VULN-ORDERS-SSEINJECT | FN | ✓ | ✓ |
| MEST-VULN-ORDERS-TRAVERSAL | FN | ✓ | ✓ |

## Cross-validation with other scanners

To confirm every security problem is flagged (not just the five seeded ones),
`apps/orders` was validated with four independent tools on 2026-10-04:

| Scanner | What it found on orders |
|---------|-------------------------|
| **keur** | TP: KEUR-NEST-001, KEUR-NEST-002, SEC-040, WEB-SEC-016 (CORS), SEC-013 (IP literal), 12F-015 (no SIGTERM). The 5 seeded vulns: 1 TP + 4 authored FN (see table above). |
| **semgrep** (`--config auto`) | 2 findings — `nestjs-header-cors-any` (main.ts) and `path-join-resolve-traversal` (the invoice route). Independent confirmation of the traversal vuln. |
| **gitleaks** | No leaks — orders seeds no hardcoded secrets (those live in `api/auth`). |
| **trivy** (`--scanners misconfig,secret`) | Clean source — orders has no Dockerfile/IaC. |
| **trivy** (`--scanners vuln`) | **40 dependency CVEs** on orders-relevant packages. Confirms the pinned stack is genuinely vulnerable, including the exact CVE we seed. |

The dependency CVEs trivy surfaces for the pinned versions include:

- `@nestjs/platform-fastify@11.1.6`: **CVE-2026-2293** (the auth-bypass we seed),
  CVE-2025-69211, CVE-2026-33011 (HEAD bypass), CVE-2026-54281 (trailing-slash
  bypass), GHSA-9c5c-9qcx-q35q (path-scoped middleware bypass).
- `@fastify/middie@9.0.3` (transitive): CVE-2026-6270 (CRITICAL), CVE-2026-2880
  (improper path normalization), CVE-2026-22031, CVE-2026-33804.
- `fastify@5.4.0`: ten CVEs (CVE-2026-25223, -33806, -76169, …).
- `axios@1.16.1`: twenty+ CVEs.

So the seeded auth-bypass is confirmed from four angles — keur (SEC-040 on the
handler), semgrep (CORS + traversal), trivy (the CVE on the pinned package), and
the e2e exploit (the live `//orders/admin/report` bypass). Reproduce with:

```bash
semgrep --config auto apps/orders/src
gitleaks detect --source apps/orders --no-git
trivy fs --scanners vuln package-lock.json
KEUR_RULES_DIRS=~/git/hub/keur/rules keur-rules --dir apps/orders/src
./trace-coverage.sh
```
| MEST-VULN-ORDERS-MASSASSIGN | FN | ✓ | ✓ |
| MEST-VULN-ORDERS-IDOR | FN | ✓ | ✓ |

`main.ts` additionally fires `KEUR-NEST-001` (TP) for the insecure adapter
configuration. The FN rows are the value this app adds to keur training: real,
exploit-proven NestJS/Fastify defects that the current Express-shaped rules miss.

## Next: the `invoicer` PDF backend

The invoice route is a placeholder for a third, separate TypeScript backend —
`invoicer` — that renders invoice PDFs. The realistic (and most vuln-rich)
approach is **HTML → PDF via Puppeteer/headless Chromium**, which naturally
carries SSRF/LFI through the HTML template (`<img src="file:///…">`,
`<iframe src="http://169.254.169.254/…">`). Alternatives: PDFKit (programmatic,
safer/less realistic), pdfmake (declarative), `@react-pdf/renderer` (reuses the
`web/` React stack). When built, `orders` will call `invoicer` instead of
reading a local file, and `invoicer` becomes its own corpus entry.
