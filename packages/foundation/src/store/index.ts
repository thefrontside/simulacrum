import type { ExtendSimulationSchemaInput } from "./schema";
import { setupStore } from "./setup";
import { thunks } from "./thunks";
import type { AnyState, StoreUpdater } from "starfx";
import { updateStore } from "starfx";

let batchUpdater = thunks.create<StoreUpdater<AnyState>[]>(
  "update",
  function* (ctx, next) {
    yield* updateStore(ctx.payload);
    yield* next();
  }
);
export type StoreThunks = typeof thunks;
export type ExtendSimulationActionsInput<T> = (arg: {
  thunks: StoreThunks;
  store: any;
  schema: any;
}) => T;

export function createSimulationStore<
  ExtendedSimulationSchema,
  ExtendedSimulationActions
>(
  {
    actions: inputActions,
    schema: inputSchema,
  }: {
    schema: ExtendSimulationSchemaInput<ExtendedSimulationSchema>;
    actions: ExtendSimulationActionsInput<ExtendedSimulationActions>;
  } = {
    schema:
      (() => ({})) as unknown as ExtendSimulationSchemaInput<ExtendedSimulationSchema>,
    actions:
      (() => ({})) as unknown as ExtendSimulationActionsInput<ExtendedSimulationActions>,
  }
) {
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

  return {
    store,
    schema,
    actions,
  };
}

type CreateSimulationStore<
  ExtendedSimulationSchema,
  ExtendedSimulationActions
  // eslint has a parsing error which means we can't fix this
  //  it is however valid TypeScript
> = typeof createSimulationStore<
  ExtendedSimulationSchema,
  ExtendedSimulationActions
>;

export type SimulationStore<
  ExtendedSimulationSchema,
  ExtendedSimulationActions
> = ReturnType<
  CreateSimulationStore<ExtendedSimulationSchema, ExtendedSimulationActions>
>;
