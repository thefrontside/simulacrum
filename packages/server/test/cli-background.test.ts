import { it } from "node:test";
import assert from "node:assert";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { run } from "effection";
import { DEFAULT_CONTROL_PORT } from "../src/cli.ts";
import { waitForFetchClosed } from "./utils.ts";

async function getAvailablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port =
        typeof address === "object" && address !== null && "port" in address ? address.port : 0;
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve(port);
        }
      });
    });
  });
}

async function waitForExit(child: ReturnType<typeof spawn>) {
  let stdout = "";
  let stderr = "";

  child.stdout?.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const result = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
    (resolve) => {
      child.once("exit", (code, signal) => resolve({ code, signal }));
    },
  );

  return { ...result, stdout, stderr };
}

async function ensureDefaultControlPortAvailable() {
  try {
    await fetch(`http://127.0.0.1:${DEFAULT_CONTROL_PORT}/stop`, { method: "POST" });
    await run(function* () {
      yield* waitForFetchClosed(`http://127.0.0.1:${DEFAULT_CONTROL_PORT}/health`, 5000);
    });
  } catch (ignore) {
    // no existing background graph on the default control port
  }
}

it("can background a graph and stop it through the CLI using the control port", async () => {
  const controlPort = await getAvailablePort();
  const fixture = fileURLToPath(new URL("./fixtures/background-graph.ts", import.meta.url));

  const background = spawn(
    process.execPath,
    [fixture, "--background", "--control-port", String(controlPort)],
    {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const startResult = await waitForExit(background);
  assert.strictEqual(startResult.code, 0, startResult.stderr || startResult.stdout);

  const healthRes = await fetch(`http://127.0.0.1:${controlPort}/health`);
  assert.strictEqual(healthRes.status, 200);
  assert.deepStrictEqual(await healthRes.json(), { ok: true, port: controlPort });

  const dataRes = await fetch(`http://127.0.0.1:${controlPort}/data/background`);
  assert.strictEqual(dataRes.status, 200);
  assert.deepStrictEqual(await dataRes.json(), true);

  const statusRes = await fetch(`http://127.0.0.1:${controlPort}/status`);
  assert.strictEqual(statusRes.status, 200);
  const statusJson = (await statusRes.json()) as {
    cwd: string;
    services: Record<string, { port?: number; pid?: number }>;
  };
  assert.strictEqual(
    statusJson.cwd.replace(/\/$/, ""),
    fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, ""),
  );
  assert.strictEqual(statusJson.services.simulacrum?.port, controlPort);

  const stop = spawn(process.execPath, [fixture, "--stop", "--control-port", String(controlPort)], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stopResult = await waitForExit(stop);
  assert.strictEqual(stopResult.code, 0, stopResult.stderr || stopResult.stdout);

  await run(function* () {
    yield* waitForFetchClosed(`http://127.0.0.1:${controlPort}/health`, 5000);
  });
});

it("defaults background and stop commands to the default control port", async () => {
  await ensureDefaultControlPortAvailable();

  const fixture = fileURLToPath(new URL("./fixtures/background-graph.ts", import.meta.url));

  const background = spawn(process.execPath, [fixture, "--background"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    stdio: ["ignore", "pipe", "pipe"],
  });

  const startResult = await waitForExit(background);
  assert.strictEqual(startResult.code, 0, startResult.stderr || startResult.stdout);

  const healthRes = await fetch(`http://127.0.0.1:${DEFAULT_CONTROL_PORT}/health`);
  assert.strictEqual(healthRes.status, 200);
  assert.deepStrictEqual(await healthRes.json(), { ok: true, port: DEFAULT_CONTROL_PORT });

  const stop = spawn(process.execPath, [fixture, "--stop"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stopResult = await waitForExit(stop);
  assert.strictEqual(stopResult.code, 0, stopResult.stderr || stopResult.stdout);

  await run(function* () {
    yield* waitForFetchClosed(`http://127.0.0.1:${DEFAULT_CONTROL_PORT}/health`, 5000);
  });
});

it("errors before starting a foreground graph when a background graph is already running on the default control port", async () => {
  await ensureDefaultControlPortAvailable();

  const fixture = fileURLToPath(new URL("./fixtures/background-graph.ts", import.meta.url));
  const packageCwd = fileURLToPath(new URL("..", import.meta.url));

  const background = spawn(process.execPath, [fixture, "--background"], {
    cwd: packageCwd,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const backgroundResult = await waitForExit(background);
  assert.strictEqual(backgroundResult.code, 0, backgroundResult.stderr || backgroundResult.stdout);

  const foreground = spawn(process.execPath, [fixture], {
    cwd: packageCwd,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const foregroundResult = await waitForExit(foreground);
  assert.notStrictEqual(foregroundResult.code, 0);
  assert.match(
    foregroundResult.stderr,
    /a background graph is already running on http:\/\/127\.0\.0\.1:43034/,
  );
  assert.match(
    foregroundResult.stderr,
    new RegExp(packageCwd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );

  const stop = spawn(process.execPath, [fixture, "--stop"], {
    cwd: packageCwd,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stopResult = await waitForExit(stop);
  assert.strictEqual(stopResult.code, 0, stopResult.stderr || stopResult.stdout);

  await run(function* () {
    yield* waitForFetchClosed(`http://127.0.0.1:${DEFAULT_CONTROL_PORT}/health`, 5000);
  });
});

it("errors when backgrounding a graph that is already running and reports its cwd", async () => {
  const controlPort = await getAvailablePort();
  const fixture = fileURLToPath(new URL("./fixtures/background-graph.ts", import.meta.url));
  const packageCwd = fileURLToPath(new URL("..", import.meta.url));

  const background = spawn(
    process.execPath,
    [fixture, "--background", "--control-port", String(controlPort)],
    {
      cwd: packageCwd,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const startResult = await waitForExit(background);
  assert.strictEqual(startResult.code, 0, startResult.stderr || startResult.stdout);

  const duplicate = spawn(
    process.execPath,
    [fixture, "--background", "--control-port", String(controlPort)],
    {
      cwd: packageCwd,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const duplicateResult = await waitForExit(duplicate);
  assert.notStrictEqual(duplicateResult.code, 0);
  assert.match(
    duplicateResult.stderr,
    /a background graph is already running on http:\/\/127\.0\.0\.1:/,
  );
  assert.match(
    duplicateResult.stderr,
    new RegExp(packageCwd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );

  const stop = spawn(process.execPath, [fixture, "--stop", "--control-port", String(controlPort)], {
    cwd: packageCwd,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stopResult = await waitForExit(stop);
  assert.strictEqual(stopResult.code, 0, stopResult.stderr || stopResult.stdout);

  await run(function* () {
    yield* waitForFetchClosed(`http://127.0.0.1:${controlPort}/health`, 5000);
  });
});
