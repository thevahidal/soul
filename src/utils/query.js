const {
  operators,
  invalidRequestError,
  quoteIdentifier,
  assertValidColumnName,
  assertValidOperator,
  assertValidAggregate,
} = require('./sql');

const likeOperators = ['like', 'contains', 'startswith'];

// A quoted value ("a, b") is only quoted if the closing quote ends the value.
const readQuoted = (s, i, stops) => {
  let value = '';
  let j = i + 1;
  while (j < s.length) {
    if (s[j] === '"') {
      if (s[j + 1] === '"') {
        value += '"';
        j += 2;
        continue;
      }
      const next = j + 1;
      return next === s.length || stops.includes(s[next])
        ? { value, next, quoted: true }
        : null;
    }
    value += s[j++];
  }
  return null;
};

const readRaw = (s, i, stops) => {
  let j = i;
  while (j < s.length && !stops.includes(s[j])) {
    j++;
  }
  return { value: s.slice(i, j), next: j };
};

const readScalar = (s, i, stops) =>
  (s[i] === '"' && readQuoted(s, i, stops)) || readRaw(s, i, stops);

// [a,b,"c,d"]; falls back to a literal value when the bracket is not closed.
const readList = (s, i, stops) => {
  const values = [];
  let j = i + 1;
  for (;;) {
    const item = readScalar(s, j, [',', ']']);
    values.push(item.value);
    j = item.next;
    if (s[j] === ',') {
      j++;
    } else if (
      s[j] === ']' &&
      (j + 1 === s.length || stops.includes(s[j + 1]))
    ) {
      return { value: values, next: j + 1 };
    } else {
      return null;
    }
  }
};

const readCondition = (s, i, stops) => {
  let negate = false;
  if (s[i] === '!') {
    negate = true;
    i++;
  }
  const key = readRaw(s, i, [':', ...stops]);
  if (s[key.next] !== ':') {
    return { negate, key: key.value, value: '', next: key.next };
  }
  const start = key.next + 1;
  const value =
    (s[start] === '[' && readList(s, start, stops)) ||
    readScalar(s, start, stops);
  return { negate, key: key.value, ...value };
};

// A term is one filter or a (a|b) group; terms are ANDed together.
const readTerm = (s, i) => {
  let negate = false;
  if (s[i] === '!' && s[i + 1] === '(') {
    negate = true;
    i++;
  }
  if (s[i] !== '(') {
    const condition = readCondition(s, i, [',']);
    return { negate: false, alternatives: [condition], next: condition.next };
  }

  const alternatives = [];
  let j = i + 1;
  for (;;) {
    const condition = readCondition(s, j, ['|', ')', ',']);
    alternatives.push(condition);
    j = condition.next;
    if (s[j] === '|') {
      j++;
    } else if (s[j] === ')' && (j + 1 === s.length || s[j + 1] === ',')) {
      return { negate, alternatives, next: j + 1 };
    } else {
      throw invalidRequestError(
        `Invalid group in _filters near '${s.slice(i)}'`,
      );
    }
  }
};

const parseFilters = (s) => {
  const terms = [];
  let i = 0;
  for (;;) {
    const term = readTerm(s, i);
    terms.push(term);
    if (term.next >= s.length) {
      return terms;
    }
    i = term.next + 1;
  }
};

const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');

