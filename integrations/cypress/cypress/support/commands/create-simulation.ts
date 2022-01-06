import { Slice } from '@effection/atom';
import { CreateSimulation, GetClientFromSpec, TestState } from '../types';
import { makeCypressLogger } from '../utils/cypress-logger';

export interface MakeCreateSimulationOptions {
  atom: Slice<TestState>;
  getClientFromSpec: GetClientFromSpec;
}

const log = makeCypressLogger('simulacrum-create-simulation');

export const makeCreateSimulation = ({ atom, getClientFromSpec }: MakeCreateSimulationOptions) => (options: CreateSimulation) => {
  return cy.logout().then(() => {
    let client = getClientFromSpec(Cypress.spec.name);

    assert(typeof client?.createSimulation === 'function', 'no client created in createSimulation');

    let { debug = false, domain, client_id, ...auth0Options } = options;

    assert(typeof domain !== 'undefined', 'domain is a required option');

    let port = Number(domain.split(':').slice(-1)[0]);

    log(`creating simulation with options: ${JSON.stringify(options)}`);

    return new Cypress.Promise((resolve, reject) => {
      client.createSimulation("auth0", {
        options: {
          ...auth0Options,
          clientId: client_id,
        },
        services: {
          auth0: {
            port,
          },
        },
        debug,
        key: 'cypress'
      }).then(simulation => {
        atom.slice(Cypress.spec.name).update(current => {
          return {
            ...current,
            simulation
          };
        });

        log(`sumalation created ${JSON.stringify(simulation)}`);

        resolve(simulation);
      }).catch((e) => {
        log(`create-simulation failed ${e.message}`);

        reject(e);
      });
    });
  });
};
