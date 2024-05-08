const yargs = require('yargs');

const usage = `
Soul | REST and realtime server for SQLite
Usage: soul [options]
`;

let options = undefined;
if (process.env.NO_CLI !== 'true') {
  options = yargs
    .usage(usage)
    .option('d', {
      alias: 'database',
      describe: 'SQLite database file or :memory:',
      type: 'string',
      demandOption: true,
    })
    .option('p', {
      alias: 'port',
      describe: 'Port to listen on',
      type: 'number',
      demandOption: false,
    })
    .option('r', {
      alias: 'rate-limit-enabled',
      describe: 'Enable rate limiting',
      type: 'boolean',
      demandOption: false,
    })
    .option('c', {
      alias: 'cors',
      describe: 'CORS whitelist origins',
      type: 'string',
      demandOption: false,
    })
    .option('V', {
      alias: 'verbose',
      describe: 'Enable verbose logging',
      type: 'string',
      demandOption: false,
      choices: ['console', null],
    })
    .options('e', {
      alias: 'extensions',
      describe: 'Extensions directory path to load',
      type: 'string',
      demandOption: false,
    })
    .options('a', {
      alias: 'auth',
      describe: 'Enable authentication and authorization',
      type: 'boolean',
      demandOption: false,
    })
    .options('ts', {
      alias: 'tokensecret',
      describe: 'JWT secret for the access and refresh tokens',
      type: 'string',
      demandOption: false,
    })
    .options('atet', {
      alias: 'accesstokenexpirationtime',
      describe: 'JWT expiration time for access token',
      type: 'string',
      demandOption: false,
    })
    .options('rtet', {
      alias: 'refreshtokenexpirationtime',
      describe: 'JWT expiration time for refresh token',
      type: 'string',
      demandOption: false,
    })
    .options('iuu', {
      alias: 'initialuserusername',
      describe: 'Initial superuser username',
      type: 'string',
      demandOption: false,
    })
    .options('iup', {
      alias: 'initialuserpassword',
      describe: 'Initial superuser password',
      type: 'string',
      demandOption: false,
    })
    .options('S', {
      alias: 'studio',
      describe: 'Start Soul Studio in parallel',
      type: 'boolean',
      demandOption: false,
    })
    .command('updatesuperuser', 'Update a superuser', (yargs) => {
      return yargs
        .option('id', {
          describe: 'The ID of the superuser you want to update',
          type: 'number',
          demandOption: true,
        })
        .option('password', {
          describe: 'The new password for the superuser you want to update',
          type: 'string',
          demandOption: false,
        })
        .option('is_superuser', {
          describe: 'The role of the superuser you want to update',
          type: 'boolean',
          demandOption: false,
        });
    })
    .help(true).argv;
}

module.exports = {
  yargs,
  usage,
  options,
};
