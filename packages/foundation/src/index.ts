import express from "express";
import { merge } from "lodash";
import type { Handler, Request, Document } from "openapi-backend";
import OpenAPIBackend from "openapi-backend";
import { FxStore, QueryState } from "starfx";
import type { Actions, StoreThunks } from "./store";
import { createSimulationStore } from "./store";
import type { SimulationInputSchema, SimulationSchema } from "./store/schema";
import type { RecursivePartial, ReturnTypes } from "./store/types";

export type ThunksCreated = ReturnType<StoreThunks["create"]>;

export async function startServerStandalone<Input>({
  openapi,
  port = 9000,
  extendStore,
  extend,
}: {
  openapi?: {
    document: Document | [Document, RecursivePartial<Document>];
    handlers: (
      simulationStore: { store: FxStore<QueryState & Input>; schema: SimulationSchema<Input>; actions: Actions<Input> }
    ) => Record<string, Handler | Record<string, Handler>>;
    apiRoot?: string;
  };
  port: number;
  extendStore?: { schema: SimulationInputSchema<Input>; actions: Actions<Input> };
  extend?(
    router: express.Router,
    simulationStore: { store: FxStore<QueryState & Input>; schema: SimulationSchema<Input>; actions: Actions<Input> }
  ): void;
}) {
  let app = express();
  app.use(express.json());
  let simulationStore = createSimulationStore(extendStore);

  if (extend) {
    // TODO Add `updater` action
    extend(app, simulationStore);
  }

  if (openapi) {
    let { document, handlers, apiRoot } = openapi;
    let mergedOAS = Array.isArray(document)
      ? merge(document[0], document[1])
      : document;

    let api = new OpenAPIBackend({ definition: mergedOAS, apiRoot });

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
      notFound: (c, req, res) => res.status(404).json({ error: "not found" }),
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

  let server = app.listen(port, () =>
    console.info(`api listening at http://localhost:${port}`)
  );

  if (!server.listening) {
    await new Promise<void>((resolve) => {
      server.once("listening", resolve);
    });
  }

  return server;
}
