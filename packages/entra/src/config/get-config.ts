import { cosmiconfigSync } from "cosmiconfig";
import type { EntraConfiguration, ConfigSchema } from "../types.ts";
import { configurationSchema } from "../types.ts";

const DefaultEntraPort = 4400;

export const DefaultArgs: ConfigSchema = {
  // a stable, obviously-fake tenant GUID for local development
  tenant: "0e8a3b8a-0000-4000-a000-0000000000ab",
  clientId: "00000000-0000-0000-0000-000000000000",
  audience: "00000000-0000-0000-0000-000000000000",
  scope: "openid profile email offline_access",
};

type Explorer = ReturnType<typeof cosmiconfigSync>;

function getPort({ port }: EntraConfiguration): number {
  if (typeof port === "number") {
    return port;
  }

  return DefaultEntraPort;
}

// This higher order function would only be used for testing and
// allows different cosmiconfig instances to be used for testing
export function getConfigCreator(explorer: Explorer) {
  return function getConfig(options?: Partial<EntraConfiguration>): EntraConfiguration {
    let searchResult = explorer.search();

    let config: ConfigSchema = searchResult === null ? DefaultArgs : searchResult.config;

    let strippedOptions = options ?? {};

    let configuration = {
      ...DefaultArgs,
      ...config,
      ...strippedOptions,
    } as EntraConfiguration;

    configuration.port = getPort(configuration);

    configurationSchema.parse(configuration);

    return configuration;
  };
}

const explorer = cosmiconfigSync("entraSimulator");

export const getConfig = getConfigCreator(explorer);
