import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dynamic, type ValueSource, withValues } from "@bomb.sh/router";
import { z } from "zod";

export function sourceConfig(valueSchema: z.ZodType) {
  let sourcesSchema = z
    .array(z.object({ name: z.string(), value: z.unknown() }))
    .pipe(z.array(z.object({ name: z.string(), value: valueSchema })));

  return dynamic(sourcesSchema, withValues);
}

export function readJsonConfig(path: string): Record<string, unknown> {
  const contents = readFileSync(resolve(path), "utf8");
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    let message = error instanceof Error ? error.message : String(error);
    throw new SyntaxError(`Invalid JSON in config file ${JSON.stringify(path)}: ${message}`);
  }

  if (!isRecord(parsed)) {
    throw new TypeError(`Config file ${path} must contain a JSON object`);
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function getConfigSources(
  configPaths?: readonly string[],
  workingDirectory = process.cwd(),
): ValueSource[] {
  if (configPaths !== undefined) {
    return [...configPaths].reverse().flatMap(loadConfig);
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
