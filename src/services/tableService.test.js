const Database = require('better-sqlite3');

const buildTableService = require('./tableService');

describe('tableService', () => {
  let db;
  let tableService;

  beforeEach(() => {
    db = new Database(':memory:');
    tableService = buildTableService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('createTable', () => {
    it('creates a table with an auto id and timestamp columns by default', () => {
      tableService.createTable('widgets', [{ name: 'title', type: 'TEXT' }]);

      const columns = db.prepare('PRAGMA table_info(widgets)').all();
      const names = columns.map((c) => c.name);
      expect(names).toEqual(
        expect.arrayContaining(['id', 'title', 'createdAt', 'updatedAt']),
      );
    });

    it('omits createdAt/updatedAt when disabled', () => {
      tableService.createTable(
        'no_timestamps',
        [{ name: 'title', type: 'TEXT' }],
        { autoAddCreatedAt: false, autoAddUpdatedAt: false },
      );

      const columns = db.prepare('PRAGMA table_info(no_timestamps)').all();
      const names = columns.map((c) => c.name);
      expect(names).not.toEqual(
        expect.arrayContaining(['createdAt', 'updatedAt']),
      );
    });

    it('respects an explicit primary key instead of adding an auto id', () => {
      tableService.createTable('explicit_pk', [
        { name: 'code', type: 'TEXT', primaryKey: true },
      ]);

      const columns = db.prepare('PRAGMA table_info(explicit_pk)').all();
      expect(columns.find((c) => c.name === 'id')).toBeUndefined();
      expect(columns.find((c) => c.name === 'code').pk).toBe(1);
    });

    it('applies unique, notNull, and foreign key constraints', () => {
      tableService.createTable('parents', [
        { name: 'label', type: 'TEXT', primaryKey: true },
      ]);
      tableService.createTable('children', [
        {
          name: 'parent_label',
          type: 'TEXT',
          notNull: true,
          unique: true,
          foreignKey: {
            table: 'parents',
            column: 'label',
            onDelete: 'CASCADE',
            onUpdate: 'RESTRICT',
          },
        },
      ]);

      const fks = db.prepare('PRAGMA foreign_key_list(children)').all();
      expect(fks[0]).toMatchObject({
        table: 'parents',
        from: 'parent_label',
        to: 'label',
        on_delete: 'CASCADE',
        on_update: 'RESTRICT',
      });
    });

    it('applies a multi-column unique constraint', () => {
      tableService.createTable(
        'combo_unique',
        [
          { name: 'a', type: 'TEXT' },
          { name: 'b', type: 'TEXT' },
        ],
        {
          multipleUniqueConstraints: {
            name: 'unique_a_b',
            fields: ['a', 'b'],
          },
        },
      );

      db.prepare("INSERT INTO combo_unique (a, b) VALUES ('x', 'y')").run();
      expect(() =>
        db.prepare("INSERT INTO combo_unique (a, b) VALUES ('x', 'y')").run(),
      ).toThrow();
    });

    it('logs instead of throwing when the CREATE TABLE statement fails', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // duplicate column names are a genuine SQLite error
      expect(() =>
        tableService.createTable('bad_table', [
          { name: 'x', type: 'TEXT' },
          { name: 'x', type: 'TEXT' },
        ]),
      ).not.toThrow();

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('listTables', () => {
    beforeEach(() => {
      tableService.createTable('apples', [{ name: 'x', type: 'TEXT' }], {
        autoAddCreatedAt: false,
        autoAddUpdatedAt: false,
      });
      tableService.createTable('bananas', [{ name: 'x', type: 'TEXT' }], {
        autoAddCreatedAt: false,
        autoAddUpdatedAt: false,
      });
    });

    it('lists all tables with no options', () => {
      const tables = tableService.listTables().map((t) => t.name);
      expect(tables).toEqual(expect.arrayContaining(['apples', 'bananas']));
    });

    it('filters by search', () => {
      const tables = tableService.listTables({ search: 'app' });
      expect(tables).toEqual([{ name: 'apples' }]);
    });

    it('excludes the given table names', () => {
      const tables = tableService
        .listTables({ exclude: ['apples'] })
        .map((t) => t.name);
      expect(tables).not.toContain('apples');
      expect(tables).toContain('bananas');
    });

    it('orders ascending and descending by name', () => {
      const asc = tableService
        .listTables({ ordering: 'name' })
        .map((t) => t.name);
      const desc = tableService
        .listTables({ ordering: '-name' })
        .map((t) => t.name);

      expect(asc.indexOf('apples')).toBeLessThan(asc.indexOf('bananas'));
      expect(desc.indexOf('apples')).toBeGreaterThan(desc.indexOf('bananas'));
    });

    it('logs instead of throwing on a malformed query', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // exclude with an empty array still hits the query path but with no
      // rows to bind -- force a real failure via a closed db instead.
      db.close();
      expect(() => tableService.listTables()).not.toThrow();

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('checkTableExists', () => {
    it('returns the row when the table exists', () => {
      tableService.createTable('exists_test', [{ name: 'x', type: 'TEXT' }]);
      expect(tableService.checkTableExists('exists_test')).toMatchObject({
        name: 'exists_test',
      });
    });

    it('returns undefined when the table does not exist', () => {
      expect(tableService.checkTableExists('nope')).toBeUndefined();
    });

    it('treats an injection payload as a literal value, not SQL', () => {
      expect(tableService.checkTableExists("x' OR '1'='1")).toBeUndefined();
    });
  });
});
