#!/usr/bin/env node
import { simulationCLI } from "../../src/cli.ts";
import { useServiceGraph } from "../../src/services.ts";
import { until } from "effection";
import { createFoundationSimulationServer } from "@simulacrum/foundation-simulator";
import http from "node:http";
import { useSimulation } from "../../src/index.ts";

export const createServiceASimulation = (
  seed: number
): ReturnType<typeof createFoundationSimulationServer> =>
  createFoundationSimulationServer({
    port: 0,
    extendRouter(router) {
      router.get("/info", (_req, res) => res.json({ seed, handledWith: seed }));
    },
  });

export const createServiceBSimulation = (
  used: number
): ReturnType<typeof createFoundationSimulationServer> =>
  createFoundationSimulationServer({
    port: 0,
    extendRouter(router) {
      router.get("/info", (_req, res) => res.json({ used }));
    },
  });

export const createServiceCSimulation = (
  message: string
): ReturnType<typeof createFoundationSimulationServer> =>
  createFoundationSimulationServer({
    port: 0,
    extendRouter(router) {
      router.get("/info", (_req, res) => res.json({ dataMessage: message }));
    },
  });

export const services = useServiceGraph({
  // short-lived data generator: returns a shared payload and completes
  data: {
    *operation() {
      // generate some data for dependents
      const payload = { seed: 42, message: "hello from data" };
      return payload;
    },
  },

  // serviceA depends on data and keeps running (long-running provider)
  serviceA: {
    deps: ["data"],
    *operation({ data }) {
      const { port: listeningPort } = yield* useSimulation(
        createServiceASimulation
      )(data.seed);

      // self-check
      try {
        const local = yield* until(
          new Promise<{ status?: number; body?: string }>((resolve, reject) => {
            const req = http.get(
              {
                hostname: "127.0.0.1",
                port: listeningPort,
                path: "/info",
                agent: false,
              },
              (res: any) => {
                let body = "";
                res.on("data", (c: any) => (body += c));
                res.on("end", () => resolve({ status: res.statusCode, body }));
              }
            );
            req.on("error", reject);
          })
        );
        // eslint-disable-next-line no-console
        console.log(`[data-sharing] self-check /info:`, local);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(`[data-sharing] self-check error:`, err);
      }

      return { handledWith: data.seed, port: listeningPort };
    },
  },

  // serviceB depends on serviceA and data
  serviceB: {
    deps: ["serviceA", "data"],
    *operation({ serviceA, data }) {
      const { port: listeningPort } = yield* useSimulation(
        createServiceBSimulation
      )(serviceA.handledWith);

      // include data seed in the export so tests can verify multi-dependency wiring
      return {
        used: serviceA.handledWith,
        dataSeed: data.seed,
        port: listeningPort,
      };
    },
  },

  // serviceC depends only on data
  serviceC: {
    deps: ["data"],
    *operation({ data }) {
      const { port: listeningPort } = yield* useSimulation(
        createServiceCSimulation
      )(data.message);

      return { dataMessage: data.message, port: listeningPort };
    },
  },
});

if (import.meta.url === `file://${process.argv[1]}`) {
  simulationCLI(services);
}
