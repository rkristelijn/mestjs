import { Injectable } from '@nestjs/common';
import { getDb } from '../db/database';

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
      .prepare('SELECT id, name, price FROM items WHERE name = ' + name)
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
