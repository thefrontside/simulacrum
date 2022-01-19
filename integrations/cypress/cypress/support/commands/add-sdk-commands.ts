import type { Auth0SDKs, CommandMaker } from '../types';
import { makeCypressLogger } from '../utils/cypress-logger';
import { getConfig } from '../utils/config';
import { makeLogin as makeNextLogin } from './nextjs_auth0/login';
import { makeLogin as makeReactLogin } from './auth0_react/login';
import { makeLogout as makeNextLogout } from './nextjs_auth0/logout';
import { makeLogout as makeReactLogout } from './auth0_react/logout';

const log = makeCypressLogger('simulacrum-provider-commands');

type Maker = ({ atom, getClientFromSpec }: CommandMaker) => () => void;

type Commands = Record<Auth0SDKs, { login: Maker, logout: Maker }>;

const providerCommands: Commands = {
  nextjs_auth0: {
    login: makeNextLogin,
    logout: makeNextLogout
  },
  auth0_react: {
    login: makeReactLogin,
    logout: makeReactLogout
  },
} as const;

export const makeSDKCommands = ({ atom, getClientFromSpec }: CommandMaker) => {
  let config = getConfig();

  let provider = config.sdk;

  log(`Using ${provider} provider`);

  let commands = providerCommands[provider];

  for (let [name, command] of Object.entries(commands)) {
    Cypress.Commands.add(name, command({ atom, getClientFromSpec }));
  }
};
