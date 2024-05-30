import "./thunks";
import { setupStore } from "./setup";
import { thunks } from "./thunks";
import type { StoreUpdater } from "starfx";
import { updateStore } from "starfx";
import type { SimulationInputSchema } from "./schema";

let updater = thunks.create<StoreUpdater<any>[]>(
  "update",
  function* (ctx, next) {
    yield* updateStore(ctx.payload);
    yield* next();
  }
);

type CreateSimulationStore = typeof createSimulationStore;
export type SimulationStore = ReturnType<CreateSimulationStore>;
export function createSimulationStore(
  {
    actions: inputActions,
    schema: inputSchema,
  }: { actions: any; schema: SimulationInputSchema } = {
    actions: () => ({}),
    schema: () => ({}),
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
    ...inputActions({ thunks, store, schema }),
  };

  return {
    store,
    schema,
    actions,
  };
}
