#!/usr/bin/env node
import { main, suspend, until } from "effection";
import { pathToFileURL } from "node:url";
import type {
  FoundationSimulator,
  FoundationSimulatorListening,
} from "@simulacrum/foundation-simulator";

main(function* () {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    throw new Error("usage: run-simulation-child.js <modulePath>");
  }

  const modulePath = args[0];

  // Resolve and import module inside the operation
  let mod: any;
  try {
    const url =
      modulePath.startsWith("./") || modulePath.startsWith("/")
        ? pathToFileURL(modulePath).href
        : modulePath;
    mod = yield* until(import(url));
  } catch (err) {
    throw new Error(`failed to import module: ${String(err)}`);
  }

  const exportNames = ["default", "simulation"];
  let factory: Function | undefined = undefined;
  for (const name of exportNames) {
    if (name in mod && typeof mod[name] === "function") {
      factory = mod[name];
      break;
    }
  }
  // fallback: module itself is a function
  if (!factory && typeof mod === "function") factory = mod;

  if (!factory) {
    throw new Error(`no factory function found in module: ${modulePath}`);
  }

  let sim = factory() as FoundationSimulator<any>;

  if (!sim || typeof sim.listen !== "function") {
    throw new Error("factory did not return a simulator with .listen()");
  }

  let listening: FoundationSimulatorListening<any> | undefined = undefined;
  try {
    listening = yield* until(sim.listen());
    const out = JSON.stringify({
      ready: true,
      port: listening.port,
      pid: process.pid,
    });
    console.log(out);
    yield* suspend();
  } finally {
    try {
      if (listening && typeof listening.ensureClose === "function") {
        yield* until(listening.ensureClose());
      }
    } catch (err) {
      // ignore
    }
  }
});
