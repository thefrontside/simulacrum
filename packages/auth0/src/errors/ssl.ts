export const mkcertText = `The auth0 simulator needs to run over https. 

mkcert (https://github.com/FiloSottile/mkcert) makes this pretty easy:

  brew install mkcert
  brew install nss  # for firefox

  mkdir -p ~/.simulacrum/certs
  cd ~/.simulacrum/certs

  mkcert -install   # Created a new local CA at the location returned from mkcert -CAROOT
  mkcert localhost  # Using the local CA at CAROOT, create a new certificate valid for the following names`;
