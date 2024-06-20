import type { ExtendSimulationSchemaInput } from "./schema";
import { setupStore } from "./setup";
import type { AnyState, StoreUpdater } from "starfx";
import { createSelector } from "starfx";
import { updateStore, createThunks, mdw } from "starfx";

type StoreThunks = ReturnType<typeof createThunks>;
type Store<ExtendedSimulationSchema> = ReturnType<
  typeof setupStore<ExtendedSimulationSchema>
>;
export type ExtendSimulationActionsInput<Actions, ExtendedSimulationSchema> =
  (arg: {
    thunks: StoreThunks;
    store: Store<ExtendedSimulationSchema>["store"];
    schema: Store<ExtendedSimulationSchema>["schema"];
  }) => Actions;
export type ExtendSimulationSelectorsInput<
  Selectors,
  ExtendedSimulationSchema
> = (arg: {
  store: Store<ExtendedSimulationSchema>["store"];
  schema: Store<ExtendedSimulationSchema>["schema"];
  createSelector: typeof createSelector;
}) => Selectors;

export function createSimulationStore<
  ExtendedSimulationSchema,
  ExtendedSimulationActions,
  ExtendedSimulationSelectors
>(
  {
    actions: inputActions,
    selectors: inputSelectors,
    schema: inputSchema,
  }: {
    schema: ExtendSimulationSchemaInput<ExtendedSimulationSchema>;
    actions: ExtendSimulationActionsInput<
      ExtendedSimulationActions,
      ExtendedSimulationSchema
    >;
    selectors: ExtendSimulationSelectorsInput<
      ExtendedSimulationSelectors,
      ExtendedSimulationSchema
    >;
  } = {
    schema:
      (() => ({})) as unknown as ExtendSimulationSchemaInput<ExtendedSimulationSchema>,
    actions: (() => ({})) as unknown as ExtendSimulationActionsInput<
      ExtendedSimulationActions,
      ExtendedSimulationSchema
    >,
    selectors: (() => ({})) as unknown as ExtendSimulationSelectorsInput<
      ExtendedSimulationSelectors,
      ExtendedSimulationSchema
    >,
  }
) {
  const thunks = createThunks();
  // catch errors from task and logs them with extra info
  thunks.use(mdw.err);
  // where all the thunks get called in the middleware stack
  thunks.use(thunks.routes());

  let batchUpdater = thunks.create<StoreUpdater<AnyState>[]>(
    "update",
    function* (ctx, next) {
      yield* updateStore(ctx.payload);
      yield* next();
    }
  );

  let additionalTasks = [thunks.bootup];
  let { store, schema } = setupStore({
    logs: false,
    additionalTasks,
    inputSchema,
  });

  let inputedActions = inputActions({ thunks, store, schema });
  let actions = {
    batchUpdater,
    ...inputedActions,
  };

  let inputedSelectors = inputSelectors({ store, schema, createSelector });

  return {
    store,
    schema,
    actions,
    selectors: inputedSelectors,
  };
}

type CreateSimulationStore<
  ExtendedSimulationSchema,
  ExtendedSimulationActions,
  ExtendedSimulationSelectors
  // eslint has a parsing error which means we can't fix this
  //  it is however valid TypeScript
> = typeof createSimulationStore<
  ExtendedSimulationSchema,
  ExtendedSimulationActions,
  ExtendedSimulationSelectors
>;

export type SimulationStore<
  ExtendedSimulationSchema,
  ExtendedSimulationActions,
  ExtendedSimulationSelectors
> = ReturnType<
  CreateSimulationStore<
    ExtendedSimulationSchema,
    ExtendedSimulationActions,
    ExtendedSimulationSelectors
  >
>;

export type ExtendSimulationActions<
  InputSchema extends ExtendSimulationSchemaInput<any>
> = {
  thunks: StoreThunks;
  store: Store<ReturnType<InputSchema>>["store"];
  schema: Store<ReturnType<InputSchema>>["schema"];
};

export type ExtendSimulationSelectors<
  InputSchema extends ExtendSimulationSchemaInput<any>
> = {
  store: Store<ReturnType<InputSchema>>["store"];
  schema: Store<ReturnType<InputSchema>>["schema"];
  createSelector: typeof createSelector;
};
