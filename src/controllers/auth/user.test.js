// updateSuperuser/createInitialUser are CLI/startup-only paths that call
// process.exit() directly (no `return` after it, since in the real process
// exit() never returns) -- fully mock their dependencies and make the
// process.exit spy throw, mirroring exit's real effect of halting execution,
// so these can be tested without ever touching the real DB or actually
// killing the Jest worker.
jest.mock('../../services', () => ({
  authService: {
    getAllUsers: jest.fn(),
    getUsersByUsername: jest.fn(),
    getUsersById: jest.fn(),
    getDefaultRole: jest.fn(),
  },
  rowService: {
    save: jest.fn(),
    update: jest.fn(),
  },
}));

const { authService, rowService } = require('../../services');
const config = require('../../config');
const { createInitialUser, updateSuperuser } = require('./user');

describe('createInitialUser / updateSuperuser (CLI-only paths)', () => {
  let exitSpy;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('createInitialUser', () => {
    let originalUsername;
    let originalPassword;

    beforeEach(() => {
      originalUsername = config.initialUserUsername;
      originalPassword = config.initialUserPassword;
      authService.getAllUsers.mockReturnValue([]);
      authService.getUsersByUsername.mockReturnValue([]);
      authService.getDefaultRole.mockReturnValue([{ id: 1 }]);
      rowService.save.mockReturnValue({ lastInsertRowid: 42 });
    });

    afterEach(() => {
      config.initialUserUsername = originalUsername;
      config.initialUserPassword = originalPassword;
    });

    it('does nothing (no exit) when users already exist', async () => {
      authService.getAllUsers.mockReturnValue([{ id: 1 }]);

      await createInitialUser();

      expect(exitSpy).not.toHaveBeenCalled();
      expect(rowService.save).not.toHaveBeenCalled();
    });

    it('exits when INITIAL_USER_USERNAME is missing', async () => {
      config.initialUserUsername = undefined;
      config.initialUserPassword = 'Str0ng$Pw!';

      await createInitialUser();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('INITIAL_USER_USERNAME'),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(rowService.save).not.toHaveBeenCalled();
    });

    it('exits when INITIAL_USER_PASSWORD is missing', async () => {
      config.initialUserUsername = 'admin';
      config.initialUserPassword = undefined;

      await createInitialUser();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('INITIAL_USER_PASSWORD'),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(rowService.save).not.toHaveBeenCalled();
    });

    it('exits when the username is already taken', async () => {
      config.initialUserUsername = 'admin';
      config.initialUserPassword = 'Str0ng$Pw!';
      authService.getUsersByUsername.mockReturnValue([{ id: 1 }]);

      await createInitialUser();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('taken'),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(rowService.save).not.toHaveBeenCalled();
    });

    it('exits when the password is weak', async () => {
      config.initialUserUsername = 'admin';
      config.initialUserPassword = '12345678';

      await createInitialUser();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('weak'),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(rowService.save).not.toHaveBeenCalled();
    });

    it('exits when no default role exists', async () => {
      config.initialUserUsername = 'admin';
      config.initialUserPassword = 'Str0ng$Pw!';
      authService.getDefaultRole.mockReturnValue([]);

      await createInitialUser();

      expect(exitSpy).toHaveBeenCalledWith(1);
      // the user row is saved before the default-role check runs
      expect(rowService.save).toHaveBeenCalledTimes(1);
    });

    it('creates the user and role when everything is valid', async () => {
      config.initialUserUsername = 'admin';
      config.initialUserPassword = 'Str0ng$Pw!';

      await createInitialUser();

      expect(exitSpy).not.toHaveBeenCalled();
      expect(rowService.save).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Initial user created successfully'),
      );
    });
  });

  describe('updateSuperuser', () => {
    beforeEach(() => {
      authService.getUsersById.mockReturnValue([{ id: 1, username: 'admin' }]);
    });

    it('exits when the user id does not exist', async () => {
      authService.getUsersById.mockReturnValue([]);

      await updateSuperuser({
        id: 999,
        password: undefined,
        is_superuser: true,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found'),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(rowService.update).not.toHaveBeenCalled();
    });

    it('exits when the new password is weak', async () => {
      await updateSuperuser({
        id: 1,
        password: 'weak',
        is_superuser: undefined,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('weak'),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(rowService.update).not.toHaveBeenCalled();
    });

    it('updates only is_superuser when no password is given, coerced to a string for SQLite binding', async () => {
      await updateSuperuser({ id: 1, password: undefined, is_superuser: true });

      // better-sqlite3 can't bind a native boolean; every other write path
      // for this column (createInitialUser/registerUser) stores the string
      // 'true'/'false', so this must match that convention, not the raw
      // boolean the CLI's yargs `type: 'boolean'` parsing hands in.
      expect(rowService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: { is_superuser: 'true' },
          pks: '1',
        }),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('updated successfully'),
      );
    });

    it('coerces is_superuser: false to the string "false"', async () => {
      await updateSuperuser({
        id: 1,
        password: undefined,
        is_superuser: false,
      });

      expect(rowService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: { is_superuser: 'false' },
          pks: '1',
        }),
      );
    });

    it('updates the password when a strong password is given', async () => {
      await updateSuperuser({
        id: 1,
        password: 'Str0ng$Pw!',
        is_superuser: undefined,
      });

      expect(rowService.update).toHaveBeenCalledTimes(1);
      const [[call]] = rowService.update.mock.calls;
      expect(Object.keys(call.fields)).toEqual(
        expect.arrayContaining(['hashed_password', 'salt']),
      );
    });
  });
});
