import type {
  CodegenPlugin, PluginFunction } from '@graphql-codegen/plugin-helpers';
import {
  getCachedDocumentNodeFromSchema
} from '@graphql-codegen/plugin-helpers';
import { Kind } from 'graphql';
import type { FieldDefinitionNode } from 'graphql';

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

const addIdPlugin: CodegenPlugin = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  plugin(schema, _documents, _config) {
    let astNode = getCachedDocumentNodeFromSchema(schema); // Transforms the GraphQLSchema into ObjectFieldNode

    for (let definition of astNode.definitions) {
      if (definition.kind !== 'ObjectTypeDefinition' || !definition.fields) {
        continue;
      }

      let fields = definition.fields as typeof definition.fields;

      if (fields.find(f => f.name.value === 'id')) {
        throw new Error(
          `Graphgen takes care of ids please remove the id field on the ${definition.name.value} type`,
        );
      }

      (fields as DeepWriteable<FieldDefinitionNode[]>).unshift({
        kind: Kind.FIELD_DEFINITION,
        description: undefined,
        name: { kind: Kind.NAME, value: 'id' },
        arguments: [],
        type: {
          kind: Kind.NON_NULL_TYPE,
          type: { kind: Kind.NAMED_TYPE, name: { kind: Kind.NAME, value: 'String' } },
        },
        directives: [],
      });
    }

    return astNode as unknown as ReturnType<PluginFunction>;
  },
};

module.exports = addIdPlugin;
