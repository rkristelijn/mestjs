import Database from 'better-sqlite3';

// mestjs data layer: raw SQL over SQLite, no ORM (by design).
// Single in-process DB file created and seeded on boot.
const db = new Database(':memory:');

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL,
      price REAL NOT NULL
    );
  `);

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
