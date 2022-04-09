// Great Examples of Auth0 and Next.js:
// https://github.com/auth0/nextjs-auth0/blob/main/EXAMPLES.md
// NOTE: There is a typo in the relevant example in the docs:
// export handleAuth(...) should be export default handleAuth(...)
import { handleCallback, handleLogin, handleAuth, Session } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from 'next';

const afterCallback = async (_req: NextApiRequest, _res: NextApiResponse, session: Session, state: Record<string, unknown>) => {
  console.log("⚽️", session, state);
  return session;
};

const getLoginState = (req: NextApiRequest) => {
  let paramRole = req.query?.role ?? "candidate";
  return { role: paramRole, returnTo: `/${paramRole}` };
};

export default handleAuth({
  async login(req, res) {
    try {
      await handleLogin(req, res, { getLoginState });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      res.status(error.status || 500).end(error.message);
    }
  },
  async callback(req, res) {
    try {
      await handleCallback(req, res, {
        afterCallback
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      res.status(error.status || 500).end(error.message);
    }
  }
});
