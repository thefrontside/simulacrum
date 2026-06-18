import type { Operation } from "effection";

export type OperationMetadata = {
  watchSafe?: boolean;
  operationName?: string;
};

const OPERATION_METADATA = Symbol.for("@simulacrum/simulacrum/operationMetadata");

export type OperationWithMetadata<T extends Operation<unknown>> = T & {
  [OPERATION_METADATA]?: OperationMetadata;
};

export function withOperationMetadata<T extends Operation<unknown>>(
  operation: T,
  metadata: OperationMetadata,
): T {
  const operationWithMetadata = operation as OperationWithMetadata<T>;
  operationWithMetadata[OPERATION_METADATA] = metadata;
  return operationWithMetadata;
}

export function getOperationMetadata(operation: Operation<unknown>): OperationMetadata | undefined {
  return (operation as OperationWithMetadata<Operation<unknown>>)[OPERATION_METADATA];
}
