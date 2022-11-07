const fs = require('fs');

const { extensions: extensionsConfig } = require('./config');

const { path: extensionsPath } = extensionsConfig;

const setupExtensions = async (app, db) => {
  if (extensionsPath) {
    const extensions = fs.readdirSync(extensionsPath);
    extensions.forEach((extension) => {
      if (extension === 'api.js') {
        const apiExtensions = require(`${extensionsPath}/${extension}`);

        console.log('API extensions loaded');

        Object.keys(apiExtensions).forEach((key) => {
          const api = apiExtensions[key];
          switch (api.method) {
            case 'GET':
              app.get(api.path, (req, res) => api.handler(req, res, db));
              break;
            case 'POST':
              app.post(api.path, api.handler);
              break;
            case 'PUT':
              app.put(api.path, api.handler);
              break;
            case 'DELETE':
              app.delete(api.path, api.handler);
              break;

            default:
              break;
          }
          console.log(' >', api.path);
        });
        console.log('\n');
      }
    });
  } else {
    console.log('No extensions directory provided');
  }
};

module.exports = {
  setupExtensions,
};
