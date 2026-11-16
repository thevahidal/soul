const supertest = require('supertest');

const app = require('../index');
const db = require('../db/index');
const config = require('../config');
const { generateToken } = require('../utils');

const requestWithSupertest = supertest(app);

describe('Rows query params', () => {
  let accessToken;

  const get = (query) =>
    requestWithSupertest
      .get(`/api/tables/qtest/rows?${query}`)
      .set('Cookie', [`accessToken=${accessToken}`]);

  const filter = (filters, extra = '') =>
    get(`_filters=${encodeURIComponent(filters)}&_ordering=id${extra}`);

  const names = (res) => res.body.data.map((row) => row.name);

  beforeAll(async () => {
    accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    db.prepare(
      'CREATE TABLE qtest (id INTEGER PRIMARY KEY, name TEXT, category TEXT, price INTEGER, note TEXT)',
    ).run();
    const insert = db.prepare(
      'INSERT INTO qtest (name, category, price, note) VALUES (?, ?, ?, ?)',
    );
    [
      ['Apple', 'fruit', 3, null],
      ['Banana', 'fruit', 5, 'a,b'],
      ['Carrot', 'veg', 2, 'x:y'],
      ['Date', 'fruit', 5, 'p|q'],
      ['Eggplant', 'veg', 7, '(raw)'],
      ['Fig', 'fruit', 9, ''],
      ['Grape', 'fruit', 4, '100%'],
    ].forEach((row) => insert.run(...row));
  });

  afterAll(() => {
    db.prepare('DROP TABLE IF EXISTS qtest').run();
  });

  describe('existing _filters behavior', () => {
    it('ANDs comma-separated filters', async () => {
      const res = await filter('category:fruit,price__gte:5');
      expect(names(res)).toEqual(['Banana', 'Date', 'Fig']);
    });

    it('turns a bracketed value into IN for any operator', async () => {
      const res = await filter('id__neq:[1,2]');
      expect(res.body.data.map((row) => row.id)).toEqual([1, 2]);
    });

    it('keeps colons inside a value', async () => {
      const res = await filter('note:x:y');
      expect(names(res)).toEqual(['Carrot']);
    });

    it('returns 400 for an empty value', async () => {
      const res = await filter('note:');
      expect(res.status).toEqual(400);
    });

    it('returns 400 for an unknown operator and lists the valid ones', async () => {
      const res = await filter('price__bogus:1');
      expect(res.status).toEqual(400);
      expect(res.body.message).toContain('__between');
    });

    it('filters null values', async () => {
      const res = await filter('note__null');
      expect(names(res)).toEqual(['Apple']);
    });
  });

  describe('_ordering', () => {
    it('orders by several columns', async () => {
      const res = await get('_ordering=category,-price,name');
      expect(names(res)).toEqual([
        'Fig',
        'Banana',
        'Date',
        'Grape',
        'Apple',
        'Eggplant',
        'Carrot',
      ]);
    });

    it('returns 400 when one of the columns does not exist', async () => {
      const res = await get('_ordering=category,bogus');
      expect(res.status).toEqual(400);
    });

    it('joins a related table once when ordering by it twice', async () => {
      const res = await requestWithSupertest
        .get(
          '/api/tables/posts/rows?_ordering=userId.firstName,-userId.lastName&_extend=userId',
        )
        .set('Cookie', [`accessToken=${accessToken}`]);
      expect(res.status).toEqual(200);
    });
  });

  describe('_distinct', () => {
    it('returns unique values and a matching total', async () => {
      const res = await get('_distinct=category&_ordering=category&_limit=1');
      expect(res.status).toEqual(200);
      expect(res.body.data).toEqual([{ category: 'fruit' }]);
      expect(res.body.total).toEqual(2);
    });

    it('returns unique combinations of several columns', async () => {
      const res = await get(
        '_distinct=category,price&_ordering=category,price',
      );
      expect(res.body.data).toHaveLength(6);
      expect(res.body.total).toEqual(6);
    });

    it('returns 400 for an unknown column', async () => {
      const res = await get('_distinct=bogus');
      expect(res.status).toEqual(400);
    });

    it('returns 400 when combined with _schema', async () => {
      const res = await get('_distinct=category&_schema=name');
      expect(res.status).toEqual(400);
    });

    it('returns 400 when combined with _group_by', async () => {
      const res = await get('_distinct=category&_group_by=category');
      expect(res.status).toEqual(400);
    });
  });

  describe('operators', () => {
    it('like uses the given pattern', async () => {
      const res = await filter('name__like:A%');
      expect(names(res)).toEqual(['Apple']);
    });

    it('contains matches anywhere', async () => {
      const res = await filter('name__contains:an');
      expect(names(res)).toEqual(['Banana', 'Eggplant']);
    });

    it('startswith matches the beginning', async () => {
      const res = await filter('name__startswith:E');
      expect(names(res)).toEqual(['Eggplant']);
    });

    it('contains treats % and _ literally', async () => {
      expect(names(await filter('note__contains:%'))).toEqual(['Grape']);
      expect(names(await filter('note__contains:_'))).toEqual([]);
    });

    it('between is inclusive', async () => {
      const res = await filter('price__between:[3,5]');
      expect(names(res)).toEqual(['Apple', 'Banana', 'Date', 'Grape']);
    });

    it('between needs exactly two values', async () => {
      expect((await filter('price__between:5')).status).toEqual(400);
      expect((await filter('price__between:[1,2,3]')).status).toEqual(400);
    });

    it('in and notin take a list or a single value', async () => {
      expect(names(await filter('id__in:[1,2]'))).toEqual(['Apple', 'Banana']);
      expect(names(await filter('id__in:3'))).toEqual(['Carrot']);
      expect(names(await filter('id__notin:[1,2,3,4,5,6]'))).toEqual(['Grape']);
    });

    it('like operators reject a list', async () => {
      const res = await filter('name__like:[a,b]');
      expect(res.status).toEqual(400);
    });
  });

  describe('quoted values', () => {
    it('allows commas, colons and pipes inside quotes', async () => {
      expect(names(await filter('note:"a,b"'))).toEqual(['Banana']);
      expect(names(await filter('note:"x:y"'))).toEqual(['Carrot']);
      expect(names(await filter('note:"p|q"'))).toEqual(['Date']);
      expect(names(await filter('note:"(raw)"'))).toEqual(['Eggplant']);
    });

    it('allows quoted values inside a list and next to other filters', async () => {
      expect(names(await filter('note:["a,b","x:y"]'))).toEqual([
        'Banana',
        'Carrot',
      ]);
      expect(names(await filter('note:"a,b",category:fruit'))).toEqual([
        'Banana',
      ]);
    });

    it('matches an empty string with ""', async () => {
      expect(names(await filter('note:""'))).toEqual(['Fig']);
    });

    it('treats an unclosed or trailing-text quote literally', async () => {
      const unclosed = await filter('name:"Apple');
      expect(unclosed.status).toEqual(200);
      expect(unclosed.body.data).toEqual([]);
      expect((await filter('name:"Apple"x')).body.data).toEqual([]);
    });
  });

  describe('OR groups and NOT', () => {
    it('ORs the filters inside a group', async () => {
      const res = await filter('(category:veg|price__gte:9)');
      expect(names(res)).toEqual(['Carrot', 'Eggplant', 'Fig']);
    });

    it('ANDs a group with other filters', async () => {
      const res = await filter('(category:veg|price__gte:9),price__lt:8');
      expect(names(res)).toEqual(['Carrot', 'Eggplant']);
    });

    it('protects | inside quoted values', async () => {
      const res = await filter('(note:"p|q"|note:"a,b")');
      expect(names(res)).toEqual(['Banana', 'Date']);
    });

    it('negates a filter with !', async () => {
      const res = await filter('!category:veg');
      expect(names(res)).toEqual(['Apple', 'Banana', 'Date', 'Fig', 'Grape']);
    });

    it('negates a group with !', async () => {
      const res = await filter('!(category:veg|price__gte:9)');
      expect(names(res)).toEqual(['Apple', 'Banana', 'Date', 'Grape']);
    });

    it('negates inside a group', async () => {
      const res = await filter('(!category:fruit|id:1)');
      expect(names(res)).toEqual(['Apple', 'Carrot', 'Eggplant']);
    });

    it('excludes NULL rows when negating, like __neq', async () => {
      const res = await filter('!note:x:y');
      expect(names(res)).toEqual([
        'Banana',
        'Date',
        'Eggplant',
        'Fig',
        'Grape',
      ]);
    });

    it('returns 400 for an unclosed group', async () => {
      expect((await filter('(category:veg')).status).toEqual(400);
    });

    it('returns 400 for a comma inside a group', async () => {
      expect((await filter('(category:veg,price:2)')).status).toEqual(400);
    });

    it('returns 400 for an unknown column inside a group', async () => {
      expect((await filter('(bogus:1|id:2)')).status).toEqual(400);
    });
  });

  describe('_group_by and _aggregate', () => {
    it('groups rows and aggregates them', async () => {
      const res = await get(
        '_group_by=category&_aggregate=count,sum:price,avg:price,min:price,max:price&_ordering=category',
      );
      expect(res.status).toEqual(200);
      expect(res.body.data).toEqual([
        {
          category: 'fruit',
          count: 5,
          sum_price: 26,
          avg_price: 5.2,
          min_price: 3,
          max_price: 9,
        },
        {
          category: 'veg',
          count: 2,
          sum_price: 9,
          avg_price: 4.5,
          min_price: 2,
          max_price: 7,
        },
      ]);
      expect(res.body.total).toEqual(2);
    });

    it('orders by an aggregate alias', async () => {
      const res = await get(
        '_group_by=category&_aggregate=sum:price&_ordering=-sum_price',
      );
      expect(res.body.data.map((row) => row.category)).toEqual([
        'fruit',
        'veg',
      ]);
    });

    it('returns a single row when only _aggregate is given', async () => {
      const res = await get('_aggregate=count');
      expect(res.body.data).toEqual([{ count: 7 }]);
      expect(res.body.total).toEqual(1);
    });

    it('supports count:column', async () => {
      const res = await get('_aggregate=count:note');
      expect(res.body.data).toEqual([{ count_note: 6 }]);
    });

    it('applies _filters before grouping', async () => {
      const res = await get(
        '_filters=category:fruit&_group_by=category&_aggregate=count',
      );
      expect(res.body.data).toEqual([{ category: 'fruit', count: 5 }]);
    });

    it('groups without an aggregate', async () => {
      const res = await get('_group_by=category&_ordering=category');
      expect(res.body.data).toEqual([
        { category: 'fruit' },
        { category: 'veg' },
      ]);
    });

    it('keeps total and pagination links correct', async () => {
      const res = await get('_group_by=price&_ordering=price&_limit=2');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toEqual(6);
      expect(res.body.next).toContain('_group_by=price');
      expect(res.body.previous).toBeNull();
    });

    it('returns 400 for bad input', async () => {
      const bad = [
        '_group_by=bogus',
        '_group_by=category&_ordering=name',
        '_group_by=category&_schema=name',
        '_aggregate=median:price',
        '_aggregate=sum',
        '_aggregate=count:bogus',
        '_aggregate=sum:price:x',
        `_aggregate=${encodeURIComponent('count:price) FROM qtest --')}`,
      ];
      for (const query of bad) {
        const res = await get(query);
        expect([query, res.status]).toEqual([query, 400]);
      }
    });

    it('does not run injected SQL in _group_by', async () => {
      const res = await get(
        `_group_by=${encodeURIComponent('category;DROP TABLE qtest')}`,
      );
      expect(res.status).toEqual(400);
      expect((await get('_limit=1')).status).toEqual(200);
    });
  });
});
