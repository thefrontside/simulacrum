## @simulacrum/ui

A Web application to manage a simulacrum server

### Development

To start the web application in development mode, first start your `@simulacrum/server`. For example to start the dev server on port 5000, run from the server directory:

``` shell
> PORT=5000 npm start
Simulation server running on http://localhost:5000
```

Now you can start your development client and point it at the development server. from the `packages/ui` directory:

```
> npm start
Server running at http://localhost:1234
✨ Built in 4.60s
```

You can now connect to the server with the following url:

http://localhost:1234?server=http://localhost:5000

### running https services from localhost

In order to run an https service from localhost you need locally-trusted development certificates.

[mkcert](https://github.com/FiloSottile/mkcert) makes this pretty easy:

```bash
brew install mkcert
brew install nss  # for firefox

mkdir -p ~/.simulacrum/certs
cd ~/.simulacrum/certs

mkcert -install   # Created a new local CA at the location returned from mkcert -CAROOT
mkcert localhost  # Using the local CA at CAROOT, create a new certificate valid for the following names
```

To uninstall the certificates

```bash
cd ~/.simulacrum/certs
mkcert -uninstall localhost
mkcert -uninstall 
rm -rf "$(mkcert -CAROOT)/*"
mkcert localhost
```