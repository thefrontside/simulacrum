# @simulacrum/ldap-simulator

Simulate an actual LDAP server for testing and development.

Often you are working on software that depends on the presence of an
LDAP directory. This let's you create an LDAP server in a known state
that can be used for offline development and testing.

There are two different ways to start an LDAP simulator, but they both involve
the same set of options. If you are running in a vanilla JavaScript
environment, you can use promise-based API.

## Plain JavaScript

```js
import { runLDAPServer } from "@simulacrum/ldap-simulator";

async function run() {
  let server = await runLDAPServer({
    port: 3890,
    baseDN: "ou=users,dc=org.com",
    bindDn: "admin@org.com",
    bindPassword: "password",
    groupDN:"ou=groups,dc=org.com",
    users: [{
      //required
      cn: 'Charles Lowell',
      //optional to bind using this user
      password: "super-secret-but-not-really",
      //optional:
      uid: 'cowboyd',

    }]
  });
  console.log(`LDAP server running on ${server.port}`);
  try {
    //.... do some stuff;
  } finally {
    // don't forget to release the server resources!
    await server.close();
  }
}
```

## Effection

However, if you are already using [Effection][effection], the LDAP
server is available as a [Resource][resource], and so you can use it
freely in any context:

```js
import { createLDAPServer } from "@simulacrum/ldap-simulator";

function* run() {
  let server = yield createLDAPServer({
    port: 3890,
    baseDN: "ou=users,dc=org.com",
    bindDn: "admin@org.com",
    bindPassword: "password",
    groupDN:"ou=groups,dc=org.com",
    users: [{
      //required
      cn: 'Charles Lowell',
      //optional to bind using this user
      password: "super-secret-but-not-really",
      //optional:
      uid: 'cowboyd',

    }]
  });

  //... do some stuff
}
```

[effection]: https://frontside.com/effection
[resource]: https://frontside.com/effection/docs/guides/resources
