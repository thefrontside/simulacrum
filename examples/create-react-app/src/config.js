export function getConfig() {
  return {
    domain: process.env.REACT_APP_DOMAIN ?? 'localhost:4400',
    clientId: process.env.REACT_APP_CLIENT_ID ?? '00000000000000000000000000000000',
    audience: process.env.REACT_APP_AUDIENCE ?? 'https://thefrontside.auth0.com/api/v1/',
  };
}
