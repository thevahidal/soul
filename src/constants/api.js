module.exports = {
  defaultRoutes: ['_users', '_roles', '_roles_permissions', '_users_roles'],
  baseTableUrl: '/api/tables',
  universalAccessEndpoints: ['/api/auth/change-password'],
  fields: {
    _users: {
      SALT: 'salt',
      IS_SUPERUSER: 'is_superuser',
      HASHED_PASSWORD: 'hashed_password',
    },
  },
  DEFAULT_PAGE_LIMIT: 10,
  DEFAULT_PAGE_INDEX: 0,
  PASSWORD: {
    TOO_WEAK: 'Too weak',
    WEAK: 'Weak',
  },

  httpVerbs: {
    POST: 'CREATE',
    GET: 'READ',
    PUT: 'UPDATE',
    DELETE: 'DELETE',
  },
};
