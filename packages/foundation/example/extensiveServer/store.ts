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
    dogs: slice.num(),
  };
  return slices;
};

const inputActions = ({
  thunks,
  schema,
}: ExtendSimulationActions<ExtendedSchema>) => {
  let addLotsOfDogs = thunks.create<{ quantity: number }>(
    "dogs:add-lots",
    function* boop(ctx, next) {
      yield* schema.update(schema.dogs.increment(ctx.payload.quantity));

      yield* next();
    }
  );

  return { addLotsOfDogs };
};

const inputSelectors = ({
  createSelector,
  schema,
}: ExtendSimulationSelectors<ExtendedSchema>) => {
  let booleanSpecificNumbers = createSelector(
    schema.dogs.select,
    (_: AnyState, input: number[]) => input,
    (boop, numbers) => {
      return numbers.includes(boop);
    }
  );

  return { booleanSpecificNumbers };
};

export const extendStore = {
  logs: false,
  actions: inputActions,
  selectors: inputSelectors,
  schema: inputSchema,
};
