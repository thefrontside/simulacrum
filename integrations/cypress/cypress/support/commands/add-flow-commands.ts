import { Slice } from '@effection/atom';
import { makeCypressLogger } from '../utils/cypress-logger';
import { getConfig } from '../utils/config';
import { AuthorizationCodeFlows, TestState } from '../types';
import { makeAuthorizationCodeLogin } from './authorization_code';
import { makeLoginWithPKCE } from './authorization_code_with_pkce';

export interface MakeLoginOptions {
  atom: Slice<TestState>;
}

const log = makeCypressLogger('simulacrum-flow-commands');

const authorizationFlows = {
  authorization_code: {
    login: makeAuthorizationCodeLogin,
  },
  authorization_code_with_pkce: {
    login: makeLoginWithPKCE,
  },
} as const;

export const makeAuthorizationFlowCommands = ({ atom }: MakeLoginOptions) => {
  let config = getConfig();

  let flow: AuthorizationCodeFlows = config.flow;

  log(`Using ${flow} flow`);

  let commands = authorizationFlows[flow];

  for (let [name, command] of Object.entries(commands)) {
    Cypress.Commands.add(name, command({ atom }));
  }
};
