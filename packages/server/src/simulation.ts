import { Effect } from './effect';
import express, { raw } from 'express';
import { Behaviors, HttpApp, HttpHandler, HttpMethods, Methods, Protocols, Service, SimulationState, Simulator } from './interfaces';
import { AddressInfo, createServer } from './http';


export function simulation(definitions: Record<string, Simulator>): Effect<SimulationState> {
  return slice => function*(scope) {
    try {
      let behaviors = Object.entries(definitions).reduce(({ services }, [name, simulator]) => {
        return simulator(createBehaviors(services, name));
      }, createBehaviors());

      let servers = behaviors.services.map((service) => {
        let app = express();
        app.use(raw({ type: "*/*" }));
        for (let handler of service.app.handlers) {
          app[handler.method](handler.path, (request, response) => {
            scope.spawn(function*() {
              try {
                yield handler.handler(request, response);
              } catch(err) {
                console.error(err);

                response.status(500);
                response.write('server error');
              } finally {
                response.end();
              }
            });
          });
        }

        return {
          name: service.name,
          protocol: service.protocol,
          server: createServer(app).run(scope)
        };
      });

      let services: {name: string; url: string; }[] = [];
      for (let { name, server, protocol } of servers) {
        let address: AddressInfo = yield server.address();
        services.push({ name, url: `${protocol}://localhost:${address.port}`});
      }

      slice.update(state => ({
        ...state,
        status: 'running',
        services
      }));

      // all spun up, we can just wait.
      yield;
    } catch (error) {
      slice.update((state) => ({
        ...state,
        status: "failed",
        error
      }));
    }
  };
}

function createBehaviors(services: Service[] = [], name = ''): Behaviors {
  return {
    services,
    http(handler) {
      let protocol: Protocols = 'http';
      let app = handler(createHttpApp());
      return createBehaviors(services.concat({ name, protocol, app }), name);
    },
    https(handler) {
      let protocol: Protocols = 'https';
      let app = handler(createHttpApp());
      return createBehaviors(services.concat({ name, protocol, app }), name)
    }
  };
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
