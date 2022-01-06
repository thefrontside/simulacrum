import { Slice } from '@effection/atom';
import { Simulation } from '@simulacrum/client';
import { GetClientFromSpec, TestState } from '../types';
import { makeCypressLogger } from '../utils/cypress-logger';
import { SimulationId } from './constants';

export interface MakeLogoutOptions {
  atom: Slice<TestState>;
  getClientFromSpec: GetClientFromSpec;
}

const log = makeCypressLogger('simulacrum-logout');

export const makeLogout = ({ atom, getClientFromSpec }: MakeLogoutOptions) => () => {
  return new Cypress.Promise((resolve, reject) => {
    log('in logout');

    let client = getClientFromSpec(Cypress.spec.name);

    client.destroySimulation({ id: SimulationId } as Simulation).then(() => {
      log('simulation destroyed');

      atom.slice(Cypress.spec.name).remove();
      resolve();
    }).catch(e => {
      log(`logout failed with ${e.message}`);
      reject(e);
    });
  });
};
