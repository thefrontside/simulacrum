#!/usr/bin/env node
import { simulationCLI } from "../../src/cli.ts";
import { useServiceGraph } from "../../src/services.ts";
import { spawn, suspend, until } from "effection";
import { createFoundationSimulationServer } from "@simulacrum/foundation-simulator";
import http from "node:http";

export const createServiceASimulation = (seed: number): any =>
  createFoundationSimulationServer({
    port: 0,
    extendRouter(router) {
      router.get("/info", (_req, res) => res.json({ seed, handledWith: seed }));
    },
  });

export const createServiceBSimulation = (used: number): any =>
  createFoundationSimulationServer({
    port: 0,
    extendRouter(router) {
      router.get("/info", (_req, res) => res.json({ used }));
    },
  });

export const createServiceCSimulation = (message: string): any =>
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
      const createSim = createServiceASimulation(data.seed)();

      const listening: any = yield* until(createSim.listen());

      // debug log so tests can see the assigned port (left as example output)
      // eslint-disable-next-line no-console
      console.log(
        `[data-sharing] started foundation sim on port ${listening.port}`
      );

      // self-check
      try {
        const local = yield* until(
          new Promise<{ status?: number; body?: string }>((resolve, reject) => {
            const req = http.get(
              {
                hostname: "127.0.0.1",
                port: listening.port,
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

      // spawn background keeper which calls ensureClose when finalized
      yield* spawn(function* () {
        try {
          yield* suspend();
        } finally {
          // eslint-disable-next-line no-console
          console.log(
            `[data-sharing] ensuring close for port ${listening.port}`
          );
          yield* until(listening.ensureClose());
          // eslint-disable-next-line no-console
          console.log(
            `[data-sharing] closed foundation sim on port ${listening.port}`
          );
        }
      });

      return { handledWith: data.seed, port: listening.port };
    },
  },

  // serviceB depends on serviceA and data
  serviceB: {
    deps: ["serviceA", "data"],
    *operation({ serviceA, data }) {
      const createSim = createServiceBSimulation(serviceA.handledWith)();

      const listening: any = yield* until(createSim.listen());

      yield* spawn(function* () {
        try {
          yield* suspend();
        } finally {
          yield* until(listening.ensureClose());
        }
      });

      // include data seed in the export so tests can verify multi-dependency wiring
      return {
        used: serviceA.handledWith,
        dataSeed: data.seed,
        port: listening.port,
      };
    },
  },

  // serviceC depends only on data
  serviceC: {
    deps: ["data"],
    *operation({ data }) {
      const createSim = createServiceCSimulation(data.message)();

      const listening: any = yield* until(createSim.listen());

      yield* spawn(function* () {
        try {
          yield* suspend();
        } finally {
          yield* until(listening.ensureClose());
        }
      });

      return { dataMessage: data.message, port: listening.port };
    },
  },
});

if (import.meta.url === `file://${process.argv[1]}`) {
  simulationCLI(services);
}
