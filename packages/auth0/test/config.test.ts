import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { getConfigSources } from "../src/config/config-sources.ts";
import { getCLIConfig, getConfig } from "../src/index.ts";

describe("CLI config parsing", () => {
  let configFixtures = fileURLToPath(new URL("./fixtures/configs/", import.meta.url));
  let discoveredConfigDirectory = fileURLToPath(
    new URL("./fixtures/config-discovery/", import.meta.url),
  );
  let portConfigPath = join(configFixtures, "port.json");
  let invalidPortConfigPath = join(configFixtures, "invalid-port.json");
  let legacyClientIdConfigPath = join(configFixtures, "legacy-client-id.json");
  let legacyScopeClientIdConfigPath = join(configFixtures, "legacy-scope-client-id.json");

  let envs = [{ name: "env", value: process.env as Record<string, string> }];

  it("parses config directly from argv", () => {
    let result = getCLIConfig({ args: ["--port", "4567"], envs });

    expect(result.type).toBe("config");

    if (result.type === "config") {
      expect(result.value.port).toBe(4567);
    }
  });

  it("loads a JSON config file before parsing remaining args", () => {
    let clientID = "client-id-value-for-cli-merge-01";

    let result = getCLIConfig({
      args: ["--config", portConfigPath, "--client-id", clientID],
      envs,
    });

    expect(result.type).toBe("config");

    if (result.type === "config") {
      expect(result.value.port).toBe(4567);
      expect(result.value.clientID).toBe(clientID);
    }

    let shortFlagResult = getCLIConfig({ args: ["-c", portConfigPath], envs });

    expect(shortFlagResult.type).toBe("config");
    if (shortFlagResult.type === "config") {
      expect(shortFlagResult.value.port).toBe(4567);
    }
  });

  it("rejects unknown keys in config values", () => {
    let result = getCLIConfig({
      args: [],
      envs: [],
      values: [{ name: "test config", value: { port: 4567, unexpectedConfigKey: true } }],
    });

    expect(result.type).toBe("error");
    if (result.type === "error") {
      expect(result.text).toContain("unexpectedConfigKey");
    }
  });

  it("validates known config values with their parameter schema", () => {
    let result = getCLIConfig({
      args: [],
      envs: [],
      values: [{ name: "test config", value: { port: "not a number" } }],
    });

    expect(result.type).toBe("error");
    if (result.type === "error") {
      expect(result.text).toContain("port");
    }
  });

  it("rejects an invalid config value even when overridden by a CLI value", () => {
    let result = getCLIConfig({
      args: ["--config", invalidPortConfigPath, "--port", "4567"],
      envs: [],
    });

    expect(result.type).toBe("error");
    if (result.type === "error") {
      expect(result.text).toContain("port");
    }
  });

  it("rejects legacy clientId in JSON config", () => {
    let result = getCLIConfig({ args: ["-c", legacyClientIdConfigPath], envs: [] });

    expect(result.type).toBe("error");

    if (result.type === "error") {
      expect(result.text).toContain('"clientId"');
    }
  });

  it("rejects legacy clientId in scope entries", () => {
    let result = getCLIConfig({ args: ["-c", legacyScopeClientIdConfigPath], envs: [] });

    expect(result.type).toBe("error");

    if (result.type === "error") {
      expect(result.text).toContain("scope");
    }
  });

  it("rejects unclaimed CLI arguments", () => {
    let result = getCLIConfig({ args: ["unexpected-arg"], envs: [] });

    expect(result.type).toBe("error");
    if (result.type === "error") {
      expect(result.text).toContain("unexpected-arg");
    }
  });

  it("discovers a JSON config file from the working directory", () => {
    let result = getCLIConfig({
      args: [],
      envs: [],
      values: getConfigSources(undefined, discoveredConfigDirectory),
    });

    expect(result.type).toBe("config");

    if (result.type === "config") {
      expect(result.value.port).toBe(4567);
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

  it("describes the client ID length limit accurately", () => {
    let result = getCLIConfig({
      args: ["--client-id", "x".repeat(33)],
      envs: [],
    });

    expect(result.type).toBe("error");

    if (result.type === "error") {
      expect(result.text).toContain("must be at most 32 characters long");
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

  it("maps the client ID environment variable", () => {
    let result = getCLIConfig({
      args: [],
      envs: [{ name: "env", value: { CLIENT_ID: "environment-client-id" } }],
    });

    expect(result.type).toBe("config");

    if (result.type === "config") {
      expect(result.value.clientID).toBe("environment-client-id");
    }
  });

  it("resolves environment variables above config file values", () => {
    let result = getCLIConfig({
      args: ["-c", portConfigPath],
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

  it("loads a JSON config path from the CONFIG environment variable", () => {
    let result = getCLIConfig({
      args: [],
      envs: [{ name: "env", value: { CONFIG: portConfigPath } }],
    });

    expect(result.type).toBe("config");
    if (result.type === "config") {
      expect(result.value.port).toBe(4567);
    }
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

  it("resolves programmatic options above discovered JSON config", () => {
    let result = getCLIConfig({
      args: [],
      envs: [],
      values: [
        { name: "options", value: { port: 4568 } },
        ...getConfigSources(undefined, discoveredConfigDirectory),
      ],
    });

    expect(result.type).toBe("config");
    if (result.type === "config") {
      expect(result.value.port).toBe(4568);
    }
  });

  it("throws when domain and port conflict", () => {
    expect(() => getConfig({ domain: "localhost:9999", port: 4567 })).toThrow(
      "conflicts with port 4567",
    );
  });
});
