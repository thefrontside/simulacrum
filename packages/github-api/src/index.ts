import {
  createFoundationSimulationServer,
  type SimulationHandlers,
  type FoundationSimulator,
  type SimulationStore as FoundationSimulationStore,
} from "@simulacrum/foundation-simulator";

import {
  type ExtendedSimulationStore,
  extendStore as mergeStoreConfig,
  type GitHubExtendStoreInput,
} from "./store/index.ts";
import { extendRouter } from "./extend-api.ts";
import { openapi } from "./rest/index.ts";
import { type GitHubInitialStore, gitubInitialStoreSchema } from "./store/entities.ts";
import type { SchemaFile } from "./utils.ts";

export type InitialState = GitHubInitialStore;

type FoundationRouter = Parameters<
  NonNullable<Parameters<typeof createFoundationSimulationServer>[0]["extendRouter"]>
>[0];

export type GitHubSimulatorArgs = {
  initialState?: GitHubInitialStore;
  apiUrl?: string;
  apiSchema?: SchemaFile | string;
  extend?: {
    extendStore?: GitHubExtendStoreInput;
    openapiHandlers?: (simulationStore: ExtendedSimulationStore) => SimulationHandlers;
    extendRouter?: (router: FoundationRouter, simulationStore: ExtendedSimulationStore) => void;
  };
};

// derive the concrete generic parameters from the exported ExtendedSimulationStore
type _GitHubSchema =
  ExtendedSimulationStore extends FoundationSimulationStore<infer S, infer _A, infer _Sel>
    ? S
    : never;
type _GitHubActions =
  ExtendedSimulationStore extends FoundationSimulationStore<infer _S, infer A, infer _Sel>
    ? A
    : never;
type _GitHubSelectors =
  ExtendedSimulationStore extends FoundationSimulationStore<infer _S, infer _A, infer Sel>
    ? Sel
    : never;

export const simulation = (
  args: GitHubSimulatorArgs = {},
): FoundationSimulator<ExtendedSimulationStore> => {
  const parsedInitialState = !args?.initialState
    ? undefined
    : gitubInitialStoreSchema.parse(args?.initialState);
  const extendStoreConfig = mergeStoreConfig(parsedInitialState, args?.extend?.extendStore);

  return createFoundationSimulationServer<_GitHubSchema, _GitHubActions, _GitHubSelectors>({
    port: 3300, // default port
    simulationContextPage: "/simulation",
    extendStore: extendStoreConfig,
    extendRouter: extendRouter(args?.extend?.extendRouter),
    openapi: openapi(
      parsedInitialState,
      args?.apiUrl ?? "/",
      args?.apiSchema ?? "api.github.com.json",
      args?.extend?.openapiHandlers,
    ),
  })();
};

export {
  githubUserSchema,
  githubOrganizationSchema,
  githubRepositorySchema,
  githubBranchSchema,
  githubBlobSchema,
} from "./store/entities.ts";
