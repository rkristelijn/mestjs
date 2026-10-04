# Known NestJS / TypeScript security issues (corpus roadmap)

A survey of notable NestJS-framework CVEs and JavaScript/TypeScript security
failures from roughly the last five years, gathered to make mestjs a *complete*
corpus — one that lets keur learn to detect the real-world issues, not just the
textbook ones. Each entry notes whether mestjs already seeds it and what a
fixture would look like.

Compiled 2026-10-04 from NVD, GitHub Advisory Database, Red Hat, Snyk/Wiz and
vendor write-ups (links inline). Dates are advisory/disclosure dates.

## NestJS framework CVEs

These are flaws *in the framework*, so a fixture reproduces the vulnerable usage
(the version/config that triggers it) rather than hand-written bad code.

| CVE | Component | Class (CWE) | Essence | In mestjs? |
|-----|-----------|-------------|---------|------------|
| CVE-2023-26108 | `@nestjs/core` `StreamableFile` | Information exposure (CWE-200) | `StreamableFile` pipe could leak data across requests; fixed in a patch release | no — add a `StreamableFile` fixture |
| CVE-2025-69211 / CVE-2026-2293 | `@nestjs/platform-fastify` | Auth/authz bypass via path normalization (CWE-290) | With Fastify path-normalization options enabled, guards/middleware can be skipped, exposing protected and admin routes; fixed in `@nestjs/platform-fastify@11.1+` | no — add a Fastify-adapter fixture |
| CVE-2026-35515 | `@nestjs/core` SSE | SSE injection → XSS/DoS (CWE-74) | `\r` / `\n` in upstream data injected into Server-Sent Events, spoofing event types and corrupting reconnection state; fixed in 11.1 | no — add an SSE endpoint fixture |
| CVE-2026-40879 | `@nestjs/microservices` TCP | Stack overflow / DoS (CWE-674) | Recursive `handleData()` on many small JSON frames overflows the call stack (~47 KB payload); `maxBufferSize` never reached; fixed in 11.1 | no — microservices transport fixture |

Takeaway: the NestJS attack surface has shifted toward **transport adapters**
(Fastify, SSE, TCP microservices). mestjs currently only exercises the Express
HTTP path, so these are blind spots. Adding a Fastify-adapter variant plus an
SSE route would let keur grow rules for the normalization-bypass and
SSE-injection classes.

## Application-level TypeScript/NestJS antipatterns (already seeded)

These are the "developer writes the bug" classes mestjs already covers, mapped
to keur rules (see `README.md` and `lucky13.md`):

- Hardcoded secrets / weak JWT / MD5 / `Math.random()` session tokens
  — `KEUR-SEC-002`, `SEC-016`, `SEC-038`, `SEC-022`.
- SQL injection via string concat / template literals — `KEUR-SQLI-001/002`.
- Mass assignment, prototype pollution, SSRF — `SEC-014`, `SEC-029`, `SEC-028`.
- Reflected + DOM XSS (`dangerouslySetInnerHTML`) — `SEC-041`, `RCT-SEC-010`.
- Session fixation + unflagged cookies — `KEUR-SESS-001/002`, `KEUR-NEST-001`.
- Missing helmet / security headers / wide-open CORS — `KEUR-NEST-001/002`,
  `SEC-040`.
- Verbose error / stack-trace leakage — `MEST-NEST-004`, `SEC-033`.

## JavaScript/TypeScript supply-chain breaches (ecosystem context)

Not code bugs in a single app, but the dominant real-world JS/TS breach class.
mestjs seeds supply-chain *patterns* for keur's `supply-chain/` rules; these are
the incidents those rules are modelled on:

- **event-stream (2018)** — maintainer handoff to a malicious actor who injected
  bitcoin-wallet-stealing code; ~8M downloads before discovery. The archetype.
- **ua-parser-js (Oct 2021)** — hijacked maintainer account shipped crypto-miner
  + password stealer in three versions.
- **coa / rc / klow-klown (2021)** — account-takeover and typosquat cryptominers.
- **chalk / debug + ~180 packages (Sept 2025)** — coordinated phishing of npm
  maintainers compromised packages with >1B combined weekly downloads.
- **axios prototype-pollution advisory (GHSA-pf86-5x62-jrwf)** — polluted
  `Object.prototype` keys read by axios without `hasOwnProperty` guards allow
  response tampering / request hijacking. Directly relevant: mestjs already
  seeds a prototype-pollution fixture (`SEC-029`).

Relevant keur coverage: `supply-chain/` rules (npm lifecycle network calls,
obfuscated postinstall, typosquatting, dependency confusion, reverse shells,
base64/hex-encoded payloads, env-var exfiltration) plus `SC-SEC-013` for the
xz backdoor shape.

## Suggested next fixtures (to complete the corpus)

Priority order, each closing a gap above:

1. **Fastify adapter + path-normalization bypass** — reproduces CVE-2025-69211 /
   CVE-2026-2293; lets keur learn an auth-bypass-by-config rule.
2. **SSE endpoint echoing upstream `\r\n`** — reproduces CVE-2026-35515
   (SSE injection); a new injection sink for the rule engine.
3. **Dynamic `require()` / `import()` of user input** — closes Lucky-13 #4 (RFI).
4. **`path.join(base, userInput)` into `fs` read** — closes Lucky-13 #5
   (directory traversal) for the Node/TS shape.
5. **Unguarded `/admin*` route** — closes Lucky-13 #7; generalises
   `KEUR-NEST-001` beyond delete/remove/drop paths.
6. **Prototype-pollution sink read without `hasOwnProperty`** — mirrors the
   axios advisory for a detection rule.

Each should follow the repo convention: a top-of-file `KEUR-EXPECT:` marker, a
co-located `INTENTIONAL (<RULE>):` comment, and (where it is a live exploit) an
`apps/api-e2e` spec that reproduces it. Verify with `./verify-markers.sh`.
