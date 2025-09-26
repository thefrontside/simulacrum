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
} from "@simulacrum/foundation-simulator";
import {
  convertInitialStateToStoreState,
  defaultUser,
  type Auth0User,
  type AuthSession,
  type Auth0InitialStore,
} from "./entities.ts";

export type ExtendedSchema = ({ slice }: ExtendSimulationSchema) => {
  sessions: (
    n: string
  ) => TableOutput<AuthSession, AnyState, AuthSession | undefined>;
  users: (n: string) => TableOutput<Auth0User, AnyState, Auth0User | undefined>;
};
type ExtendActions = typeof inputActions;
type ExtendSelectors = typeof inputSelectors;
export type ExtendedSimulationStore = SimulationStore<
  ReturnType<ExtendedSchema>,
  ReturnType<ExtendActions>,
  ReturnType<ExtendSelectors>
>;

const inputSchema =
  <T>(
    initialState?: Auth0InitialStore,
    extendedSchema?: ExtendSimulationSchemaInput<T>
  ) =>
  ({ slice }: ExtendSimulationSchema) => {
    const storeInitialState = convertInitialStateToStoreState(initialState);

    const extended = extendedSchema ? extendedSchema({ slice }) : {};
    let slices = {
      sessions: slice.table<AuthSession>(),
      users: slice.table<Auth0User>({
        ...(!storeInitialState
          ? {
              initialState: {
                [defaultUser.id]: defaultUser,
              },
            }
          : { initialState: storeInitialState.users }),
      }),
      ...extended,
    };
    return slices;
  };

const inputActions = (args: ExtendSimulationActions<ExtendedSchema>) => {
  return {};
};

const extendActions =
  (extendedActions?: ExtendSimulationActionsInput<any, ExtendedSchema>) =>
  (args: ExtendSimulationActions<ExtendedSchema>) => {
    return extendedActions
      ? // @ts-expect-error schema is cyclical, ignore extension for now
        { ...inputActions(args), ...extendedActions(args) }
      : inputActions(args);
  };

const inputSelectors = (args: ExtendSimulationSelectors<ExtendedSchema>) => {
  const { createSelector, schema } = args;
  return {};
};

const extendSelectors =
  (extendedSelectors?: ExtendSimulationSelectorsInput<any, ExtendedSchema>) =>
  (args: ExtendSimulationSelectors<ExtendedSchema>) => {
    return extendedSelectors
      ? // @ts-expect-error schema is cyclical, ignore extension for now
        { ...inputSelectors(args), ...extendedSelectors(args) }
      : inputSelectors(args);
  };

export const extendStore = <T>(
  initialState: Auth0InitialStore | undefined,
  extended:
    | {
        actions: ExtendSimulationActionsInput<
          any,
          ExtendSimulationSchemaInput<T>
        >;
        selectors: ExtendSimulationSelectorsInput<
          any,
          ExtendSimulationSchemaInput<T>
        >;
        schema?: ExtendSimulationSchemaInput<T>;
      }
    | undefined
) => ({
  actions: extendActions(extended?.actions),
  selectors: extendSelectors(extended?.selectors),
  schema: inputSchema(initialState, extended?.schema),
});
