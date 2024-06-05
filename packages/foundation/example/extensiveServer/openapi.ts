import type { ExtendedSimulationStore } from "./store";
import type { Context, Request, Response } from "../../src";

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

let document = [
  openapiSchemaFromRealEndpoint,
  openapiSchemaWithModificationsForSimulation,
];

function handlers(simulationStore: ExtendedSimulationStore) {
  return {
    getDogs: (c: Context, req: Request, res: Response) => {
      let dogs = simulationStore.schema.boop.select(
        simulationStore.store.getState()
      );
      res.status(200).json({ dogs });
    },
    putDogs: (c: Context, req: Request, res: Response) => {
      simulationStore.store.dispatch(
        simulationStore.actions.batchUpdater([
          simulationStore.schema.boop.increment(),
        ])
      );
      res.sendStatus(200);
    },
  };
}

export const openapi = {
  document,
  handlers,
  apiRoot: "/api",
};
