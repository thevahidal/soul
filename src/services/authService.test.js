const Database = require('better-sqlite3');

const buildAuthService = require('./authService');

// hasTablePermission is exercised in the rest of the suite only via
// superuser tokens (which short-circuit at the very first check) or via
// fully-mocked authService (middlewares/auth.test.js) -- neither path ever
// runs its real, non-superuser permission-lookup logic. Test that directly
// here against a real in-memory DB.
describe('authService.hasTablePermission', () => {
  let db;
  let authService;

  beforeEach(() => {
    db = new Database(':memory:');
    // production's tableFields uses 'create'/'update'/'delete' as the raw
    // column names -- these are SQL keywords, so quote them explicitly.
    db.exec(`
      CREATE TABLE _roles_permissions (
        id INTEGER PRIMARY KEY,
        role_id INTEGER,
        table_name TEXT,
        "create" BOOLEAN,
        read BOOLEAN,
        "update" BOOLEAN,
        "delete" BOOLEAN
      );
    `);
    authService = buildAuthService(db);
  });

  afterEach(() => {
    db.close();
  });

  const insertPermission = (perm) => {
    db.prepare(
      `INSERT INTO _roles_permissions (role_id, table_name, "create", read, "update", "delete") VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      perm.role_id,
      perm.table_name,
      perm.create ?? 0,
      perm.read ?? 0,
      perm.update ?? 0,
      perm.delete ?? 0,
    );
  };

  it('always allows a superuser, regardless of table or permissions', () => {
    expect(
      authService.hasTablePermission({
        payload: { isSuperuser: true },
        tableName: 'anything',
        verb: 'DELETE',
      }),
    ).toBe(true);
  });

  it('denies when no tableName is provided', () => {
    expect(
      authService.hasTablePermission({
        payload: { isSuperuser: false, roleIds: [1] },
        tableName: undefined,
        verb: 'GET',
      }),
    ).toBe(false);
  });

  it('denies when no permission row exists for the table', () => {
    expect(
      authService.hasTablePermission({
        payload: { isSuperuser: false, roleIds: [1] },
        tableName: 'items',
        verb: 'GET',
      }),
    ).toBe(false);
  });

  it('denies when a permission row exists but the verb is not granted', () => {
    insertPermission({ role_id: 1, table_name: 'items', read: 1 });

    expect(
      authService.hasTablePermission({
        payload: { isSuperuser: false, roleIds: [1] },
        tableName: 'items',
        verb: 'DELETE',
      }),
    ).toBe(false);
  });

  it('allows when a permission row grants the requested verb', () => {
    insertPermission({ role_id: 1, table_name: 'items', read: 1 });

    expect(
      authService.hasTablePermission({
        payload: { isSuperuser: false, roleIds: [1] },
        tableName: 'items',
        verb: 'GET',
      }),
    ).toBe(true);
  });

  it('allows when any of the user roles grants the requested verb', () => {
    insertPermission({ role_id: 1, table_name: 'items', read: 0 });
    insertPermission({ role_id: 2, table_name: 'items', read: 1 });

    expect(
      authService.hasTablePermission({
        payload: { isSuperuser: false, roleIds: [1, 2] },
        tableName: 'items',
        verb: 'GET',
      }),
    ).toBe(true);
  });
});
