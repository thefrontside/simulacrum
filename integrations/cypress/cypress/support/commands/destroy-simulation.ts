import { Simulation } from '@simulacrum/client';
import { CommandMaker } from '../types';
import { makeCypressLogger } from '../utils/cypress-logger';
import { SimulationId } from './constants';

const log = makeCypressLogger('simulacrum-destroy-simulation');

export const makeDestroySimulation = ({ atom, getClientFromSpec }: CommandMaker) => () => {
  return new Cypress.Promise((resolve, reject) => {
    let existing = atom.slice(Cypress.spec.name).get()?.simulation;

    if(typeof existing === 'undefined') {
      log('no simulation to destroy');
      resolve();
    } else {
      log(`destroying simulation ${existing.status}`);
    }

    let client = getClientFromSpec(Cypress.spec.name);

    client.destroySimulation({ id: SimulationId } as Simulation).then(() => {
      log('simulation destroyed');

      resolve();
    }).catch(e => {
      log(`destroy simulation failed with ${e.message}`);
      reject(e);
    });
  });
};
