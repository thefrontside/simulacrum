import path from "path";
import fs from "fs";

type SchemaFile =
  | "schema.docs-enterprise.graphql"
  | "schema.docs.graphql"
  | "api.github.com.json";

export function getSchema(schemaFile: SchemaFile) {
  let root = path.join(__dirname, "..").endsWith("dist")
    ? path.join(__dirname, "..", "..")
    : path.join(__dirname, "..");

  const fileString = fs.readFileSync(
    path.join(root, "schema", schemaFile),
    "utf-8"
  );

  return schemaFile === "api.github.com.json"
    ? JSON.parse(fileString)
    : fileString;
}
