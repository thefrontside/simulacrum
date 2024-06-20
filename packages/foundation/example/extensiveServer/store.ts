import type {
  SimulationStore,
  ExtendSimulationActions,
  ExtendSimulationSelectors,
  ExtendSimulationSchema,
  AnyState,
} from "../../src";

export type ExtendedSchema = typeof inputSchema;
type ExtendActions = typeof inputActions;
type ExtendSelectors = typeof inputSelectors;
export type ExtendedSimulationStore = SimulationStore<
  ReturnType<ExtendedSchema>,
  ReturnType<ExtendActions>,
  ReturnType<ExtendSelectors>
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
}: ExtendSimulationActions<ExtendedSchema>) => {
  let upsertTest = thunks.create("user:upsert", function* boop(ctx, next) {
    yield* schema.update(schema.test.add({ [ctx.payload.id]: ctx.payload }));

    yield* next();
  });

  return { upsertTest };
};

const inputSelectors = ({
  createSelector,
  schema,
}: ExtendSimulationSelectors<ExtendedSchema>) => {
  let booleanSpecificNumbers = createSelector(
    schema.boop.select,
    (_: AnyState, input: number[]) => input,
    (boop, numbers) => {
      return numbers.includes(boop);
    }
  );

  return { booleanSpecificNumbers };
};

export const extendStore = {
  actions: inputActions,
  selectors: inputSelectors,
  schema: inputSchema,
};
