import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ValueSource } from "@bomb.sh/router";

export function readJsonConfig(path: string): Record<string, unknown> {
  const contents = readFileSync(resolve(path), "utf8");
  const parsed: unknown = JSON.parse(contents);

  if (!isRecord(parsed)) {
    throw new TypeError(`Config file ${path} must contain a JSON object`);
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function getConfigSources(
  configPath?: string,
  workingDirectory = process.cwd(),
): ValueSource[] {
  if (configPath !== undefined) {
    return loadConfig(configPath);
  }

  let directory = resolve(workingDirectory);

  while (true) {
    let path = resolve(directory, "auth0Simulator.config.json");
    if (existsSync(path)) {
      return loadConfig(path);
    }

    let parent = resolve(directory, "..");
    if (parent === directory) {
      return [];
    }
    directory = parent;
  }
}

function loadConfig(path: string): ValueSource[] {
  let config = readJsonConfig(path);
  return [{ name: path, value: config }];
}
