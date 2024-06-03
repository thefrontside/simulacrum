<<<<<<< Updated upstream
import type { SimulationInputSchema } from "./schema";
import type { SimulationStore } from "./setup";
import { setupStore } from "./setup";
import { thunks } from "./thunks";
import type { AnyState, StoreUpdater } from "starfx";
import { updateStore } from "starfx";
import type { ReturnTypes } from "./types";
=======
import type { DefaultSchema, SimulationInputSchema, SimulationSchema } from "./schema";
import { setupStore } from "./setup";
import { thunks } from "./thunks";
import type { AnyState, FxSchema, FxStore, QueryState, StoreUpdater } from "starfx";
import { updateStore } from "starfx";
>>>>>>> Stashed changes

let updater = thunks.create<StoreUpdater<AnyState>[]>(
  "update",
  function* (ctx, next) {
    yield* updateStore(ctx.payload);
    yield* next();
  }
);
export type StoreThunks = typeof thunks;

<<<<<<< Updated upstream
export function createSimulationStore<
  ExtendedStoreSchema extends SimulationInputSchema,
  ExtendedStoreActions extends (arg: {
    thunks: StoreThunks;
    store: SimulationStore["store"];
    schema: SimulationStore["schema"] &
      ReturnTypes<ReturnType<ExtendedStoreSchema>>;
  }) => { [Key: string]: ReturnType<StoreThunks["create"]> }
>(
=======
export type Actions<Input extends Record<string, any>> = (arg: {
  thunks: StoreThunks;
  store: FxStore<QueryState & Input>;
  schema: SimulationSchema<Input>;
}) => Record<string, ReturnType<StoreThunks["create"]>>

export function createSimulationStore<Input extends Record<string, any>>(
>>>>>>> Stashed changes
  {
    actions: inputActions,
    schema: inputSchema,
  }: {
<<<<<<< Updated upstream
    actions: ExtendedStoreActions | undefined;
    schema: ExtendedStoreSchema | undefined;
  } = {
    actions: undefined,
    schema: undefined,
  }
=======
    actions?: Actions<Input>;
    schema: SimulationInputSchema<Input>;
  } = { schema: (() => ({})) as unknown as SimulationInputSchema<Input> }
>>>>>>> Stashed changes
) {
  let additionalTasks = [thunks.bootup];
  let { store, schema } = setupStore({
    logs: false,
    additionalTasks,
    inputSchema,
  });

  let actions = {
    updater,
    ...(inputActions ? inputActions({ thunks, store, schema }) : {}),
  };

  return {
    store,
    schema,
    actions,
  };
}