const buildCondition = (db, tableName, condition) => {
  const [field, operatorKey] = condition.key.split('__');
  const key = operatorKey || 'eq';
  const { value } = condition;

  assertValidColumnName(db, tableName, field);
  let operator;
  try {
    operator = assertValidOperator(key);
  } catch {
    throw new Error(
      `Invalid field operator '${key}' for field '${field}'. You can only use the following operators after the '${field}' field: ${Object.keys(
        operators,
      )
        .map((name) => `__${name}`)
        .join(', ')}.`,
    );
  }

  const column = `${tableName}.${field}`;
  const placeholders = (list) => list.map(() => '?').join(', ');

  if (key === 'null' || key === 'notnull') {
    return { sql: `${column} ${operator}`, values: [] };
  }

  if (key === 'between') {
    if (!Array.isArray(value) || value.length !== 2) {
      throw invalidRequestError(
        `'${field}__between' needs two values, e.g. ${field}__between:[1,10]`,
      );
    }
    return { sql: `${column} BETWEEN ? AND ?`, values: value };
  }

  if (key === 'in' || key === 'notin') {
    const list = Array.isArray(value) ? value : [value];
    return {
      sql: `${column} ${operator} (${placeholders(list)})`,
      values: list,
    };
  }

  if (likeOperators.includes(key)) {
    if (Array.isArray(value)) {
      throw invalidRequestError(`'${field}__${key}' takes a single value`);
    }
    const pattern = {
      like: value,
      contains: `%${escapeLike(value)}%`,
      startswith: `${escapeLike(value)}%`,
    }[key];
    return { sql: `${column} LIKE ? ESCAPE '\\'`, values: [pattern] };
  }

  // Bracketed values become IN for every comparison operator (existing behavior).
  if (Array.isArray(value)) {
    return { sql: `${column} IN (${placeholders(value)})`, values: value };
  }

  if (value === '' && !condition.quoted) {
    return { sql: `${column} ${operator}`, values: [] };
  }

  return { sql: `${column} ${operator} ?`, values: [value] };
};

const buildFilterClause = (db, tableName, filters) => {
  const values = [];

  const clause = parseFilters(filters)
    .map((term) => {
      const parts = term.alternatives.map((condition) => {
        const built = buildCondition(db, tableName, condition);
        values.push(...built.values);
        return condition.negate ? `NOT (${built.sql})` : built.sql;
      });

      if (term.negate) {
        return `NOT (${parts.join(' OR ')})`;
      }
      return parts.length > 1 ? `(${parts.join(' OR ')})` : parts[0];
    })
    .join(' AND ');

  return { clause, values };
};

const buildDistinct = (db, tableName, distinct) => {
  const columns = distinct.split(',').map((column) => {
    assertValidColumnName(db, tableName, column);
    return `${tableName}.${column}`;
  });

  return columns.join(', ');
};

// _group_by=category&_aggregate=count,sum:price
const buildGroupedSelect = (db, tableName, groupBy, aggregate) => {
  const groupColumns = groupBy ? groupBy.split(',') : [];
  groupColumns.forEach((column) =>
    assertValidColumnName(db, tableName, column),
  );

  const aggregates = (aggregate ? aggregate.split(',') : []).map((spec) => {
    const [fn, column, ...extra] = spec.split(':');
    const sqlFunction = assertValidAggregate(fn);

    if (extra.length > 0) {
      throw invalidRequestError(`Invalid aggregate '${spec}'`);
    }
    if (column === undefined) {
      if (fn !== 'count') {
        throw invalidRequestError(
          `Aggregate '${fn}' needs a column, e.g. ${fn}:price`,
        );
      }
      return { sql: 'COUNT(*)', alias: 'count' };
    }

    assertValidColumnName(db, tableName, column);
    return {
      sql: `${sqlFunction}(${tableName}.${column})`,
      alias: `${fn}_${column}`,
    };
  });

  const groupString = groupColumns.map((column) => `${tableName}.${column}`);
  const select = [
    ...groupString,
    ...aggregates.map(
      ({ sql, alias }) => `${sql} AS ${quoteIdentifier(alias)}`,
    ),
  ];

  return {
    schemaString: select.join(', '),
    groupString: groupString.length ? `GROUP BY ${groupString.join(', ')}` : '',
    groupColumns,
    aliases: aggregates.map(({ alias }) => alias),
  };
};

module.exports = { buildFilterClause, buildDistinct, buildGroupedSelect };
