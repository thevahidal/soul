## User Authentication in Soul

Soul incorporates a robust user authentication system that handles user accounts, groups, permissions, and cookie-based user sessions. This section provides an overview of how the default implementation works.

### Overview

The Soul authentication system handles both authentication and authorization. Briefly, authentication verifies a user is who they claim to be, and authorization determines what an authenticated user is allowed to do. Here, the term "authentication" is used to refer to both tasks.

The auth system consists of:

- Users
- Permissions: Binary (yes/no) flags designating whether a user may perform a certain task.
- Default Permissions
- Roles: A generic way of applying labels and permissions to more than one user.
- A password hashing system
- APIs for logging in users or restricting content

The authentication system in Soul aims to be very generic and doesn't provide some features commonly found in web authentication systems, such as:

- Password strength checking
- Throttling of login attempts
- Authentication against third-parties (OAuth, for example)
- Object-level permissions

#### Users

User objects are the core of the authentication system. They typically represent the people interacting with your site and are used to enable things like restricting access, registering user profiles, associating content with creators, etc. Only one class of user exists in Soul's authentication framework, i.e., 'superusers' or types of users are just user objects with special attributes set, not different classes of user objects.

The primary attributes of the default user are:

- username
- password
- email
- first_name
- last_name

Note that when Soul boots up, it looks for a table called "\_users" which holds the User objects mentioned above.

Creating superusers:

Create superusers using the createsuperuser command:

```
$ node src/server.js createsuperuser --username=joe --password=strongstring
```

#### Permissions

Soul comes with a built-in permissions system. It provides a way to assign permissions to specific users and groups of users.

Soul uses permissions as follows:

- Access to view objects is limited to users with the "read" permission for that type of object.
- Access to add an object is limited to users with the "create" permission for that type of object.
- Access to change an object is limited to users with the "update" permission for that type of object.
- Access to delete an object is limited to users with the "delete" permission for that type of object.

Default Permissions:

By default, Soul ensures that four default permissions – create, update, delete, and read – are created for each table defined in one of your databases.

| table_name | can_create | can_read | can_update | can_delete |
| ---------- | ---------- | -------- | ---------- | ---------- |
| albums     | false      | true     | true       | false      |

In this scenario, calling POST (create) and GET (read) requests to /tables/albums/rows is allowed by any user (even anonymous), while PUT (update) and DELETE (delete, of course) requests are not allowed.

When Soul boots up, it checks for the existence of a table called \_default_permissions.

#### Roles

Roles are a generic way of categorizing users so you can apply permissions or some other label to those users. A user can belong to any number of roles.

A user with a role automatically has the permissions granted to that role. For example, if the role "editor" has the permission can_update_posts, any user with that role will have that permission.

Beyond permissions, roles are a convenient way to categorize users and give them some label or extended functionality.

#### Authentication

Soul uses cookies and middleware to hook the authentication system into request objects.

These provide a req.user attribute on every request, which represents the current user. If the current user has not logged in, it is set to null.

#### Obtain Access Token

To be able to use private APIs, users need to obtain an access token, which is a JWT token consisting of this payload:

- username
- is_superuser
- roles

For security reasons, Access tokens have a very short lifetime, and once expired, they can be refreshed using another API called Refresh Access token. Refresh tokens have a much longer lifetime, and both access and refresh tokens are provided to the user upon logging in.

#### Register New Users

There's also a superuser level of access API to create new users for ease of use. This API takes the information for new users and creates a new object for them.
