import type { Callable, FxStore, QueryState } from "starfx";
import { parallel, take, createStore } from "starfx";
import type { SimulationInputSchema, SimulationSchema } from "./schema";
import { generateSchemaWithInputSlices } from "./schema";

<<<<<<< Updated upstream
export type SimulationStore = ReturnType<typeof setupStore>;
export function setupStore<ExtendedStoreSchema extends SimulationInputSchema>({
=======
export function setupStore<Input>({
>>>>>>> Stashed changes
  logs = true,
  additionalTasks = [],
  initialState,
  inputSchema,
}: {
  logs: boolean;
  initialState?: Record<string, any>;
  additionalTasks?: Callable<unknown>[];
<<<<<<< Updated upstream
  inputSchema?: ExtendedStoreSchema;
}) {
=======
  inputSchema: SimulationInputSchema<Input>;
}): { store: FxStore<QueryState & Input>; schema: SimulationSchema<Input> } {
>>>>>>> Stashed changes
  let [schema, schemaInitialState] = generateSchemaWithInputSlices(inputSchema);
  let store = createStore({
    initialState: {
      ...schemaInitialState,
      ...initialState,
    },
  });

  let tsks: Callable<unknown>[] = [...additionalTasks];
  if (logs) {
    // log all actions dispatched
    tsks.push(function* logActions() {
      while (true) {
        let action = yield* take("*");
        console.dir(action, { depth: 5 });
      }
    });
  }

  store.run(function* () {
    let group = yield* parallel(tsks);
    yield* group;
  });

  return { store, schema } as any;
}
