import type { ExtendedSimulationStore } from "./store";
import type { SimulationHandlers } from "../../src";

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
    "/perfect-number-of-dogs": {
      get: {
        operationId: "perfectDogQuantity",
        parameters: [
          {
            in: "query",
            name: "numbers",
            schema: {
              type: "string",
            },
            required: true,
            description:
              "The list of numbers that which we use to determine the perfect quantity",
          },
        ],
        responses: {
          200: {
            description: "Do you need more dogs?",
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

function handlers(
  simulationStore: ExtendedSimulationStore
): SimulationHandlers {
  return {
    getDogs: (_c, _r, response) => {
      let dogs = simulationStore.schema.boop.select(
        simulationStore.store.getState()
      );
      response.status(200).json({ dogs });
    },
    putDogs: (c, req, response) => {
      simulationStore.store.dispatch(
        simulationStore.actions.batchUpdater([
          simulationStore.schema.boop.increment(),
        ])
      );
      response.sendStatus(200);
    },
    perfectDogQuantity: (_c, request, response) => {
      let numbers =
        ((request?.query?.numbers as string) ?? "").split[","] ?? [];
      let dogs = simulationStore.selectors.booleanSpecificNumbers(
        simulationStore.store.getState(),
        numbers
      );
      response.status(200).json({ dogs });
    },
  };
}

export const openapi = [
  {
    document,
    handlers,
    apiRoot: "/api",
  },
];
