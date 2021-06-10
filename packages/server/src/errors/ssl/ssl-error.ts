import { paths } from '../../config/paths';

export const mkcertText = `
In order to run an https service from localhost you need locally-trusted development certificates.

mkcert (https://github.com/FiloSottile/mkcert) makes this pretty easy:

brew install mkcert
brew install nss  # for firefox

mkdir -p ${paths.certificatesDir}
cd ${paths.certificatesDir}

mkcert -install   # Created a new local CA at the location returned from mkcert -CAROOT
mkcert localhost  # Using the local CA at CAROOT, create a new certificate valid for the following names
      `;

export class NoSSLError extends Error {
  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
