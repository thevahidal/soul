const Database = require('better-sqlite3');

const {
  buildFilterClause,
  buildDistinct,
  buildGroupedSelect,
} = require('./query');

describe('query utils', () => {
  let db;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(
      'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT, price INTEGER)',
    );
  });

  afterEach(() => {
    db.close();
  });

  describe('buildFilterClause', () => {
    const build = (filters) => buildFilterClause(db, 'items', filters);

    it('keeps the SQL shape of the existing filters', () => {
      expect(build('id:[1,2],name__neq:a,price__gte:5')).toEqual({
        clause: 'items.id IN (?, ?) AND items.name != ? AND items.price >= ?',
        values: ['1', '2', 'a', '5'],
      });
      expect(build('name__null,price__notnull')).toEqual({
        clause: 'items.name IS NULL AND items.price IS NOT NULL',
        values: [],
      });
    });

    it('keeps colons in a value', () => {
      expect(build('name:2010-01-08 00:00:00').values).toEqual([
        '2010-01-08 00:00:00',
      ]);
    });

    it('reads quoted values and doubled quotes', () => {
      expect(build('name:"a, b: c|d"').values).toEqual(['a, b: c|d']);
      expect(build('name:"say ""hi"""').values).toEqual(['say "hi"']);
      expect(build('name:["a,b",c]').values).toEqual(['a,b', 'c']);
    });

    it('binds an empty quoted string', () => {
      expect(build('name:""')).toEqual({
        clause: 'items.name = ?',
        values: [''],
      });
    });

    it('treats an unclosed list or quote as a literal value', () => {
      expect(build('name:[a').values).toEqual(['[a']);
      expect(build('name:"a').values).toEqual(['"a']);
      expect(build('name:"a"b').values).toEqual(['"a"b']);
    });

    it('builds OR groups and NOT', () => {
      expect(build('(id:1|name:a),!price:5,!(id:2|id:3)')).toEqual({
        clause:
          '(items.id = ? OR items.name = ?) AND NOT (items.price = ?) AND NOT (items.id = ? OR items.id = ?)',
        values: ['1', 'a', '5', '2', '3'],
      });
    });

    it('builds the new operators', () => {
      expect(build('name__contains:50%_').values).toEqual(['%50\\%\\_%']);
      expect(build('name__startswith:a').values).toEqual(['a%']);
      expect(build('name__like:a_%').values).toEqual(['a_%']);
      expect(build('id__between:[1,5]').clause).toEqual(
        'items.id BETWEEN ? AND ?',
      );
      expect(build('id__notin:[1,2]').clause).toEqual('items.id NOT IN (?, ?)');
    });

    it('rejects bad input', () => {
      [
        'bogus:1',
        'name__bogus:1',
        '(id:1',
        '(id:1,name:a)',
        'id__between:1',
        'name__like:[a,b]',
        'id:1,',
      ].forEach((filters) => {
        expect(() => build(filters)).toThrow();
      });
    });

    it('sets a 400 status on an unknown column', () => {
      expect(() => build('bogus:1')).toThrow(
        expect.objectContaining({ status: 400 }),
      );
    });
  });

  describe('buildDistinct', () => {
    it('qualifies validated columns', () => {
      expect(buildDistinct(db, 'items', 'name,price')).toEqual(
        'items.name, items.price',
      );
      expect(() => buildDistinct(db, 'items', 'bogus')).toThrow();
    });
  });

  describe('buildGroupedSelect', () => {
    it('builds the select, group and alias lists', () => {
      expect(
        buildGroupedSelect(db, 'items', 'name', 'count,sum:price'),
      ).toEqual({
        schemaString:
          'items.name, COUNT(*) AS "count", SUM(items.price) AS "sum_price"',
        groupString: 'GROUP BY items.name',
        groupColumns: ['name'],
        aliases: ['count', 'sum_price'],
      });
    });

    it('allows only an aggregate or only a group', () => {
      expect(buildGroupedSelect(db, 'items', undefined, 'count')).toMatchObject(
        { groupString: '', groupColumns: [] },
      );
      expect(buildGroupedSelect(db, 'items', 'name', undefined)).toMatchObject({
        schemaString: 'items.name',
        aliases: [],
      });
    });
  });
});
