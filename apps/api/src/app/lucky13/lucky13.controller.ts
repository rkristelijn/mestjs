import { Controller, Get, Post, Query, Body, Req, Res } from '@nestjs/common';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { getDb } from '../db/database';

/**
 * lucky13.controller.ts — the CWE "Unforgivable Vulnerabilities" (Steve
 * Christey, MITRE, 2007), a.k.a. the "Lucky 13", seeded as a single cluster.
 * DELIBERATELY INSECURE FIXTURE for keur / scanner training.
 *
 * Reference: https://cwe.mitre.org/documents/unforgivable_vulns/unforgivable.pdf
 *
 * The paper lists 13 vulnerability classes so obvious, so documented, and so
 * trivially exploited that shipping one signals "a systematic disregard for
 * secure development". This file reproduces every member that is MEANINGFUL on
 * a NestJS / Node (TypeScript) stack. The purely C-level members (#1 stack
 * buffer overflow with long "A"s, #13 unchecked size to malloc, #11 Windows
 * "launch Help" priv-esc) are not expressible in a memory-safe JS runtime and
 * are documented as N/A in lucky13.md rather than faked in a foreign language.
 *
 * Every route runs; each vulnerable line is marked INTENTIONAL. Do NOT copy any
 * of this into real code.
 *
 * KEUR-EXPECT: KEUR-SQLI-001 SEC-041 SEC-038 SEC-022 SEC-034 SEC-040 KEUR-SEC-002 KEUR-SECRET-001
 * KEUR-CATEGORY: security secret
 * KEUR-OWASP: A01-broken-access-control A02-crypto-failures A03-injection A05-security-misconfiguration
 * KEUR-NOTE: self-authored vulnerable fixture (mestjs), CWE Lucky-13 cluster.
 *   Rule-ids above are what keur SHOULD raise at the annotated lines, each
 *   verified against `keur scan` (2026-10-04) => confidence:high / TP.
 * KEUR-NOTE: authored FN targets (marked INTENTIONAL below, NO rule fires yet —
 *   these are the gaps the Lucky-13 cluster exposes, documented in lucky13.md):
 *     - #4 RFI-equivalent: dynamic require('./plugins/' + name)   [no rule]
 *     - #5 directory traversal: readFileSync(path.join(base, page)) [no rule]
 *     - #10 TOCTOU symlink race: existsSync() then writeFileSync()  [BE-SEC-032 misses this shape]
 *     - #7 unguarded admin route: @Get('admin/reset') DELETE       [KEUR-NEST-001 only matches delete/remove/drop in the path]
 */

// --- Lucky 13 #12: hard-coded / undocumented account + password -------------
// A built-in backdoor account that bypasses the user table entirely.
// INTENTIONAL (KEUR-SEC-002): hardcoded admin credentials (undocumented account)
const BACKDOOR_USER = 'root';
const BACKDOOR_PASSWORD = 'Sup3rS3cr3t-backdoor!';

@Controller('lucky13')
export class Lucky13Controller {
  // --- Lucky 13 #3: SQL injection using ' in an id/identifier field ----------
  @Get('user')
  findUser(@Query('id') id: string) {
    // INTENTIONAL (KEUR-SQLI-001): id concatenated straight into the SELECT —
    // ?id=1' OR '1'='1 dumps every row.
    return getDb()
      .prepare("SELECT id, username, role FROM users WHERE id = '" + id + "'")
      .all();
  }

  // --- Lucky 13 #8: grow-your-own crypto -------------------------------------
  // Home-rolled "secure" hashing with a broken primitive plus a predictable
  // "random" salt. Contradicts advice published for decades.
  @Post('register')
  register(@Body() body: { username: string; password: string }) {
    // INTENTIONAL (SEC-022): Math.random() used to build a security salt
    const salt = Math.random().toString(36).slice(2);
    // INTENTIONAL (SEC-038): MD5 for password hashing — collisions are practical
    const hash = createHash('md5').update(salt + body.password).digest('hex');
    getDb()
      .prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
      .run(body.username, hash, 'user');
    return { ok: true, salt };
  }

