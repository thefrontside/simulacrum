import type { CommandMaker, CreateSimulation } from '../types';
import { getAuth0Config } from '../utils/config';
import { makeCypressLogger } from '../utils/cypress-logger';
import { SimulationId } from './constants';

const log = makeCypressLogger('simulacrum-create-simulation');

export const makeCreateSimulation = ({ atom, getClientFromSpec }: CommandMaker) => (options?: CreateSimulation) => {
  return cy.logout().then(() => {
    let client = getClientFromSpec(Cypress.spec.name);

    let { debug = false, ...rest } = options ?? { debug: false };

    let auth0Options = {
      ...getAuth0Config(),
      ...rest
    };

    assert(typeof auth0Options.domain !== 'undefined', 'domain is a required option');
    assert(typeof auth0Options.clientID !== 'undefined', 'clientID is a required option');

    let port = Number(auth0Options.domain.split(':').slice(-1)[0]);

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


        resolve(simulation);
      }).catch((e) => {
        log(`create-simulation failed ${e.message}`);

        reject(e);
      });
    });
  });
};
