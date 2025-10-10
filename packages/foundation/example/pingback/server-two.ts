import { createFoundationSimulationServer } from "../../src/index.ts";
import type {
  ExtendSimulationSchema,
  FoundationSimulator,
} from "../../src/index.ts";

export function simulation(): FoundationSimulator<any> {
  return createFoundationSimulationServer({
    port: 3051,
    extendStore: {
      logs: false,
      schema: ({ slice }: ExtendSimulationSchema) => {
        let slices = {
          boop: slice.num(),
        };
        return slices;
      },
      tasks: ({ createWebhook }) => {
        const webhook = createWebhook("http://localhost:3050");
        const boopTrigger = webhook.create<null>(
          "/event/boop",
          function* (ctx, next) {
            console.log("firing webhook from 3051 to 3050");
            ctx.request = ctx.req({
              body: JSON.stringify(ctx.payload),
            });

            // this fires off the actual request
            yield* next();

            console.dir({ ctx });
          }
        );
        return { tasks: [webhook.task], actions: { webhook: { boopTrigger } } };
      },
    },
    extendRouter(router, simulationStore) {
      router.post("/event/boop", (_req, res) => {
        console.log("received boop increment request on 3051");
        simulationStore.store.dispatch(
          simulationStore.actions.batchUpdater(
            // @ts-expect-error TODO check on this type rror
            simulationStore.schema.boop.increment()
          )
        );
        res.status(200).json({ status: "ok" });
      });

      router.get("/external/boop", (_req, res) => {
        simulationStore.store.dispatch(
          // @ts-expect-error TODO check on this type rror
          simulationStore.actions.webhook.boopTrigger()
        );
        res.status(200).json({ status: "ok" });
      });

      router.get("/get/boop", (_req, res) => {
        const count = simulationStore.schema.boop.select(
          simulationStore.store.getState()
        );
        res.status(200).json({ count });
      });
    },
  })();
}
