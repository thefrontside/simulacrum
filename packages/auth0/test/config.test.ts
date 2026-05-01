import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createContext } from "configliere";
import { auth0Program, getConfig } from "../src/index.ts";
import type { Auth0Configuration } from "../src/types.ts";

function readJsonConfig(path: string): Record<string, unknown> {
  return JSON.parse(require("node:fs").readFileSync(path, "utf8")) as Record<string, unknown>;
}

function parseCliConfig(args: string[]): { value: Auth0Configuration } {
  let envs = [{ name: "env", value: process.env as Record<string, string> }];
  let parser = auth0Program.parse({ args, envs });

  if (!parser.ok) {
    throw parser.error;
  }

  if (parser.value.help || parser.value.version) {
    throw new Error("expected config result");
  }

  let command = parser.value.config;

  if (command.help) {
    throw new Error("expected config result");
  }

  if (command.name !== "start") {
    throw new TypeError(`Unknown command ${command.name}`);
  }

  let configPath = command.config.config;
  let values = configPath ? [{ name: configPath, value: readJsonConfig(configPath) }] : [];
  let configParser = command.config.next(values[0]?.value ?? {});
  let input = {
    args: parser.remainder.args ?? [],
    envs: parser.remainder.envs ?? envs,
    values,
  };
  let result = configParser.parse(input, createContext(input));

  if (!result.ok) {
    throw result.error;
  }

  return result;
}

describe("CLI config parsing", () => {
  let tempDirectory: string | undefined;

  afterEach(() => {
    if (tempDirectory) {
      rmSync(tempDirectory, { recursive: true, force: true });
      tempDirectory = undefined;
    }
  });

  it("parses config directly from argv", () => {
    let result = parseCliConfig(["--port", "4567"]);

    expect(result.value.port).toBe(4567);
  });

  it("loads a JSON config file before parsing remaining args", () => {
    tempDirectory = mkdtempSync(join(tmpdir(), "auth0-config-"));
    let configPath = join(tempDirectory, "config.json");
    writeFileSync(configPath, JSON.stringify({ port: 4567 }), "utf8");
    let clientID = "client-id-value-for-cli-merge-01";

    let result = parseCliConfig(["-c", configPath, "--client-id", clientID]);

    expect(result.value.port).toBe(4567);
    expect(result.value.clientID).toBe(clientID);
  });

  it("returns command help from the staged CLI parser", () => {
    let parser = auth0Program.parse({ args: ["start", "--help"], envs: [] });

    expect(parser.ok).toBe(true);

    if (!parser.ok) {
      throw parser.error;
    }

    let command = parser.value.config;

    if (!command.help) {
      throw new Error("expected help response");
    }

    expect(command.text).toContain("start [OPTIONS]");
  });

  it("derives domain from port for programmatic config", () => {
    let config = getConfig({ port: 4567 });

    expect(config.domain).toBe("localhost:4567");
  });

  it("throws when domain and port conflict", () => {
    expect(() => getConfig({ domain: "localhost:9999", port: 4567 })).toThrow(
      "conflicts with port 4567",
    );
  });
});
