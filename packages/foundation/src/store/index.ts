import {
  generateSchemaWithInputSlices,
  type ExtendSimulationSchemaInput,
} from "./schema.ts";
import type { AnyState, StoreUpdater, Callable, ApiCtx } from "starfx";
import {
  parallel,
  take,
  select,
  createStore,
  createSelector,
  createApi,
} from "starfx";
import { updateStore, createThunks, mdw } from "starfx";

type StoreThunks = ReturnType<typeof createThunks>;
type GeneratedSchema<ExtendedSimulationSchema> = ReturnType<
  typeof generateSchemaWithInputSlices<ExtendedSimulationSchema>
>;
type GeneratedStore<ExtendedSimulationSchema> = ReturnType<
  typeof createStore<GeneratedSchema<ExtendedSimulationSchema>[1]>
>;

export type ExtendSimulationActionsInput<Actions, ExtendedSimulationSchema> =
  (arg: {
    thunks: StoreThunks;
    store: GeneratedStore<ExtendedSimulationSchema>;
    schema: GeneratedSchema<ExtendedSimulationSchema>[0];
  }) => Actions;
export type ExtendSimulationSelectorsInput<
  Selectors,
  ExtendedSimulationSchema
> = (arg: {
  store: GeneratedStore<ExtendedSimulationSchema>;
  schema: GeneratedSchema<ExtendedSimulationSchema>[0];
  createSelector: typeof createSelector;
}) => Selectors;
export type ExtendSimulationTaskInput<Actions, ExtendedSimulationSchema> =
  (arg: {
    createWebhook: any;
    store: GeneratedStore<ExtendedSimulationSchema>;
    schema: GeneratedSchema<ExtendedSimulationSchema>[0];
  }) => { tasks: Callable<unknown>[]; actions: Actions };

export function createSimulationStore<
  ExtendedSimulationSchema,
  ExtendedSimulationActions,
  ExtendedSimulationSelectors,
  ExtendedSimulationTasks
>(
  {
    actions: inputActions,
    selectors: inputSelectors,
    schema: inputSchema,
    tasks: inputTasks,
    logs = false,
  }: {
    schema: ExtendSimulationSchemaInput<ExtendedSimulationSchema>;
    actions: ExtendSimulationActionsInput<
      ExtendedSimulationActions,
      ExtendedSimulationSchema
    >;
    selectors: ExtendSimulationSelectorsInput<
      ExtendedSimulationSelectors,
      ExtendedSimulationSchema
    >;
    tasks: ExtendSimulationTaskInput<
      ExtendedSimulationTasks,
      ExtendedSimulationSchema
    >;
    logs?: boolean;
  } = {
    schema:
      (() => ({})) as unknown as ExtendSimulationSchemaInput<ExtendedSimulationSchema>,
    actions: (() => ({})) as unknown as ExtendSimulationActionsInput<
      ExtendedSimulationActions,
      ExtendedSimulationSchema
    >,
    selectors: (() => ({})) as unknown as ExtendSimulationSelectorsInput<
      ExtendedSimulationSelectors,
      ExtendedSimulationSchema
    >,
    tasks: (() => ({
      tasks: [],
      actions: {},
    })) as unknown as ExtendSimulationTaskInput<
      ExtendedSimulationTasks,
      ExtendedSimulationSchema
    >,
    logs: false,
  }
) {
  const thunks = createThunks();
  // catch errors from task and logs them with extra info
  thunks.use(mdw.err);
  // where all the thunks get called in the middleware stack
  thunks.use(thunks.routes());

  let batchUpdater = thunks.create<StoreUpdater<AnyState>[]>(
    "update",
    function* (ctx, next) {
      yield* updateStore(ctx.payload);
      yield* next();
    }
  );
  let simulationLog = thunks.create<{
    method: string;
    url: string;
    query: Record<string, any>;
    body: any;
  }>("simulationLog", function* (ctx, next) {
    const { method, url, query, body } = ctx.payload;
    const timestamp = Date.now();

    yield* schema.update(
      schema.simulationLogs.add({
        [timestamp]: {
          timestamp,
          level: "info",
          message: `${method} ${url}`,
          meta: { method, url, query, body },
        },
      })
    );

    // attempt to increment `route.calls`
    const id = `${method.toLowerCase()}:${url}`;
    const route = yield* select(schema.simulationRoutes.selectById, {
      id,
    });
    if (route.url !== "")
      yield* schema.update(
        schema.simulationRoutes.merge({ [id]: { calls: route.calls + 1 } })
      );

    yield* next();
  });

  let additionalTasks = [thunks.bootup];

  let [schema, schemaInitialState] = generateSchemaWithInputSlices(inputSchema);
  let store = createStore({
    initialState: {
      ...schemaInitialState,
    },
  });

  const createWebhook = (postUrl: string) => {
    const api = createApi();
    api.use(mdw.api({ schema }));
    api.use(api.routes());
    api.use(mdw.fetch({ baseUrl: postUrl }));
    return { create: api.post, task: api.bootup };
  };
  const userTasks = inputTasks({ createWebhook, store, schema });

  let inputedActions = inputActions({ thunks, store, schema });
  let actions = {
    simulationLog,
    batchUpdater,
    ...inputedActions,
    ...userTasks.actions,
  };

  let tsks: Callable<unknown>[] = [...additionalTasks, ...userTasks.tasks];
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

  let inputedSelectors = inputSelectors({ store, schema, createSelector });

  return {
    store,
    schema,
    actions,
    selectors: inputedSelectors,
  };
}

type CreateSimulationStore<
  ExtendedSimulationSchema,
  ExtendedSimulationActions,
  ExtendedSimulationSelectors,
  ExtendedSimulationTasks
> = typeof createSimulationStore<
  ExtendedSimulationSchema,
  ExtendedSimulationActions,
  ExtendedSimulationSelectors,
  ExtendedSimulationTasks
>;

export type SimulationStore<
  ExtendedSimulationSchema,
  ExtendedSimulationActions,
  ExtendedSimulationSelectors,
  ExtendedSimulationTasks
> = ReturnType<
  CreateSimulationStore<
    ExtendedSimulationSchema,
    ExtendedSimulationActions,
    ExtendedSimulationSelectors,
    ExtendedSimulationTasks
  >
>;

export type ExtendSimulationActions<
  InputSchema extends ExtendSimulationSchemaInput<any>
> = {
  thunks: StoreThunks;
  store: GeneratedStore<ReturnType<InputSchema>>;
  schema: GeneratedSchema<ReturnType<InputSchema>>[0];
};

export type ExtendSimulationSelectors<
  InputSchema extends ExtendSimulationSchemaInput<any>
> = {
  store: GeneratedStore<ReturnType<InputSchema>>;
  schema: GeneratedSchema<ReturnType<InputSchema>>[0];
  createSelector: typeof createSelector;
};

type CreateApi = ReturnType<typeof createApi>;
type CreateWebhook = { create: CreateApi["post"]; task: CreateApi["bootup"] };
export type ExtendSimulationTasks<
  InputSchema extends ExtendSimulationSchemaInput<any>
> = {
  createWebhook: (url: string) => CreateWebhook;
  store: GeneratedStore<ReturnType<InputSchema>>;
  schema: GeneratedSchema<ReturnType<InputSchema>>[0];
};
