import { Slice } from '@effection/atom';
import { GetClientFromSpec, Person, TestState } from '../types';
import { assert } from 'assert-ts';
import { makeCypressLogger } from '../utils/cypress-logger';

export interface MakeGivenOptions {
  atom: Slice<TestState>;
  getClientFromSpec: GetClientFromSpec;
}

const log = makeCypressLogger('simulacrum-given');

export const makeGiven = ({ atom, getClientFromSpec }: MakeGivenOptions) => (attrs: Partial<Person> = {}) => {
  return new Cypress.Promise((resolve, reject) => {
    let client = getClientFromSpec(Cypress.spec.name);
    let simulation = atom.slice(Cypress.spec.name, 'simulation').get();

    assert(!!simulation, 'no sumulation in given');
    assert(!!client && typeof client.given === 'function', 'no valid client in given');

    client.given<Person>(simulation, "person", attrs)
      .then((scenario) => {
        atom.slice(Cypress.spec.name).update(current => {
          return {
            ...current,
            person: scenario.data
          };
        });

        log(`scenario created with ${JSON.stringify(scenario)}`);

        resolve(scenario.data);
      })
      .catch((e) => {
        log(`given failed ${e.message}`);

        reject(e);
      });
  });
};

