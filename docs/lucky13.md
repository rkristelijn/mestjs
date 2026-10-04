# The Lucky 13 — CWE unforgivable vulnerabilities in mestjs

This document maps Steve Christey's **"Unforgivable Vulnerabilities"** (MITRE,
2007 — the "Lucky 13") onto the mestjs fixtures, the keur rule that should fire
for each, and whether keur actually detects it today.

> Source paper: <https://cwe.mitre.org/documents/unforgivable_vulns/unforgivable.pdf>

An "unforgivable" vulnerability is one so well-documented, so obvious, and so
trivially exploited (found within five minutes of manual review) that shipping
it signals a systematic disregard for secure development. They are the ground
floor — VAAL-0 — of any assurance scale.

## Where the cluster lives

| Path | Purpose |
|------|---------|
| `apps/api/src/app/lucky13/lucky13.controller.ts` | The vulnerable NestJS routes, one per applicable member, each marked `INTENTIONAL` |
| `apps/api/src/app/lucky13/lucky13.module.ts` | Registers the controller (wired into `app.module.ts`) |
| `apps/api/src/app/lucky13/templates/home.html` | Happy-path target for the directory-traversal route |
| `apps/api/src/app/lucky13/plugins/hello.js` | Happy-path target for the dynamic-require route |
| `apps/api-e2e/src/lucky13/lucky13.spec.ts` | e2e suite that **reproduces each exploit** against the running API |

The cluster is kept separate from the rest of mestjs so it stands on its own as
a self-contained corpus of the canonical thirteen.

## The 13, mapped

Legend: **TP** = keur detects it (verified `keur scan`, 2026-10-04).
**FN** = authored gap, no rule fires yet (a rule worth writing).
**N/A** = not expressible on a memory-safe NestJS / Node stack.

| # | Unforgivable vulnerability | mestjs fixture | keur rule | Result |
|---|----------------------------|----------------|-----------|--------|
| 1 | Buffer overflow via long "A" string | — | SEC-012 / SEC-027 (C/C++ only) | **N/A** — no manual memory in JS |
| 2 | XSS via well-formed `<script>` | `search()` reflects `?q=` into HTML; also `web/.../ItemBanner.tsx` (DOM) | SEC-041 (+ RCT-SEC-010 on web) | **TP** |
| 3 | SQL injection via `'` in an id field | `findUser()` concatenates `?id=` into SELECT | KEUR-SQLI-001 | **TP** |
| 4 | Remote file inclusion from direct input | `loadPlugin()` does `require('./plugins/'+name)` | — (no rule for dynamic require of user input) | **FN** |
| 5 | Directory traversal with `../..` | `viewTemplate()` joins `?page=` onto a base dir, no containment | — (no rule for `readFileSync(path.join(base,userInput))`) | **FN** |
| 6 | World-writable critical files | `writeConfig()` `fs.chmodSync(file, 0o777)` | SEC-034 | **TP** |
| 7 | Direct request to an admin script | `@Get('admin/reset')` deletes rows, no guard | — (KEUR-NEST-001 only matches delete/remove/drop in the path) | **FN** |
| 8 | Grow-your-own crypto | `register()` MD5 hash + `Math.random()` salt | SEC-038, SEC-022 (+ BE-SEC-033) | **TP** |
| 9 | Auth bypass via `authenticated=1` cookie | `account()` trusts a client cookie / `role=admin` | SEC-040 | **TP** |
| 10 | Turtle race condition (symlink / TOCTOU) | `saveReport()` `existsSync()` then `writeFileSync()` | BE-SEC-032 (misses this exact shape) | **FN** |
| 11 | Privilege escalation launching "help" (Windows) | — | — | **N/A** — Windows desktop concept |
| 12 | Hard-coded / undocumented account | `BACKDOOR_USER` / `BACKDOOR_PASSWORD` constants | KEUR-SEC-002, KEUR-SECRET-001 | **TP** |
| 13 | Unchecked size to `malloc()`/`calloc()` | — | SEC-027 (C/C++ only) | **N/A** — no manual allocation in JS |

**Score on this stack:** 7 of the 10 applicable members are detected (TP); 3 are
authored false-negative targets (FN) that point at concrete keur rules to write;
3 are not applicable to a JavaScript runtime (N/A).

## Why some members are N/A

Members 1, 11 and 13 are native/OS concepts — stack buffer overflows via a long
`"AAAA…"` string, unchecked `malloc()` sizes, and the Windows "launch Help then
navigate to cmd.exe" privilege escalation. None of them exist on a memory-safe
NestJS / Node stack, so faking them in a foreign language inside a TypeScript
repo would itself be slop. They belong in a dedicated C/C++ corpus (e.g. the
NIST SARD / Juliet test suite), not here. They are listed for completeness.

## The false-negative targets (rules worth writing)

These are the real value of the cluster — they show keur exactly what it misses:

- **#4 RFI-equivalent** — `require()` / dynamic `import()` whose argument is
  built from user input (`'./plugins/' + name`). The Node analogue of PHP
  `include($_GET['dir'])`. No current rule.
- **#5 directory traversal** — `fs.readFile*/open` on a `path.join(base, x)`
  where `x` is request-derived and there is no `path.resolve` containment check.
  No current rule for the TypeScript/Node shape.
- **#7 unguarded admin route** — a state-changing handler on an `/admin*` path
  with no `@UseGuards` and no global guard. `KEUR-NEST-001` only triggers on
  `delete|remove|drop` substrings in the path, so `admin/reset` slips through.
- **#10 TOCTOU** — `BE-SEC-032` has an `fs.existsSync(...)\n...fs.writeFile`
  multiline pattern but does not match the `if (!fs.existsSync(file)) { … }`
  guarded form used here.

## Verifying detection

keur is report-only in this repo (`keur.toml` sets `block-at = 1.01`), so it
surfaces everything without blocking. To check the authored ground truth:

```sh
./verify-markers.sh apps/api
```

The Lucky-13 fixture contributes 8 true-positive rule hits
(`KEUR-SQLI-001`, `SEC-041`, `SEC-038`, `SEC-022`, `SEC-034`, `SEC-040`,
`KEUR-SEC-002`, `KEUR-SECRET-001`) at 100% authored recall.

## Reproducing the exploits

The e2e suite proves each vuln is live, not just present in source:

```sh
npx nx e2e api-e2e
```

A green test means "the exploit works" — forging `Cookie: authenticated=1`
unlocks the account secret, `?id=' OR '1'='1` dumps every user, `?q=<script>`
is reflected unescaped, and so on. Do not copy any of these patterns.
