import express from "express";
import { merge } from "lodash";
import type { Handler, Request, Document } from "openapi-backend";
import OpenAPIBackend from "openapi-backend";

export async function startServerStandalone({
  oas,
  handlers,
  port = 9000,
  apiRoot,
  extend,
}: {
  oas: Document | [Document, Partial<Document>];
  handlers: Record<string, Handler | Record<string, Handler>>;
  port: number;
  apiRoot?: string;
  extend?(router: express.Router): void;
}) {
  // TODO init store

  let mergedOAS = Array.isArray(oas) ? merge(oas[0], oas[1]) : oas;

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
  handlerObjectRegistration(handlers); // TODO pass store to handlers

  api.register({
    //   getPets: (c, req, res) => res.status(200).json({ result: "ok" }),
    validationFail: (c, req, res) =>
      res.status(400).json({ err: c.validation.errors }),
    notFound: (c, req, res) => res.status(404).json({ err: "not found" }),
    notImplemented: (c, req, res) => {
      if (!c.operation.operationId) {
        return res
          .status(404)
          .json({ status: 501, err: "No handler registered for operation" });
      }
      let { status, mock } = c.api.mockResponseForOperation(
        c.operation.operationId
      );
      return res.status(status).json(mock);
    },
  });

  // initalize the backend
  api.init();

  let app = express();
  app.use(express.json());

  if (extend) {
    extend(app); // TODO implement and pass in store
  }

  app.use((req, res) => api.handleRequest(req as Request, req, res));
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
