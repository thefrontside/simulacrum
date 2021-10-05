import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import { createTestServer, Client, Simulation } from './helpers';
import { ldap } from '../src';

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
            scenarios: {}
          };
        }
      }
    });
  });

  afterEach(function* () {
    yield client.destroySimulation(simulation);
  });

  describe("Creating a simulation with an Auth0 simulator", () => {
    beforeEach(function*() {
      simulation = yield client.createSimulation("ldap", {
        options: {
          baseDN: "ou=users,dc=hp.com",
          bindDn: "admin@hp.com",
          bindPassword: "password",
          groupDN:"ou=groups,dc=hp.com"
        },
        services: {
          ldap: {
            port: 389
          }
        }
      });
    });

    it('starts the simulation', function*() {
      expect(simulation.status).toEqual('running');
    });
  });
});
