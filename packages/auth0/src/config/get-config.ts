import { cosmiconfigSync } from 'cosmiconfig';
import type { Options, Auth0Configuration } from '../types';
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

export const DefaultArgs: Auth0Configuration = {
  clientID: '00000000000000000000000000000000',
  audience: 'https://thefrontside.auth0.com/api/v1/',
  scope: "openid profile email offline_access",
  port: 3300
};

const explorer = cosmiconfigSync("auth0Simulator");

export const getConfig = (options: Options): Auth0Configuration => {
  let searchResult = explorer.search();

  let config: Auth0Configuration =
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
