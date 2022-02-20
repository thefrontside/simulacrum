import merge from "deepmerge";
import { cosmiconfigSync } from "cosmiconfig";
import type { Options } from '../types';

export const DefaultArgs: Pick<Options, 'clientID' | 'audience' | 'scope'> = {
  clientID: '00000000000000000000000000000000',
  audience: 'https://thefrontside.auth0.com/api/v1/',
  scope: "openid profile email offline_access",
};

const explorer = cosmiconfigSync("simulacrum");

export const getConfig = () => {
  let searchResult = explorer.search();

  let options: Options =
    searchResult === null ? DefaultArgs : searchResult.config;

  return merge(DefaultArgs, options);
};
