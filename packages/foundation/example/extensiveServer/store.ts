import type {
  SimulationStore,
  SimulationStoreThunks,
  SimulationSlice,
} from "../../src";

export type ExtendedStore = typeof extendStore;
export type ExtendedSimulationStore = SimulationStore<
  ReturnType<ExtendedStore["schema"]>,
  ReturnType<ExtendedStore["actions"]>
>;

const actions = ({
  thunks,
  schema,
}: {
  thunks: SimulationStoreThunks;
  schema: any;
}) => {
  let upsertTest = thunks.create("user:upsert", function* boop(ctx, next) {
    yield* schema.update(schema.test.add({ [ctx.payload.id]: ctx.payload }));

    yield* next();
  });

  return { upsertTest };
};

const schema = ({ slice }: { slice: SimulationSlice }) => {
  let slices = {
    test: slice.table(),
    booping: slice.str(),
    boop: slice.num(),
  };
  return slices;
};

export const extendStore = {
  actions,
  schema,
};
