import { HttpHandler, Store } from '@simulacrum/server';
import { expiresAt } from '../auth/date';
import { verify } from '../auth/verify';
import { renderToken } from '../views/utility';

type Routes =
  | '/token'
  | '/verify';

type Combined = `${`/utility`}${Routes}`

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createUtilityRoutes = ({ store, url, audience }: {store: Store, url: string; audience: string}): Record<Combined, HttpHandler> => ({
  ['/utility/token']: function * (_, res) {
    let html = renderToken({ url });

    res.set("Content-Type", "text/html");

    res.status(200).send(Buffer.from(html));
  },

  ['/utility/verify']: function * (req, res) {
    let { id_token, nonce } = req.body as { id_token: string; nonce: string; };

    let result = verify({ id_token, aud: audience, iss: `${url}/`, nonce, max_age: expiresAt() });

    console.log(result);

    let html = renderToken({ url, result });

    res.set("Content-Type", "text/html");

    res.status(200).send(Buffer.from(html));
  }
});
