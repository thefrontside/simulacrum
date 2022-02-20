import type { Resource, Task } from 'effection';
import { on, once, spawn, throwOnErrorEvent } from 'effection';
import type { Server as HTTPServer } from 'http';
import { subscribe, execute, parse } from 'graphql';
import type { WebSocket } from 'graphql-ws';
import { makeServer } from 'graphql-ws';
import type { CloseEvent } from 'ws';
import WS from 'ws';
import { schema } from './schema/schema';
import type { OperationContext } from './schema/context';

/**
 * Create a graphql-ws transport resource that can execute operations in the context
 * of a websocket.
 *
 * Every websocket gets its own effection scope, and graphql operations are
 * executed there instead of the main server scope.
 */


export function createWebSocketTransport(context: OperationContext, server: HTTPServer): Resource<void> {
  return {
    *init(scope) {
      let transport = makeServer<Task>({
        schema,
        onConnect: () => true,
        onSubscribe({ extra }, message) {
          let { operationName, variables: variableValues } = message.payload;
          return {
            schema,
            operationName,
            variableValues,
            document: parse(message.payload.query),
            contextValue: {
              ...context,
              scope: extra
            }
          };
        },
        execute,
        subscribe,
      });

      yield spawn(function*() {
        let sockets = new WS.Server({ server });
        try {
          yield on<WS>(sockets, 'connection').forEach(function* (socket) {
            yield spawn(function*(child) {
              try {
                let websocket = yield createWebSocket(socket);
                let closed = transport.opened(websocket, child);
                let close: CloseEvent = yield once(socket, 'close');
                yield closed(close.code, close.reason);
              } finally {
                socket.close();
              }
            }).within(scope);
          });
        } finally {
          sockets.close();
        }
      });

    }
  };
}

export function createWebSocket(ws: WS): Resource<WebSocket> {
  return {
    *init(scope: Task) {

      yield spawn(throwOnErrorEvent(ws));

      return {
        protocol: ws.protocol,
        send: (data: string) => new Promise((resolve, reject) => {
          if (scope.state === 'running') {
            ws.send(data, (err) => (err ? reject(err) : resolve()));
          }
        }),
        close: (code, reason) => ws.close(code, reason),
        onMessage(cb) {
          // spawn a task to dispatch each message asynchronously.
          scope.run(on<WS.MessageEvent>(ws, 'message').forEach(message => {
            scope.run(cb(message.data.toString()));
          }));
        }
      };
    }
  };
}
