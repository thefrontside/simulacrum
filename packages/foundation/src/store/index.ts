import type { SimulationInputSchema, SimulationSchema } from "./schema";
import { setupStore } from "./setup";
import { thunks } from "./thunks";
import type { AnyState, FxStore, QueryState, StoreUpdater } from "starfx";
import { updateStore } from "starfx";

let updater = thunks.create<StoreUpdater<AnyState>[]>(
  "update",
  function* (ctx, next) {
    yield* updateStore(ctx.payload);
    yield* next();
  }
);
export type StoreThunks = typeof thunks;

export type Actions<Input extends Record<string, any>> = (arg: {
  thunks: StoreThunks;
  store: FxStore<QueryState & Input>;
  schema: SimulationSchema<Input>;
}) => Record<string, ReturnType<StoreThunks["create"]>>;

export function createSimulationStore<Input extends Record<string, any>>(
  {
    actions: inputActions,
    schema: inputSchema,
  }: {
    actions?: Actions<Input>;
    schema: SimulationInputSchema<Input>;
  } = { schema: (() => ({})) as unknown as SimulationInputSchema<Input> }
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
