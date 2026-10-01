import { it } from "node:test";
import assert from "node:assert";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { run } from "effection";
import { DEFAULT_CONTROL_PORT } from "../src/cli.ts";
import { waitForFetchClosed } from "./utils.ts";

type StatusPayload = {
  services?: Record<string, { state?: string; port?: number; pid?: number }>;
};

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

async function waitForHealth(controlPort: number) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${controlPort}/health`);
      if (response.ok) return;
    } catch (ignore) {
      // keep polling until the graph is ready or the deadline expires
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`timed out waiting for graph on port ${controlPort}`);
}

async function waitForPidExit(pid: number) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") return;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`timed out waiting for process ${pid} to exit`);
}

async function waitForStatus(controlPort: number, ready: (status: StatusPayload) => boolean) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const response = await fetch(`http://127.0.0.1:${controlPort}/status`);
    const status = (await response.json()) as StatusPayload;
    if (ready(status)) return status;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`timed out waiting for graph status on port ${controlPort}`);
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

  const statusJson = (await waitForStatus(
    controlPort,
    (status) => typeof status.services?.simulacrum?.port === "number",
  )) as {
    cwd: string;
    services: Record<string, { state?: string; port?: number; pid?: number }>;
  };
  assert.strictEqual(
    statusJson.cwd.replace(/\/$/, ""),
    fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, ""),
  );
  assert.strictEqual(statusJson.services.simulacrum?.port, controlPort);
  assert.strictEqual(statusJson.services.simulacrum?.state, "ready");

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

it("can stop a foreground graph through its control port", async () => {
  const controlPort = await getAvailablePort();
  const fixture = fileURLToPath(new URL("./fixtures/background-graph.ts", import.meta.url));
  const graph = spawn(process.execPath, [fixture, "--control-port", String(controlPort)], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForHealth(controlPort);
    const response = await fetch(`http://127.0.0.1:${controlPort}/stop`, { method: "POST" });
    assert.strictEqual(response.status, 202);
    const result = await waitForExit(graph);
    assert.strictEqual(result.code, 0, result.stderr || result.stdout);
  } finally {
    if (!graph.killed) graph.kill("SIGKILL");
  }
});

it("reaps child simulators when a graph is hard-killed", async () => {
  const controlPort = await getAvailablePort();
  const fixture = fileURLToPath(new URL("./fixtures/reaper-graph.ts", import.meta.url));
  const graph = spawn(process.execPath, [fixture, "--control-port", String(controlPort)], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForHealth(controlPort);
    const json = (await waitForStatus(
      controlPort,
      (status) =>
        typeof status.services?.child?.pid === "number" &&
        typeof status.services?.child?.port !== "number",
    )) as {
      services: Record<string, { state?: string; pid?: number }>;
    };
    const pid = json.services.child?.pid;
    assert.ok(typeof pid === "number");
    assert.strictEqual(json.services.child?.state, "starting");

    graph.kill("SIGKILL");
    await waitForPidExit(pid);
  } finally {
    if (!graph.killed) graph.kill("SIGKILL");
  }
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

it("can restart a backgrounded graph through the CLI", async () => {
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

  const restart = spawn(
    process.execPath,
    [fixture, "--restart", "--control-port", String(controlPort)],
    {
      cwd: packageCwd,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const restartResult = await waitForExit(restart);
  assert.strictEqual(restartResult.code, 0, restartResult.stderr || restartResult.stdout);

  const healthRes = await fetch(`http://127.0.0.1:${controlPort}/health`);
  assert.strictEqual(healthRes.status, 200);
  assert.deepStrictEqual(await healthRes.json(), { ok: true, port: controlPort });

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
