import type { Callable } from "starfx";
import { parallel, take, createStore } from "starfx";
import type { ExtendSimulationSchemaInput } from "./schema";
import { generateSchemaWithInputSlices } from "./schema";

export function setupStore<ExtendedSimulationSchema>({
  logs = true,
  additionalTasks = [],
  initialState,
  inputSchema,
}: {
  logs?: boolean;
  initialState?: Record<string, unknown>;
  additionalTasks?: Callable<unknown>[];
  inputSchema: ExtendSimulationSchemaInput<ExtendedSimulationSchema>;
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
