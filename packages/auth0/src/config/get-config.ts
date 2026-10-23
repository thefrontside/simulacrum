import { createRequire } from "node:module";
import {
  cli,
  command,
  description,
  dynamic,
  type EnvSource,
  name,
  option,
  parse,
  printErrors,
  printHelp,
  printVersion,
  schema,
  transform,
  type ValueSource,
  withValues,
  version,
} from "@bomb.sh/router";
import { z } from "zod";
import { getConfigSources } from "./config-sources.ts";
import type { Auth0Configuration } from "../types.ts";

const pkg: {
  name: "@simulacrum/auth0-simulator";
  version: string;
} = createRequire(import.meta.url)("../../package.json");

const fieldDefaults = {
  audience: "https://thefrontside.auth0.com/api/v1/",
  clientID: "00000000000000000000000000000000",
  scope: "openid profile email offline_access",
  protocol: "https",
} satisfies Partial<Auth0Configuration>;

const configFields = {
  port: z
    .number()
    .gt(2999, "port must be greater than 2999")
    .lt(10000, "port must be less than 10000")
    .optional(),
  protocol: z.enum(["http", "https"]).optional(),
  domain: z.string().min(1, "domain is required").optional(),
  audience: z.string().min(1, "audience is required").optional(),
  clientID: z.string().max(32, "must be at most 32 characters long").optional(),
  clientSecret: z.string().optional(),
  scope: z
    .union([
      z.string().min(1, "scope is required"),
      z.array(
        z.strictObject({
          clientID: z.string().max(32, "must be at most 32 characters long"),
          audience: z.string().min(1, "audience is required").optional(),
          scope: z.string().min(1, "scope is required"),
        }),
      ),
    ])
    .optional(),
  rulesDirectory: z.string().optional(),
  connection: z.string().optional(),
};

const configObjectSchema = z.object(configFields);

const configSourcesSchema = z.array(z.object({ name: z.string(), value: z.unknown() })).pipe(
  z.array(
    z.object({
      name: z.string(),
      value: configObjectSchema.strict(),
    }),
  ),
);

const configSchema = configObjectSchema.transform((input, context) => {
  let domainUrl =
    input.domain === undefined
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

  let port = input.port ?? domainPort ?? 4400;
  let domain = `localhost:${port}`;
  if (domainUrl && input.domain !== undefined) {
    domainUrl.port = String(port);
    domain = input.domain.includes("://")
      ? domainUrl.toString().replace(/\/$/, "")
      : `${domainUrl.hostname}:${port}`;
  }

  return {
    ...input,
    audience: input.audience ?? fieldDefaults.audience,
    clientID: input.clientID ?? fieldDefaults.clientID,
    scope: input.scope ?? fieldDefaults.scope,
    protocol: input.protocol ?? fieldDefaults.protocol,
    port,
    domain,
  };
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
    schema(z.string().optional()),
  ),
  dynamic(configSourcesSchema, withValues),
  option(
    name("port"),
    description("port to listen on"),
    cli(["--port", "-p"]),
    schema(configFields.port),
  ),
  option(name("domain"), description("server domain"), schema(configFields.domain)),
  option(name("audience"), description("auth0 audience"), schema(configFields.audience)),
  option(name("clientID"), description("auth0 client ID"), schema(configFields.clientID)),
  option(name("clientSecret"), description("client secret"), schema(configFields.clientSecret)),
  option(name("scope"), description("auth0 scope"), schema(configFields.scope)),
  option(
    name("rulesDirectory"),
    description("directory containing auth0 rules"),
    schema(configFields.rulesDirectory),
  ),
  option(name("connection"), description("auth0 connection"), schema(configFields.connection)),
  option(name("protocol"), description("server protocol"), schema(configFields.protocol)),
  // to normalize protocol, domain an port
  transform(configSchema),
);

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
  let first = parse(auth0App, {
    argv: args,
    envs: envs ?? [],
  });

  if (!first.ok) {
    return { type: "error", text: printErrors(first) };
  }

  try {
    const sources = [...(values ?? []), ...getConfigSources(first.model.config)];
    const settled = first.resume(sources);

    if (!settled.ok) {
      return { type: "error", text: printErrors(settled) };
    }

    switch (settled.method) {
      case "help":
        return { type: "help", text: printHelp(settled) };
      case "version":
        return { type: "version", text: printVersion(settled) };
      case "execute":
        if (settled.route === "/") {
          return { type: "config", value: settled.model };
        }
        return { type: "error", text: "unexpected config route" };
    }
  } catch (error) {
    return {
      type: "error",
      text: error instanceof Error ? error.message : String(error),
    };
  }
}
