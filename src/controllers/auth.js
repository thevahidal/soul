const { tableService } = require('../services');
const { rowService } = require('../services');

const obtainAccessToken = async (req, res, next) => {};

const registerUser = async (req, res, next) => {};

const createDefaultPermissionTable = async () => {
  const tableName = tableService.checkTableExists('_default_permissions');

  if (!tableName) {
    const dbTables = tableService.getTableNames();
    const defaultTables = [
      { name: '_users', type: 'default_table' },
      { name: '_roles', type: 'default_table' }
    ];
    const tableNames = [...dbTables, ...defaultTables];

    //create the _default_permissions table
    const tableColumns = [
      'table_name TEXT',
      'can_create BOOLEAN',
      'can_read BOOLEAN',
      'can_update BOOLEAN',
      'can_delete BOOLEAN'
    ];
    const permissionTable = tableService.createTable(
      '_default_permissions',
      tableColumns
    );

    //Add rows for the permission table
    tableNames.map((table) => {
      let accessRight = 'true';
      if (table.type === 'default_table') {
        accessRight = 'false';
      }

      const rowData = {
        tableName: '_default_permissions',
        fields: {
          table_name: table.name,
          can_create: accessRight,
          can_read: accessRight,
          can_update: accessRight,
          can_delete: accessRight
        }
      };

      rowService.save(rowData);
    });
  } else {
    console.log('_default_permission table is already created');
  }
};

module.exports = {
  createDefaultPermissionTable,
  obtainAccessToken,
  registerUser
};
