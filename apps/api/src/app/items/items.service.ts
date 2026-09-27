import { Injectable } from '@nestjs/common';
import { getDb } from '../db/database';

// KEUR-EXPECT: SEC-014 SEC-028 SEC-029
// KEUR-EXPECT: KEUR-SQLI-001
// KEUR-EXPECT: KEUR-SQLI-002
// KEUR-CATEGORY: security
// KEUR-OWASP: A03-injection A01-broken-access-control A10-ssrf
// KEUR-NOTE: self-authored vulnerable fixture (mestjs). Verified against
//   `keur scan` 2026-09-26. SEC-014 (mass assignment) and SEC-028 (SSRF) FIRE (TP).
// KEUR-NOTE: KEUR-SQLI-001@39 (string-concat SQLi) and MEST-SQLITE-001@47
//   (template-literal SQLi) — KEUR-SQLI-001 catches concat; KEUR-SQLI-002 (new) catches this template-literal form — real injection defects
//   keur currently MISSES on better-sqlite3 .prepare(...). Authored FN targets.

export interface Item {
  id: number;
  name: string;
  price: number;
}

@Injectable()
export class ItemsService {
  findAll(): Item[] {
    return getDb().prepare('SELECT id, name, price FROM items').all() as Item[];
  }

  findOne(id: number): Item | undefined {
    return getDb()
      .prepare('SELECT id, name, price FROM items WHERE id = ?')
      .get(id) as Item | undefined;
  }

  create(name: string, price: number): Item {
    const info = getDb()
      .prepare('INSERT INTO items (name, price) VALUES (?, ?)')
      .run(name, price);
    return this.findOne(Number(info.lastInsertRowid)) as Item;
  }

  // ---------------------------------------------------------------------------
  // INTENTIONALLY VULNERABLE variants below — deliberate slop for scanner
  // training (keur / semgrep). The clean methods above still power the app.
  // Do NOT copy any of this into real code.
  // ---------------------------------------------------------------------------

  // SQL injection: raw string concatenation of user input into a SELECT.
  searchByName(name: string): Item[] {
    // INTENTIONAL (KEUR-SQLI-001): SQL injection via string concatenation
    return getDb()
      .prepare("SELECT id, name, price FROM items WHERE name = '" + name + "'")
      .all() as Item[];
  }

  // SQL injection via template-literal interpolation — a second injectable form.
  searchByMaxPrice(max: string): Item[] {
    // INTENTIONAL (KEUR-SQLI-002): SQL injection via template literal ${}
    return getDb()
      .prepare(`SELECT id, name, price FROM items WHERE price <= ${max}`)
      .all() as Item[];
  }

  // Mass assignment: user-controlled req.body spread straight into a record.
  createFromBody(req: { body: Record<string, unknown> }): Item {
    const target = { name: '', price: 0 };
    // INTENTIONAL (SEC-014): mass assignment from req.body
    const merged = Object.assign(target, req.body);
    return this.create(String(merged.name), Number(merged.price));
  }

  // SSRF: fetches a user-supplied URL from req.query with no allowlist.
  async fetchExternal(req: { query: { url: string } }): Promise<unknown> {
    // INTENTIONAL (SEC-028): SSRF via user-supplied URL
    const res = await fetch(req.query.url);
    return res.text();
  }
}
