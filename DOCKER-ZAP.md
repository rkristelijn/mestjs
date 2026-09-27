# mestjs — Docker matrix + OWASP ZAP scan target

> ⚠️ **DO NOT DEPLOY PUBLICLY.** Everything here is intentionally insecure. It
> exists so we can configure OWASP ZAP to detect the vulnerabilities, and to
> practise on them in an isolated container. Run it on a private network only.

## What this is

The same deliberately-vulnerable NestJS API, built on **four Node.js versions**,
each container running behind a distinct port. Each Node version is pinned to a
patch that **still contains a known CVE** (one patch below the fix), so the
runtime itself is a target too — not just the app code.

| Service      | Node pin  | Host port | Base URL                    | Runtime CVE (fixed in)                         |
|--------------|-----------|-----------|-----------------------------|------------------------------------------------|
| `api-node20` | 20.19.1   | 3000      | http://localhost:3000/api   | CVE-2025-23167 HTTP request smuggling (20.19.2)|
| `api-node22` | 22.17.0   | 3002      | http://localhost:3002/api   | CVE-2025-27210 path traversal (22.17.1)        |
| `api-node24` | 24.4.0    | 3004      | http://localhost:3004/api   | CVE-2025-27209 HashDoS in V8 (24.4.1)          |
| `api-node26` | 26.0.0    | 3006      | http://localhost:3006/api   | CVE-2026-48618 TLS wildcard bypass (patched)   |

CVE sources: Node.js security releases (May 2025, July 2025, June 2026).
The docker tags were verified to exist on Docker Hub.

## Run it

```bash
# Build + start the 4 API targets
docker compose up -d --build

# Run the ZAP automation scan against all 4 (writes reports to ./zap/)
docker compose --profile scan run --rm zap

# Optional: add the Next.js frontend as an extra target
docker compose --profile web up -d

# Tear down
docker compose down
```

Reports land in `zap/mestjs-zap-report.html` and `.json`.

## The app-layer vulnerabilities ZAP is configured to find

ZAP's **passive** scanner flags response-level issues; the **active** scanner
fuzzes the parameters we seed in `zap/mestjs-scan.yaml`. Mapping:

| Vulnerability            | Where (endpoint / behaviour)                    | ZAP alert (typical)                        | Type    |
|--------------------------|-------------------------------------------------|--------------------------------------------|---------|
| SQL injection            | `GET /api/items/search?name=`                   | SQL Injection                              | active  |
| SQL injection (template) | `searchByMaxPrice` (`?max=`)                    | SQL Injection                              | active  |
| Remote code execution    | `GET /api/items/calc?expr=` (`eval`)            | Server Side Code Injection                 | active  |
| SSRF                     | `GET /api/items/proxy?url=`                     | Server Side Request Forgery                | active  |
| Information disclosure   | 500s return `stack` (leaky exception filter)    | Information Disclosure - Error/Stack Trace | passive |
| Missing security headers | no `helmet()`                                   | CSP / HSTS / X-Frame-Options / X-Content-Type missing | passive |
| CORS misconfiguration    | `Access-Control-Allow-Origin: *`               | CORS Misconfiguration                      | passive |
| Insecure session cookie  | `session` cookie w/o HttpOnly/Secure/SameSite   | Cookie No HttpOnly / Secure Flag           | passive |
| Mass assignment          | `POST /api/items/bulk` (spreads req.body)       | (surfaced via fuzzing / manual)            | active  |

> Note: the **runtime CVEs** (V8 HashDoS, TLS bypass, buffer leaks) are mostly
> *not* detectable by ZAP — ZAP scans the app over HTTP, not the Node binary.
> To surface those, scan the built images with an image scanner (e.g. Trivy) or
> test the HTTP request-smuggling case (Node 20) with a raw crafted request.
> ZAP's value here is the app-layer list above.

## Files

- `apps/api/Dockerfile` — parameterised with `ARG NODE_VERSION`; builds the Nx
  `api` bundle and rebuilds the `better-sqlite3` native module per version.
- `web/Dockerfile` — the Next.js frontend (optional target).
- `docker-compose.yml` — the 4 API services + optional `web` + the `zap` service.
- `zap/mestjs-scan.yaml` — the ZAP Automation Framework plan (spider → seed →
  passive → active → report), one context per target.
- `zap/mestjs-login-active.yaml` — a focused login/session **active** scan plan
  (see below); seeds the auth endpoints, spiders, passive-waits, active-scans.
- `zap/out/` — generated reports (`baseline-report.*`, `login-active-report.*`,
  `session-cookie-alerts.json`). Git-ignored artifacts, safe to delete.

---

# Login / session exploit-testing (the hijackable-login surface)

