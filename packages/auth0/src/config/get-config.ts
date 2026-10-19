import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import {
  cli,
  command,
  description,
  dynamic,
  env,
  type AnyIntent,
  type EnvSource,
  type MethodNotAllowed,
  name,
  option,
  parse as configliereParse,
  printErrors,
  printHelp,
  printVersion,
  schema as optionSchema,
  transform,
  type UnprocessableContent,
  type ValueSource,
  withValues,
  version,
} from "@bomb.sh/router";
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

const configFields = {
  port: z.optional(
    z.number().gt(2999, "port must be greater than 2999").lt(10000, "port must be less than 10000"),
  ),
  domain: z.optional(z.string().min(1, "domain is required")),
  audience: z.string().min(1, "audience is required").default(fieldDefaults.audience),
  clientID: z
    .string()
    .max(32, "must be at most 32 characters long")
    .default(fieldDefaults.clientID),
  clientSecret: z.optional(z.string()),
  scope: z
    .union([
      z.string().min(1, "scope is required"),
      z.array(
        z.strictObject({
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

const configObjectSchema = z.object(configFields);
const configFieldNameSchema = configObjectSchema.keyof();
const DefaultAuth0Port = 4400;

const configKeysSchema = z.record(z.string(), z.unknown()).superRefine((config, context) => {
  for (const key of Object.keys(config)) {
    if (!configFieldNameSchema.safeParse(key).success) {
      context.addIssue({
        code: "custom",
        path: [key],
        message: `Unrecognized config key "${key}"`,
      });
    }
  }
});

const configSourcesSchema = z
  .array(z.object({ name: z.string(), value: z.unknown() }))
  .pipe(z.array(z.object({ name: z.string(), value: configKeysSchema })));

const configSchema = configObjectSchema.transform((input, context) => {
  let domainUrl = input.domain === undefined
    ? undefined
    : new URL(input.domain.includes("://") ? input.domain : `http://${input.domain}`);
  let domainPort = domainUrl?.port ? Number(domainUrl.port) : undefined;

  if (input.port !== undefined && domainPort !== undefined && domainPort !== input.port) {
    context.addIssue({
      code: "custom",
      message: `Configured domain ${input.domain} conflicts with port ${input.port}`,
    });
    return z.NEVER;
  }

  let port = input.port ?? domainPort ?? DefaultAuth0Port;
  let domain = `localhost:${port}`;
  if (domainUrl && input.domain !== undefined) {
    domainUrl.port = String(port);
    domain = input.domain.includes("://")
      ? domainUrl.toString().replace(/\/$/, "")
      : `${domainUrl.hostname}:${port}`;
  }

  return { ...input, port, domain };
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
  dynamic(configSourcesSchema, withValues),
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
  transform(configSchema),
);

function discoverConfig(): ValueSource[] {
  let directory = resolve(process.cwd());

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
  let valueSources = configSourcesSchema.safeParse(values ?? []);
  if (!valueSources.success) {
    return {
      type: "error",
      text: valueSources.error.issues.map((issue) => issue.message).join("\n"),
    };
  }

  let first = configliereParse(auth0App, { argv: args, envs: envs ?? [], values: valueSources.data });
  let settled: AnyIntent | MethodNotAllowed | UnprocessableContent = first as
    | AnyIntent
    | MethodNotAllowed
    | UnprocessableContent;
  if ("resume" in first) {
    try {
      let loaded =
        first.model.config === undefined
          ? discoverConfig()
          : loadConfig(String(first.model.config));
      settled = first.resume(loaded) as AnyIntent | MethodNotAllowed | UnprocessableContent;
    } catch (error) {
      return {
        type: "error",
        text: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (!settled.ok) {
    return { type: "error", text: printErrors(settled as never) };
  }

  if (settled.method === "help") {
    return { type: "help", text: printHelp(settled as never) };
  }

  if (settled.method === "version") {
    return { type: "version", text: printVersion(settled as never) };
  }

  return { type: "config", value: settled.model as Auth0Configuration };
}
