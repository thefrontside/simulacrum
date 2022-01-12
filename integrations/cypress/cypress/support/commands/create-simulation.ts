import { Slice } from '@effection/atom';
import { CreateSimulation, GetClientFromSpec, TestState } from '../types';
import { makeCypressLogger } from '../utils/cypress-logger';
import { SimulationId } from './constants';

export interface MakeCreateSimulationOptions {
  atom: Slice<TestState>;
  getClientFromSpec: GetClientFromSpec;
}

const log = makeCypressLogger('simulacrum-create-simulation');

export const makeCreateSimulation = ({ atom, getClientFromSpec }: MakeCreateSimulationOptions) => (options: CreateSimulation) => {
  return cy.logout().then(() => {
    let client = getClientFromSpec(Cypress.spec.name);

    let { debug = false, domain, ...auth0Options } = options;

    assert(typeof domain !== 'undefined', 'domain is a required option');
    assert(typeof auth0Options.clientID !== 'undefined', 'clientID is a required option');

    let port = Number(domain.split(':').slice(-1)[0]);

    log(`creating simulation with options: ${JSON.stringify(options)}`);

    return new Cypress.Promise((resolve, reject) => {
      client.createSimulation("auth0", {
        options: {
          ...auth0Options,
        },
        services: {
          auth0: {
            port,
          },
        },
        debug,
        key: SimulationId
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
