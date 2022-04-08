import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import type { Client, LDAP, LDAPCommands, Simulation } from './helpers';
import { createLDAPClient } from './helpers';
import { createTestServer } from './helpers';
import { ldap } from '../src';
import { NoSuchObjectError } from 'ldapjs';
import { person } from '@simulacrum/server';

describe('LDAP simulator', () => {
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
    yield client.dispose();
  });

  describe("Creating a simulation with an ldap simulator", () => {
    let ldap: LDAP;
    beforeEach(function*() {
      simulation = yield client.createSimulation("ldap", {
        options: {
          log: false,
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
      ldap = createLDAPClient(simulation.services[0].url);
    });

    it('starts the ldap simulation', function*() {
      expect(simulation.status).toEqual('running');
    });

    describe('bind', () => {
      it('should bind to bindDn', function* () {
        yield client.given(simulation, "person", {
          email: "admin@org.com",
          password: "password"
        });

        let result = yield ldap.bind("cn=admin@org.com,ou=users,dc=org.com", "password");

        expect(result).toBeTruthy();
      });

      it('should not bind with invalid credentials', function* () {
        yield client.given(simulation, "person", {
          cn: "admin@org.com",
          password: "password"
        });

        try {
          yield ldap.bind("cn=bad@evilcorp.com,ou=users,dc=org.com", "password");
        } catch(err) {
          expect(err).toBeInstanceOf(NoSuchObjectError);
        }
      });

      it('should not bind with no scenario', function * () {
        yield client.given(simulation, "person");

        try {
          yield ldap.bind("cn=admin@org.com,ou=users,dc=org.com", "password");
        } catch(err) {
          expect(err).toBeInstanceOf(NoSuchObjectError);
          return;
        }

        throw new Error('should not get here');
      });
    });

    describe('search', () => {
      let commands: LDAPCommands;

      beforeEach(function * () {
        yield client.given(simulation, "person", {
          email: "admin@org.com",
          password: "password"
        });

        commands = yield ldap.bind("cn=admin@org.com,ou=users,dc=org.com", "password");
      });

      function search(email: string) {
        return commands.search(`cn=${email},ou=users,dc=org.com`).filter((entry) => entry.object.email === email);
      }

      it('should find created user', function* () {
        yield client.given(simulation, "person", {
          email: "a.user@org.com",
          password: "password"
        });

        let result = yield search("a.user@org.com").first();

        expect(result).toBeDefined();
      });

      it('should not find user with no scenario', function * () {
        yield client.given(simulation, "person");

        let result = yield search("joe.bloggs@org.com").first();

        expect(result).toBeUndefined();
      });

      it('has a root DSE', function*() {
        let result = yield commands.search("").first();
        expect(result).toMatchObject({
          attributes: [{
            type: "vendorName",
          }]
        });
      });
    });
  });
});
