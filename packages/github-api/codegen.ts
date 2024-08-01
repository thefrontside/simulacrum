import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./schema/schema.docs-enterprise.graphql",
  generates: {
    "./src/__generated__/resolvers-types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
    },
  },
};
export default config;
