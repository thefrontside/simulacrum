import { startServerStandalone } from "./index";
import type { SimulationSlice } from "./store/schema";

const oas1 = {
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

const oas2 = {
  openapi: "3.0.0",
  info: {
    title: "API",
    version: "1.0.0",
  },
  paths: {
    "/dogs": {
      get: {
        operationId: "getDogs",
      },
    },
  },
};

startServerStandalone({
  openapi: {
    document: [oas1, oas2],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handlers({ simulationStore }) {
      return {
        getDogs: (c, req, res) => {
          res.sendStatus(200);
        },
      };
    },
    apiRoot: "/api",
  },
  extendStore: {
    actions: () => ({}),
    schema: ({ slice }: { slice: SimulationSlice }) => {
      let slices = {
        test: slice.table(),
        booping: slice.str(),
      };
      return slices;
    },
  },
  port: 9999,
});
