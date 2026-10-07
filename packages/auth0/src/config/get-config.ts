import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import {
  checkpoint,
  cli,
  command,
  description,
  env,
  type EnvSource,
  name,
  option,
  parse as configliereParse,
  printErrors,
  printHelp,
  printVersion,
  type Result,
  schema as optionSchema,
  transform,
  type ValueSource,
  version,
} from "configliere";
import { z } from "zod";
import type { Auth0Configuration } from "../types.ts";

const pkg = createRequire(import.meta.url)("../../package.json") as {
  name: string;
  version: string;
};

const fieldDefaults = {
  audience: "https://thefrontside.auth0.com/api/v1/",
  clientID: "00000000000000000000000000000000",
  scope: "openid profile email offline_access",
  protocol: "https",
} satisfies Partial<Auth0Configuration>;

export function readJsonConfig(path: string): Record<string, unknown> {
  const contents = readFileSync(resolve(path), "utf8");
  const parsed = JSON.parse(contents);

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError(`Config file ${path} must contain a JSON object`);
  }

  return parsed as Record<string, unknown>;
}

function legacyClientIdIssue(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return;
  }

  let config = value as Record<string, unknown>;
  if (Object.hasOwn(config, "clientId")) {
    return `Configuration key "clientId" is no longer supported; use "clientID" instead.`;
  }

  if (
    Array.isArray(config.scope) &&
    config.scope.some((entry) =>
      typeof entry === "object" && entry !== null && !Array.isArray(entry) &&
      Object.hasOwn(entry, "clientId")
    )
  ) {
    return `Scope key "clientId" is no longer supported; use "clientID" instead.`;
  }

  return undefined;
}

const configFields = {
  port: z.optional(
    z.number().gt(2999, "port must be greater than 2999").lt(10000, "port must be less than 10000"),
  ),
  domain: z.optional(z.string().min(1, "domain is required")),
  audience: z.string().min(1, "audience is required").default(fieldDefaults.audience),
  clientID: z.string().max(32, "must be at most 32 characters long").default(fieldDefaults.clientID),
  clientSecret: z.optional(z.string()),
  scope: z
    .union([
      z.string().min(1, "scope is required"),
      z.array(
        z.object({
          clientID: z.string().max(32, "must be at most 32 characters long"),
          audience: z.optional(z.string().min(1, "audience is required")),
          scope: z.string().min(1, "scope is required"),
        }),
      ),
    ])
    .default(fieldDefaults.scope),
  rulesDirectory: z.optional(z.string()),
  connection: z.optional(z.string()),
  protocol: z.enum(["http", "https"]).default(fieldDefaults.protocol),
};

const DefaultAuth0Port = 4400;

type NormalizedConfig = Pick<Auth0Configuration, "port" | "domain">;

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

function normalizeConfig(input: {
  port?: number | undefined;
  domain?: string | undefined;
}): NormalizedConfig {
  let port = input.port;

  if (port === undefined) {
    let domainPort = input.domain ? getDomainPort(input.domain) : undefined;
    let resolvedPort = domainPort ?? DefaultAuth0Port;
    return {
      port: resolvedPort,
      domain:
        input.domain === undefined
          ? `localhost:${resolvedPort}`
          : withDomainPort(input.domain, resolvedPort),
    };
  }

  if (input.domain === undefined) {
    return {
      port,
      domain: `localhost:${port}`,
    };
  }

  let domainPort = getDomainPort(input.domain);

  // Preserve a conflicting pair for the model schema to report as an issue.
  if (domainPort !== undefined && domainPort !== port) {
    return { port, domain: input.domain };
  }

  return {
    port,
    domain: withDomainPort(input.domain, port),
  };
}

const configSchema = z
  .object({ port: configFields.port, domain: configFields.domain })
  .transform((input, context): NormalizedConfig => {
    if (input.domain !== undefined && input.port !== undefined) {
      let domainPort = getDomainPort(input.domain);
      if (domainPort !== undefined && domainPort !== input.port) {
        context.addIssue({
          code: "custom",
          message: `Configured domain ${input.domain} conflicts with port ${input.port}`,
        });
        return z.NEVER;
      }
    }

    return normalizeConfig(input);
  });

