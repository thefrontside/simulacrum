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
          404: {
            description: "The dogs have gone missing!",
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
    "/puppies": {
      // would more likely be `post`,
      //  but easier to test a get from the brower
      get: {
        operationId: "putPuppies",
        parameters: [
          {
            in: "query",
            name: "quantity",
            schema: {
              type: "integer",
            },
            required: true,
            description:
              "The comma separated list of numbers that which we use to determine the perfect quantity",
          },
        ],
        responses: {
          200: {
            description: "You had puppies!",
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
    getDogs: (_c, request, response, _next, routeMetadata) => {
      let dogs = simulationStore.schema.dogs.select(
        simulationStore.store.getState()
      );
      if (routeMetadata.defaultCode === 200) {
        response.status(200).json({ dogs });
      } else {
        response.sendStatus(routeMetadata.defaultCode);
      }
    },
    putDogs: (c, req, response) => {
      simulationStore.store.dispatch(
        simulationStore.actions.batchUpdater([
          simulationStore.schema.dogs.increment(),
        ])
      );
      response.status(200).send(`added 1 dog`);
    },
    putPuppies: (_c, request, response) => {
      let rawQuantity = request.query.quantity as string;
      let quantity = parseInt(rawQuantity, 10);
      console.dir({ quantity });
      simulationStore.store.dispatch(
        simulationStore.actions.addLotsOfDogs({ quantity })
      );
      response
        .status(200)
        .send(`added ${quantity} ${quantity === 1 ? "dog" : "dogs"}`);
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
