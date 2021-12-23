import { Slice } from '@effection/atom';
import { GetClientFromSpec, TestState } from '../types';

export interface MakeLogoutOptions {
  atom: Slice<TestState>;
  getClientFromSpec: GetClientFromSpec;
}

export const makeLogout = ({ atom, getClientFromSpec }: MakeLogoutOptions) => () => {
  return new Cypress.Promise((resolve, reject) => {
    let client = getClientFromSpec(Cypress.spec.name);

    Cypress.log({
      name: 'simulacrum-logout',
      displayName: 'simulacrum-logout',
      message: 'in logout'
    });

    let simulation = atom.slice(Cypress.spec.name, 'simulation').get();

    if(!client || !simulation) {
      Cypress.log({
        name: 'simulacrum-logout',
        displayName: 'simulacrum-logout',
        message: 'no simulation or client'
      });
      resolve();
      return;
    }

    client.destroySimulation(simulation).then(() => {
      Cypress.log({
        name: 'simulacrum-logout',
        displayName: 'simulacrum-logout',
        message: 'simulation destroyed'
      });

      atom.slice(Cypress.spec.name).remove();

      resolve();
    }).catch(e => {

      Cypress.log({
        name: 'simulacrum-logout',
        displayName: 'simulacrum-logout',
        message: `logout failed with ${e.message}`
      });
      reject(e);
    });
  });
};
