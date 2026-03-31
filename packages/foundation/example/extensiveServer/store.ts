import type {
  SimulationStore,
  ExtendSimulationActions,
  ExtendSimulationSelectors,
  ExtendSimulationSelectorsInput,
  ExtendSimulationTasks,
  ExtendSimulationSchema,
  AnyState,
  ExtendStoreConfig,
} from "../../src/index.ts";

export type ExtendedSchema = typeof schema;
export type ExtendActions = typeof actions;
export type ExtendSelectors = typeof selectors;
type ExampleSelectors = {
  booleanSpecificNumbers: (state: AnyState, input: number[]) => boolean;
};
// `tasks` is a function that returns { tasks: (() => Operation<unknown>)[]; actions: Actions }
// Export the Actions portion as the `ExtendTasks` type so it can be used
// as the fourth generic parameter to `SimulationStore` (which expects the
// actions shape, not the whole return type of the tasks function).
export type ExtendTasks = ReturnType<typeof tasks>["actions"];
export type ExtendedSimulationStore = SimulationStore<
  ReturnType<ExtendedSchema>,
  ReturnType<ExtendActions>,
  ReturnType<ExtendSelectors>,
  ExtendTasks
>;

const schema = ({ slice }: ExtendSimulationSchema) => {
  let slices = {
    dogs: slice.num(),
  };
  return slices;
};

const actions = ({
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

const selectors: ExtendSimulationSelectorsInput<
  ExampleSelectors,
  ReturnType<ExtendedSchema>
> = ({
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

const tasks = ({ createWebhook }: ExtendSimulationTasks<ExtendedSchema>) => {
  const webhook = createWebhook("https://example.com");
  const onTest = webhook.create<{ id: string; name: string }>(
    "/webhook-endpoint",
    function* (ctx, next) {
      // the following would send off that request
      //  but we don't want to post in tests
      ctx.request = ctx.req({
        body: JSON.stringify(ctx.payload),
      });

      // calling this will proceed through the middleware chain
      // and actually send the request
      yield* next();
    }
  );

  return { tasks: [webhook.task], actions: { webhooks: { onTest } } };
};

export const extendStore: ExtendStoreConfig<
  ReturnType<ExtendedSchema>,
  ReturnType<ExtendActions>,
  ReturnType<ExtendSelectors>,
  ReturnType<typeof tasks>["actions"]
> = {
  logs: false,
  actions,
  selectors,
  tasks,
  schema,
};
