import type { CommandMaker } from '../types';
import { makeCypressLogger } from '../utils/cypress-logger';
import { getConfig } from '../utils/config';
import { makeAuthorizationCodeLogin } from './authorization_code';
import { makeLoginWithPKCE } from './authorization_code_with_pkce';
import { makeAuthorizationCodeLogout } from './authorization_code/logout';

const log = makeCypressLogger('simulacrum-flow-commands');

const authorizationFlows = {
  authorization_code: {
    login: makeAuthorizationCodeLogin,
    logout: makeAuthorizationCodeLogout
  },
  authorization_code_with_pkce: {
    login: makeLoginWithPKCE,
  },
} as const;

export const makeAuthorizationFlowCommands = ({ atom, getClientFromSpec }: CommandMaker) => {
  let config = getConfig();

  let flow = config.flow;

  log(`Using ${flow} flow`);

  let commands = authorizationFlows[flow];

  for (let [name, command] of Object.entries(commands)) {
    Cypress.Commands.add(name, command({ atom, getClientFromSpec }));
  }
};
