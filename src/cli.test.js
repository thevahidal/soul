const { spawnSync, spawn } = require('child_process');
const path = require('path');

// src/cli.js and src/commands.js run their real logic based on
// process.argv/NO_CLI at module-load time (yargs' demandOption, the
// updatesuperuser command dispatch), so they can't be exercised by
// requiring them directly in-process the way the rest of the app is
// tested -- these spawn the actual `soul` entrypoint as a real
// subprocess and assert on its stdout/exit code, the same way a user
// would invoke the CLI.
//
// --env points at a file that doesn't exist so a developer's own local
// .env (which sets AUTH=true, a token secret, etc.) can't leak into
// these tests and make them depend on machine-specific state.
const SERVER_ENTRY = path.join(__dirname, 'server.js');
const NO_ENV_FILE = '/tmp/soul-cli-test-no-such-env-file';

const runCli = (args, options = {}) =>
  spawnSync('node', [SERVER_ENTRY, '--env', NO_ENV_FILE, ...args], {
    encoding: 'utf-8',
    timeout: 8000,
    env: { PATH: process.env.PATH },
    ...options,
  });

describe('CLI (spawned as a real subprocess)', () => {
  it('exits non-zero with a usage error when --database is missing', () => {
    const result = runCli([]);

    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toContain(
      'Missing required argument: d',
    );
  });

  it('prints help and exits 0 for --help', () => {
    const result = runCli(['--help']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: soul [options]');
    expect(result.stdout).toContain('--database');
  });

  it('updatesuperuser exits non-zero when neither --password nor --is_superuser is given', () => {
    const result = runCli(['-d', ':memory:', 'updatesuperuser', '--id=1']);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain(
      'Please provide either the --password or --is_superuser flag',
    );
  });

  it('updatesuperuser reports a missing user and exits non-zero', () => {
    const result = runCli([
      '-d',
      ':memory:',
      '-a',
      '--ts=test-secret-0123456789',
      '--iuu=admin',
      '--iup=Str0ngTestPw!1',
      'updatesuperuser',
      '--id=999',
      '--password=AnotherStr0ngPw!1',
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('User not found');
  });

  it('updatesuperuser --is_superuser=true actually promotes the user instead of crashing on the DB write', () => {
    // regression test: --is_superuser is parsed by yargs as a native JS
    // boolean, which better-sqlite3 can't bind directly -- this used to
    // throw "SQLite3 can only bind numbers, strings, bigints, buffers, and
    // null" from inside a catch block with no process.exit(), so the
    // process never terminated and this spawnSync call would hang until
    // its timeout instead of failing fast.
    const result = runCli([
      '-d',
      ':memory:',
      '-a',
      '--ts=test-secret-0123456789',
      '--iuu=admin',
      '--iup=Str0ngTestPw!1',
      'updatesuperuser',
      '--id=1',
      '--is_superuser=true',
    ]);

    expect(result.stdout).not.toContain('SQLite3 can only bind');
    expect(result.stdout).toContain('updated successfully');
  });

  it('starts the server and shuts down cleanly on SIGTERM', (done) => {
    const child = spawn(
      'node',
      [SERVER_ENTRY, '--env', NO_ENV_FILE, '-d', ':memory:', '-p', '0'],
      { env: { PATH: process.env.PATH } },
    );

    let stdout = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      done(
        new Error(`server did not start in time; stdout so far:\n${stdout}`),
      );
    }, 12000);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();

      if (stdout.includes('Soul is running')) {
        child.kill('SIGTERM');
      }
    });

    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      try {
        expect(stdout).toContain('Soul is running');
        // a clean shutdown exits on its own rather than being force-killed
        expect(signal).not.toBe('SIGKILL');
        done();
      } catch (error) {
        done(error);
      }
    });
  }, 15000);
});
