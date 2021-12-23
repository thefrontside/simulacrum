import { Slice } from '@effection/atom';
import { CreateSimulation, GetClientFromSpec, TestState } from '../types';

export interface MakeCreateSimulationOptions {
  atom: Slice<TestState>;
  getClientFromSpec: GetClientFromSpec;
}
export const makeCreateSimulation = ({ atom, getClientFromSpec }: MakeCreateSimulationOptions) => (options: CreateSimulation) => {
  return new Cypress.Promise((resolve, reject) => {
    let client = getClientFromSpec(Cypress.spec.name);

    let { debug = false, domain, client_id, ...auth0Options } = options;

    assert(typeof domain !== 'undefined', 'domain is a required option');

    let port = Number(domain.split(':').slice(-1)[0]);

    assert(typeof client !== 'undefined', 'no client created in createSimulation');

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

      Cypress.log({
        name: 'simulacrum-create-simulation',
        displayName: 'simulacrum-create-simulation',
        message: `sumalation created ${JSON.stringify(simulation)}`
      });

      resolve(simulation);
    }).catch((e) => {
      Cypress.log({
        name: 'simulacrum-create-simulation',
        displayName: 'simulacrum-create-simulation',
        message: `create-simulation failed ${e.message}`
      });

      reject(e);
    });
  });
};
