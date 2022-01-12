import type { AuthorizationCodeFlows, CommandMaker } from '../types';
import { makeCypressLogger } from '../utils/cypress-logger';
import { getConfig } from '../utils/config';
import { makeAuthorizationCodeLogin } from './authorization_code/login';
import { makeLoginWithPKCE } from './authorization_code_with_pkce/login';
import { makeAuthorizationCodeLogout } from './authorization_code/logout';
import { makeLogoutWithPKCE } from './authorization_code_with_pkce/logout';

const log = makeCypressLogger('simulacrum-flow-commands');

type Maker = ({ atom, getClientFromSpec }: CommandMaker) => () => void;

type Commands = Record<AuthorizationCodeFlows, { login: Maker, logout: Maker }>;

const authorizationFlows: Commands = {
  authorization_code: {
    login: makeAuthorizationCodeLogin,
    logout: makeAuthorizationCodeLogout
  },
  authorization_code_with_pkce: {
    login: makeLoginWithPKCE,
    logout: makeLogoutWithPKCE
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
