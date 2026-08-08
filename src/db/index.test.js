// This module's export is the raw better-sqlite3 connection (a singleton
// built from `config.db.filename`), not the `Database` wrapper class -- so
// these tests exercise the module's actual public contract rather than
// reaching into its internals.
const db = require('./index');

describe('db', () => {
  it('exports a usable better-sqlite3 connection', () => {
    expect(typeof db.prepare).toBe('function');
    expect(typeof db.exec).toBe('function');
    expect(typeof db.close).toBe('function');

    const result = db.prepare('SELECT 1 + 1 AS total').get();
    expect(result.total).toBe(2);
  });

  it('closes without throwing', () => {
    expect(() => db.close()).not.toThrow();
    expect(db.open).toBe(false);
  });
});
