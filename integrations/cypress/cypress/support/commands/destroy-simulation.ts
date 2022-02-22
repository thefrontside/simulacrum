import type { Simulation } from '@simulacrum/client';
import type { CommandMaker } from '../types';
import { makeCypressLogger } from '../utils/cypress-logger';
import { SimulationId } from './constants';

const log = makeCypressLogger('simulacrum-destroy-simulation');

export const makeDestroySimulation = ({ getClientFromSpec }: CommandMaker) => () => {
  return new Cypress.Promise((resolve, reject) => {
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
