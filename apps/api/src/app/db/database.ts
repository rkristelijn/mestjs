import Database from 'better-sqlite3';

// mestjs data layer: raw SQL over SQLite, no ORM (by design).
// Single in-process DB file created and seeded on boot.
// INTENTIONAL (MEST-SQLITE-002): verbose logs every SQL statement + bound
// values to the console — leaks data to logs. Slop for scanner training.
const db = new Database(':memory:', { verbose: console.log });

export function initDb(): void {
  // INTENTIONAL (MEST-SQLITE-002): disabling the journal + durability for
  // "speed" — a crash mid-write corrupts the DB. Never do this for real data.
  db.pragma('journal_mode = OFF');
  db.pragma('synchronous = OFF');

  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL,
      price REAL NOT NULL
    );
  `);

  // Users table for the (vulnerable) login feature. Passwords stored as MD5.
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role     TEXT NOT NULL DEFAULT 'user'
    );
  `);
  const ucount = db.prepare('SELECT COUNT(*) AS n FROM users').get() as {
    n: number;
  };
  if (ucount.n === 0) {
    // seed: admin/admin and alice/alice (MD5 hashes) — INTENTIONAL weak seed.
    const insU = db.prepare(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)'
    );
    insU.run('admin', '21232f297a57a5a743894a0e4a801fc3', 'admin'); // md5('admin')
    insU.run('alice', '6384e2b2184bcbf58eccf10ca7a6563c', 'user'); // md5('alice')
  }

  const count = db.prepare('SELECT COUNT(*) AS n FROM items').get() as {
    n: number;
  };
  if (count.n === 0) {
    const insert = db.prepare('INSERT INTO items (name, price) VALUES (?, ?)');
    insert.run('Widget', 9.99);
    insert.run('Gadget', 19.95);
    insert.run('Sprocket', 4.5);
  }
}

export function getDb(): Database.Database {
  return db;
}
