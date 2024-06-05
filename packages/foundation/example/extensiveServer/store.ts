import type {
  SimulationStore,
  ExtendSimuationActions,
  ExtendSimulationSchema,
} from "../../src";

export type ExtendedSchema = typeof inputSchema;
type ExtendActions = typeof inputActions;
export type ExtendedSimulationStore = SimulationStore<
  ReturnType<ExtendedSchema>,
  ReturnType<ExtendActions>
>;

const inputSchema = ({ slice }: ExtendSimulationSchema) => {
  let slices = {
    test: slice.table(),
    booping: slice.str(),
    boop: slice.num(),
  };
  return slices;
};

const inputActions = ({
  thunks,
  schema,
}: ExtendSimuationActions<ExtendedSchema>) => {
  let upsertTest = thunks.create("user:upsert", function* boop(ctx, next) {
    yield* schema.update(schema.test.add({ [ctx.payload.id]: ctx.payload }));

    yield* next();
  });

  return { upsertTest };
};

export const extendStore = {
  actions: inputActions,
  schema: inputSchema,
};
