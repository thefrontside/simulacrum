import { HttpHandler } from './interfaces';

export const echo: HttpHandler = function echo(request, response) {
  return function * () {
    response.contentType(request.headers['content-type'] ?? "application/octet-stream");

    response.status(200).write(request.body ?? "echo");
  };
};
