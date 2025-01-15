import express from "express";
import cors from "cors";
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction as ExpressNextFunction,
} from "express";
import type { ILayer, IRoute } from "express-serve-static-core";
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
import type { Options as AjvOpts } from "ajv";
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
import { apiProxy } from "./middleware/proxy";
import { delayMiddleware } from "./middleware/delay";
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
export type { AnyState, TableOutput, IdProp } from "starfx";

export type FoundationSimulator<T> = () => {
  listen(
    portOverride?: number,
    callback?: (() => void) | undefined
  ): Promise<{
    server: import("http").Server<
      typeof import("http").IncomingMessage,
      typeof import("http").ServerResponse
    >;
    simulationStore: T;
    ensureClose: () => Promise<void>;
  }>;
};

export function createFoundationSimulationServer<
  ExtendedSimulationSchema,
  ExtendedSimulationActions,
  ExtendedSimulationSelectors
>({
  port = 9000,
  proxyAndSave,
  delayResponses,
  serveJsonFiles,
  openapi,
  extendStore,
  extendRouter,
}: {
  port: number;
  proxyAndSave?: string;
  delayResponses?: number | { minimum: number; maximum: number };
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
    additionalOptions?: { validate?: boolean; ajvOpts?: AjvOpts };
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

    if (proxyAndSave) {
      app.use(apiProxy(proxyAndSave));
    }

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    let simulationStore = createSimulationStore(extendStore);
    app.use(delayMiddleware(delayResponses));

    app.use((req, res, next) => {
      // add each response to the internal log
      simulationStore.store.dispatch(
        simulationStore.actions.simulationLog({
          method: req.method,
          url: req.url,
          query: req.query,
          body: req.body,
        })
      );
      next();
    });

    if (extendRouter) {
      extendRouter(app, simulationStore);

      if (app?._router?.stack) {
        const layers: IRoute[] = app._router.stack
          .map((stack: ILayer) => stack.route)
          .filter(Boolean);

        const simulationRoutes = [];
        for (let layer of layers) {
          for (let stack of layer.stack) {
            simulationRoutes.push(
              simulationStore.schema.simulationRoutes.add({
                [`${stack.method}:${layer.path}`]: {
                  type: "JSON",
                  url: layer.path,
                  method: stack.method as SimulationRoute["method"],
                  calls: 0,
                  defaultCode: 200,
                  responses: [200],
                },
              })
            );
          }
        }

        simulationStore.store.dispatch(
          simulationStore.actions.batchUpdater(simulationRoutes)
        );
      }
    }

    if (serveJsonFiles) {
      const jsonFiles = new fdir()
        .filter((path, _isDirectory) => path.endsWith(".json"))
        .withDirs()
        .withRelativePaths()
        .crawl(serveJsonFiles)
        .sync();

      if (jsonFiles.length > 0) {
        const simulationRoutes = [];
        for (let jsonFile of jsonFiles) {
          const route = `/${jsonFile.slice(0, jsonFile.length - 5)}`;
          const filename = path.join(serveJsonFiles, jsonFile);
          app.get(route, function staticJson(_req, res) {
            res.setHeader("content-type", "application/json");
            fs.createReadStream(filename).pipe(res);
          });

          simulationRoutes.push(
            simulationStore.schema.simulationRoutes.add({
              [`get:${route}`]: {
                type: "JSON",
                url: route,
                method: "get",
                calls: 0,
                defaultCode: 200,
                responses: [200],
              },
            })
          );
        }

        simulationStore.store.dispatch(
          simulationStore.actions.batchUpdater(simulationRoutes)
        );
      }
    }

    if (openapi) {
      for (let spec of openapi) {
        let { document, handlers, apiRoot, additionalOptions } = spec;
        let mergedOAS = Array.isArray(document)
          ? mergeDocumentArray(document)
          : document;

        let api = new OpenAPIBackend({
          definition: mergedOAS,
          apiRoot,
          validate: additionalOptions?.validate,
          ajvOpts: { ...additionalOptions?.ajvOpts },
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
            const url = `${router.apiRoot === "/" ? "" : router.apiRoot}${
              operation.path
            }`;
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

    // return simulation helper page
    app.get("/", (req, res) => {
      let routes = simulationStore.schema.simulationRoutes.selectTableAsList(
        simulationStore.store.getState()
      );
      let logs = simulationStore.schema.simulationLogs.selectTableAsList(
        simulationStore.store.getState()
      );
      if (routes.length === 0) {
        res.sendStatus(404);
      } else {
        res.status(200).send(generateRoutesHTML(routes, logs));
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
          simulationStore,
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
