import type { Request, RequestHandler } from "express";
import { JWKS } from "../auth/constants.ts";
import { removeTrailingSlash } from "./url.ts";

// Builds `https://host` (no trailing slash) from the incoming request so the
// discovery document always points back at wherever the simulator is served.
export const baseUrl = (req: Request): string =>
  removeTrailingSlash(`${req.protocol}://${req.get("Host")}`);

export const tenantParam = (req: Request): string =>
  (req.params.tenant as string | undefined) ?? "common";

export const issuerFor = (req: Request): string => `${baseUrl(req)}/${tenantParam(req)}/v2.0`;

export const createOpenIdHandlers = (): {
  openidConfiguration: RequestHandler;
  jwks: RequestHandler;
  instanceDiscovery: RequestHandler;
} => {
  return {
    openidConfiguration(req, res) {
      let base = baseUrl(req);
      let tenant = tenantParam(req);
      let authority = `${base}/${tenant}`;

      res.status(200).json({
        token_endpoint: `${authority}/oauth2/v2.0/token`,
        token_endpoint_auth_methods_supported: [
          "client_secret_post",
          "private_key_jwt",
          "client_secret_basic",
        ],
        jwks_uri: `${authority}/discovery/v2.0/keys`,
        response_modes_supported: ["query", "fragment", "form_post"],
        subject_types_supported: ["pairwise"],
        id_token_signing_alg_values_supported: ["RS256"],
        response_types_supported: ["code", "id_token", "code id_token", "id_token token"],
        scopes_supported: ["openid", "profile", "email", "offline_access"],
        issuer: `${authority}/v2.0`,
        request_uri_parameter_supported: false,
        userinfo_endpoint: `${base}/oidc/userinfo`,
        authorization_endpoint: `${authority}/oauth2/v2.0/authorize`,
        device_authorization_endpoint: `${authority}/oauth2/v2.0/devicecode`,
        http_logout_supported: true,
        frontchannel_logout_supported: true,
        end_session_endpoint: `${authority}/oauth2/v2.0/logout`,
        claims_supported: [
          "sub",
          "iss",
          "cloud_instance_name",
          "cloud_instance_host_name",
          "cloud_graph_host_name",
          "msgraph_host",
          "aud",
          "exp",
          "iat",
          "auth_time",
          "acr",
          "nonce",
          "preferred_username",
          "name",
          "tid",
          "ver",
          "at_hash",
          "c_hash",
          "email",
        ],
        kerberos_endpoint: `${authority}/kerberos`,
        tenant_region_scope: "NA",
        cloud_instance_name: "microsoftonline.com",
        cloud_graph_host_name: "graph.windows.net",
        msgraph_host: "graph.microsoft.com",
        rbac_url: "https://pas.windows.net",
        // only advertise grants the token endpoint actually implements — a
        // library that trusts this list should never receive a surprise 400
        grant_types_supported: [
          "authorization_code",
          "refresh_token",
          "client_credentials",
          "password",
        ],
      });
    },

    jwks(_req, res) {
      res.status(200).json(JWKS);
    },

    instanceDiscovery(req, res) {
      let base = baseUrl(req);
      let tenant = tenantParam(req);
      let host = new URL(base).host;

      // Lets MSAL treat this non-Microsoft host as a valid authority instance
      // instead of rejecting it during AAD instance discovery.
      res.status(200).json({
        tenant_discovery_endpoint: `${base}/${tenant}/v2.0/.well-known/openid-configuration`,
        "api-version": "1.1",
        metadata: [
          {
            preferred_network: host,
            preferred_cache: host,
            aliases: [host],
          },
        ],
      });
    },
  };
};
