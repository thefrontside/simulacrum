import type { RequestHandler } from 'express';
import type { Middleware } from '../http';

export function isGeneratorFunction(value: unknown): value is GeneratorFunction {
  return /\[object Generator|GeneratorFunction\]/.test(Object.prototype.toString.call(value));
}

export function middlewareHandlerIsOperation(value: unknown): value is Middleware {
  return isGeneratorFunction(value);
}

export function isRequestHandler(value: unknown): value is RequestHandler {
  return isGeneratorFunction(value) === false && typeof value === 'function';
}