// the config file path binds ahead of the values checkpoint so it is visible
// on the suspended model. everything after the checkpoint binds only once the
// checkpoint is resumed with the file's values, which sit below arguments and
// environment variables in the resolution order.
export const auth0App = command(
  name(pkg.name),
  description("Simulate the Auth0 API."),
  version(pkg.version),
  option(
    name("config"),
    description("path to a JSON config file"),
    cli(["--config", "-c"]),
    // An empty key disables the inferred CONFIG lookup. The file path is
    // resolved from arguments only.
    env(""),
    optionSchema(z.optional(z.string())),
  ),
  checkpoint(),
  transform(
    configSchema,
    option(
      name("port"),
      description("port to listen on"),
      cli(["--port", "-p"]),
      optionSchema(configFields.port),
    ),
    option(name("domain"), description("server domain"), optionSchema(configFields.domain)),
    option(name("audience"), description("auth0 audience"), optionSchema(configFields.audience)),
    option(
      name("clientID"),
      description("auth0 client ID"),
      cli(["--client-id"]),
      optionSchema(configFields.clientID),
    ),
    option(
      name("clientSecret"),
      description("client secret"),
      cli(["--client-secret"]),
      optionSchema(configFields.clientSecret),
    ),
    option(name("scope"), description("auth0 scope"), optionSchema(configFields.scope)),
    option(
      name("rulesDirectory"),
      description("directory containing auth0 rules"),
      cli(["--rules-directory"]),
      optionSchema(configFields.rulesDirectory),
    ),
    option(
      name("connection"),
      description("auth0 connection"),
      optionSchema(configFields.connection),
    ),
    option(name("protocol"), description("server protocol"), optionSchema(configFields.protocol)),
  ),
);

function parseConfig(
  input: Parameters<typeof configliereParse>[1],
): ReturnType<typeof configliereParse> {
  let first = configliereParse(auth0App, input);

  if (!first.ok || !first.resume) {
    return first;
  }

  let configPath = (first.model as { config?: unknown } | undefined)?.config;
  let values: Result<ValueSource[]> =
    configPath === undefined ? discoverConfig() : loadConfig(String(configPath));

  return first.resume(values);
}

function discoverConfig(): Result<ValueSource[]> {
  let directory = resolve(process.cwd());

  while (true) {
    let path = resolve(directory, "auth0Simulator.config.json");
    if (existsSync(path)) {
      return loadConfig(path);
    }

    let parent = resolve(directory, "..");
    if (parent === directory) {
      return { ok: true, value: [] };
    }
    directory = parent;
  }
}

function loadConfig(path: string): Result<ValueSource[]> {
  try {
    let config = readJsonConfig(path);
    let issue = legacyClientIdIssue(config);
    if (issue) {
      return { ok: false, issues: [{ message: issue }] };
    }

    return {
      ok: true,
      value: [{ name: path, value: config }],
    };
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}

export function getConfig(options?: Partial<Auth0Configuration>): Auth0Configuration {
  let result = getCLIConfig({
    args: [],
    values: options ? [{ name: "options", value: options }] : [],
  });

  if (result.type === "config") {
    return result.value;
  }

  if (result.type === "error") {
    throw new Error(result.text);
  }

  throw new Error(`unexpected config result: ${result.type}`);
}

type CLIConfigInput = {
  args: string[];
  envs?: readonly EnvSource[] | undefined;
  values?: readonly ValueSource[] | undefined;
};

export type CLIConfigResult =
  | { type: "help"; text: string }
  | { type: "version"; text: string }
  | { type: "error"; text: string }
  | { type: "config"; value: Auth0Configuration };

export function getCLIConfig({ args, envs, values }: CLIConfigInput): CLIConfigResult {
  let issue = values?.map((source) => legacyClientIdIssue(source.value)).find(Boolean);
  if (issue) {
    return { type: "error", text: issue };
  }

  let settled = parseConfig({ argv: args, envs: envs ?? [], values: values ?? [] });

  if (!settled.ok) {
    return { type: "error", text: printErrors(settled as never) };
  }

  if (settled.method === "help") {
    return { type: "help", text: printHelp(settled as never) };
  }

  if (settled.method === "version") {
    return { type: "version", text: printVersion(settled as never) };
  }

  let { clientId: _clientId, ...model } = settled.model as Auth0Configuration & {
    clientId?: string | undefined;
  };
  return { type: "config", value: model as Auth0Configuration };
}
