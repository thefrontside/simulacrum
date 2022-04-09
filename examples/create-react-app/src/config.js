export function getConfig() {
  return {
    domain: process.env.REACT_APP_DOMAIN ?? 'cutting.eu.auth0.com',
    clientId: process.env.REACT_APP_CLIENT_ID ?? 'IsuLUyWaFczCbAKQrIpVPmyBTFs4g5iq',
    audience: process.env.REACT_APP_AUDIENCE ?? 'https://cutting.eu.auth0.com/api/v2/',
  };
}
