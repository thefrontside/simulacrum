import path from "path";
import fs from "fs";

const schemaDefaults = [
  "schema.docs-enterprise.graphql",
  "schema.docs.graphql",
  "api.github.com.json",
] as const;
export type SchemaFile = (typeof schemaDefaults)[number];

export function getSchema(schemaFile: SchemaFile | string) {
  let root = path.join(__dirname, "..").endsWith("dist")
    ? path.join(__dirname, "..", "..")
    : path.join(__dirname, "..");

  const fileString = fs.readFileSync(
    (schemaDefaults as unknown as string[]).includes(schemaFile)
      ? path.join(root, "schema", schemaFile)
      : schemaFile,
    "utf-8"
  );

  return schemaFile.endsWith(".json") ? JSON.parse(fileString) : fileString;
}
