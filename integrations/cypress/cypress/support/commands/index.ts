/* eslint-disable @typescript-eslint/no-namespace */

import { createAtom } from '@effection/atom';
import { makeCreateSimulation } from './create-simulation';
import { CreateSimulation, Person, TestState, Token } from '../types';
import { makeGetClientFromSpec } from '../utils/spec';
import { makeGiven } from './given';
import { makeLogin } from './login';
import { makeLogout } from './logout';

declare global {
  namespace Cypress {
    interface Chainable<Subject> {
      createSimulation(options: CreateSimulation): Chainable<Subject>;
      login(person?: Partial<Person>): Chainable<Token>;
      logout(): Chainable<void>;
      given(attrs?: Partial<Person>): Chainable<Person>;
      out<S = unknown>(msg: string): Chainable<S>
    }
  }
}

const atom = createAtom<TestState>({});

const ClientPort = Number(process.env.PORT || 4000);

const getClientFromSpec = makeGetClientFromSpec({ atom, port: ClientPort });

Cypress.Commands.add('createSimulation', makeCreateSimulation({ atom, getClientFromSpec }));

Cypress.Commands.add('given', makeGiven({ atom, getClientFromSpec }));

Cypress.Commands.add('login', makeLogin({ atom }));

Cypress.Commands.add('logout', makeLogout({ atom, getClientFromSpec }));

export { };
