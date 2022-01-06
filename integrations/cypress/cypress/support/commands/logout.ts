import { Slice } from '@effection/atom';
import { GetClientFromSpec, TestState } from '../types';
import { makeCypressLogger } from '../utils/cypress-logger';

export interface MakeLogoutOptions {
  atom: Slice<TestState>;
  getClientFromSpec: GetClientFromSpec;
}

const log = makeCypressLogger('simulacrum-logout');

export const makeLogout = ({ atom, getClientFromSpec }: MakeLogoutOptions) => () => {
  return new Cypress.Promise((resolve, reject) => {
    let client = getClientFromSpec(Cypress.spec.name);

    log('in logout');

    if(!client) {
      log('no client');
      resolve();
      return;
    }

    let simulation = atom.slice(Cypress.spec.name, 'simulation').get();

    log(JSON.stringify(simulation));


    if(!simulation) {
      log('no simulation');
      resolve();
      return;
    }

    client.destroySimulation(simulation).then(() => {
      log('simulation destroyed');

      atom.slice(Cypress.spec.name).remove();
      resolve();
    }).catch(e => {
      log(`logout failed with ${e.message}`);
      reject(e);
    });
  });
};
