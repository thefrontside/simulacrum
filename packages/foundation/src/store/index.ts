import {
  generateSchemaWithInputSlices,
  type ExtendSimulationSchemaInput,
} from "./schema.ts";
import type { AnyState, StoreUpdater, Callable } from "starfx";
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

export type ExtendSimulationActionsInput<
  Actions = Record<string, unknown>,
  ExtendedSimulationSchema = unknown
> = (arg: {
  thunks: StoreThunks;
  store: GeneratedStore<ExtendedSimulationSchema>;
  schema: GeneratedSchema<ExtendedSimulationSchema>[0];
}) => Actions;
// A "looser" input type consumers can implement when they only return
// a partial set of actions (common when extending existing action sets).
// This is safe to accept because the foundation merges the partial
// result into the base actions object.
export type ExtendSimulationActionsInputLoose<
  Actions = Record<string, unknown>,
  ExtendedSimulationSchema = unknown
> = (arg: {
  thunks: StoreThunks;
  store: GeneratedStore<ExtendedSimulationSchema>;
  schema: GeneratedSchema<ExtendedSimulationSchema>[0];
}) => Partial<Actions> | Actions;
export type ExtendSimulationSelectorsInput<
  Selectors = Record<string, unknown>,
  ExtendedSimulationSchema = unknown
> = (arg: {
  store: GeneratedStore<ExtendedSimulationSchema>;
  schema: GeneratedSchema<ExtendedSimulationSchema>[0];
  createSelector: typeof createSelector;
}) => Selectors;

// Loose selectors input that allows returning Partial<Selectors> to make
// consumer extension functions easier to implement without precise
// circular types.
export type ExtendSimulationSelectorsInputLoose<
  Selectors = Record<string, unknown>,
  ExtendedSimulationSchema = unknown
> = (arg: {
  store: GeneratedStore<ExtendedSimulationSchema>;
  schema: GeneratedSchema<ExtendedSimulationSchema>[0];
  createSelector: typeof createSelector;
}) => Partial<Selectors> | Selectors;

type CreateApi = ReturnType<typeof createApi>;
type CreateWebhook = { create: CreateApi["post"]; task: CreateApi["bootup"] };

// Minimal base actions that the foundation always provides. We express
// their payload shapes so downstream packages can call them without
// extra casts. We use `unknown` for return values since actions are
// thunks and their exact return types are not important here.
export type BaseActions = {
  batchUpdater: (payload: StoreUpdater<AnyState>[]) => unknown;
  simulationLog: (payload: {
    method: string;
    url: string;
    query: Record<string, unknown>;
    body: unknown;
  }) => unknown;
};

export type ExtendSimulationTaskInput<
  Actions = Record<string, unknown>,
  ExtendedSimulationSchema = unknown
> = (arg: {
  createWebhook: (url: string) => CreateWebhook;
  store: GeneratedStore<ExtendedSimulationSchema>;
  schema: GeneratedSchema<ExtendedSimulationSchema>[0];
}) => { tasks: Callable<unknown>[]; actions: Actions };

// Public, consumer-friendly extend store config that accepts the looser
// extension input types so downstream packages can implement small
// partial extensions without introducing cyclical or incompatible types.
export type ExtendStoreConfig<
  Schema,
  Actions,
  Selectors,
  Tasks = Record<string, unknown>
> = {
  schema: ExtendSimulationSchemaInput<Schema>;
  actions?: ExtendSimulationActionsInputLoose<Actions, Schema>;
  selectors?: ExtendSimulationSelectorsInputLoose<Selectors, Schema>;
  tasks?: ExtendSimulationTaskInput<Tasks, Schema>;
  logs?: boolean;
};

export function createSimulationStore<
  ExtendedSimulationSchema = unknown,
  ExtendedSimulationActions = Record<string, unknown>,
  ExtendedSimulationSelectors = Record<string, unknown>,
  ExtendedSimulationTasks = Record<string, unknown>
