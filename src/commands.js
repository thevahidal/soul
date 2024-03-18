const { yargs } = require('./cli');
const { updateSuperuser } = require('./controllers/auth');

const { argv } = yargs;

const runCLICommands = () => {
  // if the updatesuperuser command is passed from the CLI execute the updatesuperuser function
  if (argv._.includes('updatesuperuser')) {
    const { id, password, is_superuser } = argv;

    if (!password && !is_superuser) {
      console.log(
        'Please provide either the --password or --is_superuser flag when using the updateuser command.',
      );
      process.exit(1);
    } else {
      updateSuperuser({ id, password, is_superuser });
    }
  }
};

module.exports = { runCLICommands };
