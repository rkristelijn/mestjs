# keur coverage gaps — rules still missing (the point of mestjs)

mestjs exists to answer one question: **what does keur fail to catch?** Every
intentional vulnerability is authored ground truth, so every one keur stays
silent on is a concrete, reviewed **false negative (FN)** — a rule worth
writing. This file is the running backlog, compiled across both backends and
cross-checked with semgrep / trivy / gitleaks (2026-10-04).

Each gap is a live, exploit-proven defect (there is a passing e2e test that
reproduces it) that no current keur rule fires on.

## Status: gaps now closed by authored rules (2026-10-04)

All 8 backlog gaps below are now closed by rules authored from this corpus and
**shipped in keur** (`KEUR-NEST-010..016`, `KEUR-NODE-010..012`, `KEUR-SESS-003`;
committed to `~/git/hub/keur`), validated by **`./rule-test.sh`**:
**9/9 fire on the seeded vulnerabilities (TP), 0 fire on the secure
counterparts** in `apps/orders/src/app/secure/secure-counterparts.ts` (no false
positives). The new rules:

| Rule | Closes gap | Engine |
|------|-----------|--------|
| `KEUR-NEST-010` | #3 mass assignment (`@Body()` spread) | multiline |
| `KEUR-NEST-011` | #4 IDOR (`@Param()` lookup, no owner check) | multiline + exclude |
| `KEUR-NEST-012` | #5 Fastify path-normalization adapter config | multiline |
| `KEUR-NEST-013` | #5 url-string authorization in a guard | multiline |
| `KEUR-NEST-014` | #6 SSE injection (CRLF into `@Sse` data) | multiline + exclude |
| `KEUR-NEST-015` | #7 unguarded `/admin*` route | multiline + exclude |
| `KEUR-NODE-010` | #2 path traversal (`fs` on `path.join(base,x)`) | multiline + exclude |
| `KEUR-NODE-011` | #1 dynamic `require()`/`import()` of input | pattern |
| `KEUR-NODE-012` | #8 TOCTOU (`if(!existsSync){writeFile}`) | multiline |
| `KEUR-NEST-016` | #5 Fastify bypass = 012 **AND** 013 together | composite (`all`) |
| `KEUR-SESS-003` | original-app gap: session stored as bare boolean, no bound user id | multiline + exclude |

`KEUR-NEST-016` is a **composite** (ADR-009): it fires only when both the
vulnerable adapter config (012) and a url-based guard (013) are present — the
two halves of the real CVE-2026-2293 bypass — raising the pair to an error while
each leaf still warns standalone.

### Still-open FNs (genuinely infeasible for a static line rule)

Left documented, not forced into noisy rules (the author's own assessment):

- **KEUR-SESS-004** — unbounded in-process session map (growth leak). Proving
  "inserted but never evicted" needs dataflow; `dropSession()` calls `.delete`,
  so any pattern rule would false-positive on the correct form.
- **slop #34** floating promise / unawaited call — needs type info (does the
  call return a thenable?); this is why typescript-eslint's `no-floating-promises`
  is type-checker-based.
- **slop #47** emitter subscription with no matching removal — needs cross-method
  lifecycle dataflow.

Two things were needed to make these work and are worth noting for promotion:

1. **keur engine fix (committed in `~/git/hub/keur`):** the `multiline` engine
   did not evaluate a pattern's `exclude:` (pattern-not) — only `pattern` did.
   Rules 011/014/015 depend on `exclude` to suppress the secure form (ownership
   check present, `.replace` sanitiser present, `@UseGuards` present), so
   `eng_multiline` now honours `exclude` against the window blob. keur's own
   test suite stays green (13/13).
2. **Rule-authoring gotcha:** in a `.rule` file the `regex:` value is read
   verbatim — do **not** wrap it in quotes (`regex: '(?s)…'` compiles the quotes
   literally and never matches). Write it bare: `regex: (?s)…`.

### Promotion path

These are staged in mestjs under the `MEST-` prefix for testing. To promote into
keur: move each into `~/git/hub/keur/rules/security/`, rename to a stable
`KEUR-NEST-*` / `KEUR-NODE-*` (or `SEC-*`) id, keep the `secure-counterparts.ts`
case as the regression fixture, and add a `@proves` test in `keur_test.cpp`.

---

## Original backlog (for reference)

Each gap is a live, exploit-proven defect that no *stock* keur rule fires on.


## Why these are missed, in one line

