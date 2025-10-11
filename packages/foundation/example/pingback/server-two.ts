import { put, take, takeEvery, type Action } from "starfx";
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
        // use webhook.create<TypeOfPayload> if a payload is expected
        const boopTrigger = webhook.create(
          "/event/boop",
          function* (ctx, next) {
            console.log("firing webhook from 3051 to 3050");
            ctx.request = ctx.req({
              body: JSON.stringify(ctx.payload),
            });

            // this fires off the actual request
            yield* next();

            // this allows you to inspect after the request
            // console.log({ ctx });
          }
        );
        const bappedTrigger = webhook.create(
          "/event/bap",
          function* (ctx, next) {
            console.log("firing bapped webhook from 3051 to 3050");
            ctx.request = ctx.req({
              body: JSON.stringify(ctx.payload),
            });

            // this fires off the actual request
            yield* next();

            // this allows you to inspect after the request
            // console.dir({ ctx });
          }
        );
        const isBoopEvent = (action: Action) =>
          action.type === "store" &&
          !!action?.payload?.patches.find((p: any) => p.path.includes("boop"));

        // using takeEvery is one method of doing of listening for events
        function* boopWatcherOptionOne() {
          yield* takeEvery("store", function* (action) {
            if (isBoopEvent(action)) {
              // console.dir(
              //   {
              //     w: "one",
              //     m: "saw a boop, triggering bap on 3050",
              //     action,
              //   },
              //   { depth: null }
              // );
              // to avoid the double call from the two watchers
              // skip this one
              // yield* put(bappedTrigger());
            }
          });
        }
        // using take and your own iteration loop is another method of doing of listening for events
        function* boopWatcherOptionTwo() {
          while (true) {
            const action = yield* take("*");
            if (isBoopEvent(action)) {
              // console.dir(
              //   {
              //     w: "two",
              //     m: "saw a boop, triggering bap on 3050",
              //     action,
              //   },
              //   { depth: null }
              // );
              yield* put(bappedTrigger());
            }
          }
        }

        return {
          tasks: [webhook.task, boopWatcherOptionOne, boopWatcherOptionTwo],
          actions: { webhook: { boopTrigger, bappedTrigger } },
        };
      },
    },
    extendRouter(router, simulationStore) {
      router.post("/event/boop", (_req, res) => {
        console.log("received boop increment request on 3051");
        simulationStore.store.dispatch(
          simulationStore.actions.batchUpdater(
            simulationStore.schema.boop.increment()
          )
        );
        res.status(200).json({ status: "ok" });
      });

      router.get("/external/boop", (_req, res) => {
        simulationStore.store.dispatch(
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
