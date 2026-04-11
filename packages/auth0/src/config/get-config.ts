import { createRequire } from "node:module";
import { program, object, field, type Attrs } from "configliere";
import type { Auth0Configuration, ConfigFieldDef } from "../types.ts";
import { configFields } from "../types.ts";

const pkg = createRequire(import.meta.url)("../../package.json") as {
  name: string;
  version: string;
};

export const auth0Program = program({
  name: pkg.name,
  version: pkg.version,
  config: object(
    Object.fromEntries(
      Object.entries(configFields).map(([key, f]: [string, ConfigFieldDef]) => [
        key,
        {
          description: f.description,
          ...(f.aliases && { aliases: f.aliases }),
          ...field(f.schema, ...(f.default !== undefined ? [field.default(f.default)] : [])),
        },
      ]),
    ) as unknown as Attrs<Auth0Configuration>,
  ),
});

export function getConfig(
  options?: Partial<Auth0Configuration>,
  args: string[] = [],
): Auth0Configuration {
  const envs = [{ name: "env", value: process.env as Record<string, string> }];
  const values = [{ name: "options", value: options }];
  const result = auth0Program.parse({ args, envs, values });

  if (!result.ok) throw result.error;

  return result.value.config;
}