Most FNs share a root cause: **keur's rules are shaped for Express / raw
Node**, matching literal tokens like `req.body`, `req.params.id`,
`include($_GET…)`. The same vulnerability in **NestJS** hides behind decorators
(`@Body()`, `@Param()`, `@Query()`) and in **Fastify** behind adapter config, so
the token the regex anchors on is absent. The vuln is identical; the surface
syntax differs.

## The backlog

| # | Gap (FN) | Where (exploit-proven) | Why keur misses it | Proposed rule |
|---|----------|------------------------|--------------------|---------------|
| 1 | **RFI-equivalent**: dynamic `require()/import()` of user input | `api` lucky13 `loadPlugin()` `require('./plugins/'+name)` | no rule for dynamic module load from a non-literal | flag `require(`/`import(` whose argument is a concatenation / template with a variable |
| 2 | **Directory traversal (Node/TS)**: `fs.read*` on `path.join(base, userInput)` | `api` lucky13 `viewTemplate()`; `orders` `invoice()` | `PY-SEC-013` is Python; no TS/Node rule for the `path.join`→`fs` shape | flag `fs.readFile*/createReadStream` on a `path.join(_, x)` where `x` is request-derived and no `path.resolve` containment follows |
| 3 | **Mass assignment (NestJS)**: `@Body()` spread into a record | `orders` `place()` `{...body}` | `SEC-014` matches `req.body` / `Object.assign(_, req.body)`; NestJS uses `@Body()` | flag object spread / `Object.assign` of a `@Body()`-bound param into a persisted entity |
| 4 | **IDOR / BOLA (NestJS)**: lookup by `@Param('id')` with no owner check | `orders` `getMine()` `findOne(Number(id))` | `SEC-017` matches `findById(req.params.id)`; NestJS uses `@Param()` | flag a store/repo lookup keyed on a `@Param()` id in a handler with no ownership/role check nearby |
| 5 | **Fastify path-normalization auth bypass** | `orders` `AdminGuard` + `main.ts` adapter opts (CVE-2026-2293) | no rule models "authorization decided on raw url before canonicalisation", nor the vulnerable `FastifyAdapter({ ignoreDuplicateSlashes / ignoreTrailingSlash })` + guard combo | composite/fact rule: `platform-fastify` present + `FastifyAdapter` with normalization opts + a guard reading `request.url` → warn (CWE-551) |
| 6 | **SSE injection**: user input into an SSE field without stripping `\r\n` | `orders` `status()` `@Sse` echoing `?label=` (CVE-2026-35515) | no rule models an SSE sink | flag a value interpolated into an `@Sse()` return / `data:` field that is request-derived and not `\r\n`-sanitised |
| 7 | **Unguarded admin route**: state-changing handler on `/admin*` with no guard | `api` lucky13 `@Get('admin/reset')` | `KEUR-NEST-001` only matches `delete\|remove\|drop` substrings in the path | generalise: any `@Get/@Post` on a path containing `admin` with no `@UseGuards` and no global guard → warn |
| 8 | **TOCTOU (guarded form)**: `if (!fs.existsSync(f)) { fs.writeFile(f) }` | `api` lucky13 `saveReport()` | `BE-SEC-032` matches the un-guarded `existsSync()\n…writeFile` sequence, not the `if (!existsSync) { … }` wrapper | widen `BE-SEC-032` to match the negated-guard form |

## Already caught (for contrast — the TPs)

So the corpus is not all gaps. keur already detects, exploit-confirmed:
`KEUR-SQLI-001` (SQLi), `SEC-041` (reflected XSS), `SEC-038` + `SEC-022`
(grow-your-own crypto), `SEC-034` (world-writable), `SEC-040` + `WEB-SEC-016`
(broken access control / CORS), `KEUR-SEC-002` + `KEUR-SECRET-001` (hardcoded
account), `KEUR-NEST-001/002/003` (insecure NestJS config). The dependency CVEs
(incl. the Fastify auth-bypass package itself) are caught by **trivy**, which
keur does not duplicate.

## How to use this backlog

These are ideal `keur train` targets: the ground truth already exists (the
`KEUR-EXPECT` / `@id` markers + passing exploit tests), so each gap can be fed
to the learning loop as a missed case. When a new rule lands, flip the FN to TP:
move the rule-id into the fixture's `KEUR-EXPECT` and re-run `./verify-markers.sh`
(for `api`) or the orders scan + `./trace-coverage.sh`.

Priority (impact × how common): **5 (Fastify bypass)**, **3 (mass assignment)**,
**4 (IDOR)** — these are the NestJS-shaped versions of top-10 classes that any
NestJS codebase will hit. 2 (traversal) and 6 (SSE) close the remaining
exploit-proven gaps.
