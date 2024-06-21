import express from "express";
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import { merge } from "lodash";
import OpenAPIBackend from "openapi-backend";
import type {
  Handler,
  Request,
  Document,
  Context as OpenAPIBackendContext,
} from "openapi-backend";
import addFormats from "ajv-formats";
import { createSimulationStore } from "./store/index";
import type {
  SimulationStore,
  ExtendSimulationActionsInput,
  ExtendSimulationActions,
  ExtendSimulationSelectorsInput,
  ExtendSimulationSelectors,
} from "./store/index";
import type {
  ExtendSimulationSchemaInput,
  ExtendSimulationSchema,
} from "./store/schema";
import type { RecursivePartial } from "./store/types";

import type { Context as OpenAPIBackendContext } from "openapi-backend";
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
type SimulationHandlerFunctions = (
  context: OpenAPIBackendContext,
  request: ExpressRequest,
  response: ExpressResponse
) => void;
export type SimulationHandlers = Record<string, SimulationHandlerFunctions>;
export type {
  ExtendSimulationActions,
  ExtendSimulationSelectors,
  ExtendSimulationSchema,
  SimulationStore,
  Document,
};
export type { AnyState } from "starfx";

export function createFoundationSimulationServer<
  ExtendedSimulationSchema,
  ExtendedSimulationActions,
  ExtendedSimulationSelectors
>({
  port = 9000,
  openapi,
  extendStore,
  extendRouter,
}: {
  port: number;
  openapi?: {
    document: Document | (Document | RecursivePartial<Document>)[];
    handlers: (
      simulationStore: SimulationStore<
        ExtendedSimulationSchema,
        ExtendedSimulationActions,
        ExtendedSimulationSelectors
      >
    ) => Record<string, Handler | Record<string, Handler>>;
    apiRoot?: string;
  }[];
  extendStore?: {
    schema: ExtendSimulationSchemaInput<ExtendedSimulationSchema>;
    actions: ExtendSimulationActionsInput<
      ExtendedSimulationActions,
      ExtendedSimulationSchema
    >;
    selectors: ExtendSimulationSelectorsInput<
      ExtendedSimulationSelectors,
      ExtendedSimulationSchema
    >;
  };
  extendRouter?(
    router: express.Router,
    simulationStore: SimulationStore<
      ExtendedSimulationSchema,
      ExtendedSimulationActions,
      ExtendedSimulationSelectors
    >
  ): void;
}) {
  return () => {
    let app = express();
    app.use(express.json());
    let simulationStore = createSimulationStore(extendStore);

    if (extendRouter) {
      extendRouter(app, simulationStore);
    }

    if (openapi) {
      for (let spec of openapi) {
        let { document, handlers, apiRoot } = spec;
        let mergedOAS = Array.isArray(document)
          ? mergeDocumentArray(document)
          : document;

        let api = new OpenAPIBackend({
          definition: mergedOAS,
          apiRoot,
          customizeAjv: (ajv) => {
            addFormats(ajv, {
              mode: "fast",
              formats: ["email", "uri", "date-time", "uuid"],
            });

            return ajv;
          },
        });

        // register your framework specific request handlers here
        let handlerObjectRegistration = (
          handlerEntries: Record<string, Handler | Record<string, Handler>>,
          prefix?: string
        ) => {
          for (let [key, handler] of Object.entries(handlerEntries)) {
            if (typeof handler === "object") {
              handlerObjectRegistration(handler, key);
            } else {
              api.register(`${prefix ? `${prefix}/` : ""}${key}`, handler);
            }
          }
        };
        handlerObjectRegistration(handlers(simulationStore));

        api.register({
          validationFail: (c, req, res) =>
            res.status(400).json({ err: c.validation.errors }),
          notFound: (c, req, res) =>
            res.status(404).json({ error: "not found" }),
          notImplemented: (c, req, res) => {
            let { status, mock } = c.api.mockResponseForOperation(
              // the route validates this exists and throws if it does not
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              c.operation.operationId!
            );
            return res.status(status).json(mock);
          },
        });

        // initalize the backend
        api.init();
        app.use((req, res) => api.handleRequest(req as Request, req, res));
      }
    }

    return {
      listen: async (portOverride?: number, callback?: () => void) => {
        let listeningPort = portOverride ?? port;
        let server = app.listen(listeningPort, callback);

        if (!server.listening) {
          await new Promise<void>((resolve) => {
            server.once("listening", resolve);
          });
        }

        return {
          server,
          ensureClose: async () => {
            await new Promise<void>((resolve) => {
              server.once("close", resolve);
              server.closeIdleConnections();
              server.closeAllConnections();
              server.close();
            });
            // it takes a bit to close the server, but there is not method
            //  that will cleanly await that process
            await new Promise((resolve) => setTimeout(resolve, 20));
          },
        };
      },
    };
  };
}

const mergeDocumentArray = (
  documents: RecursivePartial<Document>[]
): Document => {
  let document = merge({}, ...documents);
  return document as Document;
};

export async function startFoundationSimulationServer<
  ExtendedSimulationSchema,
  ExtendedSimulationActions,
  ExtendedSimulationSelectors
>(
  arg: Parameters<
    // eslint has a parsing error which means we can't fix this
    //  it is however valid TypeScript
    typeof createFoundationSimulationServer<
      ExtendedSimulationSchema,
      ExtendedSimulationActions,
      ExtendedSimulationSelectors
    >
  >[0]
) {
  let simulation = createFoundationSimulationServer(arg)();
  return simulation.listen();
}
