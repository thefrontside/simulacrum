import { cosmiconfigSync } from 'cosmiconfig';
import type { Auth0Configuration, Options, Schema } from '../types';
import { configurationSchema } from '../types';

function omit<T, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  let copy = {} as T;

  let remaining = (Object.keys(obj) as K[])
                      .flatMap(c => keys.includes(c) === false ? [c] : []);

  for(let k of remaining) {
    copy[k] = obj[k];
  }

  return copy;
}

const DefaultAuth0Port = 4400;

export const DefaultArgs: Schema = {
  clientID: '00000000000000000000000000000000',
  audience: 'https://thefrontside.auth0.com/api/v1/',
  scope: "openid profile email offline_access",
};

type Explorer = ReturnType<typeof cosmiconfigSync>;

function getPort({ domain, port }: Auth0Configuration): number {
  if(typeof port === 'number') {
    return port;
  }

  if(domain) {
    if(domain.split(':').length === 2) {
      return parseInt(domain.split(':')[1]);
    }
  }

  return DefaultAuth0Port;
}

// This higher order function would only be used for testing and
// allows different cosmiconfig instances to be used for testing
export function getConfigCreator(explorer: Explorer) {
  return function getConfig(options?: Options): Auth0Configuration {
    let searchResult = explorer.search();

    let config: Schema =
      searchResult === null ? DefaultArgs : searchResult.config;

    let strippedOptions = !!options ? omit(options, 'store', 'services') : {};

    let configuration = { ...DefaultArgs, ...config, ...strippedOptions } as Auth0Configuration;

    configuration.port = getPort(configuration);

    configurationSchema.parse(configuration);

    return configuration;
  };
}

const explorer = cosmiconfigSync("auth0Simulator");

export const getConfig = getConfigCreator(explorer);

