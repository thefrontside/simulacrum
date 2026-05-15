import { type Operation, resource } from "effection";
import { taskable, type StartableTask } from "./taskable.ts";
import type { ServiceDefinition, ServiceGraph, ServiceGraphRunner } from "./services.ts";

type ServiceMap = Record<string, ServiceDefinition<string, any>>;

export type ServiceTestRig<S extends ServiceMap, W> = {
  graph: ServiceGraph<S>;
  with: W;
};

export type ServiceTestRigOptions<S extends ServiceMap, W> = {
  subset?: Array<keyof S>;
  createWith?: (context: { graph: ServiceGraph<S> }) => W;
};

export type ServiceTestRigTask<S extends ServiceMap, W> = StartableTask<ServiceTestRig<S, W>>;

export type ServiceTestRigOperationFactory<S extends ServiceMap, W> = () => Operation<
  ServiceTestRig<S, W>
>;

export type ServiceTestRigTaskFactory<S extends ServiceMap, W> = () => ServiceTestRigTask<S, W>;

export function useServiceTestRig<S extends ServiceMap, W = Record<never, never>>(
  serviceGraph: ServiceGraphRunner<S>,
  options: ServiceTestRigOptions<S, W> = {},
): ServiceTestRigOperationFactory<S, W> {
  return () =>
    resource<ServiceTestRig<S, W>>(function* (provide) {
      const graph = yield* serviceGraph(options.subset);
      const withValue = options.createWith ? options.createWith({ graph }) : ({} as W);

      yield* provide({ graph, with: withValue });
    });
}

export function createServiceTestRig<S extends ServiceMap, W = Record<never, never>>(
  serviceGraph: ServiceGraphRunner<S>,
  options: ServiceTestRigOptions<S, W> = {},
): ServiceTestRigTaskFactory<S, W> {
  const useRig = useServiceTestRig(serviceGraph, options);
  return () => taskable(useRig()).task() as ServiceTestRigTask<S, W>;
}
