module.exports = {
  roleSchema: [
    {
      name: "name",
      type: "TEXT",
      primaryKey: false,
      notNull: true,
      unique: false,
    },
  ],

  userSchema: [
    {
      name: "username",
      type: "TEXT",
      primaryKey: false,
      notNull: true,
      unique: false,
    },
    {
      name: "hashed_password",
      type: "TEXT",
      primaryKey: false,
      notNull: true,
      unique: false,
    },
    {
      name: "salt",
      type: "NUMERIC",
      primaryKey: false,
      notNull: true,
      unique: false,
    },

    {
      name: "is_superuser",
      type: "BOOLEAN",
      primaryKey: false,
      notNull: true,
      unique: false,
    },
  ],

  rolePermissionSchema: [
    {
      name: "role_id",
      type: "NUMERIC",
      primaryKey: false,
      notNull: true,
      unique: false,
      foreignKey: { table: "_roles", column: "id" },
    },

    {
      name: "tableName",
      type: "TEXT",
      primaryKey: false,
      notNull: true,
      unique: false,
    },

    {
      name: "create",
      type: "BOOLEAN",
      primaryKey: false,
      notNull: true,
      unique: false,
    },

    {
      name: "read",
      type: "BOOLEAN",
      primaryKey: false,
      notNull: true,
      unique: false,
    },

    {
      name: "update",
      type: "BOOLEAN",
      primaryKey: false,
      notNull: true,
      unique: false,
    },

    {
      name: "delete",
      type: "BOOLEAN",
      primaryKey: false,
      notNull: true,
      unique: false,
    },
  ],

  usersRoleSchema: [
    {
      name: "user_id",
      type: "NUMERIC",
      primaryKey: false,
      notNull: true,
      unique: false,
      foreignKey: { table: "_users", column: "id" },
    },

    {
      name: "role_id",
      type: "NUMERIC",
      primaryKey: false,
      notNull: true,
      unique: false,
      foreignKey: { table: "_roles", column: "id" },
    },
  ],
};
