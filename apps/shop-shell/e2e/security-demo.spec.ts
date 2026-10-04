import { expect, test, request as pwRequest } from '@playwright/test';

/**
 * SECURITY-DEMO e2e — these tests DOCUMENT intentional vulnerabilities.
 *
 * ⚠️  These are NOT "security passing" assertions. mestjs is a deliberately
 *     vulnerable keur/ZAP training target. Each test below asserts that a KNOWN
 *     WEAKNESS is still present, so the suite doubles as living documentation of
 *     the attack surface. A GREEN test here means "the vuln is demonstrably
 *     reproducible", not "the app is secure". Do NOT copy these patterns.
 *
 * Covered:
 *   1. XSS surface — ItemBanner renders item.name via dangerouslySetInnerHTML,
 *      so an item name containing markup is injected as live DOM (unescaped).
 *   2. Hijackable session cookie — POST /api/auth/login and POST /api/login set
 *      their session cookies with EMPTY options: no HttpOnly, no SameSite, no
 *      Secure. That makes them JS-readable (XSS steals them) and sent over plain
 *      HTTP. Requires the API; auto-skips with instructions if it is not up.
 */

const API_BASE = process.env.API_BASE ?? 'http://localhost:3000/api';
const API_ITEMS = '**/api/items';

test.describe('SECURITY DEMO — intentional vulnerabilities (not passing security checks)', () => {
  test('VULN: ItemBanner injects item.name as raw HTML (XSS via dangerouslySetInnerHTML)', async ({
    page,
  }) => {
    // Feed the page an item whose name is an HTML payload. A safe app would
    // escape this to text; ItemBanner injects it as markup, so a real element
    // appears in the DOM. We use a benign <span data-xss> marker as the payload
    // (an attacker would use <img onerror> / <script>).
    const payload = '<span data-xss="1">PWNED</span>';
    await page.route(API_ITEMS, (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 99, name: payload, price: 1 }]),
      });
    });

    await page.goto('/items');

    // The banner text prefix is static; wait for it to render.
    await expect(page.getByText('Latest:')).toBeVisible();

    // DEMONSTRATION: the payload became a REAL DOM element, not escaped text.
    // If the app were safe, this selector would find nothing (the markup would
    // show up as literal text instead).
    const injected = page.locator('span[data-xss="1"]');
    await expect(injected).toHaveCount(1);
    await expect(injected).toHaveText('PWNED');

    // And the <b> the component itself injects around the name confirms the
    // dangerouslySetInnerHTML path is active (a <b> tag rendered as an element).
    await expect(page.locator('.MuiBox-root b, b').first()).toBeVisible();
  });

  test('VULN: /api/auth/login sets a session cookie with no HttpOnly / SameSite / Secure', async () => {
    const api = await pwRequest.newContext();

    // Reachability probe — if the API is down, SKIP with instructions rather
    // than fail. (A thrown network error here means "not reachable".)
    let res;
    try {
      res = await api.post(`${API_BASE}/auth/login`, {
        data: { username: 'admin', password: 'admin' },
        failOnStatusCode: false,
      });
    } catch {
      await api.dispose();
      test.skip(
        true,
        `API not reachable at ${API_BASE} — start it with ` +
          '`cd ~/git/hub/mestjs && npx nx serve api` to run this demo.'
      );
      return;
    }

    // API is up: it must have authenticated (201/200) so a cookie is emitted.
    expect(res.ok()).toBeTruthy();
    const setCookie = res.headers()['set-cookie'] ?? '';
    // eslint-disable-next-line no-console
    console.log('Set-Cookie from /api/auth/login:', setCookie);

    // There IS a session cookie...
    expect(setCookie.toLowerCase()).toContain('session=');

    // ...and it is MISSING the protective flags. These assertions PASS because
    // the vuln is present (empty cookie options in auth.controller.ts).
    expect(setCookie.toLowerCase()).not.toContain('httponly');
    expect(setCookie.toLowerCase()).not.toContain('samesite');
    expect(setCookie.toLowerCase()).not.toContain('secure');

    await api.dispose();
  });

  test('VULN: /api/login reuses/plants a JS-readable "sid" cookie (session fixation + hijack)', async () => {
    const api = await pwRequest.newContext();

    let res;
    try {
      res = await api.post(`${API_BASE}/login`, {
        data: { username: 'admin', password: 'admin' },
        failOnStatusCode: false,
      });
    } catch {
      await api.dispose();
      test.skip(
        true,
        `API not reachable at ${API_BASE} — start it with ` +
          '`cd ~/git/hub/mestjs && npx nx serve api` to run this demo.'
      );
      return;
    }

    const setCookie = res.headers()['set-cookie'] ?? '';
    // eslint-disable-next-line no-console
    console.log('Set-Cookie from /api/login:', setCookie);

    // The /login route mints/reuses a "sid" cookie with empty options.
    expect(setCookie.toLowerCase()).toContain('sid=');
    // Hijackable: no HttpOnly (JS-readable), no SameSite/Secure (CSRF + sniff).
    expect(setCookie.toLowerCase()).not.toContain('httponly');
    expect(setCookie.toLowerCase()).not.toContain('samesite');
    expect(setCookie.toLowerCase()).not.toContain('secure');

    await api.dispose();
  });
});
