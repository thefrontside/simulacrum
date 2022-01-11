interface Config {
  sessionCookieName: string;
  cookieSecret: string;
  audience: string;
  connection: string;
  scope: string;
  clientSecret: string;
  clientID: string;
  domain: string;
}

export function getConfig(): Config {
  let sessionCookieName = Cypress.env('auth0SessionCookieName') ?? 'appSession';
  let cookieSecret = Cypress.env('auth0CookieSecret') ?? 'COOKIE_SECRET';
  let audience = Cypress.env('audience');
  let connection = Cypress.env('connection') ?? 'Username-Password-Authentication';
  let scope = Cypress.env('scope') ?? 'openid profile email offline_access';
  let clientSecret = Cypress.env('auth0ClientSecret') ?? 'YOUR_AUTH0_CLIENT_SECRET';
  let clientID = Cypress.env('client_id') ?? 'YOUR_AUTH0_CLIENT_ID';
  let domain = Cypress.env('domain') ?? 'localhost:4400';

  return {
    sessionCookieName,
    cookieSecret,
    audience,
    connection,
    scope,
    clientSecret,
    clientID,
    domain
  };
}
