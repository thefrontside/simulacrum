import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { createContext, commands, inject, program, object, field, type Attrs } from "configliere";
import type { Auth0Configuration, ConfigFieldDef } from "../types.ts";
import { configFields } from "../types.ts";
import z from "zod";

const pkg = createRequire(import.meta.url)("../../package.json") as {
  name: string;
  version: string;
};

const auth0ConfigAttrs = Object.fromEntries(
  Object.entries(configFields).map(([key, f]: [string, ConfigFieldDef]) => [
    key,
    {
      description: f.description,
      ...(f.aliases && { aliases: f.aliases }),
      ...field(f.schema, ...(f.default !== undefined ? [field.default(f.default)] : [])),
    },
  ]),
) as unknown as Attrs<Auth0Configuration>;

export const auth0ConfigParser = object(auth0ConfigAttrs);

export const auth0Program = program({
  name: pkg.name,
  version: pkg.version,
  config: commands(
    {
      start: {
        description: "start the Auth0 simulation server",
        ...object({
          config: {
            description: "path to a JSON config file",
            aliases: ["-c"],
            ...field(z.optional(z.string())),
          },
          next: inject((_config: Partial<Auth0Configuration>) => auth0ConfigParser),
        }),
      },
    },
    { default: "start" },
  ),
});

type ConfigValue = {
  name: string;
  value: Partial<Auth0Configuration> | undefined;
};

type ParseAuth0ConfigOptions = {
  args?: string[];
  envs?: { name: string; value: Record<string, string> }[];
  values?: ConfigValue[];
};

function getDomainPort(domain: string): number | undefined {
  if (domain.includes("://")) {
    let url = new URL(domain);
    return url.port ? Number(url.port) : undefined;
  }

  let match = domain.match(/:(\d+)$/);
  return match ? Number(match[1]) : undefined;
}

function withDomainPort(domain: string, port: number): string {
  if (domain.includes("://")) {
    let url = new URL(domain);
    url.port = String(port);
    return url.toString().replace(/\/$/, "");
  }

  return domain.replace(/:\d+$/, "") + `:${port}`;
}

function normalizeConfig(config: Auth0Configuration): Auth0Configuration {
  let port = config.port;

  if (port === undefined) {
    return config;
  }

  if (config.domain === undefined) {
    return {
      ...config,
      domain: `localhost:${port}`,
    };
  }

  let domainPort = getDomainPort(config.domain);

  if (domainPort !== undefined && domainPort !== port) {
    throw new TypeError(`Configured domain ${config.domain} conflicts with port ${port}`);
  }

  return {
    ...config,
    domain: withDomainPort(config.domain, port),
  };
}

export function readJsonConfig(path: string): Record<string, unknown> {
  const contents = readFileSync(resolve(path), "utf8");
  const parsed = JSON.parse(contents);

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError(`Config file ${path} must contain a JSON object`);
  }

  return parsed as Record<string, unknown>;
}

export function parseAuth0Config({
  args = [],
  envs = [],
  values = [],
}: ParseAuth0ConfigOptions = {}): Auth0Configuration {
  const input = { args, envs, values };
  const result = auth0ConfigParser.parse(input, createContext(input));

  if (!result.ok) throw result.error;

  return normalizeConfig(result.value);
}

export function getConfig(options?: Partial<Auth0Configuration>): Auth0Configuration {
  return parseAuth0Config({ values: [{ name: "options", value: options }] });
}
