import { startFoundationSimulationServer } from "../src";
import type { AnyState, SimulationStoreThunks, SimulationSlice } from "../src";

const openapiSchemaFromRealEndpoint = {
  openapi: "3.0.0",
  info: {
    title: "API",
    version: "1.0.0",
  },
  paths: {
    "/dogs": {
      get: {
        summary: "Get the dogs",
        operationId: "getDogs",
        responses: {
          200: {
            description: "All of the dogs",
          },
        },
      },
    },
  },
};

const openapiSchemaWithModificationsForSimulation = {
  openapi: "3.0.0",
  info: {
    title: "API",
    version: "1.0.0",
  },
  paths: {
    "/pets": {
      get: {
        operationId: "getPets",
        responses: {
          200: {
            $ref: "#/components/responses/PetList",
          },
        },
      },
    },
    "/dogs": {
      get: {
        operationId: "getDogs",
      },
    },
    "/more-dogs": {
      get: {
        operationId: "putDogs",
        responses: {
          200: {
            description: "All of the dogs",
          },
        },
      },
    },
  },
  components: {
    responses: {
      PetList: {
        description: "you would love them",
        content: {
          "application/json": {
            example: [
              { id: 1, name: "Garfield" },
              { id: 2, name: "Odie" },
            ],
          },
        },
      },
    },
  },
};

startFoundationSimulationServer({
  port: 9999,
  openapi: {
    document: [
      openapiSchemaFromRealEndpoint,
      openapiSchemaWithModificationsForSimulation,
    ],
    handlers({ store, schema, actions }) {
      return {
        getDogs: (c, req, res) => {
          let dogs = schema.boop.select(store.getState());
          res.status(200).json({ dogs });
        },
        putDogs: (c, req, res) => {
          store.dispatch(actions.batchUpdater([schema.boop.increment()]));
          store.dispatch(actions.upsertTest({ ["1"]: { name: "Friend" } }));
          res.sendStatus(200);
        },
      };
    },
    apiRoot: "/api",
  },
  extendStore: {
    actions: ({
      thunks,
      schema,
    }: {
      thunks: SimulationStoreThunks;
      schema: any;
    }) => {
      // TODO attempt to remove this type as a requirement
      let upsertTest = thunks.create<AnyState>(
        "user:upsert",
        function* boop(ctx, next) {
          yield* schema.update(
            schema.test.add({ [ctx.payload.id]: ctx.payload })
          );

          yield* next();
        }
      );

      return { upsertTest };
    },
    schema: ({ slice }: { slice: SimulationSlice }) => {
      // TODO attempt to remove this type as a requirement
      let slices = {
        test: slice.table(),
        booping: slice.str(),
        boop: slice.num(),
      };
      return slices;
    },
  },
  extendRouter(router, simulationStore) {
    router.get("/extended-route", (req, res) => {
      let dogs = simulationStore.schema.boop.select(
        simulationStore.store.getState()
      );
      res.status(200).json({ dogs });
    });
  },
});