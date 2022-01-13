import type { Auth0Providers, CommandMaker } from '../types';
import { makeCypressLogger } from '../utils/cypress-logger';
import { getConfig } from '../utils/config';
import { makeAuthorizationCodeLogin } from './nextjs_auth0/login';
import { makeLogin } from './auth0_react/login';
import { makeAuthorizationCodeLogout } from './nextjs_auth0/logout';
import { makeLogout } from './auth0_react/logout';

const log = makeCypressLogger('simulacrum-provider-commands');

type Maker = ({ atom, getClientFromSpec }: CommandMaker) => () => void;

type Commands = Record<Auth0Providers, { login: Maker, logout: Maker }>;

const providerCommands: Commands = {
  nextjs_auth0: {
    login: makeAuthorizationCodeLogin,
    logout: makeAuthorizationCodeLogout
  },
  auth0_react: {
    login: makeLogin,
    logout: makeLogout
  },
} as const;

export const makeProviderCommands = ({ atom, getClientFromSpec }: CommandMaker) => {
  let config = getConfig();

  let provider = config.provider;

  log(`Using ${provider} provider`);

  let commands = providerCommands[provider];

  for (let [name, command] of Object.entries(commands)) {
    Cypress.Commands.add(name, command({ atom, getClientFromSpec }));
  }
};
