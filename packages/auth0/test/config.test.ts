import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getCLIConfig, getConfig } from "../src/index.ts";

describe("CLI config parsing", () => {
  let tempDirectory: string | undefined;

  let envs = [{ name: "env", value: process.env as Record<string, string> }];

  afterEach(() => {
    if (tempDirectory) {
      rmSync(tempDirectory, { recursive: true, force: true });
      tempDirectory = undefined;
    }
  });

  it("parses config directly from argv", () => {
    let result = getCLIConfig({ args: ["--port", "4567"], envs });

    expect(result.type).toBe("config");

    if (result.type === "config") {
      expect(result.value.port).toBe(4567);
    }
  });

  it("loads a JSON config file before parsing remaining args", () => {
    tempDirectory = mkdtempSync(join(tmpdir(), "auth0-config-"));
    let configPath = join(tempDirectory, "config.json");
    writeFileSync(configPath, JSON.stringify({ port: 4567 }), "utf8");
    let clientID = "client-id-value-for-cli-merge-01";

    let result = getCLIConfig({ args: ["-c", configPath, "--client-id", clientID], envs });

    expect(result.type).toBe("config");

    if (result.type === "config") {
      expect(result.value.port).toBe(4567);
      expect(result.value.clientID).toBe(clientID);
    }
  });

  it("returns command help when requested", () => {
    let result = getCLIConfig({ args: ["--help"], envs: [] });

    expect(result.type).toBe("help");

    if (result.type === "help") {
      expect(result.text).toContain("[OPTIONS]");
    }
  });

  it("returns the program version when requested", () => {
    let result = getCLIConfig({ args: ["--version"], envs: [] });

    expect(result.type).toBe("version");

    if (result.type === "version") {
      expect(result.text).toMatch(/\d+\.\d+\.\d+/);
    }
  });

  it("returns configuration errors as printable text", () => {
    let result = getCLIConfig({
      args: ["--domain", "localhost:9999", "--port", "4567"],
      envs: [],
    });

    expect(result.type).toBe("error");

    if (result.type === "error") {
      expect(result.text).toContain("conflicts with port 4567");
    }
  });

  it("falls back to environment variables for unbound parameters", () => {
    let result = getCLIConfig({
      args: [],
      envs: [{ name: "env", value: { PORT: "4588" } }],
    });

    expect(result.type).toBe("config");

    if (result.type === "config") {
      expect(result.value.port).toBe(4588);
    }
  });

  it("resolves environment variables above config file values", () => {
    tempDirectory = mkdtempSync(join(tmpdir(), "auth0-config-"));
    let configPath = join(tempDirectory, "config.json");
    writeFileSync(configPath, JSON.stringify({ port: 4567 }), "utf8");

    let result = getCLIConfig({
      args: ["-c", configPath],
      envs: [{ name: "env", value: { PORT: "4588" } }],
    });

    expect(result.type).toBe("config");

    if (result.type === "config") {
      expect(result.value.port).toBe(4588);
    }
  });

  it("resolves arguments above environment variables", () => {
    let result = getCLIConfig({
      args: ["--port", "4567"],
      envs: [{ name: "env", value: { PORT: "4588" } }],
    });

    expect(result.type).toBe("config");

    if (result.type === "config") {
      expect(result.value.port).toBe(4567);
    }
  });

  it("does not read a config path from the environment", () => {
    let result = getCLIConfig({
      args: [],
      envs: [{ name: "env", value: { CONFIG: "/nonexistent/auth0-config.json" } }],
    });

    expect(result.type).toBe("config");
  });

  it("derives domain from port for programmatic config", () => {
    let config = getConfig({ port: 4567 });

    expect(config.domain).toBe("localhost:4567");
  });

  it("derives port from domain for programmatic config", () => {
    let config = getConfig({ domain: "localhost:4567" });

    expect(config.port).toBe(4567);
    expect(config.domain).toBe("localhost:4567");
  });

  it("throws when domain and port conflict", () => {
    expect(() => getConfig({ domain: "localhost:9999", port: 4567 })).toThrow(
      "conflicts with port 4567",
    );
  });
});
