# keur vs semgrep on the orders app, and the promotion plan

## Does semgrep catch these too? (2026-10-04)

Ran `semgrep --config auto` on `apps/orders/src` and compared with the authored
keur rules. Per vulnerability class:

| Vulnerability | semgrep (auto) | keur (new rules) |
|---------------|----------------|------------------|
| Path traversal (`fs` on `path.join`) | ✓ finds it — **but 2 false positives** on the *secure* counterpart (`secure-counterparts.ts:79,99`) that already uses `path.resolve` + containment | ✓ `MEST-NODE-010`, **0 FP** |
| Mass assignment (`@Body()` spread) | ✗ missed | ✓ `MEST-NEST-010` |
| IDOR (`@Param()` lookup, no owner check) | ✗ missed | ✓ `MEST-NEST-011` |
| Fastify path-normalization auth bypass | ✗ missed | ✓ `MEST-NEST-012` + `013` + composite `016` |
| SSE injection (CRLF into `@Sse` data) | ✗ missed | ✓ `MEST-NEST-014` |
| Unguarded `/admin*` route | ✗ missed | ✓ `MEST-NEST-015` |
| CORS wildcard | ✓ `nestjs-header-cors-any` | ✓ `SEC-040` / `WEB-SEC-016` |

**Verdict:** on this NestJS/Fastify surface keur is clearly stronger. semgrep's
auto-config catches only the two generic classes (traversal, CORS) and misses
all five NestJS/Fastify-specific classes, and it is **less precise** on
traversal — it fired twice on the correct, contained code (false positives),
where keur fired zero. That precision gap is exactly what the
`secure-counterparts.ts` fixture + `./rule-test.sh` exist to measure.

(semgrep would do better with hand-written NestJS rules; the point is that
keur's *authored* rules now cover this surface with no false positives, verified.)

## The keur engine change this work required

One small, upstream-worthy fix in `~/git/hub/keur` (the only code change made
there this session — a 4-line diff in `src/rules/rule/engines.cpp`):

> The `multiline` engine did not evaluate a pattern's `exclude:` (pattern-not,
> ADR-007) — only the `pattern` engine did. Rules that need to suppress the
> *secure* form (ownership check present, `.replace` sanitiser present,
> `@UseGuards` present) depend on `exclude`. `eng_multiline` now checks the
> exclude regex against the window blob and skips the match if it hits.

Verification: keur's own test suite stays green (222 + 48 doctest cases, 13
shell suites, 0 failed). `docs/rules-authoring.md` updated to note multiline now
honours `exclude`, plus the "don't quote the `regex:` value" gotcha.

## Promotion — DONE (2026-10-04)

The rules and the engine fix are now committed in `~/git/hub/keur`
(commit `feat(rules,engine): NestJS/Fastify/Node security rules + multiline
exclude`) as `KEUR-NEST-010..016`, `KEUR-NODE-010..012`, `KEUR-SESS-003`, with a
`@proves` multiline-exclude test (suite green). The local `MEST-*` copies were
removed from mestjs; detection now comes from the shipped keur rules.

### Original plan (for reference)

The rules live in `keur-rules/` under the `MEST-` prefix for testing. To promote:

1. **Engine fix first.** Commit the `engines.cpp` multiline-`exclude` change in
   `~/git/hub/keur` (it is a prerequisite for 011/014/015/SESS-003), with a
   `@proves` test in `src/keur/keur_test.cpp` using a two-line window + exclude.
2. **Move + rename the rules** into `~/git/hub/keur/rules/security/`, giving each
   a stable id: `MEST-NEST-010..016` → `KEUR-NEST-020..026` (or `SEC-*`);
   `MEST-NODE-010..012` → `KEUR-NODE-010..012`; `MEST-SESS-003` → `KEUR-SESS-003`.
   Keep the `requires:` off (code-anchored) or add `requires: framework: @nestjs`
   only if keur scans from a dir where `package.json` facts resolve.
3. **Carry the regression fixture.** Copy `apps/orders/src/app/secure/
   secure-counterparts.ts` (and the session secure form) into keur's eval
   corpus as the false-positive guard, and wire `./rule-test.sh`'s TP/FP check
   into the keur rule-verification flow.
4. **Re-point mestjs.** Once promoted, drop the local `keur-rules/MEST-*`
   copies, flip the fixtures' authored-FN notes to `KEUR-EXPECT: <new-id>`, and
   re-run `./verify-markers.sh` + `./rule-test.sh` to confirm TP with the
   shipped rules.

Until promotion, mestjs stays self-contained: `KEUR_RULES_DIRS` includes
`keur-rules/`, so `./rule-test.sh` validates everything locally (11/11 TP, 0 FP).
