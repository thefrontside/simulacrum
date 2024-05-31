import { startServerStandalone } from "../index";

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

startServerStandalone({
  port: 9999,
  openapi: {
    document: [
      openapiSchemaFromRealEndpoint,
      openapiSchemaWithModificationsForSimulation,
    ],
    handlers({ simulationStore }) {
      return {
        getDogs: (c, req, res) => {
          let dogs = simulationStore.schema.boop.select(
            simulationStore.store.getState()
          );
          res.status(200).json({ dogs });
        },
        putDogs: (c, req, res) => {
          simulationStore.store.dispatch(
            simulationStore.actions.updater(
              simulationStore.schema.boop.increment()
            )
          );
          res.sendStatus(200);
        },
      };
    },
    apiRoot: "/api",
  },
  extendStore: {
    actions: ({ thunks, schema }) => {
      let upsertTest = thunks.create("user:upsert", function* boop(ctx, next) {
        yield* schema.update(
          schema.test.add({ [ctx.payload.id]: ctx.payload })
        );

        yield* next();
      });

      return { upsertTest };
    },
    schema: ({ slice }) => {
      let slices = {
        test: slice.table(),
        booping: slice.str(),
        boop: slice.num(),
      };
      return slices;
    },
  },
  extend(router, simulationStore) {
    router.get("/extended-route", (req, res) => {
      let dogs = simulationStore.schema.boop.select(
        simulationStore.store.getState()
      );
      res.status(200).json({ dogs });
    });
  },
});
