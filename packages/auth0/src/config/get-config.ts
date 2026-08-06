import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import {
  createContext,
  commands,
  inject,
  program,
  object,
  field,
  type Attrs,
  type ObjectInfo,
  type Parser,
  type ParseResult,
} from "configliere";
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

export const auth0ConfigParser = normalized(object(auth0ConfigAttrs));

function normalized(
  parser: Parser<Auth0Configuration, ObjectInfo<Auth0Configuration>>,
): Parser<Auth0Configuration, ObjectInfo<Auth0Configuration>> {
  let normalize = (
    result: ParseResult<Auth0Configuration>,
  ): ParseResult<Auth0Configuration> =>
    result.ok
      ? { ok: true, value: normalizeConfig(result.value), remainder: result.remainder }
      : result;

  return {
    ...parser,
    parse(input, ctx) {
      return normalize(parser.parse(input, ctx));
    },
    inspect(ctx) {
      let info = parser.inspect(ctx);
      return { ...info, result: normalize(info.result) };
    },
  };
}

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

const DefaultAuth0Port = 4400;

function normalizeConfig(config: Auth0Configuration): Auth0Configuration {
  let port = config.port;

  if (port === undefined) {
    let domainPort = config.domain ? getDomainPort(config.domain) : undefined;
    let resolvedPort = domainPort ?? DefaultAuth0Port;
    return {
      ...config,
      port: resolvedPort,
      domain:
        config.domain === undefined
          ? `localhost:${resolvedPort}`
          : withDomainPort(config.domain, resolvedPort),
    };
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

  return result.value;
}

export function getConfig(options?: Partial<Auth0Configuration>): Auth0Configuration {
  return parseAuth0Config({ values: [{ name: "options", value: options }] });
}

type CLIConfigInput = {
  args: string[];
  envs: { name: string; value: Record<string, string> }[];
};

export type CLIConfigResult =
  | { type: "help"; text: string }
  | { type: "version"; text: string }
  | { type: "config"; value: Auth0Configuration };

export function getCLIConfig({ args, envs }: CLIConfigInput): CLIConfigResult {
  let parser = auth0Program.parse({ args, envs });

  if (!parser.ok) {
    throw parser.error;
  }

  if (parser.value.help) {
    return { type: "help", text: auth0Program.help({ args }) };
  }

  if (parser.value.version) {
    return { type: "version", text: parser.value.version };
  }

  let command = parser.value.config;

  if (command.help) {
    return { type: "help", text: command.text };
  }

  if (command.name !== "start") {
    throw new TypeError(`Unknown command ${command.name}`);
  }

  let configPath = command.config.config;
  let values = configPath
    ? [{ name: configPath, value: readJsonConfig(configPath) }]
    : [];
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

  return { type: "config", value: result.value };
}
