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
  type EntraUser,
  type EntraInitialStore,
} from "./entities.ts";

export type ExtendedSchema = ({ slice }: ExtendSimulationSchema) => {
  users: (n: string) => TableOutput<EntraUser, AnyState, EntraUser | undefined>;
};
type ExtendActions = typeof inputActions;
type ExtendSelectors = typeof inputSelectors;
export type EntraSchema = ReturnType<ExtendedSchema>;
export type EntraActions = ReturnType<ExtendActions>;
export type EntraSelectors = ReturnType<ExtendSelectors>;

export type ExtendedSimulationStore = SimulationStore<EntraSchema, EntraActions, EntraSelectors>;

const inputSchema =
  <T>(initialState?: EntraInitialStore, extendedSchema?: ExtendSimulationSchemaInput<T>) =>
  ({ slice }: ExtendSimulationSchema) => {
    const storeInitialState = convertInitialStateToStoreState(initialState);

    const extended = extendedSchema ? extendedSchema({ slice }) : {};
    let slices = {
      users: slice.table<EntraUser>(
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
  (extendedActions?: ExtendSimulationActionsInputLoose<EntraActions, EntraSchema>) =>
  (args: ExtendSimulationActions<ExtendedSchema>) => {
    const base = inputActions(args);
    if (!extendedActions) return base;
    const extResult = extendedActions(args);
    return {
      ...(base as object),
      ...(extResult as object),
    } as EntraActions;
  };

const inputSelectors = (_args: ExtendSimulationSelectors<ExtendedSchema>) => {
  return {} as ExtendSimulationSelectors<ExtendedSchema>;
};

const extendSelectors =
  (extendedSelectors?: ExtendSimulationSelectorsInputLoose<EntraSelectors, EntraSchema>) =>
  (args: ExtendSimulationSelectors<ExtendedSchema>) => {
    const base = inputSelectors(args);
    if (!extendedSelectors) return base;
    const extResult = extendedSelectors(args);
    return {
      ...(base as object),
      ...(extResult as object),
    } as EntraSelectors;
  };

export type EntraExtendStoreInput = ExtendStoreConfig<EntraSchema, EntraActions, EntraSelectors>;

export const extendStore = (
  initialState: EntraInitialStore | undefined,
  extended?: EntraExtendStoreInput,
): {
  schema: ExtendSimulationSchemaInput<EntraSchema>;
  actions?: ExtendSimulationActionsInput<EntraActions, EntraSchema>;
  selectors?: ExtendSimulationSelectorsInput<EntraSelectors, EntraSchema>;
  logs?: boolean;
} => ({
  actions: extendActions(extended?.actions),
  selectors: extendSelectors(extended?.selectors),
  schema: inputSchema(initialState, extended?.schema),
  // forward the flag through so `extend.extendStore.logs = true` actually turns
  // on action logging instead of being silently dropped (only set the key when
  // provided, to satisfy exactOptionalPropertyTypes downstream)
  ...(typeof extended?.logs !== "undefined" ? { logs: extended.logs } : {}),
});
