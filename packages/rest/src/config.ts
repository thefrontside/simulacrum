import { OauthConfig } from './types';

// TODO: should come from outside
export const restConfig: OauthConfig = {
  port: 5500,
  audience: "https://thefrontside.auth0.com/api/v1/",
  domain: 'localhost:4400'
};

export const auth0Config = {
  scope: 'openid profile email offline_access',
  port: 4400,
  audience: "https://thefrontside.auth0.com/api/v1/",
  tenant: "frontside",
  clientId: 'IsuLUyWaFczCbAKQrIpVPmyBTFs4g5iq',
};
