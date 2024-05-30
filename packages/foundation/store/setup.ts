import type { Callable } from "starfx";
import { parallel, take, createStore } from "starfx";
import type { SimulationInputSchema } from "./schema";
import { generateSchemaWithInputSlices } from "./schema";

export function setupStore({
  logs = true,
  additionalTasks = [],
  initialState,
  inputSchema,
}: {
  logs: boolean;
  initialState?: Record<string, any>;
  additionalTasks?: Callable<unknown>[];
  inputSchema: SimulationInputSchema;
}) {
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

  return { store, schema };
}