The matrix plan above sweeps the whole app on four Node versions. This section
is the **targeted** recipe for the deliberately-hijackable login: it shows how
to point ZAP at a *single running instance* on host `:3000` and surface the
three headline auth vulns — **flag-less session cookie**, **no rate limiting
(brute force)**, and **injection/XSS on the login+item params**.

Endpoints under test (NestJS API, global prefix `/api`):

| Route                     | Controller             | Vuln demonstrated                                              |
|---------------------------|------------------------|---------------------------------------------------------------|
| `POST /api/auth/login`    | `auth.controller.ts`   | sets `session=<JWT>` cookie with **no HttpOnly/Secure/SameSite** |
| `POST /api/login`         | `login.controller.ts`  | sets `sid=<Math.random()>` cookie, same flag-less; session fixation |
| `GET  /api/login/secure`  | `login.controller.ts`  | admits **any** valid `sid` (bare boolean, no bound user)      |
| `GET  /api/items/search`  | `items.controller.ts`  | **SQL injection** on `?name=`                                 |

## 0. Bring up ONE target on host :3000

```bash
cd ~/git/hub/mestjs
docker compose up -d --build api-node20     # → http://localhost:3000/api
curl -s http://localhost:3000/api           # {"message":"Hello API"}
```

## 1. Baseline scan (passive, fast — `zap-baseline.py`)

The baseline is passive-only and never POSTs credentials, so it catches the
*response-shaped* issues (headers, CORS, error leaks) but **not** the cookie
flags (those need a login response — see step 3). On Docker Desktop the app is
reached via `host.docker.internal`.

```bash
cd ~/git/hub/mestjs
mkdir -p zap/out
docker run --rm -v "$PWD/zap/out:/zap/wrk:rw" zaproxy/zap-stable:latest \
  zap-baseline.py \
    -t http://host.docker.internal:3000/api \
    -r baseline-report.html -J baseline-report.json -I
```

Real output (2026-09-26, ZAP 2.17.0):

```
FAIL-NEW: 0   FAIL-INPROG: 0   WARN-NEW: 4   WARN-INPROG: 0   INFO: 0   IGNORE: 0   PASS: 57
WARN-NEW: X-Content-Type-Options Header Missing [10021] x 1
WARN-NEW: Server Leaks Information via "X-Powered-By" HTTP Response Header Field(s) [10037] x 4
WARN-NEW: Cross-Domain Misconfiguration [10098] x 4          # the enableCors({origin:'*'})
WARN-NEW: Application Error Disclosure [90022] x 3           # the LeakyExceptionFilter 500s
```

(`-I` = do not fail the process on warnings; drop it in CI to gate on findings.)

## 2. Active scan of the login/session endpoints (`mestjs-login-active.yaml`)

`zap/mestjs-login-active.yaml` is a ZAP Automation Framework plan that **seeds**
the auth + item endpoints, spiders, waits for passive scan, then runs a full
**active** scan (the fuzzer that finds SQLi/XSS/injection). Mount the whole
`zap/` dir so the plan file is reachable; reports land in `zap/out/`.

```bash
cd ~/git/hub/mestjs
docker run --rm -v "$PWD/zap:/zap/wrk:rw" zaproxy/zap-stable:latest \
  zap.sh -cmd -autorun /zap/wrk/mestjs-login-active.yaml
# → zap/out/login-active-report.html + .json
```

Real active-scan alerts (2026-09-26):

```
[HIGH] SQL Injection (x1)                      -> GET  /api/items/search?name='
[MED ] Cross-Domain Misconfiguration (x4)      -> /api, /api/items, /api/items/search
[MED ] HTTP Only Site (x1)                     -> POST /api/auth/login
[LOW ] Application Error Disclosure (x3)       -> GET/POST /api/auth/login, POST /api/login
[LOW ] Server Leaks Information X-Powered-By (x5)
[LOW ] X-Content-Type-Options Header Missing (x4)
```

> Requestor caveat: this ZAP version's `requestor` job rejects per-request
> `headers`, and its POST body defaults to **form-encoding**. The NestJS
> controllers read `@Body()` as JSON, so a form-encoded login returns
> `{ok:false}` and issues no `Set-Cookie` — which is why the cookie-flag alert
> does **not** appear in this plan. To make ZAP observe the flag-less cookie you
> must send a real **JSON** login through ZAP's proxy (step 3).

## 3. Prove the flag-less session cookie through ZAP (proxy a JSON login)

Run ZAP as a daemon proxy, push a JSON login through it (so ZAP records the
`Set-Cookie` response), let the passive scanner run, then read the alerts.

