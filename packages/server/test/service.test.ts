import { it } from "node:test";
import assert from "node:assert";
import { useService } from "../src/service.ts";
import { each, Err, Ok, run } from "effection";

// these npm scripts don't work, but this is what we are trying to run
const scriptDoesNotWork = "npm run test:service-main";
const nodeScriptWorks = "node --import tsx ./test/service-main.ts";

it("test service", async () => {
  let assertionCount = 0;
  await run(function* () {
    yield* useService("test-service", nodeScriptWorks);
    assertionCount++;
  });
  assert(assertionCount > 0);
});

it("test with wellness", async () => {
  let assertionCount = 0;
  await run(function* () {
    yield* useService("test-service", nodeScriptWorks, {
      wellnessCheck: {
        timeout: 200,
        *operation(stdio) {
          for (let line of yield* each<string>(stdio)) {
            if (line.includes("test service started")) {
              return Ok<void>(void 0);
            }
            yield* each.next();
          }
          return Err(new Error("got sick of waiting"));
        },
      },
    });
    assertionCount++;
  });
  assert(assertionCount > 0);
});