  // --- Lucky 13 #9: authentication bypass using "authenticated=1" ------------
  // Trusts a client-controlled cookie as proof of authentication. The attacker
  // just sets Cookie: authenticated=1 (or role=admin) and walks in.
  @Get('account')
  account(@Req() req: { headers?: Record<string, string | undefined> }) {
    // Parse the raw Cookie header ourselves (no cookie-parser wired) — which is
    // itself the point: the server trusts whatever the client sends.
    const raw = req.headers?.cookie ?? '';
    const cookies: Record<string, string> = {};
    for (const part of raw.split(';')) {
      const [k, v] = part.split('=');
      if (k) cookies[k.trim()] = (v ?? '').trim();
    }
    // INTENTIONAL (SEC-040): client-controlled role string trusted as authz
    const isAdmin = cookies.role === 'admin';
    // The "authenticated" cookie is pure client state — forgeable with devtools.
    const authed = cookies.authenticated === '1' || isAdmin;
    return { authed, isAdmin, secret: authed ? BACKDOOR_PASSWORD : null };
  }

  // --- Lucky 13 #7: direct request to an administrator script ----------------
  // A privileged, state-changing admin endpoint with NO guard — reachable by
  // anyone who knows (or guesses) the path.
  @Get('admin/reset')
  adminReset() {
    // INTENTIONAL (FN #7): destructive admin action behind an unguarded @Get —
    // direct-request + CSRF-bypassable (A01). KEUR-NEST-001 only matches
    // delete/remove/drop in the route path, so '/admin/reset' is a current miss.
    getDb().prepare('DELETE FROM items').run();
    return { reset: true, by: BACKDOOR_USER };
  }

  // --- Lucky 13 #6: world-writable critical files ----------------------------
  // Writes a config file then chmods it so any local user can overwrite it.
  @Post('config')
  writeConfig(@Body() body: { name: string; data: string }) {
    const file = path.join('/tmp/mestjs-lucky13', body.name);
    fs.mkdirSync('/tmp/mestjs-lucky13', { recursive: true });
    fs.writeFileSync(file, body.data);
    // INTENTIONAL (SEC-034): chmod 0o777 — world-writable config file (CWE-732)
    fs.chmodSync(file, 0o777);
    return { wrote: file };
  }

  // --- Lucky 13 #10: "turtle" race condition / symlink (TOCTOU) --------------
  // Classic check-then-use: existsSync() then writeFileSync() on the same path.
  // The window between the two is wide enough that "a turtle could win the
  // race" — swap `file` for a symlink in between and the write follows it.
  @Post('report')
  saveReport(@Body() body: { name: string; data: string }) {
    const file = path.join('/tmp/mestjs-lucky13', body.name);
    // INTENTIONAL (FN #10 / BE-SEC-032): TOCTOU — existence check then unguarded
    // write; swap `file` for a symlink in the window and the write follows it.
    // BE-SEC-032's existsSync→writeFile multiline pattern misses this shape today.
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, body.data);
    }
    return { saved: file };
  }

  // --- Lucky 13 #5 + #4: directory traversal / "remote file inclusion" -------
  // Node has no PHP include($_GET[...]); the equivalent "pull a path from user
  // input and load it" smells are (a) reading an arbitrary file by joining a
  // user string onto a base dir (../../etc/passwd), and (b) require()-ing a
  // user-chosen module name (dynamic include).
  @Get('view')
  viewTemplate(@Query('page') page: string) {
    // INTENTIONAL (dir-traversal): user string joined onto base, no containment
    // check — ?page=../../../../etc/passwd escapes the templates dir.
    const file = path.join(__dirname, 'templates', page);
    return fs.readFileSync(file, 'utf8');
  }

  @Get('plugin')
  loadPlugin(@Query('name') name: string) {
    // INTENTIONAL (RFI-equivalent): dynamic require() of a user-supplied module
    // name — the Node analogue of include($_GET['dir']).
    const mod = require('./plugins/' + name);
    return { loaded: typeof mod };
  }

  // --- Lucky 13 #2: XSS using a well-formed <script> tag ---------------------
  // Reflects a query param into an HTML response with no escaping. ?q=<script>…
  // executes in the victim's browser. (The React dangerouslySetInnerHTML form
  // lives in web/src — see ItemBanner.tsx; this is the server-reflected form.)
  @Get('search')
  search(@Query('q') q: string, @Res() res: { type: (t: string) => unknown; send: (b: string) => unknown }) {
    res.type('html');
    // INTENTIONAL (SEC-041): user input reflected into HTML unescaped — a
    // well-formed <script> in ?q= executes in the victim's browser (reflected XSS).
    return res.send('<h1>Results for ' + q + '</h1>');
  }
}
