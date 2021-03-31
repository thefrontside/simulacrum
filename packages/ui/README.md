## @simulacrum/ui

A Web application to manage a simulacrum server

### Development

To start the web application in development mode, first start your
`@simulacrum/server`. For example to start the dev server on port
5000, run from the server directory:

``` shell
> PORT=5000 npm start
Simulation server running on http://localhost:5000
```

Now you can start your development client and point it at the
development server. from the `packages/ui` directory:

```
> npm start
Server running at http://localhost:1234
✨ Built in 4.60s
```

You can now connect to the server with the following url:

http://localhost:1234?server=http://localhost:5000
