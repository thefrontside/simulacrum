import { createSimulationStore } from "../src/store";
import type { SimulationSlice } from "../src/store/schema";
import { generateSchemaWithInputSlices } from "../src/store/schema";
import { setupStore } from "../src/store/setup";

const inputSchema = ({ slice }: { slice: SimulationSlice }) => {
  let slices = {
    test: slice.table(),
    booping: slice.str(),
    boop: slice.num(),
  };
  return slices;
};
const inputActions = ({ thunks, schema }) => {
  let upsertTest = thunks.create("user:upsert", function* boop(ctx, next) {
    yield* schema.update(schema.test.add({ [ctx.payload.id]: ctx.payload }));

    yield* next();
  });

  return { upsertTest };
};

const [generated, initialState] = generateSchemaWithInputSlices(inputSchema);
const boopSchemaGenerated = generated.boop.increment();

const setuped = setupStore({ inputSchema });
const boopSchemaFromSetup = setuped.schema.boop.increment();
const boopStore = setuped.store.dispatch;

const created = createSimulationStore({
  schema: inputSchema,
  actions: inputActions,
});
const boopSchemaFromCreate = created.schema.boop.increment();
const boopActionsDefaultFromCreate = created.actions.batchUpdater;
const boopActionsCustomFromCreate = created.actions.upsertTest;
