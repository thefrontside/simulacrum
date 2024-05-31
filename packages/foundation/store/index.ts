import type { SimulationInputSchema } from "./schema";
import type { SimulationStore } from "./setup";
import { setupStore } from "./setup";
import { thunks } from "./thunks";
import type { AnyState, StoreUpdater } from "starfx";
import { updateStore } from "starfx";
import type { ReturnTypes } from "./types";

let updater = thunks.create<StoreUpdater<AnyState>[]>(
  "update",
  function* (ctx, next) {
    yield* updateStore(ctx.payload);
    yield* next();
  }
);
export type StoreThunks = typeof thunks;

export function createSimulationStore<
  ExtendedStoreSchema extends SimulationInputSchema,
  ExtendedStoreActions extends (arg: {
    thunks: StoreThunks;
    store: SimulationStore["store"];
    schema: SimulationStore["schema"] &
      ReturnTypes<ReturnType<ExtendedStoreSchema>>;
  }) => { [Key: string]: ReturnType<StoreThunks["create"]> }
>(
  {
    actions: inputActions,
    schema: inputSchema,
  }: {
    actions: ExtendedStoreActions | undefined;
    schema: ExtendedStoreSchema | undefined;
  } = {
    actions: undefined,
    schema: undefined,
  }
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
