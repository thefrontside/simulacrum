import assert from 'assert-ts';
import { Behaviors, HttpApp, Protocols, Service, Methods, HttpMethods, HttpHandler, Simulator } from './interfaces';

export interface Services {
  services: Service[];
}

export function selectBehaviors(simulators: Record<string, Simulator>, selected: string[]): Services {
  return selected.reduce((behaviors, selection) => {
    assert(simulators[selection] != null, `unknown simulator ${selection}`);
    return collectSimulatorBehaviors(selection, simulators[selection], behaviors);
  }, { services: [] as Service [] });

}

export function collectSimulatorBehaviors(simulatorName: string, simulator: Simulator, accumulated: Services): Services {
  let collector = createBehaviorsCollector(simulatorName, accumulated.services);
  let collected = simulator(collector);
  if (isServices(collected)) {
    return { services: accumulated.services.concat(collected.services) };
  } else {
    return accumulated;
  }
}

function createBehaviorsCollector(simulatorName: string, services: Service[]): Behaviors & Services {
  function append(serviceName: string, protocol: Protocols, app: HttpApp) {
    let name = serviceName !== simulatorName ? `${simulatorName}.${serviceName}` : serviceName;
    return createBehaviorsCollector(
      simulatorName,
      services.concat({ name, protocol, app })
    );
  }
  return {
    services,
    http(handler, name = simulatorName) {
      let app = handler(createHttpApp());
      return append(name, 'http', app);
    },
    https(handler, name = simulatorName) {
      let app = handler(createHttpApp());
      return append(name, 'https', app);
    }
  };
}

export function isServices(value: unknown): value is Services {
  return typeof value === 'object'
    && Array.isArray((value as Services).services);
}

const createAppHandler = (app: HttpApp) => (method: Methods) => (path: string, handler: HttpHandler): HttpApp => {
  return { ...app, handlers: app.handlers.concat({ method, path, handler }) };
};

const createHttpApp = () => {
  let app = {
    handlers: []
  } as unknown as HttpApp;

  let appHandler = createAppHandler(app);

  for(let method of HttpMethods) {
    app[method] = appHandler(method);
  }

  return app;
};
