import express from "express";
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction as ExpressNextFunction,
} from "express";
import { fdir } from "fdir";
import fs from "node:fs";
import path from "node:path";
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
  SimulationRoute,
} from "./store/schema";
import type { RecursivePartial } from "./store/types";
import { generateRoutesHTML } from "./routeTemplate";

type SimulationHandlerFunctions = (
  context: OpenAPIBackendContext,
  request: ExpressRequest,
  response: ExpressResponse,
  next: ExpressNextFunction,
  routeMetadata: SimulationRoute
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
  serveJsonFiles,
  openapi,
  extendStore,
  extendRouter,
}: {
  port: number;
  serveJsonFiles?: string;
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
    logs?: boolean;
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
    app.use(express.urlencoded({ extended: false }));
    let simulationStore = createSimulationStore(extendStore);

    if (serveJsonFiles) {
      const jsonFiles = new fdir()
        .filter((path, _isDirectory) => path.endsWith(".json"))
        .withDirs()
        .withRelativePaths()
        .crawl(serveJsonFiles)
        .sync();

      if (jsonFiles.length > 0) {
        for (let jsonFile of jsonFiles) {
          const route = jsonFile.slice(0, jsonFile.length - 5);
          const filename = path.join(serveJsonFiles, jsonFile);
          app.get(`/${route}`, (_req, res) => {
            res.setHeader("content-type", "application/json");
            fs.createReadStream(filename).pipe(res);
          });
        }
      }
    }

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
            addFormats(ajv);
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
          // if route not in API, continue to next API or `app.all('*')` fallback
          notFound: (c, req, res, next) => next(),
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
        api.init().then((init) => {
          const router = init.router;
          const operations = router.getOperations();
          const simulationRoutes = operations.reduce((routes, operation) => {
            const url = `${router.apiRoot}${operation.path}`;
            routes[`${operation.method}:${url}`] = {
              type: "OpenAPI",
              url,
              method: operation.method as SimulationRoute["method"],
              calls: 0,
              defaultCode: 200,
              responses: Object.keys(operation.responses ?? {}).map((key) =>
                parseInt(key)
              ),
            };
            return routes;
          }, {} as Record<string, SimulationRoute>);
          simulationStore.store.dispatch(
            simulationStore.actions.batchUpdater([
              simulationStore.schema.simulationRoutes.add(simulationRoutes),
            ])
          );
          return init;
        });
        app.use((req, res, next) => {
          const routeId = `${req.method.toLowerCase()}:${req.path}`;
          const routeMetadata =
            simulationStore.schema.simulationRoutes.selectById(
              simulationStore.store.getState(),
              {
                id: routeId,
              }
            );
          return api.handleRequest(
            req as Request,
            req,
            res,
            next,
            routeMetadata
          );
        });
      }
    }

    app.get("/", (req, res) => {
      let routes = simulationStore.schema.simulationRoutes.selectTableAsList(
        simulationStore.store.getState()
      );
      if (routes.length === 0) {
        res.sendStatus(404);
      } else {
        res.status(200).send(generateRoutesHTML(routes));
      }
    });
    app.post("/", (req, res) => {
      const formValue = req.body;
      const entries = {} as Record<string, Partial<SimulationRoute>>;
      for (let [key, value] of Object.entries(formValue)) {
        entries[key] = { defaultCode: parseInt(value as string) };
      }
      simulationStore.store.dispatch(
        simulationStore.actions.batchUpdater([
          simulationStore.schema.simulationRoutes.patch(entries),
        ])
      );
      res.redirect("/");
    });
    // if no extendRouter routes or openapi routes handle this, return 404
    app.all("*", (req, res) => res.status(404).json({ error: "not found" }));

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