>(
  {
    actions:
      inputActions = (() => ({})) as unknown as ExtendSimulationActionsInputLoose<
        ExtendedSimulationActions,
        ExtendedSimulationSchema
      >,
    selectors:
      inputSelectors = (() => ({})) as unknown as ExtendSimulationSelectorsInputLoose<
        ExtendedSimulationSelectors,
        ExtendedSimulationSchema
      >,
    schema: inputSchema,
    tasks: inputTasks = (() => ({
      tasks: [],
      actions: {},
    })) as unknown as ExtendSimulationTaskInput<
      ExtendedSimulationTasks,
      ExtendedSimulationSchema
    >,
    logs = false,
  }: {
    schema: ExtendSimulationSchemaInput<ExtendedSimulationSchema>;
    actions?: ExtendSimulationActionsInputLoose<
      ExtendedSimulationActions,
      ExtendedSimulationSchema
    >;
    selectors?: ExtendSimulationSelectorsInputLoose<
      ExtendedSimulationSelectors,
      ExtendedSimulationSchema
    >;
    tasks?: ExtendSimulationTaskInput<
      ExtendedSimulationTasks,
      ExtendedSimulationSchema
    >;
    logs?: boolean;
  } = {
    schema:
      (() => ({})) as unknown as ExtendSimulationSchemaInput<ExtendedSimulationSchema>,
    actions: (() => ({})) as unknown as ExtendSimulationActionsInputLoose<
      ExtendedSimulationActions,
      ExtendedSimulationSchema
    >,
    selectors: (() => ({})) as unknown as ExtendSimulationSelectorsInputLoose<
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

  let batchUpdater = thunks.create<
    StoreUpdater<AnyState> | StoreUpdater<AnyState>[]
  >("update", function* (ctx, next) {
    yield* updateStore(ctx.payload);
    yield* next();
  });

  let simulationLog = thunks.create<{
    method: string;
    url: string;
    query: Record<string, unknown>;
    body: unknown;
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

  let selectors = inputSelectors({ store, schema, createSelector });

  type ActionsType = typeof actions;
  return {
    store,
    schema,
    actions,
    selectors,
  } as {
    store: GeneratedStore<ExtendedSimulationSchema>;
    schema: GeneratedSchema<ExtendedSimulationSchema>[0];
    actions: ActionsType & ExtendedSimulationActions & Record<string, unknown>;
    selectors: ExtendedSimulationSelectors;
  };
}

type CreateSimulationStore<
  ExtendedSimulationSchema = unknown,
  ExtendedSimulationActions = Record<string, unknown>,
  ExtendedSimulationSelectors = Record<string, unknown>,
  ExtendedSimulationTasks = Record<string, unknown>
> = typeof createSimulationStore<
  ExtendedSimulationSchema,
  ExtendedSimulationActions,
  ExtendedSimulationSelectors,
  ExtendedSimulationTasks
>;

export type SimulationStore<
  ExtendedSimulationSchema = unknown,
  ExtendedSimulationActions = Record<string, unknown>,
  ExtendedSimulationSelectors = Record<string, unknown>,
  ExtendedSimulationTasks = Record<string, unknown>
> = ReturnType<
  CreateSimulationStore<
    ExtendedSimulationSchema,
    ExtendedSimulationActions,
    ExtendedSimulationSelectors,
    ExtendedSimulationTasks
  >
>;

// Backwards-compatible 3-arg alias used by downstream packages that only
// provide Schema, Actions, and Selectors type parameters.
export type FoundationSimulationStore<
  ExtendedSimulationSchema = unknown,
  ExtendedSimulationActions = Record<string, unknown>,
  ExtendedSimulationSelectors = Record<string, unknown>
> = SimulationStore<
  ExtendedSimulationSchema,
  ExtendedSimulationActions,
  ExtendedSimulationSelectors,
  Record<string, unknown>
>;

export type ExtendSimulationActions<
  InputSchema extends ExtendSimulationSchemaInput<unknown> = ExtendSimulationSchemaInput<unknown>
> = {
  thunks: StoreThunks;
  store: GeneratedStore<ReturnType<InputSchema>>;
  schema: GeneratedSchema<ReturnType<InputSchema>>[0];
};

export type ExtendSimulationSelectors<
  InputSchema extends ExtendSimulationSchemaInput<unknown> = ExtendSimulationSchemaInput<unknown>
> = {
  store: GeneratedStore<ReturnType<InputSchema>>;
  schema: GeneratedSchema<ReturnType<InputSchema>>[0];
  createSelector: typeof createSelector;
};

export type ExtendSimulationTasks<
  InputSchema extends ExtendSimulationSchemaInput<unknown> = ExtendSimulationSchemaInput<unknown>
> = {
  createWebhook: (url: string) => CreateWebhook;
  store: GeneratedStore<ReturnType<InputSchema>>;
  schema: GeneratedSchema<ReturnType<InputSchema>>[0];
};
