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
import {
  type GitHubInitialStore,
  gitubInitialStoreSchema,
} from "./store/entities.ts";
import type { SchemaFile } from "./utils.ts";

export type InitialState = GitHubInitialStore;

// derive the concrete generic parameters from the exported ExtendedSimulationStore
type _GitHubSchema = ExtendedSimulationStore extends FoundationSimulationStore<
  infer S,
  infer A,
  infer Sel
>
  ? S
  : never;
type _GitHubActions = ExtendedSimulationStore extends FoundationSimulationStore<
  infer S,
  infer A,
  infer Sel
>
  ? A
  : never;
type _GitHubSelectors =
  ExtendedSimulationStore extends FoundationSimulationStore<
    infer S,
    infer A,
    infer Sel
  >
    ? Sel
    : never;

type SimulationInput = Parameters<
  typeof createFoundationSimulationServer<
    _GitHubSchema,
    _GitHubActions,
    _GitHubSelectors
  >
>[0];

export type GitHubSimulatorArgs = {
  initialState?: GitHubInitialStore;
  apiUrl?: string;
  apiSchema?: SchemaFile | string;
  extend?: {
    extendStore?: GitHubExtendStoreInput<
      _GitHubSchema,
      _GitHubActions,
      _GitHubSelectors
    >;
    openapiHandlers?: (
      simulationStore: ExtendedSimulationStore
    ) => SimulationHandlers;
    extendRouter?: SimulationInput["extendRouter"];
  };
};

export const simulation = (
  args: GitHubSimulatorArgs = {}
): FoundationSimulator<ExtendedSimulationStore> => {
  const parsedInitialState = !args?.initialState
    ? undefined
    : gitubInitialStoreSchema.parse(args?.initialState);
  const extendStore = mergeStoreConfig<_GitHubSchema>(
    parsedInitialState,
    args?.extend?.extendStore as unknown as GitHubExtendStoreInput<
      _GitHubSchema,
      _GitHubActions,
      _GitHubSelectors
    >
  ) as unknown as SimulationInput["extendStore"];

  return createFoundationSimulationServer<
    _GitHubSchema,
    _GitHubActions,
    _GitHubSelectors
  >({
    port: 3300, // default port
    simulationContextPage: "/simulation",
    extendStore,
    extendRouter,
    openapi: openapi(
      parsedInitialState,
      args?.apiUrl ?? "/",
      args?.apiSchema ?? "api.github.com.json",
      args?.extend?.openapiHandlers
    ),
  } as unknown as SimulationInput)();
};

export {
  githubUserSchema,
  githubOrganizationSchema,
  githubRepositorySchema,
  githubBranchSchema,
  githubBlobSchema,
} from "./store/entities.ts";
