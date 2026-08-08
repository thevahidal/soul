const Database = require('better-sqlite3');

const {
  assertValidTableName,
  assertValidColumnName,
  assertValidOperator,
  quoteIdentifier,
  quoteLiteral,
  operators,
} = require('./sql');

describe('sql utils', () => {
  let db;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)');
  });

  afterEach(() => {
    db.close();
  });

  describe('assertValidTableName', () => {
    it('returns the table name when it exists', () => {
      expect(assertValidTableName(db, 'items')).toBe('items');
    });

    it('throws a 404 error when the table does not exist', () => {
      expect(() => assertValidTableName(db, 'nope')).toThrow(/does not exist/);
      try {
        assertValidTableName(db, 'nope');
      } catch (error) {
        expect(error.status).toBe(404);
      }
    });

    it('throws for an injection payload disguised as a table name', () => {
      expect(() =>
        assertValidTableName(db, 'items; DROP TABLE items; --'),
      ).toThrow(/does not exist/);

      // table should be untouched
      expect(assertValidTableName(db, 'items')).toBe('items');
    });
  });

  describe('assertValidColumnName', () => {
    it('returns the column name when it exists', () => {
      expect(assertValidColumnName(db, 'items', 'name')).toBe('name');
    });

    it('throws a 400 error when the column does not exist', () => {
      expect(() => assertValidColumnName(db, 'items', 'bogus')).toThrow(
        /does not exist/,
      );
      try {
        assertValidColumnName(db, 'items', 'bogus');
      } catch (error) {
        expect(error.status).toBe(400);
      }
    });

    it('throws when the table itself does not exist', () => {
      expect(() => assertValidColumnName(db, 'nope', 'name')).toThrow(
        /does not exist/,
      );
    });
  });

  describe('assertValidOperator', () => {
    it('returns the SQL operator for a known key', () => {
      expect(assertValidOperator('eq')).toBe(operators.eq);
      expect(assertValidOperator('gte')).toBe(operators.gte);
    });

    it('throws for an unknown operator', () => {
      expect(() => assertValidOperator('DROP TABLE')).toThrow(
        /Invalid field operator/,
      );
    });
  });

  describe('quoteIdentifier', () => {
    it('wraps an identifier in double quotes', () => {
      expect(quoteIdentifier('name')).toBe('"name"');
    });

    it('escapes embedded double quotes', () => {
      expect(quoteIdentifier('na"me')).toBe('"na""me"');
    });
  });

  describe('quoteLiteral', () => {
    it('quotes and escapes string values', () => {
      expect(quoteLiteral("x'); DROP TABLE items; --")).toBe(
        "'x''); DROP TABLE items; --'",
      );
    });

    it('passes numbers through unquoted', () => {
      expect(quoteLiteral(42)).toBe('42');
    });

    it('maps booleans to 0/1', () => {
      expect(quoteLiteral(true)).toBe('1');
      expect(quoteLiteral(false)).toBe('0');
    });

    it('maps null/undefined to NULL', () => {
      expect(quoteLiteral(null)).toBe('NULL');
      expect(quoteLiteral(undefined)).toBe('NULL');
    });
  });
});
