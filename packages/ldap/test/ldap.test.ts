import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import type { Client, Simulation } from './helpers';
import { createTestServer } from './helpers';
import { ldap } from '../src';
import { createClient, NoSuchObjectError } from 'ldapjs';
import type { Client as LDAPClient , SearchEntryObject } from 'ldapjs';
import { person } from '@simulacrum/server';

describe('Auth0 simulator', () => {
  let client: Client;
  let simulation: Simulation;

  beforeEach(function*() {
    client = yield createTestServer({
      simulators: {
        ldap: (slice, options) => {
          let { services } = ldap(slice, options);

          return {
            services,
            scenarios: { person }
          };
        }
      }
    });
  });

  afterEach(function* () {
    yield client.destroySimulation(simulation);
  });

  describe("Creating a simulation with an ldap simulator", () => {
    beforeEach(function*() {
      simulation = yield client.createSimulation("ldap", {
        options: {
          baseDN: "ou=users,dc=org.com",
          bindDn: "admin@org.com",
          bindPassword: "password",
          groupDN:"ou=groups,dc=org.com"
        },
        services: {
          ldap: {
            port: 389
          },
        },
        debug: true
      });
    });

    it('starts the ldap simulation', function*() {
      expect(simulation.status).toEqual('running');
    });

    let ldapClient: LDAPClient;

    function bind(dn: string, secret: string): Promise<LDAPClient> {
      ldapClient = createClient({ url: simulation.services[0].url });

      return new Promise((resolve, reject) => {
        ldapClient.bind(dn, secret, err => {
          if (err) {
            reject(err);
          } else {
            resolve(ldapClient);
          }
        });
      });
    }

    afterEach(() => {
      ldapClient?.unbind();
    });

    describe('bind', () => {
      it('should bind to bindDn', function* () {
        yield client.given(simulation, "person", {
          email: "admin@org.com",
          password: "password"
        });

        let result = yield bind("cn=admin@org.com,ou=users,dc=org.com", "password");

        expect(result).toBeTruthy();
      });

      it('should not bind with invalid credentials', function* () {
        yield client.given(simulation, "person", {
          email: "admin@org.com",
          password: "password"
        });

        try {
          yield bind("cn=bad@evilcorp.com,ou=users,dc=org.com", "password");
        } catch(err) {
          expect(err).toBeInstanceOf(NoSuchObjectError);
        }
      });

      it('should not bind with no scenario', function * () {
        yield client.given(simulation, "person");

        try {
          yield bind("cn=admin@org.com,ou=users,dc=org.com", "password");
        } catch(err) {
          expect(err).toBeInstanceOf(NoSuchObjectError);
          return;
        }

        throw new Error('should not get here');
      });
    });

    describe('search', () => {
      beforeEach(function * () {
        yield client.given(simulation, "person", {
          email: "admin@org.com",
          password: "password"
        });

        ldapClient = yield bind("cn=admin@org.com,ou=users,dc=org.com", "password");
      });

      function search(email: string) {
        return new Promise((resolve, reject) => {
          let results: SearchEntryObject[] = [];
          ldapClient.search(`cn=${email},ou=users,dc=org.com`, { }, (err, res) => {
            res.on('searchEntry', entry => {
              if(entry.object.email === email ) {
                results.push(entry.object);
              }
            });

            res.on('error', err => {
              reject(err);
            });
            res.on('end', () => {
              resolve(results);
            });
          });
        });
      }

      it('should find created user', function* () {
        yield client.given(simulation, "person", {
          email: "a.user@org.com",
          password: "password"
        });

        let result = yield search("a.user@org.com");

        expect(result).toHaveLength(1);
      });

      it('should not find user with no scenario', function * () {
        yield client.given(simulation, "person");

        let result = yield search("joe.bloggs@org.com");

        expect(result).toHaveLength(0);
      });
    });
  });
});
