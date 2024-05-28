import { startServerStandalone } from "./index";

const oas1 = {
  openapi: "3.0.0",
  info: {
    title: "API",
    version: "1.0.0",
  },
  paths: {},
};

const oas2 = {
  openapi: "3.0.0",
  info: {
    title: "API",
    version: "1.0.0",
  },
  "/dogs": {
    get: {
      summary: "Get the dogs",
      responses: {
        200: {
          description: "All of the dogs",
        },
      },
    },
  },
};

startServerStandalone({
  oas: [oas1, oas2],
  handlers: {},
  port: 9999,
  apiRoot: "/api",
});
