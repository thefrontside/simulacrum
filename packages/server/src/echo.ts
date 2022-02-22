import type { HttpHandler } from './http';

export const echo: (times: number) => HttpHandler = (times: number) => function echo(request, response) {
  return function * () {
    response.contentType(request.headers['content-type'] ?? "application/octet-stream");
    let body = Array(times).fill(request.body ?? "echo").join("\n");
    response.status(200).write(body);
  };
} as HttpHandler;
