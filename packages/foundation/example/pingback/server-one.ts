import { createFoundationSimulationServer } from "../../src/index.ts";
import type { ExtendSimulationSchema, FoundationSimulator } from "../../src/index.ts";

export function simulation(): FoundationSimulator<any> {
  return createFoundationSimulationServer({
    port: 3050,
    extendStore: {
      logs: false,
      schema: ({ slice }: ExtendSimulationSchema) => {
        let slices = {
          boop: slice.num(),
          bapped: slice.num(),
        };
        return slices;
      },
      tasks: ({ createWebhook }) => {
        const webhook = createWebhook("http://localhost:3051");
        // use webhook.create<TypeOfPayload> if a payload is expected
        const boopTrigger = webhook.create("/event/boop", function* (ctx, next) {
          console.log("firing webhook from 3050 to 3051");
          ctx.request = ctx.req({
            body: JSON.stringify(ctx.payload),
          });

          // this fires off the actual request
          yield* next();

          // this allows you to inspect after the request
          console.log({ ctx });
        });
        return { tasks: [webhook.task], actions: { webhook: { boopTrigger } } };
      },
    },
    extendRouter(router, simulationStore) {
      router.post("/event/boop", (_req, res) => {
        console.log("received boop increment request on 3050");
        simulationStore.store.dispatch(
          simulationStore.actions.batchUpdater(simulationStore.schema.boop.increment()),
        );
        res.status(200).json({ status: "ok" });
      });

      router.post("/event/bap", (_req, res) => {
        console.log("received bap increment request on 3050");
        simulationStore.store.dispatch(
          simulationStore.actions.batchUpdater(simulationStore.schema.bapped.increment()),
        );
        res.status(200).json({ status: "ok" });
      });

      router.get("/external/boop", (_req, res) => {
        simulationStore.store.dispatch(simulationStore.actions.webhook.boopTrigger());
        res.status(200).json({ status: "ok" });
      });

      router.get("/get/boop", (_req, res) => {
        const count = simulationStore.schema.boop.select(simulationStore.store.getState());
        res.status(200).json({ count });
      });

      router.get("/get/bap", (_req, res) => {
        const count = simulationStore.schema.bapped.select(simulationStore.store.getState());
        res.status(200).json({ count });
      });
    },
  })();
}
