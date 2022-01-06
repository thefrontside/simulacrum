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
    assert(typeof client?.given === 'function', 'no valid client in given');

    let simulation = atom.slice(Cypress.spec.name, 'simulation').get();
    assert(!!simulation, 'no sumulation in given');

    log(`creating person with attrs: ${JSON.stringify(attrs)}`);

    client.given<Person>(simulation, "person", attrs)
      .then((scenario) => {
        log(`person created ${JSON.stringify(scenario)}`);

        atom.slice(Cypress.spec.name).update(current => {
          return {
            ...current,
            person: scenario.data
          };
        });

        resolve(scenario.data);
      })
      .catch((e) => {
        log(`given failed ${e.message}`);

        reject(e);
      });
  });
};

