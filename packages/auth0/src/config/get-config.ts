import { cosmiconfigSync } from 'cosmiconfig';
import type { Options, Schema } from '../types';
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

export const DefaultArgs: Schema = {
  clientID: '00000000000000000000000000000000',
  audience: 'https://thefrontside.auth0.com/api/v1/',
  scope: "openid profile email offline_access",
  port: 3300
};

type Explorer = ReturnType<typeof cosmiconfigSync>;

// This higher order function would only be used for testing and
// allows different cosmiconfig instances to be used for testing
export function getConfigCreator(explorer: Explorer) {
  return function getConfig(options: Options) {
    let searchResult = explorer.search();

    let config: Schema =
      searchResult === null ? DefaultArgs : searchResult.config;

    let strippedOptions = omit(options, 'store', 'services');

    let configuration = { ...DefaultArgs, ...config, ...strippedOptions };

    try {
      configurationSchema.parse(configuration);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }

    return configuration;
  };
}

const explorer = cosmiconfigSync("auth0Simulator");

export const getConfig = getConfigCreator(explorer);

