import { OauthConfig } from './types';

// TODO: should come from outside
export const config: OauthConfig = {
  scope: 'openid profile email offline_access',
  port: 4400,
  audience: "https://thefrontside.auth0.com/api/v1/",
  tenant: "frontside",
  clientId: 'IsuLUyWaFczCbAKQrIpVPmyBTFs4g5iq',
};
