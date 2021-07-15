import { envelop, useSchema } from '@envelop/core';
import { HttpHandler } from '@simulacrum/server';
import { Request, Response } from 'express';
import graphQLPlaygroundMiddlewareExpress from 'graphql-playground-middleware-express';
import { MiddlewareOptions } from 'graphql-playground-html';

import { Options } from './types';

export function playground(options: MiddlewareOptions = {}): HttpHandler {
  return function*(req, res) {
    graphQLPlaygroundMiddlewareExpress(options)(req, res, () => {});
  };
}

export function graphql(options: Options): HttpHandler {
  let { parse, validate, schema, contextFactory, execute } = envelop({
    plugins: [
      useSchema(options.schema),
    ]
  })(options.context);

  return function *(req: Request, res: Response) {
    let { query, variables } = req.body;
    let document = parse(query);
    let errors = validate(schema, document);
    if (errors.length > 0) {
      res.write(JSON.stringify({ errors }));
    } else {
      let contextValue = yield Promise.resolve(contextFactory());
      let result = yield Promise.resolve(execute({
        document,
        schema,
        variableValues: variables,
        contextValue,
      }));
      res.write(JSON.stringify(result));
    }
  };
}
