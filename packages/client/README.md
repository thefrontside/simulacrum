# @simulacrum/client

A JavaScript client to control a `@simulacrum/server` over HTTP from
inside your testcases, preview applications, and local development
environment.

https://github.com/thefrontside/simulacrum

## SSL

The auth0 simulator needs to run over https.  [mkcert](https://github.com/FiloSottile/mkcert) makes this pretty easy:

```bash
brew install mkcert
brew install nss  # for firefox

mkdir -p ~/.simulacrum/certs
cd ~/.simulacrum/certs

mkcert -install   # Created a new local CA at the location returned from `mkcert -CAROOT`
mkcert localhost  # Using the local CA at CAROOT, create a new certificate valid for the following names
```

### re-install

If for whatever reason, you need to regenerate your certs then

```bash
cd ~/.simulacrum/certs
mkcert -uninstall localhost
# it might be necessary to uninstall the root certs
# mkcert -uninstall 
# rm -rf "$(mkcert -CAROOT)/*"
# mkcert -install
mkcert localhost
```
