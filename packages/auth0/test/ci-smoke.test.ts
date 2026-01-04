import { describe, it, expect } from "vitest";
import { run, until, sleep, useAbortSignal, Err, Ok } from "effection";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { useService } from "@simulacrum/server";

const AUTH0_PORT = 4400;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const AUTH0_URL = `https://localhost:${AUTH0_PORT}`;

// Ensure built distribution is present; if not, build it so the smoke test can run locally
if (!existsSync("./dist/index.cjs")) {
  console.log("ci-smoke: dist not found, running `npm run build`...");
  execSync("npm run prepack", { stdio: "inherit" });
}

// Helper to start the built auth0 service with a wellness check (reused by tests)
function startAuth0() {
  return useService("auth0", "node ./bin/start.cjs", {
    wellnessCheck: {
      timeout: 30000,
      *operation(_stdio) {
        const signal = yield* useAbortSignal();
        const start = Date.now();
        while (true) {
          try {
            yield* until(
              fetch(`${AUTH0_URL}/login`, {
                headers: { accept: "text/html" },
                signal,
              }).then((r) => {
                if (!r.ok) throw new Error(`not ready: ${r.status}`);
                return true;
              })
            );
            return Ok<void>(void 0);
          } catch (err) {
            // ignore and retry
          }
          if (Date.now() - start > 30000)
            return Err(new Error("service did not start"));
          yield* sleep(200);
        }
      },
    },
  });
}

describe("CI smoke: built dist server", () => {
  it("returns /login without escaped closing script tags", async () => {
    await run(function* () {
      yield* startAuth0();

      const signal = yield* useAbortSignal();
      const text = yield* until(
        fetch(`${AUTH0_URL}/login`, { signal }).then((r) => {
          if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
          return r.text();
        })
      );

      expect(text).toMatch(/<\/script>/);
      expect(text).not.toContain("<\\/script>");
    });
  }, 60000);

  it("returns /authorize?response_mode=web_message without escaped closing script tags", async () => {
    await run(function* () {
      yield* startAuth0();

      const url = `${AUTH0_URL}/authorize?response_mode=web_message&redirect_uri=http://localhost:3000&currentUser=default`;
      const signal2 = yield* useAbortSignal();
      const text = yield* until(
        fetch(url, { headers: { accept: "text/html" }, signal: signal2 }).then(
          (r) => {
            if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
            return r.text();
          }
        )
      );

      expect(text).toMatch(/<\/script>/);
      expect(text).not.toContain("<\\/script>");
    });
  }, 60000);
});
