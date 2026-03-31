import type {
  SimulationStore,
  ExtendSimulationSchema,
  ExtendSimulationSchemaInput,
  ExtendSimulationActions,
  ExtendSimulationActionsInput,
  ExtendSimulationSelectors,
  ExtendSimulationSelectorsInput,
  TableOutput,
  AnyState,
  ExtendSimulationActionsInputLoose,
  ExtendSimulationSelectorsInputLoose,
  ExtendStoreConfig,
} from "@simulacrum/foundation-simulator";
import {
  convertInitialStateToStoreState,
  defaultUser,
  type Auth0User,
  type AuthSession,
  type Auth0InitialStore,
} from "./entities.ts";

export type ExtendedSchema = ({ slice }: ExtendSimulationSchema) => {
  sessions: (n: string) => TableOutput<AuthSession, AnyState, AuthSession | undefined>;
  users: (n: string) => TableOutput<Auth0User, AnyState, Auth0User | undefined>;
};
type ExtendActions = typeof inputActions;
type ExtendSelectors = typeof inputSelectors;
export type Auth0Schema = ReturnType<ExtendedSchema>;
export type Auth0Actions = ReturnType<ExtendActions>;
export type Auth0Selectors = ReturnType<ExtendSelectors>;

export type ExtendedSimulationStore = SimulationStore<Auth0Schema, Auth0Actions, Auth0Selectors>;

const inputSchema =
  <T>(initialState?: Auth0InitialStore, extendedSchema?: ExtendSimulationSchemaInput<T>) =>
  ({ slice }: ExtendSimulationSchema) => {
    const storeInitialState = convertInitialStateToStoreState(initialState);

    const extended = extendedSchema ? extendedSchema({ slice }) : {};
    let slices = {
      sessions: slice.table<AuthSession>(),
      users: slice.table<Auth0User>(
        !storeInitialState
          ? {
              initialState: {
                [defaultUser.id]: defaultUser,
              },
            }
          : { initialState: storeInitialState.users },
      ),
      ...extended,
    };
    return slices;
  };

const inputActions = (_args: ExtendSimulationActions<ExtendedSchema>) => {
  return {} as ExtendSimulationActions<ExtendedSchema>;
};

const extendActions =
  (extendedActions?: ExtendSimulationActionsInputLoose<Auth0Actions, Auth0Schema>) =>
  (args: ExtendSimulationActions<ExtendedSchema>) => {
    const base = inputActions(args);
    if (!extendedActions) return base;
    const extResult = extendedActions(args);
    return {
      ...(base as object),
      ...(extResult as object),
    } as Auth0Actions;
  };

const inputSelectors = (_args: ExtendSimulationSelectors<ExtendedSchema>) => {
  return {} as ExtendSimulationSelectors<ExtendedSchema>;
};

const extendSelectors =
  (extendedSelectors?: ExtendSimulationSelectorsInputLoose<Auth0Selectors, Auth0Schema>) =>
  (args: ExtendSimulationSelectors<ExtendedSchema>) => {
    const base = inputSelectors(args);
    if (!extendedSelectors) return base;
    const extResult = extendedSelectors(args);
    return {
      ...(base as object),
      ...(extResult as object),
    } as Auth0Selectors;
  };

export type Auth0ExtendStoreInput = ExtendStoreConfig<Auth0Schema, Auth0Actions, Auth0Selectors>;

export const extendStore = (
  initialState: Auth0InitialStore | undefined,
  extended?: Auth0ExtendStoreInput,
): {
  schema: ExtendSimulationSchemaInput<Auth0Schema>;
  actions?: ExtendSimulationActionsInput<Auth0Actions, Auth0Schema>;
  selectors?: ExtendSimulationSelectorsInput<Auth0Selectors, Auth0Schema>;
  logs?: boolean;
} => ({
  actions: extendActions(extended?.actions),
  selectors: extendSelectors(extended?.selectors),
  schema: inputSchema(initialState, extended?.schema),
});