```bash
cd ~/git/hub/mestjs
# start ZAP as a daemon with the API open on :8090
docker run -d --name zap-daemon -p 8090:8090 zaproxy/zap-stable:latest \
  zap.sh -daemon -host 0.0.0.0 -port 8090 \
  -config api.disablekey=true \
  -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true
sleep 25   # daemon warm-up
curl -s http://localhost:8090/JSON/core/view/version/     # {"version":"2.17.0"}

# proxy a JSON login through ZAP (host reaches the app via host.docker.internal)
curl -s -x http://localhost:8090 -X POST http://host.docker.internal:3000/api/auth/login \
  -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin"}'
curl -s -x http://localhost:8090 -X POST http://host.docker.internal:3000/api/login \
  -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin"}'
sleep 8   # let passive scan settle

# read the cookie alerts + save a JSON report
curl -s "http://localhost:8090/JSON/core/view/alerts/?baseurl=http://host.docker.internal:3000"
curl -s "http://localhost:8090/OTHER/core/other/jsonreport/" -o zap/out/session-cookie-alerts.json
docker rm -f zap-daemon
```

Real alerts (2026-09-26) — both login endpoints, both missing flags:

```
[Low] Cookie No HttpOnly Flag            -> POST /api/login       param=sid     evidence=Set-Cookie: sid
[Low] Cookie No HttpOnly Flag            -> POST /api/auth/login  param=session evidence=Set-Cookie: session
[Low] Cookie without SameSite Attribute  -> POST /api/login       param=sid
[Low] Cookie without SameSite Attribute  -> POST /api/auth/login  param=session
```

Raw response confirming the vuln (no `HttpOnly`, no `Secure`, no `SameSite`):

```
HTTP/1.1 201 Created
Set-Cookie: session=eyJhbGciOiJIUzI1Ni...; Path=/          # auth.controller.ts
Set-Cookie: sid=rua0bmlhzmq; Path=/                        # login.controller.ts (predictable token)
```

## 4. Demonstrate the missing rate limiting (brute force)

There is no throttler on the auth route, so ZAP's active fuzzer (and any client)
can send unlimited guesses. A one-liner makes it visible — every attempt is
answered, a rate-limited API would start returning `429 Too Many Requests`:

```bash
for i in $(seq 1 50); do
  curl -s -o /dev/null -w '%{http_code} ' -X POST http://localhost:3000/api/auth/login \
    -H 'Content-Type: application/json' -d "{\"username\":\"admin\",\"password\":\"guess$i\"}"
done; echo
```

Real result (2026-09-26): **50 attempts, 0 × `429`** — all `201`, no throttling.

This is the vuln that keur's `KEUR-NEST-004` rule flags statically on the NestJS
controller (see below): a NestJS `@Controller('auth'|'login')` class with a
`@Post` handler and **no** `@nestjs/throttler` guard anywhere in the class.

## Session/login vuln → detector matrix

| Vulnerability                       | Live proof (this doc)             | ZAP alert (dynamic)                     | keur rule (static)         |
|-------------------------------------|-----------------------------------|-----------------------------------------|----------------------------|
| Session cookie no HttpOnly          | step 3 raw `Set-Cookie`           | Cookie No HttpOnly Flag                 | KEUR-NEST-001, KEUR-SESS-002 |
| Session cookie no SameSite          | step 3 raw `Set-Cookie`           | Cookie without SameSite Attribute       | KEUR-SESS-002              |
| Session cookie no Secure            | step 3 raw `Set-Cookie`           | (Cookie without Secure — HTTP context)  | KEUR-SESS-002              |
| No rate limiting (brute force)      | step 4 (50 attempts, 0×429)       | (surfaced by repeated active requests)  | **KEUR-NEST-004** (new)    |
| Session fixation                    | reuses pre-auth `sid`             | (manual — cookie replay)                | KEUR-SESS-001              |
| Predictable session token           | `sid=<Math.random()>`             | (manual)                                | SEC-022                    |
| SQL injection                       | —                                 | **SQL Injection [HIGH]**                | KEUR-SQLI-002              |
| CORS misconfiguration (`origin:*`)  | `Access-Control-Allow-Origin: *`  | Cross-Domain Misconfiguration           | (main.ts FN)               |
| Error/stack-trace disclosure        | 500 bodies                        | Application Error Disclosure            | MEST-NEST-004              |
| Missing security headers            | no CSP/HSTS/X-*                    | X-Content-Type-Options Header Missing   | KEUR-NEST-002              |

Dynamic (ZAP, over HTTP) and static (keur, over source) are complementary: ZAP
proves the vuln is *exploitable on the running app*; keur catches it *in code
review before it ships*. `KEUR-NEST-004` closes the brute-force static gap that
the Express-only `SEC-036` could not see on NestJS `@Post()` controllers.

## Teardown

```bash
docker rm -f zap-daemon 2>/dev/null       # if a daemon is still up
docker compose down                        # stop the API target(s)
```
