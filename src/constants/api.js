module.exports = {
  authEndpoints: ['_users', '_roles', '_roles_permissions', '_users_roles'],
  baseTableUrl: '/api/tables',
  universalAccessEndpoints: ['/api/auth/change-password'],

  DEFAULT_PAGE_LIMIT: 10,
  DEFAULT_PAGE_INDEX: 0,
  PASSWORD: {
    TOO_WEAK: 'Too weak',
    WEAK: 'Weak',
  },

  httpVerbs: {
    POST: 'POST',
    GET: 'GET',
    PUT: 'PUT',
    DELETE: 'DELETE',
  },

  httpMethodDefinitions: {
    POST: 'CREATE',
    GET: 'READ',
    PUT: 'UPDATE',
    DELETE: 'DELETE',
  },
};
