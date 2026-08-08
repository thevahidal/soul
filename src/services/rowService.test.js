const Database = require('better-sqlite3');

const buildRowService = require('./rowService');

describe('rowService', () => {
  let db;
  let rowService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT);
      CREATE TABLE books (
        id INTEGER PRIMARY KEY,
        title TEXT,
        author_id INTEGER,
        FOREIGN KEY(author_id) REFERENCES authors(id)
      );
      CREATE TABLE empty_defaults (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note TEXT DEFAULT 'n/a'
      );
    `);
    db.prepare("INSERT INTO authors (name) VALUES ('Ada')").run();
    rowService = buildRowService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('save', () => {
    it('inserts a row with the given fields', () => {
      const result = rowService.save({
        tableName: 'authors',
        fields: { name: 'Grace' },
      });

      expect(result.changes).toBe(1);
      const row = db
        .prepare('SELECT * FROM authors WHERE id = ?')
        .get(result.lastInsertRowid);
      expect(row.name).toBe('Grace');
    });

    it('falls back to DEFAULT VALUES when no fields are given', () => {
      const result = rowService.save({
        tableName: 'empty_defaults',
        fields: {},
      });

      expect(result.changes).toBe(1);
      const row = db
        .prepare('SELECT * FROM empty_defaults WHERE id = ?')
        .get(result.lastInsertRowid);
      expect(row.note).toBe('n/a');
    });
  });

  describe('update', () => {
    it('updates only the given fields for the matching pk', () => {
      const { lastInsertRowid: id } = rowService.save({
        tableName: 'authors',
        fields: { name: 'Original' },
      });

      rowService.update({
        tableName: 'authors',
        lookupField: 'id',
        fields: { name: 'Renamed' },
        pks: `${id}`,
      });

      const row = db.prepare('SELECT * FROM authors WHERE id = ?').get(id);
      expect(row.name).toBe('Renamed');
    });
  });

  describe('delete', () => {
    it('deletes the row matching the given pk', () => {
      const { lastInsertRowid: id } = rowService.save({
        tableName: 'authors',
        fields: { name: 'ToDelete' },
      });

      const result = rowService.delete({
        tableName: 'authors',
        lookupField: 'id',
        pks: `${id}`,
      });

      expect(result.changes).toBe(1);
      expect(
        db.prepare('SELECT * FROM authors WHERE id = ?').get(id),
      ).toBeUndefined();
    });
  });

  describe('bulkWrite', () => {
    it('inserts multiple rows in one statement', () => {
      rowService.bulkWrite({
        tableName: 'authors',
        fields: [{ name: 'Bulk1' }, { name: 'Bulk2' }],
      });

      const count = db
        .prepare('SELECT COUNT(*) as total FROM authors')
        .get().total;
      expect(count).toBe(3); // 1 from beforeEach + 2 bulk
    });
  });

  describe('getForeignKeyInfo', () => {
    it('returns foreign key and joined table info for a valid relation', () => {
      const info = rowService.getForeignKeyInfo('books', 'author_id');

      expect(info.joinedTableName).toBe('authors');
      expect(info.joinedTableFields.map((f) => f.name)).toEqual(
        expect.arrayContaining(['id', 'name']),
      );
    });

    it('throws when the field is not a foreign key', () => {
      expect(() => rowService.getForeignKeyInfo('books', 'title')).toThrow(
        "Foreign key not found for field 'title'",
      );
    });
  });

  describe('get / getCount', () => {
    it('respects whereString/whereStringValues and pagination', () => {
      rowService.save({ tableName: 'authors', fields: { name: 'Beta' } });

      const results = rowService.get({
        tableName: 'authors',
        whereString: 'WHERE name = ?',
        whereStringValues: ['Beta'],
        limit: 10,
        page: 0,
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Beta');

      const total = rowService.getCount({
        tableName: 'authors',
        whereString: '',
        whereStringValues: [],
      });
      expect(total).toBe(2);
    });
  });
});
